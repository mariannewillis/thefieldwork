import "server-only";
import { withOffering } from "@/lib/bookings";
import { prisma } from "@/lib/db";

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

/** A day at midnight in her timezone, which is what a `@db.Date` column holds. */
function today(now = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${key}T00:00:00.000Z`);
}

export type PlannedInstalment = {
  number: number;
  amountPence: number;
  dueAt: Date;
  paidAt: Date | null;
  remindedAt: Date | null;
};

/**
 * THE PLAN A BOOKING WOULD BE PUT ON, worked out from the course as it stands.
 *
 * Called ONCE, when the booking is made; the rows it returns are then the
 * record. It is exported so the course form can show her the plan before
 * anybody is on it — "four payments of £75, the last on 12 December" is a
 * sentence she can check, and a plan she cannot see before saving is a plan she
 * finds out about from a client.
 *
 * THE ROUNDING GOES ON THE LAST ONE. £100 in three is 33.33, 33.33, 33.34 — so
 * the parts always sum to exactly what was agreed and nobody is ever asked for
 * a penny more or less. Putting the odd penny on the FIRST would make the
 * deposit disagree with the deposit she typed.
 */
export function planFor(input: {
  totalPence: number;
  depositPence: number | null;
  instalments: number;
  everyDays: number;
  from: Date;
}): { number: number; amountPence: number; dueAt: Date }[] {
  const count = Math.max(1, Math.round(input.instalments));
  const start = today(input.from);

  if (count === 1) {
    return [{ number: 1, amountPence: input.totalPence, dueAt: start }];
  }

  // The deposit is the first payment. With none set, the total simply divides.
  const deposit = input.depositPence ?? Math.floor(input.totalPence / count);
  const rest = input.totalPence - deposit;
  const each = Math.floor(rest / (count - 1));

  const plan = [{ number: 1, amountPence: deposit, dueAt: start }];
  for (let number = 2; number <= count; number++) {
    const last = number === count;
    plan.push({
      number,
      // Everything not yet allocated goes on the last, which is what makes the
      // parts sum exactly.
      amountPence: last
        ? input.totalPence - deposit - each * (count - 2)
        : each,
      dueAt: addDays(start, input.everyDays * (number - 1)),
    });
  }
  return plan;
}

function addDays(from: Date, days: number): Date {
  const out = new Date(from);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

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
  const day = today(now);
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
  const day = today(now);
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
