import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDrop } from "./drops";
import type { PlaySpec } from "./plays";
import {
  DEMO_ANSWERS,
  DEMO_FIRST_DM,
  DEMO_LOUNGE,
  DEMO_PICKS,
  DEMO_PLANS,
  DEMO_REPLIES,
  DEMO_ROSES,
  DEMO_SETUPS,
  CAST_BY_SLUG,
} from "./demo";

type TestCircle = { id: string; season_no: number; is_test: boolean; demo_seeded: Record<string, boolean> };

const EMOJI = ["fire", "lol", "crown", "heart"] as const;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

export function demoEmail(slug: string) {
  return `demo+${slug}@homosocial.net`;
}
export function slugOfEmail(email: string | null): string | null {
  const m = email?.match(/^demo\+([a-z]+)@homosocial\.net$/);
  return m ? m[1] : null;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

async function demoIds(db: SupabaseClient, circleId: string): Promise<Map<string, string>> {
  const { data } = await db.from("profiles").select("id, email").eq("circle_id", circleId).eq("is_demo", true);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    const slug = slugOfEmail(r.email as string | null);
    if (slug) map.set(slug, r.id as string);
  }
  return map;
}

// Brings a test Circle's fake guys up to `week`. Each week runs once.
export async function seedThrough(
  db: SupabaseClient,
  circle: TestCircle,
  week: number,
  playerId: string,
  playerName: string
): Promise<boolean> {
  const seeded = circle.demo_seeded ?? {};
  const todo: number[] = [];
  for (let w = 1; w <= week; w++) if (!seeded[`s${circle.season_no}w${w}`]) todo.push(w);
  if (!todo.length) return false;

  const ids = await demoIds(db, circle.id);
  const who = (slug: string) => (slug === "{me}" ? playerId : ids.get(slug));
  const fill = (t: string) => t.replaceAll("{me}", playerName);
  const now = Date.now();

  for (const w of todo) {
    // Claim the week first so two page loads can't seed it twice.
    const key = `s${circle.season_no}w${w}`;
    const { data: fresh } = await db.from("circles").select("demo_seeded").eq("id", circle.id).single();
    const marks = { ...((fresh?.demo_seeded as Record<string, boolean>) ?? {}), [key]: true };
    const { data: claimed } = await db
      .from("circles")
      .update({ demo_seeded: marks })
      .eq("id", circle.id)
      .is(`demo_seeded->>${key}`, null)
      .select("id");
    if (!claimed?.length) continue;

    const drop = await ensureDrop(db, circle, w);

    // Answers and a few reactions on each. Plays get made-up picks; text gets the script.
    const answers = (circle.season_no === 1 ? DEMO_ANSWERS[drop.prompt_id] : undefined) ?? [];
    const rows: Record<string, unknown>[] = drop.spec
      ? [...ids.entries()]
          .filter(() => Math.random() < 0.8)
          .map(([slug, id], i) => ({
            drop_id: drop.id,
            user_id: id,
            data:
              drop.spec!.kind === "rank"
                ? { order: drop.spec!.guys.filter((g) => g !== id).sort(() => Math.random() - 0.5), me: id }
                : demoPlay(drop.spec!, slug),
            created_at: new Date(now - (ids.size - i) * 31 * MIN).toISOString(),
          }))
          .filter((r) => r.data)
      : answers
          .filter(([slug]) => ids.has(slug))
          .map(([slug, body], i) => ({
            drop_id: drop.id,
            user_id: ids.get(slug)!,
            body: fill(body),
            created_at: new Date(now - (answers.length - i) * 37 * MIN).toISOString(),
          }));
    if (rows.length) {
      await db.from("answers").upsert(rows, { onConflict: "drop_id,user_id", ignoreDuplicates: true });
      const { data: saved } = await db.from("answers").select("id, user_id").eq("drop_id", drop.id);
      const reactions: { answer_id: string; user_id: string; emoji: string }[] = [];
      for (const a of saved ?? []) {
        if (a.user_id === playerId) continue;
        const fans = shuffle([...ids.values()].filter((id) => id !== a.user_id)).slice(0, 2 + Math.floor(Math.random() * 6));
        for (const f of fans) reactions.push({ answer_id: a.id, user_id: f, emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)] });
      }
      if (reactions.length) await db.from("reactions").upsert(reactions, { ignoreDuplicates: true });
      // Mad Libs: the fake guys vote for a story. Two Truths: they vote on lies.
      const theirs = (saved ?? []).filter((a) => a.user_id !== playerId);
      if (drop.spec?.kind === "madlibs" && theirs.length > 1) {
        const votes = [...ids.values()].map((voter) => {
          const pool = theirs.filter((a) => a.user_id !== voter);
          const pick = pool[Math.floor(Math.random() * pool.length)];
          return pick ? { drop_id: drop.id, voter, answer_id: pick.id } : null;
        }).filter(Boolean);
        if (votes.length) await db.from("story_votes").upsert(votes as { drop_id: string; voter: string; answer_id: string }[], { onConflict: "drop_id,voter", ignoreDuplicates: true });
      }
      if (drop.spec?.kind === "twotruths" && theirs.length) {
        const votes: { drop_id: string; voter: string; answer_id: string; choice: number }[] = [];
        for (const voter of ids.values()) for (const a of theirs) if (a.user_id !== voter && Math.random() < 0.7) votes.push({ drop_id: drop.id, voter, answer_id: a.id, choice: Math.floor(Math.random() * 3) });
        if (votes.length) await db.from("votes").upsert(votes, { onConflict: "drop_id,voter,answer_id", ignoreDuplicates: true });
      }
      if ((drop.mode === "guesswho" || drop.mode === "owner") && theirs.length) {
        const all = [...ids.values()];
        const guesses: { drop_id: string; guesser: string; answer_id: string; guessed: string }[] = [];
        for (const guesser of all) for (const a of theirs) if (a.user_id !== guesser && Math.random() < 0.6) guesses.push({ drop_id: drop.id, guesser, answer_id: a.id, guessed: Math.random() < 0.4 ? a.user_id : all[Math.floor(Math.random() * all.length)] });
        if (guesses.length) await db.from("guesses").upsert(guesses, { onConflict: "drop_id,guesser,answer_id", ignoreDuplicates: true });
      }
    }

    // The Lounge.
    const lines = (DEMO_LOUNGE[w] ?? []).filter(([slug]) => ids.has(slug));
    if (lines.length) {
      await db.from("lounge_messages").insert(
        lines.map(([slug, body], i) => ({
          circle_id: circle.id,
          user_id: ids.get(slug)!,
          body: fill(body),
          created_at: new Date(now - (lines.length - i) * 9 * MIN).toISOString(),
        }))
      );
    }

    // Plans.
    for (const plan of DEMO_PLANS.filter((x) => x.week === w && ids.has(x.by))) {
      const when = new Date(now + plan.daysIn * DAY);
      when.setUTCHours(plan.hour + 4, 0, 0, 0); // Eastern daylight time
      const { data: made } = await db
        .from("plans")
        .insert({ circle_id: circle.id, user_id: ids.get(plan.by)!, title: plan.title, place: plan.place, details: plan.details, starts_at: when.toISOString() })
        .select("id")
        .single();
      const going = [plan.by, ...plan.rsvps].filter((s) => ids.has(s)).map((s) => ({ plan_id: made!.id, user_id: ids.get(s)! }));
      if (made && going.length) await db.from("plan_rsvps").upsert(going, { ignoreDuplicates: true });
    }

    // Week 1: somebody slides in.
    if (w === 1 && ids.has(DEMO_FIRST_DM.from)) {
      const other = ids.get(DEMO_FIRST_DM.from)!;
      const [a, b] = [other, playerId].sort();
      await db.from("dm_threads").upsert({ a, b, requested_by: other }, { onConflict: "a,b", ignoreDuplicates: true });
      const { data: t } = await db.from("dm_threads").select("id").eq("a", a).eq("b", b).single();
      const { count } = await db.from("dm_messages").select("id", { count: "exact", head: true }).eq("thread_id", t!.id);
      if (!count) await db.from("dm_messages").insert({ thread_id: t!.id, user_id: other, body: DEMO_FIRST_DM.body });
    }

    // Week 7: Roses.
    if (w === 7) {
      const roses = DEMO_ROSES.map(([f, t, body]) => ({ from_id: who(f), to_id: who(t), body: fill(body) }))
        .filter((r) => r.from_id && r.to_id)
        .map((r) => ({ ...r, circle_id: circle.id, season_no: circle.season_no }));
      if (roses.length) await db.from("roses").upsert(roses, { onConflict: "circle_id,season_no,from_id,to_id", ignoreDuplicates: true });
    }

    // Week 8: picks, setups, and everyone stays.
    if (w === 8) {
      const picks: Record<string, unknown>[] = [];
      for (const p of DEMO_PICKS) {
        const from = who(p.from);
        if (!from) continue;
        for (const t of p.friend) if (who(t)) picks.push({ circle_id: circle.id, season_no: circle.season_no, from_id: from, to_id: who(t), kind: "friend" });
        for (const t of p.date) if (who(t)) picks.push({ circle_id: circle.id, season_no: circle.season_no, from_id: from, to_id: who(t), kind: "date" });
      }
      if (picks.length) await db.from("picks").upsert(picks, { ignoreDuplicates: true });
      const setups = DEMO_SETUPS.map(([f, x, y]) => [who(f), who(x), who(y)])
        .filter((r) => r.every(Boolean))
        .map(([f, x, y]) => {
          const [a, b] = [x!, y!].sort();
          return { circle_id: circle.id, season_no: circle.season_no, from_id: f, a, b };
        });
      if (setups.length) await db.from("setups").upsert(setups, { ignoreDuplicates: true });
      const stays = [...ids.values()].map((id) => ({ circle_id: circle.id, season_no: circle.season_no, user_id: id, choice: "stay" }));
      await db.from("stay_choices").upsert(stays, { onConflict: "circle_id,season_no,user_id", ignoreDuplicates: true });
    }

  }
  return true;
}

// The player answered in a test Circle: the room reacts.
export async function demoReactToAnswer(db: SupabaseClient, circleId: string, answerId: string) {
  const ids = [...(await demoIds(db, circleId)).values()];
  if (!ids.length) return;
  const fans = shuffle(ids).slice(0, 5 + Math.floor(Math.random() * 6));
  await db.from("reactions").upsert(
    fans.map((f, i) => ({ answer_id: answerId, user_id: f, emoji: i < 3 ? "fire" : EMOJI[Math.floor(Math.random() * EMOJI.length)] })),
    { ignoreDuplicates: true }
  );
  const talkers = shuffle(ids).slice(0, 2);
  const lines = shuffle(DEMO_REPLIES).slice(0, talkers.length);
  await db.from("replies").insert(
    talkers.map((t, i) => ({ answer_id: answerId, user_id: t, body: lines[i], created_at: new Date(Date.now() + (i + 1) * 1000).toISOString() }))
  );
}

// The player messaged a fake guy: he writes back.
export async function demoReplyInThread(db: SupabaseClient, threadId: string, demoId: string, email: string | null) {
  const guy = CAST_BY_SLUG.get(slugOfEmail(email) ?? "");
  if (!guy) return;
  const { count } = await db.from("dm_messages").select("id", { count: "exact", head: true }).eq("thread_id", threadId).eq("user_id", demoId);
  const body = guy.dmReplies[(count ?? 0) % guy.dmReplies.length];

  // He reads it, reacts to it, then writes back.
  const { data: t } = await db.from("dm_threads").select("a").eq("id", threadId).single();
  const readCol = t?.a === demoId ? "read_a" : "read_b";
  const { data: last } = await db
    .from("dm_messages")
    .select("id, media_type")
    .eq("thread_id", threadId)
    .neq("user_id", demoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && (last.media_type || Math.random() < 0.5)) {
    const emoji = last.media_type ? "🔥" : ["❤️", "😂", "👑"][Math.floor(Math.random() * 3)];
    await db.from("dm_reactions").upsert({ message_id: last.id, user_id: demoId, emoji }, { onConflict: "message_id,user_id" });
  }
  await db.from("dm_messages").insert({ thread_id: threadId, user_id: demoId, body, created_at: new Date(Date.now() + 1500).toISOString() });
  await db.from("dm_threads").update({ last_at: new Date().toISOString(), [readCol]: new Date(Date.now() + 2000).toISOString() }).eq("id", threadId);
}

// Made-up play answers for the fake guys. Video has none: they can't film.
function demoPlay(spec: PlaySpec, slug: string): Record<string, unknown> | null {
  const guy = CAST_BY_SLUG.get(slug);
  const coin = () => Math.random() < 0.5;
  switch (spec.kind) {
    case "survey":
      return { answers: spec.questions.map(() => Math.random() < 0.45) };
    case "thisorthat":
      return { picks: spec.pairs.map(() => (coin() ? 0 : 1)) };
    case "madlibs": {
      const banks: Record<string, string[]> = {
        "a body part": ["forearms", "shoulders", "thighs", "hands", "neck", "calves"],
        "something sold at Publix": ["a Pub Sub", "key lime pie", "Cuban bread", "a bag of ice", "chicken tenders", "a $4 bouquet"],
        "an ex's first name": ["Brandon", "Tyler", "Marcus", "Kyle", "Diego", "Chase"],
        "a verb ending in -ing": ["making out", "arguing", "dancing", "crying", "singing Cher", "hiding"],
        "a place in Florida": ["Siesta Key", "a Wawa", "the Ringling", "Ybor City", "a Buc-ee's", "Key West"],
        "an adjective": ["humid", "illegal", "romantic", "sticky", "unforgettable", "a mistake"],
        "a number": ["four", "eleven", "two", "nine", "zero", "thirty"],
        "a breakfast food": ["bacon", "a Pop-Tart", "cold pizza", "waffles", "cafecito", "an egg sandwich"],
        "a celebrity": ["Pedro Pascal", "Jonathan Bailey", "Bad Bunny", "Chris Evans", "Lil Nas X", "Dolly Parton"],
        "a verb": ["cook", "apologize", "dance", "lie", "cry", "text back"],
        "an article of clothing": ["underwear", "left sock", "jockstrap", "cardigan", "swim trunks", "dignity"],
        "a feeling": ["smug", "seen", "sunburned", "alive", "hungry", "in love, briefly"],
        "a Florida town": ["Nokomis", "Osprey", "Palmetto", "Venice", "Englewood", "Bradenton"],
      };
      return { words: spec.slots.map((s) => { const b = banks[s] ?? ["something"]; return b[Math.floor(Math.random() * b.length)]; }) };
    }
    case "speed": {
      const pool = ["forearms", "no comment", "a Kia Soul", "Tyler", "him, obviously", "vodka soda", "don't ask", "the beach", "yes", "my ex", "3am", "Publix", "ask Hollis", "once", "twice", "shoulders"];
      return { answers: spec.questions.map((_, i) => (i < 3 + Math.floor(Math.random() * 7) ? pool[Math.floor(Math.random() * pool.length)] : "")) };
    }
    case "twotruths": {
      const truths = guy ? [`I'm from ${guy.town}.`, `I'm into ${guy.interests.split(",")[0].trim()}.`, "I've hooked up in a car.", "I've been on a boat I didn't own.", "I've sent a nude to the wrong person."] : ["I've been to Key West.", "I own a boat.", "I've cried at a drag show."];
      const lies = ["I've never been to Miami.", "I was a Chippendale for one summer.", "I have a twin.", "I've never sent a nude.", "I dated a Real Housewife."];
      const t = truths.sort(() => Math.random() - 0.5).slice(0, 2);
      const l = lies[Math.floor(Math.random() * lies.length)];
      const lie = Math.floor(Math.random() * 3);
      const statements = [...t];
      statements.splice(lie, 0, l);
      return { statements, lie };
    }
    case "rank": {
      return null; // Filled in by demoRank, which knows the guys' ids.
    }
    case "chain": {
      const lines = ["a man in a Speedo holding a casserole, and before I could say anything he", "Dante, shirtless, already arguing with someone about", "my ex, of course it was my ex, and he was holding", "the smell of Cuban bread and bad decisions, which meant", "nobody I knew, and he winked, so naturally I", "a parrot, which was fine, except the man under it was", "two guys from this Circle who weren't talking, until", "Hollis, in velvet, saying 'places,' and then the lights"];
      return { line: lines[Math.floor(Math.random() * lines.length)] };
    }
    case "hotseat": {
      const qs = ["Worst date you've ever been on?", "Who in this Circle would you take to dinner?", "Lights on or off?", "Biggest lie on your profile?", "What's your actual type?", "When did you last cry?", "Best kiss of your life, first name?", "What are you hiding in that nightstand?"];
      return { question: qs[Math.floor(Math.random() * qs.length)] };
    }
    case "caption": {
      const caps = ["Sir, this is a Publix.", "The audacity. The lighting. The man.", "He knows what he did.", "Florida man, but make it fashion.", "POV: you're about to get a DM.", "I'd let him make me breakfast."];
      return { caption: caps[Math.floor(Math.random() * caps.length)] };
    }
    case "video":
    case "voice":
    case "owner":
    case "blinddate":
      return null;
  }
}

