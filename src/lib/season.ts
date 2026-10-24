// The game. Seasons run per Circle: a Circle starts once two guys are in,
// then runs 8 weeks and ends with the Finale.
export const SEASON = {
  id: "s1",
  name: "Season 1",
  spots: 30, // seats in a full Circle
  minToOpen: 2, // a Circle starts as soon as two guys are in
  minAge: 18,
};

// The first guys to join are Founders, for good.
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

// Anyone with a US zip can play. Where he lives decides his Circle (see place_member_geo).
export const MIN_SEAT_MILES = 150; // "close to home" when grouping guys

export function ageFrom(birthdate: string): number {
  const b = new Date(birthdate + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}
