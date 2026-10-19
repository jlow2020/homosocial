"use server";

import { getMe, getSupabaseAdmin } from "@/lib/supabase-server";

type SubJson = { endpoint: string; keys: { p256dh: string; auth: string } };

// The phone hands us its push subscription. One row per browser.
export async function savePushSub(sub: SubJson, ua: string): Promise<{ ok: boolean }> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me?.profile || !db) return { ok: false };
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  await db
    .from("push_subs")
    .upsert({ endpoint: sub.endpoint, user_id: me.userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, ua: ua.slice(0, 200) }, { onConflict: "endpoint" });
  return { ok: true };
}

export async function dropPushSub(endpoint: string): Promise<{ ok: boolean }> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) return { ok: false };
  await db.from("push_subs").delete().eq("endpoint", endpoint).eq("user_id", me.userId);
  return { ok: true };
}

export async function setNotifyEmail(on: boolean): Promise<{ ok: boolean }> {
  const me = await getMe();
  const db = getSupabaseAdmin();
  if (!me || !db) return { ok: false };
  await db.from("profiles").update({ notify_email: on }).eq("id", me.userId);
  return { ok: true };
}
