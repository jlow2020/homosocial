// The show. Seasons run per Circle: a Circle premieres once it has enough
// cast, then runs 8 weekly episodes and ends with the Finale.
export const SEASON = {
  id: "s1",
  name: "Season 1",
  spots: 30, // cast size of a full Circle
  minToOpen: 9, // a Circle premieres once this many guys are in
  minAge: 21,
};

export const EPISODES = [
  { n: 1, title: "Arrivals", blurb: "Who walked in, and what did they bring." },
  { n: 2, title: "Hot Takes", blurb: "Food, music, movies. Pick a side." },
  { n: 3, title: "Show and Tell", blurb: "Your fridge, your view, your worst tattoo." },
  { n: 4, title: "Confessions", blurb: "The things you only say on night four." },
  { n: 5, title: "Type", blurb: "What makes you stupid for a guy." },
  { n: 6, title: "Out", blurb: "Log off. Make a plan. Show up." },
  { n: 7, title: "Roses", blurb: "Everyone says something kind, out loud, by name." },
  { n: 8, title: "The Finale", blurb: "Sunday, 8pm. Private picks. Only mutuals revealed." },
];

// Open everywhere in the US. Until matchmaking placement is built, guys are
// grouped by the first three digits of their zip, which is roughly one metro.
export function regionForZip(zip: string): string | null {
  return /^\d{5}$/.test(zip) ? zip.slice(0, 3) : null;
}

export function ageFrom(birthdate: string): number {
  const b = new Date(birthdate + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}
