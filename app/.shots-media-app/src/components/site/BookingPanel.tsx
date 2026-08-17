"use client";

import { useActionState, useState } from "react";
import {
  startCheckout,
  type CheckoutState,
} from "@/app/(site)/workshops/actions";
import { workshopDetail } from "@/content/workshops";
import { formatMoney } from "@/lib/format";

/**
 * The one blush pool on the page. It holds the single decision — how many
 * places — and it holds the cancellation terms with it, because the moment
 * somebody is deciding to spend £95 is the moment they want to know what
 * happens if they cannot come. Putting that in a footer is how a practice ends
 * up arguing with people by email.
 *
 * FOUR STATES, and which one draws is decided by facts rather than by a flag:
 *
 *  - the day has been and gone      → it says so, and offers nothing
 *  - every place has gone           → the full panel (approved screen's variant)
 *  - Stripe is not configured here  → the honest "not open yet" block
 *  - otherwise                      → the stepper, the total, and the button
 *
 * PLACES LEFT IS REAL NOW. It used to say only what the room held, because
 * places sold are counted from bookings and there were none. Sold is the sum
 * of paid bookings' places, and a cancelled booking stops counting, so a place
 * given back appears here with nothing to keep in step.
 *
 * The stepper's running total is a courtesy that saves a round trip. It is not
 * what gets charged: the price and the total are worked out again on the
 * server from the workshop's own row before a checkout is opened.
 */

export default function BookingPanel({
  slug,
  capacity,
  placesLeft,
  pricePence,
  refundDays,
  refundDeadline,
  canBuy,
  isPast,
}: {
  slug: string;
  capacity: number;
  /** Counted from paid bookings. Never below zero. */
  placesLeft: number;
  pricePence: number;
  refundDays: number;
  /** Already written out, e.g. "Saturday 6 September". Null means no refund. */
  refundDeadline: string | null;
  /** Whether this server can actually take money — both Stripe keys present. */
  canBuy: boolean;
  isPast: boolean;
}) {
  const [places, setPlaces] = useState(1);
  const [state, submit, pending] = useActionState<CheckoutState, FormData>(
    startCheckout,
    { error: null },
  );
  const { booking } = workshopDetail;

  const full = placesLeft === 0;
  // Red where the approved screens use it — "4 places left of 10" is set in
  // pool-error, "6 places left of 10" is not. Never on a day nobody has booked.
  const scarce = placesLeft <= 4 && placesLeft < capacity;
  const max = Math.max(1, placesLeft);
  const chosen = Math.min(places, max);

  return (
    <aside id="book" className="lg:pt-20" aria-labelledby="book-h">
      <div className="pool on-pool sticky top-8 px-7 py-8 sm:px-9">
        {isPast ? (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {booking.pastTitle}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink">
              {booking.pastBody}
            </p>
            <a
              href="/workshops"
              className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
            >
              {booking.fullLink}
            </a>
          </>
        ) : full ? (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {booking.fullTitle}
            </h2>
            <p className="mt-3 fig font-mono text-[16px] text-ink-soft">
              0 places left of {capacity}
            </p>
            <p className="mt-5 text-[17px] leading-relaxed text-ink">
              {booking.fullBody}
            </p>
            <a
              href="/workshops"
              className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
            >
              {booking.fullLink}
            </a>
          </>
        ) : (
          <>
            <h2
              id="book-h"
              className="font-display text-[30px] font-normal leading-tight text-ink"
            >
              {booking.title}
            </h2>

            {/* "Left of" only once some have gone — before the first booking
                it is what the room holds, which is the same sentence the panel
                has always carried. See the note on the masthead count. */}
            <p
              className={`mt-5 fig font-mono text-[16px] ${scarce ? "text-pool-error" : "text-ink"}`}
            >
              {placesLeft === capacity
                ? `${capacity} places`
                : `${placesLeft} ${placesLeft === 1 ? "place" : "places"} left of ${capacity}`}{" "}
              &middot; {formatMoney(pricePence)} each
            </p>

            <form action={submit}>
              <input type="hidden" name="slug" value={slug} />

              <div className="mt-7">
                <label
                  htmlFor="qty"
                  className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft"
                >
                  {booking.quantityLabel}
                </label>
                <div
                  className="mt-3 flex items-center border border-pool-rule"
                  role="group"
                  aria-label={booking.quantityLabel}
                >
                  <button
                    type="button"
                    className="step t"
                    aria-label={booking.fewer}
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
                    aria-label={booking.more}
                    disabled={chosen >= max}
                    onClick={() => setPlaces((n) => Math.min(max, n + 1))}
                  >
                    +
                  </button>
                  <span className="ml-auto pr-5 fig font-mono text-[22px] text-ink">
                    {formatMoney(pricePence * chosen)}
                  </span>
                </div>

                {/* The cap is stated, so hitting it is not a mystery. Only
                    once some places have actually gone — "up to 10 places,
                    that is all that is left" on an empty day reads as a
                    warning about nothing. */}
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

              {canBuy ? (
                <>
                  <button
                    type="submit"
                    disabled={pending}
                    className="t mt-7 min-h-[56px] w-full bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                  >
                    {pending
                      ? booking.onTheWay
                      : `Book ${chosen} ${chosen === 1 ? "place" : "places"} · ${formatMoney(pricePence * chosen)}`}
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
                    {booking.cardDetails}
                  </p>
                </>
              ) : (
                /* Where the button is on the approved screen. It says what it
                   is instead of pretending — see the note at the top of this
                   file, and src/lib/stripe.ts for what "configured" means. */
                <div className="mt-7 border border-pool-rule px-5 py-5">
                  <p className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                    {booking.notLiveEyebrow}
                  </p>
                  <p className="mt-2 text-[19px] font-semibold leading-snug text-ink">
                    {booking.notLiveTitle}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    {booking.notLiveBody}
                  </p>
                </div>
              )}
            </form>
          </>
        )}

        {!isPast && (
          <>
            <hr className="my-7 border-0 border-t border-pool-rule/40" />

            <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
              {booking.ifYouCannotCome}
            </h3>
            {refundDeadline ? (
              <>
                <p className="mt-3 text-[17px] leading-relaxed text-ink">
                  Cancel up to{" "}
                  <strong className="font-semibold">{refundDays} days</strong>{" "}
                  before &mdash; by{" "}
                  <span className="fig font-mono">{refundDeadline}</span>{" "}
                  &mdash; and you are refunded in full. There is a link in your
                  confirmation email; you do not need to ask me.
                </p>
                <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
                  After that the place is held for you, and I cannot refund it.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[17px] leading-relaxed text-ink">
                A place on this day cannot be refunded once it is taken. That is
                said here rather than found out later.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
