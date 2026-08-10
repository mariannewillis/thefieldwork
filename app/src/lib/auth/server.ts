import "server-only";
import { cookies } from "next/headers";
import { getCredential } from "./credentials";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  createSessionToken,
  verifySessionToken,
} from "./session";

/**
 * The authoritative session check.
 *
 * Middleware turns away requests with no valid signature, but it cannot read
 * the credential file, so it cannot know whether a validly-signed token has
 * since been revoked. This runs in the admin layout, on every admin page, and
 * is the check that actually decides.
 */
export type AdminSession = {
  username: string;
  mustChangePassword: boolean;
};

export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const payload = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const credential = await getCredential();

  // The revocation check. A token signed before the last password change is
  // refused even though its signature is perfectly valid.
  if (payload.cv !== credential.credentialVersion) return null;
  if (payload.sub !== credential.username) return null;

  return {
    username: credential.username,
    mustChangePassword: credential.mustChangePassword,
  };
}

export async function startSession(
  username: string,
  credentialVersion: number,
): Promise<void> {
  const token = await createSessionToken(username, credentialVersion);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  // Overwrite with an expired empty cookie rather than only deleting, so the
  // browser drops it even if a stale copy is cached somewhere.
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
