import "server-only";
import { HOME_LEDGER_LIMIT, type LedgerRow } from "@/content/home";
import { capitalise, runShape } from "@/lib/course-run";
import { listPublishedCourses } from "@/lib/courses";
import { formatDayShort, formatDuration, formatMoney } from "@/lib/format";
import {
  listPublishedServices,
  placeInOneLine,
  servicePlace,
} from "@/lib/services";
import { listWorkshopLedgerRows } from "@/lib/workshops";

/**
 * The schedule beat's three columns.
 *
 * ALL THREE ARE DERIVED: every row comes from what is published in Offerings,
 * so anything she puts up appears here as well as on its own index — and,
 * more to the point, nothing appears here that is not on the site. The seeded
 * rows this replaced named nine offerings that had never existed, and every one
 * of their links was a 404.
 *
 * Lifted out of the page component when the editor arrived, because the editor
 * renders the same beat and must show the same rows. Two derivations of one
 * block is how the preview and the page start disagreeing.
 *
 * THREE OF EACH, AND THE PICTURE SHE ALREADY CHOSE (operator, 2026-08-19). The
 * cap is applied HERE rather than in the three queries, so each column is still
 * ordered the way its own index orders it and the three shown are the next
 * three rather than an arbitrary three. The picture is `heroImage` — the same
 * one the Offerings screen shows — so there is nothing extra for her to set and
 * nothing that can fall out of step with the portal.
 */
export async function homeLedger(): Promise<
  Record<string, readonly LedgerRow[]>
> {
  const [workshops, courses, services] = await Promise.all([
    listWorkshopLedgerRows(),
    listPublishedCourses(),
    listPublishedServices(),
  ]);

  // WHAT EACH ROW LEADS WITH IS WHAT THAT KIND IS DECIDED ON — a workshop by
  // its date, a course by the shape of its run, a service by how long it takes.
  const workshopRows: LedgerRow[] = workshops.map((workshop) => ({
    href: `/workshops/${workshop.slug}`,
    image: workshop.heroImage,
    imageAlt: workshop.heroAlt ?? workshop.name,
    date: formatDayShort(workshop.date),
    price: formatMoney(workshop.priceGBP),
    title: workshop.name,
    meta: [
      `${workshop.startTime}${workshop.endTime ? `–${workshop.endTime}` : ""}`,
      workshop.venueName,
      `${workshop.capacity} places`,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  // A run that has finished is not "on", so it is not in a block headed "what
  // is on". The courses index keeps its own archive; this is a sample of what
  // somebody can still join.
  const courseRows: LedgerRow[] = courses
    .filter((course) => !runShape(course.sessions)?.finished)
    .map((course) => {
      const run = runShape(course.sessions);
      return {
        href: `/courses/${course.slug}`,
        image: course.heroImage,
        imageAlt: course.heroAlt ?? course.name,
        // The SPAN, not a single date — a course is decided on as a whole.
        date: run ? run.span : "Dates to come",
        price: formatMoney(course.priceGBP),
        title: course.name,
        meta: [
          run && capitalise(run.words),
          run?.hours,
          course.venueName,
          `${course.capacity} places`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    });

  // No date and no capacity, so the two columns a workshop fills with those
  // carry the two facts a service actually has: how long it lasts, and that
  // you ask for it rather than buying it.
  const serviceRows: LedgerRow[] = services.map((service) => ({
    href: `/services/${service.slug}`,
    image: service.heroImage,
    imageAlt: service.heroAlt ?? service.name,
    date: "By arrangement",
    price: formatMoney(service.priceGBP),
    title: service.name,
    meta: [
      formatDuration(service.durationMinutes),
      placeInOneLine(servicePlace(service)),
    ].join(" · "),
  }));

  // The cap is the last thing done, so "the next three" means the next three in
  // each column's own order rather than the first three of some other one.
  const firstFew = (rows: LedgerRow[]) => rows.slice(0, HOME_LEDGER_LIMIT);

  return {
    Courses: firstFew(courseRows),
    Workshops: firstFew(workshopRows),
    Services: firstFew(serviceRows),
  };
}
