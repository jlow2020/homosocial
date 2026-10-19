"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, logAdmin, UUID } from "@/lib/admin";

type Result = { ok: boolean; message: string };
const NO: Result = { ok: false, message: "Not allowed." };
const MODES = ["text", "anon", "guesswho", "photo", "dare"];

export async function reviewDrop(id: string, form: FormData): Promise<Result> {
  const a = await getAdmin();
  if (!a || !UUID.test(id)) return NO;
  const status = String(form.get("status"));
  if (!["approved", "retired", "queued"].includes(status)) return NO;
  const body = String(form.get("body") ?? "").trim().slice(0, 300);
  const hint = String(form.get("hint") ?? "").trim().slice(0, 200) || null;
  const week = Number(form.get("week"));
  const heat = Number(form.get("heat"));
  const mode = String(form.get("mode"));
  if (!body || !(week >= 1 && week <= 8) || !(heat >= 1 && heat <= 5) || !MODES.includes(mode)) return { ok: false, message: "Check the fields." };
  const { error } = await a.db
    .from("prompt_bank")
    .update({ status, body, hint, week, heat, mode, pinned: form.get("pinned") === "on", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  await logAdmin(a.me.userId, `drop ${status}`, null, { id });
  revalidatePath("/admin/drops");
  return { ok: true, message: status === "approved" ? "Approved. It's in the bank." : status === "retired" ? "Retired." : "Back in the queue." };
}

// Daddy's Pick: goes straight to the bank, approved. Pinned means every Circle
// that reaches that week gets it next, before anything else.
export async function daddyPick(form: FormData): Promise<Result> {
  const a = await getAdmin();
  if (!a) return NO;
  const body = String(form.get("body") ?? "").trim().slice(0, 300);
  const hint = String(form.get("hint") ?? "").trim().slice(0, 200) || null;
  const week = Number(form.get("week"));
  const heat = Number(form.get("heat"));
  const mode = String(form.get("mode"));
  if (body.length < 10 || !(week >= 1 && week <= 8) || !(heat >= 1 && heat <= 5) || !MODES.includes(mode)) return { ok: false, message: "Check the fields." };
  const { error } = await a.db.from("prompt_bank").insert({
    body,
    hint,
    week,
    heat,
    mode,
    author_id: a.me.userId,
    credit: form.get("credit") === "on" ? "Daddy" : null,
    source: "daddy",
    status: "approved",
    pinned: form.get("pinned") === "on",
    reviewed_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };
  await logAdmin(a.me.userId, "daddy's pick added", null, { week, heat });
  revalidatePath("/admin/drops");
  return { ok: true, message: "In the bank." };
}
