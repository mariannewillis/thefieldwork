import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import { SiteFooter } from "@/components/site/SiteChrome";
import { bookingConfirmation } from "@/content/workshops";
import {
  bookingReference,
  findBookingBySession,
  paidPence,
  type BookingWithOffering,
} from "@/lib/bookings";
import {
  formatDayLong,
  formatDayShort,
  formatInstant,
  formatMoney,
  refundDeadline,
} from "@/lib/format";

/**
 * Where paying for a place lands.
 *
 * Ported from docs/screens/workshopflow/booking-confirmation.html, the approved
 * composition, the way the other pages were ported.
 *
 * THIS PAGE CONFIRMS NOTHING. It is the browser coming back from Stripe, and a
 * browser cannot be evidence of a payment — the URL can be typed, kept from a
 * previous purchase, or reached by somebody who abandoned the checkout. So it
 * does not write anything and does not believe anything: it looks up the
 * booking the WEBHOOK wrote, by session id, and shows what it finds. If the
 * webhook has not arrived yet — usually a second, occasionally a minute — it
 * says so plainly and reloads itself rather than inventing a receipt.
 *
 * TWO DEPARTURES from the approved screen, both because the thing behind them
 * does not exist:
 *
 *  1. THE CANCEL BUTTON. The screen puts one here. The cancellation token is
 *     stored only as a hash (see Booking.cancellationTokenHash), so this page
 *     genuinely cannot rebuild the link — and issuing a fresh one here would
 *     kill the link already sitting in the buyer's inbox. What stands in its
 *     place is the screen's own next sentence, which was always true: the link
 *     is in the email.
 *  2. "Put it in my calendar" and the three "What happens now" bullets.
 *     Nothing generates an .ics file, and two of the bullets describe a
 *     preparatory note and a dietary record that do not exist (D-9).
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
  // another workshop would otherwise render somebody else's receipt under this
  // one's URL.
  //
  // Looked up through the PAYMENT, because the session is a fact about money
  // arriving rather than about the booking (D-23).
  const found = session ? await findBookingBySession(session) : null;
  const booking = found?.workshop?.slug === slug ? found : null;

  const c = bookingConfirmation;

  return (
    <>
      <PageField src={c.plate.src} />

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
                It is removed the moment the booking is found, so it never
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
        href="/workshops"
        className="t mt-8 inline-flex min-h-[56px] items-center justify-center border border-plate-rule px-6 text-[18px] font-medium text-plate-text hover:border-gold hover:text-gold"
      >
        See the workshops
      </a>
    </section>
  );
}

function Booked({ booking }: { booking: BookingWithOffering }) {
  // Only ever reached with a workshop booking — the caller has already checked
  // that this session's booking belongs to the workshop in the address.
  const workshop = booking.workshop as NonNullable<
    BookingWithOffering["workshop"]
  >;
  const paid = paidPence(booking);
  const c = bookingConfirmation;
  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  const address = workshop.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      {/* ══ THE DAY THEY BOUGHT ═══════════════════════════════════════════ */}
      <div>
        <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
          {c.eyebrow}
        </p>
        <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[58px]">
          {workshop.name}
        </h1>
        <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
          {booking.places === 1 ? "One place" : `${booking.places} places`} on{" "}
          {formatDayLong(workshop.date)}. There is nothing else you need to do —
          a confirmation is on its way to{" "}
          <span className="fig font-mono text-plate-text">
            {booking.buyerEmail}
          </span>
          .
        </p>

        <dl className="rule mt-10 flex flex-wrap gap-x-12 gap-y-6 pt-8">
          <div>
            <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {c.when}
            </dt>
            <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
              {formatDayShort(workshop.date)} &middot; {workshop.startTime}
              {workshop.endTime ? `–${workshop.endTime}` : ""}
            </dd>
          </div>
          <div>
            <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {c.place}
            </dt>
            <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
              {workshop.venueName}
              {address.map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
              <br />
              {workshop.postcode}
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
      </div>

      {/* ══ THE RECEIPT, AND THE WAY OUT ══════════════════════════════════
          The cancellation terms sit ON this page, not only in the email.
          Somebody who books on a phone in a hurry will close the tab and go
          looking for "how do I cancel" long before they open the email. */}
      <aside>
        <div className="pool on-pool px-7 py-8 sm:px-9">
          <h2 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
            {c.whatYouPaid}
          </h2>
          <dl className="mt-5 flex flex-col gap-3 text-[18px] text-ink">
            <div className="flex justify-between gap-4">
              <dt>
                {booking.places} {booking.places === 1 ? "place" : "places"} at{" "}
                {formatMoney(workshop.priceGBP)}
              </dt>
              <dd className="fig font-mono">{formatMoney(paid)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-pool-rule/40 pt-3 font-semibold">
              <dt>Paid {formatInstant(booking.paidAt)}</dt>
              <dd className="fig font-mono">{formatMoney(paid)}</dd>
            </div>
          </dl>
          <p className="mt-4 fig font-mono text-[15px] text-ink-soft">
            Receipt from Stripe
          </p>

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
              and you get the full {formatMoney(paid)} back. After that the
              place is held for you and cannot be refunded.
            </p>
          ) : (
            <p className="mt-3 text-[17px] leading-relaxed text-ink">
              A place on this day cannot be refunded. You can still tell us you
              are not coming, and the place goes to somebody else.
            </p>
          )}
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            The link to cancel is in your email. It is the only one — this page
            cannot show it, which is on purpose: it is the key to your booking
            and it lives in your inbox, not in a web address anyone could keep.
          </p>
        </div>
      </aside>
    </div>
  );
}
