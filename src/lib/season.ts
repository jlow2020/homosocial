// The game. Seasons run per Circle: a Circle kicks off once enough seats are
// taken, then runs 8 weeks and ends with the Finale.
export const SEASON = {
  id: "s1",
  name: "Season 1",
  spots: 30, // seats in a full Circle
  minToOpen: 9, // a Circle kicks off once this many seats are taken
  minAge: 18,
};

// The first guys in Florida to grab a seat are Founders, for good.
export const FOUNDER_CAP = 300;

export const WEEKS = [
  { n: 1, title: "Arrivals", blurb: "Who walked in, and what did they bring." },
  { n: 2, title: "Hot Takes", blurb: "Food, music, movies. Pick a side." },
  { n: 3, title: "Show and Tell", blurb: "Your fridge, your view, your worst tattoo." },
  { n: 4, title: "Confessions", blurb: "The things you only say on night four." },
  { n: 5, title: "Type", blurb: "What makes you stupid for a guy." },
  { n: 6, title: "Out", blurb: "Log off. Make a plan. Show up." },
  { n: 7, title: "Roses", blurb: "Everyone says something kind, out loud, by name." },
  { n: 8, title: "The Finale", blurb: "Sunday, 8pm. Private picks. Only mutuals revealed." },
];

// Season 1 is Florida only. Florida zips run 320xx to 349xx, except 340xx,
// which is military mail. Until matchmaking placement is built, guys are
// grouped by the first three digits of their zip, roughly one metro.
// A zip outside Florida gets no region, which puts him on the waitlist.
export const LAUNCH_AREA = "Florida";

export function regionForZip(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const prefix = Number(zip.slice(0, 3));
  if (prefix < 320 || prefix > 349 || prefix === 340) return null;
  return zip.slice(0, 3);
}

export function ageFrom(birthdate: string): number {
  const b = new Date(birthdate + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}
