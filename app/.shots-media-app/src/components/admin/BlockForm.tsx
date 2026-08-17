"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  addBlock,
  removeBlock,
  type BlockState,
} from "@/app/(admin)/admin/calendar/actions";

/**
 * Taking time out of her own diary, and putting it back.
 *
 * THE ONLY WRITE ON THE CALENDAR. Everything else the month draws is owned by a
 * screen of its own, and this is the one thing that belongs nowhere else: it has
 * no page, no price, nobody at the other end of it, and it exists only to stop
 * a Thursday afternoon being offered.
 *
 * THREE FIELDS AND A TICK. A day, a time range, and a word for what it is —
 * which is what was actually asked for. What it is NOT is a second calendar: no
 * repeat, no attendees, no reminder. A block that recurs would need an
 * expansion, a list of exceptions and a screen to manage both, and nothing here
 * needs one — a fortnight away is a start day, a last day, and "Wales".
 *
 * A CLIENT COMPONENT because it holds the result of one submission and has to
 * clear itself after a good one. It renders whole on the server first: every
 * field is in the delivered HTML, and the form posts and works without script.
 */

const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const FIELD =
  "mt-2 min-h-[48px] w-full border border-pool-rule bg-transparent px-4 py-2 text-[19px] text-ink focus:border-action focus:outline-none";
const FIG = `${FIELD} fig font-mono tabular-nums`;
const HELP = "mt-2 text-[15px] leading-relaxed text-ink-soft";

const NOTHING: BlockState = { error: null, done: 0 };

export function BlockForm({ day }: { day: string }) {
  const [state, action, pending] = useActionState(addBlock, NOTHING);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();

  const [allDay, setAllDay] = useState(false);
  const [spread, setSpread] = useState(false);

  // Cleared only on a good one. A submission that bounced keeps what she typed,
  // because the thing that was wrong with it is usually one field.
  useEffect(() => {
    if (state.done) {
      form.current?.reset();
      setAllDay(false);
      setSpread(false);
    }
  }, [state.done]);

  return (
    <form ref={form} action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Day</span>
          <input
            name="day"
            type="date"
            required
            defaultValue={day}
            className={FIG}
          />
        </label>

        <label className="block">
          <span className={LABEL}>What it is</span>
          <input
            name="reason"
            type="text"
            required
            maxLength={200}
            placeholder="Dentist"
            className={FIELD}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
            className="h-5 w-5 accent-action"
          />
          <span className="text-[18px] text-ink">The whole day</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={spread}
            onChange={(event) => setSpread(event.target.checked)}
            className="h-5 w-5 accent-action"
          />
          <span className="text-[18px] text-ink">
            It runs over several days
          </span>
        </label>
      </div>

      {/* The times are RENDERED AWAY on the whole-day branch rather than
          disabled, so they cannot post at all — the same rule the service form's
          two location branches follow. A disabled field that still submits is
          the bug this avoids by construction. */}
      {!allDay && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>From</span>
            <input
              name="from"
              type="time"
              required
              defaultValue="09:00"
              className={FIG}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Until</span>
            <input
              name="to"
              type="time"
              required
              defaultValue="12:00"
              className={FIG}
            />
          </label>
        </div>
      )}

      {spread && (
        <label className="mt-5 block max-w-[20rem]">
          <span className={LABEL}>Last day it covers</span>
          <input name="until" type="date" className={FIG} />
          <span className={HELP}>Leave this and it is the one day above.</span>
        </label>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          disabled={pending}
          className="t min-h-[52px] bg-action px-8 py-3 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
        >
          {pending ? "Blocking…" : "Block this time"}
        </button>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Nobody is offered a session inside it. Nothing already booked is
          touched.
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          id={`${id}-error`}
          className="mt-4 max-w-[54ch] text-[17px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

/**
 * Giving one back — one button, no confirmation.
 *
 * The bookings page guards every destructive control with a modal, and every one
 * of those is somebody else's money or somebody else's place. This is her own
 * note to herself, and re-making one is three fields; a dialog in front of it
 * would be ceremony around nothing.
 */
export function UnblockButton({ id, reason }: { id: number; reason: string }) {
  const [state, action, pending] = useActionState(removeBlock, NOTHING);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Give back the time blocked for ${reason}`}
        className="t min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink disabled:opacity-60"
      >
        {pending ? "Removing…" : "Give it back"}
      </button>
      {state.error && (
        <span role="alert" className="ml-3 text-[15px] text-pool-error">
          {state.error}
        </span>
      )}
    </form>
  );
}
