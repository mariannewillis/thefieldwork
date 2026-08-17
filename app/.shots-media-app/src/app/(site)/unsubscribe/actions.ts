"use server";

import { unsubscribeByToken } from "@/lib/newsletter/subscribers";

/**
 * Leaving the list.
 *
 * A POST, and never a GET, and that is not symmetry with the confirmation page
 * — it is the opposite decision taken for the opposite reason. A confirmation
 * link prefetched by a mail scanner confirms a fact that is already true; an
 * unsubscribe link prefetched by a mail scanner removes somebody who never
 * asked to leave, and they find out by noticing that the letter stopped coming.
 * Outlook Safe Links and every corporate gateway fetch every URL in every
 * message. So the link opens a page, and the page has one button on it.
 *
 * That is still "one press, nothing to fill in and nothing to explain", which
 * is what the footer of every letter promises.
 */

export type UnsubscribeState = {
  /** Null until it has happened. Their address once it has. */
  email: string | null;
  error: string | null;
};

export async function stopTheLetter(
  _prev: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const outcome = await unsubscribeByToken(String(formData.get("token") ?? ""));
  return outcome.ok
    ? { email: outcome.email, error: null }
    : {
        email: null,
        error:
          "That link is no longer one this recognises. If the letter is still arriving, reply to it and Marianne will take you off by hand.",
      };
}
