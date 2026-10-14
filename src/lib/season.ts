// Edit these when a new Season is announced.
export const SEASON = {
  id: "s0",
  name: "Season 0",
  area: "Sarasota, Bradenton & Lakewood Ranch",
  areaShort: "Sarasota",
  spots: 40,
  starts: "November 2",
  lastCall: "December 21",
  next: "Season 1 starts in January",
};

// Where Circles are open right now. A zip outside these goes on the waitlist.
const REGIONS: { id: string; name: string; zipPrefixes: string[] }[] = [
  { id: "sarasota", name: "Sarasota", zipPrefixes: ["342"] },
];

export function regionForZip(zip: string): string | null {
  const r = REGIONS.find((r) => r.zipPrefixes.some((p) => zip.startsWith(p)));
  return r ? r.id : null;
}

export function regionName(id: string | null | undefined): string {
  return REGIONS.find((r) => r.id === id)?.name ?? "";
}

export function ageFrom(birthdate: string): number {
  const b = new Date(birthdate + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}
