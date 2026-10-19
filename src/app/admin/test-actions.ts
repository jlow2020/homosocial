"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, logAdmin, UUID } from "@/lib/admin";
import { SEASON } from "@/lib/season";
import { CAST } from "@/lib/game/demo";
import { demoEmail } from "@/lib/game/seed";

type Result = { ok: boolean; message: string };

async function testCircle(circleId: string) {
  const a = await getAdmin();
  if (!a || !UUID.test(circleId)) return null;
  const { data: c } = await a.db.from("circles").select("*").eq("id", circleId).maybeSingle();
  if (!c?.is_test) return null;
  return { a, c };
}

// Makes the 14 fake guys if they don't exist yet. Returns their ids.
async function ensureCast(db: NonNullable<Awaited<ReturnType<typeof getAdmin>>>["db"]): Promise<string[]> {
  const ids: string[] = [];
  const { data: existing } = await db.from("profiles").select("id, email").eq("is_demo", true);
  const byEmail = new Map((existing ?? []).map((r) => [r.email as string, r.id as string]));
  for (const g of CAST) {
    const email = demoEmail(g.slug);
    let id = byEmail.get(email);
    if (!id) {
      const { data: made, error } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { demo: true },
      });
      if (error || !made.user) throw new Error(`Couldn't make ${g.first_name}: ${error?.message}`);
      id = made.user.id;
      const photo_path = `demo/${g.slug}.jpg`;
      const img = await readFile(path.join(process.cwd(), "public", "demo", `${g.slug}.jpg`));
      await db.storage.from("photos").upload(photo_path, img, { contentType: "image/jpeg", upsert: true });
      const now = new Date().toISOString();
      const { error: pErr } = await db.from("profiles").insert({
        id,
        email,
        first_name: g.first_name,
        birthdate: g.birthdate,
        zip: g.zip,
        region: g.zip.slice(0, 3),
        interests: g.interests,
        looking_for: g.dating ? "friends_dating" : "friends",
        hot_take: g.hot_take,
        photo_path,
        verified_at: now,
        id_verified_at: now,
        status: "active",
        is_demo: true,
      });
      if (pErr) throw new Error(`Couldn't make ${g.first_name}'s profile: ${pErr.message}`);
      await db.from("logins").upsert({ user_id: id, username: `${g.slug}.test`, email }, { onConflict: "user_id" });
    }
    ids.push(id);
  }
  return ids;
}

// A brand-new test Circle, full of fake guys, kicked off, Week 1. Daddy moves in.
export async function createTestCircle(): Promise<Result> {
  const a = await getAdmin();
  if (!a) return { ok: false, message: "Not allowed." };
  let castIds: string[];
  try {
    castIds = await ensureCast(a.db);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const { data: last } = await a.db.from("circles").select("number").eq("region", "test").order("number", { ascending: false }).limit(1);
  const number = ((last?.[0]?.number as number | undefined) ?? 0) + 1;
  const { data: circle, error } = await a.db
    .from("circles")
    .insert({
      season: SEASON.id,
      region: "test",
      number,
      capacity: SEASON.spots,
      is_test: true,
      kickoff_at: new Date().toISOString(),
      week_override: 1,
      season_no: 1,
    })
    .select("id")
    .single();
  if (error || !circle) return { ok: false, message: error?.message ?? "Couldn't make the Circle." };
  await a.db.from("profiles").update({ circle_id: circle.id }).in("id", castIds);
  await moveIn(a, circle.id);
  await logAdmin(a.me.userId, `made test Circle ${number}`, a.me.userId, { circle: circle.id });
  redirect("/circle");
}

async function moveIn(a: NonNullable<Awaited<ReturnType<typeof getAdmin>>>, circleId: string) {
  // Remember his real Circle so "Leave test Circle" puts him back.
  const p = a.me.profile as NonNullable<typeof a.me.profile> & { home_circle_id?: string | null };
  let home = p.home_circle_id ?? null;
  if (p.circle_id && p.circle_id !== circleId && !(await isTest(a, p.circle_id))) home = p.circle_id;
  await a.db.from("profiles").update({ circle_id: circleId, home_circle_id: home }).eq("id", a.me.userId);
}

async function isTest(a: NonNullable<Awaited<ReturnType<typeof getAdmin>>>, circleId: string) {
  const { data } = await a.db.from("circles").select("is_test").eq("id", circleId).maybeSingle();
  return !!data?.is_test;
}

export async function playIn(circleId: string): Promise<void> {
  const t = await testCircle(circleId);
  if (!t) redirect("/admin/circles");
  await moveIn(t.a, circleId);
  redirect("/circle");
}

export async function leaveTest(): Promise<void> {
  const a = await getAdmin();
  if (!a?.me.profile) redirect("/circle");
  const { data: p } = await a.db.from("profiles").select("home_circle_id").eq("id", a.me.userId).single();
  await a.db.from("profiles").update({ circle_id: p?.home_circle_id ?? null, home_circle_id: null }).eq("id", a.me.userId);
  if (!p?.home_circle_id && a.me.profile.region) {
    await a.db.rpc("place_member", { p_user: a.me.userId, p_season: SEASON.id, p_region: a.me.profile.region, p_capacity: SEASON.spots });
  }
  redirect("/circle");
}

// Jump a test Circle to any week. 9 means the Finale has been revealed.
export async function setWeek(circleId: string, week: number): Promise<Result> {
  const t = await testCircle(circleId);
  if (!t || !Number.isInteger(week) || week < 1 || week > 9) return { ok: false, message: "Not allowed." };
  await t.a.db.from("circles").update({ week_override: week }).eq("id", circleId);
  revalidatePath("/circle", "layout");
  return { ok: true, message: week === 9 ? "Finale revealed." : `Now in Week ${week}.` };
}

export async function nextSeason(circleId: string): Promise<Result> {
  const t = await testCircle(circleId);
  if (!t) return { ok: false, message: "Not allowed." };
  await t.a.db
    .from("circles")
    .update({ season_no: (t.c.season_no as number) + 1, week_override: 1, kickoff_at: new Date().toISOString() })
    .eq("id", circleId);
  revalidatePath("/circle", "layout");
  return { ok: true, message: `Season ${(t.c.season_no as number) + 1} started.` };
}
