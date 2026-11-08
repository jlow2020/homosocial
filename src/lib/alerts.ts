import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notify, sendEmail } from "./notify";

// Heads-ups for the people running Homosocial: who signed up, who got through
// the checks, who's stuck. Push to every admin's phone, plus an email.
const TO = process.env.ALERT_EMAIL || "jonathan@homosocial.net";

export type Alert = { title: string; body: string; url: string };

export async function adminAlert(db: SupabaseClient, a: Alert): Promise<void> {
  try {
    const { data } = await db.from("admins").select("user_id");
    const ids = (data ?? []).map((r) => r.user_id as string);
    await Promise.all([
      ids.length ? notify(db, ids, { ...a, email: false }) : Promise.resolve(),
      sendEmail(TO, a, "Admin alert from Homosocial.", "Open in admin"),
    ]);
  } catch (e) {
    console.error("admin alert failed", e);
  }
}

type Who = { id: string; first_name?: string | null; city?: string | null; state?: string | null };

export function who(p: Who): string {
  const name = p.first_name?.trim() || "Someone";
  return p.city ? `${name} (${p.city}${p.state ? `, ${p.state}` : ""})` : name;
}

export const memberUrl = (id: string) => `/admin/members/${id}`;

const DAY = 24 * 60 * 60 * 1000;

// Once a day, everyone who's been stuck at one step for more than a day.
// Sent by the clock; the admin log keeps it to one a day.
export async function dailyDigest(db: SupabaseClient, now = new Date()): Promise<boolean> {
  const tz = "America/New_York";
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 9) return false;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const key = `digest:${day}`;
  const { data: done } = await db.from("admin_log").select("id").eq("action", key).limit(1);
  if (done?.length) return false;
  await db.from("admin_log").insert({ action: key });

  // Stuck for more than a day, and not given up for more than two weeks.
  const cutoff = new Date(now.getTime() - DAY).toISOString();
  const oldest = new Date(now.getTime() - 14 * DAY).toISOString();
  const [{ data: profiles }, { data: users }] = await Promise.all([
    db
      .from("profiles")
      .select("id, first_name, city, state, created_at, updated_at, verified_at, id_verified_at, verification_attempts, id_attempts, circle_id, status, is_demo")
      .eq("status", "active")
      .lte("updated_at", cutoff)
      .gte("updated_at", oldest),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const real = (profiles ?? []).filter((p) => !p.is_demo);
  const lines: string[] = [];
  const add = (label: string, list: string[]) => list.length && lines.push(`${label}: ${list.join(", ")}`);

  const withProfile = new Set((await db.from("profiles").select("id")).data?.map((r) => r.id as string) ?? []);
  const noLink = (users?.users ?? []).filter((u) => !u.email_confirmed_at && u.created_at <= cutoff && u.created_at >= oldest && !withProfile.has(u.id)).length;
  const noProfile = (users?.users ?? []).filter((u) => u.email_confirmed_at && u.created_at <= cutoff && u.created_at >= oldest && !withProfile.has(u.id)).length;

  add("Never started the Realness Check", real.filter((p) => !p.verified_at && !p.verification_attempts).map(who));
  add("Failed the Realness Check", real.filter((p) => !p.verified_at && p.verification_attempts > 0).map((p) => `${who(p)} ×${p.verification_attempts}`));
  add("Passed Realness, no ID check yet", real.filter((p) => p.verified_at && !p.id_verified_at && !p.id_attempts).map(who));
  add("Failed the ID check", real.filter((p) => p.verified_at && !p.id_verified_at && p.id_attempts > 0).map((p) => `${who(p)} ×${p.id_attempts}`));
  if (noLink) lines.push(`Asked for a signup link but never clicked it: ${noLink}`);
  if (noProfile) lines.push(`Clicked the link but never made a profile: ${noProfile}`);

  // And a one-line pulse.
  const { count: verified } = await db.from("profiles").select("id", { count: "exact", head: true }).not("id_verified_at", "is", null).eq("status", "active");
  const { count: live } = await db.from("circles").select("id", { count: "exact", head: true }).not("kickoff_at", "is", null);
  if (!lines.length) return false;
  await adminAlert(db, {
    title: "Who's stuck today",
    body: `${lines.join(". ")}. Verified players: ${verified ?? 0}. Circles running: ${live ?? 0}.`,
    url: "/admin/members",
  });
  return true;
}
