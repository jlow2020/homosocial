"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, logAdmin, UUID } from "@/lib/admin";
import { SEASON } from "@/lib/season";

type Result = { ok: boolean; message: string };
const FORBIDDEN: Result = { ok: false, message: "Not allowed." };
const FOREVER = "876000h"; // 100 years

async function guard(targetId: string) {
  const a = await getAdmin();
  if (!a || !UUID.test(targetId)) return null;
  return a;
}

function done(id: string, message: string): Result {
  revalidatePath(`/admin/members/${id}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message };
}

export async function setStatus(id: string, status: "active" | "paused" | "banned"): Promise<Result> {
  const a = await guard(id);
  if (!a) return FORBIDDEN;
  if (id === a.me.userId) return { ok: false, message: "You can't pause or ban yourself." };
  if (!["active", "paused", "banned"].includes(status)) return FORBIDDEN;

  const { data: p } = await a.db.from("profiles").select("region, circle_id, status").eq("id", id).maybeSingle();
  if (!p) return { ok: false, message: "He has no profile yet." };

  // "Active" for a guy outside Florida means back on the waitlist.
  const next = status === "active" && !p.region ? "waitlist" : status;
  const { error } = await a.db
    .from("profiles")
    .update({
      status: next,
      paused_at: status === "paused" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  // A ban also locks him out of signing in. Restoring lifts it.
  await a.db.auth.admin.updateUserById(id, { ban_duration: status === "banned" ? FOREVER : "none" });

  if (next === "active" && p.region && !p.circle_id) {
    await a.db.rpc("place_member", { p_user: id, p_season: SEASON.id, p_region: p.region, p_capacity: SEASON.spots });
  }
  await logAdmin(a.me.userId, `status: ${next}`, id, { from: p.status });
  return done(id, next === "banned" ? "Banned. He can't sign in." : next === "paused" ? "Paused." : `Restored (${next}).`);
}

export async function moveToCircle(id: string, circleId: string): Promise<Result> {
  const a = await guard(id);
  if (!a || !UUID.test(circleId)) return FORBIDDEN;
  const { data: c } = await a.db.from("circles").select("number, region").eq("id", circleId).maybeSingle();
  if (!c) return { ok: false, message: "That Circle doesn't exist." };
  const { data: before } = await a.db.from("profiles").select("circle_id").eq("id", id).maybeSingle();
  const { error } = await a.db
    .from("profiles")
    .update({ circle_id: circleId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(a.me.userId, `moved to Circle ${c.number} (${c.region})`, id, { from: before?.circle_id ?? null, to: circleId });
  return done(id, `Moved to Circle ${c.number}.`);
}

export async function resetAttempts(id: string, kind: "realness" | "id"): Promise<Result> {
  const a = await guard(id);
  if (!a) return FORBIDDEN;
  const field = kind === "realness" ? "verification_attempts" : "id_attempts";
  const { error } = await a.db.from("profiles").update({ [field]: 0 }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(a.me.userId, `reset ${kind} attempts`, id);
  return done(id, "Attempts reset to 0.");
}

// Sends him back through a check. Clears the pass, keeps the history.
export async function redoCheck(id: string, kind: "realness" | "id"): Promise<Result> {
  const a = await guard(id);
  if (!a) return FORBIDDEN;
  if (kind === "realness") {
    const { error } = await a.db.from("profiles").update({ verified_at: null, verification_attempts: 0 }).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await a.db.from("profiles").update({ id_verified_at: null, id_attempts: 0 }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    // Frees his ID so he can use it again.
    await a.db.from("id_checks").delete().eq("user_id", id);
  }
  await logAdmin(a.me.userId, `sent back to ${kind} check`, id);
  return done(id, kind === "realness" ? "He'll redo his Realness Check next sign-in." : "He'll redo his ID check.");
}

export async function saveNotes(id: string, notes: string): Promise<Result> {
  const a = await guard(id);
  if (!a) return FORBIDDEN;
  const { error } = await a.db
    .from("profiles")
    .update({ notes: notes.trim().slice(0, 4000) || null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(a.me.userId, "edited notes", id);
  return done(id, "Notes saved.");
}

export async function setAdminRole(id: string, role: "god" | "mod" | "none"): Promise<Result> {
  const a = await guard(id);
  if (!a || a.role !== "god") return FORBIDDEN;
  if (id === a.me.userId) return { ok: false, message: "You can't change your own access." };
  if (role === "none") {
    await a.db.from("admins").delete().eq("user_id", id);
  } else if (role === "god" || role === "mod") {
    const { error } = await a.db
      .from("admins")
      .upsert({ user_id: id, role, granted_by: a.me.userId }, { onConflict: "user_id" });
    if (error) return { ok: false, message: error.message };
  } else {
    return FORBIDDEN;
  }
  await logAdmin(a.me.userId, role === "none" ? "removed admin" : `made ${role === "god" ? "Daddy" : "Mod"}`, id);
  return done(id, role === "none" ? "Admin access removed." : `He's now ${role === "god" ? "Daddy" : "a Mod"}.`);
}

// Pull an answer from the Circle, or put it back.
export async function setAnswerHidden(answerId: string, hidden: boolean): Promise<Result> {
  const a = await guard(answerId);
  if (!a) return FORBIDDEN;
  const { data } = await a.db.from("answers").update({ hidden }).eq("id", answerId).select("user_id").maybeSingle();
  if (!data) return { ok: false, message: "No such answer." };
  await logAdmin(a.me.userId, hidden ? "pulled an answer" : "restored an answer", data.user_id, { answer_id: answerId });
  revalidatePath("/admin/reports");
  revalidatePath("/circle", "layout");
  return { ok: true, message: hidden ? "Pulled." : "Back up." };
}
