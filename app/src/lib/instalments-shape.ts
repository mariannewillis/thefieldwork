/**
 * THE ARITHMETIC OF PAYING IN PARTS — for both sides of the wire.
 *
 * `lib/instalments.ts` is `server-only` because it reads the database. The
 * course form has to show Marianne the plan BEFORE anybody is on it ("six
 * payments of £110, the last on 12 February") and the course page has to show a
 * buyer the same numbers before they press anything. Those are the same sums,
 * and two implementations of them is how a page offers £110 and a card gets
 * charged £100.
 *
 * So the sums live here, with NO IMPORTS AT ALL, and the server-only module
 * re-exports them. This is the fourth time in this build that a constant or a
 * pure function has had to be lifted out of a `server-only` module after one
 * value import from a client component 500'd a whole route; the pattern is now
 * deliberate rather than remedial.
 *
 * ── THE THREE WAYS TO PAY ────────────────────────────────────────────────
 *
 * A course offers up to three, and Marianne ticks which (operator, 2026-08-21):
 *
 *   full     the whole price at the checkout. Always the default.
 *   deposit  part now, the rest by a day she set. TWO payments, no interest —
 *            a balance six weeks out is not credit, it is a held place.
 *   plan     the price divided into N, the FIRST taken at the checkout and the
 *            rest every so many days. This is the one that may carry interest.
 *
 * They are three separate OFFERS and not one arrangement, which is the thing
 * the first cut of this got wrong: it treated the deposit as instalment number
 * one, so a course could not offer "£100 now, rest in October" and "six of £110"
 * as alternatives — the deposit silently became the first sixth. A buyer picks
 * ONE of them at the checkout, and what they picked is legible afterwards from
 * what was written: no balance day and no plan rows is `full`, a balance day
 * alone is `deposit`, plan rows are `plan`.
 */

export type PayChoice = "full" | "deposit" | "plan";

/** What a course offers, as the three checkboxes leave it. */
export type PayOffer = {
  payInFull: boolean;
  depositOffered: boolean;
  planOffered: boolean;
};

/**
 * INTEREST, IN BASIS POINTS. 550 is 5.5%.
 *
 * An integer for the reason every money figure here is an integer: 5.5 typed
 * into a float column and multiplied by a price is a rounding argument waiting
 * to happen, and this one would be an argument about somebody's money. The form
 * takes "5.5" and stores 550, the same move `deposit` makes with pounds and
 * pence.
 *
 * Zero — the default — means the plan costs exactly what the course costs.
 */
export const INTEREST_SCALE = 10_000;

/**
 * WHAT A PLAN COSTS IN ALL, once interest is on it.
 *
 * Rounded to the penny ONCE, here, before anything is divided. Adding interest
 * to each part instead would let six roundings drift the total away from the
 * figure the page quoted.
 */
export function planTotalPence(
  pricePence: number,
  interestBps: number,
): number {
  if (interestBps <= 0) return pricePence;
  return Math.round(pricePence * (1 + interestBps / INTEREST_SCALE));
}

/** What the interest ADDS — the sentence a buyer is owed before they choose. */
export function planExtraPence(
  pricePence: number,
  interestBps: number,
): number {
  return planTotalPence(pricePence, interestBps) - pricePence;
}

/**
 * THE PARTS, in pence, summing to exactly the total.
 *
 * THE ROUNDING GOES ON THE LAST ONE. £100 in three is 33.33, 33.33, 33.34 — so
 * the parts always sum to what was agreed and nobody is ever asked for a penny
 * more or less. On the FIRST it would make the payment quoted on the course
 * page disagree with the payment the card is charged, which is the one place
 * the difference would be noticed.
 */
export function planParts(totalPence: number, parts: number): number[] {
  const count = Math.max(1, Math.round(parts));
  if (count === 1) return [totalPence];

  const each = Math.floor(totalPence / count);
  const out: number[] = [];
  for (let n = 1; n <= count; n++) {
    out.push(n === count ? totalPence - each * (count - 1) : each);
  }
  return out;
}

/**
 * THE PLAN A BOOKING WOULD BE PUT ON, dates and all.
 *
 * Called ONCE, when the booking is made; the rows it returns are then the
 * record, never recomputed — a plan Marianne edits next month must not move a
 * date somebody already bought on. It is exported so the course form and the
 * course page can show the same plan before anybody is on it.
 *
 * `totalPence` is the plan total, INTEREST ALREADY IN IT. This function does
 * not know what interest is; it divides what it is given, which is why the
 * quote on the page and the rows in the database cannot disagree about it.
 *
 * NUMBER 1 IS DUE THE DAY OF THE BOOKING and is taken at the checkout. The
 * plan is therefore N payments and N−1 of them are in the future.
 */
export function planFor(input: {
  totalPence: number;
  parts: number;
  everyDays: number;
  from: Date;
}): { number: number; amountPence: number; dueAt: Date }[] {
  const start = startOfDay(input.from);
  return planParts(input.totalPence, input.parts).map((amountPence, index) => ({
    number: index + 1,
    amountPence,
    dueAt: addDays(start, input.everyDays * index),
  }));
}

/** A day at midnight in her timezone, which is what a `@db.Date` column holds. */
export function startOfDay(now = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(from: Date, days: number): Date {
  const out = new Date(from);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * WHICH WAYS THIS COURSE ACTUALLY OFFERS, once the facts are applied.
 *
 * A tick is an INTENTION; this is what is true. A deposit ticked with no figure
 * on it, or with a balance day already behind us, is not an offer — and the one
 * place this is decided is here, so that the page, the checkout and the webhook
 * cannot each decide it differently. Three copies of this test is how a page
 * offers £80 and a card gets charged £240.
 *
 * FULL IS THE FALLBACK AND CANNOT VANISH. If she unticks everything, or ticks
 * only arrangements that have since expired, the course is still buyable at its
 * price — a published course nobody can pay for is worse than a course that
 * offers one way instead of three.
 */
export function waysToPay(
  course: PayOffer & {
    pricePence: number;
    depositPence: number | null;
    balanceDueAt: Date | null;
    instalments: number;
    isPast: boolean;
  },
): PayChoice[] {
  const ways: PayChoice[] = [];

  const depositReal =
    course.depositOffered &&
    course.depositPence !== null &&
    course.depositPence > 0 &&
    course.depositPence < course.pricePence &&
    course.balanceDueAt !== null &&
    !course.isPast;

  const planReal = course.planOffered && course.instalments >= 2;

  if (course.payInFull || (!depositReal && !planReal)) ways.push("full");
  if (depositReal) ways.push("deposit");
  if (planReal) ways.push("plan");

  return ways;
}

/**
 * WHAT THE CARD IS CHARGED, and what the booking is for, given a way to pay.
 *
 * The one sum behind the button's figure, the checkout's `unit_amount`, and the
 * webhook's cross-check. They were three separate expressions in the first cut
 * and that is precisely the arrangement in which a page offers £110 and a card
 * gets charged £100 — so it is one function, called from all three, and every
 * one of them passes the same arguments read from the same row.
 *
 * `pricePence` is PER PLACE. Everything returned is for the whole booking.
 */
export function chargeForChoice(input: {
  choice: PayChoice;
  pricePence: number;
  places: number;
  depositPence: number | null;
  parts: number;
  interestBps: number;
}): {
  /** What the card is charged now. */
  chargePence: number;
  /** What the whole booking will cost in the end — interest included, on a plan. */
  totalPence: number;
  /** What is left after this payment. */
  laterPence: number;
} {
  const price = input.pricePence * input.places;

  if (input.choice === "deposit" && input.depositPence !== null) {
    const charge = input.depositPence * input.places;
    return {
      chargePence: charge,
      totalPence: price,
      laterPence: price - charge,
    };
  }

  if (input.choice === "plan") {
    const total = planTotalPence(price, input.interestBps);
    const parts = planParts(total, Math.max(2, Math.round(input.parts)));
    return {
      chargePence: parts[0],
      totalPence: total,
      laterPence: total - parts[0],
    };
  }

  return { chargePence: price, totalPence: price, laterPence: 0 };
}
