import "server-only";

/**
 * Keeping the one public write endpoint from being useful to a robot.
 *
 * §13 asks the booking endpoint to be rate-limited and spam-guarded. This is
 * the whole of that, and it is deliberately three cheap layers rather than one
 * clever one — a form that anybody on the internet can POST to is worth
 * defending in depth, and none of these costs a dependency.
 *
 *  · A HONEYPOT. A field no person can see or tab to, which every naive form
 *    filler completes. Filled means discard.
 *  · A CLOCK. A form submitted a second after it was drawn was not read.
 *  · A COUNTER, per caller, over an hour. Somebody genuinely writing in twice
 *    is fine; forty times is not a person.
 *
 * The counters live in memory, exactly as `lib/auth/throttle.ts` does, and for
 * the same reason: this runs as a single always-on instance (D-4 — a Reserved
 * VM, not Autoscale), so one process sees every request. A restart clears them,
 * which nobody outside can force. If this ever runs on more than one instance
 * the state has to move to shared storage, or each instance will enforce its
 * own private allowance.
 *
 * NOTHING HERE TELLS THE SENDER WHAT TRIPPED. A robot that learns which field
 * is the trap gets past the trap next time, so a discarded submission is
 * answered with the same acknowledgement a real one gets — see the note on
 * `looksAutomated` in the action.
 */

/**
 * The two field NAMES live in `lib/request-fields.ts`, which is not
 * server-only, because the form that draws them runs in the browser. What is
 * here is everything that must not: the counters, the clock and the caller key.
 */

/** Faster than this and nobody read the page, let alone the form. */
const MIN_FILL_MS = 3000;

const WINDOW_MS = 60 * 60 * 1000;
const PER_CALLER_LIMIT = 5;

/** Across everybody, so a rotating source still meets a ceiling. */
const GLOBAL_LIMIT = 120;

type Window = { count: number; firstAt: number };

const perCaller = new Map<string, Window>();
const everyone: Window = { count: 0, firstAt: Date.now() };

function fresh(window: Window, now: number): Window {
  if (now - window.firstAt > WINDOW_MS) {
    window.count = 0;
    window.firstAt = now;
  }
  return window;
}

/**
 * Whether this caller may send another one.
 *
 * Counts the ATTEMPT, not the success: a robot that gets a validation error
 * forty times has still made forty requests, and letting the invalid ones
 * through free would make the limit a limit on well-formed spam only.
 *
 * The map is swept while it is being read rather than on a timer — a
 * `setInterval` in a module a server action imports keeps a handle alive for
 * the life of the process and would be doing work on a site nobody is
 * currently visiting.
 */
export function allowRequest(caller: string): boolean {
  const now = Date.now();

  for (const [key, window] of perCaller) {
    if (now - window.firstAt > WINDOW_MS) perCaller.delete(key);
  }

  const mine = fresh(perCaller.get(caller) ?? { count: 0, firstAt: now }, now);
  mine.count += 1;
  perCaller.set(caller, mine);

  fresh(everyone, now);
  everyone.count += 1;

  return mine.count <= PER_CALLER_LIMIT && everyone.count <= GLOBAL_LIMIT;
}

/**
 * Whether this submission came from something that did not read the page.
 *
 * A missing or unparseable `drawnAt` is NOT treated as automated. The field
 * can be lost to a browser restoring a form from bfcache or to a page cached
 * for longer than expected, and turning a real person away because a hidden
 * timestamp went missing is a worse failure than accepting one robot.
 */
export function looksAutomated(
  honeypot: string,
  drawnAt: string,
  now: number = Date.now(),
): boolean {
  if (honeypot.trim()) return true;

  const drawn = Number(drawnAt);
  if (!Number.isFinite(drawn) || drawn <= 0) return false;
  return now - drawn < MIN_FILL_MS;
}

/**
 * Who is asking.
 *
 * The same forwarded header `lib/auth/throttle.ts` reads, and forgeable in the
 * same way — behind Replit's proxy the socket address is the proxy, so this is
 * the only thing that distinguishes callers. It is not a security boundary on
 * its own, which is why the global ceiling sits underneath it.
 */
export function callerKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
