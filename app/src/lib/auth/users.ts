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
export const DEFAULT_USERNAME = process.env.ADMIN_USERNAME ?? "mariannevwillis";
export const DEFAULT_PASSWORD = "test1234";

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
const TEST_USERNAME = process.env.ADMIN_TEST_USERNAME ?? "davidmorgan";
const TEST_EMAIL = process.env.ADMIN_TEST_EMAIL ?? "nagrom.1990@gmail.com";

/** Creates the accounts that should exist and have not been created yet. */
export async function ensureSeeded(): Promise<void> {
  const existing = await prisma.adminUser.count();
  if (existing === 0) {
    await prisma.adminUser.create({
      data: {
        username: DEFAULT_USERNAME,
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
        mustChangePassword: true,
      },
    });
  }

  if (TEST_USERNAME && TEST_EMAIL) {
    const already = await prisma.adminUser.findFirst({
      where: { OR: [{ username: TEST_USERNAME }, { email: TEST_EMAIL }] },
    });
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

export async function findByUsername(username: string): Promise<AdminUser | null> {
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

export async function setPassword(userId: number, newPassword: string): Promise<AdminUser> {
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

export async function setEmail(userId: number, email: string): Promise<AdminUser> {
  return prisma.adminUser.update({
    where: { id: userId },
    data: { email: email.trim() || null },
  });
}
