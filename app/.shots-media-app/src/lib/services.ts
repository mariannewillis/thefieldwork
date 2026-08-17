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

/**
 * The public index. Published only, and ordered by name for the reason above
 * — there is no date to sort on and nothing about a service is "next".
 *
 * The rail is left out: the index draws one thumbnail per row from
 * `heroImage`, so loading every service's stills to count them would be work
 * nothing on the page reads.
 */
export function listPublishedServices() {
  return prisma.service.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
  });
}

/**
 * For the public page. Unpublished returns null and the page calls
 * `notFound()` — the same answer as an address that never existed, for the
 * reason `lib/workshops.ts` gives on its own version of this.
 */
export function getPublishedServiceBySlug(slug: string) {
  return prisma.service.findFirst({
    where: { slug, published: true },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

/**
 * Where it happens, as ONE answer rather than two half-filled ones.
 *
 * The record carries both branches as nullable columns and a `location`
 * column saying which is live (see the schema note on ServiceLocation). Every
 * surface that prints an address has to read that same branch, so the reading
 * is done once, here, and the pages get a shape they cannot get wrong: a page
 * that renders `place.kind === "venue"` cannot accidentally print a travel
 * radius, because on that branch there isn't one.
 */
export type ServicePlace =
  | {
      kind: "venue";
      venueName: string;
      addressLines: string[];
      postcode: string;
      gettingThere: string[];
    }
  | {
      kind: "travels";
      addressLines: string[];
      postcode: string;
      radiusMiles: number | null;
      note: string | null;
    };

/** One line per line, as typed, with the blanks dropped. */
function lines(value: string | null): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function servicePlace(service: {
  location: "venue" | "travels";
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
  gettingThere: string | null;
  baseAddressLines: string | null;
  basePostcode: string | null;
  travelRadiusMiles: number | null;
  travelNote: string | null;
}): ServicePlace {
  if (service.location === "travels") {
    return {
      kind: "travels",
      addressLines: lines(service.baseAddressLines),
      postcode: (service.basePostcode ?? "").trim(),
      radiusMiles: service.travelRadiusMiles,
      note: service.travelNote?.trim() || null,
    };
  }
  return {
    kind: "venue",
    venueName: (service.venueName ?? "").trim(),
    addressLines: lines(service.addressLines),
    postcode: (service.postcode ?? "").trim(),
    gettingThere: lines(service.gettingThere),
  };
}

/**
 * Where it happens, in the one line a list row has room for.
 *
 * "The garden room" at a venue; "She travels, up to 15 miles from BA11 1AA"
 * when she goes to them. Never both, and never a blank — a service she has not
 * set a place on yet says so rather than printing an empty column.
 */
export function placeInOneLine(place: ServicePlace): string {
  if (place.kind === "venue") return place.venueName || "Place to be set";
  const miles =
    place.radiusMiles === null
      ? null
      : `up to ${place.radiusMiles} ${place.radiusMiles === 1 ? "mile" : "miles"}`;
  const from = place.postcode ? `from ${place.postcode}` : null;
  const reach = [miles, from].filter(Boolean).join(" ");
  return reach ? `She travels, ${reach}` : "She travels to you";
}
