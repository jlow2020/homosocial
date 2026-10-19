// The Circle clock. Every Circle runs on its own schedule:
// Week 1 starts the moment it kicks off and runs to the next Monday drop
// (or the Monday after, if that's under 4 days away). From then on drops
// land Mondays at 7am and the Finale is Sunday of Week 8 at 8pm, Eastern.

const TZ = "America/New_York";
const DROP_HOUR = 7;
const FINALE_HOUR = 20;
const DAY = 24 * 60 * 60 * 1000;

export type CircleClockInput = {
  kickoff_at: string | null;
  week_override: number | null;
};

export type Clock =
  | { phase: "filling" }
  | { phase: "season"; week: number; weekStart: Date; nextDrop: Date | null; finaleAt: Date; testMode: boolean }
  | { phase: "revealed"; finaleAt: Date; testMode: boolean };

// Wall-clock parts of an instant in Eastern time.
function etParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
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

// The instant when it's y-m-d h:00 in Eastern time.
function etInstant(y: number, m: number, d: number, h: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h));
  const p = etParts(guess);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}

function addDaysET(base: Date, days: number, hour: number): Date {
  const p = etParts(base);
  const noon = new Date(Date.UTC(p.y, p.m - 1, p.d, 12) + days * DAY);
  return etInstant(noon.getUTCFullYear(), noon.getUTCMonth() + 1, noon.getUTCDate(), hour);
}

// When each week starts for a Circle that kicked off at `kickoff`.
export function weekStarts(kickoff: Date): Date[] {
  const p = etParts(kickoff);
  let daysToMonday = (8 - p.dow) % 7 || 7;
  let firstMonday = addDaysET(kickoff, daysToMonday, DROP_HOUR);
  if (firstMonday.getTime() - kickoff.getTime() < 4 * DAY) {
    daysToMonday += 7;
    firstMonday = addDaysET(kickoff, daysToMonday, DROP_HOUR);
  }
  const starts = [kickoff];
  for (let w = 2; w <= 8; w++) starts.push(addDaysET(firstMonday, (w - 2) * 7, DROP_HOUR));
  return starts;
}

export function finaleFor(kickoff: Date): Date {
  return addDaysET(weekStarts(kickoff)[7], 6, FINALE_HOUR);
}

export function clockFor(c: CircleClockInput, now = new Date()): Clock {
  if (!c.kickoff_at) return { phase: "filling" };
  const kickoff = new Date(c.kickoff_at);
  const starts = weekStarts(kickoff);
  const finaleAt = finaleFor(kickoff);

  if (c.week_override) {
    if (c.week_override >= 9) return { phase: "revealed", finaleAt, testMode: true };
    const w = c.week_override;
    return { phase: "season", week: w, weekStart: starts[w - 1], nextDrop: w < 8 ? starts[w] : null, finaleAt, testMode: true };
  }

  if (now >= finaleAt) return { phase: "revealed", finaleAt, testMode: false };
  let week = 1;
  for (let i = 0; i < starts.length; i++) if (now >= starts[i]) week = i + 1;
  return { phase: "season", week, weekStart: starts[week - 1], nextDrop: week < 8 ? starts[week] : null, finaleAt, testMode: false };
}

const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export function etLabel(d: Date): string {
  return fmt.format(d);
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
