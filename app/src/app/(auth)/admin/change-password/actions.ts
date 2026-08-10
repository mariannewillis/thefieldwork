"use server";

import { redirect } from "next/navigation";
import {
  DEFAULT_PASSWORD,
  getCredential,
  setPassword,
} from "@/lib/auth/credentials";
import { verifyPassword } from "@/lib/auth/password";
import { validateNewPassword } from "@/lib/auth/policy";
import { getSession, startSession } from "@/lib/auth/server";

export type ChangeState = { error: string | null };

export async function changePassword(
  _prev: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  // Never trust the page that rendered the form — an action is a public HTTP
  // endpoint, reachable whether or not anyone visited the page first.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const credential = await getCredential();

  // Proving the current password matters even though she is already signed in:
  // it is what stops someone who finds her unlocked laptop from taking the
  // account away from her entirely.
  if (!(await verifyPassword(current, credential.passwordHash))) {
    return { error: "That current password is not right." };
  }

  if (password !== confirm) {
    return { error: "The two new passwords do not match." };
  }

  const problem = validateNewPassword(password, {
    username: credential.username,
    currentDefault: DEFAULT_PASSWORD,
  });
  if (problem) return { error: problem };

  const updated = await setPassword(password);

  // Changing the password bumps the credential version, which invalidates
  // every session — including this one. Issuing a fresh token here is what
  // stops her being signed out by her own successful password change.
  await startSession(updated.username, updated.credentialVersion);

  redirect("/admin");
}
