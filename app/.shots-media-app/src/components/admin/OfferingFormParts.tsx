"use client";

import { useState, type ReactNode } from "react";
import { addPicture } from "@/app/(admin)/admin/offerings/actions";
import GalleryPicker from "@/components/admin/GalleryPicker";
import { clockOfMinutes, minutesOfClock } from "@/lib/london";

/**
 * The pieces both offering forms are built from.
 *
 * A workshop and a course are written on the same sheet: hairline-separated
 * regions in the order the page reads, a line of help only where it changes
 * what she types, and one word — Needed — for the fields that stop it going
 * live. Those are decisions about the portal, not about workshops, so they are
 * made once here.
 *
 * The two forms themselves stay separate files. What differs between them is
 * which fields exist and what the words beside them say, and a single
 * component parameterised into covering both would be harder to read than
 * either.
 */

export const FIELD =
  "min-h-[48px] w-full border-b border-pool-rule bg-transparent py-2 text-[19px] text-ink focus:border-action focus:outline-none";
export const FIELD_BIG = `${FIELD} font-display text-[28px]`;
export const FIELD_FIG = `${FIELD} fig font-mono tabular-nums`;
export const LABEL =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
export const HELP =
  "mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft";
const NEEDED =
  "fig font-mono text-[13px] uppercase tracking-[0.14em] text-action";
/* Ink, not gold and not magenta. Gold fails contrast inside a panel
   (admin.css), and magenta is spoken for — it is what "Needed" and the save
   button are saying. A heading that borrows the alarm colour makes six more
   alarms. */
const SECTION_EYEBROW =
  "fig font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-ink";
const SECTION_NOTE = "fig font-mono text-[15px] text-ink-soft";
export const QUIET_BUTTON =
  "t min-h-[48px] border border-pool-rule px-6 text-[17px] font-medium text-ink hover:bg-ink hover:text-pool";

/**
 * A place she has used before, as the forms need it: the four fields it fills
 * in, and the id that records which one filled them.
 *
 * Declared here rather than imported from `lib/venues` because that module is
 * server-only and this file runs in the browser. The shapes match; the pages
 * hand rows straight across.
 */
export type VenueChoice = {
  id: number;
  name: string;
  addressLines: string;
  postcode: string;
  gettingThere: string;
};

/** The address a picture's derivatives are served from (D-6). */
export function mediaSrc(basename: string): string {
  return `/media/${basename}-1200.jpg`;
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 max-w-[44ch] text-[15px] text-pool-error">
      {error}
    </p>
  );
}

export function Needed() {
  return <span className={NEEDED}>Needed</span>;
}

/**
 * One region of the page, on the one sheet.
 *
 * A hairline and a wide gap divide the regions instead of a panel each. Six
 * hard-cut panels stacked read as six separate errands; the offering is one.
 */
export function Section({
  id,
  title,
  note,
  first,
  children,
}: {
  id: string;
  title: string;
  note: string;
  /** The first region opens the sheet, so it takes no rule above it. */
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={first ? "" : "mt-11 border-t border-pool-rule/40 pt-9"}
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2 id={id} className={SECTION_EYEBROW}>
          {title}
        </h2>
        <p className={SECTION_NOTE}>{note}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * What this takes out of the diary — the margin either side, or the whole day.
 *
 * ONE COMPONENT FOR BOTH FORMS, because it is one question asked twice and the
 * answer has to mean the same thing in both places. A workshop sets it for its
 * day; a course sets it once for every date of its run.
 *
 * THE READBACK IS THE POINT. "60" is not what she is deciding — "which keeps
 * 09:00 to 17:30 clear" is, and that sentence is what stops an afternoon
 * disappearing from the site for a reason nobody can find later. It is the same
 * move the refund field makes with its deadline and the duration field makes
 * with its hours, and it is the only explanation either number needs.
 */
export function DiaryMargins({
  what,
  startTime,
  endTime,
  before,
  onBefore,
  after,
  onAfter,
  wholeDay,
  onWholeDay,
  errors,
}: {
  /** "workshop" or "course" — the only thing that differs in the wording. */
  what: "workshop" | "course";
  startTime: string;
  endTime: string;
  before: string;
  onBefore: (value: string) => void;
  after: string;
  onAfter: (value: string) => void;
  wholeDay: boolean;
  onWholeDay: (value: boolean) => void;
  errors: Record<string, string>;
}) {
  const dates = what === "course" ? "every date of this run" : "this day";

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block">
            <span className={LABEL}>Kept clear before</span>
            <span className="flex items-baseline gap-3">
              <input
                name="marginBefore"
                type="number"
                min={0}
                inputMode="numeric"
                value={before}
                onChange={(event) => onBefore(event.target.value)}
                className={`${FIELD_FIG} w-28 text-[28px]`}
              />
              <span className="text-[18px] text-ink-soft">minutes</span>
            </span>
          </label>
          <p className={HELP}>Getting there, and setting up.</p>
          <FieldError error={errors.marginBefore} />
        </div>

        <div>
          <label className="block">
            <span className={LABEL}>Kept clear after</span>
            <span className="flex items-baseline gap-3">
              <input
                name="marginAfter"
                type="number"
                min={0}
                inputMode="numeric"
                value={after}
                onChange={(event) => onAfter(event.target.value)}
                className={`${FIELD_FIG} w-28 text-[28px]`}
              />
              <span className="text-[18px] text-ink-soft">minutes</span>
            </span>
          </label>
          <p className={HELP}>Packing down, and getting home.</p>
          <FieldError error={errors.marginAfter} />
        </div>
      </div>

      {/* Its own question rather than "margin = a very large number", because it
          means something different: a retreat is not a short thing with a wide
          margin, it is a day that has gone. */}
      <label className="mt-7 flex items-start gap-3">
        <input
          type="checkbox"
          name="blocksWholeDay"
          checked={wholeDay}
          onChange={(event) => onWholeDay(event.target.checked)}
          className="mt-1 h-5 w-5 accent-action"
        />
        <span>
          <span className="block text-[19px] text-ink">
            This takes the whole day
          </span>
          <span className={HELP}>
            For a retreat, or anything you would not want a session either side
            of. The two figures above are ignored while this is ticked, and kept
            in case you untick it.
          </span>
        </span>
      </label>

      <p className="mt-6 font-display text-[24px] leading-tight text-ink">
        {claimSentence({ startTime, endTime, before, after, wholeDay, dates })}
      </p>
    </>
  );
}

/** The one sentence `DiaryMargins` exists to be able to say. */
function claimSentence({
  startTime,
  endTime,
  before,
  after,
  wholeDay,
  dates,
}: {
  startTime: string;
  endTime: string;
  before: string;
  after: string;
  wholeDay: boolean;
  dates: string;
}): string {
  if (wholeDay) {
    return `The whole of ${dates} is taken, so nobody can be offered a session on it whatever time this runs.`;
  }

  const start = minutesOfClock(startTime);
  if (start === null) {
    return "Put the times in above and this will say what it keeps clear.";
  }

  const marginBefore = whole(before);
  const marginAfter = whole(after);

  const opens =
    start - marginBefore < 0
      ? "the start of the day"
      : clockOfMinutes(start - marginBefore);

  // No end time is not a missing figure to guess at — it is a stated
  // consequence, and this is where it is stated. The diary treats the rest of
  // the day as taken rather than offering an afternoon on the strength of an
  // assumption about how long this runs.
  const end = minutesOfClock(endTime);
  if (end === null) {
    return `There is no end time on this, so ${opens} to the end of ${dates} is kept clear.`;
  }

  const closes =
    end + marginAfter >= 24 * 60
      ? "the end of the day"
      : clockOfMinutes(end + marginAfter);

  if (marginBefore === 0 && marginAfter === 0) {
    return `Only the hours themselves are taken — ${opens} to ${closes}, on ${dates}.`;
  }
  return `Which keeps ${opens} to ${closes} clear, on ${dates}.`;
}

/** A number field's value as a number. Anything else is none. */
function whole(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value) : 0;
}

/**
 * A picture — off her computer, one picked out of the library by eye, or one
 * chosen from the list by name.
 *
 * The file goes up the moment she chooses it, so the picture appears here
 * before she writes the line saying what is in it, and a save that bounces
 * cannot throw the upload away with it. What comes back is a BASENAME, and
 * that is what the field posts: the path her file had on her own machine is
 * never sent anywhere and never becomes part of an address.
 *
 * THREE WAYS IN AND ONE VALUE BETWEEN THEM. Choosing a file, picking from the
 * gallery and choosing from the list all set the same field, so uploading a
 * picture selects it — there is no second step where she has to find what she
 * just added.
 *
 * THE GALLERY IS THE ONE TO REACH FOR AND THE LIST IS KEPT ANYWAY. A dropdown
 * of basenames is a list of file names pretending to be a list of pictures, and
 * choosing a photograph by reading
 * `whatsapp image 2026 08 07 at 16 45 48 3` is not choosing it at all — which is
 * the whole reason `GalleryPicker` exists. The `<select>` stays beside it
 * because it is a real keyboard and screen-reader path to the same value, and
 * because a name she has just typed is sometimes genuinely the fastest route
 * back to it. Two controls, one field, no order of precedence.
 */
export function PicturePicker({
  name,
  label,
  library,
  onAdded,
  defaultValue,
  value,
  onChange,
  children,
}: {
  name: string;
  label: ReactNode;
  /** Every picture on the site, growing as she adds to it. */
  library: string[];
  onAdded: (basename: string) => void;
  defaultValue: string;
  /**
   * CONTROLLED MODE, for a caller that holds the choice itself.
   *
   * The offering forms do not: a picture there is one field on a form the
   * browser owns, and this component holding it is the whole of the state.
   * The newsletter editor DOES — its blocks are a list it adds to, removes
   * from and reorders, and a choice living in a child of a row that can move
   * is a choice that goes with the wrong row. Passing `value` makes the
   * caller's copy authoritative; leaving it off keeps the old behaviour
   * exactly.
   */
  value?: string;
  onChange?: (basename: string) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState(defaultValue);
  const chosen = value ?? own;
  const setChosen = (next: string) => {
    setOwn(next);
    onChange?.(next);
  };
  const [adding, setAdding] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /** "You already have this picture…" — a fact rather than a refusal. */
  const [held, setHeld] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  async function take(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    // Cleared straight away so choosing the same file twice — after a refusal
    // she has since fixed — still counts as a change and fires this again.
    input.value = "";

    setAdding(true);
    setRefused(null);
    setHeld(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const result = await addPicture(body);
      if (!result.ok) {
        setRefused(result.error);
        return;
      }
      // Already here: the basename that came back is the copy she has, and
      // `setChosen` below puts THAT one in the field. She wanted this
      // photograph on this page; she has it.
      setHeld(result.alreadyHeld);
      onAdded(result.basename);
      setChosen(result.basename);
    } catch {
      setRefused(
        "The picture did not get there. Check the connection and try again.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-full max-w-[300px] shrink-0">
        {chosen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(chosen)}
            alt=""
            className="h-[169px] w-full object-cover"
          />
        ) : (
          <p className="flex h-[169px] w-full items-center justify-center border border-dashed border-pool-rule px-6 text-center text-[17px] text-ink-soft">
            No picture yet
          </p>
        )}
      </div>
      <div className="min-w-[17rem] flex-1">
        <p className={LABEL} id={`${name}-label`}>
          {label}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* A label around a visually-hidden file input: the browser's own
              control, which cannot be styled, wearing the same button as the
              rest of the form. `sr-only` rather than `hidden`, because a
              hidden input cannot be reached by keyboard — the ring below is
              drawn from the input's focus so it still can. */}
          <label
            className={`${QUIET_BUTTON} inline-flex cursor-pointer items-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={adding}
              onChange={(event) => take(event.currentTarget)}
              className="sr-only"
            />
            {adding ? "Adding…" : "Choose a picture"}
          </label>

          {/* The by-eye route. `type="button"` because this control is used
              inside three forms and a bare button inside a form submits it. */}
          <button
            type="button"
            onClick={() => setBrowsing(true)}
            className={QUIET_BUTTON}
          >
            Pick from your pictures
          </button>

          <select
            name={name}
            aria-labelledby={`${name}-label`}
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            className={`${FIELD} w-auto min-w-[13rem] flex-1`}
          >
            <option value="">No picture</option>
            {library.map((basename) => (
              <option key={basename} value={basename}>
                {basename.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </div>
        {refused && (
          <p
            role="alert"
            className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-pool-error"
          >
            {refused}
          </p>
        )}
        {/* Not an alert: the picture is already in the field beside this. */}
        {held && (
          <p
            role="status"
            className="mt-2 max-w-[44ch] border-l-2 border-action pl-3 text-[15px] leading-relaxed text-ink"
          >
            {held}
          </p>
        )}
        {children}
      </div>

      {/* SINGLE, because every caller of this component wants exactly one
          picture: a hero, a masthead background, or one row of a rail that
          holds its own several. The rails offer their own multiple picker
          alongside their "add more pictures" control. */}
      <GalleryPicker
        kind="picture"
        assets={library.map((basename) => ({
          kind: "picture" as const,
          ref: basename,
          title: null,
          contentType: null,
          bytes: null,
        }))}
        open={browsing}
        chosen={chosen ? [chosen] : []}
        onClose={() => setBrowsing(false)}
        onPick={(refs) => {
          if (refs[0]) setChosen(refs[0]);
        }}
        onAdded={onAdded}
      />
    </div>
  );
}
