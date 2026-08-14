import "server-only";
import { prisma } from "@/lib/db";
import { describeFilm, posterBasename, type Film } from "@/lib/film";
import { ingestImageFromUrl } from "@/lib/media";
import { MAX_IMAGES } from "@/lib/offering-rules";

/**
 * The checks and conversions both offering forms make.
 *
 * A workshop and a course ask the same questions about money, clock times,
 * places and pictures, and they have to give the same answers — the same
 * pounds-to-pence rule, the same "that ends before it starts", the same
 * refusal of a picture with nothing said about it. Two copies would agree on
 * the day they were written and drift afterwards, and the one nobody was
 * looking at would be the one on the site.
 *
 * What is NOT here is anything that names a field. Which fields exist, what is
 * required, and what the message says when one is missing all belong beside
 * the form they are submitted from, because the rule and the field it governs
 * should be readable in one sitting.
 *
 * These lived in `app/(admin)/admin/offerings/actions.ts` while workshops were
 * the only offering there was. They cannot stay there now: a `"use server"`
 * module may export nothing but async functions.
 */

/** Every string the form posts, kept so a rejected submission can be redrawn. */
export function collectValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/**
 * Pounds as she types them → pence as we store them.
 *
 * Accepts "95", "£95", "95.50" and "1,250". Returns null for anything else,
 * including the empty string — the caller decides whether that is an error,
 * because a missing price and a price of "ninety-five" want different words.
 */
export function parsePence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function parseWholeNumber(input: string, min: number): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return value < min ? null : value;
}

/** "10:00" — the only shape an `<input type="time">` posts. */
export function isTime(input: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input);
}

/**
 * The pictures on the rail, read out of the form.
 *
 * Rows are posted as `image-url-<n>` / `image-alt-<n>`, where <n> identifies
 * the row in the rendered list rather than a database id, and the numbers are
 * not necessarily contiguous — the form drops a row she takes off rather than
 * marking it. Position is the order the rows arrive in, which is DOM order, so
 * a gap in the numbering never becomes a gap on the page.
 */
export function collectImages(formData: FormData): {
  images: { url: string; alt: string; position: number }[];
  errors: Record<string, string>;
} {
  const images: { url: string; alt: string; position: number }[] = [];
  const errors: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("image-url-") || typeof value !== "string") continue;
    const row = key.slice("image-url-".length);
    const url = value.trim();
    if (!url) continue;

    const alt = String(formData.get(`image-alt-${row}`) ?? "").trim();
    if (!alt) {
      errors[`image-alt-${row}`] =
        "Say what is in this one, the way you would describe it to someone on the phone. No picture goes on the site without a line saying what is in it.";
      continue;
    }
    images.push({ url, alt, position: images.length });
  }

  if (images.length > MAX_IMAGES) {
    errors["images"] =
      `Twelve pictures is as many as a page carries well — past that people stop scrolling and the last ones are never seen. This one has ${images.length}.`;
  }

  return { images, errors };
}

/**
 * Which saved place this offering's address came from, if any.
 *
 * Two ways it gets one: she picked a place and left the four fields as it
 * filled them, so the form posts its id — or she typed somewhere new and left
 * "Remember this place" ticked, so it is saved here. Either way the four
 * fields are what the page renders and this only records where they came from.
 *
 * A place already saved is never rewritten from here. If the name matches one
 * that exists, that one is used as it stands: "remember this place" is not
 * "and change the one I remembered before", and the address of somewhere she
 * has used ten times should not move because of one workshop's typing.
 */
export async function resolveVenue(
  chosen: string | undefined,
  remember: boolean,
  place: {
    venueName: string;
    addressLines: string;
    postcode: string;
    gettingThere: string;
  },
): Promise<number | null> {
  const chosenId = Number(chosen);
  if (Number.isInteger(chosenId) && chosenId > 0) {
    // It could have been deleted since the form was drawn. A stale id is not
    // worth failing a save over — the address itself is posted with it.
    const exists = await prisma.venue.findUnique({ where: { id: chosenId } });
    if (exists) return exists.id;
  }

  if (!remember || !place.venueName) return null;

  const already = await prisma.venue.findFirst({
    where: { name: { equals: place.venueName, mode: "insensitive" } },
  });
  if (already) return already.id;

  const saved = await prisma.venue.create({
    data: {
      name: place.venueName,
      addressLines: place.addressLines,
      postcode: place.postcode,
      gettingThere: place.gettingThere,
    },
  });
  return saved.id;
}

/**
 * The still a film opens on, and how long it runs.
 *
 * NEITHER IS HERS TO TYPE. They belong to the film, the provider already
 * knows both, and a duration she typed by hand is a figure with no source
 * behind it — which is the same rule D-9 applies to everything else in the
 * portal. So the form asks for the link and this fetches the rest.
 *
 * The still is FETCHED AND RE-ENCODED rather than linked to. A page carrying
 * an `<img>` pointed at Vimeo's servers would tell Vimeo who is reading it
 * before anybody pressed play, which is precisely what the click-to-load
 * player on the public page exists to prevent — the still is the click
 * target, so a hotlinked one would defeat it on the way in.
 *
 * Asked once, when the link changes. Re-saving an offering whose film is the
 * same does not go out to the internet again.
 *
 * It can never stop a save. A private film, a provider having a bad morning,
 * or no outbound network at all leaves both null, and the page shows a plain
 * plate to press instead of a photograph.
 */
export async function resolveFilm(
  film: Film | null,
  previous: {
    filmUrl: string | null;
    filmPoster: string | null;
    filmDuration: string | null;
  } | null,
): Promise<{ poster: string | null; duration: string | null }> {
  if (!film) return { poster: null, duration: null };

  const unchanged =
    previous?.filmUrl === film.watchUrl && previous.filmPoster !== null;
  if (unchanged) {
    return { poster: previous.filmPoster, duration: previous.filmDuration };
  }

  const details = await describeFilm(film);
  if (!details.posterUrl) return { poster: null, duration: details.duration };

  const still = await ingestImageFromUrl(details.posterUrl, posterBasename(film));
  return {
    poster: still.ok ? still.basename : null,
    duration: details.duration,
  };
}
