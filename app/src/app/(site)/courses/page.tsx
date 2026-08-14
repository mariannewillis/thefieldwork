import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { coursesIndex } from "@/content/courses";
import {
  capitalise,
  formatDayInMonth,
  runShape,
  spellCount,
} from "@/lib/course-run";
import { listPublishedCourses } from "@/lib/courses";
import { formatMoney } from "@/lib/format";

/**
 * The courses index.
 *
 * Ported from docs/screens/courses flow/courses-index.html, the approved
 * composition, the way the workshops index ported its own: the CSS is that
 * file's stylesheet (workshops.css, reached through this route's layout), and
 * the rows come from the database rather than being written into the markup.
 *
 * WHAT A ROW CARRIES IS THE SHAPE OF THE COMMITMENT, not a date. A workshop row
 * leads with "Sat 20 Sep" because that is the whole question; a course row
 * leads with "Four Wednesday evenings · from 7 October", because somebody
 * scanning this page is deciding whether they can give a month of Wednesdays
 * before they care which Wednesdays. The price is framed for the whole run for
 * the same reason — there is no single-date ticket.
 *
 * Runs that have finished are kept, held back, as the workshops index keeps its
 * past days: on a page where a course appears twice a year it is also the
 * answer to "does this actually run, or is it always coming soon".
 */

export const metadata: Metadata = {
  title: "Courses — The Field Work",
  description: coursesIndex.lede,
  alternates: { canonical: "/courses" },
};

type Course = Awaited<ReturnType<typeof listPublishedCourses>>[number];

function ComingRow({ course }: { course: Course }) {
  const run = runShape(course.sessions);

  return (
    <article className="card py-9">
      <a
        href={`/courses/${course.slug}`}
        className="group grid gap-6 md:grid-cols-[168px_150px_1fr_auto] md:items-start md:gap-8"
      >
        <p className="fig font-mono text-[17px] leading-[1.5] text-gold">
          {run ? (
            <>
              {capitalise(run.words)}
              <br />
              <span className="text-plate-rule">
                {/* A run that has already started says so. "From 7 October"
                    on a course whose first evening was last week is a date
                    somebody would try to book. */}
                {run.underWay
                  ? `under way, to ${formatDayInMonth(run.last)}`
                  : `from ${formatDayInMonth(run.first)}`}
              </span>
            </>
          ) : (
            <span className="text-plate-rule">Dates to come</span>
          )}
        </p>

        {course.heroImage ? (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${course.heroImage}-1200.avif`}
            />
            <source
              type="image/webp"
              srcSet={`/media/${course.heroImage}-1200.webp`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${course.heroImage}-1200.jpg`}
              alt={course.heroAlt ?? ""}
              className="aspect-[4/5] w-full max-w-[150px] object-cover"
            />
          </picture>
        ) : (
          <span aria-hidden="true" />
        )}

        <div>
          <h3 className="card-title font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[38px]">
            {course.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[19px] leading-relaxed text-plate-soft">
            {course.summary}
          </p>
          <p className="mt-4 fig font-mono text-[16px] text-plate-rule">
            {/* The hours only when every date keeps the same ones. A run whose
                times vary has them on each date further in, and one line
                claiming 19:00–21:00 for all of them would be wrong about most. */}
            {[run?.hours, course.venueName].filter(Boolean).join(" · ")}
          </p>
        </div>

        <p className="fig font-mono text-[19px] text-plate-text md:text-right">
          {formatMoney(course.priceGBP)}
          <br />
          {/* "For all four", as the approved screen has it — but a run of two
              is "for both", because "for all two" is not a sentence anybody
              writes. */}
          <span className="text-[15px] text-plate-rule">
            {!run || run.count === 1
              ? "for the run"
              : run.count === 2
                ? "for both"
                : `for all ${spellCount(run.count)}`}
          </span>
          <br />
          {/* WHAT THE ROOM HOLDS, not what is left. Nothing books a course, so
              there are no bookings to count off the capacity, and a "places
              left" figure here would be invented. The workshops index prints
              this same sentence for a day nobody has booked yet. */}
          <span className="text-[16px] text-gold">
            {course.capacity} {course.capacity === 1 ? "place" : "places"}
          </span>
        </p>
      </a>
    </article>
  );
}

export default async function Page() {
  const courses = await listPublishedCourses();
  // A run belongs in the archive once its LAST date has been and gone — a
  // course halfway through is still a course that is running, and it stays up
  // where somebody who is on it can read what is next.
  const coming = courses.filter(
    (course) => !runShape(course.sessions)?.finished,
  );
  const past = courses
    .filter((course) => runShape(course.sessions)?.finished)
    .reverse();

  return (
    <>
      {/* The whole circle of chairs — the promise of the page. Decorative, so
          it carries no alt and is hidden from assistive tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${coursesIndex.plate.src}-2400.jpg`}
        alt=""
        aria-hidden="true"
        className="page-field"
      />
      <div className="page-scrim" aria-hidden="true" />

      <a
        href="#list"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to the courses
      </a>

      <header className="mx-auto max-w-[1180px] px-6 lg:px-10">
        <SiteNav current="/courses" />

        <div className="max-w-[54ch] pb-14 pt-8 lg:pb-20 lg:pt-14">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
            {coursesIndex.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[46px] font-normal leading-[1.03] text-plate-text sm:text-[60px]">
            {coursesIndex.title}
          </h1>
          <p className="mt-6 text-[21px] leading-relaxed text-plate-soft">
            {coursesIndex.lede}
          </p>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <section id="list" aria-labelledby="coming">
          <h2
            id="coming"
            className="fig font-mono text-[15px] uppercase tracking-[0.16em] text-plate-rule"
          >
            {coursesIndex.comingUp}
          </h2>

          {coming.length > 0 ? (
            <>
              <p className="mt-3 max-w-[52ch] text-[17px] leading-relaxed text-plate-soft">
                {coursesIndex.comingUpNote}
              </p>
              <div className="mt-8">
                {coming.map((course) => (
                  <ComingRow key={course.id} course={course} />
                ))}
              </div>
            </>
          ) : (
            /* The normal state, drawn deliberately. A course runs two or three
               times a year, so the months with nothing scheduled outnumber the
               months with something. */
            <div className="pool on-pool mt-8 max-w-[620px] px-8 py-9">
              <h3 className="font-display text-[32px] font-normal leading-tight text-ink">
                {coursesIndex.empty.title}
              </h3>
              <p className="mt-4 text-[19px] leading-relaxed text-ink">
                {coursesIndex.empty.body}
              </p>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
                {coursesIndex.empty.insteadBefore}{" "}
                <a
                  className="text-action underline decoration-action underline-offset-4"
                  href={coursesIndex.empty.insteadHref}
                >
                  {coursesIndex.empty.insteadLink}
                </a>
                {coursesIndex.empty.insteadAfter}
              </p>
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-24" aria-labelledby="past">
            <h2
              id="past"
              className="fig font-mono text-[15px] uppercase tracking-[0.16em] text-plate-rule"
            >
              {coursesIndex.alreadyRun}
            </h2>
            <div className="mt-8">
              {past.map((course) => {
                const run = runShape(course.sessions);
                return (
                  <article key={course.id} className="card card--past py-7">
                    <div className="grid gap-4 md:grid-cols-[168px_150px_1fr_auto] md:items-start md:gap-8">
                      <p className="fig font-mono text-[17px] leading-[1.5] text-plate-rule">
                        {run && (
                          <>
                            {capitalise(run.words)}
                            <br />
                            {run.span}
                          </>
                        )}
                      </p>
                      <span aria-hidden="true" />
                      <div>
                        <h3 className="font-display text-[28px] font-normal leading-tight text-plate-text">
                          {course.name}
                        </h3>
                        <p className="mt-2 fig font-mono text-[16px] text-plate-rule">
                          {course.venueName}
                        </p>
                      </div>
                      <p className="fig font-mono text-[16px] text-plate-rule md:text-right">
                        {coursesIndex.finished}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
