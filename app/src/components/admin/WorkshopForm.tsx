"use client";

import { useActionState, useState } from "react";
import {
  addPicture,
  saveWorkshop,
} from "@/app/(admin)/admin/offerings/actions";
import { formatDayLong, refundDeadline, toDateInputValue } from "@/lib/format";
import { MAX_IMAGES, NO_ATTEMPT_YET, slugify } from "@/lib/offering-rules";
import DeleteWorkshop from "./DeleteWorkshop";
import {
  DiaryMargins,
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
import FilmField from "@/components/admin/FilmField";
import GalleryPicker from "@/components/admin/GalleryPicker";

/**
 * The form that writes a workshop.
 *
 * It follows the workshop's own PAGE, in the order people read it — the
 * picture and the name, then the facts, then where it is, then the long body,
 * then the pictures, then putting it up. That order is the design: the form is
 * the page's own shape, so filling it in is imagining the page rather than
 * mapping fields onto one.
 *
 * One sheet, not a stack of panels, and a line of help only where it changes
 * what she types. A paragraph under every field triples the height of the form
 * and buries the fields it was written to serve; where the form can SHOW the
 * consequence instead — the refund deadline, the address the name makes — it
 * shows it and says nothing.
 *
 * The furniture — the field classes, the regions, the picture picker, the word
 * Needed — is in `OfferingFormParts`, shared with the course form so the two
 * sheets stay one sheet.
 */

export type WorkshopFormValues = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  body: string;
  date: Date;
  startTime: string;
  endTime: string;
  venueName: string;
  addressLines: string;
  postcode: string;
  gettingThere: string;
  /** Which saved place filled the four above, if one did. */
  venueId: number | null;
  capacity: number;
  priceGBP: number;
  refundDays: number;
  marginBeforeMinutes: number;
  marginAfterMinutes: number;
  blocksWholeDay: boolean;
  heroImage: string | null;
  heroAlt: string | null;
  /** The Vimeo or YouTube address. The still and the length come from there. */
  filmUrl: string | null;
  published: boolean;
  updatedAt: Date;
  images: { url: string; alt: string; position: number }[];
};

export default function WorkshopForm({
  workshop,
  media,
  venues,
  mapUrl,
}: {
  /** Absent when this is a workshop that does not exist yet. */
  workshop?: WorkshopFormValues;
  /** The pictures already on the site — see lib/media#listMediaBasenames. */
  media: string[];
  /** The places she has used before — see lib/venues#listVenues. */
  venues: VenueChoice[];
  /**
   * The SAVED address, in a map — see lib/maps#mapSearchUrl. Absent on a
   * workshop that does not exist yet, and on one whose place is not set:
   * there is nothing to check until something has been written down.
   */
  mapUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveWorkshop,
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

  const [name, setName] = useState(workshop?.name ?? "");
  const [slug, setSlug] = useState(workshop?.slug ?? "");
  // The address is offered until she overrules it. Once she has typed one,
  // renaming the workshop must not silently move the page out from under a
  // link somebody already has.
  const [slugOwned, setSlugOwned] = useState(Boolean(workshop));
  const [date, setDate] = useState(
    workshop ? toDateInputValue(workshop.date) : "",
  );
  const [refundDays, setRefundDays] = useState(
    String(workshop?.refundDays ?? 14),
  );

  // The two clock times are held here rather than left to the browser, because
  // the diary line below reads them back with the margin already added — "which
  // keeps 09:00 to 17:30 clear" is the sentence she is actually deciding, and it
  // cannot be written from a field the form is not watching.
  const [startTime, setStartTime] = useState(
    kept("startTime", workshop?.startTime ?? ""),
  );
  const [endTime, setEndTime] = useState(
    kept("endTime", workshop?.endTime ?? ""),
  );
  const [marginBefore, setMarginBefore] = useState(
    kept("marginBefore", String(workshop?.marginBeforeMinutes ?? 0)),
  );
  const [marginAfter, setMarginAfter] = useState(
    kept("marginAfter", String(workshop?.marginAfterMinutes ?? 0)),
  );
  const [wholeDay, setWholeDay] = useState(workshop?.blocksWholeDay ?? false);

  // The four address fields are held here rather than left to the browser,
  // because choosing a place has to visibly FILL them — not stand in for them.
  // She can see what it put there and change any of it, which is the one-off
  // case ("we are in the church hall for this one") working by default.
  const [venueName, setVenueName] = useState(
    kept("venueName", workshop?.venueName ?? ""),
  );
  const [addressLines, setAddressLines] = useState(
    kept("addressLines", workshop?.addressLines ?? ""),
  );
  const [postcode, setPostcode] = useState(
    kept("postcode", workshop?.postcode ?? ""),
  );
  const [gettingThere, setGettingThere] = useState(
    kept("gettingThere", workshop?.gettingThere ?? ""),
  );
  // Which place filled them, kept only while its four fields are untouched:
  // once she has edited one, the address on the page is no longer that place's
  // and saying it came from there would be a small lie in the database.
  const [venueId, setVenueId] = useState(
    kept("venueId", workshop?.venueId ? String(workshop.venueId) : ""),
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
  const deadline =
    date && /^\d+$/.test(refundDays)
      ? refundDeadline(new Date(`${date}T00:00:00Z`), Number(refundDays))
      : null;

  // A row only ever exists because a picture exists. There is no "add an empty
  // slot" any more: empty slots standing open ask a question whether or not she
  // has an answer to it, and now that several photographs arrive from one
  // press there is nothing left for an empty one to be for.
  const [imageRows, setImageRows] = useState(() =>
    (workshop?.images ?? []).map((image, index) => ({
      key: index,
      url: image.url,
      alt: image.alt,
    })),
  );
  // A row's number is one past the highest so far, so it never goes back down
  // as rows are taken off: reusing a number would hand a fresh row whatever was
  // typed into the removed one when a save bounces back and redraws the form.
  // Worked out from the rows themselves rather than a counter, because a
  // counter would make this updater impure — and React calls it twice.
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
  const [browsingRail, setBrowsingRail] = useState(false);
  /** How many of a batch would not fit. Said, never silently dropped. */
  const [railOverflow, setRailOverflow] = useState(0);

  // How far through a batch we are, while one is running. Null the rest of the
  // time — there is no such thing here as a picture of what uploading looks
  // like, only the count of an upload actually happening.
  const [adding, setAdding] = useState<{ done: number; of: number } | null>(
    null,
  );
  // The ones that did not make it, named. A batch of six with one bad file in
  // it must land five and say which one it was — losing five good photographs
  // because the sixth was a renamed text file is the failure this prevents.
  const [refused, setRefused] = useState<{ name: string; why: string }[]>([]);
  // What the ceiling turned away, if it turned anything away.
  const [overflow, setOverflow] = useState<{ left: number; of: number } | null>(
    null,
  );

  /**
   * Several photographs, from one press.
   *
   * ONE AT A TIME, deliberately, not all at once. Each picture is decoded and
   * re-encoded six ways by sharp, which is the slowest thing this app does —
   * five in parallel is thirty encodes competing for the same cores, and on a
   * slow machine that is how a request times out and takes the whole batch
   * with it. In sequence, each is its own request that either lands or does
   * not; "3 of 5" is then a true statement rather than an estimate; and the
   * rows arrive in the order the files did, which is the order on the page.
   */
  async function takePictures(input: HTMLInputElement) {
    const picked = [...(input.files ?? [])];
    // Cleared straight away so choosing the same files again — after a refusal
    // she has since fixed — still counts as a change and fires this again.
    input.value = "";
    if (picked.length === 0) return;

    setRefused([]);
    // The ceiling holds, but it takes what fits rather than refusing the lot.
    // Turning away eight photographs because two of them were over the line
    // would be the form correcting her instead of helping her.
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
        {workshop && <input type="hidden" name="id" value={workshop.id} />}

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
              defaultValue={kept("heroImage", workshop?.heroImage ?? "")}
            >
              <p className={HELP}>
                It sits dimmed behind the name, so it wants the mood of the day
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
                  defaultValue={kept("heroAlt", workshop?.heroAlt ?? "")}
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
                  defaultValue={kept("summary", workshop?.summary ?? "")}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className={HELP}>
                Also the line on the workshops list, so it has to make sense on
                its own.
              </p>
              <FieldError error={state.errors.summary} />
            </div>
          </Section>

          {/* ══ THE FACTS ═════════════════════════════════════════════════ */}
          <Section
            id="facts-h"
            title="The facts"
            note="The four lines people look for first"
          >
            <label className="block">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className={LABEL}>Date</span>
                <Needed />
              </span>
              <input
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`${FIELD_FIG} text-[26px] sm:w-auto sm:min-w-[19rem]`}
              />
            </label>
            <FieldError error={state.errors.date} />

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={LABEL}>Starts</span>
                    <Needed />
                  </span>
                  <input
                    name="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={`${FIELD_FIG} text-[21px]`}
                  />
                </label>
                <FieldError error={state.errors.startTime} />
              </div>
              <div>
                <label className="block">
                  <span className={LABEL}>Ends</span>
                  <input
                    name="endTime"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className={`${FIELD_FIG} text-[21px]`}
                  />
                </label>
                <p className={HELP}>
                  Leave this empty and your diary treats the rest of that day as
                  taken — it will not offer anybody an afternoon it cannot be
                  sure of.
                </p>
                <FieldError error={state.errors.endTime} />
              </div>
            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={LABEL}>Price a place</span>
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
                        workshop ? String(workshop.priceGBP / 100) : "",
                      )}
                      className={`${FIELD_FIG} text-[32px]`}
                    />
                  </span>
                </label>
                <p className={HELP}>
                  Per place. Someone booking two pays twice this.
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
                      String(workshop?.capacity ?? 10),
                    )}
                    className={`${FIELD_FIG} text-[32px]`}
                  />
                </label>
                <p className={HELP}>
                  How many the room takes, not how many are sold.
                </p>
                <FieldError error={state.errors.capacity} />
              </div>
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
                  days before the day
                </span>
              </p>
              {/* The consequence of the two fields above, worked out as she
                  types, because "14" and "the last day to cancel is the 6th"
                  are different questions and she is answering the second. It
                  is also the only explanation this field needs. */}
              <p className="mt-3 font-display text-[24px] leading-tight text-ink">
                {!date
                  ? "Set the date and this will say the last day to cancel."
                  : deadline
                    ? `Which makes ${formatDayLong(deadline)} the last day to cancel.`
                    : "Which means places on this day cannot be refunded, and the page says so."}
              </p>
              <FieldError error={state.errors.refundDays} />
            </div>
          </Section>

          {/* ══ IN THE DIARY ══════════════════════════════════════════════ */}
          <Section
            id="diary-h"
            title="In the diary"
            note="What this stops you being asked for"
          >
            <p className="mb-7 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
              A workshop takes its own hours out of your diary already. What you
              set here is the time either side of it that nobody can ask for a
              session in &mdash; and it belongs to this day rather than being a
              rule about all of them, because a full-day retreat and an evening
              talk are not the same drive.
            </p>
            <DiaryMargins
              what="workshop"
              startTime={startTime}
              endTime={endTime}
              before={marginBefore}
              onBefore={setMarginBefore}
              after={marginAfter}
              onAfter={setMarginAfter}
              wholeDay={wholeDay}
              onWholeDay={setWholeDay}
              errors={state.errors}
            />
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
                whether it is the right one. This is the same link the workshop's
                own page carries — one address, built one way (lib/maps) — so
                what she checks here is what a visitor gets. A plain link out:
                nothing is asked of Google until she presses it. */}
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
                so: a day in a church hall she will never use again should not
                join the list she picks from for the next ten workshops. */}
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

          {/* ══ WHAT THE DAY IS ═══════════════════════════════════════════ */}
          <Section
            id="body-h"
            title="What the day is"
            note="The long part — what happens, in the order it happens"
          >
            <label className="block">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className={LABEL}>The workshop&rsquo;s own page</span>
                <Needed />
              </span>
              <textarea
                name="body"
                rows={18}
                defaultValue={kept("body", workshop?.body ?? "")}
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
            {/* One field where there were three. The still it opens on and
                how long it runs belong to the film, and Vimeo and YouTube
                both already know them — so they are read from whichever one
                holds it when this is saved, rather than typed here and left
                to drift. */}
            {/* The field plus a way into the library. `FilmField` owns the
                input itself so a film she has used before can be put into it;
                the name, the value and the server-side parse are unchanged. */}
            <p className={LABEL} id="film-url-label">
              The link to the film
            </p>
            <div className="mt-2" aria-labelledby="film-url-label">
              <FilmField
                name="filmUrl"
                defaultValue={kept("filmUrl", workshop?.filmUrl ?? "")}
                placeholder="https://vimeo.com/76979871"
              />
            </div>
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
                  /* One press, as many photographs as she likes. The same
                     label-around-a-hidden-input as the masthead's, so the two
                     read as one control used twice — the only difference is
                     `multiple`, and that the count replaces the word while a
                     batch is running. */
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

                {/* THE SEVERAL-AT-ONCE ROUTE. A rail takes many pictures, so
                    its picker takes many: each one she ticks becomes a row,
                    in the order she pressed them, up to the ceiling. The
                    single picker on each row is still there for swapping one
                    out. */}
                <button
                  type="button"
                  onClick={() => setBrowsingRail(true)}
                  className={QUIET_BUTTON}
                >
                  Pick from your pictures
                </button>

                {/* Multiple, and capped at whatever room is left — she is told
                  what was dropped rather than silently given fewer. */}
                <GalleryPicker
                  kind="picture"
                  assets={library.map((basename) => ({
                    kind: "picture" as const,
                    ref: basename,
                    title: null,
                    alt: null,
                    contentType: null,
                    bytes: null,
                  }))}
                  multiple
                  open={browsingRail}
                  onClose={() => setBrowsingRail(false)}
                  onPick={(refs) => {
                    const room = Math.max(MAX_IMAGES - imageRows.length, 0);
                    for (const ref of refs.slice(0, room)) appendPicture(ref);
                    setRailOverflow(
                      refs.length > room ? refs.length - room : 0,
                    );
                  }}
                  onAdded={rememberPicture}
                />
                {railOverflow > 0 && (
                  <p
                    role="status"
                    className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-soft"
                  >
                    {railOverflow === 1
                      ? "One of those was left out — "
                      : `${railOverflow} of those were left out — `}
                    {MAX_IMAGES} is as many as a page carries well.
                  </p>
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
                  thefieldwork.co.uk/workshops/
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
                        : (workshop?.published ?? false)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span>
                    Show this on the site
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
                      It needs a picture behind the title and something written
                      before it can go up.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={pending}
                  className="t mt-6 min-h-[56px] w-full bg-action px-8 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save this workshop"}
                </button>
              </div>
            </div>
          </Section>
        </div>
      </form>

      {/* Its own form, and therefore outside the one above — a form nested in
          a form is not valid HTML and the browser drops the inner one. */}
      {workshop && <DeleteWorkshop id={workshop.id} name={workshop.name} />}
    </>
  );
}
