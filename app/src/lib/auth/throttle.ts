/**
 * Login throttling.
 *
 * A single-user login with an eight-character temporary password is guessable
 * in seconds if the attacker gets unlimited attempts. Slowing the attempts is
 * what makes any password policy mean anything.
 *
 * Two layers, because either alone has an obvious bypass:
 *
 *  - PER-CALLER, so one source cannot grind away. Defeated by rotating IPs.
 *  - GLOBAL, so a distributed attempt still hits a ceiling. Alone this would
 *    let anyone lock the real owner out by failing logins on purpose, which is
 *    why the global limit only ever slows things down and never fully closes.
 *
 * The counters live in memory. That is honest for a single always-on instance:
 * a restart clears them, which an attacker cannot force. If this ever runs on
 * more than one instance the state needs to move to shared storage, or each
 * instance will enforce its own private allowance.
 */

type Attempt = { failures: number; firstAt: number; lockedUntil: number };

const WINDOW_MS = 15 * 60 * 1000;
const FREE_ATTEMPTS = 5;
const MAX_LOCK_MS = 15 * 60 * 1000;

const perCaller = new Map<string, Attempt>();
const global: Attempt = { failures: 0, firstAt: Date.now(), lockedUntil: 0 };

const GLOBAL_FREE_ATTEMPTS = 50;
const GLOBAL_DELAY_MS = 2000;

function fresh(a: Attempt, now: number): Attempt {
  if (now - a.firstAt > WINDOW_MS && now > a.lockedUntil) {
    a.failures = 0;
    a.firstAt = now;
  }
  return a;
}

/** Backoff doubles per failure past the free allowance, capped at 15 minutes. */
function lockFor(failures: number): number {
  const over = failures - FREE_ATTEMPTS;
  if (over <= 0) return 0;
  return Math.min(1000 * 2 ** over, MAX_LOCK_MS);
}

export type ThrottleVerdict =
  | { allowed: true; delayMs: number }
  | { allowed: false; retryAfterSeconds: number };

export function checkThrottle(caller: string): ThrottleVerdict {
  const now = Date.now();
  const a = fresh(
    perCaller.get(caller) ?? { failures: 0, firstAt: now, lockedUntil: 0 },
    now,
  );
  perCaller.set(caller, a);

  if (a.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((a.lockedUntil - now) / 1000),
    };
  }

  fresh(global, now);
  // Global pressure never locks the door — it only makes every attempt slow,
  // so a flood cannot be used to lock the owner out of her own portal.
  const delayMs = global.failures > GLOBAL_FREE_ATTEMPTS ? GLOBAL_DELAY_MS : 0;
  return { allowed: true, delayMs };
}

export function recordFailure(caller: string): void {
  const now = Date.now();
  const a = fresh(
    perCaller.get(caller) ?? { failures: 0, firstAt: now, lockedUntil: 0 },
    now,
  );
  a.failures += 1;
  a.lockedUntil = now + lockFor(a.failures);
  perCaller.set(caller, a);

  fresh(global, now);
  global.failures += 1;
}

export function recordSuccess(caller: string): void {
  perCaller.delete(caller);
}

/**
 * Who is asking. Behind Replit's proxy the socket address is the proxy, so the
 * forwarded header is the only thing that distinguishes callers.
 *
 * That header is caller-supplied and therefore forgeable — someone determined
 * can rotate it and escape the per-caller limit. It is not a security boundary
 * on its own, which is precisely why the global limiter exists underneath it.
 */
export function callerKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
