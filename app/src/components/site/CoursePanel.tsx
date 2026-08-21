"use client";

import { useActionState, useState } from "react";
import {
  startCourseCheckout,
  type CheckoutState,
} from "@/app/(site)/courses/actions";
import { courseDetail } from "@/content/courses";
import { formatMoney } from "@/lib/format";
import {
  chargeForChoice,
  type PayChoice,
  planExtraPence,
  planParts,
  planTotalPence,
} from "@/lib/instalments-shape";

/**
 * The one blush pool on a course's page.
 *
 * The workshop panel's sibling (`BookingPanel.tsx`) and deliberately the same
 * sheet: the count of places left, the stepper, the total, the button, and the
 * cancellation terms underneath — because the moment somebody is deciding to
 * spend £240 is the moment they want to know what happens if they cannot come.
 *
 * WHAT A COURSE HAS THAT A WORKSHOP DOES NOT is more than one way to pay for
 * it, and that is the one thing this panel says differently (operator,
 * 2026-08-21). Marianne ticks which ways a course offers; this draws one line
 * per way with BOTH of its figures — what is taken now and what is left — so
 * that "£240 for the whole run" and "£80 now" are never two numbers somebody
 * has to reconcile, and a smaller figure is never sitting alone where a price
 * goes.
 *
 * IT KNOWS NO RULE OF ITS OWN. `ways` arrives worked out by the same function
 * the checkout validates against and the webhook applies under its lock, so
 * this cannot offer something the checkout will refuse. With one way it says
 * what will happen; with two or three it asks.
 *
 * FOUR STATES, decided by facts rather than by a flag:
 *
 *  - the run has finished          → it says so, and offers nothing
 *  - every place has gone          → the full panel
 *  - Stripe is not configured here → the honest "not open yet" block
 *  - otherwise                     → the stepper, the total, and the button
 *
 * The stepper's running total is a courtesy that saves a round trip. It is not
 * what gets charged: the price, the deposit and the total are worked out again
 * on the server from the course's own row before a checkout is opened.
 */

export default function CoursePanel({
  slug,
  capacity,
  placesLeft,
  pricePence,
  depositPence,
  ways,
  parts,
  everyDays,
  interestBps,
  refundDays,
  refundDeadline,
  balanceDueOn,
  canBuy,
  isFinished,
}: {
  slug: string;
  capacity: number;
  /** Counted from paid bookings, less anything whose balance has lapsed. */
  placesLeft: number;
  pricePence: number;
  /** PENCE per place, or null when the whole price is taken at once. */
  depositPence: number | null;
  /** Which of the three this course offers, decided on the server. */
  ways: PayChoice[];
  /** How many payments the plan is in, when there is one. */
  parts: number;
  everyDays: number;
  /** Interest on the plan, in basis points. 0 means the plan costs the price. */
  interestBps: number;
  refundDays: number;
  /** Already written out, e.g. "Saturday 6 September". Null means no refund. */
  refundDeadline: string | null;
  /** Already written out. Null when there is no deposit and nothing is owed. */
  balanceDueOn: string | null;
  /** Whether this server can actually take money — both Stripe keys present. */
  canBuy: boolean;
  /** True once the last date of the run has been. */
  isFinished: boolean;
}) {
  const [places, setPlaces] = useState(1);
  const [state, submit, pending] = useActionState<CheckoutState, FormData>(
    startCourseCheckout,
    { error: null },
  );
  const panel = courseDetail.panel;

  const full = placesLeft === 0;
  // Red where the approved screens use it — "4 places left of 8" is set in
  // pool-error, "6 places left of 8" is not. Never on a run nobody has booked.
  const scarce = placesLeft <= 4 && placesLeft < capacity;
  const max = Math.max(1, placesLeft);
  const chosen = Math.min(places, max);

  /**
   * WHICH WAY THEY HAVE PICKED. The first one offered, until they say
   * otherwise — and the first is `full` wherever it is offered, because being
   * defaulted onto a plan is being defaulted into owing money.
   */
  const offered = ways.length > 0 ? ways : (["full"] as PayChoice[]);
  const [choice, setChoice] = useState<PayChoice>(offered[0]);
  const picked = offered.includes(choice) ? choice : offered[0];

  // THE SAME SUM THE CHECKOUT USES, imported rather than rewritten. Two
  // implementations of this is how a page offers £110 and a card gets charged
  // £100 — so the figure under the button and the figure on the card come out
  // of one function, called here with the numbers the server sent.
  const money = (way: PayChoice) =>
    chargeForChoice({
      choice: way,
      pricePence,
      places: chosen,
      depositPence,
      parts,
      interestBps,
    });

  const mine = money(picked);
  const extra = planExtraPence(pricePence * chosen, interestBps);

  const wayLabel: Record<PayChoice, string> = {
    full: panel.fullWay,
    deposit: panel.depositWay,
    plan: panel.planWay,
  };

  /**
   * The second line under each way — what is left, and when.
   *
   * THE PLAN'S LINE IS BUILT FROM THE ACTUAL PARTS, not from a division. The
   * rounding penny lives on the last one, so "five more of £100" would be two
   * pence short of the truth on some totals — and the one figure a person
   * checks against their bank statement is the one they were told. When the
   * last differs it is named separately.
   */
  const wayLater = (way: PayChoice): string => {
    const sums = money(way);
    if (way === "full") return "Nothing after that.";
    if (way === "deposit")
      return `${formatMoney(sums.laterPence)} by ${balanceDueOn}`;

    const all = planParts(
      planTotalPence(pricePence * chosen, interestBps),
      parts,
    );
    const rest = all.slice(1);
    const last = rest[rest.length - 1];
    const evenly = rest.slice(0, -1);
    const same = evenly.every((one) => one === evenly[0]);

    if (rest.length === 1) {
      return `then ${formatMoney(last)} in ${everyDays} days`;
    }
    if (same && evenly[0] === last) {
      return `then ${rest.length} more of ${formatMoney(last)}, one every ${everyDays} days`;
    }
    return `then ${evenly.length} of ${formatMoney(evenly[0])} and a last of ${formatMoney(last)}, one every ${everyDays} days`;
  };

  return (
    <aside id="book" className="lg:pt-20" aria-labelledby="book-h">
      <div className="pool on-pool sticky top-8 px-7 py-8 sm:px-9">
        {isFinished ? (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {panel.pastTitle}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink">
              {panel.pastBody}
            </p>
            <a
              href="/courses"
              className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
            >
              {panel.fullLink}
            </a>
          </>
        ) : full ? (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {panel.fullTitle}
            </h2>
            <p className="mt-3 fig font-mono text-[16px] text-ink-soft">
              0 places left of {capacity}
            </p>
            <p className="mt-5 text-[17px] leading-relaxed text-ink">
              {panel.fullBody}
            </p>
            <a
              href="/courses"
              className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
            >
              {panel.fullLink}
            </a>
          </>
        ) : (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {panel.title}
            </h2>

            <p className="mt-5 fig font-mono text-[22px] text-ink">
              {formatMoney(pricePence)}{" "}
              <span className="text-[16px] text-ink-soft">
                {panel.forTheRun}
              </span>
            </p>

            {/* "Left of" only once some have gone — before the first booking
                it is what the room holds, which is the sentence the page has
                always carried. */}
            <p
              className={`mt-3 fig font-mono text-[16px] ${scarce ? "text-pool-error" : "text-ink"}`}
            >
              {placesLeft === capacity
                ? `${capacity} ${capacity === 1 ? "place" : "places"}`
                : `${placesLeft} ${placesLeft === 1 ? "place" : "places"} left of ${capacity}`}
            </p>

            <form action={submit}>
              <input type="hidden" name="slug" value={slug} />

              <div className="mt-7">
                <label
                  htmlFor="qty"
                  className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft"
                >
                  {panel.quantityLabel}
                </label>
                <div
                  className="mt-3 flex items-center border border-pool-rule"
                  role="group"
                  aria-label={panel.quantityLabel}
                >
                  <button
                    type="button"
                    className="step t"
                    aria-label={panel.fewer}
                    disabled={chosen <= 1}
                    onClick={() => setPlaces((n) => Math.max(1, n - 1))}
                  >
                    &minus;
                  </button>
                  <input
                    id="qty"
                    name="places"
                    className="qty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={max}
                    value={chosen}
                    aria-describedby={
                      placesLeft < capacity ? "qty-cap" : undefined
                    }
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      setPlaces(Math.min(max, Math.max(1, Math.round(next))));
                    }}
                  />
                  <button
                    type="button"
                    className="step t"
                    aria-label={panel.more}
                    disabled={chosen >= max}
                    onClick={() => setPlaces((n) => Math.min(max, n + 1))}
                  >
                    +
                  </button>
                  <span className="ml-auto pr-5 fig font-mono text-[22px] text-ink">
                    {formatMoney(pricePence * chosen)}
                  </span>
                </div>

                {placesLeft < capacity && (
                  <p
                    id="qty-cap"
                    className="mt-3 text-[15px] leading-relaxed text-ink-soft"
                  >
                    Up to {placesLeft} {placesLeft === 1 ? "place" : "places"}{" "}
                    &mdash; that is all that is left.
                  </p>
                )}
              </div>

              {/* ── HOW THEY WOULD LIKE TO PAY ─────────────────────────
                  THE TWO FIGURES ARE ALWAYS TOGETHER. Never a deposit or a
                  first instalment on its own: a figure smaller than the price,
                  drawn where a price goes, is read AS the price, and a person
                  who thought a course cost £100 finds out otherwise from their
                  bank. So every way carries what is taken now and what is left
                  on the same card.

                  Radios and not a dropdown: three options a person is choosing
                  between with money on each of them should all be visible at
                  once. With one way there is nothing to choose, and it says
                  what will happen instead of asking. */}
              <input type="hidden" name="payment" value={picked} />

              {offered.length > 1 ? (
                <fieldset className="mt-7">
                  <legend className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                    {panel.waysLabel}
                  </legend>
                  <div className="mt-3 space-y-2">
                    {offered.map((way) => {
                      const on = way === picked;
                      return (
                        <label
                          key={way}
                          className={`flex cursor-pointer items-baseline gap-4 border px-5 py-4 ${
                            on
                              ? "border-ink bg-ink/[0.04]"
                              : "border-pool-rule hover:border-ink/40"
                          }`}
                        >
                          {/* DRAWN RATHER THAN ACCENTED. The browser's own
                              radio arrived here as a filled dark disc whether
                              or not it was selected — so the one thing the
                              control exists to say, which of three it is, was
                              the one thing it did not say — and `accent-color`
                              could not fix it (the variable it named does not
                              exist on this surface; the token is
                              `--color-ink`). The input still IS the radio and
                              keeps every keyboard behaviour; only its skin is
                              ours, and the ring below is what a person reads.

                              `sr-only` and not `hidden`: a hidden input is
                              unfocusable, which would take arrow-key selection
                              away from anybody not using a mouse. */}
                          <input
                            type="radio"
                            name="way"
                            value={way}
                            checked={on}
                            onChange={() => setChoice(way)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action ${
                              on ? "border-ink" : "border-pool-rule"
                            }`}
                          >
                            {on && (
                              <span className="block h-[9px] w-[9px] rounded-full bg-ink" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                              <span className="text-[17px] font-semibold text-ink">
                                {wayLabel[way]}
                              </span>
                              <span className="fig font-mono text-[19px] text-ink">
                                {formatMoney(money(way).chargePence)}
                                <span className="text-[14px] text-ink-soft">
                                  {" "}
                                  now
                                </span>
                              </span>
                            </span>
                            <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                              {wayLater(way)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {picked === "plan" && (
                    <>
                      {extra > 0 && (
                        <p className="mt-3 text-[15px] leading-relaxed text-ink">
                          {formatMoney(mine.totalPence)} in all &mdash;{" "}
                          {formatMoney(extra)} more than paying at once.{" "}
                          {panel.planInterestNote}
                        </p>
                      )}
                      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                        {panel.planNote}
                      </p>
                    </>
                  )}
                  {picked === "deposit" && (
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                      {panel.balanceNote}
                    </p>
                  )}
                </fieldset>
              ) : picked === "deposit" ? (
                <div className="mt-7 border-l-2 border-gold pl-5">
                  <p className="fig font-mono text-[19px] text-ink">
                    {formatMoney(mine.chargePence)}{" "}
                    <span className="text-[15px] text-ink-soft">
                      {panel.depositLabel.toLowerCase()}, now
                    </span>
                  </p>
                  <p className="mt-1 fig font-mono text-[19px] text-ink">
                    {formatMoney(mine.laterPence)}{" "}
                    <span className="text-[15px] text-ink-soft">
                      {panel.depositNote} {balanceDueOn}
                    </span>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {panel.balanceNote}
                  </p>
                </div>
              ) : picked === "plan" ? (
                <div className="mt-7 border-l-2 border-gold pl-5">
                  <p className="fig font-mono text-[19px] text-ink">
                    {formatMoney(mine.chargePence)}{" "}
                    <span className="text-[15px] text-ink-soft">
                      now, the first of {parts}
                    </span>
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink">
                    {wayLater("plan")}
                  </p>
                  {extra > 0 && (
                    <p className="mt-2 text-[15px] leading-relaxed text-ink">
                      {formatMoney(mine.totalPence)} in all &mdash;{" "}
                      {formatMoney(extra)} more than paying at once.
                    </p>
                  )}
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {panel.planNote}
                  </p>
                </div>
              ) : (
                <p className="mt-7 text-[15px] leading-relaxed text-ink-soft">
                  {panel.paidInFullNote}
                </p>
              )}

              {canBuy ? (
                <>
                  <button
                    type="submit"
                    disabled={pending}
                    className="t mt-7 min-h-[56px] w-full bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                  >
                    {/* THE FIGURE ON THE BUTTON IS WHAT THE CARD IS CHARGED,
                        never the price and never the total — it is the last
                        thing read before a card is typed. */}
                    {pending
                      ? panel.onTheWay
                      : picked === "deposit"
                        ? `Pay the deposit · ${formatMoney(mine.chargePence)}`
                        : picked === "plan"
                          ? `Pay the first of ${parts} · ${formatMoney(mine.chargePence)}`
                          : `Book ${chosen} ${chosen === 1 ? "place" : "places"} · ${formatMoney(mine.chargePence)}`}
                  </button>

                  {state.error && (
                    <p
                      role="alert"
                      className="mt-4 border-l-2 border-pool-error bg-pool-error/10 px-4 py-3 text-[17px] leading-relaxed text-ink"
                    >
                      {state.error}
                    </p>
                  )}

                  <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                    {panel.cardDetails}
                  </p>
                </>
              ) : (
                <div className="mt-7 border border-pool-rule px-5 py-5">
                  <p className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                    {panel.notLiveEyebrow}
                  </p>
                  <p className="mt-2 text-[19px] font-semibold leading-snug text-ink">
                    {panel.notLiveTitle}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    {panel.notLiveBody}
                  </p>
                </div>
              )}
            </form>
          </>
        )}

        {!isFinished && (
          <>
            <hr className="my-7 border-0 border-t border-pool-rule/40" />

            <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
              {panel.ifYouCannotCome}
            </h3>
            {refundDeadline ? (
              <>
                <p className="mt-3 text-[17px] leading-relaxed text-ink">
                  Cancel up to{" "}
                  <strong className="font-semibold">
                    {refundDays} {refundDays === 1 ? "day" : "days"}
                  </strong>{" "}
                  before the first date &mdash; by{" "}
                  <span className="fig font-mono">{refundDeadline}</span>{" "}
                  &mdash; and you are refunded in full. There is a link in your
                  confirmation email; you do not need to ask me.
                </p>
                <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
                  After that the place is held for you across every date in the
                  run, and I cannot refund it.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[17px] leading-relaxed text-ink">
                A place on this run cannot be refunded once it is taken. That is
                said here rather than found out later.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
