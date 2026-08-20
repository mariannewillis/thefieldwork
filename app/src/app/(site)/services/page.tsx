import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { servicesIndex } from "@/content/services";
import { formatDuration, formatMoney } from "@/lib/format";
import {
  listPublishedServices,
  placeInOneLine,
  servicePlace,
} from "@/lib/services";

/**
 * The services index.
 *
 * Ported from docs/screens/webapp/services-index.html, the approved
 * composition, the way the courses index ported its own: the CSS is that
 * file's stylesheet (workshops.css, reached through this route's layout), and
 * the rows come from the database rather than being written into the markup.
 *
 * WHAT A ROW LEADS WITH IS THE LENGTH, because that is what a service has
 * where the other two kinds have a date. A workshop row leads with "Sat 20
 * Sep" and a course row with "Four Wednesday evenings"; here the first thing
 * on the line is "60 minutes", and the approved screen's own promise — the
 * price is already on this page — is why the fee is on the row rather than
 * behind a click.
 *
 * THERE IS NO ARCHIVE AND NO PAST. A service is a standing offer rather than
 * something in the diary, so nothing here can have been and gone: the list is
 * simply what she offers, in name order (see lib/services.ts).
 */

export const metadata: Metadata = {
  title: "Sessions — The Field Work",
  description: servicesIndex.lede,
  alternates: { canonical: "/services" },
};

type Service = Awaited<ReturnType<typeof listPublishedServices>>[number];

function Row({ service }: { service: Service }) {
  const place = servicePlace(service);

  return (
    <article className="card py-9">
      <a
        href={`/services/${service.slug}`}
        className="group grid gap-6 md:grid-cols-[168px_150px_1fr_auto] md:items-start md:gap-8"
      >
        <p className="fig font-mono text-[17px] leading-[1.5] text-gold">
          {formatDuration(service.durationMinutes)}
          <br />
          {/* WHAT IT IS, where a workshop row prints its hours. There is no
              start time to print — a service has a length and the start is
              whatever she and the person agree on. */}
          <span className="text-plate-rule">one to one</span>
        </p>

        {service.heroImage ? (
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${service.heroImage}-1200.avif`}
            />
            <source
              type="image/webp"
              srcSet={`/media/${service.heroImage}-1200.webp`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${service.heroImage}-1200.jpg`}
              alt={service.heroAlt ?? ""}
              className="aspect-[4/5] w-full max-w-[150px] object-cover"
            />
          </picture>
        ) : (
          <span aria-hidden="true" />
        )}

        <div>
          <h3 className="card-title font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[38px]">
            {service.name}
          </h3>
          <p className="mt-3 max-w-[52ch] text-[19px] leading-relaxed text-plate-soft">
            {service.summary}
          </p>
          {/* ONE ANSWER ABOUT WHERE, never two. Either the room's name or the
              distance she travels — the record carries only one of them and
              the reading is done in lib/services.ts. */}
          <p className="mt-4 fig font-mono text-[16px] text-plate-rule">
            {placeInOneLine(place)}
          </p>
        </div>

        <p className="fig font-mono text-[19px] text-plate-text md:text-right">
          {formatMoney(service.priceGBP)}
          <br />
          {/* Where a workshop prints what the room holds. One-to-one means
              one, so there is no count to make — what this line says instead
              is the thing that is actually different about this kind: you ask
              for it rather than buying it. */}
          <span className="text-[16px] text-gold">by arrangement</span>
        </p>
      </a>
    </article>
  );
}

export default async function Page() {
  const services = await listPublishedServices();

  return (
    <>
      <PageField src={servicesIndex.plate.src} />

      <a
        href="#list"
        className="skip bg-gold px-5 py-3 text-[17px] font-semibold text-ink"
      >
        Skip to the sessions
      </a>

      <SiteNav current="/services" />

      {/* The masthead is full-bleed on the site's gutter, as on every page.
          This page's own words keep the 1180 measure. */}
      <div className="mx-auto max-w-[1180px] px-6 lg:px-10">
        {/* The paragraph runs the full measure of the table below it
            (operator, 2026-08-19), so the head and the list share one left and
            one right edge instead of the words stopping short of the rows they
            introduce. The heading keeps its own measure: a 60px display line
            set to 1180px is four or five words a line and reads as a banner. */}
        <div className="pb-14 pt-8 lg:pb-20 lg:pt-14">
          {/* THE GOLD LINE IS THE HEADING NOW (operator, 2026-08-19). The
              display title under it is gone, so the page is its label and one
              paragraph — but it is an `h1` rather than the `p` it was, because
              a page with no heading at all has no outline for a screen reader
              to move by and nothing for a search result to print. The name of
              the page still exists; it is just no longer set at 60px. */}
          <h1 className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-gold">
            {servicesIndex.eyebrow}
          </h1>
          <p className="mt-5 text-[21px] leading-relaxed text-plate-soft">
            {servicesIndex.lede}
          </p>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <section id="list" aria-labelledby="sessions">
          <h2
            id="sessions"
            className="fig font-mono text-[15px] uppercase tracking-[0.16em] text-plate-rule"
          >
            {servicesIndex.listHeading}
          </h2>

          {services.length > 0 ? (
            /* ONE PARAGRAPH ON THE PAGE, and it is the one at the top
               (operator, 2026-08-19). A second note between the section's
               label and its first row said in smaller type what the lede had
               already said, and pushed the rows down the page to say it. */
            <div className="mt-8">
              {services.map((service) => (
                <Row key={service.id} service={service} />
              ))}
            </div>
          ) : (
            /* Drawn deliberately. A page that simply ends is
               indistinguishable from one that is broken, and this list can be
               empty for an ordinary reason. */
            <div className="pool on-pool mt-8 max-w-[620px] px-8 py-9">
              <h3 className="font-display text-[32px] font-normal leading-tight text-ink">
                {servicesIndex.empty.title}
              </h3>
              <p className="mt-4 text-[19px] leading-relaxed text-ink">
                {servicesIndex.empty.body}
              </p>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
                {servicesIndex.empty.insteadBefore}{" "}
                <a
                  className="text-action underline decoration-action underline-offset-4"
                  href={servicesIndex.empty.insteadHref}
                >
                  {servicesIndex.empty.insteadLink}
                </a>
                {servicesIndex.empty.insteadAfter}
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
