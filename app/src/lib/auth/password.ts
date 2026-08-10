import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing, using scrypt from Node's own crypto.
 *
 * scrypt rather than bcrypt because it needs a lot of MEMORY as well as time,
 * which is what makes it expensive to attack with the GPUs and custom hardware
 * that make short work of older hashes. Node ships it, so there is no
 * dependency to audit or keep patched.
 *
 * The cost parameters are stored INSIDE each hash rather than as a constant.
 * That means we can raise them later — as machines get faster and today's
 * numbers stop being enough — and every existing password keeps verifying
 * against the parameters it was created with. Without this, raising the cost
 * would lock the owner out of her own portal.
 */
const N = 32768; // CPU/memory cost. 2^15.
const R = 8; // block size
const P = 1; // parallelisation
const KEYLEN = 64;
const MAXMEM = 128 * N * R * 2; // scrypt needs 128*N*r bytes; give it headroom.

/** `scrypt$N$r$p$salt$hash`, all base64. Self-describing on purpose. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Verify a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed record: a corrupt
 * credential file must read as "wrong password", never as an exception that
 * some caller could mistake for success.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });

    // Length must match before timingSafeEqual, which throws on a mismatch —
    // and the comparison itself must be constant-time so that the time taken
    // to reject a guess never reveals how much of it was right.
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
