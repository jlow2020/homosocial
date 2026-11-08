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
  // Apple rejects the whole push unless the subject is a mailto: or https: address.
  let subject = (process.env.VAPID_SUBJECT || "mailto:jonathan@homosocial.net").trim();
  if (!/^(mailto:|https:)/.test(subject)) subject = subject.includes("@") ? `mailto:${subject}` : "mailto:jonathan@homosocial.net";
  webpush.setVapidDetails(subject, pub.trim(), priv.trim());
  return true;
}

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string };

export type PushResult = { user_id: string; service: string; ok: boolean; status?: number; why?: string };

// Tell these guys something. Fake guys are skipped. Never throws. Returns what
// happened to each phone, and logs failures so they can be chased down.
export async function notify(db: SupabaseClient, userIds: string[], n: Notice): Promise<PushResult[]> {
  const ids = [...new Set(userIds)];
  const results: PushResult[] = [];
  if (!ids.length) return results;
  try {
    const { data: people } = await db.from("profiles").select("id, email, is_demo, notify_email, status").in("id", ids);
    const real = (people ?? []).filter((p) => !p.is_demo && p.status === "active");
    if (!real.length) return results;
    const realIds = real.map((p) => p.id as string);

    const pushed = new Set<string>();
    if (vapidReady()) {
      const { data: subs } = await db.from("push_subs").select("endpoint, user_id, p256dh, auth").in("user_id", realIds);
      const payload = JSON.stringify({ title: n.title, body: n.body, url: SITE + n.url, tag: n.tag });
      await Promise.all(
        ((subs ?? []) as Sub[]).map(async (s) => {
          const service = new URL(s.endpoint).host;
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
            pushed.add(s.user_id);
            results.push({ user_id: s.user_id, service, ok: true });
          } catch (e) {
            const err = e as { statusCode?: number; body?: string; message?: string };
            const why = String(err.body || err.message || "").slice(0, 200);
            results.push({ user_id: s.user_id, service, ok: false, status: err.statusCode, why });
            console.error("push failed", service, err.statusCode, why);
            // Gone: the browser dropped the subscription.
            if (err.statusCode === 404 || err.statusCode === 410) await db.from("push_subs").delete().eq("endpoint", s.endpoint);
            else await db.from("admin_log").insert({ action: "push:fail", target: s.user_id, detail: { service, status: err.statusCode ?? null, why, title: n.title } });
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
  return results;
}

// Email backup through Resend. Off until RESEND_API_KEY is set.
export async function sendEmail(to: string, n: Pick<Notice, "title" | "body" | "url">, footer = "You get these because you're in a Circle. Turn them off from your profile.", button = "Open Homosocial"): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.EMAIL_FROM || "Homosocial <hello@homosocial.net>";
  const html = `
    <div style="background:#160c24;color:#fbf4ff;padding:32px 24px;font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
      <p style="margin:0 0 20px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f5c451">Homosocial</p>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;color:#fbf4ff">${esc(n.title)}</h1>
      <p style="margin:0 0 24px;font-size:17px;line-height:1.5;color:#e6d9f2">${esc(n.body)}</p>
      <a href="${SITE}${n.url}" style="display:inline-block;background:#ff3d8b;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${esc(button)}</a>
      <p style="margin:32px 0 0;font-size:12px;color:#b9a7cc">${esc(footer)}</p>
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
