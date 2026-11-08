import "server-only";
import { purgeStaleVerifications } from "@/lib/retention";
import { alertAdmins } from "@/lib/moderation";
import { warmImageModels } from "@/lib/moderation/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ID_GRACE_DAYS, WEEKS } from "@/lib/season";
import { claimNotice, notify, sendEmail, teaser } from "@/lib/notify";
import { adminAlert, dailyDigest } from "@/lib/alerts";
import { clockFor, closesAt, finaleFor, DEFAULT_TZ } from "./clock";
import { fillGeo, fillCircles, placeMember, rehomeLoners } from "./place";
import { ensureDrop, promptOf } from "./drops";
import { lockWeek, awardSeason } from "./lock";
import { pingMinis } from "./mini-engine";
import { loadAlumni, loadMembers, type Circle, type Member } from "./player";

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
  await rehomeLoners(db).catch((e) => console.error("rehoming loners failed", e));
  const { data } = await db.from("circles").select("*").not("kickoff_at", "is", null);
  const sent: string[] = [];
  for (const c of (data ?? []) as Circle[]) {
    // When the Finale is, so finished Circles stop taking new guys.
    if (!c.finale_at && c.kickoff_at) {
      c.finale_at = finaleFor(new Date(c.kickoff_at), c.tz || DEFAULT_TZ).toISOString();
      await db.from("circles").update({ finale_at: c.finale_at }).eq("id", c.id).is("finale_at", null);
    }
    // Tell the admins when a Circle starts.
    if (!(c as Circle & { is_test?: boolean }).is_test && (await claimNotice(db, c.id, "admin:kickoff"))) {
      const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("circle_id", c.id);
      await adminAlert(db, {
        title: "A Circle just started",
        body: `Circle ${c.number}${c.label ? ` (${c.label})` : ""} is live with ${count ?? 0} guys.`,
        url: "/admin/circles",
      });
    }
    try {
      sent.push(...(await tickCircle(db, c)));
    } catch (e) {
      console.error("tick failed for circle", c.id, e);
    }
  }
  try {
    sent.push(...(await dmEmails(db)));
  } catch (e) {
    console.error("dm emails failed", e);
  }
  try {
    sent.push(...(await idReminders(db)));
  } catch (e) {
    console.error("id reminders failed", e);
  }
  try {
    if (await dailyDigest(db)) sent.push("admin:digest");
  } catch (e) {
    console.error("digest failed", e);
  }
  return { circles: (data ?? []).length, sent };
}

// The backup for a DM he hasn't seen: if a message has sat unread for 15
// minutes, one email (no message text, just who). At most one per chat every 6 hours.
async function dmEmails(db: SupabaseClient, now = new Date()): Promise<string[]> {
  const MIN = 60 * 1000;
  const { data: msgs } = await db
    .from("dm_messages")
    .select("thread_id, user_id, created_at")
    .eq("held", false)
    .gt("created_at", new Date(now.getTime() - 3 * HOUR).toISOString())
    .lte("created_at", new Date(now.getTime() - 15 * MIN).toISOString())
    .order("created_at", { ascending: false });
  if (!msgs?.length) return [];
  const latest = new Map<string, { user_id: string; created_at: string }>();
  for (const m of msgs) if (!latest.has(m.thread_id as string)) latest.set(m.thread_id as string, { user_id: m.user_id as string, created_at: m.created_at as string });
  const { data: threads } = await db.from("dm_threads").select("id, a, b, read_a, read_b, blind_until").in("id", [...latest.keys()]);
  const due: { thread: string; to: string; from: string; blind: boolean }[] = [];
  for (const t of threads ?? []) {
    const m = latest.get(t.id as string)!;
    const toA = m.user_id !== t.a;
    const read = (toA ? t.read_a : t.read_b) as string | null;
    if (read && new Date(read) >= new Date(m.created_at)) continue;
    due.push({ thread: t.id as string, to: (toA ? t.a : t.b) as string, from: m.user_id, blind: !!t.blind_until && new Date(t.blind_until as string) > now });
  }
  if (!due.length) return [];
  const { data: people } = await db.from("profiles").select("id, first_name, email, notify_email, status, is_demo, circle_id").in("id", [...new Set(due.flatMap((d) => [d.to, d.from]))]);
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  const sent: string[] = [];
  const slot = Math.floor(now.getTime() / (6 * HOUR));
  for (const d of due) {
    const to = byId.get(d.to);
    if (!to || to.is_demo || to.status !== "active" || !to.notify_email || !to.email || !to.circle_id) continue;
    if (!(await claimNotice(db, to.circle_id as string, `dmmail:${d.thread}:${d.to}:${slot}`))) continue;
    const name = d.blind ? "Your blind date" : (byId.get(d.from)?.first_name as string) || "Someone";
    await sendEmail(to.email as string, { title: `${name} sent you a message`, body: "It's waiting for you on Homosocial.", url: `/circle/dms/${d.thread}` }, "You get these when a DM sits unread. Turn them off from your profile.", "Read it");
    sent.push(`dmmail:${d.thread}`);
  }
  return sent;
}

// A day before his ID check is due, one reminder.
async function idReminders(db: SupabaseClient, now = new Date()): Promise<string[]> {
  const day = 24 * HOUR;
  const from = new Date(now.getTime() - ID_GRACE_DAYS * day).toISOString();
  const to = new Date(now.getTime() - (ID_GRACE_DAYS - 1) * day).toISOString();
  const { data } = await db
    .from("profiles")
    .select("id, circle_id")
    .is("id_verified_at", null)
    .eq("status", "active")
    .not("circle_id", "is", null)
    .gt("verified_at", from)
    .lte("verified_at", to);
  const sent: string[] = [];
  for (const p of data ?? []) {
    if (!(await claimNotice(db, p.circle_id as string, `iddue:${p.id}`))) continue;
    await notify(db, [p.id as string], {
      title: "Your ID check is due tomorrow",
      body: "It takes about a minute, and it keeps you in your Circle.",
      url: "/verify/id",
      tag: "iddue",
    });
    sent.push(`iddue:${p.id}`);
  }
  return sent;
}

export async function tickCircle(db: SupabaseClient, circle: Circle, now = new Date()): Promise<string[]> {
  const clock = clockFor(circle, now);
  if (clock.phase === "filling") return [];
  // Long finished: nothing left to do.
  if (clock.phase === "revealed" && now > closesAt(clock.finaleAt)) return [];
  const members = await loadMembers(db, circle.id, circle.id);
  if (!members.length && clock.phase !== "revealed") return [];
  const ids = members.map((m) => m.id);
  const s = circle.season_no;
  const sent: string[] = [];

  const lockBefore = async (week: number, who: Member[] = members) => {
    for (let w = 1; w < week; w++) {
      const { data: d } = await db.from("drops").select("*").eq("circle_id", circle.id).eq("season_no", s).eq("week", w).maybeSingle();
      if (d && !d.locked_at) {
        await lockWeek(db, circle, d as Parameters<typeof lockWeek>[2], who);
        if (await claimNotice(db, circle.id, `read:${s}:${w}`)) {
          await notify(db, who.map((m) => m.id), readNotice(w));
          sent.push(`read:${s}:${w}`);
        }
      }
    }
  };

  if (clock.phase === "revealed") {
    const everyone = await loadAlumni(db, circle, circle.id);
    const all = everyone.length ? everyone : members;
    if (!all.length) return sent;
    await lockBefore(9, all);
    if (await claimNotice(db, circle.id, `finale:${s}`)) {
      await awardSeason(db, circle, all);
      await notify(db, all.map((m) => m.id), { title: "The Finale 🌹", body: "Picks are in. Go see who picked you back.", url: "/circle/finale", tag: "finale" });
      sent.push(`finale:${s}`);
    }
    // The next morning: anyone who hasn't joined the next Season yet gets asked.
    if (now.getTime() >= clock.finaleAt.getTime() + 13 * HOUR && now < closesAt(clock.finaleAt) && ids.length && (await claimNotice(db, circle.id, `next:${s}`))) {
      await notify(db, ids, { title: "Next Season is open", body: "New Circle, new guys, near you. Your mutuals come with you.", url: "/circle", tag: "next" });
      sent.push(`next:${s}`);
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
        body: `You haven't. Play to unlock this week's minis. ${teaser(promptOf(drop).body, 50)}`,
        url: `/circle/week/${w}`,
        tag: "nudge",
        email: false,
      });
      sent.push(`nudge:${s}:${w}`);
    }
  }

  // Minis unlock per guy after he plays the drop. Push each one as it opens.
  const minis = await pingMinis(db, circle, clock, ids, now);
  if (minis) sent.push(`minis:${s}:${w}:${minis}`);

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
