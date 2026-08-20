import Link from "next/link";
import OfferingMessage from "@/components/admin/OfferingMessage";
import { offeringMessages } from "@/lib/offering-messages";
import AttendingTable from "@/components/admin/AttendingTable";
import FlyerTab from "@/components/admin/FlyerTab";
import OfferingTabs, { offeringTab } from "@/components/admin/OfferingTabs";
import { askedForService } from "@/lib/attending";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/admin/ServiceForm";
import { formatDuration, formatMoney } from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";
import { listMediaBasenames } from "@/lib/media";
import { toSource } from "@/lib/rich-text";
import { getServiceBySlug } from "@/lib/services";
import { listVenues } from "@/lib/venues";

/**
 * One service, open for editing.
 *
 * Reachable whether or not it is on the site — one she has taken down is still
 * hers to work on. The line at the top reads its state off the record rather
 * than off the last thing that happened, so refreshing the page cannot make it
 * say something that is no longer true (D-9).
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const showing = offeringTab(tab);
  const [service, media, venues] = await Promise.all([
    getServiceBySlug(slug),
    listMediaBasenames(),
    listVenues(),
  ]);

  if (!service) notFound();

  const [attendees, mail] = await Promise.all([
    askedForService(service.id),
    offeringMessages("service", service.id),
  ]);

  const travels = service.location === "travels";

  /**
   * The address the map is asked about, which is whichever branch is in force.
   *
   * On the travelling branch it is the base she sets out from, with no name to
   * search on — a postcode is still worth checking, because it is what every
   * distance on the page is measured from and it is typed by hand.
   */
  const mapUrl = travels
    ? mapSearchUrl({
        venueName: "",
        addressLines: service.baseAddressLines ?? "",
        postcode: service.basePostcode ?? "",
      })
    : mapSearchUrl({
        venueName: service.venueName ?? "",
        addressLines: service.addressLines ?? "",
        postcode: service.postcode ?? "",
      });

  const where = travels
    ? `Travels ${service.travelRadiusMiles} ${service.travelRadiusMiles === 1 ? "mile" : "miles"}`
    : service.venueName || "No place set yet";

  return (
    <>
      <section className="pt-8 pb-1" aria-labelledby="form-h">
        <Link
          href="/admin/offerings?kind=services"
          className="t fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text"
        >
          &larr; Offerings
        </Link>

        <p className="mt-5 fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          Service
        </p>
        <h1
          id="form-h"
          className="mt-3 font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
        >
          {service.name}
        </h1>
        <p className="mt-3 fig font-mono text-[17px] tabular-nums text-plate-soft">
          {formatDuration(service.durationMinutes)} &middot;{" "}
          {formatMoney(service.priceGBP)} &middot; {where}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <p
            className={`flex items-center gap-2.5 fig font-mono text-[15px] uppercase tracking-[0.14em] ${
              service.published ? "text-plate-success" : "text-plate-soft"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 ${service.published ? "bg-plate-success" : "bg-plate-soft"}`}
            />
            {service.published
              ? `Meant for the site · thefieldwork.co.uk/services/${service.slug}`
              : "Not on the site · only you can see this"}
          </p>
        </div>

        {/* Said once, at the top, rather than beside every field it touches:
            the one thing about this kind that is different from the other two
            (D-24). */}
        {service.published && (
          <p className="mt-4 max-w-[68ch] text-[17px] leading-relaxed text-plate-soft">
            That page is live. Nobody can pay for a session on it — they send
            you a message with a time that would suit them, and it arrives in
            Requests.
          </p>
        )}
        <OfferingTabs
          base={`/admin/offerings/services/${service.slug}`}
          current={showing}
          attending={attendees.length}
          kind="service"
        />
      </section>

      {showing === "editor" && (
        <>
          <ServiceForm
            media={media}
            venues={venues}
            // Built from the STORED address, not from what is in the fields, so
            // the link goes where the site will send people. Null while the
            // address is not set yet, and the form then shows nothing.
            mapUrl={mapUrl}
            service={{
              ...service,
              // The textarea shows her own marks, not the markup they became.
              body: toSource(service.bodyHtml),
            }}
          />
        </>
      )}

      {showing === "attending" && (
        <AttendingTable attendees={attendees} kind="service" />
      )}

      {showing === "email" && (
        <OfferingMessage
          kind="service"
          offeringId={service.id}
          slug={service.slug}
          subject={mail.draft.subject}
          blocks={mail.draft.blocks}
          attendees={attendees}
          media={media}
          sent={mail.sent}
        />
      )}

      {/* THE FLYER IS ITS OWN COMPONENT and it reads its own data, unlike the
          three tabs above it. Those need what this page already has in hand —
          the record, who is coming, what she has written to them — and passing
          them down costs nothing. A flyer needs a DIFFERENT read: the offering
          resolved against her overrides, the whole media library, and a QR
          generated from the address. Loading all of that on every visit to the
          editor tab, for a tab she may never open, is work nobody asked for. */}
      {showing === "flyer" && <FlyerTab kind="service" slug={service.slug} />}
    </>
  );
}
