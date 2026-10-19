"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, logAdmin, UUID } from "@/lib/admin";
import { notify } from "@/lib/notify";

type Result = { ok: boolean; message: string };
const STRIKE_WINDOW_DAYS = 90;
const TABLES = new Set(["answers", "replies", "lounge_messages", "plans", "roses", "dm_messages"]);

export async function decide(id: string, decision: "approve" | "dismiss" | "remove" | "strike"): Promise<Result> {
  const a = await getAdmin();
  if (!a || !UUID.test(id)) return { ok: false, message: "Not allowed." };
  const { data: item } = await a.db.from("mod_queue").select("*").eq("id", id).maybeSingle();
  if (!item) return { ok: false, message: "Gone." };
  if (item.status !== "pending") return { ok: false, message: "Already handled." };
  const ref = item.ref_table && TABLES.has(item.ref_table) && item.ref_id ? { table: item.ref_table as string, id: item.ref_id as string } : null;

  if (decision === "approve" || decision === "dismiss") {
    if (ref) {
      await a.db.from(ref.table).update(ref.table === "answers" ? { held: false, veiled: false } : { held: false }).eq("id", ref.id);
      if (ref.table === "dm_messages") {
        const { data: m } = await a.db.from("dm_messages").select("thread_id").eq("id", ref.id).maybeSingle();
        if (m) await a.db.from("dm_threads").update({ last_at: new Date().toISOString() }).eq("id", m.thread_id);
      }
    }
    if (item.verdict === "held") {
      await notify(a.db, [item.user_id], { title: "You're all clear", body: "A person looked and it's fine. It's up now. Sorry for the wait.", url: "/circle", tag: "held", email: false });
    }
  } else {
    if (ref) await a.db.from(ref.table).delete().eq("id", ref.id);
    if (item.media_bucket && item.media_path && item.surface !== "profile_photo") {
      await a.db.storage.from(item.media_bucket).remove([item.media_path]);
    }
    const what = item.category === "nudity" ? "It showed more than the house rules allow in a shared space." : `It broke the house rules (${String(item.reason ?? item.category ?? "").toLowerCase()}).`;
    let extra = "";
    if (decision === "strike") extra = await strike(a.db, item.user_id, id, item.category, a.me.userId);
    await notify(a.db, [item.user_id], { title: "A post of yours was removed", body: `${what}${extra}`, url: "/guidelines", tag: "mod", email: true });
  }

  await a.db
    .from("mod_queue")
    .update({ status: decision === "approve" ? "approved" : decision === "dismiss" ? "dismissed" : "removed", strike: decision === "strike", decided_at: new Date().toISOString(), decided_by: a.me.userId })
    .eq("id", id);
  await logAdmin(a.me.userId, `moderation: ${decision}`, item.user_id, { queue: id, surface: item.surface, category: item.category });
  revalidatePath("/admin/moderation");
  revalidatePath("/circle", "layout");
  return { ok: true, message: decision === "approve" ? "Approved." : decision === "dismiss" ? "Cleared." : decision === "strike" ? "Removed with a strike." : "Removed." };
}

// First strike: a warning. Second within 90 days: a 7-day pause. Third: paused until staff look.
async function strike(db: NonNullable<Awaited<ReturnType<typeof getAdmin>>>["db"], userId: string, queueId: string, category: string | null, by: string): Promise<string> {
  await db.from("strikes").insert({ user_id: userId, queue_id: queueId, category, given_by: by });
  const since = new Date(Date.now() - STRIKE_WINDOW_DAYS * 864e5).toISOString();
  const { count } = await db.from("strikes").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  const n = count ?? 1;
  if (n === 1) return " That's a warning. Two more in 90 days and your account gets paused.";
  if (n === 2) {
    const until = new Date(Date.now() + 7 * 864e5).toISOString();
    await db.from("profiles").update({ status: "paused", paused_at: new Date().toISOString(), paused_until: until, pause_reason: "strikes" }).eq("id", userId);
    return " That's your second strike in 90 days, so your account is paused for 7 days.";
  }
  await db.from("profiles").update({ status: "paused", paused_at: new Date().toISOString(), paused_until: null, pause_reason: "strikes" }).eq("id", userId);
  return " That's your third strike in 90 days. Your account is paused until a person reviews it.";
}
