"use server";

import { headers } from "next/headers";
import {
  contactAcknowledgementEmail,
  contactNoticeEmail,
  sendContactMail,
} from "@/lib/email/contact";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";
import { allowRequest, callerKey, looksAutomated } from "@/lib/request-guard";

/**
 * Somebody writing to Marianne from the contact page.
 *
 * Co-located with the panel it is submitted from, the way
 * `(site)/services/actions.ts` sits beside `RequestPanel`. It is modelled on
 * that action deliberately and differs from it in exactly two ways, both of
 * which make it SMALLER: there is no offering to look up and no slot to hold,
 * and NOTHING IS WRITTEN DOWN. A question is not a booking request; it names no
 * date, holds no hour and starts no charge, so it needs no row and no schema
 * change. What it needs is her mailbox, and that already exists.
 *
 * IT IS THE SECOND PUBLIC WRITE-ISH ENDPOINT IN THE APP and the first that
 * sends mail to a real person with no offering, no token and no Stripe
 * signature in front of it. So it carries the SAME guard the request form does,
 * whole — `lib/request-guard.ts`, three cheap layers rather than one clever
 * one:
 *
 *  · A HONEYPOT, a field no person can see or tab to.
 *  · A CLOCK — a form submitted a second after it was drawn was not read.
 *  · A COUNTER, per caller and across everybody, over an hour.
 *
 * The counter is SHARED with the request form rather than being a second
 * allowance of its own, and that is the point: the two forms are one mailbox,
 * and a robot that has already spent five requests this hour must not find a
 * fresh five here. `allowRequest` counts the ATTEMPT, not the success, so a
 * script that fails validation forty times has still made forty requests.
 *
 * NOTHING HERE TELLS THE SENDER WHAT TRIPPED. An automated-looking submission
 * is answered EXACTLY as a real one is — a robot that learns which field is the
 * trap gets past the trap next time — and the log line is the only place it
 * shows.
 */

export type MessageState = {
  /** Per-field, keyed by the input's name — the shape the panel draws. */
  errors: Record<string, string>;
  /** Set when nothing more specific can be said. */
  error: string | null;
  /** True once both messages are away. */
  sent: boolean;
};

/**
 * Not exported, and it cannot be: a "use server" module may only export async
 * functions, and a const exported from one arrives at the importing component
 * as `undefined` with nothing failing until the first render reads a field off
 * it. The panel carries its own copy of this shape — see the note there.
 */
const EMPTY: MessageState = { errors: {}, error: null, sent: false };

/** Long enough for anything anybody means, short enough to bound a message. */
const LIMITS = {
  name: 120,
  email: 200,
  message: 4000,
} as const;

/**
 * An address that could be one, checked no harder than that.
 *
 * The same test, and the same reasoning, as the one in
 * `(site)/services/actions.ts`: there is no confirmation link on this side and
 * no list to protect, so the only cost of a typo is that her reply bounces —
 * and the only thing a stricter pattern reliably achieves is turning away the
 * real addresses it has never heard of. One @, something either side, no spaces.
 *
 * Its own copy rather than an import for the reason the request form's is: the
 * shared one lives in `lib/newsletter/subscribers.ts`, which is server-only and
 * pulls the whole list module in behind it for two lines of regex.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function sendMessage(
  _previous: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const caller = callerKey(await headers());
  if (!allowRequest(caller)) {
    return {
      ...EMPTY,
      error:
        "That is a lot of messages from one place in an hour. Nothing has been sent. Wait a little and try again, or write to marianne@thefieldwork.co.uk directly.",
    };
  }

  const name = field(formData, "name");
  const email = field(formData, "email");
  const message = field(formData, "message");

  const errors: Record<string, string> = {};

  if (!name) errors.name = "She needs a name to write back to.";
  else if (name.length > LIMITS.name) {
    errors.name = "That is longer than a name — put the rest in the message.";
  }

  if (!email) errors.email = "Without an email address there is no reply.";
  else if (email.length > LIMITS.email || !looksLikeEmail(email)) {
    errors.email =
      "That does not look like a complete email address — “sarah@” is missing its second half.";
  }

  // REQUIRED, unlike the request form's message, and that is the difference
  // between the two forms: a request already carries a service and a time, so
  // it means something with nothing typed. This carries nothing else. An empty
  // one would reach her as a name and an address and no question.
  if (!message) {
    errors.message =
      "There is nothing here to send. Say what you wanted to ask — a sentence is enough.";
  } else if (message.length > LIMITS.message) {
    errors.message =
      "That is longer than this form can take. Send the short version and she will ask for the rest.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, error: null, sent: false };
  }

  // ── the spam guard ────────────────────────────────────────────────────────
  // Answered EXACTLY as a real one is. Nothing is sent, and the log line is the
  // only place it shows.
  if (
    looksAutomated(
      field(formData, HONEYPOT_FIELD),
      field(formData, DRAWN_AT_FIELD),
    )
  ) {
    console.info(
      `[contact] discarded an automated-looking submission from ${caller}`,
    );
    return { errors: {}, error: null, sent: true };
  }

  const submitted = { name, email, message };

  // HERS FIRST, THEN THEIRS. Both are awaited so a failure is in the log beside
  // the message it belongs to; neither can undo the other. If hers fails the
  // acknowledgement still goes, which is the right way round — the sender being
  // told it arrived when it did not is bad, and the sender being told nothing
  // at all when it DID arrive is worse.
  await sendContactMail(contactNoticeEmail(submitted), `message from ${email}`);
  await sendContactMail(
    contactAcknowledgementEmail(submitted),
    `acknowledgement for ${email}`,
  );

  return { errors: {}, error: null, sent: true };
}
