"use client";

import { useActionState, useId, useMemo, useState } from "react";
import {
  requestService,
  type RequestState,
} from "@/app/(site)/services/actions";
import { serviceDetail } from "@/content/services";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";
import type { CalendarMonth, OfferedDayView } from "@/lib/slots";

/**
 * The one blush pool on a service's page — and the whole action of it.
 *
 * `BookingPanel` and `CoursePanel` are its siblings and it is deliberately the
 * same sheet: the facts at the top, the decision in the middle, and what
 * happens next underneath. What it does differently is the only difference
 * that matters between the three kinds — a workshop and a course are BOUGHT,
 * and this is ASKED FOR. So there is no stepper, no total and no card: there
 * is a message, and a person at the other end of it.
 *
 * IT HAS A PICKER NOW (D-26), and the sentence beside it has changed with it.
 * D-24 wrote a textarea where the approved screen's slot picker stood, and said
 * plainly that nothing was held — because there was no diary to hold anything
 * in. There is now: the times below are the ones the SERVER worked out against
 * her whole diary, and choosing one takes it out of what anybody else is
 * offered. So the panel may say "held", and does. It still may not say booked,
 * and does not: she has not answered yet, and nothing has been charged.
 *
 * THE PICKER IS TWO STEPS (D-27) — a month of dates, then the times left on the
 * one that was chosen. It replaces a flat stack that put every half-hour of the
 * next two months on the page at once, ten days of them showing and the rest
 * behind a disclosure. That list was accurate and unreadable: a wall of figures
 * somebody had to walk down to find the two dates they could actually make. A
 * month grid answers the question they arrived with — CAN SHE DO THE THIRD —
 * and it answers it for the days she CANNOT do just as plainly, by drawing them
 * and crossing them off rather than leaving them out. A calendar with every
 * date dead would be a worse answer than a sentence, which is why the words
 * path below still exists.
 *
 * THE BROWSER DOES NO ARITHMETIC. It is handed days in words, clock times in
 * words and a grid of numbered cells worked out in `lib/slots.ts`, and posts
 * back an opaque value it never reads. It matches a date to its times by
 * comparing two keys and reads into neither. A picker that worked out its own
 * times would show somebody in Madrid eleven o'clock for her ten, and would
 * still be wrong here on the two mornings a year the clocks move — and one that
 * worked out its own calendar would be wrong about February every fourth year.
 *
 * IT NEEDS SCRIPT NOW, AND SAYS SO HERE RATHER THAN QUIETLY. The step is React
 * state because CSS can reveal one day's times but cannot let go of the time
 * already chosen under a different date — and a form that posts half past ten
 * on a day nobody is looking at is worse than a long list. So WITHOUT SCRIPT
 * the two steps collapse back into the one list they replaced: the `<noscript>`
 * rule below hides the calendar and shows every day at once, which is the panel
 * D-26 shipped, working exactly as it did. Every time on offer is in the
 * delivered HTML either way.
 *
 * THE WORDS PATH IS NOT GONE. A service with no days set, and one whose next two
 * months are full, both come through with no times to offer — and then this is
 * the panel D-24 built, sentence for sentence, because for that conversation
 * every one of them is still true.
 *
 * A CLIENT COMPONENT for the reason the other two panels are: it holds the
 * result of one submission and has to draw the errors against the fields they
 * belong to. It renders WHOLE on the server before any of that — the fields,
 * the labels, the calendar on the month of the soonest free date, that date's
 * times, the notes and the button are all in the delivered HTML, so a static
 * screenshot of this page is the finished composition and not an empty card
 * waiting for script.
 */

/**
 * The state before anything has been submitted.
 *
 * Declared here rather than imported from the action beside it, because a
 * "use server" module may only export async functions — a const exported from
 * one arrives here as `undefined`, and nothing says so until the first render
 * reads a field off it. The TYPE still comes from the action, so the two
 * cannot drift in shape.
 */
const EMPTY: RequestState = { errors: {}, error: null, sent: false };

const LABEL =
  "fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft";
const NOTE = "mt-1.5 block text-[15px] leading-relaxed text-ink-soft";
const FIELD =
  "mt-2.5 block w-full border border-pool-rule bg-transparent px-4 py-3 text-[19px] leading-relaxed text-ink placeholder:text-ink-soft/60";

/** The ring both steps' chosen cell wears. One definition, so they match. */
const PICKED =
  "has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:text-pool has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

/** A date she can do. Bordered, so the live ones read as pressable. */
const DATE_OPEN = `t flex min-h-[44px] cursor-pointer items-center justify-center border border-pool-rule text-[16px] tabular-nums text-ink hover:border-ink ${PICKED}`;

/**
 * A date she cannot. DRAWN AND CROSSED OFF rather than left out: somebody
 * looking at this is reading the shape of her week, and a gap where a Tuesday
 * should be tells them nothing. No border, because there is nothing to press.
 */
const DATE_SHUT =
  "flex min-h-[44px] items-center justify-center text-[16px] tabular-nums text-ink-soft line-through";

const MONTH_STEP =
  "t flex min-h-[44px] min-w-[44px] items-center justify-center border border-pool-rule text-[18px] text-ink hover:border-ink disabled:cursor-default disabled:text-ink-soft disabled:opacity-50 disabled:hover:border-pool-rule";

/** Monday first — the British week, in the order `WEEKDAYS` in lib/slots reads it. */
const COLUMNS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * One of her days, and what is left of it.
 *
 * RADIO BUTTONS, hidden and worn as chips. The times are a choice of one, and a
 * radio group is what a browser and a screen reader both already understand:
 * arrow keys move between them, the label announces the day it is under, and
 * the whole thing works with the form's own submit. `sr-only` rather than
 * `hidden`, because a hidden input cannot be focused, and the focus ring below
 * is drawn from the input.
 *
 * CONTROLLED, which the flat list did not need to be. Choosing a date has to be
 * able to let go of a time chosen under a different one, and `checked` is the
 * only way to say that — CSS can hide the old chip but cannot un-press it, and
 * an unpressed-looking chip that still posts is the worst of the three.
 *
 * NOTHING IS `required` ANY MORE, and that is not an oversight. A radio group
 * is required as a whole and the browser reports it on the first radio in the
 * group — which, once the other days are display:none, is usually not on screen.
 * Chrome then refuses to submit and tells nobody why. The server has always
 * answered the empty case in a sentence, and it is drawn against this fieldset.
 */
function Day({
  day,
  chosen,
  onChoose,
}: {
  day: OfferedDayView;
  chosen: string | null;
  onChoose: (value: string) => void;
}) {
  return (
    <div>
      <p className="fig font-mono text-[14px] uppercase tracking-[0.1em] text-ink-soft">
        {day.words}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {day.slots.map((slot) => (
          <label
            key={slot.value}
            className={`t inline-flex min-h-[44px] cursor-pointer items-center border border-pool-rule px-4 text-[17px] tabular-nums text-ink hover:border-ink ${PICKED}`}
          >
            <input
              type="radio"
              name="slot"
              value={slot.value}
              checked={chosen === slot.value}
              onChange={() => onChoose(slot.value)}
              aria-label={`${day.words} at ${slot.clock}`}
              className="sr-only"
            />
            {slot.clock}
          </label>
        ))}
      </div>
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="mt-2 border-l-2 border-pool-error pl-3 text-[16px] leading-relaxed text-pool-error">
      {error}
    </p>
  );
}

export default function RequestPanel({
  slug,
  serviceName,
  days,
  months,
}: {
  slug: string;
  /** Named on the button, so a page open in a second tab cannot be confused. */
  serviceName: string;
  /**
   * The times on offer when this page was drawn, worked out on the server. It
   * can be empty, and that is an answer rather than a failure — see the panel.
   */
  days: OfferedDayView[];
  /**
   * The calendar's shape — every date inside the booking window, whether she
   * can do it or not. Separate from `days` because it does not change when a
   * slot goes, and a refusal replaces the times without redrawing the grid.
   */
  months: CalendarMonth[];
}) {
  const [state, submit, pending] = useActionState<RequestState, FormData>(
    requestService,
    EMPTY,
  );
  const id = useId();
  const panel = serviceDetail.panel;

  /** The date whose times are showing. Null until somebody chooses one. */
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  /** The time itself, held here so that changing the date can let go of it. */
  const [chosenSlot, setChosenSlot] = useState<string | null>(null);
  /** The month on screen, when it is not simply the chosen date's own. */
  const [paged, setPaged] = useState<number | null>(null);

  // A refused submission sends the times back as they are NOW, so being told
  // "that one went" and being shown what is left happen together.
  const offered = state.days ?? days;
  const picking = offered.length > 0;

  /**
   * Which dates are live, for the grid to look each of its cells up in.
   *
   * A SET RATHER THAN A SEARCH because the grid asks up to thirty-one times per
   * draw and the answer changes only when the offered days do.
   */
  const free = useMemo(
    () => new Set(offered.map((day) => day.dayKey)),
    [offered],
  );

  /**
   * The day being shown, DERIVED rather than kept in step with the choice.
   *
   * A refused submission comes back with a fresh list, and the date somebody
   * chose may not be on it any more — the hour they wanted was the last one
   * left on it. Falling back to the soonest free date is how the panel returns
   * with something to look at instead of an empty second step, and deriving it
   * is why there is no effect here reconciling two copies of the same fact.
   */
  const showing =
    offered.find((day) => day.dayKey === chosenDate) ?? offered[0] ?? null;

  // Found by looking the date up rather than by reading its key apart. The
  // browser does no arithmetic here either, not even on a string.
  const itsMonth = months.findIndex((month) =>
    month.dates.some((date) => date.dayKey === showing?.dayKey),
  );
  const monthIndex = paged ?? Math.max(0, itsMonth);
  const month = months[monthIndex];

  // When the form was drawn, for the guard's clock. Fixed at mount rather than
  // read at submit, because the question it answers is "how long did this take
  // to fill in" — and useMemo with no deps is the honest way to say "once".
  const drawnAt = useMemo(() => String(Date.now()), []);

  if (state.sent) {
    return (
      <aside id="ask" className="lg:pt-20" aria-labelledby={`${id}-sent`}>
        <div className="pool on-pool sticky top-8 px-7 py-8 sm:px-9">
          <h2
            id={`${id}-sent`}
            className="font-display text-[30px] font-normal leading-tight text-ink"
          >
            {panel.sentTitle}
          </h2>
          <p className="mt-5 text-[19px] leading-relaxed text-ink">
            {picking ? panel.sentBodyPicking : panel.sentBody}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
            {panel.sentCheck}
          </p>
          <a
            href="/services"
            className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool"
          >
            {panel.sentAgain}
          </a>
        </div>
      </aside>
    );
  }

  return (
    <aside id="ask" className="lg:pt-20" aria-labelledby={`${id}-h`}>
      <div className="pool on-pool sticky top-8 px-7 py-8 sm:px-9">
        <h2
          id={`${id}-h`}
          className="font-display text-[30px] font-normal leading-tight text-ink"
        >
          {panel.title}
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-ink">
          {picking ? panel.ledePicking : panel.lede}
        </p>

        <form
          action={submit}
          className="mt-7"
          aria-label={`Ask about ${serviceName}`}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name={DRAWN_AT_FIELD} value={drawnAt} />

          {/* The trap. Clipped by `.vh`, the same visually-hidden class the
              rest of these pages use, rather than display:none — a filler that
              skips hidden inputs still fills this one — and taken out of the
              tab order and out of the accessibility tree so nobody using a
              keyboard or a screen reader can land in it by accident. */}
          <div className="vh" aria-hidden="true">
            <label htmlFor={`${id}-hp`}>Your website — leave this empty</label>
            <input
              id={`${id}-hp`}
              name={HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor={`${id}-name`} className={LABEL}>
              {panel.nameLabel}
            </label>
            <input
              id={`${id}-name`}
              name="name"
              type="text"
              required
              autoComplete="name"
              maxLength={120}
              aria-invalid={state.errors.name ? true : undefined}
              className={FIELD}
            />
            <FieldError error={state.errors.name} />
          </div>

          <div className="mt-6">
            <label htmlFor={`${id}-email`} className={LABEL}>
              {panel.emailLabel}
            </label>
            <span className={NOTE}>{panel.emailNote}</span>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={200}
              aria-invalid={state.errors.email ? true : undefined}
              className={FIELD}
            />
            <FieldError error={state.errors.email} />
          </div>

          <div className="mt-6">
            <label htmlFor={`${id}-phone`} className={LABEL}>
              {panel.phoneLabel}{" "}
              <span className="normal-case tracking-normal">
                ({panel.optional})
              </span>
            </label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={60}
              aria-invalid={state.errors.phone ? true : undefined}
              className={FIELD}
            />
            <FieldError error={state.errors.phone} />
          </div>

          {/* THE PICKER, or the words that stand where it would be. Exactly one
              of the two is rendered, so only one of them can post — a form
              carrying both would let a chosen slot arrive with a sentence
              beside it saying something else. */}
          {picking ? (
            <>
              {/* THE PANEL WITHOUT SCRIPT. The calendar goes, every day's times
                  come back at once, and what is left is the flat list D-26
                  shipped — which worked, and still does. `!important` because
                  these have to beat a utility class that says display:none, and
                  written as raw markup because React treats the inside of a
                  <noscript> as text when script is running. */}
              <noscript
                dangerouslySetInnerHTML={{
                  __html:
                    "<style>.pick-cal{display:none!important}" +
                    ".pick-day{display:block!important}" +
                    ".pick-day+.pick-day{margin-top:1.25rem}</style>",
                }}
              />

              {/* ── STEP ONE: the date ──────────────────────────────────────
                  Radios rather than buttons, because a month of dates IS a
                  choice of one and a radio group is what a keyboard and a
                  screen reader already know how to walk. A date she cannot do
                  is `disabled` — announced as unavailable rather than merely
                  drawn faintly — and its label says so in words as well. */}
              <fieldset className="pick-cal mt-6">
                <legend className={LABEL}>{panel.pickDateLabel}</legend>
                <span className={NOTE}>{panel.pickDateNote}</span>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPaged(monthIndex - 1)}
                    disabled={monthIndex === 0}
                    aria-label={panel.pickMonthBack}
                    className={MONTH_STEP}
                  >
                    <span aria-hidden="true">&larr;</span>
                  </button>
                  {/* Announced when it changes, because pressing an arrow is
                      otherwise a silent event to anybody not looking at it. */}
                  <span
                    aria-live="polite"
                    className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink"
                  >
                    {month.words}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaged(monthIndex + 1)}
                    disabled={monthIndex === months.length - 1}
                    aria-label={panel.pickMonthOn}
                    className={MONTH_STEP}
                  >
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>

                {/* Hidden from assistive tech: every cell below carries its own
                    weekday in its label, so reading this row out first is the
                    same seven words twice. */}
                <div
                  aria-hidden="true"
                  className="mt-4 grid grid-cols-7 gap-[2px]"
                >
                  {COLUMNS.map((column) => (
                    <span
                      key={column}
                      className="fig text-center font-mono text-[12px] uppercase tracking-[0.08em] text-ink-soft"
                    >
                      {column}
                    </span>
                  ))}
                </div>

                <div className="mt-[2px] grid grid-cols-7 gap-[2px]">
                  {Array.from({ length: month.before }, (_, cell) => (
                    <span key={`blank-${cell}`} aria-hidden="true" />
                  ))}
                  {month.dates.map((date) => {
                    const open = free.has(date.dayKey);
                    return (
                      <label
                        key={date.dayKey}
                        className={open ? DATE_OPEN : DATE_SHUT}
                      >
                        <input
                          type="radio"
                          name="date"
                          value={date.dayKey}
                          disabled={!open}
                          checked={showing?.dayKey === date.dayKey}
                          onChange={() => {
                            setChosenDate(date.dayKey);
                            // The time belonged to the date it sat under.
                            setChosenSlot(null);
                          }}
                          aria-label={
                            open
                              ? date.words
                              : `${date.words} — ${panel.pickNothingFree}`
                          }
                          className="sr-only"
                        />
                        <span aria-hidden="true">{date.number}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* ── STEP TWO: the times on it ───────────────────────────────
                  Every day is here in the delivered HTML; all but the chosen
                  one are display:none, which takes them out of the tab order
                  and out of the accessibility tree as well as off the screen. */}
              <fieldset className="mt-6">
                <legend className={LABEL}>{panel.pickLabel}</legend>
                <span className={NOTE}>{panel.pickNote}</span>

                {/* The times appearing below is a visible event and otherwise a
                    silent one. Said once, plainly, and read out on the change. */}
                <p className="vh" role="status">
                  {showing
                    ? `${showing.words} — ${showing.slots.length} ${
                        showing.slots.length === 1 ? "time" : "times"
                      } to choose from`
                    : ""}
                </p>

                <div className="mt-4">
                  {offered.map((day) => (
                    <div
                      key={day.dayKey}
                      className={
                        day.dayKey === showing?.dayKey
                          ? "pick-day"
                          : "pick-day hidden"
                      }
                    >
                      <Day
                        day={day}
                        chosen={chosenSlot}
                        onChoose={setChosenSlot}
                      />
                    </div>
                  ))}
                </div>

                <FieldError error={state.errors.slot} />
              </fieldset>
            </>
          ) : (
            <div className="mt-6">
              {/* Said before the field rather than after it, so nobody fills in
                  a textarea wondering why there was no calendar. */}
              <p className="border-l-2 border-pool-rule pl-4">
                <span className="block text-[17px] font-semibold text-ink">
                  {panel.pickNoneTitle}
                </span>
                <span className="mt-1 block text-[16px] leading-relaxed text-ink-soft">
                  {panel.pickNoneBody}
                </span>
              </p>

              <label htmlFor={`${id}-when`} className={`${LABEL} mt-6 block`}>
                {panel.whenLabel}
              </label>
              <span className={NOTE}>{panel.whenNote}</span>
              <textarea
                id={`${id}-when`}
                name="preferredTime"
                required
                rows={2}
                maxLength={500}
                placeholder={panel.whenPlaceholder}
                aria-invalid={state.errors.preferredTime ? true : undefined}
                className={FIELD}
              />
              <FieldError error={state.errors.preferredTime} />
            </div>
          )}

          <div className="mt-6">
            <label htmlFor={`${id}-message`} className={LABEL}>
              {panel.messageLabel}{" "}
              <span className="normal-case tracking-normal">
                ({panel.optional})
              </span>
            </label>
            <span className={NOTE}>{panel.messageNote}</span>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={4}
              maxLength={4000}
              aria-invalid={state.errors.message ? true : undefined}
              className={FIELD}
            />
            <FieldError error={state.errors.message} />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="t mt-8 min-h-[56px] w-full bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
          >
            {pending ? panel.sending : panel.submit}
          </button>

          {state.error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-pool-error bg-pool-error/10 px-4 py-3 text-[17px] leading-relaxed text-ink"
            >
              {state.error}
            </p>
          )}

          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            {panel.foot}
          </p>
        </form>
      </div>
    </aside>
  );
}
