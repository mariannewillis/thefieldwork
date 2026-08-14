import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { workshopsIndex } from "@/content/workshops";
import { placesLeft, placesSoldByWorkshop } from "@/lib/bookings";
import { formatDayShort, formatMoney, isPast } from "@/lib/format";
import { listPublishedWorkshops } from "@/lib/workshops";

/**
 * The workshops index.
 *
 * Ported from docs/screens/workshopflow/workshops-index.html, the approved
 * composition. The CSS is that file's stylesheet (workshops.css); what changed
 * is that the rows come from the database rather than being written into the
 * markup, and the frame around them comes from @/content/workshops so the
 * portal can edit it later (D-3).
 *
 * A list page has one job: let someone find the day that is theirs and see,
 * without clicking, whether it is still ahead. So the date, the place and the
 * price are carried on the row rather than discovered after a click.
 *
 * PLACES LEFT is on every row, as the approved screen has it. It is counted
 * from paid bookings — one grouped query for the whole list rather than one
 * per row — and a full day says so here rather than after a click. Past
 * workshops are kept, held back, because the archive is evidence the practice
 * is real.
 */

export const metadata: Metadata = {
  title: "Workshops — The Field Work",
  description: workshopsIndex.lede,
  alternates: { canonical: "/workshops" },
};

type Workshop = Awaited<ReturnType<typeof listPublishedWorkshops>>[number];

function ComingRow({ workshop, left }: { workshop: Workshop; left: number }) {
  return (
    <article className="card py-9">
      <a
        href={`/workshops/${workshop.slug}`}
        className="group grid gap-6 md:grid-cols-[128px_150px_1fr_auto] md:items-start md:gap-8"
      >
        <p className="fig font-mono text-[17px] text-gold">
          {formatDayShort(workshop.date)}
          <br />
          <span className="text-plate-rule">
            {workshop.startTime}
            {workshop.endTime ? `–${workshop.endTime}` : ""}
          </span>
        </p>

        {workshop.heroImage ? (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${workshop.heroImage}-1200.avif`}
            />
            <source
              type="image/webp"
              srcSet={`/media/${workshop.heroImage}-1200.webp`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${workshop.heroImage}-1200.jpg`}
              alt={workshop.heroAlt ?? ""}
              className="aspect-[4/5] w-full max-w-[150px] object-cover"
            />
          </picture>
        ) : (
          <span aria-hidden="true" />
        )}

        <div>
          <h3 className="card-title font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[38px]">
            {workshop.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[19px] leading-relaxed text-plate-soft">
            {workshop.summary}
          </p>
          <p className="mt-4 fig font-mono text-[16px] text-plate-rule">
            {workshop.venueName}
          </p>
        </div>

        <p className="fig font-mono text-[19px] text-plate-text md:text-right">
          {formatMoney(workshop.priceGBP)}
          <br />
          {/* Held back to plate-rule when it is full: a row nobody can buy
              should not be the brightest thing in the list. */}
          <span
            className={`text-[16px] ${left === 0 ? "text-plate-rule" : "text-gold"}`}
          >
            {left === workshop.capacity
              ? `${workshop.capacity} places`
              : left === 0
                ? "Full"
                : `${left} of ${workshop.capacity} places left`}
          </span>
        </p>
      </a>
    </article>
  );
}

export default async function Page() {
  const workshops = await listPublishedWorkshops();
  const coming = workshops.filter((workshop) => !isPast(workshop.date));
  // One query for every row's count, not one per row.
  const sold = await placesSoldByWorkshop(coming.map((w) => w.id));
  const past = workshops.filter((workshop) => isPast(workshop.date)).reverse();

  return (
    <>
      {/* The whole circle of chairs — the promise of the page. Decorative, so
          it carries no alt and is hidden from assistive tech. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${workshopsIndex.plate.src}-2400.jpg`}
        alt=""
        aria-hidden="true"
        className="page-field"
      />
      <div className="page-scrim" aria-hidden="true" />

      <a
        href="#list"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to the workshops
      </a>

      <header className="mx-auto max-w-[1180px] px-6 lg:px-10">
        <SiteNav />

        <div className="max-w-[54ch] pb-14 pt-8 lg:pb-20 lg:pt-14">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
            {workshopsIndex.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[46px] font-normal leading-[1.03] text-plate-text sm:text-[60px]">
            {workshopsIndex.title}
          </h1>
          <p className="mt-6 text-[21px] leading-relaxed text-plate-soft">
            {workshopsIndex.lede}
          </p>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <section id="list" aria-labelledby="coming">
          <h2
            id="coming"
            className="fig font-mono text-[15px] uppercase tracking-[0.16em] text-plate-rule"
          >
            {workshopsIndex.comingUp}
          </h2>

          {coming.length > 0 ? (
            <div className="mt-8">
              {coming.map((workshop) => (
                <ComingRow
                  key={workshop.id}
                  workshop={workshop}
                  left={placesLeft(
                    workshop.capacity,
                    sold.get(workshop.id) ?? 0,
                  )}
                />
              ))}
            </div>
          ) : (
            /* A practitioner running three or four days a year WILL have
               stretches with nothing scheduled, and a page that simply ends is
               indistinguishable from one that is broken. */
            <div className="pool on-pool mt-8 max-w-[620px] px-8 py-9">
              <h3 className="font-display text-[32px] font-normal leading-tight text-ink">
                {workshopsIndex.empty.title}
              </h3>
              <p className="mt-4 text-[19px] leading-relaxed text-ink">
                {workshopsIndex.empty.body}
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
              {workshopsIndex.alreadyHappened}
            </h2>
            <div className="mt-8">
              {past.map((workshop) => (
                <article key={workshop.id} className="card card--past py-7">
                  <div className="grid gap-4 md:grid-cols-[128px_150px_1fr_auto] md:items-start md:gap-8">
                    <p className="fig font-mono text-[17px] text-plate-rule">
                      {formatDayShort(workshop.date)}
                    </p>
                    <span aria-hidden="true" />
                    <div>
                      <h3 className="font-display text-[28px] font-normal leading-tight text-plate-text">
                        {workshop.name}
                      </h3>
                      <p className="mt-2 fig font-mono text-[16px] text-plate-rule">
                        {workshop.venueName}
                      </p>
                    </div>
                    <p className="fig font-mono text-[16px] text-plate-rule md:text-right">
                      Finished
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
