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
