"use server";

import { redirect } from "next/navigation";
import { consumeResetToken } from "@/lib/auth/reset";
import { DEFAULT_PASSWORD, findById } from "@/lib/auth/users";
import { validateNewPassword } from "@/lib/auth/policy";
import { startSession } from "@/lib/auth/server";

export type ResetState = { error: string | null };

const DEAD_LINK =
  "That link has expired or has already been used. Ask for a new one and it will arrive in a moment.";

export async function performReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  // Validate the password BEFORE spending the token. Otherwise a password
  // that fails the length rule would burn a single-use link and force the
  // whole email round trip again.
  const { inspectResetToken } = await import("@/lib/auth/reset");
  const check = await inspectResetToken(token);
  if (!check.ok) return { error: DEAD_LINK };

  const user = await findById(check.userId);
  if (!user) return { error: DEAD_LINK };

  const problem = validateNewPassword(password, {
    username: user.username,
    currentDefault: DEFAULT_PASSWORD,
  });
  if (problem) return { error: problem };

  const outcome = await consumeResetToken(token, password);
  if (!outcome.ok) return { error: DEAD_LINK };

  // Signing them straight in is the point of the exercise — they have just
  // proved control of the mailbox. The reset bumped credentialVersion, so any
  // OTHER session on this account has already been killed.
  const updated = await findById(outcome.userId);
  if (updated) await startSession(updated.id, updated.credentialVersion);

  redirect("/admin");
}
