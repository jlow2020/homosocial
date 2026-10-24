import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMe, getSupabaseAdmin, nextPath, type Profile } from "@/lib/supabase-server";
import { isAdmin, ROLE_TITLE, type AdminRole } from "@/lib/admin";
import { SEASON } from "@/lib/season";
import { clockFor, weekStarts, DEFAULT_TZ, type Clock } from "./clock";

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
};

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
  const [{ data: circleRow }, role] = await Promise.all([
    db.from("circles").select("*").eq("id", p.circle_id).single(),
    isAdmin(me.userId),
  ]);
  let circle = circleRow as Circle;
  const seated = !!p.id_verified_at;
  if (opts.needSeat && !seated) redirect("/circle");

  const members = await loadMembers(db, circle.id, p.id);

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

  const waiting = !seated || clock.phase === "filling" || members.length < SEASON.minToOpen;
  return { db, me, profile: p as Player["profile"], role, circle, clock, seated, waiting, members, titles };
}

export async function loadMembers(db: SupabaseClient, circleId: string, meId: string): Promise<Member[]> {
  const [{ data: rows }, { data: blocks }] = await Promise.all([
    db
      .from("profiles")
      .select(MEMBER_COLS)
      .eq("circle_id", circleId)
      .eq("status", "active")
      .not("verified_at", "is", null)
      .not("id_verified_at", "is", null)
      .order("id_verified_at", { ascending: true }),
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
