import "server-only";
import { prisma } from "@/lib/db";
import { isPast } from "@/lib/format";

/**
 * Reading workshops.
 *
 * Everything that WRITES one lives beside the form it is submitted from
 * (`app/(admin)/admin/offerings/actions.ts`), because the validation and the
 * field it belongs to should be readable together. This file is the read side,
 * shared by four pages that must all agree what "coming up" means.
 *
 * The picture library used to be listed from here, back when pictures only
 * ever arrived from the build-time pipeline and a directory listing was the
 * whole truth. It is `lib/media` now — listing pictures and writing them are
 * the same question about the same store, and answering half of it here would
 * let the two disagree about where a photograph is kept.
 */

/** A workshop with its rail, which is the only shape any page ever wants. */
export type WorkshopWithImages = NonNullable<
  Awaited<ReturnType<typeof getWorkshopBySlug>>
>;

const withImages = {
  images: { orderBy: { position: "asc" } },
} as const;

/**
 * Everything, earliest first — the portal's list, which shows unpublished
 * workshops too. It has to: a workshop that is not on the site yet is the one
 * she is still writing, and hiding it in the portal would be hiding her own
 * work from her.
 */
export function listAllWorkshops() {
  return prisma.workshop.findMany({
    orderBy: { date: "asc" },
    include: { _count: { select: { images: true } } },
  });
}

/** The public index. Published only, earliest first. */
export function listPublishedWorkshops() {
  return prisma.workshop.findMany({
    where: { published: true },
    orderBy: { date: "asc" },
  });
}

/** For the portal — reachable whether or not it is on the site. */
export function getWorkshopBySlug(slug: string) {
  return prisma.workshop.findUnique({
    where: { slug },
    include: withImages,
  });
}

/**
 * For the public page. Unpublished returns null, and the page calls
 * `notFound()` — not a 403 and not a redirect. Someone who guesses the address
 * of a workshop she has taken down should get the same answer as someone who
 * guesses an address that never existed.
 */
export function getPublishedWorkshopBySlug(slug: string) {
  return prisma.workshop.findFirst({
    where: { slug, published: true },
    include: withImages,
  });
}

/**
 * The rows the home page's dates block shows under "Workshops".
 *
 * Published, still to come, earliest first — the same set the index shows, in
 * the ledger's own shape. Past workshops are left out here although the index
 * keeps them: the home page is a list of what you can still have.
 */
export async function listWorkshopLedgerRows() {
  const workshops = await prisma.workshop.findMany({
    where: { published: true },
    orderBy: { date: "asc" },
  });
  return workshops.filter((workshop) => !isPast(workshop.date));
}
