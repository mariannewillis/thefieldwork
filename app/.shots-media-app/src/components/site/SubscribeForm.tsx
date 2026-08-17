"use client";

import { useActionState, useId } from "react";
import { subscribe, type SubscribeState } from "@/app/(site)/subscribe/actions";
import "./subscribe-form.css";

/**
 * The form somebody joins the letter with.
 *
 * ONE COMPONENT, TWO GROUNDS — the last beat of the home page, and the
 * /subscribe page the footer points at. Making it twice would be making two
 * consent flows, and the second one would be the one that quietly drifted.
 *
 * THE ADDRESS IS NOT LIVE WHEN THIS RETURNS, and the panel says so in as many
 * words. Anybody can type anybody's address into a form; what makes an address
 * a subscriber is somebody holding it pressing a link. So the success message
 * is "look in your inbox", never "you're on the list" — the second would be
 * false for the fifteen minutes before they press it, and permanently false
 * for the address that was typed by somebody else.
 *
 * IT RENDERS WHOLE ON THE SERVER and posts without script: every field is in
 * the delivered HTML and the action is a real form action. The client half only
 * exists to swap the panel for the answer without a page load.
 */
/**
 * Nothing asked yet, nothing wrong yet.
 *
 * Here rather than beside the action because a `"use server"` module may only
 * export async functions — a constant exported from one is a build error, not
 * a style preference.
 */
const NOT_YET: SubscribeState = { error: null, asked: false };

export default function SubscribeForm({
  /** The line under the button. Differs between the two grounds. */
  note,
}: {
  note?: string;
}) {
  const [state, action, pending] = useActionState(subscribe, NOT_YET);
  const id = useId();

  if (state.asked) {
    return (
      <div className="sub">
        <p className="sub__done">Now check your inbox.</p>
        <p className="sub__note">
          There is a message on its way with one link in it. Press it and the
          letter starts arriving &mdash; until you do, nothing is sent to that
          address at all. If it has not come in a few minutes, look in junk: it
          is the first thing this address has ever sent you.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="sub">
      <div className="sub__row">
        <span className="sub__field">
          <label className="sub__label" htmlFor={`${id}-email`}>
            Your email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            aria-describedby={state.error ? `${id}-error` : undefined}
          />
        </span>

        <span className="sub__field">
          <label className="sub__label" htmlFor={`${id}-name`}>
            Your name, if you like
          </label>
          <input
            id={`${id}-name`}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
          />
        </span>
      </div>

      {/* See subscribe-form.css and the action: a field no person ever meets. */}
      <span className="sub__trap" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this empty</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </span>

      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send me the letter"}
      </button>

      {state.error && (
        <p id={`${id}-error`} role="alert" className="sub__error">
          {state.error}
        </p>
      )}

      <p className="sub__note">
        {note ??
          "One page, once a month. You will be sent a message to confirm the address is yours before anything else arrives, and every letter carries a link that takes you off the list in one press."}
      </p>
    </form>
  );
}
