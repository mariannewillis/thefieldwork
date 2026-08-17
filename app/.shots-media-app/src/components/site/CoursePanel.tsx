"use client";

import { useActionState, useState } from "react";
import {
  startCourseCheckout,
  type CheckoutState,
} from "@/app/(site)/courses/actions";
import { courseDetail } from "@/content/courses";
import { formatMoney } from "@/lib/format";

/**
 * The one blush pool on a course's page.
 *
 * The workshop panel's sibling (`BookingPanel.tsx`) and deliberately the same
 * sheet: the count of places left, the stepper, the total, the button, and the
 * cancellation terms underneath — because the moment somebody is deciding to
 * spend £240 is the moment they want to know what happens if they cannot come.
 *
 * WHAT A COURSE HAS THAT A WORKSHOP DOES NOT is the deposit, and it is the one
 * thing this panel says differently. When the course carries one, the button
 * charges it and the panel says in the same breath what is left and when it is
 * due — never "£80" on its own, which reads as the price. When it does not, the
 * whole price is taken at once and the panel says so, so that "£240 for the
 * whole run" and "£240 now" are not two figures somebody has to reconcile.
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

  // A deposit is only a deposit when there is a date to owe the rest by. The
  // server applies the same rule; drawing a different one here would put a
  // figure on the button that is not what the card is charged.
  const onDeposit = depositPence !== null && balanceDueOn !== null;
  const dueNow = (onDeposit ? (depositPence as number) : pricePence) * chosen;
  const dueLater = pricePence * chosen - dueNow;

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

              {/* THE TWO FIGURES, TOGETHER. Never the deposit on its own: a
                  figure smaller than the price, drawn where a price goes, is
                  read as the price. */}
              {onDeposit ? (
                <div className="mt-7 border-l-2 border-gold pl-5">
                  <p className="fig font-mono text-[19px] text-ink">
                    {formatMoney(dueNow)}{" "}
                    <span className="text-[15px] text-ink-soft">
                      {panel.depositLabel.toLowerCase()}, now
                    </span>
                  </p>
                  <p className="mt-1 fig font-mono text-[19px] text-ink">
                    {formatMoney(dueLater)}{" "}
                    <span className="text-[15px] text-ink-soft">
                      {panel.depositNote} {balanceDueOn}
                    </span>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {panel.balanceNote}
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
                    {pending
                      ? panel.onTheWay
                      : onDeposit
                        ? `Pay the deposit · ${formatMoney(dueNow)}`
                        : `Book ${chosen} ${chosen === 1 ? "place" : "places"} · ${formatMoney(dueNow)}`}
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
