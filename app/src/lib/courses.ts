import "server-only";
import { prisma } from "@/lib/db";

/**
 * Reading courses.
 *
 * The read side, as `lib/workshops.ts` is for workshops — everything that
 * WRITES one lives beside the form it is submitted from
 * (`app/(admin)/admin/offerings/courses/actions.ts`).
 *
 * Every query here orders the dates by date, and there is no other order to
 * ask for. A course's run is a sequence because time is one; the record keeps
 * no opinion of its own about which date comes second (see the schema comment
 * on CourseSession).
 */

/** A course with its run and its rail — the only shape a page ever wants. */
export type CourseWithRun = NonNullable<
  Awaited<ReturnType<typeof getCourseBySlug>>
>;

const withRun = {
  sessions: { orderBy: { date: "asc" } },
  images: { orderBy: { position: "asc" } },
} as const;

/**
 * Everything, including what is not on the site yet — the portal's list. A
 * course she is still writing is the one she most needs to be able to find.
 *
 * Ordered by when it was written, because a course has no date of its own to
 * sort on: the run does. The rows carry their dates, and the list reads the
 * first and last off them.
 */
export function listAllCourses() {
  return prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { date: "asc" } },
      _count: { select: { images: true } },
    },
  });
}

/** For the portal — reachable whether or not it is on the site. */
export function getCourseBySlug(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: withRun,
  });
}

/**
 * The public index. Published only, and ordered by the date the run STARTS —
 * which is a fact about the sessions rather than about the course, so the sort
 * happens here rather than in the query. A course has no date of its own to
 * order by, and giving it one would be the sequence column D-21 refused.
 *
 * A published course always has at least one date; the form will not put one on
 * the site otherwise. One that has had every date taken off since sorts last
 * rather than throwing, and the page draws it with no run.
 */
export async function listPublishedCourses() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: withRun,
  });
  return courses.sort(
    (one, other) =>
      (one.sessions[0]?.date.getTime() ?? Infinity) -
      (other.sessions[0]?.date.getTime() ?? Infinity),
  );
}

/**
 * For the public page. Unpublished returns null and the page calls
 * `notFound()` — the same answer as an address that never existed, for the
 * reason `lib/workshops.ts` gives on its own version of this.
 */
export function getPublishedCourseBySlug(slug: string) {
  return prisma.course.findFirst({
    where: { slug, published: true },
    include: withRun,
  });
}
