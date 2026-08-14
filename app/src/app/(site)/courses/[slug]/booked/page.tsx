import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteChrome";
import { bookingConfirmation } from "@/content/workshops";
import {
  bookingReference,
  findBookingBySession,
  offeringOf,
  outstandingPence,
  paidPence,
  type BookingWithOffering,
} from "@/lib/bookings";
import { capitalise, runShape } from "@/lib/course-run";
import {
  formatDayLong,
  formatDayShort,
  formatInstant,
  formatMoney,
  refundDeadline,
} from "@/lib/format";

/**
 * Where paying for a course place lands — BOTH payments.
 *
 * The workshop confirmation's sibling, and one page rather than two because a
 * deposit and a balance land in the same place and want the same three
 * questions answered: what did I buy, what have I paid, and what is left. The
 * page reads the answer off the booking, so it says "£80 paid, £160 by 3
 * October" the first time and "paid in full" the second without being told
 * which of the two brought somebody here.
 *
 * THIS PAGE CONFIRMS NOTHING. It is the browser coming back from Stripe, and a
 * browser cannot be evidence of a payment — the URL can be typed, kept from a
 * previous purchase, or reached by somebody who abandoned the checkout. So it
 * does not write anything and does not believe anything: it looks up the
 * payment the WEBHOOK wrote, by session id, and shows what it finds. If the
 * webhook has not arrived yet — usually a second, occasionally a minute — it
 * says so plainly and reloads itself rather than inventing a receipt.
 *
 * THE LINKS ARE NOT ON IT, and that is the same decision the workshop page
 * made for the same reason: both tokens are stored only as hashes, so this page
 * genuinely cannot rebuild either — and issuing fresh ones here would retire
 * the links already sitting in the buyer's inbox. What stands in their place is
 * the sentence that was always true: they are in the email.
 */

export const metadata: Metadata = {
  title: "Your place is booked — The Field Work",
  // Reached only by coming back from a payment. Nothing here belongs in a
  // search index, and the session id in the URL certainly does not.
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;

  // The session id AND the address have to agree. A session belonging to
  // another course would otherwise render somebody else's receipt under this
  // one's URL.
  const found = session ? await findBookingBySession(session) : null;
  const booking = found?.course?.slug === slug ? found : null;

  const c = bookingConfirmation;

  return (
    <>
      {/* Warm and settled, for the moment after paying. Decorative, so it
          carries no alt and is hidden from assistive tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${c.plate.src}-2400.jpg`}
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

        {booking ? (
          <Booked booking={booking} />
        ) : session ? (
          <>
            {/* No script, no polling loop: the page simply asks the browser to
                come back in four seconds. React 19 hoists this into the head.
                It is removed the moment the payment is found, so it never
                reloads a finished page. */}
            <meta httpEquiv="refresh" content="4" />
            <Plain title={c.settlingTitle} body={c.settlingBody} />
          </>
        ) : (
          <Plain title={c.unknownTitle} body={c.unknownBody} />
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function Plain({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-14 max-w-[620px]">
      <h1 className="font-display text-[46px] font-normal leading-[1.03] text-plate-text">
        {title}
      </h1>
      <p className="mt-6 text-[21px] leading-relaxed text-plate-soft">{body}</p>
      <a
        href="/courses"
        className="t mt-8 inline-flex min-h-[56px] items-center justify-center border border-plate-rule px-6 text-[18px] font-medium text-plate-text hover:border-gold hover:text-gold"
      >
        See the courses
      </a>
    </section>
  );
}

function Booked({ booking }: { booking: BookingWithOffering }) {
  const offering = offeringOf(booking);
  const run = runShape(offering.dates);
  const c = bookingConfirmation;
  const deadline = refundDeadline(offering.firstDate, offering.refundDays);
  const paid = paidPence(booking);
  const owed = outstandingPence(booking);
  const deposit = booking.payments.find((one) => one.kind === "deposit");
  const address = offering.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      {/* ══ THE RUN THEY BOUGHT ═══════════════════════════════════════════ */}
      <div>
        <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
          {c.eyebrow}
        </p>
        <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[58px]">
          {offering.name}
        </h1>
        <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
          {booking.places === 1 ? "One place" : `${booking.places} places`} on
          every date in the run. There is nothing else you need to do today — a
          confirmation is on its way to{" "}
          <span className="fig font-mono text-plate-text">
            {booking.buyerEmail}
          </span>
          .
        </p>

        <dl className="rule mt-10 flex flex-wrap gap-x-12 gap-y-6 pt-8">
          {run && (
            <div>
              <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                {c.when}
              </dt>
              <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                {capitalise(run.words)} &middot; {run.span}
              </dd>
            </div>
          )}
          <div>
            <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {c.place}
            </dt>
            <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
              {offering.venueName}
              {address.map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
              <br />
              {offering.postcode}
            </dd>
          </div>
          <div>
            <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {c.reference}
            </dt>
            <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
              {bookingReference(booking.id)}
            </dd>
          </div>
        </dl>

        {/* Every date, in order. Somebody who has just committed a month of
            Wednesdays wants to write all of them down before they close the
            tab. */}
        <ul className="mt-10 flex flex-col gap-3">
          {offering.dates.map((date) => (
            <li
              key={date.date.toISOString()}
              className="fig font-mono text-[17px] text-plate-soft"
            >
              <span className="text-plate-text">
                {formatDayShort(date.date)}
              </span>{" "}
              &middot; {date.startTime}&ndash;{date.endTime}
              {date.title ? ` · ${date.title}` : ""}
            </li>
          ))}
        </ul>
      </div>

      {/* ══ THE RECEIPT, AND WHAT IS LEFT ═════════════════════════════════
          The outstanding balance sits ON this page, not only in the email.
          Somebody who books on a phone in a hurry will close the tab, and the
          one thing they must not lose is that this is not the whole price. */}
      <aside>
        <div className="pool on-pool px-7 py-8 sm:px-9">
          <h2 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
            {c.whatYouPaid}
          </h2>
          <dl className="mt-5 flex flex-col gap-3 text-[18px] text-ink">
            <div className="flex justify-between gap-4">
              <dt>
                {booking.places} {booking.places === 1 ? "place" : "places"} for
                the whole run
              </dt>
              <dd className="fig font-mono">
                {formatMoney(booking.totalPence)}
              </dd>
            </div>
            {deposit && (
              <div className="flex justify-between gap-4">
                <dt>Deposit paid {formatInstant(deposit.paidAt)}</dt>
                <dd className="fig font-mono">
                  {formatMoney(deposit.amountPence)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-pool-rule/40 pt-3 font-semibold">
              <dt>{owed > 0 ? "Still to pay" : "Paid in full"}</dt>
              <dd className="fig font-mono">
                {formatMoney(owed > 0 ? owed : paid)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 fig font-mono text-[15px] text-ink-soft">
            Receipt from Stripe
          </p>

          {owed > 0 && booking.balanceDueAt && (
            <p className="mt-5 border-l-2 border-gold px-4 py-3 text-[17px] leading-relaxed text-ink">
              <strong className="font-semibold">
                {formatMoney(owed)} is due by{" "}
                {formatDayLong(booking.balanceDueAt)}
              </strong>
              . The link to pay it is in your confirmation email and works from
              today. If it is not paid by that date the place is released.
            </p>
          )}

          <hr className="my-7 border-0 border-t border-pool-rule/40" />

          <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
            {c.ifYouCannotCome}
          </h3>
          {deadline ? (
            <p className="mt-3 text-[17px] leading-relaxed text-ink">
              Cancel by{" "}
              <strong className="fig font-semibold">
                {formatDayLong(deadline)}
              </strong>{" "}
              and you get back everything you have paid. After that the place is
              held for you across every date and cannot be refunded.
            </p>
          ) : (
            <p className="mt-3 text-[17px] leading-relaxed text-ink">
              A place on this run cannot be refunded. You can still tell us you
              are not coming, and the place goes to somebody else.
            </p>
          )}
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            The links to pay and to cancel are in your email. They are the only
            ones — this page cannot show them, which is on purpose: they are the
            keys to your booking and they live in your inbox, not in a web
            address anyone could keep.
          </p>
        </div>
      </aside>
    </div>
  );
}
