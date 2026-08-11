import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { setPassword } from "./users";

/**
 * Password-reset links.
 *
 * The token in the email is 32 random bytes. What we store is its SHA-256
 * hash, so this table is useless to anyone who reads it — a backup, a support
 * query, a leaked dump. The usable secret only ever exists in the email.
 *
 * SHA-256 rather than scrypt here, deliberately: unlike a password, this token
 * is already 256 bits of randomness, so there is nothing to brute-force and
 * nothing for a slow hash to protect against. It just needs to be one-way.
 */

const TTL_MINUTES = 60;

export async function createResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  // Any earlier link for this account stops working the moment a new one is
  // asked for — otherwise a stack of live links accumulates in an inbox.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    },
  });

  return token;
}

export type ResetOutcome =
  | { ok: true; userId: number }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Checks a token without spending it — used to render the form or refuse. */
export async function inspectResetToken(token: string): Promise<ResetOutcome> {
  if (!token) return { ok: false, reason: "invalid" };
  const hash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  // The lookup above is by unique hash, so this comparison is belt and braces
  // against a future change that makes the lookup non-exact.
  const a = Buffer.from(row.tokenHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, userId: row.userId };
}

/**
 * Spend the token and set the new password, in ONE transaction.
 *
 * Both together or neither: a crash between them would either leave a live
 * link after the password changed, or burn the link without changing it.
 */
export async function consumeResetToken(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const check = await inspectResetToken(token);
  if (!check.ok) return check;

  const hash = createHash("sha256").update(token).digest("hex");

  await prisma.$transaction(async (tx) => {
    // Conditional update: if a concurrent request spent it first, this matches
    // zero rows and the whole transaction is abandoned.
    const spent = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hash, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (spent.count !== 1) throw new Error("token already spent");
  });

  // setPassword bumps credentialVersion, so every existing session for this
  // account dies here — which is the point. If the reset was needed because
  // someone else had the password, they are signed out by this.
  await setPassword(check.userId, newPassword);
  return check;
}
