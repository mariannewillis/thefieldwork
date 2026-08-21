import "server-only";
import { withOffering } from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/instalments-shape";

/**
 * PAYING FOR A COURSE IN PARTS.
 *
 * ── WHAT IS STORED AND WHAT IS WORKED OUT ────────────────────────────────
 *
 * STORED: the plan. One `Instalment` row per payment, written at the moment of
 * booking and never recomputed — the same rule `Booking.balanceDueAt` follows,
 * and for the same reason: a plan Marianne changes next month must not move a
 * date somebody already bought on. The rows ARE the agreement.
 *
 * WORKED OUT: everything else. What is due today, what is late, how late. None
 * of it is swept into a column, because nothing in this app runs on a schedule
 * — a `isOverdue` flag would be right only as often as somebody remembered to
 * run the sweep, and wrong in the direction that chases a person who has paid.
 *
 * ── THE ONE NUMBER THAT MATTERS ──────────────────────────────────────────
 *
 * `dueNowPence` — what they are being asked for TODAY, which is not the same as
 * what they still owe. A four-part plan two payments in owes two more, and is
 * being asked for one. Charging the outstanding balance on a plan would take
 * next month's money this month; the pay link uses this number, not that one.
 */

/**
 * THE SUMS LIVE IN `instalments-shape.ts` and are re-exported here.
 *
 * The course form has to show Marianne a plan before anybody is on one, and the
 * course page has to show a buyer the same numbers before they press anything —
 * both are client components, and this module reads the database. So the pure
 * arithmetic sits in a module with no imports at all and both sides use the one
 * copy. What is left below is everything that needs a database or a clock.
 */
export {
  addDays,
  INTEREST_SCALE,
  type PayChoice,
  type PayOffer,
  planExtraPence,
  planFor,
  planParts,
  planTotalPence,
  startOfDay,
  waysToPay,
} from "@/lib/instalments-shape";

export type PlannedInstalment = {
  number: number;
  amountPence: number;
  dueAt: Date;
  paidAt: Date | null;
  remindedAt: Date | null;
};

/**
 * WHAT THEY ARE BEING ASKED FOR TODAY.
 *
 * Every instalment whose day has come and which nothing has paid. NOT what they
 * still owe: a four-part plan two payments in owes two more and is being asked
 * for one, and a pay link that charged the difference would take next month's
 * money this month.
 *
 * The due day itself counts in full — an instalment due on the 3rd is due, not
 * late, all of the 3rd — which is what "by 3 October" means to the person
 * reading it.
 */
export function dueNowPence(
  instalments: PlannedInstalment[],
  now = new Date(),
): number {
  const day = startOfDay(now);
  return instalments
    .filter((one) => one.paidAt === null && one.dueAt <= day)
    .reduce((total, one) => total + one.amountPence, 0);
}

/** What is still owed across the whole plan, due or not. */
export function remainingPence(instalments: PlannedInstalment[]): number {
  return instalments
    .filter((one) => one.paidAt === null)
    .reduce((total, one) => total + one.amountPence, 0);
}

/** The next one that has not been paid, whether or not its day has come. */
export function nextDue(
  instalments: PlannedInstalment[],
): PlannedInstalment | null {
  return (
    [...instalments]
      .filter((one) => one.paidAt === null)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0] ?? null
  );
}

/**
 * HOW LATE THE LATEST ONE IS, in whole days. Zero when nothing is late.
 *
 * Measured from the OLDEST unpaid instalment whose day has passed, because that
 * is the one that has been late longest — "two weeks overdue" is about the
 * payment that was due a fortnight ago, not about the one due yesterday.
 */
export function overdueDays(
  instalments: PlannedInstalment[],
  now = new Date(),
): number {
  const day = startOfDay(now);
  const late = instalments
    .filter((one) => one.paidAt === null && one.dueAt < day)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];
  if (!late) return 0;
  return Math.round((day.getTime() - late.dueAt.getTime()) / 86_400_000);
}

/** "two weeks late" · "3 days late" — how she would say it to herself. */
export function overdueWords(days: number): string {
  if (days <= 0) return "";
  if (days === 1) return "a day late";
  if (days < 14) return `${days} days late`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return weeks === 2 ? "two weeks late" : `${weeks} weeks late`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "over a month late" : `over ${months} months late`;
}

/**
 * EVERY BOOKING WITH SOMETHING DUE, newest first.
 *
 * One query, because the Bookings screen, the rail's count and the notice on
 * arrival all ask the same question and three answers to it would be three
 * chances to disagree.
 */
export async function owing(now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "paid",
      instalments: { some: { paidAt: null } },
    },
    // THE WHOLE BOOKING, with `withOffering`'s own include. A narrow select
    // here would give the Bookings screen a row it cannot pass to any of its
    // own helpers — `offeringOf`, the money totals, the kind filter — and the
    // screen would grow a second, thinner idea of what a booking is.
    include: withOffering,
    orderBy: { paidAt: "desc" },
  });

  return (
    bookings
      .map((booking) => {
        const due = dueNowPence(booking.instalments, now);
        const late = overdueDays(booking.instalments, now);
        return {
          booking,
          duePence: due,
          remainingPence: remainingPence(booking.instalments),
          overdueDays: late,
          next: nextDue(booking.instalments),
        };
      })
      // Something still to pay, at some point — a settled plan has no rows left
      // unpaid and never reaches here.
      .filter((row) => row.remainingPence > 0)
  );
}

/** How many are LATE. What the rail's count and the notice on arrival read. */
export async function overdueCount(now = new Date()): Promise<number> {
  const rows = await owing(now);
  return rows.filter((row) => row.overdueDays > 0).length;
}
