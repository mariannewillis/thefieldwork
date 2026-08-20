import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import { notFound } from "next/navigation";
import BookingPanel from "@/components/site/BookingPanel";
import FilmEmbed from "@/components/site/FilmEmbed";
import PhotoRail from "@/components/site/PhotoRail";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { workshopDetail } from "@/content/workshops";
import JsonLd from "@/components/site/JsonLd";
import { placesLeft, placesSold } from "@/lib/bookings";
import { breadcrumbs, graph, practice, workshopEvent } from "@/lib/seo/jsonld";
import { parseFilm } from "@/lib/film";
import {
  formatDayLong,
  formatDayShort,
  formatMoney,
  isPast,
  refundDeadline,
} from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";
import { paymentsConfigured } from "@/lib/stripe";
import { getPublishedWorkshopBySlug } from "@/lib/workshops";

/**
 * One workshop's own page.
 *
 * Ported from docs/screens/webapp/workshop-detail.html, the approved
 * composition, the way (site)/page.tsx ported the home mockup: the stylesheet
 * is that file's, used as it was written (workshops.css), the structure is
 * preserved, and every string now comes from the database instead of being
 * inlined.
 *
 * The order is the masthead over the photograph, the facts, where it is, the
 * long body, the film, the stills, and the booking panel beside all of it —
 * which is also the order the admin form fills them in, because this page is
 * that form's output and the two have to stay the same shape.
 *
 * "Where it is" comes BEFORE the long body deliberately: somebody who cannot
 * get to Frome on a Saturday should find that out before they read a thousand
 * words.
 */

async function load(slug: string) {
  const workshop = await getPublishedWorkshopBySlug(slug);
  // A workshop she has taken down answers exactly as one that never existed —
  // not a 403, which would confirm it is there.
  if (!workshop) notFound();
  return workshop;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getPublishedWorkshopBySlug(slug);
  if (!workshop) return {};

  return {
    title: `${workshop.name} — The Field Work`,
    description: workshop.summary,
    alternates: { canonical: `/workshops/${workshop.slug}` },
    /**
     * ITS OWN PHOTOGRAPH, not the site's.
     *
     * A share of one workshop should show that workshop. The root layout's
     * altar picture is the fallback for everything that has none of its own,
     * and inheriting it here would mean every workshop she has ever run
     * shares as the same image — which is the same as having no image, with
     * extra steps.
     */
    openGraph: {
      type: "article",
      url: `/workshops/${workshop.slug}`,
      title: `${workshop.name} — The Field Work`,
      description: workshop.summary,
      ...(workshop.heroImage
        ? {
            images: [
              {
                url: `/media/${workshop.heroImage}-1200.jpg`,
                alt: workshop.heroAlt ?? "",
              },
            ],
          }
        : {}),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workshop = await load(slug);

  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  // Counted from paid bookings, so a cancellation gives the place straight
  // back with no second column to keep in step (D-16).
  const left = placesLeft(workshop.capacity, await placesSold(workshop.id));
  const past = isPast(workshop.date);
  // The stored address, understood — the player's address is derived here
  // rather than kept in the column, so what she pasted stays what she pasted.
  const film = workshop.filmUrl ? parseFilm(workshop.filmUrl) : null;
  const addressLines = workshop.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const gettingThere = workshop.gettingThere
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const mapUrl = mapSearchUrl(workshop);

  return (
    <>
      {/* WHAT A MACHINE READS. An `Event` with the date, the place, the
          price and whether there are places left — which is the question an
          assistant is actually being asked when somebody says "is there an aura
          healing workshop in Frome this month". Every value is the one the page
          below renders; see `lib/seo/jsonld.ts` for what is deliberately NOT
          claimed. */}
      <JsonLd
        json={graph(
          practice(),
          workshopEvent({
            slug: workshop.slug,
            name: workshop.name,
            summary: workshop.summary,
            date: workshop.date,
            startTime: workshop.startTime,
            endTime: workshop.endTime,
            priceGBP: workshop.priceGBP,
            placesLeft: past ? 0 : left,
            heroImage: workshop.heroImage,
            venueName: workshop.venueName,
            addressLines: workshop.addressLines,
            postcode: workshop.postcode,
          }),
          breadcrumbs([
            { name: "Workshops", path: "/workshops" },
            { name: workshop.name, path: `/workshops/${workshop.slug}` },
          ]),
        )}
      />
      {/* A PHOTOGRAPH, so it takes the photograph's treatment (operator,
          2026-08-19). It was `abstract` — brightness 0.92 and mirrored — which
          was tuned for the abstract that used to be here and has nothing to
          compete with. The moment every page took the room photograph instead,
          those values were showing a face at near-full brightness behind the
          prose, and every compression artefact in it with them. */}
      <PageField src={workshopDetail.plate.src} />

      <a
        href="#book"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to booking
      </a>

      {/* ══ MASTHEAD ═══════════════════════════════════════════════════════
          The picture, the name, the sentence underneath, then the facts. The
          hero photograph carries a real description rather than being hidden:
          the form will not let a picture on to the site without a line saying
          what is in it, so the page it produces cannot quietly do otherwise. */}
      <header className="relative overflow-hidden">
        {workshop.heroImage && (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${workshop.heroImage}-1200.avif 1200w, /media/${workshop.heroImage}-2400.avif 2400w`}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet={`/media/${workshop.heroImage}-1200.webp 1200w, /media/${workshop.heroImage}-2400.webp 2400w`}
              sizes="100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${workshop.heroImage}-2400.jpg`}
              alt={workshop.heroAlt ?? ""}
              className="field"
            />
          </picture>
        )}
        <div className="field-scrim" aria-hidden="true" />

        {/* Over the masthead photograph, but on the site's gutter rather
            than this page's measure, so the mark does not move between here
            and the index. The words below keep the measure. */}
        <div className="relative z-10">
          <SiteNav current="/workshops" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-10">
          <div className="pb-14 pt-10 lg:pb-16 lg:pt-16">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
              {workshopDetail.eyebrow}
            </p>
            <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[60px] lg:text-[76px]">
              {workshop.name}
            </h1>
            <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
              {workshop.summary}
            </p>

            {/* Date, place and price above everything, because they are what
                decides whether the rest is worth reading. */}
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {workshopDetail.when}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {formatDayShort(workshop.date)} &middot; {workshop.startTime}
                  {workshop.endTime ? `–${workshop.endTime}` : ""}
                </dd>
              </div>
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {workshopDetail.place}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {workshop.venueName}
                </dd>
              </div>
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {workshopDetail.price}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {formatMoney(workshop.priceGBP)} a place
                </dd>
              </div>
            </dl>
          </div>

          {/* The count, plainly, as the line the photograph ends on. It says
              how many are LEFT now that bookings exist to count them — but only
              once some have gone. "10 places left of 10" is a true sentence
              that tells a reader nobody has booked, which is not a thing to
              print on the page of a day that is still months away; before the
              first booking it says what the room holds, as it always did. A
              day that has been and gone does the same, because "0 places left"
              on last month's workshop is a false alarm. */}
          <div className="pb-12 lg:pb-16">
            <p className="mt-4 fig font-mono text-[15px]">
              <span className="text-gold">
                {past || left === workshop.capacity
                  ? `${workshop.capacity} places`
                  : left === 0
                    ? "Full"
                    : `${left} ${left === 1 ? "place" : "places"} left of ${workshop.capacity}`}
              </span>
              <span className="text-plate-rule">
                {" "}
                &middot; a small group, in one room, for one day
              </span>
            </p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="pt-14 lg:pt-20">
            {/* ══ WHERE IT IS ═══════════════════════════════════════════ */}
            {(addressLines.length > 0 || gettingThere.length > 0) && (
              <section aria-labelledby="where">
                <h2
                  id="where"
                  className="font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
                >
                  {workshopDetail.where}
                </h2>

                <div className="mt-7 grid gap-8 sm:grid-cols-[260px_minmax(0,1fr)]">
                  <div>
                    <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                      {workshopDetail.address}
                    </h3>
                    <address className="mt-4 not-italic text-[22px] leading-relaxed text-plate-text">
                      {workshop.venueName}
                      <br />
                      {addressLines.map((line) => (
                        <span key={line}>
                          {line}
                          <br />
                        </span>
                      ))}
                      <span className="fig font-mono">{workshop.postcode}</span>
                    </address>
                    {mapUrl && (
                      <a
                        className="t mt-4 inline-block text-[17px] text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
                        href={mapUrl}
                      >
                        {workshopDetail.openInMap}
                      </a>
                    )}
                  </div>

                  {gettingThere.length > 0 && (
                    <div>
                      <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                        {workshopDetail.gettingThere}
                      </h3>
                      <ul className="mt-4 flex flex-col gap-4 text-[19px] leading-relaxed text-plate-soft">
                        {gettingThere.map((line) => (
                          <li key={line} className="flex gap-4">
                            <span
                              aria-hidden="true"
                              className="mt-[15px] h-px w-5 shrink-0 bg-gold"
                            />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ══ WHAT THE DAY IS ═══════════════════════════════════════
                HER headings are the section titles here — there is no heading
                of the page's own above this, because the form promises her
                exactly that ("Headings and sub-headings become the section
                titles on the workshop's page") and a fixed one printed above
                the first of hers said "What the day is" twice.

                The only region on the site whose markup is not written by a
                component. It is safe to render directly because the ONLY
                thing that ever writes this column is lib/rich-text.ts, which
                escapes every character she types before adding any tag — see
                the note at the top of that file. */}
            <section className="mt-16">
              <div
                className="body-copy"
                dangerouslySetInnerHTML={{ __html: workshop.bodyHtml }}
              />
            </section>

            {/* ══ THE ROOM, AND MARIANNE ════════════════════════════════
                One film, given real size, then the stills. The order matters:
                somebody deciding whether to spend a Saturday with a stranger
                wants to see the room and hear the voice before they want a
                grid of photographs. Nothing autoplays, and nothing loops.

                The whole region is left out when there is no film and no
                photograph — an empty heading is worse than a shorter page. */}
            {(film || workshop.images.length > 0) && (
              <section className="mt-16" aria-labelledby="room">
                <h2
                  id="room"
                  className="font-display text-[30px] font-normal leading-tight text-plate-text"
                >
                  {film ? workshopDetail.theRoom : workshopDetail.stills}
                </h2>

                {film && (
                  <FilmEmbed
                    embedUrl={film.embedUrl}
                    watchUrl={film.watchUrl}
                    providerName={film.providerName}
                    poster={workshop.filmPoster}
                    duration={workshop.filmDuration}
                    title={workshop.name}
                  />
                )}

                <PhotoRail images={workshop.images} />
              </section>
            )}
          </div>

          <BookingPanel
            slug={workshop.slug}
            capacity={workshop.capacity}
            placesLeft={left}
            pricePence={workshop.priceGBP}
            refundDays={workshop.refundDays}
            refundDeadline={deadline ? formatDayLong(deadline) : null}
            canBuy={paymentsConfigured()}
            isPast={past}
          />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
