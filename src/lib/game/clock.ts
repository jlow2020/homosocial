// The Circle clock. Every Circle runs on its own schedule, in its own time zone:
// Week 1 starts the moment it kicks off and runs to the next Monday drop
// (or the Monday after, if that's under 4 days away). From then on drops
// land Mondays at 7am and the Finale is Sunday of Week 8 at 8pm, local time.

export const DEFAULT_TZ = "America/New_York";
const DROP_HOUR = 7;
const FINALE_HOUR = 20;
const DAY = 24 * 60 * 60 * 1000;

export type CircleClockInput = {
  kickoff_at: string | null;
  tz?: string | null;
};

export type Clock =
  | { phase: "filling" }
  | { phase: "season"; week: number; weekStart: Date; nextDrop: Date | null; finaleAt: Date }
  | { phase: "revealed"; finaleAt: Date };

// Wall-clock parts of an instant in a time zone.
function etParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, dow };
}

// The instant when it's y-m-d h:00 in that time zone.
function etInstant(y: number, m: number, d: number, h: number, tz: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h));
  const p = etParts(guess, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}

function addDaysET(base: Date, days: number, hour: number, tz: string): Date {
  const p = etParts(base, tz);
  const noon = new Date(Date.UTC(p.y, p.m - 1, p.d, 12) + days * DAY);
  return etInstant(noon.getUTCFullYear(), noon.getUTCMonth() + 1, noon.getUTCDate(), hour, tz);
}

// When each week starts for a Circle that kicked off at `kickoff`.
export function weekStarts(kickoff: Date, tz: string = DEFAULT_TZ): Date[] {
  const p = etParts(kickoff, tz);
  let daysToMonday = (8 - p.dow) % 7 || 7;
  let firstMonday = addDaysET(kickoff, daysToMonday, DROP_HOUR, tz);
  if (firstMonday.getTime() - kickoff.getTime() < 4 * DAY) {
    daysToMonday += 7;
    firstMonday = addDaysET(kickoff, daysToMonday, DROP_HOUR, tz);
  }
  const starts = [kickoff];
  for (let w = 2; w <= 8; w++) starts.push(addDaysET(firstMonday, (w - 2) * 7, DROP_HOUR, tz));
  return starts;
}

export function finaleFor(kickoff: Date, tz: string = DEFAULT_TZ): Date {
  return addDaysET(weekStarts(kickoff, tz)[7], 6, FINALE_HOUR, tz);
}

export function clockFor(c: CircleClockInput, now = new Date()): Clock {
  if (!c.kickoff_at) return { phase: "filling" };
  const tz = c.tz || DEFAULT_TZ;
  const kickoff = new Date(c.kickoff_at);
  const starts = weekStarts(kickoff, tz);
  const finaleAt = finaleFor(kickoff, tz);
  if (now >= finaleAt) return { phase: "revealed", finaleAt };
  let week = 1;
  for (let i = 0; i < starts.length; i++) if (now >= starts[i]) week = i + 1;
  return { phase: "season", week, weekStart: starts[week - 1], nextDrop: week < 8 ? starts[week] : null, finaleAt };
}

// "Monday, Oct 26, 7:00 AM" in the Circle's own time zone.
const fmts = new Map<string, Intl.DateTimeFormat>();
export function etLabel(d: Date, tz: string = DEFAULT_TZ): string {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    fmts.set(tz, f);
  }
  return f.format(d);
}

export function untilLabel(d: Date, now = new Date()): string {
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `in ${Math.floor(h / 24)} days`;
  if (h >= 1) return `in ${h} ${h === 1 ? "hour" : "hours"}`;
  const m = Math.max(1, Math.floor(ms / 60000));
  return `in ${m} min`;
}
