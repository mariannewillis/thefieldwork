"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { parseFilm, type Film } from "@/lib/film";
import { formatDayLong } from "@/lib/format";
import {
  collectImages,
  collectValues,
  isTime,
  parsePence,
  parseWholeNumber,
  resolveFilm,
  resolveVenue,
} from "@/lib/offering-form";
import { slugify, type OfferingFormState } from "@/lib/offering-rules";
import { toHtml } from "@/lib/rich-text";

/**
 * Writing a course.
 *
 * The workshop's sibling — same shape, same rules, same messages wherever the
 * question is the same one, and co-located with its form for the same reason.
 * What the checks and conversions have in common with the workshop's lives in
 * `lib/offering-form.ts`; what is here is the part that names fields, because
 * a rule and the field it governs should be readable together.
 *
 * The one thing a workshop does not have is the run of dates. Everything
 * particular to a course is in `collectRun` below.
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
export type CourseFormState = OfferingFormState;

/**
 * One dated meeting of a course, as the form posts it.
 *
 * `key` is the row in the rendered form, carried so a fault found later —
 * "this one still needs a name" — can be drawn beside the field it belongs to
 * rather than as a sentence about a row she has to go and find. It is stripped
 * before the write; the database has no use for it.
 */
type RunDate = {
  key: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  venue: string;
  description: string;
};

/**
 * The run of dates, read out of the form.
 *
 * Rows are posted as `run-<n>-date` / `run-<n>-title` / …, where <n>
 * identifies the row in the rendered list rather than a database id, and the
 * numbers are not necessarily contiguous — the form drops a row she takes off
 * rather than marking it.
 *
 * SORTED BY DATE, and that is the only sorting there is. Nothing records the
 * order she typed them in, so nothing can disagree with the calendar later:
 * add a forgotten date at the bottom and it takes its place in the run without
 * anything having to be renumbered (see the schema comment on CourseSession).
 *
 * A row with nothing in it at all is dropped without comment — an empty row
 * she opened and thought better of is not a mistake. A row with anything in it
 * needs a day, because a paragraph nobody can date has nowhere to go on the
 * page.
 */
function collectRun(formData: FormData): {
  run: RunDate[];
  errors: Record<string, string>;
} {
  const run: RunDate[] = [];
  const errors: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("run-") || !key.endsWith("-date")) continue;
    if (typeof value !== "string") continue;
    const row = key.slice("run-".length, -"-date".length);

    const field = (suffix: string) =>
      String(formData.get(`run-${row}-${suffix}`) ?? "").trim();

    const date = value.trim();
    const title = field("title");
    const startTime = field("start");
    const endTime = field("end");
    const venue = field("venue");
    const description = field("description");

    // The room is not counted as writing: the form fills every new row in
    // with the course's own place, so a row she opened and thought better of
    // has one and nothing else. That row goes without comment.
    const written = title || startTime || endTime || description;
    if (!date && !written) continue;

    if (!date) {
      errors[`run-${row}-date`] =
        "This one needs a day. A date with nothing written against it is fine; something written with no date has nowhere to go on the page.";
      continue;
    }
    if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      errors[`run-${row}-date`] =
        "That is not a date this understands. Use the date picker.";
      continue;
    }

    if (startTime && !isTime(startTime)) {
      errors[`run-${row}-start`] = "Write the time as 19:00.";
    }
    if (endTime && !isTime(endTime)) {
      errors[`run-${row}-end`] = "Write the time as 21:00.";
    } else if (endTime && !startTime) {
      errors[`run-${row}-start`] =
        "This one ends but never starts. Put the time it begins in as well.";
      // String comparison is exactly right for zero-padded 24-hour times, and
      // avoids inventing a date to hang two clock times off.
    } else if (endTime && isTime(startTime) && endTime <= startTime) {
      errors[`run-${row}-end`] =
        `This one ends at ${endTime}, before its ${startTime} start. One of the two is the wrong way round.`;
    }

    run.push({
      key: row,
      title,
      date: new Date(`${date}T00:00:00Z`),
      startTime,
      endTime,
      venue,
      description,
    });
  }

  run.sort((one, other) => one.date.getTime() - other.date.getTime());
  return { run, errors };
}

export async function saveCourse(
  prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireSession();

  const values = collectValues(formData);
  const errors: Record<string, string> = {};

  const id = values.id ? Number(values.id) : null;
  const name = (values.name ?? "").trim();
  const summary = (values.summary ?? "").trim();
  const bodySource = (values.body ?? "").trim();
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
      "A course needs a name — it is the largest words on its page.";

  // The address is made from the name, and once people have that link it stays
  // the same. So it is offered rather than imposed, and she can overrule it.
  const slug = slugify(values.slug?.trim() || name);
  if (!slug) {
    errors.slug =
      "This name leaves nothing to make an address out of. Write the address yourself — lowercase words with hyphens, like the-long-attention.";
  }

  if (!summary) {
    errors.summary =
      "This is the only description the courses list shows, so it cannot be blank.";
  }

  const pricePence = parsePence(values.price ?? "");
  if (pricePence === null) {
    errors.price = "Write the price in numbers, like 240.";
  }

  // Empty means the whole price is taken at once, the way a workshop's is —
  // and so does 0, which is the same sentence written with a number.
  const depositSource = (values.deposit ?? "").trim();
  const depositPence = depositSource ? parsePence(depositSource) : null;
  const instalmentsWanted = Number((values.instalments ?? "1").trim() || "1");
  const everyDaysWanted = Number(
    (values.instalmentEveryDays ?? "30").trim() || "30",
  );

  /**
   * THE THREE WAYS TO PAY, AS SHE TICKED THEM (operator, 2026-08-21).
   *
   * An unticked checkbox posts NOTHING — that is how checkboxes work — so
   * absence is "off" and the presence of the key is "on". Every course saved
   * from this form therefore says what it offers, explicitly, and there is no
   * state where a figure in a field silently becomes an offer.
   *
   * A TICK IS ONLY VALIDATED WHEN IT IS ON. Unticking a way is not a reason to
   * complain about the fields under it: they stay filled in so the arrangement
   * can come back next term without being retyped, and the save simply stops
   * asking whether they make sense.
   */
  const payInFull = values.payInFull === "on";
  const depositOffered = values.depositOffered === "on";
  const planOffered = values.planOffered === "on";

  if (depositSource && depositPence === null) {
    errors.deposit =
      "Write the deposit in numbers, like 60 — or leave it empty.";
  } else if (
    depositPence !== null &&
    pricePence !== null &&
    depositPence > pricePence
  ) {
    errors.deposit =
      "A deposit is part of the price, so it cannot be more than the price.";
  } else if (depositOffered && !depositPence) {
    errors.deposit =
      "This course offers a deposit, so it needs a figure. Put one in, or untick the deposit above.";
  }

  if (planOffered && !(instalmentsWanted >= 2 && instalmentsWanted <= 12)) {
    // TWO AT LEAST. One payment is paying in full, which is its own tick — and
    // a "plan" of one would put a buyer through a plan-shaped checkout to be
    // charged the whole price.
    errors.instalments =
      "A plan is between 2 and 12 payments. One payment is paying in full, which is the tick above.";
  }
  if (planOffered && !(everyDaysWanted >= 7 && everyDaysWanted <= 90)) {
    errors.instalments =
      "Payments go between 7 and 90 days apart. 30 is what people mean by monthly.";
  }

  /**
   * INTEREST, TYPED AS A PERCENTAGE AND STORED IN BASIS POINTS.
   *
   * "5.5" becomes 550, the same move the deposit makes with pounds and pence,
   * and for the same reason: money arithmetic on a float is an argument waiting
   * to happen, and this one would be an argument about somebody's money.
   *
   * CAPPED AT 100%. Not a legal opinion — a typo guard. Somebody who means 5
   * and types 500 should be stopped by the form rather than by a client's
   * email, and a course that genuinely doubles in price on a plan is not a
   * thing this portal is for.
   */
  const interestSource = (values.planInterest ?? "").trim().replace(/%$/, "");
  let planInterestBps = 0;
  if (interestSource) {
    if (!/^\d+(\.\d{1,2})?$/.test(interestSource)) {
      errors.planInterest =
        "Write the interest as a number of percent, like 5 or 5.5 — or leave it empty for none.";
    } else if (Number(interestSource) > 100) {
      errors.planInterest =
        "That is more than 100%, which would more than double the price. Check the figure.";
    } else {
      planInterestBps = Math.round(Number(interestSource) * 100);
    }
  }

  // When the rest is due. HERS, per course, beside the deposit it belongs to —
  // and deliberately not a site-wide "28 days before" rule the portal decided
  // on her behalf. Read here and checked against the run below, once the dates
  // have been collected.
  const balanceSource = (values.balanceDueAt ?? "").trim();
  let balanceDueAt: Date | null = null;
  if (balanceSource) {
    if (Number.isNaN(Date.parse(`${balanceSource}T00:00:00Z`))) {
      errors.balanceDueAt =
        "That is not a date this understands. Use the date picker.";
    } else {
      balanceDueAt = new Date(`${balanceSource}T00:00:00Z`);
    }
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

  // ── what it takes out of the diary ──────────────────────────────────────
  // The same three questions a workshop is asked, with the same handling of a
  // blank. Set ONCE for the run rather than per date: the same room, the same
  // drive and the same packing up on every Wednesday of it, and four copies of
  // one answer is three that can be wrong.
  const marginBefore = parseWholeNumber(
    (values.marginBefore ?? "").trim() || "0",
    0,
  );
  const marginAfter = parseWholeNumber(
    (values.marginAfter ?? "").trim() || "0",
    0,
  );
  const blocksWholeDay = values.blocksWholeDay === "on";

  if (marginBefore === null) {
    errors.marginBefore = "Minutes, as a whole number — 60 for an hour, or 0.";
  }
  if (marginAfter === null) {
    errors.marginAfter = "Minutes, as a whole number — 90, or 0.";
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

  const { run, errors: runErrors } = collectRun(formData);
  Object.assign(errors, runErrors);

  // ── the deposit and its date are one arrangement ──────────────────────────
  //
  // Checked here rather than only on publish where BOTH halves are present but
  // disagree, because that is a mistake she can see and fix now. The half that
  // is simply not filled in yet is a draft, and drafts are allowed until she
  // tries to put one on the site.
  if (depositOffered && !balanceDueAt && !errors.deposit) {
    // THE DATE IS HALF THE ARRANGEMENT. A deposit with no day for the rest is
    // a checkout that takes part of the price and never asks for the rest, so
    // it is refused at the save rather than at the publish — this is a mistake
    // she can see and fix now.
    errors.balanceDueAt =
      "A deposit needs a day the rest is due by, or nothing ever asks for it. Put a date in — on or before the first date of the run.";
  }
  if (balanceDueAt && run.length > 0 && balanceDueAt > run[0].date) {
    // The run's first date is the ceiling, not the last: money owed for a
    // course somebody has already started attending is a debt, not a deposit,
    // and it is not what she means by "the rest is due by".
    errors.balanceDueAt = `The run starts on ${formatDayLong(run[0].date)}, so the rest has to be paid by then at the latest. Put a date on or before it.`;
  }

  const { images, errors: imageErrors } = collectImages(formData);
  Object.assign(errors, imageErrors);

  // What stops it going live. The first four are the workshop's; the last two
  // are the whole difference between a course and a workshop — a run of dates,
  // each of them called something.
  if (published) {
    if (!heroImage) {
      errors.heroImage =
        "A course on the site has a picture behind its title — that is the composition, not a preference.";
    }
    if (!bodySource) {
      errors.body =
        "Nothing is written yet. The page would be a name, a price and a list of dates with nothing between them.";
    }
    if (run.length === 0) {
      errors.run =
        "A course is a run of dates, and this one has none. Put the dates in below — a course with nothing in the diary is a draft, not a page.";
    }
    for (const one of run) {
      if (one.title) continue;
      errors[`run-${one.key}-title`] =
        "Say what this one is. The page lists the dates by name, and a line with only a date on it tells somebody nothing about what they are coming to.";
    }
  }

  const rememberVenue = values.rememberVenue === "on";

  // Uniqueness last: it costs a query, and there is no point spending it on a
  // form that is already going back. Courses and workshops live at different
  // addresses, so only other courses can be in the way.
  if (Object.keys(errors).length === 0) {
    const clash = await prisma.course.findUnique({ where: { slug } });
    if (clash && clash.id !== id) {
      errors.slug = `Something else already lives at /courses/${slug}. Give this one a different address.`;
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
    ? await prisma.course.findUnique({ where: { id } })
    : null;
  const { poster, duration } = await resolveFilm(film, previous);

  // The form's row numbers stop here. What the database keeps is six columns
  // and a date to sort them by.
  const dates = run.map(({ key: _key, ...date }) => date);

  const data = {
    slug,
    name,
    summary,
    bodyHtml: toHtml(bodySource),
    venueName,
    addressLines,
    postcode,
    gettingThere,
    venueId,
    capacity: capacity as number,
    priceGBP: pricePence as number,
    // Zero is written down as nothing at all: "no deposit" and "a deposit of
    // £0" are the same arrangement, and one of the two spellings would
    // eventually be read as the other.
    depositGBP: depositPence || null,
    // AND THE DATE STAYS WITH IT, whether or not the deposit is on offer.
    // Untick "a deposit" for a term and the figure and the day are both still
    // there when it comes back — `waysToPay` reads the TICK, not the fields, so
    // a filled-in field that is not ticked offers nothing and costs nothing.
    // (Before the ticks existed, a figure in this field WAS the offer, so
    // clearing the date was the only way to withdraw it.)
    balanceDueAt: depositPence ? balanceDueAt : null,

    /**
     * WHICH WAYS THIS COURSE OFFERS (operator, 2026-08-21).
     *
     * Stored as she ticked them, with one correction the form cannot make: if
     * she ticks nothing at all, paying in full goes back on. A published course
     * that cannot be paid for in any way is a page with a dead button on it,
     * and the honest fallback is its own price.
     */
    payInFull: payInFull || (!depositOffered && !planOffered),
    depositOffered,
    planOffered,
    planInterestBps,
    /**
     * HOW MANY PAYMENTS, AND HOW FAR APART (operator, 2026-08-21).
     *
     * Bounded here rather than trusted from the form: the browser's `min` and
     * `max` are a courtesy that saves a round trip, and a number posted without
     * them has to be refused just the same. Twelve is the ceiling because a
     * plan longer than a year is a different arrangement — a subscription —
     * and this is not one.
     *
     * CHANGING IT MOVES NOBODY. Plans already written are the agreements
     * already made; this is the plan the NEXT person will be put on. That is
     * the same rule `balanceDueAt` follows and it is why the schedule is rows
     * on the booking rather than a sum done against the course.
     */
    instalments: Math.max(1, Math.min(12, Math.round(instalmentsWanted) || 1)),
    instalmentEveryDays: Math.max(
      7,
      Math.min(90, Math.round(everyDaysWanted) || 30),
    ),
    refundDays: refundDays as number,
    // Kept even when the whole day is taken, for the reason a workshop's are:
    // unticking the toggle next week should find the figures she set.
    marginBeforeMinutes: marginBefore as number,
    marginAfterMinutes: marginAfter as number,
    blocksWholeDay,
    heroImage: heroImage || null,
    heroAlt: heroImage ? heroAlt : null,
    filmUrl: film?.watchUrl ?? null,
    filmPoster: poster,
    filmDuration: duration,
    published,
  };

  // The run and the rail are both REPLACED rather than reconciled row by row.
  // The form posts the whole set every time, so what was submitted IS the new
  // set. Matching rows up by id would be more code for the same answer, and
  // nothing else in the database points at a date — no booking, no email, no
  // note — so a row's identity is worth nothing to keep.
  const previousSlug = previous?.slug;

  const saved = id
    ? await prisma.course.update({
        where: { id },
        data: {
          ...data,
          sessions: { deleteMany: {}, create: dates },
          images: { deleteMany: {}, create: images },
        },
      })
    : await prisma.course.create({
        data: {
          ...data,
          sessions: { create: dates },
          images: { create: images },
        },
      });

  revalidateCourse(saved.slug, previousSlug);
  redirect(`/admin/offerings/courses/${saved.slug}`);
}

export type DeleteState = { error: string | null };

/**
 * Deleting a course.
 *
 * Its dates and its pictures go with it, by the cascade on both relations. What
 * does NOT go with it is a booking: a course can be bought now (D-23), so this
 * refuses exactly as `deleteWorkshop` does, and the database refuses too
 * (`onDelete: Restrict`). Deleting a course somebody has paid a deposit on
 * would take the record of their money down with it.
 */
export async function deleteCourse(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "That course no longer exists." };

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return { error: "That course no longer exists." };

  // Every booking counts here, cancelled ones included: a cancelled booking is
  // the record of a refund, and that has to survive the run it was for.
  const held = await prisma.booking.count({ where: { courseId: id } });
  if (held > 0) {
    return {
      error:
        held === 1
          ? "Somebody has booked a place on this one, so it cannot be deleted — the record of what they paid would go with it. Cancel and refund them in Bookings first, or take this off the site instead."
          : `${held} people have booked places on this one, so it cannot be deleted — the record of what they paid would go with it. Cancel and refund them in Bookings first, or take this off the site instead.`,
    };
  }

  await prisma.course.delete({ where: { id } });

  revalidateCourse(course.slug);
  redirect("/admin/offerings?kind=courses");
}

/**
 * Everything that changes when a course does.
 *
 * The public pages are prerendered and would otherwise keep serving what they
 * were built with — which is the whole failure this closes: she saves, looks at
 * the site, and sees yesterday. The old address is passed when the slug has
 * moved, so the page that no longer exists stops being served from the cache as
 * though it did.
 */
function revalidateCourse(slug: string, previousSlug?: string) {
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/courses/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/courses/${previousSlug}`);
  }
  revalidatePath("/admin/offerings");
  revalidatePath(`/admin/offerings/courses/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/admin/offerings/courses/${previousSlug}`);
  }
}

/* ── Showing and hiding, from the list ────────────────────────────────────── */

export type VisibilityState = { error: string | null; done: number };

/**
 * TAKE A COURSE OFF THE SITE, OR PUT IT BACK — without opening the form.
 *
 * Hiding is always allowed; publishing is not, and applies the same conditions
 * `saveCourse` applies. A course has FOUR rather than the workshop's two,
 * because a course is an arrangement rather than a day: it needs its picture
 * and its words, it needs dates (a course with nothing in the diary is a draft),
 * and a deposit needs a day the rest is due by, or nothing ever asks for it.
 *
 * A toggle that skipped these would be a second, quieter way to put a broken
 * page on the site — or worse, to open a checkout that takes half the money and
 * never asks for the other half.
 */
export async function setCourseVisibility(
  _prev: VisibilityState,
  formData: FormData,
): Promise<VisibilityState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const publish = formData.get("publish") === "on";
  if (!Number.isInteger(id))
    return { error: "That course no longer exists.", done: 0 };

  const course = await prisma.course.findUnique({
    where: { id },
    include: { sessions: true },
  });
  if (!course) return { error: "That course no longer exists.", done: 0 };

  if (publish) {
    const missing = !course.heroImage
      ? "it has no picture behind its title"
      : !course.bodyHtml
        ? "nothing is written on it yet"
        : course.sessions.length === 0
          ? "it has no dates — a course with nothing in the diary is a draft"
          : course.depositGBP && !course.balanceDueAt
            ? "it takes a deposit with no day the rest is due by, so nothing would ever ask for the rest"
            : null;
    if (missing) {
      return {
        error: `This one cannot go on the site while ${missing}. Open it and finish that first.`,
        done: 0,
      };
    }
  }

  await prisma.course.update({ where: { id }, data: { published: publish } });
  revalidateCourse(course.slug);
  return { error: null, done: Date.now() };
}
