"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { parseFilm, type Film } from "@/lib/film";
import { ingestImage, MAX_UPLOAD_BYTES } from "@/lib/media";
import {
  collectImages,
  collectValues,
  isTime,
  parsePence,
  parseWholeNumber,
  resolveFilm,
  resolveVenue,
} from "@/lib/offering-form";
import { toHtml } from "@/lib/rich-text";
import { slugify, type OfferingFormState } from "@/lib/offering-rules";

/**
 * Writing a workshop.
 *
 * Co-located with the form it is submitted from, so a rule and the field it
 * governs can be read in one sitting. Everything is checked HERE, on the
 * server: the browser's own `required` and `type="number"` are a courtesy that
 * saves a round trip, and a form posted without them has to be refused just
 * the same.
 *
 * Errors come back keyed by field name and are drawn beside the field, never
 * as a banner that scrolls away. Nothing is written until every check passes,
 * so a form that fails leaves the site exactly as it was.
 */

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  const session = await getSession();
  // The admin layout already turned away anyone without one, but a server
  // action is a POST endpoint of its own: it can be called directly, and it
  // does not inherit the layout's check.
  if (!session) redirect("/admin/login");
  return session;
}

export type PictureAdded =
  { ok: true; basename: string } | { ok: false; error: string };

/**
 * A picture, off her computer.
 *
 * It goes up the moment she chooses it, on its own, rather than riding with
 * the rest of the form when she saves. Three reasons, in order of how much
 * they matter: a save that bounces on a missing summary must not also throw
 * away eight megabytes she waited for; the picture has to be VISIBLE in the
 * form before she can write the line saying what is in it; and a form posting
 * twelve photographs at once is a form that times out.
 *
 * Nothing about the file is trusted. `ingestImage` refuses anything whose
 * first bytes are not a picture, re-encodes what is left into the six
 * derivatives the site serves (D-6, §13), and names them itself — the name
 * this file arrived with never becomes a path.
 */
export async function addPicture(formData: FormData): Promise<PictureAdded> {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No picture arrived. Try choosing it again." };
  }
  // Checked before the bytes are read into memory as well as after, because
  // reading a 300 MB file in order to tell her it is too big is the failure
  // the limit exists to prevent.
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That picture is ${Math.round(file.size / 1048576)} MB, and ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB is as much as this takes.`,
    };
  }

  return ingestImage({
    bytes: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    declaredType: file.type,
  });
}

/** The name this form knows it by. The shape is every offering form's. */
export type WorkshopFormState = OfferingFormState;

export async function saveWorkshop(
  prev: WorkshopFormState,
  formData: FormData,
): Promise<WorkshopFormState> {
  await requireSession();

  const values = collectValues(formData);
  const errors: Record<string, string> = {};

  const id = values.id ? Number(values.id) : null;
  const name = (values.name ?? "").trim();
  const summary = (values.summary ?? "").trim();
  const bodySource = (values.body ?? "").trim();
  const date = (values.date ?? "").trim();
  const startTime = (values.startTime ?? "").trim();
  const endTime = (values.endTime ?? "").trim();
  const venueName = (values.venueName ?? "").trim();
  const addressLines = (values.addressLines ?? "").trim();
  const postcode = (values.postcode ?? "").trim().toUpperCase();
  const gettingThere = (values.gettingThere ?? "").trim();
  const heroImage = (values.heroImage ?? "").trim();
  const heroAlt = (values.heroAlt ?? "").trim();
  const filmLink = (values.filmUrl ?? "").trim();
  const published = values.published === "on";

  if (!name)
    errors.name =
      "A workshop needs a name — it is the largest words on its page.";

  // The address is made from the name, and once people have that link it stays
  // the same. So it is offered rather than imposed, and she can overrule it.
  const slug = slugify(values.slug?.trim() || name);
  if (!slug) {
    errors.slug =
      "This name leaves nothing to make an address out of. Write the address yourself — lowercase words with hyphens, like reading-the-field.";
  }

  if (!summary) {
    errors.summary =
      "This is the only description the workshops list shows, so it cannot be blank.";
  }

  if (!date) {
    errors.date = "A workshop needs a day.";
  } else if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    errors.date = "That is not a date this understands. Use the date picker.";
  }

  if (!startTime) {
    errors.startTime = "A workshop needs a time to start.";
  } else if (!isTime(startTime)) {
    errors.startTime = "Write the time as 10:00.";
  }

  if (endTime && !isTime(endTime)) {
    errors.endTime = "Write the time as 16:30.";
  } else if (
    endTime &&
    startTime &&
    isTime(startTime) &&
    endTime <= startTime
  ) {
    // String comparison is exactly right for zero-padded 24-hour times, and
    // avoids inventing a date to hang two clock times off.
    errors.endTime = `This ends at ${endTime}, before its ${startTime} start. One of the two is the wrong way round.`;
  }

  const pricePence = parsePence(values.price ?? "");
  if (pricePence === null) {
    errors.price = "Write the price in numbers, like 95.";
  }

  const capacity = parseWholeNumber(values.capacity ?? "", 1);
  if (capacity === null) {
    errors.capacity =
      "How many people the room takes — a whole number, at least one.";
  }

  const refundDays = parseWholeNumber(values.refundDays ?? "", 0);
  if (refundDays === null) {
    errors.refundDays =
      "A whole number of days, or 0 if this one cannot be refunded at all.";
  }

  // The film is a link to somewhere that already holds it, so the only thing
  // that can be wrong with it is that it is not one of the two addresses this
  // knows how to show. Nothing is asked of Vimeo or YouTube yet — that
  // happens after every other check has passed, below.
  const film: Film | null = filmLink ? parseFilm(filmLink) : null;
  if (filmLink && !film) {
    errors.filmUrl =
      "That is not a Vimeo or YouTube address. Open the film on either site and copy the link from the address bar or the share panel — something like vimeo.com/76979871.";
  }

  if (heroImage && !heroAlt) {
    errors.heroAlt =
      "Say what is in the picture behind the title. It is read out to anyone using a screen reader, and shown if the picture does not load.";
  }

  // The five that stop it going live, per the approved form. Everything else
  // can wait, which is why it is only checked when the box is ticked.
  if (published) {
    if (!heroImage) {
      errors.heroImage =
        "A workshop on the site has a picture behind its title — that is the composition, not a preference.";
    }
    if (!bodySource) {
      errors.body =
        "Nothing is written yet. The page would be a name, a date and a price with nothing between them.";
    }
  }

  const rememberVenue = values.rememberVenue === "on";

  const { images, errors: imageErrors } = collectImages(formData);
  Object.assign(errors, imageErrors);

  // Uniqueness last: it costs a query, and there is no point spending it on a
  // form that is already going back.
  if (Object.keys(errors).length === 0) {
    const clash = await prisma.workshop.findUnique({ where: { slug } });
    if (clash && clash.id !== id) {
      errors.slug = `Something else already lives at /workshops/${slug}. Give this one a different address.`;
    }
  }

  const count = Object.keys(errors).length;
  if (count > 0) {
    return {
      errors,
      message:
        count === 1
          ? "One thing needs another look. Nothing has been lost, and the site is unchanged."
          : `${count} things need another look. Nothing has been lost, and the site is unchanged.`,
      values,
      attempt: prev.attempt + 1,
    };
  }

  // After the checks and before the write, so a form that is going back does
  // not leave a new place behind it.
  const venueId = await resolveVenue(values.venueId, rememberVenue, {
    venueName,
    addressLines,
    postcode,
    gettingThere,
  });

  // Read once, used twice: the address the page used to live at, and what was
  // already known about the film. Both are needed before the write.
  const previous = id
    ? await prisma.workshop.findUnique({ where: { id } })
    : null;
  const { poster, duration } = await resolveFilm(film, previous);

  const data = {
    slug,
    name,
    summary,
    bodyHtml: toHtml(bodySource),
    date: new Date(`${date}T00:00:00Z`),
    startTime,
    endTime,
    venueName,
    addressLines,
    postcode,
    gettingThere,
    venueId,
    capacity: capacity as number,
    priceGBP: pricePence as number,
    refundDays: refundDays as number,
    heroImage: heroImage || null,
    heroAlt: heroImage ? heroAlt : null,
    filmUrl: film?.watchUrl ?? null,
    filmPoster: poster,
    filmDuration: duration,
    published,
  };

  // The rail is replaced rather than reconciled row by row. The form posts the
  // whole set every time, so "what was submitted" IS the new set — matching
  // rows up by id would be more code for the same answer.
  const previousSlug = previous?.slug;

  const saved = id
    ? await prisma.workshop.update({
        where: { id },
        data: { ...data, images: { deleteMany: {}, create: images } },
      })
    : await prisma.workshop.create({
        data: { ...data, images: { create: images } },
      });

  revalidateWorkshop(saved.slug, previousSlug);
  redirect(`/admin/offerings/workshops/${saved.slug}`);
}

export type DeleteState = { error: string | null };

/**
 * Deleting a workshop.
 *
 * REFUSED WHILE ANYONE IS HOLDING A PLACE. People have paid for these; the
 * booking rows carry the only record of their money on this side, and
 * cascading the delete would take that record with the day. So the check is
 * here, before the delete, and the database refuses it too (Booking's relation
 * is `onDelete: Restrict`) — because a foreign key that only the application
 * enforces is a foreign key one migration away from being enforced by nobody.
 *
 * Cancelling and refunding those bookings is the Bookings screen, and the
 * refusal points at it — a "no" that does not say where the "yes" lives is half
 * an answer.
 */
export async function deleteWorkshop(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id))
    return { error: "That workshop no longer exists." };

  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) return { error: "That workshop no longer exists." };

  // Every booking counts here, cancelled ones included: a cancelled booking is
  // the record of a refund, and that has to survive the day it was for.
  const held = await prisma.booking.count({ where: { workshopId: id } });
  if (held > 0) {
    return {
      error:
        held === 1
          ? "Somebody has booked a place on this one, so it cannot be deleted — the record of what they paid would go with it. Cancel and refund them in Bookings first, or take this off the site instead."
          : `${held} people have booked places on this one, so it cannot be deleted — the record of what they paid would go with it. Cancel and refund them in Bookings first, or take this off the site instead.`,
    };
  }

  await prisma.workshop.delete({ where: { id } });

  revalidateWorkshop(workshop.slug);
  redirect("/admin/offerings");
}

/**
 * Everything that changes when a workshop does.
 *
 * The public pages are prerendered and would otherwise keep serving what they
 * were built with — which is the whole failure this closes: she saves, looks
 * at the site, and sees yesterday. The home page is in the list because its
 * dates block reads the same workshops.
 *
 * The old address is passed when the slug has moved, so the page that no
 * longer exists stops being served from the cache as though it did.
 */
function revalidateWorkshop(slug: string, previousSlug?: string) {
  revalidatePath("/");
  revalidatePath("/workshops");
  revalidatePath(`/workshops/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/workshops/${previousSlug}`);
  }
  revalidatePath("/admin/offerings");
}
