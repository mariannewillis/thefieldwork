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
  const [requests, bookings, subscribers] = await Promise.all([
    prisma.serviceRequest.count({ where: { seenAt: null } }),
    prisma.booking.count({ where: { seenAt: null } }),
    // A subscriber who never confirmed is not somebody she has to look at —
    // they asked and did not come back, and the list already says so on its own
    // screen. Counting them on the rail would be a badge for a non-event.
    prisma.subscriber.count({
      where: { seenAt: null, confirmedAt: { not: null } },
    }),
  ]);
  return { requests, bookings, subscribers };
}
