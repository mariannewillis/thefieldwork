"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { getCredential } from "@/lib/auth/credentials";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/server";
import {
  callerKey,
  checkThrottle,
  recordFailure,
  recordSuccess,
} from "@/lib/auth/throttle";

export type LoginState = { error: string | null };

/** Constant-time string compare, so username guesses leak nothing via timing. */
function sameString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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

  const credential = await getCredential();

  // BOTH checks always run, even when the username is already wrong. Returning
  // early on a bad username would make it answer faster than a bad password,
  // and that difference is enough to work out the username by measurement.
  const usernameOk = sameString(
    username.toLowerCase(),
    credential.username.toLowerCase(),
  );
  const passwordOk = await verifyPassword(password, credential.passwordHash);

  if (!usernameOk || !passwordOk) {
    recordFailure(caller);
    // One message for both failures. "No such user" would confirm which
    // usernames exist, and this portal has exactly one worth guessing.
    return { error: "That username and password do not match." };
  }

  recordSuccess(caller);
  await startSession(credential.username, credential.credentialVersion);

  // The forced change is enforced by the admin layout, so it cannot be skipped
  // by navigating straight to a page — but sending her there directly saves a
  // pointless bounce.
  redirect(credential.mustChangePassword ? "/admin/change-password" : next);
}
