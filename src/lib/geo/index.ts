import "server-only";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zipcodes = require("zipcodes") as { lookup: (zip: string) => { zip: string; latitude: number; longitude: number; city: string; state: string; country: string } | undefined };

// Where a zip is: rough center, town, state, and the time zone the game runs on.
export type Place = { lat: number; lng: number; city: string; state: string; tz: string };

const STATE_TZ: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago", CA: "America/Los_Angeles",
  CO: "America/Denver", CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York",
  GA: "America/New_York", HI: "Pacific/Honolulu", ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago", KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York",
  MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago", NV: "America/Los_Angeles", NH: "America/New_York",
  NJ: "America/New_York", NM: "America/Denver", NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago",
  OH: "America/New_York", OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", UT: "America/Denver",
  VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles", WV: "America/New_York", WI: "America/Chicago",
  WY: "America/Denver", PR: "America/Puerto_Rico",
};

// States split across two time zones, by longitude. Close enough for "when does Monday's drop land".
function tzFor(state: string, lat: number, lng: number): string {
  if (state === "FL" && lng < -85.0) return "America/Chicago"; // Panhandle west of the Apalachicola
  if (state === "TX" && lng < -104.9) return "America/Denver"; // El Paso
  if (state === "TN" && lng > -85.3) return "America/New_York"; // East Tennessee
  if (state === "KY" && lng < -86.0) return "America/Chicago"; // Western Kentucky
  if (state === "IN" && lng < -86.9) return "America/Chicago"; // NW and SW Indiana
  if (state === "MI" && lng < -87.6) return "America/Chicago"; // Western Upper Peninsula
  if (state === "ND" && lng < -101.5) return "America/Denver";
  if (state === "SD" && lng < -100.4) return "America/Denver";
  if (state === "NE" && lng < -101.4) return "America/Denver";
  if (state === "KS" && lng < -101.4) return "America/Denver";
  if (state === "ID" && lat > 45.6) return "America/Los_Angeles"; // North Idaho
  if (state === "OR" && lng > -117.9) return "America/Boise"; // Malheur County
  return STATE_TZ[state] ?? "America/New_York";
}

export function placeForZip(zip: string): Place | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const z = zipcodes.lookup(zip);
  if (!z || z.country !== "US" || !Number.isFinite(z.latitude) || !Number.isFinite(z.longitude)) return null;
  return { lat: z.latitude, lng: z.longitude, city: z.city, state: z.state, tz: tzFor(z.state, z.latitude, z.longitude) };
}
