import "server-only";
import { prisma } from "@/lib/db";
import type { UnseenCounts } from "@/lib/unseen-shape";

/**
 * WHAT SHE HAS NOT LOOKED AT YET, per screen.
 *
 * Read once by the admin layout and drawn on the rail, so a badge appears
 * against Requests, Bookings or Subscribers without her opening any of them.
 * That is the point of the rail carrying it: the three things that arrive while
 * she is not looking — a form submitted, a webhook paid, a confirmation link
 * pressed — all announce themselves in the one place she is already looking.
 *
 * ONE QUERY EACH, COUNTING ONLY. Three counts on every admin page load is
 * three indexed `count(*)`s against a null column, which is why each of the
 * three tables carries an index on `seenAt`.
 *
 * NULL MEANS NEVER OPENED, and nothing else does. The columns were backfilled
 * to `now()` when they landed, so "never opened" starts from the day the
 * feature shipped rather than from the beginning of the database — otherwise
 * every rail badge would have opened at forty and taught her to ignore it.
 */
export async function unseenCounts(): Promise<UnseenCounts> {
  const [requests, bookings, subscribers, overdue] = await Promise.all([
    prisma.serviceRequest.count({ where: { seenAt: null } }),
    prisma.booking.count({ where: { seenAt: null } }),
    // A subscriber who never confirmed is not somebody she has to look at —
    // they asked and did not come back, and the list already says so on its own
    // screen. Counting them on the rail would be a badge for a non-event.
    prisma.subscriber.count({
      where: { seenAt: null, confirmedAt: { not: null } },
    }),
    /**
     * MONEY THAT HAS NOT ARRIVED (operator, 2026-08-21).
     *
     * It sits with the three "have you looked at this" counts and it is not
     * one of them: it does not clear when she looks, it clears when the money
     * comes. That is the honest difference and it is why the badge on Bookings
     * is a SUM of the two rather than a second badge beside the first — one
     * number on one entry, and the screen behind it says which is which.
     *
     * COUNTED IN SQL, not by reading every plan into memory: the rail is on
     * every admin page and this runs on all of them.
     */
    prisma.booking.count({
      where: {
        status: "paid",
        instalments: { some: { paidAt: null, dueAt: { lt: startOfToday() } } },
      },
    }),
  ]);
  return { requests, bookings, subscribers, overdue };
}

/** Midnight today in her timezone, which is what a `@db.Date` column holds. */
function startOfToday(now = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${key}T00:00:00.000Z`);
}
