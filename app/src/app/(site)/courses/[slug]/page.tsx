import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FilmEmbed from "@/components/site/FilmEmbed";
import PhotoRail from "@/components/site/PhotoRail";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { courseDetail } from "@/content/courses";
import { capitalise, runShape, spellCount } from "@/lib/course-run";
import { getPublishedCourseBySlug } from "@/lib/courses";
import { parseFilm } from "@/lib/film";
import {
  formatDayLong,
  formatDayShort,
  formatMoney,
  refundDeadline,
} from "@/lib/format";
import { mapSearchUrl } from "@/lib/maps";

/**
 * One course's own page.
 *
 * Ported from docs/screens/courses flow/course-detail.html, the approved
 * composition, exactly as the workshop detail page ported its own: the
 * stylesheet is that file's, used as it was written, the structure is
 * preserved, and every string now comes from the database.
 *
 * The order is the workshop page's order — the masthead over the photograph,
 * the facts, where it is, the long body, the film, the stills, the panel beside
 * all of it — with the run of dates inserted after the body. That is where it
 * belongs: the dates are the commitment being decided on, and they come after
 * the sentence explaining what the course is and before the pictures.
 *
 * The only script on the page is the photograph modal, which is the workshop
 * page's component unchanged. THE DATES USE NONE. A `<details>` already is a
 * button, already announces expanded and collapsed, already opens on Enter and
 * on Space, and already prints open when the browser wants it to; re-building
 * that in JavaScript would be work spent making it worse.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) return {};

  return {
    title: `${course.name} — The Field Work`,
    description: course.summary,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

type Course = NonNullable<Awaited<ReturnType<typeof getPublishedCourseBySlug>>>;
type Session = Course["sessions"][number];

/**
 * The whole of a date's collapsed state, and it has to be enough to decide on:
 * where it falls in the run, what it is called, the day, the hours and the room.
 * Somebody who never opens one still knows whether they can make them all.
 *
 * The room is on every line rather than only when it differs from the course's
 * own address. A run that moves for one week is a real thing (see the schema
 * note on `CourseSession.venue`), and a reader who has to notice the ABSENCE of
 * a line to learn that the other five are in the same place has been asked to
 * do the page's work.
 */
function DateSummary({
  session,
  position,
  count,
}: {
  session: Session;
  position: number;
  count: number;
}) {
  return (
    <>
      <span className="fig w-[112px] shrink-0 whitespace-nowrap font-mono text-[17px] leading-[1.35] text-gold">
        {courseDetail.dates.position(position, count)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="ev-title block font-display text-[26px] font-normal leading-tight text-plate-text">
          {session.title}
        </span>
        <span className="mt-2 block fig font-mono text-[16px] leading-relaxed text-plate-rule">
          {[
            formatDayShort(session.date),
            `${session.startTime}–${session.endTime}`,
            session.venue,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  // A course she has taken down answers exactly as one that never existed —
  // not a 403, which would confirm it is there.
  if (!course) notFound();

  const run = runShape(course.sessions);
  // Counted back from the FIRST date. A course is bought once, so it is
  // cancelled once, and the run's own start is the deadline that matters.
  const deadline = run ? refundDeadline(run.first, course.refundDays) : null;
  const film = course.filmUrl ? parseFilm(course.filmUrl) : null;
  const addressLines = course.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const gettingThere = course.gettingThere
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const mapUrl = mapSearchUrl(course);
  // The first date that has anything behind it is the one delivered open, so
  // the mechanism is legible in a still screenshot and the shape of a date is
  // shown once rather than described. A run whose first date has no description
  // opens the first one that does, rather than opening an empty drawer.
  const firstOpen = course.sessions.findIndex((session) =>
    session.description.trim(),
  );

  return (
    <>
      {/* The page ground: an abstract, fixed and scrimmed. Decorative, so it
          carries no alt and is hidden from assistive tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${courseDetail.plate.src}-2400.jpg`}
        alt=""
        aria-hidden="true"
        className="page-field page-field--abstract"
      />
      <div className="page-scrim page-scrim--abstract" aria-hidden="true" />

      <a
        href="#book"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to what it costs
      </a>

      {/* ══ MASTHEAD ═══════════════════════════════════════════════════════
          The picture, the name, the sentence underneath, then the facts. One
          fact changes shape from the workshop page: a course has a SPAN rather
          than a date, and the span is what decides whether the rest is worth
          reading — four Wednesdays is a thing you either have or do not have. */}
      <header className="relative overflow-hidden">
        {course.heroImage && (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${course.heroImage}-1200.avif 1200w, /media/${course.heroImage}-2400.avif 2400w`}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet={`/media/${course.heroImage}-1200.webp 1200w, /media/${course.heroImage}-2400.webp 2400w`}
              sizes="100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${course.heroImage}-2400.jpg`}
              alt={course.heroAlt ?? ""}
              className="field"
            />
          </picture>
        )}
        <div className="field-scrim" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-10">
          <SiteNav current="/courses" />

          <div className="pb-14 pt-10 lg:pb-16 lg:pt-16">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
              {courseDetail.eyebrow}
              {run && ` · ${run.words}`}
            </p>
            <h1 className="mt-4 max-w-[16ch] font-display text-[46px] font-normal leading-[1.02] text-plate-text sm:text-[60px] lg:text-[76px]">
              {course.name}
            </h1>
            <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-plate-soft">
              {course.summary}
            </p>

            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              {run && (
                <div>
                  <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                    {courseDetail.when}
                  </dt>
                  <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                    {capitalise(run.words)} &middot; {run.span}
                  </dd>
                  {/* The hours only when every date keeps the same ones. When
                      they vary, each date carries its own further down, and one
                      line up here claiming a single pair would be wrong about
                      most of the run. */}
                  {run.hours && (
                    <dd className="mt-1 fig font-mono text-[17px] text-plate-soft">
                      {run.hours}, each time
                    </dd>
                  )}
                </div>
              )}
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {courseDetail.place}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {course.venueName}
                </dd>
              </div>
              <div>
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                  {courseDetail.price}
                </dt>
                <dd className="mt-2 fig font-mono text-[19px] text-plate-text">
                  {formatMoney(course.priceGBP)} {courseDetail.panel.forTheRun}
                </dd>
              </div>
            </dl>
          </div>

          {/* WHAT THE ROOM HOLDS, as the line the photograph ends on. The
              approved screen says "5 places left of 8"; nothing books a course,
              so there are no bookings to count off the capacity and a figure
              here would be invented. Where the other number will come from is
              said once, in the panel, beside the same figure. */}
          <div className="pb-12 lg:pb-16">
            <p className="mt-4 fig font-mono text-[15px]">
              <span className="text-gold">
                {course.capacity} {course.capacity === 1 ? "place" : "places"}
              </span>
              <span className="text-plate-rule">
                {" "}
                &middot; {courseDetail.onePlaceCovers}
              </span>
            </p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="pt-14 lg:pt-20">
            {/* ══ WHERE IT IS ═══════════════════════════════════════════
                Before the long body, as on the workshop page: somebody who
                cannot get to Frome on four winter Wednesdays should find that
                out before they read a thousand words. */}
            {(addressLines.length > 0 || gettingThere.length > 0) && (
              <section aria-labelledby="where">
                <h2
                  id="where"
                  className="font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
                >
                  {courseDetail.where}
                </h2>

                <div className="mt-7 grid gap-8 sm:grid-cols-[260px_minmax(0,1fr)]">
                  <div>
                    <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                      {courseDetail.address}
                    </h3>
                    <address className="mt-4 not-italic text-[22px] leading-relaxed text-plate-text">
                      {course.venueName}
                      <br />
                      {addressLines.map((line) => (
                        <span key={line}>
                          {line}
                          <br />
                        </span>
                      ))}
                      <span className="fig font-mono">{course.postcode}</span>
                    </address>
                    {mapUrl && (
                      <a
                        className="t mt-4 inline-block text-[17px] text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
                        href={mapUrl}
                      >
                        {courseDetail.openInMap}
                      </a>
                    )}
                  </div>

                  {gettingThere.length > 0 && (
                    <div>
                      <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-plate-rule">
                        {courseDetail.gettingThere}
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

            {/* ══ WHAT THE COURSE IS ════════════════════════════════════
                HER headings are the section titles here, as on the workshop
                page — no heading of the page's own is printed above the first
                of hers.

                Safe to render directly because the ONLY thing that ever writes
                this column is lib/rich-text.ts, which escapes every character
                she types before adding any tag. */}
            <section className="mt-16">
              <div
                className="body-copy"
                dangerouslySetInnerHTML={{ __html: course.bodyHtml }}
              />
            </section>

            {/* ══ THE DATES ═════════════════════════════════════════════
                The one region the workshop page does not have. The dates and
                their hours are out on the line; the prose folds away behind a
                native disclosure. Nothing that anybody needs in order to decide
                is inside a closed one.

                A date she has not written a description for is NOT a control:
                it draws the same line without a mark and without a hinge,
                because a button that opens on nothing is a small lie. */}
            {course.sessions.length > 0 && (
              <section className="mt-14" aria-labelledby="dates">
                <h2
                  id="dates"
                  className="font-display text-[30px] font-normal leading-tight text-plate-text"
                >
                  {course.sessions.length === 1
                    ? "The date"
                    : `The ${spellCount(course.sessions.length)} dates`}
                </h2>
                {firstOpen >= 0 && (
                  <p className="mt-4 max-w-[58ch] text-[19px] leading-relaxed text-plate-soft">
                    {courseDetail.dates.lede}
                  </p>
                )}

                <ul className="mt-7 border-t border-plate-rule/30">
                  {course.sessions.map((session, position) => {
                    const description = session.description.trim();
                    return (
                      <li
                        key={session.id}
                        className="border-b border-plate-rule/30"
                      >
                        {description ? (
                          <details open={position === firstOpen}>
                            <summary className="ev-sum">
                              <DateSummary
                                session={session}
                                position={position + 1}
                                count={course.sessions.length}
                              />
                              <span className="ev-mark" aria-hidden="true" />
                            </summary>
                            <div className="pb-7 sm:pl-[140px]">
                              <p className="max-w-[58ch] whitespace-pre-line text-[19px] leading-relaxed text-plate-soft">
                                {description}
                              </p>
                            </div>
                          </details>
                        ) : (
                          <div className="flex items-start gap-5 py-[22px] sm:gap-7">
                            <DateSummary
                              session={session}
                              position={position + 1}
                              count={course.sessions.length}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ══ THE ROOM, AND MARIANNE ════════════════════════════════
                One film, given real size, then the stills. Somebody deciding
                whether to spend four evenings with a stranger wants to see the
                room and hear the voice before they want a grid of photographs.
                Nothing autoplays and nothing loops.

                Left out entirely when there is no film and no photograph — an
                empty heading is worse than a shorter page. */}
            {(film || course.images.length > 0) && (
              <section className="mt-16" aria-labelledby="room">
                <h2
                  id="room"
                  className="font-display text-[30px] font-normal leading-tight text-plate-text"
                >
                  {film ? courseDetail.theRoom : courseDetail.stills}
                </h2>

                {film && (
                  <FilmEmbed
                    embedUrl={film.embedUrl}
                    watchUrl={film.watchUrl}
                    providerName={film.providerName}
                    poster={course.filmPoster}
                    duration={course.filmDuration}
                    title={course.name}
                  />
                )}

                <PhotoRail images={course.images} />
              </section>
            )}
          </div>

          {/* ══ WHAT IT COSTS ═════════════════════════════════════════════
              The one blush pool on the page. The approved screen puts a "Pay
              the deposit · £80" button here, and there is nothing behind it:
              no checkout for a run of dates, no deposit charged, no course
              bookings anywhere in the system. So the button is not drawn, and
              what stands in its place says so — the same move the workshop
              panel made before Stripe landed, and the one the portal's own
              stubs make (D-9).

              Everything else in the panel is real and is what somebody
              deciding needs: the price for the whole run, what the room holds,
              the deposit she has set, and the date a place could be cancelled
              by, counted back from the first date. */}
          <aside id="book" className="lg:pt-20" aria-labelledby="book-h">
            <div className="pool on-pool sticky top-8 px-7 py-8 sm:px-9">
              <h2
                id="book-h"
                className="font-display text-[30px] font-normal leading-tight text-ink"
              >
                {courseDetail.panel.title}
              </h2>

              <p className="mt-5 fig font-mono text-[22px] text-ink">
                {formatMoney(course.priceGBP)}{" "}
                <span className="text-[16px] text-ink-soft">
                  {courseDetail.panel.forTheRun}
                </span>
              </p>

              {course.depositGBP !== null && (
                <p className="mt-3 fig font-mono text-[16px] text-ink-soft">
                  {courseDetail.panel.depositLabel}{" "}
                  {formatMoney(course.depositGBP)} &middot;{" "}
                  {courseDetail.panel.depositNote}
                </p>
              )}

              <p className="mt-5 fig font-mono text-[16px] text-ink">
                {course.capacity} {course.capacity === 1 ? "place" : "places"}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {courseDetail.panel.placesNote}
              </p>

              <div className="mt-7 border border-pool-rule px-5 py-5">
                <p className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {courseDetail.panel.notLiveEyebrow}
                </p>
                <p className="mt-2 text-[19px] font-semibold leading-snug text-ink">
                  {courseDetail.panel.notLiveTitle}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  {courseDetail.panel.notLiveBody}
                </p>
              </div>

              <hr className="my-7 border-0 border-t border-pool-rule/40" />

              <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                {courseDetail.panel.ifYouCannotCome}
              </h3>
              {/* Written as the terms a place WOULD be taken on, because none
                  has been. A page that says "you are refunded in full" about a
                  payment it cannot take is describing something that has never
                  happened to anybody. */}
              {deadline ? (
                <p className="mt-3 text-[17px] leading-relaxed text-ink">
                  When a place can be taken, it will be cancellable up to{" "}
                  <strong className="font-semibold">
                    {course.refundDays}{" "}
                    {course.refundDays === 1 ? "day" : "days"}
                  </strong>{" "}
                  before the first date &mdash; by{" "}
                  <span className="fig font-mono">
                    {formatDayLong(deadline)}
                  </span>{" "}
                  &mdash; for a full refund. After that the place is held for
                  you across every date in the run.
                </p>
              ) : (
                <p className="mt-3 text-[17px] leading-relaxed text-ink">
                  A place on this run will not be refundable once it is taken.
                  That is said here rather than found out later.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
