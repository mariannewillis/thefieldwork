import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "./password";

/**
 * The single admin credential.
 *
 * There is one user. That is a deliberate product decision, not a stage on the
 * way to a user table: this is one practitioner's portal, and every account
 * that exists is an account that can be phished.
 *
 * ── WHERE THIS LIVES, AND THE CATCH ────────────────────────────────────────
 * The record is a JSON file on disk. On a Replit Reserved VM that survives
 * restarts, but a REDEPLOY builds a fresh container — so unless DATA_DIR points
 * at storage that outlives the deployment, changing the password and then
 * redeploying puts the temporary password back. See docs/DECISIONS-BUILD.md
 * D-10. This is the first thing a database should take over.
 */

export type Credential = {
  username: string;
  passwordHash: string;
  /**
   * Bumped on every password change. It is baked into each session token, so
   * changing the password instantly invalidates every session that was issued
   * before it — including one on a laptop she no longer has.
   */
  credentialVersion: number;
  /** True while the seeded temporary password is still in use. */
  mustChangePassword: boolean;
  updatedAt: string;
};

/** The username, and the temporary password it ships with. */
export const DEFAULT_USERNAME = process.env.ADMIN_USERNAME ?? "mariannevwillis";
export const DEFAULT_PASSWORD = "test1234";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "admin-credential.json");

let cache: Credential | null = null;

async function seed(): Promise<Credential> {
  const credential: Credential = {
    username: DEFAULT_USERNAME,
    passwordHash: await hashPassword(DEFAULT_PASSWORD),
    credentialVersion: 1,
    // The temporary password is a handover mechanism, not a password. The
    // portal will not open on it — see the admin layout's forced redirect.
    mustChangePassword: true,
    updatedAt: new Date().toISOString(),
  };
  await save(credential);
  return credential;
}

async function save(credential: Credential): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write-then-rename, so a crash mid-write can never leave a half-written
  // credential file — which would lock her out until someone deleted it.
  const tmp = `${FILE}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(credential, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(tmp, FILE);
  cache = credential;
}

export async function getCredential(): Promise<Credential> {
  if (cache) return cache;
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Credential;
    if (!parsed?.passwordHash || !parsed?.username) throw new Error("incomplete");
    cache = parsed;
    return parsed;
  } catch {
    // No file yet (first boot), or an unreadable one. Either way the portal
    // needs a credential to exist, so seed the temporary one.
    return seed();
  }
}

export async function setPassword(newPassword: string): Promise<Credential> {
  const current = await getCredential();
  const next: Credential = {
    ...current,
    passwordHash: await hashPassword(newPassword),
    credentialVersion: current.credentialVersion + 1,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  };
  await save(next);
  return next;
}

/** Used by the settings screen; changing it does not touch the password. */
export async function setUsername(username: string): Promise<Credential> {
  const current = await getCredential();
  const next: Credential = {
    ...current,
    username: username.trim(),
    credentialVersion: current.credentialVersion + 1,
    updatedAt: new Date().toISOString(),
  };
  await save(next);
  return next;
}
