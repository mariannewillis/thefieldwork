import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import { SiteFooter } from "@/components/site/SiteChrome";
import { sessionPayPage } from "@/content/services";
import { bookingConfirmation } from "@/content/workshops";
import {
  bookingReference,
  findBookingBySession,
  offeringOf,
  paidPence,
  type BookingWithOffering,
} from "@/lib/bookings";
import { formatMoney } from "@/lib/format";

/**
 * Where paying for a session lands.
 *
 * The sibling of the workshop and course confirmations, and it makes the same
 * three promises they do:
 *
 * THIS PAGE CONFIRMS NOTHING. It is the browser coming back from Stripe, and a
 * browser cannot be evidence of a payment — the URL can be typed, kept from a
 * previous purchase, or reached by somebody who abandoned the checkout. So it
 * writes nothing and believes nothing: it looks up the payment the WEBHOOK
 * wrote, by session id, and shows what it finds. If the webhook has not arrived
 * yet — usually a second — it says so plainly and reloads itself rather than
 * inventing a receipt.
 *
 * THE LINK IS NOT ON IT. The cancellation token is stored only as a hash, so
 * this page genuinely cannot rebuild it, and issuing a fresh one here would
 * retire the link already sitting in their inbox. What stands in its place is
 * the sentence that was always true: it is in the email.
 *
 * AND IT IS SHORTER THAN THE OTHER TWO, because a session has less to say. No
 * run of dates to write down, no places, no balance — one time, one figure, and
 * the address is either hers or theirs.
 */

export const metadata: Metadata = {
  title: "Your session is booked — The Field Work",
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

  // The session id AND the address have to agree. A payment belonging to
  // another service would otherwise render somebody else's receipt under this
  // one's URL.
  const found = session ? await findBookingBySession(session) : null;
  const booking = found?.service?.slug === slug ? found : null;

  const c = sessionPayPage;

  return (
    <>
      <PageField src={bookingConfirmation.plate.src} />

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
                come back in four seconds. It is removed the moment the payment
                is found, so it never reloads a finished page. */}
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
        href="/services"
        className="t mt-8 inline-flex min-h-[56px] items-center justify-center border border-plate-rule px-6 text-[18px] font-medium text-plate-text hover:border-gold hover:text-gold"
      >
        {sessionPayPage.seeServices}
      </a>
    </section>
  );
}

function Booked({ booking }: { booking: BookingWithOffering }) {
  const offering = offeringOf(booking);
  const c = sessionPayPage;
  const address = offering.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="mt-14 max-w-[720px]">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
        {c.bookedTitle}
      </p>
      <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[58px]">
        {offering.name}
      </h1>
      <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
        {c.bookedBody}{" "}
        <span className="fig font-mono text-plate-text">
          {booking.buyerEmail}
        </span>
        .
      </p>

      <dl className="rule mt-10 flex flex-wrap gap-x-12 gap-y-6 pt-8">
        <div>
          <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            When
          </dt>
          {/* Her sentence, whole. There is no date behind it and nothing here
              pretends there is (D-25). */}
          <dd className="mt-2 max-w-[34ch] whitespace-pre-line fig font-mono text-[19px] text-plate-text">
            {offering.agreedTime ?? "The time you agreed"}
          </dd>
        </div>
        <div>
          <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            Where
          </dt>
          <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
            {offering.venueName}
            {address.map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            {offering.postcode ? (
              <>
                <br />
                {offering.postcode}
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            Paid
          </dt>
          <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
            {formatMoney(paidPence(booking))}
          </dd>
        </div>
        <div>
          <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            Reference
          </dt>
          <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
            {bookingReference(booking.id)}
          </dd>
        </div>
      </dl>

      <p className="mt-10 max-w-[52ch] text-[17px] leading-relaxed text-plate-soft">
        If you cannot come, the link to say so is in that email. There is no
        refund period on a session &mdash; write to Marianne and she will sort
        the money out with you herself.
      </p>
    </section>
  );
}
