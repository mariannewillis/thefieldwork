import type { Metadata } from "next";
import { payPage } from "@/content/courses";
import { siteFooterLine } from "@/content/workshops";
import {
  coursePlacesSold,
  hasLapsed,
  isSettled,
  findBookingByBalanceToken,
  offeringOf,
  outstandingPence,
  paidPence,
  placesLeft,
  type BookingWithOffering,
} from "@/lib/bookings";
import { runShape } from "@/lib/course-run";
import { formatDayLong, formatDayShort, formatMoney } from "@/lib/format";
import { paymentsConfigured } from "@/lib/stripe";
import PayButton from "./PayButton";

/**
 * The page a balance link opens.
 *
 * WHY THIS EXISTS RATHER THAN A STRIPE URL IN THE EMAIL (D-23). A Checkout
 * Session's URL expires within a day, and the email it sits in is opened six
 * weeks later. This address does not expire: the session is made when the
 * button is pressed. It can also do three things a spent Stripe URL cannot —
 * say what is owed and when, say "this was already paid", and say "this place
 * has been released" — and it can be sent again, because it is ours to reissue.
 *
 * FIVE STATES, and which one draws is decided by facts rather than by a flag:
 *
 *   1 · owed, and in time         the amount, the date, and the button
 *   2 · owed, and overdue         the same, plus what happened and that the
 *                                 place is still here to be taken back
 *   3 · already paid in full      reassurance — this link is pressed twice
 *   4 · released, or cancelled    the place is gone; nothing was charged
 *   5 · the link is dead          one message, whatever killed it
 *
 * THE TOKEN IS A BEARER CREDENTIAL, exactly as the cancellation token is.
 * Whoever holds it can open a payment against that booking, so a wrong token, a
 * token for a booking that was never made and a token for a run that has
 * finished all produce state 5, word for word. Anything else would answer "is
 * there a booking here?" to whoever asked.
 */

export const metadata: Metadata = {
  title: "Pay the rest — The Field Work",
  // Only ever reached from a link in an email, and the link is the credential.
  robots: { index: false, follow: false },
};

/** The booking being paid for, restated in every state, so nobody pays twice. */
function Receipt({ booking }: { booking: BookingWithOffering }) {
  const offering = offeringOf(booking);
  const run = runShape(offering.dates);

  return (
    <div className="receipt mt-7 pl-5">
      <p className="font-display text-[26px] leading-tight text-ink">
        {offering.name}
      </p>
      <p className="mt-2 fig font-mono text-[17px] text-ink-soft">
        {run
          ? `${run.words} · ${run.span}`
          : formatDayShort(offering.firstDate)}
        <br />
        {offering.venueName}
        <br />
        {booking.places} {booking.places === 1 ? "place" : "places"} &middot;{" "}
        {formatMoney(paidPence(booking))} paid of{" "}
        {formatMoney(booking.totalPence)}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The room, settled. Decorative, so it carries no alt and is hidden
          from assistive tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${payPage.plate.src}-2400.jpg`}
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

const TITLE = "font-display text-[38px] font-normal leading-[1.05] text-ink";
const BODY = "mt-5 text-[19px] leading-relaxed text-ink";
const QUIET = "mt-5 text-[17px] leading-relaxed text-ink-soft";
const OUTLINE_LINK =
  "t mt-8 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await findBookingByBalanceToken(token);

  // ── STATE 5 · the link no longer works ────────────────────────────────────
  if (!booking) {
    return (
      <Shell>
        <h1 className={TITLE}>{payPage.deadTitle}</h1>
        <p className="mt-4 text-[19px] leading-relaxed text-ink-soft">
          {payPage.deadBody}{" "}
          <a
            href={`mailto:${payPage.contact}`}
            className="text-action underline"
          >
            {payPage.deadBodyLink}
          </a>{" "}
          {payPage.deadBodyAfter}
        </p>
      </Shell>
    );
  }

  const offering = offeringOf(booking);
  const owed = outstandingPence(booking);

  // ── STATE 4a · the place was given up ─────────────────────────────────────
  if (booking.status !== "paid") {
    return (
      <Shell>
        <h1 className={TITLE}>{payPage.cancelledTitle}</h1>
        <Receipt booking={booking} />
        <p className={BODY}>{payPage.cancelledBody}</p>
        <a href="/courses" className={OUTLINE_LINK}>
          {payPage.seeCourses}
        </a>
      </Shell>
    );
  }

  // ── STATE 3 · nothing left to pay ─────────────────────────────────────────
  //
  // Reassurance rather than an error. This link sits in an inbox and gets
  // pressed again a week after it was used, usually by somebody checking.
  if (isSettled(booking)) {
    return (
      <Shell>
        <h1 className={TITLE}>{payPage.doneTitle}</h1>
        <Receipt booking={booking} />
        <p className={BODY}>{payPage.doneBody}</p>
        <a href={offering.href} className={OUTLINE_LINK}>
          {offering.name}
        </a>
      </Shell>
    );
  }

  // Lapsed: the place stopped counting the morning after the balance was due,
  // so paying now asks for it back. Whether that can be given is a question
  // about the room, and it is asked here as well as under the lock in the
  // webhook — the page must not offer a button for a chair that has gone.
  const lapsed = hasLapsed(booking);
  const roomLeft =
    lapsed && booking.courseId !== null
      ? placesLeft(offering.capacity, await coursePlacesSold(booking.courseId))
      : booking.places;

  // ── STATE 4b · lapsed, and somebody else has the chair ────────────────────
  if (lapsed && booking.places > roomLeft) {
    return (
      <Shell>
        <h1 className={TITLE}>{payPage.releasedTitle}</h1>
        <Receipt booking={booking} />
        <p className={BODY}>{payPage.releasedBody}</p>
        <p className={QUIET}>
          {payPage.writeToHer}{" "}
          <a
            href={`mailto:${payPage.contact}`}
            className="text-action underline"
          >
            {payPage.writeToHerLink}
          </a>{" "}
          {payPage.writeToHerAfter}
        </p>
      </Shell>
    );
  }

  // ── STATES 1 and 2 · there is something to pay ────────────────────────────
  return (
    <Shell>
      <h1 className={TITLE}>{lapsed ? payPage.overdueTitle : payPage.title}</h1>

      <Receipt booking={booking} />

      {lapsed ? (
        <p className="mt-7 border-l-2 border-pool-error bg-pool-error/10 px-4 py-4 text-[19px] leading-relaxed text-ink">
          The rest was due on{" "}
          <span className="fig font-mono">
            {formatDayLong(booking.balanceDueAt as Date)}
          </span>
          , which has passed, so the place went back into the room.{" "}
          <strong className="font-semibold">
            Nobody else has taken it, so paying now takes it back.
          </strong>
        </p>
      ) : (
        <p className={BODY}>
          <strong className="font-semibold">
            {formatMoney(owed)} is still to pay
          </strong>
          {booking.balanceDueAt ? (
            <>
              , by{" "}
              <span className="fig font-mono">
                {formatDayLong(booking.balanceDueAt)}
              </span>
              . Your place is held until then.
            </>
          ) : (
            "."
          )}
        </p>
      )}

      {paymentsConfigured() ? (
        <PayButton token={token} amount={formatMoney(owed)} />
      ) : (
        /* Where the button is when this server cannot take a payment. It says
           what it is instead of pretending — see src/lib/stripe.ts. */
        <div className="mt-8 border border-pool-rule px-5 py-5">
          <p className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
            Not open yet
          </p>
          <p className="mt-2 text-[19px] font-semibold leading-snug text-ink">
            This site cannot take a payment at the moment.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Nothing is wrong with your place. Write to Marianne and she will
            take the rest another way.
          </p>
        </div>
      )}

      <p className={QUIET}>
        Payment is taken by Stripe. Your card details are typed on their page
        and never reach this site. If you cannot come at all, the link to cancel
        is in your first email.
      </p>
    </Shell>
  );
}
