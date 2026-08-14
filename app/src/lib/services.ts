import "server-only";
import { prisma } from "@/lib/db";

/**
 * Reading services.
 *
 * The read side, as `lib/workshops.ts` and `lib/courses.ts` are for the other
 * two kinds — everything that WRITES one lives beside the form it is submitted
 * from (`app/(admin)/admin/offerings/services/actions.ts`).
 *
 * There is no date to order by and no run to read a span off, so the lists are
 * ordered by name: a service is a standing offer rather than something in the
 * diary, and the question asked of the list is "which one is this?" rather
 * than "what is next?".
 */

/** A service with its rail — the only shape a page ever wants. */
export type ServiceWithImages = NonNullable<
  Awaited<ReturnType<typeof getServiceBySlug>>
>;

/**
 * Everything, including what is not on the site yet — the portal's list. One
 * she is still writing is the one she most needs to be able to find.
 */
export function listAllServices() {
  return prisma.service.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { images: true } } },
  });
}

/** For the portal — reachable whether or not it is on the site. */
export function getServiceBySlug(slug: string) {
  return prisma.service.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" } } },
  });
}
