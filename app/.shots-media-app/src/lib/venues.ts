import "server-only";
import { prisma } from "@/lib/db";

/**
 * Places she has used before.
 *
 * The read side, like `lib/workshops.ts` — what WRITES a place lives beside
 * the form it is saved from (`app/(admin)/admin/offerings/actions.ts`), so the
 * rule and the field it governs stay readable together.
 *
 * A place is only ever copied into a workshop's own address fields. Nothing
 * here is read by a public page, which is why editing one of these cannot
 * change a workshop that has already gone out (see the schema comment on
 * Venue).
 */

/** The four things a place fills in, plus the id that says which one it was. */
export type VenueChoice = {
  id: number;
  name: string;
  addressLines: string;
  postcode: string;
  gettingThere: string;
};

/**
 * The Garden Room, as the approved workshop page already gives it
 * (docs/screens/webapp/workshop-detail.html). It is where almost everything
 * happens, so an empty list on the first workshop would mean typing the one
 * address the site already knows.
 */
const THE_GARDEN_ROOM = {
  name: "The Garden Room",
  addressLines: "Fromefield\nFrome\nSomerset",
  postcode: "BA11 2QN",
  gettingThere: [
    "The room is on the ground floor, and it is step-free from the pavement to the chair you sit in.",
    "There is an accessible toilet on the same floor.",
    "There is parking on Fromefield, two minutes' walk away.",
    "It is eight minutes on foot from the market place, uphill on the way here.",
    "The buses along Bath Road stop at the top of Fromefield.",
  ].join("\n"),
};

/**
 * Runs once per process. Two requests arriving together — which is exactly
 * what a page and its refresh do — would otherwise both find the table empty
 * and both fill it, and the first thing she saw would be The Garden Room
 * listed twice. Observed, not imagined.
 */
let seeding: Promise<void> | null = null;

/**
 * Puts The Garden Room there the first time anyone looks, and never again.
 *
 * The test is whether the table is EMPTY, not whether a row of that name
 * exists: she can rename it, correct the address, or replace it with somewhere
 * else entirely, and none of that should make a second copy appear the next
 * time the form is opened. Same intent as `ensureSeeded` in lib/auth/users.ts
 * — seed what is missing, then leave her decisions alone.
 *
 * Counting and inserting are one serializable transaction, so two processes
 * racing end with one row rather than two: the loser is refused by Postgres,
 * and being refused because somebody else already did it is success here.
 */
function ensureSeededVenues(): Promise<void> {
  seeding ??= prisma
    .$transaction(
      async (tx) => {
        if ((await tx.venue.count()) > 0) return;
        await tx.venue.create({ data: THE_GARDEN_ROOM });
      },
      { isolationLevel: "Serializable" },
    )
    .catch(() => {
      // Lost the race, or the database is unwell. Either way the read below
      // is the one that should report it — this is only a convenience.
      seeding = null;
    });
  return seeding;
}

/** What the form offers, in the order it offers them. */
export async function listVenues(): Promise<VenueChoice[]> {
  await ensureSeededVenues();
  return prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      addressLines: true,
      postcode: true,
      gettingThere: true,
    },
  });
}
