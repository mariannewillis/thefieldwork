import "server-only";
import type { LedgerRow } from "@/content/home";
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
    date: "By arrangement",
    price: formatMoney(service.priceGBP),
    title: service.name,
    meta: [
      formatDuration(service.durationMinutes),
      placeInOneLine(servicePlace(service)),
    ].join(" · "),
  }));

  return {
    Courses: courseRows,
    Workshops: workshopRows,
    Services: serviceRows,
  };
}
