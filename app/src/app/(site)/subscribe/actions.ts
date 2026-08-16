"use server";

import { SITE_URL } from "@/content/site";
import { sendMail } from "@/lib/email";
import { confirmEmail } from "@/lib/newsletter/confirm-email";
import { confirmToken, joinList } from "@/lib/newsletter/subscribers";

/**
 * Somebody asking for the letter, from the public site.
 *
 * THE ANSWER IS THE SAME WHATEVER IS TRUE. A new address, an address that
 * asked last week and never confirmed, and an address already on the list all
 * get "check your inbox". That is deliberate, and it is the one thing on this
 * page that is a security decision rather than a wording one: an answer that
 * differed would turn the form into a way of asking the site whether a given
 * person is one of Marianne's clients. Type an address, read the reply, and you
 * know. So the reply says nothing.
 *
 * A BAD ADDRESS IS STILL A BAD ADDRESS. `looksLikeEmail` catches the missing
 * dot and the stray space and says so, because that is a typo rather than a
 * fact about anybody, and silently swallowing it would mean somebody waiting
 * for a message that was never going anywhere.
 */

export type SubscribeState = {
  /** Drawn under the field. Null when nothing is wrong. */
  error: string | null;
  /** Set once the form has been accepted; the panel changes to say so. */
  asked: boolean;
};

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");

  /**
   * The honeypot.
   *
   * A field no person can see and no screen reader announces, filled in by
   * roughly every form-spam bot there is. Something in it means this was not a
   * person, and the answer is the same success message they would have got
   * anyway — a refusal tells the bot's author what to change.
   *
   * Cheap, and the only defence here: the confirmation step already means a
   * bot cannot put anybody on the list, so what is left to prevent is the
   * mailbox being used to send unwanted confirmations, and this prevents most
   * of it without a captcha that costs a real person anything.
   */
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { error: null, asked: true };
  }

  const outcome = await joinList(email, name);
  if (!outcome.ok) return { error: outcome.error, asked: false };

  if (outcome.state === "pending") {
    const link = `${SITE_URL}/subscribe/confirm?id=${outcome.id}&token=${encodeURIComponent(
      outcome.token,
    )}`;
    // A send that fails is not reported to the visitor, for the reason above —
    // and because there is nothing they could do about it. It is logged, which
    // is where somebody looking for it would look.
    const result = await sendMail({
      to: outcome.email,
      ...confirmEmail(link, name.trim() || null),
    });
    if (!result.delivered) {
      console.error(
        `[subscribe] confirmation to ${outcome.email} did not go: ${result.error ?? result.via}`,
      );
    }
  }

  return { error: null, asked: true };
}
