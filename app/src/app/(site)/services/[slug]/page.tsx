import type { Metadata } from "next";
import JsonLd from "@/components/site/JsonLd";
import PageField from "@/components/site/PageField";
import { breadcrumbs, graph, practice, serviceObject } from "@/lib/seo/jsonld";
import { notFound } from "next/navigation";
import FilmEmbed from "@/components/site/FilmEmbed";
import PhotoRail from "@/components/site/PhotoRail";
import RequestPanel from "@/components/site/RequestPanel";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { serviceDetail } from "@/content/services";
import { offeredFor } from "@/lib/availability";
import { parseFilm } from "@/lib/film";
import { formatDuration, formatMoney } from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";
import {
  getPublishedServiceBySlug,
  placeInOneLine,
  servicePlace,
  type ServicePlace,
} from "@/lib/services";
import { calendarMonths, offeredView } from "@/lib/slots";

/**
 * READ ON EVERY REQUEST, never built once and served.
 *
 * The times in the panel are true for as long as nobody else asks for one, so a
 * cached copy of this page would offer an hour that has gone — and the person
 * who chose it would be told so only after filling the form in. The re-check on
 * submit means that is a sentence rather than a double booking, but the honest
 * place to be right is here.
 */
export const dynamic = "force-dynamic";

/**
 * One service's own page.
 *
 * Ported from docs/screens/webapp/service-detail.html, the approved
 * composition, exactly as the course detail page ported its own — the masthead
 * over the photograph, the facts, where it is, the long body, the film, the
 * stills, the panel beside all of it. The screen predates the built page shape
 * (D-1), so the STRUCTURE follows the courses pages and the WORDS follow the
 * screen.
 *
 * TWO FACTS CHANGE SHAPE from the other two kinds, and both are the shape of
 * the thing rather than work left undone:
 *
 *  · WHEN becomes HOW LONG. A service has a length and no date; the start is
 *    whatever she and the person agree on, and there is nothing here that
 *    could print a day.
 *  · WHERE becomes ONE OF TWO. Either it happens at a place of hers — an
 *    address, Getting There, a map link, exactly as a workshop's does — or she
 *    travels, and then the page says where she sets out from, how far she
 *    goes, and what that costs in her own words. NEVER BOTH: the record holds
 *    one branch and empties the other, and `servicePlace()` is what turns that
 *    into a shape this page cannot get wrong.
 *
 * And what the page ASKS FOR is different. A workshop and a course have a
 * checkout; this has a message. See RequestPanel — and D-24 for why there is
 * no time picker and no hold.
 *
 * The only script on the page is the photograph modal, which is the workshop
 * page's component unchanged, and the request panel, which renders whole on
 * the server before it does anything.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublishedServiceBySlug(slug);
  if (!service) return {};

  return {
    title: `${service.name} — The Field Work`,
    description: service.summary,
    alternates: { canonical: `/services/${service.slug}` },
    /**
     * ITS OWN PHOTOGRAPH, not the site's.
     *
     * A share of one service should show that service. The root layout's
     * altar picture is the fallback for everything that has none of its own,
     * and inheriting it here would mean every service she has ever run
     * shares as the same image — which is the same as having no image, with
     * extra steps.
     */
    openGraph: {
      type: "article",
      url: `/services/${service.slug}`,
      title: `${service.name} — The Field Work`,
      description: service.summary,
      ...(service.heroImage
        ? {
            images: [
              {
                url: `/media/${service.heroImage}-1200.jpg`,
                alt: service.heroAlt ?? "",
              },
            ],
          }
        : {}),
    },
  };
}

/**
 * At a venue — the workshop page's region, unchanged, because it is the same
 * question with the same answer: can I get there.
 */
function AtAVenue({
  place,
  mapUrl,
}: {
  place: Extract<ServicePlace, { kind: "venue" }>;
  mapUrl: string | null;
}) {
  return (
    <section aria-labelledby="where">
      <h2
        id="where"
        className="font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
      >
        {serviceDetail.where}
      </h2>

      <div className="mt-7 grid gap-8 sm:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            {serviceDetail.address}
          </h3>
          <address className="mt-4 not-italic text-[22px] leading-relaxed text-plate-text">
            {place.venueName}
            <br />
            {place.addressLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            <span className="fig font-mono">{place.postcode}</span>
          </address>
          {mapUrl && (
            <a
              className="t mt-4 inline-block text-[17px] text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
              href={mapUrl}
            >
              {serviceDetail.openInMap}
            </a>
          )}
        </div>

        {place.gettingThere.length > 0 && (
          <div>
            <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {serviceDetail.gettingThere}
            </h3>
            <ul className="mt-4 flex flex-col gap-4 text-[19px] leading-relaxed text-plate-soft">
              {place.gettingThere.map((line) => (
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
  );
}

/**
 * She travels — a different question, so a different region rather than the
 * venue's one with the labels changed.
 *
 * Somebody reading this is not asking how to get somewhere; they are asking
 * whether they are close enough, and what it costs. So the reach is the
 * largest thing here, the base address is the small print underneath it, and
 * there is no map link — a search for the postcode she sets out from is a pin
 * on a house that is not the appointment.
 *
 * What travelling costs is HER SENTENCE, printed as she wrote it. There is no
 * rate, no threshold and no surcharge anywhere near it, for the reason the
 * schema gives on `Service.travelNote`: she was asked and did not say, so
 * anything structured would be a pricing policy invented on her behalf. With
 * no note at all the page says to ask rather than saying it is free.
 */
function SheTravels({
  place,
}: {
  place: Extract<ServicePlace, { kind: "travels" }>;
}) {
  return (
    <section aria-labelledby="where">
      <h2
        id="where"
        className="font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
      >
        {serviceDetail.whereTravel}
      </h2>

      <p className="mt-5 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
        {serviceDetail.travelHeading}
        {place.radiusMiles !== null && (
          <>
            {" "}
            &mdash; up to{" "}
            <span className="fig font-mono text-plate-text">
              {place.radiusMiles} {place.radiusMiles === 1 ? "mile" : "miles"}
            </span>
            {place.postcode && (
              <>
                {" "}
                from <span className="fig font-mono">{place.postcode}</span>
              </>
            )}
            .
          </>
        )}
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-[260px_minmax(0,1fr)]">
        {(place.addressLines.length > 0 || place.postcode) && (
          <div>
            <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
              {serviceDetail.travelFrom}
            </h3>
            <address className="mt-4 not-italic text-[19px] leading-relaxed text-plate-soft">
              {place.addressLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
              <span className="fig font-mono">{place.postcode}</span>
            </address>
          </div>
        )}

        <div>
          <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
            {serviceDetail.travelCost}
          </h3>
          <p className="mt-4 max-w-[52ch] whitespace-pre-line text-[19px] leading-relaxed text-plate-soft">
            {place.note ?? serviceDetail.travelNoNote}
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getPublishedServiceBySlug(slug);
  // One she has taken down answers exactly as one that never existed — not a
  // 403, which would confirm it is there.
  if (!service) notFound();

  /**
   * The times on offer, worked out HERE and never in the browser.
   *
   * It reads her whole diary — every workshop, every course date, every session
   * paid for, every request still holding its hour, and every block of her own —
   * and returns only what is left. The panel is handed the answer; it is never
   * handed the rule.
   *
   * WHICH IS WHY THIS PAGE CANNOT BE PRERENDERED AND CACHED. `dynamic` below
   * says so: availability changes the moment anybody else asks for a slot, and a
   * page built ten minutes ago would offer an hour that has gone. The rest of
   * the page is prose off one row and would happily cache; the panel is what
   * makes the whole thing perishable, and the re-check on submit is what makes
   * that survivable rather than merely fast.
   */
  const days = offeredView(await offeredFor(service));

  /**
   * The calendar the picker draws those times on — every date in the booking
   * window, whether she can do it or not, with the weekday each one falls on
   * already worked out. Here rather than in the browser for the reason the
   * times are: a grid is arithmetic too, and February is arithmetic that goes
   * wrong every fourth year. It knows nothing about what is free; the panel
   * matches the two by day.
   */
  const months = calendarMonths();

  const place = servicePlace(service);
  const film = service.filmUrl ? parseFilm(service.filmUrl) : null;
  const mapUrl =
    place.kind === "venue"
      ? mapSearchUrl({
          venueName: place.venueName,
          addressLines: place.addressLines.join("\n"),
          postcode: place.postcode,
        })
      : null;

  return (
    <>
      {/* A `Service` and not an `Event`: a one-to-one hour has no date — it is
          arranged — and an Event would need a `startDate` it does not have. */}
      <JsonLd
        json={graph(
          practice(),
          serviceObject({
            slug: service.slug,
            name: service.name,
            summary: service.summary,
            priceGBP: service.priceGBP,
            durationMinutes: service.durationMinutes,
            heroImage: service.heroImage,
          }),
          breadcrumbs([
            { name: "Sessions", path: "/services" },
            { name: service.name, path: `/services/${service.slug}` },
          ]),
        )}
      />
      {/* A PHOTOGRAPH, so it takes the photograph's treatment (operator,
          2026-08-19). It was `abstract` — brightness 0.92 and mirrored — which
          was tuned for the abstract that used to be here and has nothing to
          compete with. The moment every page took the room photograph instead,
          those values were showing a face at near-full brightness behind the
          prose, and every compression artefact in it with them. */}
      <PageField src={serviceDetail.plate.src} />

      <a
        href="#ask"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to asking for it
      </a>

      {/* ══ MASTHEAD ═══════════════════════════════════════════════════════
          The picture, the name, the sentence underneath, then the facts. The
          first fact is HOW LONG, because on this kind that is what a date is
          on the other two: the thing you decide against. */}
      <header className="relative overflow-hidden">
        {service.heroImage && (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${service.heroImage}-1200.avif 1200w, /media/${service.heroImage}-2400.avif 2400w`}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet={`/media/${service.heroImage}-1200.webp 1200w, /media/${service.heroImage}-2400.webp 2400w`}
              sizes="100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${service.heroImage}-2400.jpg`}
              alt={service.heroAlt ?? ""}
              className="field"
            />
          </picture>
        )}
        <div className="field-scrim" aria-hidden="true" />

        {/* Over the masthead photograph, but on the site's gutter rather
            than this page's measure, so the mark does not move between here
            and the index. The words below keep the measure. */}
        <div className="relative z-10">
          <SiteNav current="/services" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-10">
          <div className="pb-14 pt-10 lg:pb-16 lg:pt-16">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
              {serviceDetail.eyebrow} &middot;{" "}
              {formatDuration(service.durationMinutes)}
            </p>
            <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[60px] lg:text-[76px]">
              {service.name}
            </h1>
            <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
              {service.summary}
            </p>

            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {serviceDetail.howLong}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {formatDuration(service.durationMinutes)}
                </dd>
                {/* Said where the run's hours are said on a course. It is the
                    one thing somebody assumes wrongly about a page with no
                    date on it: there is no diary here to pick out of. */}
                <dd className="mt-1 fig font-mono text-[17px] text-plate-soft">
                  the time is arranged between you
                </dd>
              </div>
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {serviceDetail.place}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {placeInOneLine(place)}
                </dd>
              </div>
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {serviceDetail.price}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {formatMoney(service.priceGBP)}
                </dd>
                <dd className="mt-1 fig font-mono text-[17px] text-plate-soft">
                  nothing is charged by this page
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="pt-14 lg:pt-20">
            {/* ══ WHERE IT IS ═══════════════════════════════════════════
                Before the long body, as on the other two pages: somebody who
                cannot get to Frome — or who lives outside the distance she
                travels — should find that out before they read a thousand
                words. ONE branch, never both. */}
            {place.kind === "venue" ? (
              (place.venueName ||
                place.addressLines.length > 0 ||
                place.gettingThere.length > 0) && (
                <AtAVenue place={place} mapUrl={mapUrl} />
              )
            ) : (
              <SheTravels place={place} />
            )}

            {/* ══ WHAT THE SESSION IS ═══════════════════════════════════
                HER headings are the section titles here, as on the other two
                pages — no heading of the page's own above the first of hers.

                Safe to render directly because the ONLY thing that ever writes
                this column is lib/rich-text.ts, which escapes every character
                she types before adding any tag. */}
            <section className="mt-16">
              <div
                className="body-copy"
                dangerouslySetInnerHTML={{ __html: service.bodyHtml }}
              />
            </section>

            {/* ══ THE ROOM, AND MARIANNE ════════════════════════════════
                One film, given real size, then the stills. Somebody deciding
                whether to spend an hour alone in a room with a stranger wants
                to see the room and hear the voice more than anybody deciding
                on a group day does. Nothing autoplays and nothing loops.

                Left out entirely when there is no film and no photograph — an
                empty heading is worse than a shorter page. */}
            {(film || service.images.length > 0) && (
              <section className="mt-16" aria-labelledby="room">
                <h2
                  id="room"
                  className="font-display text-[30px] font-normal leading-tight text-plate-text"
                >
                  {film ? serviceDetail.theRoom : serviceDetail.stills}
                </h2>

                {film && (
                  <FilmEmbed
                    embedUrl={film.embedUrl}
                    watchUrl={film.watchUrl}
                    providerName={film.providerName}
                    poster={service.filmPoster}
                    duration={service.filmDuration}
                    title={service.name}
                  />
                )}

                <PhotoRail images={service.images} />
              </section>
            )}
          </div>

          {/* ══ ASKING FOR IT ═════════════════════════════════════════════
              The one blush pool on the page. Where the other two kinds put a
              checkout, this puts a message — because that is still what happens
              next. What has changed is that the message now carries a time out
              of her actual diary, and asking for it holds it (D-26). It is
              still not a "Book now": she answers, and the payment link comes
              after she does. */}
          <RequestPanel
            slug={service.slug}
            serviceName={service.name}
            days={days}
            months={months}
          />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
