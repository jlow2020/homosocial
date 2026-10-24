import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase-server";
import { stageOf, type Stage } from "./util";

export type Person = {
  id: string;
  email: string | null;
  username: string | null;
  signedUpAt: string;
  lastSignInAt: string | null;
  profile: Profile | null;
  stage: Stage;
};

export type CircleRow = { id: string; season: string; region: string; number: number; capacity: number; created_at: string; label: string | null };

// Everyone with a login, joined with his username and profile.
export async function loadPeople(db: SupabaseClient): Promise<Person[]> {
  const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [{ data: logins }, { data: profiles }] = await Promise.all([
    db.from("logins").select("user_id, username"),
    db.from("profiles").select("*"),
  ]);
  const nameOf = new Map((logins ?? []).map((l) => [l.user_id as string, l.username as string]));
  const profileOf = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  return users
    .map((u) => {
      const profile = profileOf.get(u.id) ?? null;
      const username = nameOf.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? null,
        username,
        signedUpAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        profile,
        stage: stageOf(profile, !!username),
      };
    })
    .sort((a, b) => b.signedUpAt.localeCompare(a.signedUpAt));
}

export async function loadCircles(db: SupabaseClient): Promise<CircleRow[]> {
  const { data } = await db
    .from("circles")
    .select("id, season, region, number, capacity, created_at, label")
    .order("season", { ascending: false })
    .order("region")
    .order("number");
  return (data ?? []) as CircleRow[];
}

export function circleLabel(c: CircleRow): string {
  return `Circle ${c.number}${c.label ? ` · ${c.label}` : ""} · ${c.season.toUpperCase()}`;
}
