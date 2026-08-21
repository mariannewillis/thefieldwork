import "server-only";
import { CANONICAL_SITE_URL } from "@/content/site";
import { prisma } from "@/lib/db";
import { formatDayLong, formatDuration, formatMoney } from "@/lib/format";

/**
 * A FLYER, RESOLVED — the offering, with whatever she has changed on top.
 *
 * THE OFFERING IS THE DEFAULT AND THE ROW IS THE EXCEPTION, which is the same
 * arrangement the pages panel uses and it is the whole reason a flyer is worth
 * automating. She fills in a workshop once; the flyer is already written. She
 * renames the workshop and the flyer is renamed with it. Only the lines she has
 * deliberately rewritten stop following, and only those.
 *
 * NOTHING HERE INVENTS COPY. Every default is either a field of the offering or
 * a sentence the SITE already says in her voice — the footnote is the services
 * page's own reassurance, verbatim. A flyer that made up a strapline would be
 * putting words in her mouth on a piece of paper she hands to people.
 *
 * THE THREE KINDS DIFFER IN EXACTLY ONE PLACE: when it is. A workshop is a day
 * and two times. A course is a run of dates, so it says the first and how many
 * there are. A service has no date at all — it is arranged — so it says how
 * long it lasts instead. Everything else about the sheet is the same, and that
 * is why there is one composition rather than three.
 */

export type FlyerKind = "workshop" | "course" | "service";

export type ResolvedFlyer = {
  kind: FlyerKind;
  slug: string;

  /** The four lines, resolved. */
  eyebrow: string;
  headline: string;
  blurb: string;
  footnote: string;

  /** When it is, in two lines — the second may be empty. */
  when: string;
  hours: string;

  /** Where it is. */
  venue: string;
  address: string;

  /** The two facts in the clearing. */
  room: string;
  roomNote: string;
  price: string;

  /**
   * THE PHOTOGRAPH BEHIND EVERYTHING, and whether there is one at all.
   *
   * It is not one of the pictures she chooses — it is the ground they sit on —
   * so it has its own switch (operator, 2026-08-21). Off gives a plum sheet,
   * which is the right answer for a flyer that is mostly photographs already.
   */
  ground: string | null;
  showGround: boolean;
  groundFocus: number;

  /**
   * THE PICTURES ON THE SHEET, in the order she picked them, however many.
   *
   * How they are ARRANGED is the composition's decision and lives in
   * `flyer.css`; how many there are is hers.
   */
  pictures: string[];

  /** What the QR points at, and what is printed under it. */
  url: string;

  /** True while every field is still the offering's own. */
  untouched: boolean;

  /**
   * WHAT THE OFFERING ITSELF SAYS, carried alongside the resolved values.
   *
   * The editor needs both to tell "she typed something different" from "she
   * typed the same thing" — and the second must be stored as NO override, so
   * that renaming the workshop later still carries through to the flyer.
   *
   * Resolved here rather than worked out again in the panel, because the rule
   * for what a default IS belongs in one place. A second derivation is how the
   * two come to disagree about what "unchanged" means.
   */
  ownEyebrow: string;
  ownHeadline: string;
  ownBlurb: string;
  ownFootnote: string;
  ownGround: string | null;
  /** The two the sheet would show if she had chosen none. */
  ownPictures: string[];

  /**
   * EVERY PICTURE ON THIS OFFERING — its hero and its gallery, in order.
   *
   * The flyer's pickers offer THESE and not the whole media library. A course
   * with twelve pictures had her hunting its twelve among the site's thirty to
   * choose the three that go on its flyer, which is backwards: a flyer for a
   * course is made of that course's pictures, and one she wants that is not on
   * it yet belongs on the course first — where it does the page some good too
   * (operator, 2026-08-21).
   */
  gallery: string[];
};

/**
 * The sentence the services page opens with, which is the truest short thing
 * this practice says about itself. It is the flyer's footnote until she writes
 * her own, and it is quoted rather than paraphrased.
 */
const REASSURANCE =
  "You stay clothed and seated throughout, nobody touches you, and nothing is asked of your beliefs.";

/** "A workshop · Frome" — the kind, and the town, from the venue's own lines. */
function eyebrowFor(kind: FlyerKind, addressLines: string | null): string {
  const word =
    kind === "workshop"
      ? "A workshop"
      : kind === "course"
        ? "A course"
        : "One to one";
  // The town is the SECOND line of an address written the way she writes it
  // (street, town, county). A one-line address has no town in it to find, and
  // saying "A workshop ·" with nothing after the dot is worse than not saying it.
  const town = (addressLines ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[1];
  return town ? `${word} · ${town}` : word;
}

/**
 * "£40", and "By arrangement" where a price is not a number on a page.
 *
 * `formatMoney` and not a second sum: the flyer and the page it points at must
 * never disagree about a price, and the way to guarantee that is to use the one
 * function that formats every price in this application.
 */
function priceWords(pence: number | null): string {
  if (pence === null || pence <= 0) return "By arrangement";
  return formatMoney(pence);
}

/** "A group of ten" — a fact about the workshop, never a count of what is left. */
const NUMBERS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
function groupWords(capacity: number): string {
  const word = NUMBERS[capacity] ?? String(capacity);
  return `A group of ${word}`;
}

export async function readFlyer(
  kind: FlyerKind,
  slug: string,
): Promise<ResolvedFlyer | null> {
  if (kind === "workshop") {
    const workshop = await prisma.workshop.findUnique({
      where: { slug },
      include: {
        flyer: true,
        images: { orderBy: [{ position: "asc" }, { id: "asc" }] },
      },
    });
    if (!workshop) return null;
    return resolve({
      kind,
      slug,
      row: workshop.flyer,
      name: workshop.name,
      summary: workshop.summary,
      addressLines: workshop.addressLines,
      venueName: workshop.venueName,
      postcode: workshop.postcode,
      gettingThere: workshop.gettingThere,
      hero: workshop.heroImage,
      gallery: workshop.images.map((image) => image.url),
      when: formatDayLong(workshop.date),
      hours: `${workshop.startTime} – ${workshop.endTime}`,
      room: groupWords(workshop.capacity),
      price: priceWords(workshop.priceGBP),
    });
  }

  if (kind === "course") {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        flyer: true,
        images: { orderBy: [{ position: "asc" }, { id: "asc" }] },
        sessions: { orderBy: [{ date: "asc" }] },
      },
    });
    if (!course) return null;
    const first = course.sessions[0];
    const count = course.sessions.length;
    return resolve({
      kind,
      slug,
      row: course.flyer,
      name: course.name,
      summary: course.summary,
      addressLines: course.addressLines,
      venueName: course.venueName,
      postcode: course.postcode,
      gettingThere: course.gettingThere,
      hero: course.heroImage,
      gallery: course.images.map((image) => image.url),
      // THE FIRST DATE AND HOW MANY THERE ARE. A flyer cannot hold six dates
      // legibly at the size the date has to be read at, and the page it points
      // at holds all of them — which is what the QR is for.
      when: first ? formatDayLong(first.date) : "Dates to be arranged",
      hours: first
        ? count > 1
          ? `${first.startTime} – ${first.endTime} · ${count} sessions`
          : `${first.startTime} – ${first.endTime}`
        : "",
      room: groupWords(course.capacity),
      price: priceWords(course.priceGBP),
    });
  }

  const service = await prisma.service.findUnique({
    where: { slug },
    include: {
      flyer: true,
      images: { orderBy: [{ position: "asc" }, { id: "asc" }] },
    },
  });
  if (!service) return null;
  return resolve({
    kind,
    slug,
    row: service.flyer,
    name: service.name,
    summary: service.summary,
    addressLines: service.addressLines,
    venueName: service.venueName,
    postcode: service.postcode,
    gettingThere: service.gettingThere,
    hero: service.heroImage,
    gallery: service.images.map((image) => image.url),
    // A SERVICE HAS NO DATE, and this is the one place the three kinds part.
    // What goes where the date goes is how long it lasts, because that is the
    // fact somebody needs before they ask for one.
    when: formatDuration(service.durationMinutes),
    hours: "By arrangement",
    room: "One person at a time",
    price: priceWords(service.priceGBP),
  });
}

type Source = {
  kind: FlyerKind;
  slug: string;
  row: {
    eyebrow: string | null;
    headline: string | null;
    blurb: string | null;
    footnote: string | null;
    groundRef: string | null;
    showGround: boolean;
    pictures: string[];
    groundFocus: number;
  } | null;
  name: string;
  summary: string;
  addressLines: string | null;
  venueName: string | null;
  postcode: string | null;
  gettingThere: string | null;
  hero: string | null;
  gallery: string[];
  when: string;
  hours: string;
  room: string;
  price: string;
};

function resolve(source: Source): ResolvedFlyer {
  const row = source.row;

  const ground = row?.groundRef ?? source.hero;

  /**
   * WHAT IS ON THE SHEET WHEN SHE HAS NOT SAID.
   *
   * The gallery's first two that are not already the ground — showing the same
   * photograph twice on one sheet is a mistake this saves her from making
   * without her having to notice it.
   *
   * TWO, because two is what the composition was designed around and a flyer
   * she has never opened should look like the one that was agreed. Once she
   * opens it, `pictures` is authoritative INCLUDING when it is empty: an empty
   * list means she took them all off, which is a real thing to want and not the
   * same as never having chosen.
   */
  const ownRest = source.gallery.filter((ref) => ref !== source.hero);
  const defaults = source.gallery.filter((ref) => ref !== ground).slice(0, 2);
  const pictures = row ? row.pictures : defaults;

  const address = [
    ...(source.addressLines ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    source.postcode ?? "",
  ]
    .filter(Boolean)
    .join(", ");

  // THE FIRST LINE ONLY. `gettingThere` is five sentences on the page, where
  // there is room for five; a flyer gets the one that answers the question that
  // actually stops people coming.
  const roomNote =
    (source.gettingThere ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0] ?? "";

  const ownEyebrow = eyebrowFor(source.kind, source.addressLines);

  return {
    kind: source.kind,
    slug: source.slug,
    eyebrow: row?.eyebrow ?? ownEyebrow,
    headline: row?.headline ?? source.name,
    blurb: row?.blurb ?? source.summary,
    footnote: row?.footnote ?? REASSURANCE,
    when: source.when,
    hours: source.hours,
    venue: source.venueName ?? "",
    address,
    room: source.room,
    roomNote,
    price: source.price,
    ground,
    showGround: row?.showGround ?? true,
    groundFocus: row?.groundFocus ?? 38,
    pictures,
    // ALWAYS THE CANONICAL DOMAIN, never `SITE_URL`. A flyer is printed and
    // handed to somebody: a QR that resolved to `localhost:3000` because it was
    // made on her laptop is a piece of paper that does not work, and unlike a
    // web page there is no fixing it after it is in a hand.
    url: `${CANONICAL_SITE_URL}/${source.kind}s/${source.slug}`,
    untouched: row === null,

    ownEyebrow,
    ownHeadline: source.name,
    ownBlurb: source.summary,
    ownFootnote: REASSURANCE,
    ownGround: source.hero,
    // Worked out against the offering's OWN hero, so "her own two" means the
    // pair the sheet would show if she had changed nothing at all.
    ownPictures: ownRest.slice(0, 2),

    // Hero first, because it is the one she chose to lead with, then the rail
    // in her order. Deduped: the hero is usually the first of the gallery too,
    // and offering the same photograph twice in a picker is a picker that
    // looks broken.
    gallery: [
      ...(source.hero ? [source.hero] : []),
      ...source.gallery.filter((ref) => ref !== source.hero),
    ],
  };
}

/** The offering's row id, for writing against. Null if it is not there. */
export async function flyerOwner(
  kind: FlyerKind,
  slug: string,
): Promise<number | null> {
  const where = { where: { slug }, select: { id: true } };
  const row =
    kind === "workshop"
      ? await prisma.workshop.findUnique(where)
      : kind === "course"
        ? await prisma.course.findUnique(where)
        : await prisma.service.findUnique(where);
  return row?.id ?? null;
}
