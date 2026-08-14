import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Booking, Workshop } from "@prisma/client";
import { SITE_URL } from "@/content/site";
import { prisma } from "@/lib/db";
import { isPast, refundDeadline } from "@/lib/format";
import { stripe } from "@/lib/stripe";

/**
 * Places, money and the cancellation link.
 *
 * Two things happen to a booking and both of them are in here, because both
 * are transitions that must not half-happen: a payment becomes a place, and a
 * place goes back. Who gets told about either is `lib/email/bookings.ts`; the
 * page and the webhook do the telling, so that a change of wording never
 * reaches into a transaction.
 *
 * THE RULE THAT SHAPES ALL OF IT (D-16): capacity is now enforced. It is
 * checked when a Checkout Session is opened, and checked AGAIN under a lock
 * when the payment is confirmed, because between those two moments somebody
 * else can pay. The second check is the real one.
 */

/** A booking with the day it is for — the only shape any page or email wants. */
export type BookingWithWorkshop = Booking & { workshop: Workshop };

/** "TFW-0042" — what somebody quotes in an email. Derived, never stored. */
export function bookingReference(id: number): string {
  return `TFW-${String(id).padStart(4, "0")}`;
}

// ── places ───────────────────────────────────────────────────────────────────

/**
 * How many places are gone.
 *
 * Paid bookings only, which is what makes a cancellation give the place back
 * with no second column to keep in step: a cancelled booking simply stops
 * counting.
 */
export async function placesSold(workshopId: number): Promise<number> {
  const { _sum } = await prisma.booking.aggregate({
    where: { workshopId, status: "paid" },
    _sum: { places: true },
  });
  return _sum.places ?? 0;
}

/**
 * The same figure for a whole list, in one query.
 *
 * The index draws a row per workshop and each row says what is left; asking
 * per row would be a query per row.
 */
export async function placesSoldByWorkshop(
  workshopIds: number[],
): Promise<Map<number, number>> {
  if (workshopIds.length === 0) return new Map();
  const rows = await prisma.booking.groupBy({
    by: ["workshopId"],
    where: { workshopId: { in: workshopIds }, status: "paid" },
    _sum: { places: true },
  });
  return new Map(rows.map((row) => [row.workshopId, row._sum.places ?? 0]));
}

/**
 * Never below zero.
 *
 * A room can be oversold by hand — Marianne can lower the capacity of a day
 * that is already full — and "−2 places left" on a public page is worse than
 * "full", which is what it means.
 */
export function placesLeft(capacity: number, sold: number): number {
  return Math.max(0, capacity - sold);
}

// ── the cancellation link ────────────────────────────────────────────────────

/**
 * A new link, and the hash to store against it.
 *
 * 32 random bytes: unguessable, and treated as a bearer credential — whoever
 * holds it can cancel that booking and move that money, which is why only its
 * hash is kept (see the note on `Booking.cancellationTokenHash`).
 *
 * ISSUING IS ROTATION. Sending the link again mints a new one and the old
 * email's link stops working, because the old token cannot be recovered from
 * what is stored. That is the cost of not storing it, and it is the right way
 * round.
 */
export function issueCancellationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashCancellationToken(token) };
}

export function hashCancellationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function cancellationLink(token: string): string {
  return `${SITE_URL}/cancel/${token}`;
}

/**
 * The booking a link points at, or nothing.
 *
 * A wrong token, a spent one and a token for a day that has been and gone all
 * return null, and the page says the same sentence for all three. Anything
 * else would answer "does a booking exist for this token?" to whoever asked.
 */
export async function findBookingByToken(
  token: string,
): Promise<BookingWithWorkshop | null> {
  if (!token || token.length < 20) return null;
  const booking = await prisma.booking.findUnique({
    where: { cancellationTokenHash: hashCancellationToken(token) },
    include: { workshop: true },
  });
  if (!booking) return null;
  // The link dies with the day, as the approved page says it does.
  if (isPast(booking.workshop.date)) return null;
  return booking;
}

/**
 * Whether this booking can still be refunded, by its OWN workshop's terms.
 *
 * refundDays is per workshop and never a site-wide rule. Zero means it cannot
 * be refunded at all, and `refundDeadline` returns null for it rather than
 * inventing a date.
 *
 * The deadline day itself still counts, which is what "cancel by 6 September"
 * means to the person reading it.
 */
export function isRefundable(workshop: Workshop, now = new Date()): boolean {
  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  return deadline !== null && !isPast(deadline, now);
}

/**
 * Whether money is still owed back on a cancelled booking.
 *
 * `cancelledUnrefunded` means several different things and this is what tells
 * them apart, derived rather than stored: a place given up after the refund
 * date, where nothing was ever owed; a refund that was owed and would not go
 * through; and a place Marianne cancelled from the portal while the money was
 * still hers to send back, where she chose to keep it for now. The test is the
 * terms as they stood ON THE DAY IT WAS CANCELLED, not today — otherwise a
 * booking cancelled well inside the window would quietly stop being owed as the
 * workshop approached.
 */
export function refundOwed(booking: BookingWithWorkshop): boolean {
  if (booking.status !== "cancelledUnrefunded") return false;
  if (booking.cancelledReason === "soldOut") return true;
  return booking.cancelledAt
    ? isRefundable(booking.workshop, booking.cancelledAt)
    : false;
}

/**
 * Whether this money has already gone back.
 *
 * `refundId` and not `status`, because the two can come apart: a booking she
 * has refunded WITHOUT cancelling is still `paid` and still holding its place,
 * and offering to refund it a second time would be the portal forgetting what
 * it did (see the note on `Booking.refundId`).
 */
export function alreadyRefunded(booking: Booking): boolean {
  return booking.refundId !== null;
}

// ── a payment becomes a place ────────────────────────────────────────────────

export type ConfirmResult =
  /** The place is theirs. */
  | { outcome: "confirmed"; booking: BookingWithWorkshop; token: string }
  /**
   * They paid and there was no place — the losing side of the race in D-16.
   * The booking is recorded as cancelled with the money still to go back; the
   * caller refunds it.
   */
  | { outcome: "noPlace"; booking: BookingWithWorkshop }
  /** The workshop was deleted between paying and confirming. Nothing to write. */
  | { outcome: "workshopGone" }
  /** This event has already been acted on. Do nothing, say 200, move on. */
  | { outcome: "alreadyHandled" };

/**
 * Write the booking a completed checkout has earned — the ONLY way a paid
 * Booking is ever created.
 *
 * Everything that has to be atomic is in one transaction:
 *
 *  1. The event id goes in first. Its primary key is the idempotency guard: a
 *     redelivered event collides here and takes the whole transaction down
 *     with it, so one event can never become two bookings or two emails.
 *  2. The workshop row is LOCKED. Two people paying for the last place at the
 *     same instant arrive here at the same instant; the lock makes them a
 *     queue, so the second one counts places the first has already taken. A
 *     plain count without the lock would let both read "1 left".
 *  3. Places are counted and the answer decides which booking gets written.
 *
 * The amount is Stripe's `amount_total`, not our recomputed figure: what they
 * were actually charged is what has to be refunded. The two are compared and a
 * difference is logged, because the only way it happens is a price edited while
 * somebody was at the checkout.
 */
export async function confirmPaidBooking(input: {
  eventId: string;
  eventType: string;
  workshopId: number;
  places: number;
  amountPence: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt: Date;
}): Promise<ConfirmResult> {
  const { token, hash } = issueCancellationToken();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({
        data: { id: input.eventId, type: input.eventType },
      });

      // Locks the row for the rest of this transaction. Everything below reads
      // a place-count nobody else can be changing.
      const locked = await tx.$queryRaw<
        { id: number; capacity: number; priceGBP: number }[]
      >`SELECT id, capacity, "priceGBP" FROM "Workshop" WHERE id = ${input.workshopId} FOR UPDATE`;
      const workshop = locked[0];
      if (!workshop) return { outcome: "workshopGone" as const };

      const expected = workshop.priceGBP * input.places;
      if (expected !== input.amountPence) {
        console.warn(
          `[bookings] session ${input.stripeSessionId} paid ${input.amountPence} but ${input.places} places at the current price is ${expected}. The price was probably edited mid-checkout. Recording what was paid.`,
        );
      }

      const { _sum } = await tx.booking.aggregate({
        where: { workshopId: input.workshopId, status: "paid" },
        _sum: { places: true },
      });
      const room = placesLeft(workshop.capacity, _sum.places ?? 0);
      const hasRoom = input.places <= room;

      const booking = await tx.booking.create({
        data: {
          workshopId: input.workshopId,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          places: input.places,
          amountPence: input.amountPence,
          currency: input.currency,
          stripeSessionId: input.stripeSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          paidAt: input.paidAt,
          cancellationTokenHash: hash,
          ...(hasRoom
            ? { status: "paid" as const }
            : {
                status: "cancelledUnrefunded" as const,
                cancelledAt: new Date(),
                cancelledReason: "soldOut" as const,
              }),
        },
        include: { workshop: true },
      });

      return hasRoom
        ? { outcome: "confirmed" as const, booking, token }
        : { outcome: "noPlace" as const, booking };
    });
  } catch (error) {
    // The event id or the session id was already there: this payment has been
    // dealt with. Both are unique on purpose, and either collision means the
    // same thing.
    if (isUniqueViolation(error)) return { outcome: "alreadyHandled" };
    throw error;
  }
}

// ── a place goes back ────────────────────────────────────────────────────────

export type CancelResult =
  /** This call is the one that cancelled it. Tell people. */
  | { outcome: "cancelled"; booking: BookingWithWorkshop; refunded: boolean }
  /**
   * The money was owed and Stripe would not give it back. The place is
   * released and the refund is outstanding — Marianne has to finish it by hand.
   */
  | { outcome: "refundFailed"; booking: BookingWithWorkshop; error: string }
  /** Somebody — or the same person, twice — got there first. Say so kindly. */
  | { outcome: "alreadyCancelled"; booking: BookingWithWorkshop };

/**
 * Cancel a booking, refunding it if its own refund date has not passed.
 *
 * ORDER MATTERS, and it is refund-then-record on purpose. Stripe's idempotency
 * key makes the refund safe to repeat — the same key returns the same refund
 * object and never moves money twice — so repeating the OUTSIDE call is free,
 * while a database write that happened before a refund that failed would be a
 * record saying money went back when it did not.
 *
 * The write itself is conditional on the booking still being `paid`, so of two
 * simultaneous clicks exactly one comes back as `cancelled` and sends the
 * emails; the other reads `alreadyCancelled` and shows the reassurance state.
 */
export async function cancelBooking(
  booking: BookingWithWorkshop,
): Promise<CancelResult> {
  if (booking.status !== "paid") {
    return { outcome: "alreadyCancelled", booking };
  }

  // The losing side of a race never comes through here — it is written already
  // cancelled and refunded by `refundSoldOut` below, because there is no paid
  // booking to transition. So every cancellation this function makes is the
  // buyer's own, and the only question is whether the date has passed.
  if (!isRefundable(booking.workshop)) {
    const cancelled = await markCancelled(booking.id, {
      status: "cancelledUnrefunded",
      cancelledReason: "buyer",
    });
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: false }
      : { outcome: "alreadyCancelled", booking: await reread(booking.id) };
  }

  const refund = await refundInFull(booking);
  if (!refund.ok) {
    // The place still goes back — holding a chair for somebody who has said
    // they are not coming helps nobody — but nothing here may claim the money
    // moved. `cancelledUnrefunded` with a reason is how the ledger says
    // "cancelled, and we owe them".
    await markCancelled(booking.id, {
      status: "cancelledUnrefunded",
      cancelledReason: "buyer",
    });
    console.error(
      `[bookings] refund FAILED for ${bookingReference(booking.id)} (${booking.amountPence}p, payment intent ${booking.stripePaymentIntentId}): ${refund.error}`,
    );
    return {
      outcome: "refundFailed",
      booking: await reread(booking.id),
      error: refund.error,
    };
  }

  const cancelled = await markCancelled(booking.id, {
    status: "cancelledRefunded",
    cancelledReason: "buyer",
    refundId: refund.id,
    refundedPence: refund.amount,
    refundedAt: new Date(),
  });

  return cancelled
    ? { outcome: "cancelled", booking: cancelled, refunded: true }
    : { outcome: "alreadyCancelled", booking: await reread(booking.id) };
}

type RefundResult =
  { ok: true; id: string; amount: number } | { ok: false; error: string };

/**
 * The whole amount back, once.
 *
 * The idempotency key is the booking, so every call about one booking is the
 * same call as far as Stripe is concerned: a retry, a double-click, or a
 * restart mid-flight all return the refund that already exists rather than
 * making a second one. This is the guard that stands between a distressed
 * click and a double refund, so it is stated here rather than left to the
 * caller to remember.
 */
async function refundInFull(booking: Booking): Promise<RefundResult> {
  if (!booking.stripePaymentIntentId) {
    return { ok: false, error: "the booking has no payment intent to refund" };
  }
  try {
    const refund = await stripe().refunds.create(
      {
        payment_intent: booking.stripePaymentIntentId,
        amount: booking.amountPence,
        metadata: { bookingReference: bookingReference(booking.id) },
      },
      { idempotencyKey: `refund-booking-${booking.id}` },
    );
    return { ok: true, id: refund.id, amount: refund.amount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

/**
 * The conditional write. Zero rows means somebody else cancelled it between
 * this request reading it and writing — which is a normal thing for a link
 * that gets clicked twice, not an error.
 */
async function markCancelled(
  id: number,
  data: {
    status: "cancelledRefunded" | "cancelledUnrefunded";
    cancelledReason: "buyer" | "marianne";
    refundId?: string;
    refundedPence?: number;
    refundedAt?: Date;
  },
): Promise<BookingWithWorkshop | null> {
  const { count } = await prisma.booking.updateMany({
    where: { id, status: "paid" },
    data: { ...data, cancelledAt: new Date() },
  });
  return count === 1 ? reread(id) : null;
}

function reread(id: number): Promise<BookingWithWorkshop> {
  return prisma.booking.findUniqueOrThrow({
    where: { id },
    include: { workshop: true },
  });
}

/**
 * Refund a booking that never had a place — the losing side of the race.
 *
 * Separated from `cancelBooking` because the booking is written already
 * cancelled: there is no `paid` row to transition, only money to return.
 */
export async function refundSoldOut(
  booking: BookingWithWorkshop,
): Promise<{ refunded: boolean; error?: string }> {
  const refund = await refundInFull(booking);
  if (!refund.ok) {
    console.error(
      `[bookings] could not refund the oversold ${bookingReference(booking.id)} (${booking.amountPence}p): ${refund.error}. Marianne has to refund this one by hand in Stripe.`,
    );
    return { refunded: false, error: refund.error };
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "cancelledRefunded",
      refundId: refund.id,
      refundedPence: refund.amount,
      refundedAt: new Date(),
    },
  });
  return { refunded: true };
}

// ── the ledger, and what Marianne can do to a row ────────────────────────────

/**
 * Every booking there has ever been, newest payment last, with its day.
 *
 * ONE query for the whole page. The split into "still to come" and the archive
 * is made from `workshop.date` at render — it is a consequence of today's date
 * and nothing she files, so there is no column to keep in step and no state to
 * get stuck in. A day that passes moves its bookings overnight by itself.
 */
export function listAllBookings(): Promise<BookingWithWorkshop[]> {
  return prisma.booking.findMany({
    include: { workshop: true },
    orderBy: [{ workshop: { date: "asc" } }, { id: "asc" }],
  });
}

export function findBookingById(
  id: number,
): Promise<BookingWithWorkshop | null> {
  return prisma.booking.findUnique({
    where: { id },
    include: { workshop: true },
  });
}

/**
 * Whether Marianne can still cancel this from the portal.
 *
 * A day that has been cannot be cancelled — there is no place left to release
 * and nobody's plans left to change, and a record saying she cancelled a
 * workshop that had already run would be a false one. Refunding it is still
 * open to her, which is the control that does the only thing left worth doing.
 */
export function isCancellable(booking: BookingWithWorkshop): boolean {
  return booking.status === "paid" && !isPast(booking.workshop.date);
}

/** Deleting is only ever reachable on a booking that was cancelled — see D-18. */
export function isDeletable(booking: Booking): boolean {
  return booking.status !== "paid";
}

export type PortalCancelResult =
  /** This call is the one that cancelled it. */
  | { outcome: "cancelled"; booking: BookingWithWorkshop; refunded: boolean }
  /** The place is released and the refund would not go through. */
  | { outcome: "refundFailed"; booking: BookingWithWorkshop; error: string }
  /** It could not be done, and this says why in words she can read. */
  | { outcome: "refused"; reason: string };

/**
 * Cancel a place from the portal, refunding it or not AS SHE CHOOSES.
 *
 * The sibling of `cancelBooking` above and deliberately not the same function.
 * The buyer's own link has no choice to make — inside the period the money goes
 * back, outside it does not — whereas Marianne is asked, and asked ONLY while
 * the money is still hers to send back. Everything underneath is shared: the
 * same `refundInFull` with the same idempotency key, the same conditional write.
 * A second refund path with different rules is the thing this avoids.
 *
 * ORDER MATTERS, as it does there: Stripe first, then the record. Repeating a
 * refund call under the same key costs nothing and moves nothing; a row
 * claiming money went back when it did not is what somebody discovers weeks
 * later.
 */
export async function cancelBookingFromPortal(
  booking: BookingWithWorkshop,
  options: { refund: boolean },
): Promise<PortalCancelResult> {
  if (booking.status !== "paid") {
    return {
      outcome: "refused",
      reason: "This one has already been cancelled.",
    };
  }
  if (isPast(booking.workshop.date)) {
    return {
      outcome: "refused",
      reason:
        "That day has already been, so there is nothing left to cancel. You can still send the money back.",
    };
  }

  // Already refunded and still holding its place — she comped it earlier and is
  // now releasing the place. There is nothing left to send back, so this
  // cancels and keeps the refund it already carries.
  if (alreadyRefunded(booking)) {
    const cancelled = await markCancelled(booking.id, {
      status: "cancelledRefunded",
      cancelledReason: "marianne",
    });
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: true }
      : { outcome: "refused", reason: "This one has already been cancelled." };
  }

  if (!options.refund) {
    const cancelled = await markCancelled(booking.id, {
      status: "cancelledUnrefunded",
      cancelledReason: "marianne",
    });
    return cancelled
      ? { outcome: "cancelled", booking: cancelled, refunded: false }
      : { outcome: "refused", reason: "This one has already been cancelled." };
  }

  if (!isRefundable(booking.workshop)) {
    // The button that offers this is only drawn inside the period, so arriving
    // here means the page was open while the date passed. Refusing is right:
    // the terms on the row and the terms being applied have to be the same.
    return {
      outcome: "refused",
      reason:
        "The refund period on this one closed while this page was open. Cancel it without a refund, then use refund on the row if you want the money to go back anyway.",
    };
  }

  const refund = await refundInFull(booking);
  if (!refund.ok) {
    // The place still goes back — holding a chair for somebody who has been
    // told they are not coming helps nobody — but nothing may claim the money
    // moved. `cancelledUnrefunded` is the ledger saying "cancelled, and we owe
    // them", and `refundOwed` will read it that way.
    await markCancelled(booking.id, {
      status: "cancelledUnrefunded",
      cancelledReason: "marianne",
    });
    console.error(
      `[bookings] portal refund FAILED for ${bookingReference(booking.id)} (${booking.amountPence}p, payment intent ${booking.stripePaymentIntentId}): ${refund.error}`,
    );
    return {
      outcome: "refundFailed",
      booking: await reread(booking.id),
      error: refund.error,
    };
  }

  const cancelled = await markCancelled(booking.id, {
    status: "cancelledRefunded",
    cancelledReason: "marianne",
    refundId: refund.id,
    refundedPence: refund.amount,
    refundedAt: new Date(),
  });
  return cancelled
    ? { outcome: "cancelled", booking: cancelled, refunded: true }
    : { outcome: "refused", reason: "This one has already been cancelled." };
}

export type PortalRefundResult =
  | { outcome: "refunded"; booking: BookingWithWorkshop }
  /** Stripe would not do it. NOTHING has been written. */
  | { outcome: "failed"; error: string }
  | { outcome: "refused"; reason: string };

/**
 * Send the money back, on its own.
 *
 * The goodwill path, and the one place where a refund is not tied to a
 * cancellation. Two situations reach it and both are hers to decide rather than
 * the refund period's: a place she cancelled earlier and kept the money for,
 * and a booking she is not cancelling at all — somebody who is still coming and
 * whom she has decided not to charge. The second leaves the row `paid`, so the
 * place stays held and the room's count is unchanged.
 *
 * NOTHING IS WRITTEN UNLESS STRIPE SAYS THE MONEY MOVED. A failed refund
 * returns `failed` and leaves the row exactly as it was, which is the only
 * honest outcome: a ledger claiming a refund that never happened is worse than
 * a repeated call to Stripe, and the idempotency key makes repeating free.
 */
export async function refundBookingFromPortal(
  booking: BookingWithWorkshop,
): Promise<PortalRefundResult> {
  if (alreadyRefunded(booking)) {
    return {
      outcome: "refused",
      reason:
        "This money has already gone back — there is nothing left to send.",
    };
  }

  const refund = await refundInFull(booking);
  if (!refund.ok) {
    console.error(
      `[bookings] portal refund FAILED for ${bookingReference(booking.id)} (${booking.amountPence}p, payment intent ${booking.stripePaymentIntentId}): ${refund.error}`,
    );
    return { outcome: "failed", error: refund.error };
  }

  // Conditional on the row still being what it was, and on no refund having
  // landed on it since — two clicks from two tabs write once. Stripe has
  // already returned the same refund object to both, so the loser of the race
  // has moved no money either.
  const { count } = await prisma.booking.updateMany({
    where: { id: booking.id, status: booking.status, refundId: null },
    data: {
      // A booking that was cancelled becomes "cancelled and refunded". One that
      // is still live stays live: she has refunded them, not removed them.
      status:
        booking.status === "paid" ? "paid" : ("cancelledRefunded" as const),
      refundId: refund.id,
      refundedPence: refund.amount,
      refundedAt: new Date(),
    },
  });
  if (count !== 1) {
    return {
      outcome: "refused",
      reason:
        "Somebody got there first — this one has already been dealt with.",
    };
  }

  return { outcome: "refunded", booking: await reread(booking.id) };
}

/**
 * Take the record away for good.
 *
 * Refused on a booking that is still `paid`, in here as well as in the page
 * that draws the button, because a server action is a POST endpoint of its own
 * and a disabled button is not a rule (D-18).
 */
export async function deleteBookingFromPortal(
  booking: Booking,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isDeletable(booking)) {
    return {
      ok: false,
      reason:
        "This place is still held and the money is still yours to account for. Cancel it first — then deleting is offered.",
    };
  }
  await prisma.booking.delete({ where: { id: booking.id } });
  return { ok: true };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
