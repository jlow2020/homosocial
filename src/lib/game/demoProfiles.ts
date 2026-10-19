import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tagsInText } from "@/lib/profile/catalog";
import { STARTERS, PROFILE_PROMPTS, ZODIAC } from "@/lib/profile/prompts";
import { CAST_BY_SLUG } from "./demo";

// Rich profiles for the fake guys, so the test Circle shows everything.
const EXTRA: Record<string, { more: string; down: string[]; work: string; song: string; spot: string; pronouns?: string }> = {
  dante: { more: "boxing gym, true crime podcasts, horror movies", down: ["gym-buddy", "drinks", "movies"], work: "Paramedic", song: "Doja Cat, Agora Hills", spot: "The taco truck on Cortez" },
  kofi: { more: "baking, thrifting, sitcoms, coffee", down: ["coffee", "thrifting", "brunch"], work: "Pastry chef", song: "Whitney Houston, I Wanna Dance", spot: "Any thrift store with a dollar rack" },
  ryan: { more: "paddleboarding, boat days, grilling, sunsets", down: ["beach-day", "boat-days", "day-trips"], work: "Charter boat captain", song: "Jimmy Buffett, Come Monday", spot: "Siesta Key at 6:52pm" },
  luis: { more: "salsa dancing, cooking, latin music, dinner parties", down: ["dancing", "dinner", "cooking-together"], work: "Line cook", song: "Marc Anthony, Vivir Mi Vida", spot: "The salsa night in Ybor" },
  tyler: { more: "gym, anime, video games, coffee", down: ["gym-buddy", "game-night", "coffee"], work: "Personal trainer", song: "Kendrick Lamar, Not Like Us", spot: "The 24-hour gym at 5am", pronouns: "he/him" },
  ben: { more: "puzzles, birding, reading, coffee", down: ["coffee", "hikes", "study-sessions"], work: "Librarian", song: "Joni Mitchell, A Case of You", spot: "Myakka at sunrise" },
  marco: { more: "pickleball, trivia, startups, wine", down: ["pickup-games", "drinks", "watch-parties"], work: "Event planner", song: "Robyn, Dancing On My Own", spot: "The pickleball courts at Payne Park" },
  andre: { more: "cooking, vinyl, hot sauce, jazz", down: ["dinner", "concerts", "cooking-together"], work: "Sous chef", song: "D'Angelo, Untitled", spot: "The record store downtown" },
  sam: { more: "printmaking, horror movies, thrifting, museums", down: ["thrifting", "movies", "day-trips"], work: "Art teacher", song: "Mitski, Nobody", spot: "The Ringling courtyard", pronouns: "he/they" },
  hollis: { more: "musical theater, gardening, cocktails, karaoke", down: ["karaoke", "drinks", "brunch"], work: "Community theater director", song: "Sondheim, Being Alive", spot: "The Asolo, front row" },
  jae: { more: "nursing, k-pop, karaoke, studying", down: ["karaoke", "study-sessions", "coffee"], work: "Night shift nurse", song: "Seventeen, Very Nice", spot: "The noraebang in Tampa" },
  wes: { more: "fishing, woodworking, country music, trucks", down: ["boat-days", "hikes", "concerts"], work: "Carpenter", song: "George Strait, Amarillo by Morning", spot: "The bait shop on the pier" },
  theo: { more: "djing, coffee, vintage, house music", down: ["dancing", "concerts", "coffee"], work: "DJ and barista", song: "Kaytranada, Lite Spots", spot: "The rooftop on Main" },
  gabe: { more: "running, travel, languages, cats", down: ["running-buddy", "brunch", "road-trips"], work: "Flight attendant", song: "Rosalía, Despechá", spot: "The bayfront path at dawn" },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export async function seedDemoProfiles(db: SupabaseClient, ids: Map<string, string>): Promise<void> {
  for (const [slug, id] of ids) {
    const cast = CAST_BY_SLUG.get(slug);
    const x = EXTRA[slug];
    if (!cast || !x) continue;
    const { count } = await db.from("user_tags").select("slug", { count: "exact", head: true }).eq("user_id", id);
    if (count) continue;
    const tags = [...new Set(tagsInText(`${cast.interests}, ${x.more}`))].slice(0, 8);
    await db.from("user_tags").insert([...tags.map((t) => ({ user_id: id, slug: t, kind: "interest" })), ...x.down.map((d) => ({ user_id: id, slug: d, kind: "down" }))]);
    const h = hash(slug);
    const prompts = [0, 1, 2].map((k) => PROFILE_PROMPTS[(h + k * 7) % PROFILE_PROMPTS.length]);
    await db.from("profile_answers").insert(prompts.map((p, i) => ({ user_id: id, prompt_id: p.id, body: (STARTERS[p.id] ?? ["…"])[(h >> (i * 3)) % (STARTERS[p.id]?.length ?? 1)], position: i })));
    await db
      .from("profiles")
      .update({ hometown: cast.town, work: x.work, song: x.song, spot: x.spot, zodiac: ZODIAC[h % 12], pronouns: x.pronouns ?? null, relationship: cast.dating ? "Single" : null, show_relationship: cast.dating })
      .eq("id", id);
  }
}
