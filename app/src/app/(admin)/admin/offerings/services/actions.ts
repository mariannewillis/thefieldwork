"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { parseFilm, type Film } from "@/lib/film";
import {
  collectImages,
  collectValues,
  parsePence,
  parseWholeNumber,
  resolveFilm,
  resolveVenue,
} from "@/lib/offering-form";
import { slugify, type OfferingFormState } from "@/lib/offering-rules";
import { toHtml } from "@/lib/rich-text";

/**
 * Writing a service.
 *
 * The workshop's and the course's sibling — same shape, same rules, same
 * messages wherever the question is the same one, and co-located with its form
 * for the same reason. What the checks and conversions have in common with the
 * other two lives in `lib/offering-form.ts`; what is here is the part that
 * names fields.
 *
 * Two questions the other two forms ask that this one does not, and the
 * reasons are the shape of the thing:
 *
 *  · WHEN. A visitor asks for a slot against her availability and she answers.
 *    There is no day to set here, so there is no field for one.
 *  · HOW MANY. One-to-one means one.
 *
 * And one it asks that they do not: WHERE, as a choice of two. Either it
 * happens at a place of hers, which is the four address fields a workshop
 * carries, or she travels to the client, which is a base to measure from and a
 * distance she will go. Exactly one of the two is written down; the other is
 * emptied on the way to the database, and the database refuses anything else.
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

/** The name this form knows it by. The shape is every offering form's. */
export type ServiceFormState = OfferingFormState;

export async function saveService(
  prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireSession();

  const values = collectValues(formData);
  const errors: Record<string, string> = {};

  const id = values.id ? Number(values.id) : null;
  const name = (values.name ?? "").trim();
  const summary = (values.summary ?? "").trim();
  const bodySource = (values.body ?? "").trim();
  const heroImage = (values.heroImage ?? "").trim();
  const heroAlt = (values.heroAlt ?? "").trim();
  const filmLink = (values.filmUrl ?? "").trim();
  const published = values.published === "on";

  if (!name)
    errors.name =
      "A service needs a name — it is the largest words on its page.";

  // The address is made from the name, and once people have that link it stays
  // the same. So it is offered rather than imposed, and she can overrule it.
  const slug = slugify(values.slug?.trim() || name);
  if (!slug) {
    errors.slug =
      "This name leaves nothing to make an address out of. Write the address yourself — lowercase words with hyphens, like a-single-session.";
  }

  if (!summary) {
    errors.summary =
      "This is the only description the services list shows, so it cannot be blank.";
  }

  // Minutes, not two clock times. A service has a LENGTH; when it starts is
  // whatever she and the person agree on, and that conversation has not
  // happened when this form is being filled in.
  const durationMinutes = parseWholeNumber(values.duration ?? "", 1);
  if (durationMinutes === null) {
    errors.duration =
      "How long the session runs, in minutes — a whole number. An hour and a quarter is 75.";
  }

  const pricePence = parsePence(values.price ?? "");
  if (pricePence === null) {
    errors.price = "Write the price in numbers, like 65.";
  }

  // ── where it is ─────────────────────────────────────────────────────────
  // One of two, and the form always posts one of the two. Anything else that
  // arrives is read as the venue branch, which is the one that needs nothing
  // she has not already been asked for.
  const travels = values.location === "travels";

  const venueName = (values.venueName ?? "").trim();
  const addressLines = (values.addressLines ?? "").trim();
  const postcode = (values.postcode ?? "").trim().toUpperCase();
  const gettingThere = (values.gettingThere ?? "").trim();

  const baseAddressLines = (values.baseAddressLines ?? "").trim();
  const basePostcode = (values.basePostcode ?? "").trim().toUpperCase();
  const travelNote = (values.travelNote ?? "").trim();
  const travelRadiusMiles = travels
    ? parseWholeNumber(values.travelRadiusMiles ?? "", 1)
    : null;

  // The travel branch's two facts are asked for as soon as it is chosen, not
  // only when she publishes: a service that says she travels and cannot say
  // where from or how far has not answered the question it just raised. The
  // venue branch asks nothing extra, the same as a workshop's address.
  if (travels) {
    if (!basePostcode) {
      errors.basePostcode =
        "A distance has to be measured from somewhere. The postcode is what does it — the lines above can wait.";
    }
    if (travelRadiusMiles === null) {
      errors.travelRadiusMiles =
        "How far you will travel, in miles — a whole number, at least one.";
    }
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

  const { images, errors: imageErrors } = collectImages(formData);
  Object.assign(errors, imageErrors);

  // The two that stop it going live. The same two as a workshop: there is no
  // date to insist on and no room to fill.
  if (published) {
    if (!heroImage) {
      errors.heroImage =
        "A service on the site has a picture behind its title — that is the composition, not a preference.";
    }
    if (!bodySource) {
      errors.body =
        "Nothing is written yet. The page would be a name, a length and a price with nothing between them.";
    }
  }

  const rememberVenue = values.rememberVenue === "on";

  // Uniqueness last: it costs a query, and there is no point spending it on a
  // form that is already going back. The three kinds live at three different
  // addresses, so only other services can be in the way.
  if (Object.keys(errors).length === 0) {
    const clash = await prisma.service.findUnique({ where: { slug } });
    if (clash && clash.id !== id) {
      errors.slug = `Something else already lives at /services/${slug}. Give this one a different address.`;
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
  // not leave a new place behind it — and only on the branch that has a place
  // at all. "Keep this for next time" on a service she travels for would save
  // her own base address as somewhere she runs workshops.
  const venueId = travels
    ? null
    : await resolveVenue(values.venueId, rememberVenue, {
        venueName,
        addressLines,
        postcode,
        gettingThere,
      });

  // Read once, used twice: the address the page used to live at, and what was
  // already known about the film. Both are needed before the write.
  const previous = id
    ? await prisma.service.findUnique({ where: { id } })
    : null;
  const { poster, duration } = await resolveFilm(film, previous);

  /**
   * The branch not in force is written as NULL, not left as it was.
   *
   * She sets a venue, saves, changes her mind and says she travels: without
   * this the old address is still in the row, and the page has two answers to
   * "where is this?" with only the enum to say which one it means. Emptying it
   * makes the record say exactly what she last decided and nothing else — and
   * the CHECK constraint in the migration refuses a row that says otherwise,
   * because a rule only the application keeps is a rule one careless write
   * away from being kept by nobody.
   */
  const where = travels
    ? {
        location: "travels" as const,
        venueName: null,
        addressLines: null,
        postcode: null,
        gettingThere: null,
        venueId: null,
        baseAddressLines,
        basePostcode,
        travelRadiusMiles: travelRadiusMiles as number,
        travelNote,
      }
    : {
        location: "venue" as const,
        venueName,
        addressLines,
        postcode,
        gettingThere,
        venueId,
        baseAddressLines: null,
        basePostcode: null,
        travelRadiusMiles: null,
        travelNote: null,
      };

  const data = {
    slug,
    name,
    summary,
    bodyHtml: toHtml(bodySource),
    durationMinutes: durationMinutes as number,
    ...where,
    priceGBP: pricePence as number,
    heroImage: heroImage || null,
    heroAlt: heroImage ? heroAlt : null,
    filmUrl: film?.watchUrl ?? null,
    filmPoster: poster,
    filmDuration: duration,
    published,
  };

  // The rail is replaced rather than reconciled row by row. The form posts the
  // whole set every time, so "what was submitted" IS the new set.
  const previousSlug = previous?.slug;

  const saved = id
    ? await prisma.service.update({
        where: { id },
        data: { ...data, images: { deleteMany: {}, create: images } },
      })
    : await prisma.service.create({
        data: { ...data, images: { create: images } },
      });

  revalidateService(saved.slug, previousSlug);
  redirect(`/admin/offerings/services/${saved.slug}`);
}

export type DeleteState = { error: string | null };

/**
 * Deleting a service.
 *
 * Its pictures go with it, by the cascade on the relation. Nothing refuses
 * this the way `deleteWorkshop` refuses a workshop somebody has paid for:
 * services cannot be asked for or bought yet, so there is no record of
 * anybody's money or anybody's request on this side to take down with it. When
 * there is, this needs the same guard, for the same reason.
 */
export async function deleteService(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "That service no longer exists." };

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return { error: "That service no longer exists." };

  await prisma.service.delete({ where: { id } });

  revalidateService(service.slug);
  redirect("/admin/offerings?kind=services");
}

/**
 * Everything that changes when a service does.
 *
 * Only the portal's own list, for now. The public services pages are not built
 * yet, so there is nothing prerendered under /services to go stale — when
 * there is, this is where "/", "/services" and "/services/<slug>" go, exactly
 * as `revalidateWorkshop` lists them for workshops.
 */
function revalidateService(slug: string, previousSlug?: string) {
  revalidatePath("/admin/offerings");
  revalidatePath(`/admin/offerings/services/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/admin/offerings/services/${previousSlug}`);
  }
}
