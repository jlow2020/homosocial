import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Push notifications, with email as the backup for guys who haven't turned push on.
// VAPID keys live in the server's environment. Without them, push is quietly off.

export type Notice = {
  title: string;
  body: string;
  url: string; // where tapping it lands, like /circle/week/3
  tag?: string; // same tag replaces the last one on the phone
  email?: boolean; // also email guys with no push subscription (default true)
};

const SITE = "https://homosocial.net";

function vapidReady(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:jonathan@homosocial.net", pub, priv);
  return true;
}

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string };

// Tell these guys something. Fake guys are skipped. Never throws.
export async function notify(db: SupabaseClient, userIds: string[], n: Notice): Promise<void> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  try {
    const { data: people } = await db.from("profiles").select("id, email, is_demo, notify_email, status").in("id", ids);
    const real = (people ?? []).filter((p) => !p.is_demo && p.status === "active");
    if (!real.length) return;
    const realIds = real.map((p) => p.id as string);

    const pushed = new Set<string>();
    if (vapidReady()) {
      const { data: subs } = await db.from("push_subs").select("endpoint, user_id, p256dh, auth").in("user_id", realIds);
      const payload = JSON.stringify({ title: n.title, body: n.body, url: SITE + n.url, tag: n.tag });
      await Promise.all(
        ((subs ?? []) as Sub[]).map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "normal" });
            pushed.add(s.user_id);
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            // Gone: the browser dropped the subscription.
            if (code === 404 || code === 410) await db.from("push_subs").delete().eq("endpoint", s.endpoint);
          }
        })
      );
    }

    if (n.email !== false) {
      const left = real.filter((p) => !pushed.has(p.id as string) && p.notify_email && p.email);
      await Promise.all(left.map((p) => sendEmail(p.email as string, n)));
    }
  } catch (e) {
    console.error("notify failed", e);
  }
}

// Email backup through Resend. Off until RESEND_API_KEY is set.
async function sendEmail(to: string, n: Notice): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.EMAIL_FROM || "Homosocial <hello@homosocial.net>";
  const html = `
    <div style="background:#160c24;color:#fbf4ff;padding:32px 24px;font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
      <p style="margin:0 0 20px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f5c451">Homosocial</p>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;color:#fbf4ff">${esc(n.title)}</h1>
      <p style="margin:0 0 24px;font-size:17px;line-height:1.5;color:#e6d9f2">${esc(n.body)}</p>
      <a href="${SITE}${n.url}" style="display:inline-block;background:#ff3d8b;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Open Homosocial</a>
      <p style="margin:32px 0 0;font-size:12px;color:#b9a7cc">You get these because you're in a Circle. Turn them off from your profile.</p>
    </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: n.title, html }),
    });
  } catch (e) {
    console.error("email failed", e);
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

// Once per Circle per key. Returns true the first time, so the caller sends exactly once.
export async function claimNotice(db: SupabaseClient, circleId: string, key: string): Promise<boolean> {
  const { data } = await db.from("notices").upsert({ circle_id: circleId, key }, { onConflict: "circle_id,key", ignoreDuplicates: true }).select("key");
  return !!data?.length;
}

export function teaser(s: string, max = 90): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}
