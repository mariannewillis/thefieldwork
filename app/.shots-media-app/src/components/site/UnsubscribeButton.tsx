"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  stopTheLetter,
  type UnsubscribeState,
} from "@/app/(site)/unsubscribe/actions";
import "./subscribe-form.css";

/**
 * One button, and what it says afterwards.
 *
 * NO CONFIRMATION STEP AND NO REASON ASKED. A list that makes leaving
 * difficult is a list people leave by pressing "report spam" instead, and one
 * of those costs the sending domain far more than the subscriber did. The
 * footer of every letter promises "one click, nothing to fill in and nothing
 * to explain"; this is that promise kept.
 */
/** Not yet pressed. Here because a `"use server"` module exports only async
 *  functions — a constant beside the action is a build error. */
const NOT_YET: UnsubscribeState = { email: null, error: null };

export default function UnsubscribeButton({
  token,
  email,
  already,
}: {
  token: string;
  /** Whose address it is, so the page names it before anything happens. */
  email: string;
  already: boolean;
}) {
  const [state, action, pending] = useActionState(stopTheLetter, NOT_YET);

  if (already || state.email) {
    return (
      <>
        <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
          Nothing more will be sent to <strong>{state.email ?? email}</strong>.
          Your bookings and anything you have paid for are untouched &mdash;
          this was only the monthly letter.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block text-[19px] text-action underline underline-offset-4 hover:text-ink"
        >
          Back to The Field Work
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
        This stops the monthly letter going to <strong>{email}</strong>. It does
        not touch a booking, a place you have paid for, or anything else &mdash;
        those are not a mailing list and never were.
      </p>

      <form action={action} className="sub mt-7">
        <input type="hidden" name="token" value={token} />
        <button type="submit" disabled={pending}>
          {pending ? "Stopping…" : "Stop sending it"}
        </button>
        {state.error && (
          <p role="alert" className="sub__error">
            {state.error}
          </p>
        )}
      </form>

      <Link
        href="/"
        className="mt-6 inline-block text-[17px] text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        Actually, keep sending it
      </Link>
    </>
  );
}
