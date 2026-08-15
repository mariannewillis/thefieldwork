"use client";

import { useActionState, useId, useMemo } from "react";
import {
  requestService,
  type RequestState,
} from "@/app/(site)/services/actions";
import { serviceDetail } from "@/content/services";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";

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
 * WHAT IT PROMISES, IT PROMISES IN THREE PLACES, because this is exactly the
 * thing somebody will read the way they expect rather than the way it is
 * written. Above the fields, on the button's own note, and again on the sent
 * screen: a reply is coming, nothing is booked, no time is held. The approved
 * screen says "held for you · 9:47 remaining" beside a countdown; there is no
 * hold behind that sentence and there is no availability to build one from
 * (D-24), so it is not said here.
 *
 * A CLIENT COMPONENT for the reason the other two panels are: it holds the
 * result of one submission and has to draw the errors against the fields they
 * belong to. It renders WHOLE on the server before any of that — the fields,
 * the labels, the notes and the button are all in the delivered HTML, so a
 * static screenshot of this page is the finished composition and not an empty
 * card waiting for script.
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
}: {
  slug: string;
  /** Named on the button, so a page open in a second tab cannot be confused. */
  serviceName: string;
}) {
  const [state, submit, pending] = useActionState<RequestState, FormData>(
    requestService,
    EMPTY,
  );
  const id = useId();
  const panel = serviceDetail.panel;

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
            {panel.sentBody}
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
          {panel.lede}
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

          {/* WHERE THE SLOT PICKER WOULD BE. It asks for words, and the note
              under it says there is no calendar — so nobody types a time and
              walks away believing they have taken it. */}
          <div className="mt-6">
            <label htmlFor={`${id}-when`} className={LABEL}>
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
