import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SEASON, MIN_SEAT_MILES } from "@/lib/season";
import { notify } from "@/lib/notify";
import { placeForZip } from "@/lib/geo";

// Seats a verified guy: the nearest Circle with room, any distance. Guys who were
// on their own in a far-away Circle during week 1 may get moved here with him.
export async function placeMember(db: SupabaseClient, userId: string): Promise<string | null> {
  await fillGeo(db, [userId]);
  const { data, error } = await db.rpc("place_member_geo", {
    p_user: userId,
    p_season: SEASON.id,
    p_capacity: SEASON.spots,
    p_min: SEASON.minToOpen,
    p_local: MIN_SEAT_MILES,
  });
  if (error) {
    console.error("place_member_geo", error.message);
    return null;
  }
  const r = data as { circle: string; moved: string[] };
  const moved = (r.moved ?? []).filter((id) => id !== userId);
  if (moved.length) {
    await notify(db, moved, {
      title: "You've got a Circle closer to home",
      body: "Guys near you just joined. Same Season, new Circle.",
      url: "/circle",
      tag: "moved",
    });
  }
  return r.circle;
}

// Guys who signed up before nationwide have a zip but no coordinates yet.
export async function fillGeo(db: SupabaseClient, ids?: string[]): Promise<number> {
  let q = db.from("profiles").select("id, zip").is("lat", null).not("zip", "is", null).limit(300);
  if (ids) q = q.in("id", ids);
  const { data } = await q;
  let n = 0;
  for (const p of data ?? []) {
    const place = placeForZip(String(p.zip));
    if (!place) continue;
    await db.from("profiles").update({ lat: place.lat, lng: place.lng, city: place.city, state: place.state, tz: place.tz, region: "us" }).eq("id", p.id);
    n++;
  }
  return n;
}

// Older Circles get a home town and time zone from the guys in them.
export async function fillCircles(db: SupabaseClient): Promise<void> {
  const { data: circles } = await db.from("circles").select("id").is("label", null).limit(50);
  for (const c of circles ?? []) {
    const { data: guys } = await db.from("profiles").select("city, tz").eq("circle_id", c.id).not("city", "is", null);
    if (!guys?.length) continue;
    const top = <T,>(xs: T[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>())].sort((a, b) => b[1] - a[1])[0][0];
    await db.from("circles").update({ label: top(guys.map((g) => g.city as string)), tz: top(guys.map((g) => g.tz as string)) }).eq("id", c.id);
  }
}

// A seated guy alone in his Circle joins the nearest Circle that has guys and room,
// instead of waiting. Returns true if he moved.
export async function rehomeIfAlone(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data: me } = await db.from("profiles").select("circle_id, id_verified_at, status").eq("id", userId).maybeSingle();
  if (!me?.circle_id || !me.id_verified_at || me.status !== "active") return false;
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("circle_id", me.circle_id)
    .eq("status", "active")
    .neq("id", userId);
  if (count) return false; // someone else is here, even if he's still finishing sign-up
  const { data: open } = await db.from("circle_centers").select("id").gt("members", 0).neq("id", me.circle_id).limit(50);
  const { data: caps } = open?.length ? await db.from("circle_centers").select("id, members, capacity").in("id", open.map((o) => o.id)) : { data: [] };
  if (!(caps ?? []).some((c) => (c.members as number) < (c.capacity as number))) return false;
  const old = me.circle_id as string;
  await db.from("profiles").update({ circle_id: null }).eq("id", userId).eq("circle_id", old);
  const next = await placeMember(db, userId);
  if (!next || next === old) {
    await db.from("profiles").update({ circle_id: old }).eq("id", userId).is("circle_id", null);
    return false;
  }
  await db.from("profiles").update({ moved_from: old }).eq("id", userId);
  return true;
}

// Every few minutes: nobody who could be playing sits alone.
export async function rehomeLoners(db: SupabaseClient): Promise<void> {
  const { data: lonely } = await db.from("circle_centers").select("id").eq("members", 1).limit(100);
  for (const c of lonely ?? []) {
    const { data: guy } = await db.from("profiles").select("id").eq("circle_id", c.id).eq("status", "active").not("id_verified_at", "is", null).maybeSingle();
    if (guy) await rehomeIfAlone(db, guy.id as string);
  }
}
