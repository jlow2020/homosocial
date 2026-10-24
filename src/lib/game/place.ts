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
