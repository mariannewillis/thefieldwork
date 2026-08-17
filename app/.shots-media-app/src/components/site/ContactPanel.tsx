"use client";

import { useActionState, useId, useMemo } from "react";
import { sendMessage, type MessageState } from "@/app/(site)/contact/actions";
import { contact } from "@/content/contact";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";

/**
 * The form on the contact page.
 *
 * `RequestPanel` is its older sibling and this is deliberately the same sheet —
 * the same labels, the same field type, the same honeypot, the same errors
 * drawn against the fields they belong to — with everything a request needs and
 * a question does not taken out: no service, no calendar, no slot, no held
 * hour, no price. Three fields and a person at the other end.
 *
 * IT DOES NOT LIVE IN ITS OWN POOL. The request panel is an `<aside>` with a
 * blush pool of its own beside the page's prose; this one sits INSIDE the
 * second beat's clearing, under the three things worth knowing, because that is
 * the composition the approved screen draws — one pool per beat, and nothing
 * crossing its edge. So there is no `.pool` here; the page owns it.
 *
 * A CLIENT COMPONENT for the reason the other panels are: it holds the result
 * of one submission and has to draw the errors beside the fields they belong to.
 * It renders WHOLE on the server before any of that — every label, every field,
 * the note and the button are in the delivered HTML, and the action is a real
 * form action — so a static screenshot of this page is the finished composition
 * and it posts with script switched off.
 */

/**
 * Nothing typed yet, nothing wrong yet.
 *
 * Declared here rather than imported from the action beside it, because a
 * "use server" module may only export async functions — a const exported from
 * one arrives here as `undefined`, and nothing says so until the first render
 * reads a field off it. The TYPE still comes from the action, so the two cannot
 * drift in shape.
 */
const EMPTY: MessageState = { errors: {}, error: null, sent: false };

/** Lifted from RequestPanel, so the two forms are one form to look at. */
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

export default function ContactPanel() {
  const [state, submit, pending] = useActionState<MessageState, FormData>(
    sendMessage,
    EMPTY,
  );
  const id = useId();
  const form = contact.form;

  // When the form was drawn, for the guard's clock. Fixed at mount rather than
  // read at submit, because the question it answers is "how long did this take
  // to fill in" — and useMemo with no deps is the honest way to say "once".
  const drawnAt = useMemo(() => String(Date.now()), []);

  if (state.sent) {
    return (
      <div aria-labelledby={`${id}-sent`}>
        <h2
          id={`${id}-sent`}
          className="font-display text-[30px] font-normal leading-tight text-ink"
        >
          {form.sentTitle}
        </h2>
        <p className="mt-5 text-[19px] leading-relaxed text-ink">
          {form.sentBody}
        </p>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
          {form.sentCheck}
        </p>
        <a
          href={form.sentAgainHref}
          className="t mt-7 flex min-h-[56px] w-full items-center justify-center border border-ink px-6 text-[19px] font-semibold text-ink hover:bg-ink hover:text-pool sm:w-auto sm:self-start sm:px-8"
        >
          {form.sentAgain}
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2
        id={`${id}-h`}
        className="font-display text-[30px] font-normal leading-tight text-ink"
      >
        {form.title}
      </h2>
      <p className="mt-4 text-[17px] leading-relaxed text-ink">{form.lede}</p>

      <form action={submit} className="mt-7" aria-labelledby={`${id}-h`}>
        <input type="hidden" name={DRAWN_AT_FIELD} value={drawnAt} />

        {/* The trap. Clipped by `.vh`, the same visually-hidden class the rest
            of these pages use, rather than display:none — a filler that skips
            hidden inputs still fills this one — and taken out of the tab order
            and out of the accessibility tree so nobody using a keyboard or a
            screen reader can land in it by accident. */}
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
            {form.nameLabel}
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
            {form.emailLabel}
          </label>
          <span className={NOTE}>{form.emailNote}</span>
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
          <label htmlFor={`${id}-message`} className={LABEL}>
            {form.messageLabel}
          </label>
          <span className={NOTE}>{form.messageNote}</span>
          <textarea
            id={`${id}-message`}
            name="message"
            required
            rows={6}
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
          {pending ? form.sending : form.submit}
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
          {form.foot}
        </p>
      </form>
    </div>
  );
}
