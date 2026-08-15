"use client";

import { useActionState, useState } from "react";
import { addPicture } from "@/app/(admin)/admin/offerings/actions";
import { saveService } from "@/app/(admin)/admin/offerings/services/actions";
import { formatDuration } from "@/lib/format";
import { MAX_IMAGES, NO_ATTEMPT_YET, slugify } from "@/lib/offering-rules";
import { BOOKING_WINDOW_DAYS, lastStartClock, WEEKDAYS } from "@/lib/slots";
import DeleteService from "./DeleteService";
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
 * The form that writes a service.
 *
 * The workshop form's and the course form's sibling, and deliberately the same
 * sheet: the picture and the name, then the facts, then where it is, then the
 * long body, then the pictures, then putting it up. Anyone who has filled in
 * one of these has filled in the others.
 *
 * WHAT IS MISSING IS THE POINT. There is no date, no start time and no end
 * time, because a service is not in the diary until somebody asks for a slot
 * and she says yes — she sets how LONG it runs and nothing about when. There
 * is no number of places, because one-to-one means one.
 *
 * What is here instead is the choice: it happens at a place of hers, or she
 * goes to them. Only the branch she has chosen is drawn, so the other one
 * cannot be half-filled behind her back and cannot post anything — the fields
 * she typed into it are held here while she is looking at the sheet, and the
 * record keeps only the branch that is in force.
 */

export type ServiceFormValues = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  body: string;
  durationMinutes: number;
  /** ISO weekdays, 1 (Monday) to 7. Empty means nothing is offered. */
  availableDays: number[];
  availableFrom: string;
  availableTo: string;
  travelBufferMinutes: number;
  minimumNoticeHours: number;
  location: "venue" | "travels";
  /** The venue branch. All null when she travels. */
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
  gettingThere: string | null;
  /** Which saved place filled the four above, if one did. */
  venueId: number | null;
  /** The travelling branch. All null when it happens at a venue. */
  baseAddressLines: string | null;
  basePostcode: string | null;
  travelRadiusMiles: number | null;
  travelNote: string | null;
  priceGBP: number;
  heroImage: string | null;
  heroAlt: string | null;
  /** The Vimeo or YouTube address. The still and the length come from there. */
  filmUrl: string | null;
  published: boolean;
  updatedAt: Date;
  images: { url: string; alt: string; position: number }[];
};

const BRANCH =
  "flex flex-1 min-w-[15rem] cursor-pointer items-start gap-3 border p-5 text-[18px]";
const BRANCH_ON = `${BRANCH} border-action bg-action/5 text-ink`;
const BRANCH_OFF = `${BRANCH} border-pool-rule text-ink-soft hover:border-ink`;

export default function ServiceForm({
  service,
  media,
  venues,
  mapUrl,
}: {
  /** Absent when this is a service that does not exist yet. */
  service?: ServiceFormValues;
  /** The pictures already on the site — see lib/media#listMediaBasenames. */
  media: string[];
  /** The places she has used before — see lib/venues#listVenues. */
  venues: VenueChoice[];
  /**
   * The SAVED address, in a map — see lib/maps#mapSearchUrl. Whichever branch
   * is stored: the venue's address, or the base she travels from. Absent on a
   * service that does not exist yet, and on one whose address is not set.
   */
  mapUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveService,
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

  const [name, setName] = useState(service?.name ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  // The address is offered until she overrules it. Once she has typed one,
  // renaming the service must not silently move the page out from under a link
  // somebody already has.
  const [slugOwned, setSlugOwned] = useState(Boolean(service));

  // Held here because the sentence below it is written from it as she types.
  const [duration, setDuration] = useState(
    kept("duration", String(service?.durationMinutes ?? 60)),
  );
  const durationMinutes = /^\d+$/.test(duration.trim())
    ? Number(duration.trim())
    : null;

  // ── when she will do this one ───────────────────────────────────────────
  // All four are held here because the sentence under them is the whole reason
  // the fields are worth filling in: "ninety minutes, finishing at five" has to
  // read back as "so the last one starts at half past three" without her doing
  // the sum. That is the arithmetic the offered times are actually made of, and
  // this is the only place she can see it before somebody books against it.
  const [days, setDays] = useState<number[]>(
    service?.availableDays ?? [1, 2, 3, 4, 5],
  );
  const [openFrom, setOpenFrom] = useState(
    kept("availableFrom", service?.availableFrom ?? "09:00"),
  );
  const [openTo, setOpenTo] = useState(
    kept("availableTo", service?.availableTo ?? "17:00"),
  );
  const [travelBuffer, setTravelBuffer] = useState(
    kept("travelBuffer", String(service?.travelBufferMinutes ?? 0)),
  );
  const [minimumNotice, setMinimumNotice] = useState(
    kept("minimumNotice", String(service?.minimumNoticeHours ?? 24)),
  );

  const toggleDay = (day: number) =>
    setDays((chosen) =>
      chosen.includes(day)
        ? chosen.filter((one) => one !== day)
        : [...chosen, day].sort((a, b) => a - b),
    );

  const lastStart =
    durationMinutes === null
      ? null
      : lastStartClock({
          availableFrom: openFrom,
          availableTo: openTo,
          durationMinutes,
        });

  // ── where it is ─────────────────────────────────────────────────────────
  // The branch, and both branches' fields. Everything is held here rather than
  // left to the browser so that switching from one to the other and back does
  // not empty what she typed — and so that only the live branch is rendered,
  // which is what stops the other one posting anything at all.
  const [travels, setTravels] = useState(
    (kept("location", service?.location ?? "venue") as string) === "travels",
  );

  const [venueName, setVenueName] = useState(
    kept("venueName", service?.venueName ?? ""),
  );
  const [addressLines, setAddressLines] = useState(
    kept("addressLines", service?.addressLines ?? ""),
  );
  const [postcode, setPostcode] = useState(
    kept("postcode", service?.postcode ?? ""),
  );
  const [gettingThere, setGettingThere] = useState(
    kept("gettingThere", service?.gettingThere ?? ""),
  );
  // Which place filled them, kept only while its four fields are untouched:
  // once she has edited one, the address on the page is no longer that place's
  // and saying it came from there would be a small lie in the database.
  const [venueId, setVenueId] = useState(
    kept("venueId", service?.venueId ? String(service.venueId) : ""),
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

  const [baseAddressLines, setBaseAddressLines] = useState(
    kept("baseAddressLines", service?.baseAddressLines ?? ""),
  );
  const [basePostcode, setBasePostcode] = useState(
    kept("basePostcode", service?.basePostcode ?? ""),
  );
  const [travelRadiusMiles, setTravelRadiusMiles] = useState(
    kept(
      "travelRadiusMiles",
      service?.travelRadiusMiles ? String(service.travelRadiusMiles) : "",
    ),
  );
  const [travelNote, setTravelNote] = useState(
    kept("travelNote", service?.travelNote ?? ""),
  );

  const effectiveSlug = slugOwned ? slug : slugify(name);

  // ── the rail ───────────────────────────────────────────────────────────
  // A row only ever exists because a picture exists. There is no "add an empty
  // slot": empty slots standing open ask a question whether or not she has an
  // answer to it.
  const [imageRows, setImageRows] = useState(() =>
    (service?.images ?? []).map((image, index) => ({
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
        {service && <input type="hidden" name="id" value={service.id} />}

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
              defaultValue={kept("heroImage", service?.heroImage ?? "")}
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
                  defaultValue={kept("heroAlt", service?.heroAlt ?? "")}
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
                  defaultValue={kept("summary", service?.summary ?? "")}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className={HELP}>
                Also the line on the services list, so it has to make sense on
                its own.
              </p>
              <FieldError error={state.errors.summary} />
            </div>
          </Section>

          {/* ══ THE FACTS ═════════════════════════════════════════════════ */}
          <Section
            id="facts-h"
            title="The facts"
            note="How long it runs, and what it costs"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={LABEL}>How long it runs</span>
                    <Needed />
                  </span>
                  <span className="flex items-baseline gap-3">
                    {/* No `step`. A step of five with a minimum of one makes
                        60 an invalid value to the browser, which then refuses
                        the whole form with a tooltip and no explanation — the
                        one kind of refusal this portal never gives. Any whole
                        number is allowed here because any whole number is
                        allowed by the check on the server. */}
                    <input
                      name="duration"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className={`${FIELD_FIG} w-28 text-[32px]`}
                    />
                    <span className="text-[18px] text-ink-soft">minutes</span>
                  </span>
                </label>
                {/* The consequence of the field above, worked out as she types.
                    "90" and "an hour and a half" are different questions, and
                    the page answers the second one. */}
                <p className="mt-3 font-display text-[24px] leading-tight text-ink">
                  {durationMinutes
                    ? `Which the page reads as ${formatDuration(durationMinutes)}.`
                    : "Put the number of minutes in and this will read it back."}
                </p>
                <FieldError error={state.errors.duration} />
              </div>

              <div>
                <label className="block">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={LABEL}>Price</span>
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
                        service ? String(service.priceGBP / 100) : "",
                      )}
                      className={`${FIELD_FIG} text-[32px]`}
                    />
                  </span>
                </label>
                <p className={HELP}>
                  For the one session. There is nobody else in the room, so
                  there is nothing to multiply.
                </p>
                <FieldError error={state.errors.price} />
              </div>
            </div>

            {/* Said once, plainly, where the question would otherwise be asked
                by its absence. A form that simply has no date field leaves her
                wondering where it went. */}
            <p className="mt-9 max-w-[62ch] border-t border-pool-rule/25 pt-7 text-[17px] leading-relaxed text-ink-soft">
              There is no single date here, and that is deliberate: a service is
              not in the diary until somebody asks for a time and you say yes.
              What you set is how long it runs, and below, which times are
              offered.
            </p>
          </Section>

          {/* ══ WHEN YOU WILL DO IT ═══════════════════════════════════════ */}
          <Section
            id="when-h"
            title="When you will do it"
            note="The times this one is offered at, and nothing else is"
          >
            <p className="mb-8 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
              These belong to this service rather than to your week, so an hour
              in the garden room and a half-day you drive to can have different
              answers. Nothing is offered outside them &mdash; and nothing is
              offered inside them either if a workshop, a course date, another
              session or a block of your own is already there.
            </p>

            <fieldset>
              <legend className={LABEL}>Days you will do this one</legend>
              <div className="mt-4 flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const on = days.includes(day.iso);
                  return (
                    <label
                      key={day.iso}
                      className={`t inline-flex min-h-[48px] cursor-pointer items-center border px-5 text-[18px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action ${
                        on
                          ? "border-action bg-action/10 text-ink"
                          : "border-pool-rule text-ink-soft"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="availableDays"
                        value={day.iso}
                        checked={on}
                        onChange={() => toggleDay(day.iso)}
                        className="sr-only"
                      />
                      {day.short}
                    </label>
                  );
                })}
              </div>
              {/* An empty set is legal, and it is a real answer rather than an
                  error — she may be taking this one off the diary for a while
                  without taking it off the site. It has to SAY so, though,
                  because a page that quietly offers nothing looks broken. */}
              {days.length === 0 && (
                <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-ink">
                  With no days set nothing is offered, and the page falls back
                  to asking people when would suit them in their own words
                  &mdash; which you then answer yourself.
                </p>
              )}
              <FieldError error={state.errors.availableDays} />
            </fieldset>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={LABEL}>Earliest start</span>
                  <input
                    name="availableFrom"
                    type="time"
                    value={openFrom}
                    onChange={(event) => setOpenFrom(event.target.value)}
                    className={`${FIELD_FIG} text-[26px]`}
                  />
                </label>
                <FieldError error={state.errors.availableFrom} />
              </div>
              <div>
                <label className="block">
                  <span className={LABEL}>Finished by</span>
                  <input
                    name="availableTo"
                    type="time"
                    value={openTo}
                    onChange={(event) => setOpenTo(event.target.value)}
                    className={`${FIELD_FIG} text-[26px]`}
                  />
                </label>
                <p className={HELP}>
                  When the session must be OVER, not the last time it can start.
                </p>
                <FieldError error={state.errors.availableTo} />
              </div>
            </div>

            {/* THE SUM, SAID OUT LOUD. It is the arithmetic the offered times
                are actually made of, and the one thing about this screen that
                is easy to get wrong in your head. */}
            <p className="mt-6 font-display text-[24px] leading-tight text-ink">
              {durationMinutes === null
                ? "Put the length in above and this will say when the last one can start."
                : lastStart
                  ? `Which makes ${lastStart} the last one that can start — ${formatDuration(durationMinutes)} finishing by ${openTo}.`
                  : `${formatDuration(durationMinutes)} does not fit between ${openFrom} and ${openTo}, so nothing can be offered at all.`}
            </p>

            <div className="mt-9 grid gap-6 border-t border-pool-rule/25 pt-8 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className={LABEL}>Travel either side</span>
                  <span className="flex items-baseline gap-3">
                    <input
                      name="travelBuffer"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={travelBuffer}
                      onChange={(event) => setTravelBuffer(event.target.value)}
                      className={`${FIELD_FIG} w-28 text-[28px]`}
                    />
                    <span className="text-[18px] text-ink-soft">minutes</span>
                  </span>
                </label>
                <p className={HELP}>
                  Kept clear before and after every session of this one, so two
                  of them across the county cannot sit end to end. Leave it at 0
                  for something that never moves.
                </p>
                <FieldError error={state.errors.travelBuffer} />
              </div>

              <div>
                <label className="block">
                  <span className={LABEL}>Least notice you will take</span>
                  <span className="flex items-baseline gap-3">
                    <input
                      name="minimumNotice"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={minimumNotice}
                      onChange={(event) => setMinimumNotice(event.target.value)}
                      className={`${FIELD_FIG} w-28 text-[28px]`}
                    />
                    <span className="text-[18px] text-ink-soft">hours</span>
                  </span>
                </label>
                <p className={HELP}>
                  So nobody takes nine o&rsquo;clock this morning at half past
                  eight. 24 is a day.
                </p>
                <FieldError error={state.errors.minimumNotice} />
              </div>
            </div>

            <p className="mt-8 max-w-[62ch] border-t border-pool-rule/25 pt-7 text-[17px] leading-relaxed text-ink-soft">
              People are shown times up to {BOOKING_WINDOW_DAYS} days ahead.
              That figure is the same across the whole site &mdash; it is about
              how far into the future this diary is worth trusting rather than
              about any one session.
            </p>
          </Section>

          {/* ══ WHERE IT IS ═══════════════════════════════════════════════ */}
          <Section
            id="where-h"
            title="Where it is"
            note="One of two answers, never both"
          >
            <fieldset>
              <legend className={LABEL}>Where this one happens</legend>
              <div className="mt-4 flex flex-wrap gap-4">
                <label className={travels ? BRANCH_OFF : BRANCH_ON}>
                  <input
                    type="radio"
                    name="location"
                    value="venue"
                    checked={!travels}
                    onChange={() => setTravels(false)}
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span>
                    At a place of yours
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                      The address goes on the page, the way a workshop&rsquo;s
                      does.
                    </span>
                  </span>
                </label>
                <label className={travels ? BRANCH_ON : BRANCH_OFF}>
                  <input
                    type="radio"
                    name="location"
                    value="travels"
                    checked={travels}
                    onChange={() => setTravels(true)}
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span>
                    You travel to them
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                      The page says how far you go, and from where.
                    </span>
                  </span>
                </label>
              </div>
              <p className={HELP}>
                Only one of these is kept. Change your mind and what you wrote
                in the other is put aside &mdash; the page has one answer to
                &ldquo;where is this?&rdquo;, so the record does too.
              </p>
            </fieldset>

            {travels ? (
              <div className="mt-9 border-t border-pool-rule/25 pt-7">
                <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
                  Where you set out from, and how far you will go. The address
                  itself is not printed on the page as a place to come to
                  &mdash; it is what the distance is measured from.
                </p>

                <div className="mt-7 grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className={LABEL}>Postcode you start from</span>
                        <Needed />
                      </span>
                      <input
                        name="basePostcode"
                        type="text"
                        autoCapitalize="characters"
                        value={basePostcode}
                        onChange={(event) =>
                          setBasePostcode(event.target.value)
                        }
                        className={FIELD_FIG}
                      />
                    </label>
                    <FieldError error={state.errors.basePostcode} />
                  </div>

                  <div>
                    <label className="block">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className={LABEL}>How far you will travel</span>
                        <Needed />
                      </span>
                      <span className="flex items-baseline gap-3">
                        <input
                          name="travelRadiusMiles"
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={travelRadiusMiles}
                          onChange={(event) =>
                            setTravelRadiusMiles(event.target.value)
                          }
                          className={`${FIELD_FIG} w-24 text-[32px]`}
                        />
                        <span className="text-[18px] text-ink-soft">miles</span>
                      </span>
                    </label>
                    <FieldError error={state.errors.travelRadiusMiles} />
                  </div>
                </div>

                <div className="mt-7">
                  <label className="block">
                    <span className={LABEL}>The address, a line at a time</span>
                    <textarea
                      name="baseAddressLines"
                      rows={3}
                      value={baseAddressLines}
                      onChange={(event) =>
                        setBaseAddressLines(event.target.value)
                      }
                      className={`${FIELD} resize-none`}
                    />
                  </label>
                  <p className={HELP}>
                    Optional &mdash; the postcode above is what the distance is
                    worked out from. The postcode goes on its own line, so leave
                    it out here.
                  </p>
                </div>

                {/* A LINE SHE WRITES, not a rate this works out. Nothing here
                    charges for a mile, and nothing should be added that does
                    until she has said what her policy is — see the schema
                    comment on travelNote. */}
                <div className="mt-7">
                  <label className="block">
                    <span className={LABEL}>What travelling costs</span>
                    <textarea
                      name="travelNote"
                      rows={3}
                      value={travelNote}
                      onChange={(event) => setTravelNote(event.target.value)}
                      className={`${FIELD} resize-none`}
                    />
                  </label>
                  <p className={HELP}>
                    In your own words, and only if it costs anything. Whatever
                    you write goes on the page as you wrote it &mdash; nothing
                    here adds a charge or works one out per mile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-9 border-t border-pool-rule/25 pt-7">
                {/* Which place this came from. Posted with the address so the
                    record can say where it was copied from — and emptied by any
                    hand edit below, because then it was not copied from
                    anywhere. */}
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
                    The postcode above goes on its own line, so leave it out
                    here.
                  </p>
                </div>

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
                    Step-free or not, the toilet, the parking, the buses. Each
                    line becomes a bullet beside the address.
                  </p>
                </div>

                {/* Offered, not assumed. It appears only once she has named a
                    place that is not already on the list, and it is off until
                    she says so. */}
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
                        It joins the places above, and fills all four of these
                        in one press.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* The one thing the form cannot tell her about an address is
                whether it is the right one. Same link the public page will
                carry, built in one place (lib/maps), so what she checks is what
                a visitor gets. A plain link out: nothing is asked of Google
                until she presses it. */}
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
                  Opens what is saved, in a new tab &mdash; not what is in the
                  fields above. Worth pressing after any change of address: a
                  postcode can be a real one and still be a mile from the door.
                </p>
              </div>
            )}
          </Section>

          {/* ══ WHAT THE SERVICE IS ═══════════════════════════════════════ */}
          <Section
            id="body-h"
            title="What the service is"
            note="The long part — what happens in the hour, and who it is for"
          >
            <label className="block">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className={LABEL}>The service&rsquo;s own page</span>
                <Needed />
              </span>
              <textarea
                name="body"
                rows={18}
                defaultValue={kept("body", service?.body ?? "")}
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
                defaultValue={kept("filmUrl", service?.filmUrl ?? "")}
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
                  thefieldwork.co.uk/services/
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
                        : (service?.published ?? false)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span>
                    Show this on the site
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                      It needs a picture behind the title and something written.
                      Once it is up, people can read it and write in about it —
                      they cannot pay for it.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={pending}
                  className="t mt-6 min-h-[56px] w-full bg-action px-8 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save this service"}
                </button>
              </div>
            </div>
          </Section>
        </div>
      </form>

      {/* Its own form, and therefore outside the one above — a form nested in
          a form is not valid HTML and the browser drops the inner one. */}
      {service && <DeleteService id={service.id} name={service.name} />}
    </>
  );
}
