"use server";

import { headers } from "next/headers";
import { findByEmail } from "@/lib/auth/users";
import { createResetToken } from "@/lib/auth/reset";
import { resetEmail, sendMail } from "@/lib/email";
import { loadWording } from "@/lib/email/templates";
import { callerKey, checkThrottle, recordFailure } from "@/lib/auth/throttle";

export type ForgotState = { sent: boolean; error: string | null };

/**
 * The message is the SAME whether or not the address belongs to an account.
 *
 * Saying "no account with that email" would turn this form into a way to test
 * which addresses are registered — and on a portal with two accounts, one of
 * them the owner's, that is worth knowing to an attacker. So the answer is
 * always "if it's here, it's on its way".
 */
const ALWAYS =
  "If that address belongs to an account, a reset link is on its way. It expires in an hour.";

export async function requestReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();

  // Throttled like the login is, for the same reason: without it this becomes
  // an unlimited way to fire email at an address.
  const caller = callerKey(await headers());
  const verdict = checkThrottle(`reset:${caller}`);
  if (!verdict.allowed) {
    const mins = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      sent: false,
      error: `Too many attempts. Please wait ${mins === 1 ? "a minute" : `${mins} minutes`} and try again.`,
    };
  }
  recordFailure(`reset:${caller}`);

  if (!email || !email.includes("@")) {
    return {
      sent: false,
      error: "Please enter the email address for the account.",
    };
  }

  const user = await findByEmail(email);

  // An account with no email address on file cannot be reset this way. There
  // is deliberately no separate message for it — see ALWAYS above.
  if (user?.email) {
    const token = await createResetToken(user.id);
    const mail = resetEmail(token, user.username, await loadWording());
    const result = await sendMail({ ...mail, to: user.email });

    if (!result.delivered) {
      // Logged, never shown. A visitor learning that delivery failed would
      // learn that the address exists.
      console.warn(
        `[reset] link for user ${user.id} not delivered via ${result.via}${result.error ? `: ${result.error}` : ""}`,
      );
    }
  }

  return { sent: true, error: null };
}
