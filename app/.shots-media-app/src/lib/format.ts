/**
 * Dates and money, formatted the way the approved screens write them.
 *
 * Deliberately NOT server-only: the booking panel is a client component and
 * has to price a changing number of places without a round trip, so both sides
 * need the same £ formatter. Two formatters would eventually disagree.
 *
 * EVERY date here is formatted in UTC, and that is load-bearing rather than
 * lazy. `Workshop.date` is a SQL `DATE`, which Prisma hands back as midnight
 * UTC on that day. Formatted in the server's local zone, midnight UTC on
 * Saturday the 20th becomes Friday the 19th anywhere west of London — so the
 * day printed on the page would be a different day from the one she typed.
 */

/** "£95" — or "£95.50" when the pence are not round, which is rare but legal. */
export function formatMoney(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pounds);
}

/**
 * "50 minutes", "1 hour", "1 hour 30 minutes" — how long a service runs.
 *
 * Spelled out rather than left as "75", because the number in the form is
 * minutes and the sentence on the page is not: nobody books an appointment
 * described as ninety minutes without doing the sum. Numerals, not words, so
 * it sits in the same ledger column as the prices beside it.
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (rest > 0 || hours === 0) {
    parts.push(`${rest} ${rest === 1 ? "minute" : "minutes"}`);
  }
  return parts.join(" ");
}

/** "Sat 20 Sep" — the ledger form, used wherever a date sits in a column. */
export function formatDayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** "Saturday 6 September" — the sentence form, used in prose. */
export function formatDayLong(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * "Thursday 3 September" — the day an INSTANT falls on, in Frome.
 *
 * `formatDayLong` above prints a SQL `DATE` and formats it in UTC, because a
 * workshop's 14 November is 14 November wherever the server is. This is the
 * other case: a chosen slot is a real instant, and the day it belongs to is the
 * day it is in London. Ten o'clock on the evening of 31 October is the 31st
 * here; formatted in UTC in the summer it would sometimes be the 1st.
 */
export function formatLondonDay(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(instant);
}

/**
 * "October 2026" — the heading over one month of the picker's calendar.
 *
 * London for the reason `formatLondonDay` above is: the grid is built out of
 * real instants at midday on each of her days, and the month one of them falls
 * in is the month it is in Frome.
 */
export function formatLondonMonth(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(instant);
}

/**
 * "Thursday 3 September, 10:00–11:30" — a slot, whole, in one line.
 *
 * What the queue prints, what the two emails print, and what the calendar puts
 * in an event's description. One function, so the time somebody chose reads the
 * same in the portal as it does in their inbox.
 */
export function formatSlot(startsAt: Date, endsAt: Date): string {
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  });
  return `${formatLondonDay(startsAt)}, ${clock.format(startsAt)}–${clock.format(endsAt)}`;
}

/**
 * "14 Aug" for a MOMENT rather than a day — when a payment cleared, when a
 * refund went out.
 *
 * London, not UTC, and that is the one place in this file where that is right.
 * A workshop's `date` is a SQL DATE with no time and no place; a payment has
 * both, and the day it happened is the day it was in Frome. Formatted in UTC,
 * a card taken at half past midnight in August — British Summer Time, an hour
 * ahead — would print as the day before on the receipt of the person who
 * remembers doing it.
 */
export function formatInstant(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(date);
}

/**
 * "Monday 17 August at 7:14pm" — a DEADLINE, said to the minute.
 *
 * London, like `formatInstant` and for the same reason: this is an instant
 * rather than a day, and the hour it names has to be the hour on the clock of
 * the person reading it. It is the one thing in this app measured in hours
 * rather than days — an approval runs out 48 hours after it was given (D-25) —
 * so rounding it to a day would take most of one away from somebody.
 */
export function formatMoment(date: Date): string {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  })
    .format(date)
    // "7:14 pm" → "7:14pm". The space is not how anybody writes it down.
    .replace(/\s/g, "");
  return `${day} at ${time}`;
}

/** "2026-09-20" — what an `<input type="date">` wants back. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The last day someone can change their mind and get their money back.
 *
 * Null when the workshop cannot be refunded at all, so the page says that
 * instead of printing a date — a refund window of zero days is a real answer,
 * not a missing one.
 */
export function refundDeadline(date: Date, refundDays: number): Date | null {
  if (refundDays <= 0) return null;
  const deadline = new Date(date);
  deadline.setUTCDate(deadline.getUTCDate() - refundDays);
  return deadline;
}

/**
 * Whether the day has been and gone.
 *
 * Compared at UTC-midnight granularity against today's UTC date, so a workshop
 * is "coming up" for the whole of its own day rather than dropping into the
 * archive at one minute past midnight while people are still travelling to it.
 */
export function isPast(date: Date, now: Date = new Date()): boolean {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return date.getTime() < today;
}
