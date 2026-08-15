/**
 * Her clock, and the arithmetic for turning it into instants and back.
 *
 * THE WHOLE PROBLEM IN ONE SENTENCE: the clocks go back at two in the morning on
 * 25 October, and a diary that stores local times moves every slot after it by
 * an hour on the morning it happens. Ten o'clock on the Thursday before is not
 * the same number of hours from now as ten o'clock on the Thursday after, and
 * nothing in a `"2026-10-29T10:00"` string knows that.
 *
 * So: EVERY INSTANT IS STORED IN UTC AND RENDERED IN LONDON, and this file is
 * the only place the two are converted. `lib/format.ts` does the rendering; this
 * does the sums that decide which instant a wall-clock time in Frome actually
 * is, and which wall-clock time an instant actually was.
 *
 * DELIBERATELY NOT `server-only`. The slot picker has to group offered times by
 * her day without a round trip, and the smoke test has to check the arithmetic
 * without a browser. One definition in all three places, because two would agree
 * in August and disagree in October.
 *
 * NO LIBRARY. `Intl` has carried the full IANA rule set since Node 14, including
 * every historical British change, and it is already how `lib/format.ts` prints
 * a date. A dependency here would be a second copy of the same table.
 */

/** Where her diary is. Not configurable — the room is in Somerset. */
export const LONDON = "Europe/London";

/**
 * The one formatter, made once. Building an `Intl.DateTimeFormat` is expensive
 * enough that doing it inside a loop over sixty days of half-hours is
 * measurable, and this file is called from exactly that loop.
 *
 * `hourCycle: "h23"` rather than `hour12: false`, because the latter renders
 * midnight as "24" in some engines and as "00" in others, and the difference
 * lands on the one hour of the day where being a day out matters.
 */
const READ = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** A wall-clock reading of her day. What a clock on her wall would say. */
export type LondonParts = {
  year: number;
  /** 1–12, as anybody writes it — not the 0–11 `Date` uses. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** ISO weekday: 1 is Monday, 7 is Sunday. `Service.availableDays` speaks this. */
  weekday: number;
};

/** What her clock said at this instant. */
export function londonParts(instant: Date): LondonParts {
  const parts: Record<string, string> = {};
  for (const part of READ.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    // Read off the date rather than asked of the formatter: a weekday name
    // would have to be mapped back through a locale, and the day number is
    // already here. `getUTCDay` is 0 for Sunday; ISO wants 7.
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7,
  };
}

/**
 * How far ahead of UTC her clock was at this instant — 60 in summer, 0 in
 * winter.
 *
 * Worked out by reading the instant AS her clock and then pretending that
 * reading was UTC: the gap between the two is the offset, by definition, and no
 * table of British Summer Time dates has to exist in this file.
 */
function offsetMinutes(instant: Date): number {
  const p = londonParts(instant);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  // Seconds and milliseconds are dropped on both sides, so a slot at 10:00:00.347
  // does not come back as an offset of 59.994 minutes.
  const whole = Math.floor(instant.getTime() / 60000) * 60000;
  return (asIfUtc - whole) / 60000;
}

/**
 * The instant at which her clock read this.
 *
 * Guess, then correct. The guess treats the wall-clock time as though it were
 * UTC and asks what the offset is there; the correction asks again at the
 * instant that produces, because on the two mornings a year the clocks move the
 * two answers differ and only the second one is about the right moment.
 *
 * THE TWO AWKWARD HOURS, and what this does with them:
 *
 *  · THE HOUR THAT DOES NOT EXIST (01:00–01:59 on the last Sunday in March).
 *    Nobody's clock ever reads 01:30 that morning. This returns the instant an
 *    hour later — 01:30 becomes 02:30 — which is what every calendar does and
 *    the only answer that is a real moment.
 *  · THE HOUR THAT HAPPENS TWICE (01:00–01:59 on the last Sunday in October,
 *    which in 2026 is the 25th). This returns the SECOND one, the GMT reading.
 *    The consequence is visible and small: a grid of half-hours across that
 *    morning offers 00:30 and then 01:00, ninety minutes of real time apart,
 *    and does not offer the repeated hour twice. Offering one wall-clock time
 *    as two bookable slots would be a picker asking somebody to choose between
 *    two things printed identically.
 */
export function londonInstant(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const guess = wall - offsetMinutes(new Date(wall)) * 60000;
  const settled = wall - offsetMinutes(new Date(guess)) * 60000;
  return new Date(settled);
}

/** Midnight at the start of the London day this instant falls in. */
export function londonDayStart(instant: Date): Date {
  const p = londonParts(instant);
  return londonInstant(p.year, p.month, p.day);
}

/**
 * Midnight at the END of that day — which is 25 hours later on 25 October and
 * 23 hours later in March, and is why this is a function rather than
 * `start + 86400000`. A whole-day workshop on the clock-change Sunday takes the
 * whole of that Sunday, however many hours that happens to be.
 */
export function londonDayEnd(instant: Date): Date {
  const p = londonParts(instant);
  return londonInstant(p.year, p.month, p.day + 1);
}

/**
 * "2026-10-25" — the London day an instant falls in, as a sortable key.
 *
 * What the picker groups by and what an `<input type="date">` posts, so the
 * browser and the server name a day the same way.
 */
export function londonDayKey(instant: Date): string {
  const p = londonParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "10:00" — her clock time at an instant, as the forms write times. */
export function londonClock(instant: Date): string {
  const p = londonParts(instant);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * A "2026-10-25" day and a "10:00" clock time, as the instant they name.
 *
 * The pair the whole diary is built out of: a workshop's SQL `DATE` and its
 * `startTime`, a personal block's date and time fields on the form, a slot the
 * picker posts back. Returns null rather than throwing on anything malformed,
 * because every caller is reading something a browser posted and has a sentence
 * ready for input it cannot use.
 */
export function londonMoment(dayKey: string, clock: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock.trim());
  if (!day || !time) return null;
  const instant = londonInstant(
    Number(day[1]),
    Number(day[2]),
    Number(day[3]),
    Number(time[1]),
    Number(time[2]),
  );
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/**
 * The London day a SQL `DATE` names.
 *
 * Prisma hands a `@db.Date` back as midnight UTC on that day, which is a real
 * instant in a place the day was never about. A workshop on 14 November is on
 * the 14th in Frome whatever the server thinks, so the day is read off in UTC —
 * exactly as `lib/format.ts` formats it — and only then turned into her
 * midnight. Read in London instead, midnight UTC on the 14th would be the 13th
 * anywhere west of here, and every autumn workshop would block the wrong day.
 */
export function dayOfSqlDate(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Minutes past midnight, as a "10:30" reads. Null when it is not a time. */
export function minutesOfClock(clock: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** "630" back to "10:30". The inverse of the above, for the grid. */
export function clockOfMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
