import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * The list, and the two dates that decide who is on it.
 *
 * NOT A FLAG, TWO DATES. `confirmedAt` and `unsubscribedAt` — a flag records
 * that something is true and a date records when it became true, and PECR
 * reg. 22 asks for evidence of consent rather than an assertion of it. "She
 * consented" is a claim; "she pressed the link at 09:14 on 4 August" is
 * something you can hand to somebody.
 *
 * NOTHING IS EVER SENT TO AN UNCONFIRMED ADDRESS. Anyone can type anyone's
 * address into a form, so a row that has been asked for and not confirmed is
 * an ALLEGATION that somebody wants the letter, not a fact — sending to it
 * would be mailing a person who never asked, which is the definition of the
 * thing the law is about. `confirmedRecipients` is the ONE query the send path
 * uses, and it is the only place the rule needs to hold.
 */

/**
 * Two spellings of one address are one person.
 *
 * Lowercased and trimmed on the way in, because the unique constraint is what
 * stops somebody appearing twice, and `Sarah@…` and `sarah@…` are the same
 * mailbox everywhere that matters.
 */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Is this an address at all?
 *
 * DELIBERATELY LOOSE. Anything stricter rejects real addresses — the grammar
 * in RFC 5322 admits quoted local parts, plus-addressing, apostrophes and
 * new top-level domains that appear faster than a regex is updated — and the
 * only check that actually proves an address works is sending to it and having
 * somebody press the link. Which is exactly what happens next. So this catches
 * the typo ("sarah@gmail" with no dot, a stray space) and nothing else.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value) && value.length <= 254;
}

/** The secret both signed links are built on. Falls back exactly as sessions do. */
function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or shorter than 32 characters. Confirmation links cannot be signed without it.",
      );
    }
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  return value;
}

/**
 * The confirmation link's token.
 *
 * SIGNED RATHER THAN STORED, and that is a decision forced by the schema
 * rather than chosen: `Subscriber` carries `unsubscribeToken` and no second
 * column, and this pass was asked not to alter the schema. So the confirmation
 * token is derived instead — an HMAC over the row's id and the address it was
 * created for, keyed on AUTH_SECRET.
 *
 * What that buys and what it costs, honestly:
 *
 *  + Nothing extra is written, and there is no table of live links to expire.
 *  + Changing the address invalidates the link, because the address is inside
 *    the signature. A link for `sarah@…` cannot confirm anybody else.
 *  + Rotating AUTH_SECRET invalidates every outstanding link, which is the
 *    same blast radius a password change already has on sessions.
 *  - There is no expiry and no single use. A confirmation link stays valid
 *    while the row does. That is acceptable HERE and would not be for a reset:
 *    the worst it can do is set `confirmedAt` on a row whose owner already
 *    asked to be on the list, and the unsubscribe link undoes it in one press.
 *
 * If a `confirmToken` column ever lands, this becomes a stored token like the
 * reset one and the reasoning above is the migration note.
 */
export function confirmToken(id: number, email: string): string {
  return createHmac("sha256", secret())
    .update(`subscriber-confirm:${id}:${normaliseEmail(email)}`)
    .digest("base64url");
}

/** Constant-time, because this is a signature check and not a lookup. */
function sameToken(one: string, other: string): boolean {
  const a = Buffer.from(one);
  const b = Buffer.from(other);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 32 bytes, printed into every letter this person ever gets. */
export function newUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

export type JoinOutcome =
  /** A confirmation is on its way. Also the answer for "already asked". */
  | { ok: true; state: "pending"; id: number; email: string; token: string }
  /** Already on the list and already confirmed. Nothing was sent. */
  | { ok: true; state: "already" }
  | { ok: false; error: string };

/**
 * Somebody asking for the letter.
 *
 * IDEMPOTENT BY ADDRESS, and it has to be: people press a button twice, and a
 * unique-constraint error shown to a visitor is the site blaming them for its
 * own bookkeeping. Four cases, one row:
 *
 *  - New address → row created, unconfirmed, confirmation sent.
 *  - Asked before, never confirmed → the same row, a fresh confirmation. The
 *    link is derived rather than stored, so "resend" is genuinely the same
 *    link and there is no stack of live ones.
 *  - Confirmed already → nothing written, nothing sent, and the screen says
 *    the same thing it says to everyone else (see the note in the action).
 *  - Unsubscribed before → `unsubscribedAt` and `confirmedAt` are both cleared
 *    and a confirmation goes out. Coming back is allowed, and it is a fresh
 *    opt-in rather than a reinstatement — she has to press the link again.
 */
export async function joinList(
  rawEmail: string,
  rawName: string,
): Promise<JoinOutcome> {
  const email = normaliseEmail(rawEmail);
  const name = rawName.trim().slice(0, 120) || null;

  if (!email) {
    return { ok: false, error: "Put your email address in and it will go." };
  }
  if (!looksLikeEmail(email)) {
    return {
      ok: false,
      error:
        "That does not look like an email address. Check it for a missing dot or a stray space.",
    };
  }

  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing && existing.confirmedAt && !existing.unsubscribedAt) {
    return { ok: true, state: "already" };
  }

  const row = existing
    ? await prisma.subscriber.update({
        where: { id: existing.id },
        data: {
          // Her name, if she gave one this time. A blank second time does not
          // erase what she typed the first time.
          ...(name ? { name } : {}),
          confirmedAt: null,
          unsubscribedAt: null,
        },
      })
    : await prisma.subscriber.create({
        data: { email, name, unsubscribeToken: newUnsubscribeToken() },
      });

  return {
    ok: true,
    state: "pending",
    id: row.id,
    email: row.email,
    token: confirmToken(row.id, row.email),
  };
}

export type ConfirmOutcome =
  { ok: true; email: string; already: boolean } | { ok: false };

/**
 * Pressing the link in the confirmation email.
 *
 * ALREADY-CONFIRMED IS A SUCCESS, not an error. She pressed the link twice, or
 * her mail client prefetched it and then she pressed it; telling her something
 * went wrong would be telling her a lie about her own inbox.
 *
 * A confirmation also lifts a previous unsubscribe, because the only way to
 * hold this token is to have received the message at that address.
 */
export async function confirmSubscriber(
  id: number,
  token: string,
): Promise<ConfirmOutcome> {
  if (!Number.isInteger(id) || !token) return { ok: false };

  const row = await prisma.subscriber.findUnique({ where: { id } });
  if (!row) return { ok: false };
  if (!sameToken(token, confirmToken(row.id, row.email))) return { ok: false };

  if (row.confirmedAt && !row.unsubscribedAt) {
    return { ok: true, email: row.email, already: true };
  }

  await prisma.subscriber.update({
    where: { id: row.id },
    data: { confirmedAt: new Date(), unsubscribedAt: null },
  });
  return { ok: true, email: row.email, already: false };
}

export type UnsubscribeOutcome =
  { ok: true; email: string; already: boolean } | { ok: false };

/** Who a token belongs to, without spending it — for drawing the page. */
export async function findByUnsubscribeToken(token: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return prisma.subscriber.findUnique({ where: { unsubscribeToken: token } });
}

/**
 * Leaving.
 *
 * ONE DATE ON ONE ROW, which is the whole of what the token can do. The row
 * stays: `NewsletterSend` points at it, and the record of what was sent to
 * whom must outlive somebody asking to stop receiving it.
 *
 * Idempotent, and an already-unsubscribed token reports success — she pressed
 * it twice and both times the answer is that she is off the list.
 */
export async function unsubscribeByToken(
  token: string,
): Promise<UnsubscribeOutcome> {
  const row = await findByUnsubscribeToken(token);
  if (!row) return { ok: false };

  if (row.unsubscribedAt) return { ok: true, email: row.email, already: true };

  await prisma.subscriber.update({
    where: { id: row.id },
    data: { unsubscribedAt: new Date() },
  });
  return { ok: true, email: row.email, already: false };
}

/**
 * WHO A LETTER MAY BE SENT TO. The one query the send path is allowed to use.
 *
 * Confirmed, and not unsubscribed. Both halves matter and neither is a
 * preference: an unconfirmed address never asked, and an unsubscribed one
 * asked to stop. There is deliberately no argument that relaxes it.
 */
export function confirmedRecipients() {
  return prisma.subscriber.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, confirmedAt: true },
  });
}

/** Everyone, for the screen — which shows the pending and the departed too. */
export function allSubscribers() {
  return prisma.subscriber.findMany({
    orderBy: { joinedAt: "desc" },
  });
}
