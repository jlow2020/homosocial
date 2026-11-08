import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMe, getSupabaseAdmin, nextPath, type Profile } from "@/lib/supabase-server";
import { isAdmin, ROLE_TITLE, type AdminRole } from "@/lib/admin";
import { SEASON, ID_GRACE_DAYS } from "@/lib/season";
import { clockFor, finaleFor, isClosed, weekStarts, DEFAULT_TZ, type Clock } from "./clock";

export type Circle = {
  id: string;
  number: number;
  region: string;
  capacity: number;
  season: string;
  kickoff_at: string | null;
  season_no: number;
  heat_boost: number;
  tz: string | null;
  label: string | null;
  rehome_until: string | null;
  ticked_at: string | null;
  finale_at: string | null;
};

export type Member = {
  id: string;
  first_name: string;
  birthdate: string;
  interests: string;
  hot_take: string;
  photo_path: string;
  looking_for: "friends" | "friends_dating";
  email: string | null;
  founder_no: number | null;
};

export type Player = {
  db: SupabaseClient;
  me: NonNullable<Awaited<ReturnType<typeof getMe>>>;
  profile: Profile & { home_circle_id?: string | null; founder_no?: number | null };
  role: AdminRole | null;
  circle: Circle;
  clock: Clock;
  seated: boolean;
  // Nobody to play with yet: not ID-checked, Circle not started, or he's the only one left.
  waiting: boolean;
  members: Member[]; // seated, active, not blocked, includes me when seated
  titles: Map<string, string>; // admin titles by member id
  past: boolean; // looking back at a Circle he's already moved on from (or an admin looking in)
  visiting: boolean; // an admin looking inside someone else's Circle
  idPending: boolean; // playing on his Realness Check; ID check still due
  idDue: Date | null; // when it's due
  closed: boolean; // Season over and the goodbye window too: read-only
  seasonNo: number; // his own Season count, for labels
};

// Seated: passed the ID check, or passed the Realness Check within the last
// ID_GRACE_DAYS (he plays while his ID check is due).
const GRACE_MS = ID_GRACE_DAYS * 24 * 3600 * 1000;
export function graceStart(now = Date.now()): string {
  return new Date(now - GRACE_MS).toISOString();
}
export const SEATED_OR = () => `id_verified_at.not.is.null,verified_at.gt.${graceStart()}`;
export function isSeated(p: { verified_at: string | null; id_verified_at: string | null }, now = Date.now()): boolean {
  return !!p.id_verified_at || (!!p.verified_at && new Date(p.verified_at).getTime() > now - GRACE_MS);
}
export function idDueAt(p: { verified_at: string | null }): Date | null {
  return p.verified_at ? new Date(new Date(p.verified_at).getTime() + GRACE_MS) : null;
}

// Set by /circle/past/[id] while he looks back at an old Circle.
export const PAST_COOKIE = "hs_past";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MEMBER_COLS = "id, first_name, birthdate, interests, hot_take, photo_path, looking_for, email, founder_no";

// Everything a Circle page needs. Sends him wherever he belongs if it's not here.
export async function loadPlayer(opts: { needSeat?: boolean } = {}): Promise<Player> {
  const me = await getMe();
  if (!me) redirect("/signin");
  const p = me.profile;
  if (!p) redirect("/profile");
  if (p.status === "paused" || p.status === "banned") redirect("/circle");
  const where = nextPath(p, me.username, me.terms);
  if (where !== "/circle") redirect(where);
  if (!p.circle_id) redirect("/circle");

  const db = getSupabaseAdmin()!;
  const role = await isAdmin(me.userId);
  // Looking back at an old Circle? Only one he was in, and only once its Season
  // is over. Admins can look inside any Circle (read-only).
  const want = (await cookies()).get(PAST_COOKIE)?.value;
  let circleId = p.circle_id;
  let past = false;
  let visiting = false;
  if (want && want !== p.circle_id && UUID.test(want)) {
    const { data: was } = await db
      .from("circle_history")
      .select("circle_id, circles!inner(finale_at)")
      .eq("user_id", p.id)
      .eq("circle_id", want)
      .maybeSingle();
    const fin = (was?.circles as unknown as { finale_at: string | null } | null)?.finale_at;
    if (fin && new Date(fin) <= new Date()) {
      circleId = want;
      past = true;
    } else if (role) {
      const { data: exists } = await db.from("circles").select("id").eq("id", want).maybeSingle();
      if (exists) {
        circleId = want;
        past = true;
        visiting = true;
      }
    }
  }
  const { data: circleRow } = await db.from("circles").select("*").eq("id", circleId).single();
  let circle = circleRow as Circle;
  const seated = isSeated(p);
  const idPending = seated && !p.id_verified_at;
  if (opts.needSeat && !seated) redirect("/circle");

  // Once the Finale is past, guys start leaving for the next Season. The Circle
  // still shows everyone who finished it.
  const over = !!circle.kickoff_at && clockFor(circle).phase === "revealed";
  const members = over ? await loadAlumni(db, circle, p.id) : await loadMembers(db, circle.id, p.id);

  // A Circle kicks off the moment it has two guys.
  if (!circle.kickoff_at && members.length >= SEASON.minToOpen) {
    const now = new Date().toISOString();
    await db.from("circles").update({ kickoff_at: now }).eq("id", circle.id).is("kickoff_at", null);
    circle = { ...circle, kickoff_at: now };
  }
  // Guys can be moved somewhere closer until week 2 starts.
  if (circle.kickoff_at && !circle.rehome_until) {
    const until = weekStarts(new Date(circle.kickoff_at), circle.tz || DEFAULT_TZ)[1].toISOString();
    await db.from("circles").update({ rehome_until: until }).eq("id", circle.id).is("rehome_until", null);
    circle = { ...circle, rehome_until: until };
  }

  const clock = clockFor(circle);
  if (circle.kickoff_at && !circle.finale_at) {
    const fin = finaleFor(new Date(circle.kickoff_at), circle.tz || DEFAULT_TZ).toISOString();
    await db.from("circles").update({ finale_at: fin }).eq("id", circle.id).is("finale_at", null);
    circle = { ...circle, finale_at: fin };
  }

  // The clock runs from here too, every ten minutes, so nothing waits on the scheduler.
  if (clock.phase !== "filling") {
    const stale = !circle.ticked_at || Date.now() - new Date(circle.ticked_at).getTime() > 10 * 60 * 1000;
    if (stale) {
      const { data: claimed } = await db
        .from("circles")
        .update({ ticked_at: new Date().toISOString() })
        .eq("id", circle.id)
        .or(`ticked_at.is.null,ticked_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}`)
        .select("id");
      if (claimed?.length) {
        const { tickCircle } = await import("./tick");
        await tickCircle(db, circle).catch(() => {});
      }
    }
  }

  const { data: staff } = await db.from("admins").select("user_id, role").in("user_id", members.map((m) => m.id));
  const titles = new Map((staff ?? []).map((s) => [s.user_id as string, ROLE_TITLE[s.role as AdminRole]]));

  // An admin can run his Circle on his own to look around; everyone else waits for a second guy.
  const filling = clock.phase === "filling";
  const waiting = !over && (visiting ? filling : !seated || filling || (members.length < SEASON.minToOpen && !role));
  const seasonNo = await seasonNumber(db, p.id, circle);
  return { db, me, profile: p as Player["profile"], role, circle, clock, seated, waiting, members, titles, past, visiting, idPending, idDue: idPending ? idDueAt(p) : null, closed: past || isClosed(clock), seasonNo };
}

// Everyone who was still in this Circle at its Finale, whether or not he's
// moved on to the next Season since.
export async function loadAlumni(db: SupabaseClient, circle: Pick<Circle, "id" | "finale_at" | "kickoff_at" | "tz">, meId: string): Promise<Member[]> {
  const fin = circle.finale_at ?? (circle.kickoff_at ? finaleFor(new Date(circle.kickoff_at), circle.tz || DEFAULT_TZ).toISOString() : null);
  let q = db.from("circle_history").select("user_id").eq("circle_id", circle.id);
  if (fin) q = q.or(`left_at.is.null,left_at.gte.${new Date(fin).toISOString()}`);
  const [{ data: hist }, { data: blocks }] = await Promise.all([
    q,
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${meId},blocked.eq.${meId}`),
  ]);
  const ids = (hist ?? []).map((h) => h.user_id as string);
  if (!ids.length) return [];
  const { data: rows } = await db
    .from("profiles")
    .select(MEMBER_COLS)
    .in("id", ids)
    .neq("status", "banned")
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: true });
  const hidden = new Set((blocks ?? []).map((b) => (b.blocker === meId ? b.blocked : b.blocker)));
  return ((rows ?? []) as Member[]).filter((m) => !hidden.has(m.id));
}

// His Season count: 1 + every Circle he finished before this one.
async function seasonNumber(db: SupabaseClient, userId: string, circle: Circle): Promise<number> {
  const { data } = await db.from("circle_history").select("circle_id, circles!inner(finale_at)").eq("user_id", userId);
  const mine = circle.finale_at ? new Date(circle.finale_at).getTime() : Infinity;
  let n = 1;
  for (const row of data ?? []) {
    if (row.circle_id === circle.id) continue;
    const fin = (row.circles as unknown as { finale_at: string | null } | null)?.finale_at;
    if (fin && new Date(fin).getTime() < mine && new Date(fin) <= new Date()) n++;
  }
  return n;
}

// Old Circles whose Season he finished, newest first.
export async function pastCircles(db: SupabaseClient, userId: string, exceptId?: string): Promise<{ id: string; number: number; label: string | null; finale_at: string }[]> {
  const { data } = await db
    .from("circle_history")
    .select("circle_id, left_at, circles!inner(id, number, label, finale_at)")
    .eq("user_id", userId);
  const now = Date.now();
  return (data ?? [])
    .map((r) => ({ c: r.circles as unknown as { id: string; number: number; label: string | null; finale_at: string | null }, left: r.left_at as string | null }))
    .filter(({ c, left }) => c.id !== exceptId && c.finale_at && new Date(c.finale_at).getTime() <= now && (!left || new Date(left) >= new Date(c.finale_at)))
    .map(({ c }) => ({ id: c.id, number: c.number, label: c.label, finale_at: c.finale_at! }))
    .sort((a, b) => b.finale_at.localeCompare(a.finale_at));
}

export async function loadMembers(db: SupabaseClient, circleId: string, meId: string): Promise<Member[]> {
  const [{ data: rows }, { data: blocks }] = await Promise.all([
    db
      .from("profiles")
      .select(MEMBER_COLS)
      .eq("circle_id", circleId)
      .eq("status", "active")
      .not("verified_at", "is", null)
      .or(SEATED_OR())
      .order("verified_at", { ascending: true }),
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${meId},blocked.eq.${meId}`),
  ]);
  const hidden = new Set((blocks ?? []).map((b) => (b.blocker === meId ? b.blocked : b.blocker)));
  return ((rows ?? []) as Member[]).filter((m) => !hidden.has(m.id));
}

export async function photoUrls(db: SupabaseClient, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = [...new Set(paths.filter(Boolean) as string[])];
  if (!list.length) return new Map();
  const { data } = await db.storage.from("photos").createSignedUrls(list, 3600);
  return new Map((data ?? []).filter((s) => s.signedUrl).map((s) => [s.path as string, s.signedUrl as string]));
}

export function isMember(pl: Player, id: string): boolean {
  return pl.members.some((m) => m.id === id);
}
