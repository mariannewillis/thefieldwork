"use client";

import { useActionState, useState } from "react";
import { addPicture } from "@/app/(admin)/admin/offerings/actions";
import { saveCourse } from "@/app/(admin)/admin/offerings/courses/actions";
import {
  formatDayLong,
  formatDayShort,
  refundDeadline,
  toDateInputValue,
} from "@/lib/format";
import { MAX_IMAGES, NO_ATTEMPT_YET, slugify } from "@/lib/offering-rules";
import DeleteCourse from "./DeleteCourse";
import {
  FieldError,
  FIELD,
  FIELD_BIG,
  FIELD_FIG,
  HELP,
  LABEL,
  Needed,
  PicturePicker,
  QUIET_BUTTON,
  Section,
  type VenueChoice,
} from "./OfferingFormParts";

/**
 * The form that writes a course.
 *
 * The workshop form's sibling, and deliberately the same sheet: the picture
 * and the name, then the facts, then where it is, then the long body, then the
 * dates, then the pictures, then putting it up. Anyone who has filled in one
 * of these has filled in the other.
 *
 * What a workshop does not have is the run. A course has no day of its own —
 * it has dates, and everything the top of its page says about when it happens
 * is read back from them rather than typed twice.
 *
 * THE DATES ARE ADDED AND TAKEN OFF, NEVER REORDERED. The order is the date,
 * so there is no drag handle, no numbering to keep in step, and no state where
 * the run is "out of order" for the form to explain. What the row headings
 * show is the place each date will take in the run, worked out from the dates
 * themselves as she types them — which is the rule made visible rather than
 * written down.
 */

export type CourseFormValues = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  body: string;
  venueName: string;
  addressLines: string;
  postcode: string;
  gettingThere: string;
  /** Which saved place filled the four above, if one did. */
  venueId: number | null;
  capacity: number;
  priceGBP: number;
  /** Pence, or null when the whole price is taken at once. */
  depositGBP: number | null;
  refundDays: number;
  heroImage: string | null;
  heroAlt: string | null;
  /** The Vimeo or YouTube address. The still and the length come from there. */
  filmUrl: string | null;
  published: boolean;
  updatedAt: Date;
  images: { url: string; alt: string; position: number }[];
  dates: {
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    venue: string;
    description: string;
  }[];
};

/** One row of the run, as the form holds it while she is writing. */
type DateRow = {
  key: number;
  title: string;
  /** "2026-10-07", as an `<input type="date">` wants it. */
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description: string;
};

export default function CourseForm({
  course,
  media,
  venues,
  mapUrl,
}: {
  /** Absent when this is a course that does not exist yet. */
  course?: CourseFormValues;
  /** The pictures already on the site — see lib/media#listMediaBasenames. */
  media: string[];
  /** The places she has used before — see lib/venues#listVenues. */
  venues: VenueChoice[];
  /**
   * The SAVED address, in a map — see lib/maps#mapSearchUrl. Absent on a
   * course that does not exist yet, and on one whose place is not set: there
   * is nothing to check until something has been written down.
   */
  mapUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveCourse,
    NO_ATTEMPT_YET,
  );

  /** What was typed if the last attempt bounced, otherwise what is stored. */
  const kept = (name: string, stored: string) => state.values[name] ?? stored;

  // The picture library, held here rather than in each picker, because a
  // photograph she uploads against the masthead has to be offered to the rail
  // below it as well — one library, one place it grows.
  const [library, setLibrary] = useState(media);
  const rememberPicture = (basename: string) =>
    setLibrary((names) =>
      names.includes(basename) ? names : [...names, basename].sort(),
    );

  const [name, setName] = useState(course?.name ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  // The address is offered until she overrules it. Once she has typed one,
  // renaming the course must not silently move the page out from under a link
  // somebody already has.
  const [slugOwned, setSlugOwned] = useState(Boolean(course));
  const [refundDays, setRefundDays] = useState(
    String(course?.refundDays ?? 14),
  );

  // The four address fields are held here rather than left to the browser,
  // because choosing a place has to visibly FILL them — not stand in for them.
  const [venueName, setVenueName] = useState(
    kept("venueName", course?.venueName ?? ""),
  );
  const [addressLines, setAddressLines] = useState(
    kept("addressLines", course?.addressLines ?? ""),
  );
  const [postcode, setPostcode] = useState(
    kept("postcode", course?.postcode ?? ""),
  );
  const [gettingThere, setGettingThere] = useState(
    kept("gettingThere", course?.gettingThere ?? ""),
  );
  // Which place filled them, kept only while its four fields are untouched:
  // once she has edited one, the address on the page is no longer that place's
  // and saying it came from there would be a small lie in the database.
  const [venueId, setVenueId] = useState(
    kept("venueId", course?.venueId ? String(course.venueId) : ""),
  );

  const fillFrom = (venue: VenueChoice) => {
    setVenueName(venue.name);
    setAddressLines(venue.addressLines);
    setPostcode(venue.postcode);
    setGettingThere(venue.gettingThere);
    setVenueId(String(venue.id));
  };

  /** Any hand edit to the four means this address is hers, not a place's. */
  const ownAddress = () => setVenueId("");

  // Offered only when there is something new to keep. A place already on the
  // list has nothing to be remembered about it.
  const isNewPlace =
    venueName.trim().length > 0 &&
    !venues.some(
      (venue) =>
        venue.name.trim().toLowerCase() === venueName.trim().toLowerCase(),
    );

  const effectiveSlug = slugOwned ? slug : slugify(name);

  // ── the run ────────────────────────────────────────────────────────────
  // Rows keep their own dates in state because three things read them as she
  // types: the span at the top of the facts, the last day to cancel, and the
  // place each date takes in the run. Everything else in a row is left to the
  // browser and read back off the form when it is posted.
  const [dateRows, setDateRows] = useState<DateRow[]>(() =>
    (course?.dates ?? []).map((one, index) => ({
      key: index,
      title: one.title,
      date: toDateInputValue(one.date),
      startTime: one.startTime,
      endTime: one.endTime,
      venue: one.venue,
      description: one.description,
    })),
  );

  // A row's number is one past the highest so far, so it never goes back down
  // as rows are taken off: reusing a number would hand a fresh row whatever was
  // typed into the removed one when a save bounces back and redraws the form.
  // Worked out from the rows themselves rather than a counter, because a
  // counter would make this updater impure — and React calls it twice.
  const addDate = () =>
    setDateRows((rows) => [
      ...rows,
      {
        key: rows.reduce((next, row) => Math.max(next, row.key + 1), 0),
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        // The course's own place, offered. A run that moves for one week is
        // real, so it is a field rather than an assumption.
        venue: venueName,
        description: "",
      },
    ]);
  const removeDate = (key: number) =>
    setDateRows((rows) => rows.filter((row) => row.key !== key));
  const setDate = (key: number, date: string) =>
    setDateRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, date } : row)),
    );

  // The run as it will actually be: the dated rows, in date order. This is the
  // only ordering there is — she can add a forgotten week at the bottom and it
  // takes its place here without anything being renumbered.
  const dated = dateRows
    .filter((row) => row.date)
    .sort((one, other) => one.date.localeCompare(other.date));
  const placeInRun = (key: number) =>
    dated.findIndex((row) => row.key === key) + 1;

  const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
  const span =
    dated.length === 0
      ? null
      : dated.length === 1
        ? `One date · ${formatDayShort(asDate(dated[0].date))}`
        : `${dated.length} dates · ${formatDayShort(asDate(dated[0].date))} – ${formatDayShort(asDate(dated[dated.length - 1].date))}`;

  // Counted back from the FIRST date, because a course is bought once and so
  // is cancelled once.
  const deadline =
    dated.length > 0 && /^\d+$/.test(refundDays)
      ? refundDeadline(asDate(dated[0].date), Number(refundDays))
      : null;

  // ── the rail ───────────────────────────────────────────────────────────
  // A row only ever exists because a picture exists. There is no "add an empty
  // slot": empty slots standing open ask a question whether or not she has an
  // answer to it.
  const [imageRows, setImageRows] = useState(() =>
    (course?.images ?? []).map((image, index) => ({
      key: index,
      url: image.url,
      alt: image.alt,
    })),
  );
  const appendPicture = (url: string) =>
    setImageRows((rows) => [
      ...rows,
      {
        key: rows.reduce((next, row) => Math.max(next, row.key + 1), 0),
        url,
        alt: "",
      },
    ]);
  const removeImageRow = (key: number) =>
    setImageRows((rows) => rows.filter((row) => row.key !== key));
  const atMaxImages = imageRows.length >= MAX_IMAGES;

  // How far through a batch we are, while one is running. Null the rest of the
  // time — there is no such thing here as a picture of what uploading looks
  // like, only the count of an upload actually happening.
  const [adding, setAdding] = useState<{ done: number; of: number } | null>(
    null,
  );
  // The ones that did not make it, named. A batch of six with one bad file in
  // it must land five and say which one it was.
  const [refused, setRefused] = useState<{ name: string; why: string }[]>([]);
  // What the ceiling turned away, if it turned anything away.
  const [overflow, setOverflow] = useState<{ left: number; of: number } | null>(
    null,
  );

  /**
   * Several photographs, from one press.
   *
   * ONE AT A TIME, deliberately, not all at once — see the same function in
   * WorkshopForm for why. In sequence, "3 of 5" is a true statement rather
   * than an estimate, and the rows arrive in the order the files did.
   */
  async function takePictures(input: HTMLInputElement) {
    const picked = [...(input.files ?? [])];
    // Cleared straight away so choosing the same files again — after a refusal
    // she has since fixed — still counts as a change and fires this again.
    input.value = "";
    if (picked.length === 0) return;

    setRefused([]);
    // The ceiling holds, but it takes what fits rather than refusing the lot.
    const room = Math.max(MAX_IMAGES - imageRows.length, 0);
    const taking = picked.slice(0, room);
    setOverflow(
      taking.length < picked.length
        ? { left: picked.length - taking.length, of: picked.length }
        : null,
    );
    if (taking.length === 0) return;

    for (const [index, file] of taking.entries()) {
      setAdding({ done: index, of: taking.length });
      const body = new FormData();
      body.set("file", file);
      try {
        const result = await addPicture(body);
        if (result.ok) {
          rememberPicture(result.basename);
          appendPicture(result.basename);
        } else {
          setRefused((list) => [
            ...list,
            { name: file.name, why: result.error },
          ]);
        }
      } catch {
        setRefused((list) => [
          ...list,
          {
            name: file.name,
            why: "It did not get there. Check the connection and try this one again.",
          },
        ]);
      }
    }
    setAdding(null);
  }

  return (
    <>
      {/* Remounted on every rejected attempt. React resets an uncontrolled
          form once its action resolves, which would empty every field the
          moment the server found a fault — the exact opposite of what the
          screen promises ("Nothing has been lost"). Remounting redraws them
          from what was typed. */}
      <form key={state.attempt} action={formAction} className="pb-4">
        {course && <input type="hidden" name="id" value={course.id} />}

        {state.message && (
          <p
            role="alert"
            className="pool on-pool mt-8 border-l-2 border-pool-error px-6 py-5 text-[17px] leading-relaxed text-pool-error"
          >
            {state.message}
          </p>
        )}

        <div className="pool on-pool mt-6 px-6 py-8 sm:px-10 sm:py-10">
          {/* ══ THE TOP OF THE PAGE ═══════════════════════════════════════ */}
          <Section
            first
            id="masthead-h"
            title="The top of the page"
            note="The picture, then the name, then the sentence underneath"
          >
            <PicturePicker
              name="heroImage"
              label={
                <>
                  The picture behind the title <Needed />
                </>
              }
              library={library}
              onAdded={rememberPicture}
              defaultValue={kept("heroImage", course?.heroImage ?? "")}
            >
              <p className={HELP}>
                It sits dimmed behind the name, so it wants the mood of the room
                rather than a detail.
              </p>
              <FieldError error={state.errors.heroImage} />
            </PicturePicker>

            <div className="mt-7">
              <label className="block">
                <span className={LABEL}>What is in that picture</span>
                <input
                  name="heroAlt"
                  type="text"
                  defaultValue={kept("heroAlt", course?.heroAlt ?? "")}
                  className={FIELD}
                />
              </label>
              <p className={HELP}>
                Read out to anyone using a screen reader. No picture goes on the
                site without one.
              </p>
              <FieldError error={state.errors.heroAlt} />
            </div>

            <div className="mt-7">
              <label className="block">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className={LABEL}>Name</span>
                  <Needed />
                </span>
                <input
                  name="name"
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={FIELD_BIG}
                />
              </label>
              <FieldError error={state.errors.name} />
            </div>

            <div className="mt-7">
              <label className="block">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className={LABEL}>The sentence underneath</span>
                  <Needed />
                </span>
                <textarea
                  name="summary"
                  rows={2}
                  defaultValue={kept("summary", course?.summary ?? "")}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className={HELP}>
                Also the line on the courses list, so it has to make sense on
                its own.
              </p>
              <FieldError error={state.errors.summary} />
            </div>
          </Section>

          {/* ══ THE FACTS ═════════════════════════════════════════════════ */}
          <Section
            id="facts-h"
            title="The facts"
            note="True of the whole run, not of one date"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={LABEL}>Price for the whole run</span>
                    <Needed />
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span
                      aria-hidden="true"
                      className="fig font-mono text-[24px] text-ink-soft"
                    >
                      &pound;
                    </span>
                    <input
                      name="price"
                      type="text"
                      inputMode="decimal"
                      defaultValue={kept(
                        "price",
                        course ? String(course.priceGBP / 100) : "",
                      )}
                      className={`${FIELD_FIG} text-[32px]`}
                    />
                  </span>
                </label>
                <p className={HELP}>
                  One price, every date included. There is no way to buy a
                  single evening of a course.
                </p>
                <FieldError error={state.errors.price} />
              </div>

              <div>
                <label className="block">
                  <span className={LABEL}>Places</span>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={kept(
                      "capacity",
                      String(course?.capacity ?? 8),
                    )}
                    className={`${FIELD_FIG} text-[32px]`}
                  />
                </label>
                <p className={HELP}>
                  How many the room takes for the whole run, not how many are
                  sold.
                </p>
                <FieldError error={state.errors.capacity} />
              </div>
            </div>

            <div className="mt-7 max-w-[34rem]">
              <label className="block">
                <span className={LABEL}>Deposit</span>
                <span className="flex items-baseline gap-2">
                  <span
                    aria-hidden="true"
                    className="fig font-mono text-[24px] text-ink-soft"
                  >
                    &pound;
                  </span>
                  <input
                    name="deposit"
                    type="text"
                    inputMode="decimal"
                    defaultValue={kept(
                      "deposit",
                      course?.depositGBP ? String(course.depositGBP / 100) : "",
                    )}
                    className={`${FIELD_FIG} text-[26px]`}
                  />
                </span>
              </label>
              {/* Said plainly, because a figure in a form that nothing acts on
                  is exactly the kind of state D-9 forbids the portal to imply.
                  It is written down now because it is hers to decide while she
                  is writing the course. */}
              <p className={HELP}>
                What would be taken at booking. Leave it empty to take the whole
                price at once, the way a workshop does. Nothing sells a course
                yet, so this is written down rather than charged.
              </p>
              <FieldError error={state.errors.deposit} />
            </div>

            <div className="mt-7">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <label className={LABEL} htmlFor="refundDays">
                  Refund up to
                </label>
                <input
                  id="refundDays"
                  name="refundDays"
                  type="number"
                  min={0}
                  value={refundDays}
                  onChange={(event) => setRefundDays(event.target.value)}
                  className={`${FIELD_FIG} w-20 text-[21px]`}
                />
                <span className="text-[18px] text-ink-soft">
                  days before the first date
                </span>
              </p>
              {/* The consequence of the field above and the dates below,
                  worked out as she types. "14" and "the last day to cancel is
                  the 23rd" are different questions, and she is answering the
                  second. */}
              <p className="mt-3 font-display text-[24px] leading-tight text-ink">
                {dated.length === 0
                  ? "Put the dates in below and this will say the last day to cancel."
                  : deadline
                    ? `Which makes ${formatDayLong(deadline)} the last day to cancel.`
                    : "Which means places on this course cannot be refunded, and the page says so."}
              </p>
              <FieldError error={state.errors.refundDays} />
            </div>

            {/* Read back, never typed. The span at the top of a course's page
                is the run's own first and last date; a second copy of it here
                would be a figure that could disagree with the diary. */}
            <div className="mt-9 border-t border-pool-rule/25 pt-7">
              <p className={LABEL}>When it runs</p>
              <p className="mt-3 font-display text-[26px] leading-tight text-ink">
                {span ?? "No dates yet."}
              </p>
              <p className={HELP}>
                Written from the dates below rather than typed here, and it is
                what the top of the course&rsquo;s page says.
              </p>
            </div>
          </Section>

          {/* ══ WHERE IT IS ═══════════════════════════════════════════════ */}
          <Section
            id="where-h"
            title="Where it is"
            note="The address on the page, and the things people write to ask about"
          >
            {/* Which place this came from. Posted with the address so the
                record can say where it was copied from — and emptied by any
                hand edit below, because then it was not copied from anywhere. */}
            <input type="hidden" name="venueId" value={venueId} />

            {venues.length > 0 && (
              <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-3">
                <p className={LABEL}>Somewhere you have used</p>
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => fillFrom(venue)}
                    className={QUIET_BUTTON}
                  >
                    {venue.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={LABEL}>The name of the place</span>
                  <input
                    name="venueName"
                    type="text"
                    value={venueName}
                    onChange={(event) => {
                      setVenueName(event.target.value);
                      ownAddress();
                    }}
                    className={FIELD}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className={LABEL}>Postcode</span>
                  <input
                    name="postcode"
                    type="text"
                    autoCapitalize="characters"
                    value={postcode}
                    onChange={(event) => {
                      setPostcode(event.target.value);
                      ownAddress();
                    }}
                    className={FIELD_FIG}
                  />
                </label>
              </div>
            </div>

            <div className="mt-7">
              <label className="block">
                <span className={LABEL}>The address, a line at a time</span>
                <textarea
                  name="addressLines"
                  rows={3}
                  value={addressLines}
                  onChange={(event) => {
                    setAddressLines(event.target.value);
                    ownAddress();
                  }}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className={HELP}>
                The postcode above goes on its own line, so leave it out here.
              </p>
            </div>

            {/* The one thing the form cannot tell her about an address is
                whether it is the right one. Same link the public page carries,
                built in one place (lib/maps), so what she checks is what a
                visitor gets. A plain link out: nothing is asked of Google until
                she presses it. */}
            {mapUrl && (
              <div className="mt-7">
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="t inline-flex min-h-[44px] items-center text-[17px] font-medium text-ink underline decoration-pool-rule underline-offset-4 hover:decoration-ink"
                >
                  Check this address on a map
                </a>
                <p className={HELP}>
                  Opens what is saved, in a new tab. Worth pressing after any
                  change of address: a postcode can be a real one and still be a
                  mile from the door.
                </p>
              </div>
            )}

            <div className="mt-7">
              <label className="block">
                <span className={LABEL}>Getting there — one line each</span>
                <textarea
                  name="gettingThere"
                  rows={5}
                  value={gettingThere}
                  onChange={(event) => {
                    setGettingThere(event.target.value);
                    ownAddress();
                  }}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className={HELP}>
                Step-free or not, the toilet, the parking, the buses. Each line
                becomes a bullet beside the address.
              </p>
            </div>

            {/* Offered, not assumed. It appears only once she has named a place
                that is not already on the list, and it is off until she says
                so. */}
            {isNewPlace && (
              <label className="mt-7 flex items-start gap-3 text-[18px] text-ink">
                <input
                  name="rememberVenue"
                  type="checkbox"
                  defaultChecked={state.values.rememberVenue === "on"}
                  className="mt-1 h-5 w-5 shrink-0 accent-action"
                />
                <span>
                  Keep {venueName.trim()} for next time
                  <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                    It joins the places above, and fills all four of these in
                    one press.
                  </span>
                </span>
              </label>
            )}
          </Section>

          {/* ══ WHAT THE COURSE IS ════════════════════════════════════════ */}
          <Section
            id="body-h"
            title="What the course is"
            note="The long part — what the run is for, and who it is for"
          >
            <label className="block">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className={LABEL}>The course&rsquo;s own page</span>
                <Needed />
              </span>
              <textarea
                name="body"
                rows={18}
                defaultValue={kept("body", course?.body ?? "")}
                className={`${FIELD} min-h-0 py-4 text-[18px] leading-relaxed`}
              />
            </label>
            <FieldError error={state.errors.body} />
            {/* Structure only. There is nothing here for type or colour because
                those are already decided and stay the same across the site
                (§12) — a toolbar that can set a colour is one that can break
                the design. */}
            <div className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
              <p>
                A blank line starts a new paragraph, and three marks do the
                rest:
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                <li>
                  <code className="fig font-mono text-ink">## </code> at the
                  start of a line makes it a section heading
                </li>
                <li>
                  <code className="fig font-mono text-ink">### </code> makes it
                  a smaller heading
                </li>
                <li>
                  <code className="fig font-mono text-ink">- </code> makes the
                  line a bullet
                </li>
              </ul>
              <p className="mt-3">
                What happens on each date goes with that date, below, not here.
              </p>
            </div>
          </Section>

          {/* ══ THE DATES ═════════════════════════════════════════════════ */}
          <Section
            id="dates-h"
            title="The dates"
            note="The run, one date at a time"
          >
            <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
              They go on the page in date order, whatever order you put them in
              here — so a week you forgot can go on the end and still land in
              the right place. There is no limit on how many, and each one can
              be somewhere else if it has to be.
            </p>
            <FieldError error={state.errors.run} />

            {dateRows.length > 0 && (
              <ul className="mt-8 flex flex-col gap-8">
                {dateRows.map((row) => {
                  const place = placeInRun(row.key);
                  return (
                    <li
                      key={row.key}
                      className="border-t border-pool-rule/25 pt-8 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                        {/* Where this one lands in the run, worked out from the
                            dates as she types them. It is the whole rule —
                            order is the date — said by the form rather than in
                            a line of help. */}
                        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink">
                          {place > 0 ? (
                            <>
                              {place} of {dated.length}
                              <span className="ml-3 normal-case tracking-normal text-ink-soft">
                                {formatDayShort(asDate(row.date))}
                              </span>
                            </>
                          ) : (
                            <span className="text-ink-soft">
                              Not dated yet
                              <span className="ml-3 normal-case tracking-normal">
                                it takes its place as soon as it has a day
                              </span>
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeDate(row.key)}
                          className="t min-h-[44px] text-[17px] text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
                        >
                          Take this date off
                        </button>
                      </div>

                      <div className="mt-5">
                        <label className="block">
                          <span className="flex flex-wrap items-baseline gap-x-3">
                            <span className={LABEL}>
                              What this one is called
                            </span>
                            <Needed />
                          </span>
                          <input
                            name={`run-${row.key}-title`}
                            type="text"
                            defaultValue={kept(
                              `run-${row.key}-title`,
                              row.title,
                            )}
                            className={`${FIELD} font-display text-[24px]`}
                          />
                        </label>
                        <FieldError
                          error={state.errors[`run-${row.key}-title`]}
                        />
                      </div>

                      <div className="mt-6 grid gap-6 sm:grid-cols-[1.4fr_1fr_1fr]">
                        <div>
                          <label className="block">
                            <span className="flex flex-wrap items-baseline gap-x-3">
                              <span className={LABEL}>Date</span>
                              <Needed />
                            </span>
                            <input
                              name={`run-${row.key}-date`}
                              type="date"
                              value={row.date}
                              onChange={(event) =>
                                setDate(row.key, event.target.value)
                              }
                              className={`${FIELD_FIG} text-[21px]`}
                            />
                          </label>
                          <FieldError
                            error={state.errors[`run-${row.key}-date`]}
                          />
                        </div>
                        <div>
                          <label className="block">
                            <span className={LABEL}>Starts</span>
                            <input
                              name={`run-${row.key}-start`}
                              type="time"
                              defaultValue={kept(
                                `run-${row.key}-start`,
                                row.startTime,
                              )}
                              className={`${FIELD_FIG} text-[21px]`}
                            />
                          </label>
                          <FieldError
                            error={state.errors[`run-${row.key}-start`]}
                          />
                        </div>
                        <div>
                          <label className="block">
                            <span className={LABEL}>Ends</span>
                            <input
                              name={`run-${row.key}-end`}
                              type="time"
                              defaultValue={kept(
                                `run-${row.key}-end`,
                                row.endTime,
                              )}
                              className={`${FIELD_FIG} text-[21px]`}
                            />
                          </label>
                          <FieldError
                            error={state.errors[`run-${row.key}-end`]}
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block">
                          <span className={LABEL}>Where this one is</span>
                          <input
                            name={`run-${row.key}-venue`}
                            type="text"
                            defaultValue={kept(
                              `run-${row.key}-venue`,
                              row.venue,
                            )}
                            className={FIELD}
                          />
                        </label>
                        <p className={HELP}>
                          Filled in with the course&rsquo;s own place. Change it
                          for a week that moves.
                        </p>
                      </div>

                      <div className="mt-6">
                        <label className="block">
                          <span className={LABEL}>What happens this time</span>
                          <textarea
                            name={`run-${row.key}-description`}
                            rows={4}
                            defaultValue={kept(
                              `run-${row.key}-description`,
                              row.description,
                            )}
                            className={`${FIELD} min-h-0 py-3 text-[18px] leading-relaxed`}
                          />
                        </label>
                        <p className={HELP}>
                          Two or three sentences, shown when somebody opens this
                          one on the page. The date and the time are on the line
                          either way.
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-8">
              <button type="button" onClick={addDate} className={QUIET_BUTTON}>
                {dateRows.length === 0 ? "Add the first date" : "Add a date"}
              </button>
              {dateRows.length === 0 && (
                <p className={HELP}>
                  A course with no dates stays a draft and never reaches the
                  site — a run of dates is the whole difference between this and
                  a workshop.
                </p>
              )}
            </div>
          </Section>

          {/* ══ PICTURES AND FILM ═════════════════════════════════════════ */}
          <Section
            id="gallery-h"
            title="Pictures and film"
            note="One film, and the pictures under it"
          >
            {/* One field where there were three. The still it opens on and how
                long it runs belong to the film, and Vimeo and YouTube both
                already know them. */}
            <label className="block">
              <span className={LABEL}>The link to the film</span>
              <input
                name="filmUrl"
                type="text"
                inputMode="url"
                placeholder="https://vimeo.com/76979871"
                defaultValue={kept("filmUrl", course?.filmUrl ?? "")}
                className={FIELD}
              />
            </label>
            <p className={HELP}>
              Optional. Put the film on Vimeo or YouTube and paste the link —
              Vimeo for preference, because YouTube records who watched. Nothing
              is loaded from either until somebody presses play.
            </p>
            <FieldError error={state.errors.filmUrl} />

            <div className="mt-9 border-t border-pool-rule/25 pt-7">
              <p className={LABEL}>Pictures</p>
              <p className={HELP}>
                The first three sit across the page and everybody sees them;
                past that the strip scrolls, so the order matters. Each one
                needs a line saying what is in it.
              </p>
              <FieldError error={state.errors.images} />

              {imageRows.length > 0 && (
                <ul className="mt-7 flex flex-col gap-7">
                  {imageRows.map((row, index) => (
                    <li
                      key={row.key}
                      className="border-t border-pool-rule/25 pt-7 first:border-t-0 first:pt-0"
                    >
                      <PicturePicker
                        name={`image-url-${row.key}`}
                        label={`Picture ${index + 1}`}
                        library={library}
                        onAdded={rememberPicture}
                        defaultValue={kept(`image-url-${row.key}`, row.url)}
                      >
                        <label className="mt-4 block">
                          <span className={LABEL}>What is in it</span>
                          <input
                            name={`image-alt-${row.key}`}
                            type="text"
                            defaultValue={kept(`image-alt-${row.key}`, row.alt)}
                            className={FIELD}
                          />
                        </label>
                        <FieldError
                          error={state.errors[`image-alt-${row.key}`]}
                        />
                        <button
                          type="button"
                          onClick={() => removeImageRow(row.key)}
                          className="t mt-4 min-h-[44px] text-[17px] text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
                        >
                          Take this one off
                        </button>
                      </PicturePicker>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                {atMaxImages ? (
                  <p className="text-[17px] text-ink-soft">
                    Twelve is as many as a page carries well. Take one off to
                    add another.
                  </p>
                ) : (
                  <label
                    className={`${QUIET_BUTTON} inline-flex cursor-pointer items-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      disabled={Boolean(adding)}
                      onChange={(event) => takePictures(event.currentTarget)}
                      className="sr-only"
                    />
                    {adding
                      ? adding.of === 1
                        ? "Adding…"
                        : `Adding ${adding.done + 1} of ${adding.of}…`
                      : imageRows.length
                        ? "Add more pictures"
                        : "Choose pictures"}
                  </label>
                )}
                {/* The ceiling says nothing until it is nearly in the way. */}
                {imageRows.length >= MAX_IMAGES - 3 && !atMaxImages && (
                  <p className="fig font-mono text-[15px] text-ink-soft">
                    {imageRows.length} of {MAX_IMAGES}
                  </p>
                )}
              </div>

              {/* Said plainly rather than silently done. She chose eight and
                  got six; the form owes her the number and the reason. */}
              {overflow && (
                <p
                  role="status"
                  className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink"
                >
                  Twelve pictures is as many as a page carries well, so the last{" "}
                  {overflow.left} of those {overflow.of} were left out.
                </p>
              )}

              {refused.length > 0 && (
                <ul
                  role="alert"
                  className="mt-4 flex max-w-[60ch] flex-col gap-2 text-[15px] leading-relaxed text-pool-error"
                >
                  {refused.map((one) => (
                    <li key={one.name}>
                      <span className="fig font-mono">{one.name}</span> &mdash;{" "}
                      {one.why}
                    </li>
                  ))}
                </ul>
              )}

              {imageRows.length > 1 && (
                <p className={HELP}>
                  Dragging to reorder is not built yet — several chosen at once
                  arrive in the order your computer lists them, and the order
                  here is the order on the page.
                </p>
              )}
            </div>
          </Section>

          {/* ══ PUTTING IT UP ═════════════════════════════════════════════ */}
          <Section
            id="publish-h"
            title="Putting it up"
            note="One button and one check"
          >
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <div>
                <p className={LABEL}>What this makes</p>
                <p className="mt-3 fig font-mono text-[17px] text-ink">
                  thefieldwork.co.uk/courses/
                  {effectiveSlug || (
                    <>
                      <span aria-hidden="true">&mdash;&mdash;</span>
                      <span className="sr-only">address not set</span>
                    </>
                  )}
                </p>
                <label className="mt-4 block">
                  <span className={LABEL}>Or write the address yourself</span>
                  <input
                    name="slug"
                    type="text"
                    value={effectiveSlug}
                    onChange={(event) => {
                      setSlugOwned(true);
                      setSlug(slugify(event.target.value));
                    }}
                    className={FIELD_FIG}
                  />
                </label>
                <p className={HELP}>
                  Once people have this link it stays the same.
                </p>
                <FieldError error={state.errors.slug} />
              </div>

              <div>
                <label className="flex items-start gap-3 text-[18px] text-ink">
                  <input
                    name="published"
                    type="checkbox"
                    defaultChecked={
                      state.attempt > 0
                        ? state.values.published === "on"
                        : (course?.published ?? false)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span>
                    Show this on the site
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                      It needs a picture behind the title, something written,
                      and at least one date with a name on it. The courses pages
                      on the site are not built yet, so for now this is a
                      decision the site will honour rather than one anybody can
                      see.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={pending}
                  className="t mt-6 min-h-[56px] w-full bg-action px-8 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save this course"}
                </button>
              </div>
            </div>
          </Section>
        </div>
      </form>

      {/* Its own form, and therefore outside the one above — a form nested in
          a form is not valid HTML and the browser drops the inner one. */}
      {course && <DeleteCourse id={course.id} name={course.name} />}
    </>
  );
}
