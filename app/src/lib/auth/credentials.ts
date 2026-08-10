import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword } from "./password";

/**
 * The single admin credential, stored in Postgres.
 *
 * There is one user. That is a deliberate product decision, not a stage on the
 * way to a user table: this is one practitioner's portal, and every account
 * that exists is an account that can be phished.
 *
 * This used to be a JSON file on disk. It moved because a file does not
 * survive a Replit redeploy — publishing the site silently restored the
 * temporary password every time, with nothing to notice. See
 * docs/DECISIONS-BUILD.md D-11.
 */

export type Credential = {
  username: string;
  passwordHash: string;
  credentialVersion: number;
  mustChangePassword: boolean;
};

/** The username, and the temporary password it ships with. */
export const DEFAULT_USERNAME = process.env.ADMIN_USERNAME ?? "mariannevwillis";
export const DEFAULT_PASSWORD = "test1234";

/** The pinned primary key — there is one account and it is always row 1. */
const ROW = 1;

export async function getCredential(): Promise<Credential> {
  const existing = await prisma.adminCredential.findUnique({ where: { id: ROW } });
  if (existing) return existing;

  // First boot. `create` inside a race would throw on the unique key, so this
  // upserts: two simultaneous first requests end with one account, not an
  // error page.
  return prisma.adminCredential.upsert({
    where: { id: ROW },
    update: {},
    create: {
      id: ROW,
      username: DEFAULT_USERNAME,
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      credentialVersion: 1,
      // The temporary password is a handover mechanism, not a password. The
      // portal will not open on it — see the admin layout's forced redirect.
      mustChangePassword: true,
    },
  });
}

export async function setPassword(newPassword: string): Promise<Credential> {
  const hash = await hashPassword(newPassword);
  return prisma.adminCredential.update({
    where: { id: ROW },
    data: {
      passwordHash: hash,
      // Bumping this invalidates every session issued before now.
      credentialVersion: { increment: 1 },
      mustChangePassword: false,
    },
  });
}

/** Used by the settings screen; changing it does not touch the password. */
export async function setUsername(username: string): Promise<Credential> {
  return prisma.adminCredential.update({
    where: { id: ROW },
    data: {
      username: username.trim(),
      credentialVersion: { increment: 1 },
    },
  });
}
