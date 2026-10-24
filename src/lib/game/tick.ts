import "server-only";
import { purgeStaleVerifications } from "@/lib/retention";
import { alertAdmins } from "@/lib/moderation";
import { warmImageModels } from "@/lib/moderation/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WEEKS } from "@/lib/season";
import { claimNotice, notify, teaser } from "@/lib/notify";
import { clockFor } from "./clock";
import { fillGeo, fillCircles, placeMember } from "./place";
import { ensureDrop, promptOf } from "./drops";
import { lockWeek, awardSeason } from "./lock";
import { loadMembers, type Circle, type Member } from "./player";

// The clock's hands. Runs every few minutes (GitHub Actions hits /api/tick)
// and whenever a test Circle changes week. Each thing happens once per Circle.

const HOUR = 3600 * 1000;
const NUDGE_AFTER = 60 * HOUR; // two and a half days into the week
const READ_BEFORE_DROP = 11 * HOUR; // Sunday 8pm, when the next drop is Monday 7am

export async function tickAll(db: SupabaseClient): Promise<{ circles: number; sent: string[] }> {
  // Housekeeping the Privacy Policy promises: stale Realness Check frames go after 90 days.
  await purgeStaleVerifications(db).catch((e) => console.error("purge failed", e));
  await moderationDigest(db).catch((e) => console.error("digest failed", e));
  // Keep the nudity models loaded so the first borderline photo doesn't wait on them.
  void warmImageModels();
  // Nationwide: guys who signed up before get coordinates, and anyone who was
  // was waitlisted before nationwide gets a seat.
  await fillGeo(db).catch((e) => console.error("geo backfill failed", e));
  await seatWaitlist(db).catch((e) => console.error("waitlist seating failed", e));
  await fillCircles(db).catch((e) => console.error("circle labels failed", e));
  const { data } = await db.from("circles").select("*").not("kickoff_at", "is", null);
  const sent: string[] = [];
  for (const c of (data ?? []) as Circle[]) {
    try {
      sent.push(...(await tickCircle(db, c)));
    } catch (e) {
      console.error("tick failed for circle", c.id, e);
    }
  }
  return { circles: (data ?? []).length, sent };
}

export async function tickCircle(db: SupabaseClient, circle: Circle, now = new Date()): Promise<string[]> {
  const clock = clockFor(circle, now);
  if (clock.phase === "filling") return [];
  const members = await loadMembers(db, circle.id, circle.id);
  if (!members.length) return [];
  const ids = members.map((m) => m.id);
  const s = circle.season_no;
  const sent: string[] = [];

  const lockBefore = async (week: number) => {
    for (let w = 1; w < week; w++) {
      const { data: d } = await db.from("drops").select("*").eq("circle_id", circle.id).eq("season_no", s).eq("week", w).maybeSingle();
      if (d && !d.locked_at) {
        await lockWeek(db, circle, d as Parameters<typeof lockWeek>[2], members);
        if (await claimNotice(db, circle.id, `read:${s}:${w}`)) {
          await notify(db, ids, readNotice(w));
          sent.push(`read:${s}:${w}`);
        }
      }
    }
  };

  if (clock.phase === "revealed") {
    await lockBefore(9);
    if (await claimNotice(db, circle.id, `finale:${s}`)) {
      await awardSeason(db, circle, members);
      await notify(db, ids, { title: "The Finale 🌹", body: "Picks are in. Go see who picked you back.", url: "/circle/finale", tag: "finale" });
      sent.push(`finale:${s}`);
    }
    return sent;
  }

  const w = clock.week;
  await lockBefore(w);
  await revealBlindDates(db, circle, sent);

  // The drop lands.
  if (await claimNotice(db, circle.id, `drop:${s}:${w}`)) {
    const drop = await ensureDrop(db, circle, w);
    const p = promptOf(drop);
    const title = w === 1 ? "Your Circle is live" : `Week ${w}: ${WEEKS[w - 1].title}`;
    const extra = w === 7 ? " Roses are open." : w === 8 ? " Finale picks are open." : "";
    await notify(db, ids, { title, body: teaser(p.body) + extra, url: `/circle/week/${w}`, tag: "drop" });
    sent.push(`drop:${s}:${w}`);
  }

  // Midweek nudge for the guys who haven't answered.
  if (now.getTime() - clock.weekStart.getTime() >= NUDGE_AFTER && (await claimNotice(db, circle.id, `nudge:${s}:${w}`))) {
    const drop = await ensureDrop(db, circle, w);
    const { data: done } = await db.from("answers").select("user_id").eq("drop_id", drop.id);
    const answered = new Set((done ?? []).map((a) => a.user_id as string));
    const quiet = ids.filter((id) => !answered.has(id));
    if (answered.size > 0 && quiet.length) {
      await notify(db, quiet, {
        title: `${answered.size} of ${members.length} guys answered`,
        body: `You haven't. ${teaser(promptOf(drop).body, 70)}`,
        url: `/circle/week/${w}`,
        tag: "nudge",
        email: false,
      });
      sent.push(`nudge:${s}:${w}`);
    }
  }

  // Sunday 8pm: the week locks and the Read comes out. Week 8's Read is the Finale.
  if (clock.nextDrop && now.getTime() >= clock.nextDrop.getTime() - READ_BEFORE_DROP) {
    const drop = await ensureDrop(db, circle, w);
    if (!drop.locked_at) await lockWeek(db, circle, drop, members);
    if (await claimNotice(db, circle.id, `read:${s}:${w}`)) {
      await notify(db, ids, readNotice(w));
      sent.push(`read:${s}:${w}`);
    }
  }
  return sent;
}

// Blind dates whose week is over: tell both it's time to look.
async function revealBlindDates(db: SupabaseClient, circle: Circle, sent: string[]) {
  const { data: threads } = await db
    .from("dm_threads")
    .select("id, a, b, blind_drop, drops!dm_threads_blind_drop_fkey(circle_id)")
    .not("blind_until", "is", null)
    .lt("blind_until", new Date().toISOString())
    .eq("keep_a", false)
    .eq("keep_b", false);
  for (const t of threads ?? []) {
    const d = t.drops as unknown as { circle_id: string } | null;
    if (!d || d.circle_id !== circle.id) continue;
    if (await claimNotice(db, circle.id, `blind:${t.id}`)) {
      await notify(db, [t.a, t.b], { title: "💘 Blind Date reveal", body: "Faces are out. Go see who it was, and decide if you keep talking.", url: `/circle/dms/${t.id}`, tag: `dm:${t.id}` });
      sent.push(`blind:${t.id}`);
    }
  }
}

function readNotice(week: number) {
  return { title: "The Sunday Read 📰", body: `Week ${week} wrapped. The best answer, the Census, and who won.`, url: `/circle/read/${week}`, tag: "read" };
}

export type { Member };

// Once a day, after 9am Eastern: if anything is waiting in moderation, tell staff.
async function moderationDigest(db: SupabaseClient) {
  const now = new Date();
  const et = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (t: string) => et.find((x) => x.type === t)?.value ?? "";
  if (Number(part("hour")) < 9) return;
  const { count } = await db.from("mod_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (!count) return;
  const key = `digest:${part("year")}-${part("month")}-${part("day")}`;
  const { data } = await db.from("admin_notices").upsert({ key }, { onConflict: "key", ignoreDuplicates: true }).select("key");
  if (!data?.length) return;
  await alertAdmins(db, `${count} ${count === 1 ? "thing needs" : "things need"} a look`, "Your moderation queue. Two minutes, tops.", "/admin/moderation");
}

async function seatWaitlist(db: SupabaseClient): Promise<void> {
  const { data } = await db.from("profiles").select("id").eq("status", "waitlist").not("verified_at", "is", null).not("lat", "is", null).limit(100);
  for (const p of data ?? []) {
    await db.from("profiles").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", p.id).eq("status", "waitlist");
    await placeMember(db, p.id as string);
  }
}
