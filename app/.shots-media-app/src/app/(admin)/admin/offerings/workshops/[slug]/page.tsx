import Link from "next/link";
import { notFound } from "next/navigation";
import WorkshopForm from "@/components/admin/WorkshopForm";
import { formatDayShort, formatMoney } from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";
import { listMediaBasenames } from "@/lib/media";
import { toSource } from "@/lib/rich-text";
import { listVenues } from "@/lib/venues";
import { getWorkshopBySlug } from "@/lib/workshops";

/**
 * One workshop, open for editing.
 *
 * Reachable whether or not it is on the site — a workshop she has taken down
 * is still hers to work on. The line at the top reads its state off the record
 * rather than off the last thing that happened, so refreshing the page cannot
 * make it say something that is no longer true (D-9).
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [workshop, media, venues] = await Promise.all([
    getWorkshopBySlug(slug),
    listMediaBasenames(),
    listVenues(),
  ]);

  if (!workshop) notFound();

  return (
    <>
      <section className="pt-8 pb-1" aria-labelledby="form-h">
        <Link
          href="/admin/offerings"
          className="t fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text"
        >
          &larr; Offerings
        </Link>

        <p className="mt-5 fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          Workshop
        </p>
        <h1
          id="form-h"
          className="mt-3 font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
        >
          {workshop.name}
        </h1>
        <p className="mt-3 fig font-mono text-[17px] tabular-nums text-plate-soft">
          {formatDayShort(workshop.date)} &middot; {workshop.startTime}
          {workshop.endTime ? `–${workshop.endTime}` : ""} &middot;{" "}
          {formatMoney(workshop.priceGBP)} &middot; {workshop.capacity} places
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <p
            className={`flex items-center gap-2.5 fig font-mono text-[15px] uppercase tracking-[0.14em] ${
              workshop.published ? "text-plate-success" : "text-plate-soft"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 ${workshop.published ? "bg-plate-success" : "bg-plate-soft"}`}
            />
            {workshop.published
              ? `On the site · thefieldwork.co.uk/workshops/${workshop.slug}`
              : "Not on the site · only you can see this"}
          </p>

          {workshop.published && (
            <Link
              href={`/workshops/${workshop.slug}`}
              className="t inline-flex min-h-[44px] items-center text-[17px] font-medium text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
            >
              See the public page
            </Link>
          )}
        </div>
      </section>

      <WorkshopForm
        media={media}
        venues={venues}
        // Built from the STORED address, not from what is in the fields, so
        // the link goes where the site currently sends people. Null while the
        // place is not set yet, and the form then shows nothing.
        mapUrl={mapSearchUrl(workshop)}
        workshop={{
          ...workshop,
          // The textarea shows her own marks, not the markup they became.
          body: toSource(workshop.bodyHtml),
        }}
      />
    </>
  );
}
