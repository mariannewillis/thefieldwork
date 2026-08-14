import type { Metadata } from "next";
import { cancelPage, siteFooterLine } from "@/content/workshops";
import {
  findBookingByToken,
  isRefundable,
  refundOwed,
  type BookingWithWorkshop,
} from "@/lib/bookings";
import {
  formatDayLong,
  formatDayShort,
  formatInstant,
  formatMoney,
  refundDeadline,
} from "@/lib/format";
import { cancelPlace } from "../actions";

/**
 * The page a cancellation link opens.
 *
 * Ported from docs/screens/workshopflow/cancel-refund-landing.html, which draws
 * all four states this page can be in, the way the other screens were ported:
 * that file's stylesheet used as it was written (workshops.css, through the
 * layout beside this), the structure preserved, and every string now coming
 * from the database instead of being inlined.
 *
 *   1 · still refundable      the money is stated in full BEFORE the button
 *   2 · past the refund date  the button is subordinate, never hidden
 *   3 · already cancelled     reassurance, not an error — this link is clicked twice
 *   4 · the link is dead      one message, whatever killed it
 *
 * THE TOKEN IS A BEARER CREDENTIAL. Whoever holds it can cancel that place and
 * move that money, so a wrong token, a token for a booking that was never made
 * and a token for a day that has been and gone all produce state 4, word for
 * word. Anything else would answer "is there a booking here?" to whoever asked,
 * and that is the same hole the reset page closes the same way (D-13).
 *
 * WHAT IS NOT CARRIED OVER: the mockup's card-ending-4242 and "£190 paid on 14
 * Aug" line names a card. Nothing on this side has ever seen one — the whole
 * point of hosted checkout — so the receipt says what was paid and when, and
 * "the card you paid with" where the mockup says a number.
 */

export const metadata: Metadata = {
  title: "Cancel your place — The Field Work",
  // Only ever reached from a link in an email, and the link is the credential.
  robots: { index: false, follow: false },
};

/** The booking being acted on, restated in every state, so nobody cancels the
 *  wrong day. */
function Receipt({
  booking,
  showPaid,
}: {
  booking: BookingWithWorkshop;
  showPaid: boolean;
}) {
  const { workshop } = booking;
  return (
    <div className="receipt mt-7 pl-5">
      <p className="font-display text-[26px] leading-tight text-ink">
        {workshop.name}
      </p>
      <p className="mt-2 fig font-mono text-[17px] text-ink-soft">
        {formatDayShort(workshop.date)} &middot; {workshop.startTime}
        {workshop.endTime ? `–${workshop.endTime}` : ""}
        <br />
        {workshop.venueName}
        <br />
        {booking.places} {booking.places === 1 ? "place" : "places"} &middot;{" "}
        {showPaid
          ? `${formatMoney(booking.amountPence)} paid on ${formatInstant(booking.paidAt)}`
          : `cancelled on ${formatInstant(booking.cancelledAt ?? booking.updatedAt)}`}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* An empty chair with a coat on it, where somebody says they cannot
          come. Decorative, so it carries no alt and is hidden from assistive
          tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${cancelPage.plate.src}-2400.jpg`}
        alt=""
        aria-hidden="true"
        className="page-field"
      />
      <div className="page-scrim" aria-hidden="true" />

      <main className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
        <a href="/" aria-label="The Field Work — home" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-horizontal.svg"
            alt="The Field Work"
            width={440}
            height={120}
            className="h-[56px] w-auto"
          />
        </a>

        <section className="mt-14 max-w-[620px]">
          <div className="pool on-pool mt-5 px-8 py-9 sm:px-10">{children}</div>
        </section>
      </main>

      <footer className="border-t border-plate-rule/30">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
          <p className="fig font-mono text-[15px] text-plate-rule">
            {siteFooterLine}
          </p>
        </div>
      </footer>
    </>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await findBookingByToken(token);

  // ── STATE 4 · the link no longer works ────────────────────────────────────
  if (!booking) {
    return (
      <Shell>
        <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
          {cancelPage.deadTitle}
        </h1>
        <p className="mt-4 text-[19px] leading-relaxed text-ink-soft">
          {cancelPage.deadBody}{" "}
          <a
            href={`mailto:${cancelPage.contact}`}
            className="text-action underline"
          >
            {cancelPage.deadBodyLink}
          </a>{" "}
          {cancelPage.deadBodyAfter}
        </p>
      </Shell>
    );
  }

  const { workshop } = booking;

  // ── STATE 3 · already cancelled ───────────────────────────────────────────
  if (booking.status !== "paid") {
    const refunded = booking.status === "cancelledRefunded";
    const owed = refundOwed(booking);
    return (
      <Shell>
        <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
          {cancelPage.doneTitle}
        </h1>

        <Receipt booking={booking} showPaid={false} />

        {refunded ? (
          <>
            <p className="mt-7 border-l-2 border-pool-success bg-pool-success/10 px-4 py-4 text-[19px] leading-relaxed text-ink">
              <strong className="font-semibold">
                {formatMoney(booking.refundedPence ?? booking.amountPence)} was
                refunded on{" "}
                {formatInstant(booking.refundedAt ?? booking.cancelledAt!)}
              </strong>{" "}
              to the card you paid with. Nothing further is needed from you.
            </p>
            <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
              {cancelPage.doneChase}{" "}
              <a
                href={`mailto:${cancelPage.contact}`}
                className="text-action underline"
              >
                {cancelPage.doneChaseLink}
              </a>{" "}
              {cancelPage.doneChaseAfter}
            </p>
          </>
        ) : owed ? (
          /* The refund was owed and did not go through. Saying "refunded"
             here would be the one lie this page could tell that costs
             somebody money. */
          <p className="mt-7 border-l-2 border-pool-error bg-pool-error/10 px-4 py-4 text-[19px] leading-relaxed text-ink">
            <strong className="font-semibold">
              {formatMoney(booking.amountPence)} is owed back to you and the
              refund did not go through.
            </strong>{" "}
            Marianne has been told and will return it by hand. Nothing is needed
            from you.
          </p>
        ) : (
          <p className="mt-7 text-[19px] leading-relaxed text-ink">
            The place is free for somebody else. Nothing was refunded — the
            refund date had already passed when it was cancelled.
          </p>
        )}

        <a
          href="/workshops"
          className="t mt-8 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
        >
          {cancelPage.doneOther}
        </a>
      </Shell>
    );
  }

  // The same date the workshop page and the confirmation email print, worked
  // out from this workshop's OWN refundDays. Null means it was never
  // refundable, which is a real answer and not a missing one.
  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  const refundable = isRefundable(workshop);

  return (
    <Shell>
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        {cancelPage.title}
      </h1>

      <Receipt booking={booking} showPaid={true} />

      {refundable ? (
        /* ── STATE 1 · within the refund window ───────────────────────────
           The money is stated in full before the button. "You will be
           refunded £190" is the sentence somebody needs; "cancel your
           booking" is not. */
        <>
          <p className="mt-7 text-[19px] leading-relaxed text-ink">
            You are {workshop.refundDays} days clear of the workshop, so
            cancelling now returns your money in full.
          </p>
          <p className="mt-4 text-[19px] leading-relaxed text-ink">
            <strong className="font-semibold">
              {formatMoney(booking.amountPence)} will go back to the card you
              paid with.
            </strong>{" "}
            Stripe usually takes five to ten working days to show it.
          </p>

          <form action={cancelPlace}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="t mt-8 min-h-[56px] w-full bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink"
            >
              Cancel{" "}
              {booking.places === 1
                ? "this place"
                : `all ${booking.places} places`}{" "}
              and refund {formatMoney(booking.amountPence)}
            </button>
          </form>

          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
            {cancelPage.keepInstead}{" "}
            <a
              href={`/workshops/${workshop.slug}`}
              className="text-action underline"
            >
              {cancelPage.keepLink}
            </a>
            .
          </p>
        </>
      ) : (
        /* ── STATE 2 · past the refund date ───────────────────────────────
           The hard one. It must not pretend, must not hide the button, and
           must not sound punitive. The place is still released, which is
           worth something to Marianne and to whoever is waiting. */
        <>
          <p className="mt-7 border-l-2 border-pool-error bg-pool-error/10 px-4 py-4 text-[19px] leading-relaxed text-ink">
            {deadline ? (
              <>
                The refund date was{" "}
                <span className="fig font-mono">{formatDayLong(deadline)}</span>
                , which has passed. Cancelling now will
              </>
            ) : (
              <>
                A place on this day cannot be refunded, so cancelling now will
              </>
            )}{" "}
            <strong className="font-semibold">
              not return your {formatMoney(booking.amountPence)}
            </strong>
            .
          </p>

          <p className="mt-5 text-[19px] leading-relaxed text-ink">
            {cancelPage.noRefundBody}
          </p>

          {/* Subordinate, not hidden. Removing it would leave somebody with no
              way to say "I can't come", which is worse than an unhappy click. */}
          <form action={cancelPlace}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="t mt-8 min-h-[56px] w-full border border-ink bg-transparent px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
            >
              {cancelPage.noRefundButton}
            </button>
          </form>

          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
            {cancelPage.writeToHer}{" "}
            <a
              href={`mailto:${cancelPage.contact}`}
              className="text-action underline"
            >
              {cancelPage.writeToHerLink}
            </a>{" "}
            {cancelPage.writeToHerAfter}
          </p>
        </>
      )}
    </Shell>
  );
}
