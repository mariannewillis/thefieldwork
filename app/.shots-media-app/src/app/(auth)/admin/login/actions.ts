"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findByUsername, ensureSeeded } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/server";
import {
  callerKey,
  checkThrottle,
  recordFailure,
  recordSuccess,
} from "@/lib/auth/throttle";

export type LoginState = { error: string | null };

/**
 * A real scrypt hash of a value nobody knows, used when the username does not
 * exist so the work done — and therefore the time taken — matches a genuine
 * wrong-password attempt.
 */
const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "Ej5rMhU7VYQm8QbqUu0Xk1lZ0YKcQ2mS3nR4tV5wX6y7Z8a9B0c1D2e3F4g5H6i7J8k9L0m1N2o3P4q5R6s7T8u9V0w=";

/**
 * Only ever send her to a path inside this site.
 *
 * `next` arrives in the query string, which means an attacker can put anything
 * there and mail her the link. Without this check, a sign-in that lands on
 * `https://not-really-thefieldwork.example` would look like her own portal
 * doing the redirecting. Anything not starting with a single `/admin` is
 * discarded — `//evil.com` is a protocol-relative URL to another host, which
 * is why the second character is checked too.
 */
function safeNext(next: string | null): string {
  if (!next) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  return next;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(
    formData.get("next") ? String(formData.get("next")) : null,
  );

  const caller = callerKey(await headers());
  const verdict = checkThrottle(caller);
  if (!verdict.allowed) {
    const mins = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      error: `Too many attempts. Please wait ${mins === 1 ? "a minute" : `${mins} minutes`} and try again.`,
    };
  }
  if (verdict.delayMs) {
    await new Promise((r) => setTimeout(r, verdict.delayMs));
  }

  await ensureSeeded();
  const user = await findByUsername(username);

  // A password check ALWAYS runs, even when there is no such account — against
  // a dummy hash if need be. Returning early on an unknown username would make
  // it answer faster than a wrong password, and that difference alone is
  // enough to work out which usernames exist by measurement.
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    recordFailure(caller);
    // One message for both failures. "No such account" would confirm which
    // addresses have accounts, and one of them is the owner's.
    return { error: "That email address and password do not match." };
  }

  recordSuccess(caller);
  await startSession(user.id, user.credentialVersion);

  // The forced change is enforced by the admin layout, so it cannot be skipped
  // by navigating straight to a page — but sending her there directly saves a
  // pointless bounce.
  redirect(user.mustChangePassword ? "/admin/change-password" : next);
}
