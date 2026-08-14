import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "./password";

/**
 * Admin accounts.
 *
 * Normally there is one — this is a sole practitioner's portal. The model
 * allows more so a second can exist for testing the reset flow without
 * touching hers.
 */

export type AdminUser = {
  id: number;
  username: string;
  email: string | null;
  passwordHash: string;
  credentialVersion: number;
  mustChangePassword: boolean;
};

/** Marianne's account: the one that ships with a temporary password. */
export const DEFAULT_USERNAME =
  process.env.ADMIN_USERNAME ?? "marianne@thefieldwork.co.uk";

/**
 * Usernames this code has previously seeded. Same rule as PREVIOUSLY_SEEDED
 * below: we correct our own past guesses, never a name someone chose.
 */
const PREVIOUSLY_SEEDED_USERNAMES = ["mariannevwillis"];
export const DEFAULT_PASSWORD = "test1234";

/**
 * Her email address. Reset links go here, so it has to be a mailbox she
 * actually reads — a gmail address is fine and is one less thing that breaks
 * if the domain's email is ever reconfigured.
 *
 * Backfilled onto the account only when it has NO address yet. It never
 * overwrites one, because once she has changed it in Settings that is her
 * decision, and an env var quietly reverting it would redirect her reset links
 * to an address she had deliberately moved away from.
 */
const DEFAULT_EMAIL = process.env.ADMIN_EMAIL ?? "marianne@thefieldwork.co.uk";

/**
 * Addresses this code has previously auto-filled.
 *
 * The rule is "never overwrite an address SHE chose" — but an address WE
 * guessed is not her choice, and leaving a stale guess in place would send her
 * reset links to the wrong mailbox forever. So a stored address is replaced
 * only when it is one of our own past defaults. The moment she sets anything
 * else in Settings, it stops matching this list and is never touched again.
 */
const PREVIOUSLY_SEEDED = ["mariannevwillis@gmail.com"];

/**
 * A second account, for testing the reset flow against a mailbox we actually
 * control. Set ADMIN_TEST_USERNAME="" to stop it being created.
 *
 * It is seeded with NO USABLE PASSWORD — a random 32 bytes nobody has ever
 * seen, discarded immediately. That is deliberate: a second admin sharing the
 * same guessable temporary password would be a second front door. The only
 * way into this account is a reset link sent to its address, which is exactly
 * the thing it exists to test.
 */
const TEST_USERNAME =
  process.env.ADMIN_TEST_USERNAME ?? "nagrom.1990@gmail.com";
const PREVIOUSLY_SEEDED_TEST_USERNAMES = ["davidmorgan"];
const TEST_EMAIL = process.env.ADMIN_TEST_EMAIL ?? "nagrom.1990@gmail.com";

/** Creates the accounts that should exist and have not been created yet. */
export async function ensureSeeded(): Promise<void> {
  // Look for the account under its current name OR any name we seeded before,
  // so a rename finds the existing row instead of creating a second account.
  const owner = await prisma.adminUser.findFirst({
    where: {
      OR: [
        { username: DEFAULT_USERNAME },
        { username: { in: PREVIOUSLY_SEEDED_USERNAMES } },
      ],
    },
  });

  if (owner && owner.username !== DEFAULT_USERNAME) {
    // Renaming does NOT sign her out: sessions carry the account id, not the
    // name, which is exactly why they were built that way.
    await prisma.adminUser.update({
      where: { id: owner.id },
      data: { username: DEFAULT_USERNAME },
    });
  }

  if (!owner) {
    await prisma.adminUser.create({
      data: {
        username: DEFAULT_USERNAME,
        email: DEFAULT_EMAIL || null,
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
        mustChangePassword: true,
      },
    });
  } else if (
    DEFAULT_EMAIL &&
    owner.email !== DEFAULT_EMAIL &&
    (!owner.email || PREVIOUSLY_SEEDED.includes(owner.email))
  ) {
    // Fills a blank, or corrects an address we ourselves guessed earlier.
    // Never touches one she has chosen. See PREVIOUSLY_SEEDED above.
    await prisma.adminUser.update({
      where: { id: owner.id },
      data: { email: DEFAULT_EMAIL },
    });
  }

  if (TEST_USERNAME && TEST_EMAIL) {
    const already = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: TEST_USERNAME },
          { username: { in: PREVIOUSLY_SEEDED_TEST_USERNAMES } },
          { email: TEST_EMAIL },
        ],
      },
    });
    if (already && already.username !== TEST_USERNAME) {
      await prisma.adminUser.update({
        where: { id: already.id },
        data: { username: TEST_USERNAME },
      });
    }
    if (!already) {
      await prisma.adminUser.create({
        data: {
          username: TEST_USERNAME,
          email: TEST_EMAIL,
          // Unguessable and immediately forgotten. Reset-only by design.
          passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          mustChangePassword: true,
        },
      });
    }
  }
}

export async function findByUsername(
  username: string,
): Promise<AdminUser | null> {
  await ensureSeeded();
  return prisma.adminUser.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
  });
}

export async function findByEmail(email: string): Promise<AdminUser | null> {
  await ensureSeeded();
  return prisma.adminUser.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
}

export async function findById(id: number): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { id } });
}

export async function setPassword(
  userId: number,
  newPassword: string,
): Promise<AdminUser> {
  return prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      // Invalidates every session issued before now, on every device.
      credentialVersion: { increment: 1 },
      mustChangePassword: false,
    },
  });
}

export async function setEmail(
  userId: number,
  email: string,
): Promise<AdminUser> {
  return prisma.adminUser.update({
    where: { id: userId },
    data: { email: email.trim() || null },
  });
}
