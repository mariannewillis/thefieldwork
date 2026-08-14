import type { Metadata } from "next";
import { cancelPage, siteFooterLine } from "@/content/workshops";
import {
  findBookingByToken,
  heldPence,
  isRefundable,
  offeringOf,
  outstandingPence,
  paidPence,
  refundOwed,
  type BookingWithOffering,
} from "@/lib/bookings";
import { runShape } from "@/lib/course-run";
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
  booking: BookingWithOffering;
  showPaid: boolean;
}) {
  const offering = offeringOf(booking);
  // A workshop reads as one dated line; a course reads as the shape of its run,
  // because "Wed 7 Oct · 19:00" is the first of four and saying only that
  // would name the wrong commitment.
  const run = offering.kind === "course" ? runShape(offering.dates) : null;
  const one = offering.dates[0];

  return (
    <div className="receipt mt-7 pl-5">
      <p className="font-display text-[26px] leading-tight text-ink">
        {offering.name}
      </p>
      <p className="mt-2 fig font-mono text-[17px] text-ink-soft">
        {run
          ? `${run.words} · ${run.span}`
          : one
            ? `${formatDayShort(one.date)} · ${one.startTime}${one.endTime ? `–${one.endTime}` : ""}`
            : formatDayShort(offering.firstDate)}
        <br />
        {offering.venueName}
        <br />
        {booking.places} {booking.places === 1 ? "place" : "places"} &middot;{" "}
        {showPaid
          ? `${formatMoney(paidPence(booking))} paid on ${formatInstant(booking.paidAt)}`
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

  const offering = offeringOf(booking);
  const paid = paidPence(booking);
  const held = heldPence(booking);

  // The most recent refund on any of this booking's payments — a course
  // settled and then cancelled has two, and the later of them is the one the
  // sentence below means by "was refunded on".
  const refundedOn = booking.payments
    .map((one) => one.refundedAt)
    .filter((at): at is Date => at !== null)
    .sort((one, other) => other.getTime() - one.getTime())[0];

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
                {formatMoney(paid)} was refunded on{" "}
                {formatInstant(refundedOn ?? booking.cancelledAt!)}
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
              {formatMoney(held)} is owed back to you and the refund did not go
              through.
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

        {/* Back to the list this one came from. Sending somebody who has just
            given up a course to the workshops page would be answering a
            question they did not ask. */}
        <a
          href={offering.kind === "workshop" ? "/workshops" : "/courses"}
          className="t mt-8 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
        >
          {offering.kind === "workshop"
            ? cancelPage.doneOther
            : "See the other courses"}
        </a>
      </Shell>
    );
  }

  // The same date the offering's own page and the confirmation email print,
  // worked out from its OWN refundDays and counted back from the first date.
  // Null means it was never refundable, which is a real answer and not a
  // missing one.
  const deadline = refundDeadline(offering.firstDate, offering.refundDays);
  const refundable = isRefundable(offering);
  // What a course still owes stops being owed the moment the place goes back.
  // Said out loud, because somebody who has paid a deposit and is cancelling
  // wants to know they are not about to be chased for the rest.
  const owedNoMore = outstandingPence(booking);

  return (
    <Shell>
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        {cancelPage.title}
      </h1>

      <Receipt booking={booking} showPaid={true} />

      {/* Said before either branch, because it is true in both and it is the
          first thing somebody halfway through a course's payments will want to
          know: giving the place up ends the arrangement, and nobody will ask
          for the rest afterwards. */}
      {owedNoMore > 0 && (
        <p className="mt-7 text-[19px] leading-relaxed text-ink">
          {formatMoney(owedNoMore)} of this is still to pay
          {booking.balanceDueAt
            ? `, by ${formatDayLong(booking.balanceDueAt)}`
            : ""}
          . Cancelling ends that &mdash; the balance stops being due and you
          will not be asked for it.
        </p>
      )}

      {refundable ? (
        /* ── STATE 1 · within the refund window ───────────────────────────
           The money is stated in full before the button. "You will be
           refunded £190" is the sentence somebody needs; "cancel your
           booking" is not. */
        <>
          <p className="mt-7 text-[19px] leading-relaxed text-ink">
            You are {offering.refundDays}{" "}
            {offering.refundDays === 1 ? "day" : "days"} clear of{" "}
            {offering.kind === "workshop" ? "the workshop" : "the first date"},
            so cancelling now returns your money in full.
          </p>
          <p className="mt-4 text-[19px] leading-relaxed text-ink">
            <strong className="font-semibold">
              {formatMoney(paid)} will go back to the card you paid with.
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
              and refund {formatMoney(paid)}
            </button>
          </form>

          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
            {cancelPage.keepInstead}{" "}
            <a href={offering.href} className="text-action underline">
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
              not return your {formatMoney(paid)}
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
