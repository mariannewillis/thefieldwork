/**
 * Session tokens.
 *
 * Deliberately built on Web Crypto rather than node:crypto, because this same
 * code has to run in middleware — which is the one place that can turn an
 * unauthenticated request away BEFORE any admin page begins rendering.
 *
 * The token is a signed statement, not a database key: there is no session
 * table to look up. What makes that safe is `cv`, the credential version.
 * It is baked into every token and checked against the stored credential, so
 * changing the password invalidates every session ever issued — including the
 * one on a laptop she has lost. Statelessness without that is a session you
 * cannot revoke.
 */

export const SESSION_COOKIE = "tfw_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionPayload = {
  /** the account's id. An id rather than a username, so renaming an account
   *  does not sign its owner out. */
  sub: number;
  /** credential version — the revocation lever */
  cv: number;
  /** issued at (seconds) */
  iat: number;
  /** expires at (seconds) */
  exp: number;
};

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * The signing secret.
 *
 * In production a missing secret is fatal, and loudly so. The tempting
 * fallback — generate a random one at boot — would mean tokens signed by a key
 * that dies with the process: every restart silently signs everyone out, and
 * nobody discovers why for weeks. Failing at boot is kinder than that.
 *
 * In development a fixed placeholder keeps things working without setup. It is
 * a known value, which is exactly why it must never reach production.
 */
const DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

function secretBytes(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or shorter than 32 characters. The admin portal cannot sign sessions without it. Generate one with: openssl rand -base64 32",
      );
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

async function key(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secretBytes() as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function createSessionToken(
  sub: number,
  cv: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub,
    cv,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await key("sign"),
    new TextEncoder().encode(body) as BufferSource,
  );
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

/**
 * Verify signature and expiry. Returns the payload or null.
 *
 * This does NOT check the credential version — middleware has no way to read
 * the credential file. The admin layout does that check, and it is the
 * authoritative gate; this is the cheap early one.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key("verify"),
      b64urlDecode(sig) as BufferSource,
      new TextEncoder().encode(body) as BufferSource,
    );
    if (!ok) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as SessionPayload;

    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Cookie options.
 *
 * httpOnly     — JavaScript cannot read it, so an injected script cannot steal it.
 * secure       — HTTPS only in production, so it never crosses the network in clear.
 * sameSite lax — the browser will not attach it to cross-site POSTs, which is
 *                what stops another site submitting a form as her. Server
 *                Actions add their own origin check on top.
 */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
