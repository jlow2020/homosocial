// Speed Round rematches, for two guys in a DM. Ten questions, sixty seconds,
// same questions for both, answers side by side. Never the same question twice in one chat.
export const REMATCH_SECONDS = 60;

export const REMATCH_POOL: string[] = [
  "Celebrity crush", "Worst date, two words", "Best body part on a man", "Your type in one word", "Last text you sent",
  "Guilty pleasure song", "Deal breaker", "First kiss, where", "Go-to drink", "Something you'd never admit sober",
  "Lights on or off", "Weirdest place", "Longest dry spell", "Shortest relationship", "Something that always works on you",
  "Something that never works on you", "Underwear right now", "Last time you said no", "Big spoon or little spoon",
  "Morning or night", "Your karaoke song", "Worst pickup line you've used", "Most used emoji", "Ideal first date",
  "Cologne or no cologne", "Cats or dogs", "Pizza topping that's a red flag", "Your toxic trait", "Best thing about Florida",
  "Worst thing about Florida", "Last thing you googled", "Favorite diva", "A song that's about you", "What you notice first",
  "Text back fast or slow", "Your love language", "Tattoo or no tattoo", "Last time you cried", "Beach or pool",
  "Hottest accent", "Your celebrity lookalike", "Stay in or go out", "Most embarrassing crush", "Dream vacation",
  "Something you're weirdly good at", "Breakfast in bed or out", "First concert", "Biggest turn-on", "Biggest turn-off",
  "Who you'd call to bail you out", "Shower or bath", "Coffee order", "Ex you'd take back", "Netflix show you'd defend",
];

export function pickQuestions(used: Set<string>, seed: string, n = 10): string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const fresh = REMATCH_POOL.filter((q) => !used.has(q));
  const pool = fresh.length >= n ? fresh : REMATCH_POOL;
  const out: string[] = [];
  const copy = [...pool];
  while (out.length < n && copy.length) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    out.push(copy.splice(h % copy.length, 1)[0]);
  }
  return out;
}

// Same answer, near enough: lowercase, no punctuation, no "the".
export function sameAnswer(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, " ").trim();
  return !!n(a) && n(a) === n(b);
}
