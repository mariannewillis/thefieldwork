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
