import "server-only";
import type { Prisma, Service, ServiceRequest } from "@prisma/client";
import {
  hashLinkToken,
  issueLinkToken,
  isUniqueViolation,
  withOffering,
  type BookingWithOffering,
} from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { formatInstant } from "@/lib/format";

/**
 * Requests, and the answers Marianne gives them.
 *
 * A visitor ASKS (D-24); she APPROVES or DECLINES; approving sends them a link
 * to pay, and an approval nobody pays for releases itself. That last part is the
 * shape of this whole file, so it is worth saying first:
 *
 * RELEASE IS LAZY, AS IT IS FOR A COURSE BALANCE (D-23). An approval stops
 * being live the moment `payBy` is behind us with no Booking against it. No job
 * runs, nothing sweeps, no column is set. That is not a saving — it is the only
 * version that cannot be wrong, because an approval released by something that
 * has to fire is an approval that stays live on the morning it does not.
 *
 * AND THE ROW IS NOT REWRITTEN BY IT. `status` stays `confirmed`, because
 * `confirmed` records what SHE DID and the passing of a Tuesday is not
 * something she did. What changes is what the arithmetic says about it — which
 * is exactly why there is no `expired` in the enum.
 *
 * The write side of the public form lives beside the form it is submitted from
 * (`app/(site)/services/actions.ts`); the write side of her two answers lives
 * beside the screen she presses them on (`app/(admin)/admin/bookings/actions.ts`).
 * What is HERE is the rule each of them applies, so that the queue, the pay page
 * and the webhook cannot draw three different conclusions from one row.
 */

// ── how long an approval lasts ───────────────────────────────────────────────

/**
 * HOW LONG SOMEBODY HAS TO PAY, from the moment she presses approve.
 *
 * 48 hours, which is `brief.md` §5's own working default for the other half of
 * this same conversation — the hold it wanted on the pending stage. Using a
 * second figure for the second half would put two hold durations in one product
 * and make "how long do people get?" a question with two answers.
 *
 * It is a CONSTANT AND NOT A COLUMN, deliberately. §20 Q7 says the number is a
 * guess and that she will know which way to move it after a fortnight — and
 * §12 already puts hold duration in Site settings, which is a screen that does
 * not exist yet. Adding a per-service or per-request field now would invent a
 * configurable in a place the brief has already assigned somewhere else, and
 * would leave two of them to disagree the day Settings lands. When it does, it
 * reads this file's default and writes one value; nothing else moves.
 *
 * HOURS, NOT DAYS, and measured from the instant she approved. "By Thursday"
 * from a Tuesday-evening approval is not two days, it is one; the brief says
 * 48 hours and this is 48 hours.
 */
export const APPROVAL_HOLD_HOURS = 48;

/** The instant an approval made now would run out. */
export function approvalDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + APPROVAL_HOLD_HOURS * 60 * 60 * 1000);
}

/**
 * The fields any decision about an approval is made from. Narrower than the row
 * so that the queue, the pay page and the webhook can all be handed exactly
 * what they have.
 */
export type ApprovalFacts = {
  status: ServiceRequest["status"];
  payBy: Date | null;
  /** Whether a Booking exists against this approval. */
  paid: boolean;
};

/**
 * Whether an approval has gone unpaid past its window.
 *
 * Compared as INSTANTS, not at midnight granularity the way `isPast` compares a
 * workshop's day. A workshop's date is a day with no time in it and is "coming
 * up" for the whole of itself; this is a deadline somebody was told to the
 * hour, and rounding it to a day would give them most of another one.
 */
export function hasApprovalLapsed(
  request: ApprovalFacts,
  now: Date = new Date(),
): boolean {
  if (request.status !== "confirmed" || request.paid) return false;
  return request.payBy !== null && request.payBy.getTime() <= now.getTime();
}

/**
 * Where a request stands, as ONE answer.
 *
 * Five states, and not one of them is a column: `pending` and `declined` are
 * what she answered, and the other three are what the clock and the Payment
 * table say about an approval. Every screen reads this rather than assembling
 * the same three conditions itself, because the queue saying "waiting to be
 * paid" while the pay page says "released" is exactly the failure the derived
 * approach is chosen to avoid.
 */
export type ApprovalState =
  /** Waiting on her. Nothing has been promised and nothing charged. */
  | "pending"
  /** She said no. The note she gave is on the row. */
  | "declined"
  /** She approved it, the link is out, and the window is still open. */
  | "awaitingPayment"
  /** She approved it, nobody paid, and the window has closed. */
  | "lapsed"
  /** Paid for. There is a Booking against it. */
  | "paid";

export function approvalState(
  request: ApprovalFacts,
  now: Date = new Date(),
): ApprovalState {
  if (request.status === "declined") return "declined";
  if (request.status === "pending") return "pending";
  if (request.paid) return "paid";
  return hasApprovalLapsed(request, now) ? "lapsed" : "awaitingPayment";
}

/**
 * IS THIS ONE STILL ON HER DESK?
 *
 * The one question the queue is split by (operator, 2026-08-19: "requests
 * should be archived when they are approved or declined"). Two states are hers
 * to answer and three are answered:
 *
 *   pending          nobody has said anything yet.
 *   lapsed           she approved it, nobody paid, and it is BACK with her —
 *                    which is why archiving cannot be a column she sets when
 *                    she approves. Nothing runs when an approval expires
 *                    (D-25); the request simply becomes hers again, and a
 *                    stored flag would still say "archived" while the headline
 *                    said "back with you".
 *   awaitingPayment  answered. The link is out and the deadline is running.
 *   declined         answered, and they were told.
 *   paid             answered and paid for; it is a booking now.
 *
 * DERIVED, LIKE EVERYTHING ELSE HERE. `approvalState` already reads the row and
 * the clock; this reads `approvalState`. There is no second fact to keep in
 * step and nothing to migrate — the archive is a view of the same rows.
 */
export function needsHer(state: ApprovalState): boolean {
  return state === "pending" || state === "lapsed";
}

// ── reading ──────────────────────────────────────────────────────────────────

/**
 * A request with the service it is against and the booking that paid for it —
 * the only shape the queue wants.
 *
 * The booking is included rather than counted because the queue prints what
 * arrived: the amount, the reference and the day it was paid.
 */
const withAnswer = {
  service: true,
  booking: { include: { payments: true } },
} satisfies Prisma.ServiceRequestInclude;

export type ServiceRequestWithService = Awaited<
  ReturnType<typeof listServiceRequests>
>[number];

export function listServiceRequests() {
  return prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: withAnswer,
  });
}

export function findServiceRequest(id: number) {
  return prisma.serviceRequest.findUnique({
    where: { id },
    include: withAnswer,
  });
}

/** Whether a request has been paid for — the third of `ApprovalFacts`. */
export function factsOf(request: {
  status: ServiceRequest["status"];
  payBy: Date | null;
  booking: { id: number } | null;
}): ApprovalFacts {
  return {
    status: request.status,
    payBy: request.payBy,
    paid: request.booking !== null,
  };
}

/**
 * How many are still waiting on her.
 *
 * Pending ones, AND approvals that lapsed unpaid — because a lapse is a thing
 * that happened to somebody who was told yes, and it is back on her desk. The
 * count would otherwise say nothing is waiting on the morning three approvals
 * quietly ran out.
 *
 * The number without the rows, for the dashboard, which is still a stub. It is
 * here rather than in that stub because the definition of "waiting on her"
 * belongs beside the states it is made of.
 */
export function countRequestsNeedingHer(now: Date = new Date()) {
  return prisma.serviceRequest.count({
    where: {
      OR: [
        { status: "pending" },
        { status: "confirmed", payBy: { lte: now }, booking: { is: null } },
      ],
    },
  });
}

// ── the pay link ─────────────────────────────────────────────────────────────

export type ApprovalWithService = ServiceRequest & {
  service: Service;
  booking: BookingWithOffering | null;
};

/**
 * The approval a /pay link points at, or nothing.
 *
 * The same rules and the same silence as `findBookingByBalanceToken`: a wrong
 * token, a token for a request that was never approved and a token retired by a
 * second approval all return null, and the page says one sentence for all
 * three. Anything else would answer "is there an approval behind this token?"
 * to whoever asked.
 *
 * A LAPSED APPROVAL IS RETURNED, NOT HIDDEN. The page has something true and
 * useful to say about it — this ran out on Thursday, nothing was charged, write
 * to her — and that is the whole reason the link points at our own address
 * rather than at a Stripe URL (D-23).
 */
export async function findApprovalByPayToken(
  token: string,
): Promise<ApprovalWithService | null> {
  if (!token || token.length < 20) return null;
  return prisma.serviceRequest.findUnique({
    where: { payTokenHash: hashLinkToken(token) },
    include: { service: true, booking: { include: withOffering } },
  });
}

// ── she approves ─────────────────────────────────────────────────────────────

/**
 * The smallest figure worth taking, and the largest worth taking by accident.
 *
 * A floor because Stripe refuses very small charges and because a session for
 * 40p is a typo. A ceiling because the field takes POUNDS and the most likely
 * mistake in it is typing pence — £70 entered as 7000 would ask somebody for
 * seven thousand pounds, and a confirmation dialog reading "£7,000" is not the
 * only thing that should stand between her and that.
 */
const MIN_APPROVED_PENCE = 100;
const MAX_APPROVED_PENCE = 500_000;

export type ApproveResult =
  /** Approved. The token is returned ONCE, for the email; only its hash is kept. */
  | {
      outcome: "approved";
      request: ApprovalWithService;
      payToken: string;
      /** True when this replaced an approval that had already lapsed. */
      again: boolean;
    }
  /** It could not be done, and this says why in words she can read. */
  | { outcome: "refused"; reason: string };

/**
 * Approve a request: record what she agreed, mint the link, and let the caller
 * send it.
 *
 * RE-READ AND DECIDED IN ONE TRANSACTION, under a row lock. The queue she
 * pressed it from may be minutes old, and two tabs open on it is an ordinary
 * thing — so the state is read here, at the moment of writing, and the write is
 * conditional on it. Of two simultaneous presses exactly one approves and sends
 * an email; the other reads back "this was already approved" and sends nothing.
 * A second approval would otherwise mean two links in two emails, one of them
 * quietly dead, and possibly two different figures.
 *
 * APPROVING AGAIN IS ALLOWED ON A LAPSED ONE, AND ONLY ON A LAPSED ONE. That is
 * the recovery path the lazy release needs: nobody paid, she still wants to see
 * them, so she approves again — at whatever figure is right now — and the new
 * token retires the link in the old email by existing. Approving a live one
 * would be a second link for the same thing, and approving a paid one would ask
 * somebody to pay twice.
 *
 * THE EMAIL IS THE CALLER'S JOB, and deliberately outside this transaction: the
 * approval is the durable fact, and a message that would not send must not undo
 * a decision she made. What it costs is that a failed send leaves an approval
 * whose link nobody has — which is why the caller says so on the screen and the
 * row shows the state plainly.
 */
export async function approveRequest(input: {
  id: number;
  /** PENCE, as she approved it — what the client is asked for. */
  pence: number;
  /** When it will happen, in her words. */
  agreedTime: string;
  now?: Date;
}): Promise<ApproveResult> {
  const agreedTime = input.agreedTime.trim();
  if (!agreedTime) {
    return {
      outcome: "refused",
      reason:
        "Say when it will happen before you approve it — they are about to be asked to pay for it, and the email has to be able to tell them when it is.",
    };
  }
  if (!Number.isInteger(input.pence)) {
    return {
      outcome: "refused",
      reason: "That is not an amount. Write it in pounds, like 70 or 82.50.",
    };
  }
  if (input.pence < MIN_APPROVED_PENCE || input.pence > MAX_APPROVED_PENCE) {
    return {
      outcome: "refused",
      reason:
        "That amount looks wrong. It has to be between £1 and £5,000 — the field takes pounds, so £70 is 70 rather than 7000.",
    };
  }

  const now = input.now ?? new Date();
  const link = issueLinkToken();

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "ServiceRequest" WHERE id = ${input.id} FOR UPDATE`;
    if (!locked[0]) return { outcome: "refused" as const, reason: GONE };

    const before = await tx.serviceRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { booking: { select: { id: true } } },
    });

    const state = approvalState(factsOf(before), now);
    if (state === "paid") {
      return {
        outcome: "refused" as const,
        reason:
          "This one has already been paid for. It is on the bookings page now.",
      };
    }
    if (state === "declined") {
      return {
        outcome: "refused" as const,
        reason:
          "You declined this one, and they have been told. If you have changed your mind, write to them — approving it now would send a payment link for a session they were told was not happening.",
      };
    }
    if (state === "awaitingPayment") {
      return {
        outcome: "refused" as const,
        reason: `This one was already approved${
          before.approvedAt ? ` on ${formatInstant(before.approvedAt)}` : ""
        }, and the link to pay is already with them. Nothing has been sent again.`,
      };
    }

    await tx.serviceRequest.update({
      where: { id: input.id },
      data: {
        status: "confirmed",
        approvedAt: now,
        approvedPence: input.pence,
        agreedTime,
        payTokenHash: link.hash,
        payBy: approvalDeadline(now),
        // A request approved again after lapsing was never declined, and a row
        // carrying both would read as two answers.
        declinedAt: null,
        declineNote: null,
      },
    });

    return { outcome: "approved" as const, again: state === "lapsed" };
  });

  if (result.outcome === "refused") return result;

  const request = await prisma.serviceRequest.findUniqueOrThrow({
    where: { id: input.id },
    include: { service: true, booking: { include: withOffering } },
  });
  return {
    outcome: "approved",
    request,
    payToken: link.token,
    again: result.again,
  };
}

// ── she declines ─────────────────────────────────────────────────────────────

export type DeclineResult =
  | { outcome: "declined"; request: ApprovalWithService }
  | { outcome: "refused"; reason: string };

const GONE = "That request is no longer here.";

/**
 * Decline a request, with a short note that goes to them.
 *
 * The same shape as approving and for the same reasons: locked, re-read,
 * decided here. Declining a LAPSED approval is allowed — nobody paid, and
 * saying so plainly is better than leaving it to run out silently — but
 * declining one that has been paid for is not, because that is a cancellation
 * and a cancellation is about money. The bookings page owns that.
 */
export async function declineRequest(input: {
  id: number;
  note: string;
  now?: Date;
}): Promise<DeclineResult> {
  const note = input.note.trim();
  if (!note) {
    return {
      outcome: "refused",
      reason:
        "Write them a line first. A decline with nothing in it arrives as a closed door, and this is somebody who asked you for an hour.",
    };
  }

  const now = input.now ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "ServiceRequest" WHERE id = ${input.id} FOR UPDATE`;
    if (!locked[0]) return { outcome: "refused" as const, reason: GONE };

    const before = await tx.serviceRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { booking: { select: { id: true } } },
    });

    const state = approvalState(factsOf(before), now);
    if (state === "paid") {
      return {
        outcome: "refused" as const,
        reason:
          "This one has been paid for, so declining it is not the thing to do — it would leave their money with you and tell them nothing about it. Cancel it on the bookings page instead, where the refund is part of the same decision.",
      };
    }
    if (state === "declined") {
      return {
        outcome: "refused" as const,
        reason: "You have already declined this one, and they were told.",
      };
    }

    await tx.serviceRequest.update({
      where: { id: input.id },
      data: {
        status: "declined",
        declinedAt: now,
        declineNote: note,
        // The link in any email they hold stops working the moment this is
        // cleared, which is the point: a declined request must not be payable.
        payTokenHash: null,
        payBy: null,
      },
    });
    return { outcome: "declined" as const };
  });

  if (result.outcome === "refused") return result;

  return {
    outcome: "declined",
    request: await prisma.serviceRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { service: true, booking: { include: withOffering } },
    }),
  };
}

// ── the payment arrives ──────────────────────────────────────────────────────

export type ServicePaymentResult =
  /** The session is booked. `cancelToken` goes into their confirmation. */
  | {
      outcome: "confirmed";
      booking: BookingWithOffering;
      cancelToken: string;
    }
  /**
   * There was no live approval to honour — it lapsed, or she declined it, or
   * she withdrew it and approved again at a different figure. The caller
   * refunds this payment and tells both people.
   */
  | { outcome: "approvalGone"; request: ApprovalWithService; why: string }
  /** A SECOND payment for a session already paid for. Refunded, both told. */
  | { outcome: "duplicate"; request: ApprovalWithService }
  /** The request is gone entirely. Nothing to write; the payment is refunded. */
  | { outcome: "requestGone" }
  /** This event has already been acted on. Do nothing, say 200, move on. */
  | { outcome: "alreadyHandled" };

/**
 * Write the session booking a completed checkout has earned — the ONLY way a
 * paid Booking for a service is ever created.
 *
 * The same shape as `confirmPaidBooking` and `confirmBalancePayment`, and for
 * the same reasons (D-20): the event id goes in FIRST, so a redelivery collides
 * on its primary key and takes the whole transaction down with it; the row is
 * LOCKED, so two checkouts opened from one link become a queue rather than two
 * bookings; the decision is made under that lock against what is true now; and
 * the outcome is stamped, so the record says what was DONE and not merely that
 * something arrived. Every side effect — the refund, the confirmation, the
 * apology — is the caller's, after this has committed.
 *
 * WHAT IS BEING DECIDED HERE IS NOT CAPACITY. A session has no room and no
 * places; one-to-one means one. The question under the lock is whether the
 * approval this payment is against is still live — which is why the lapsed and
 * declined cases are refused rather than counted.
 *
 * THE AMOUNT IS STRIPE'S. What they were actually charged is what would have to
 * be refunded. It is compared against what she approved and a difference is
 * logged loudly, because the only way that happens is an approval replaced
 * while somebody was at the checkout.
 */
export async function confirmServicePayment(input: {
  eventId: string;
  eventType: string;
  requestId: number;
  amountPence: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt: Date;
  now?: Date;
}): Promise<ServicePaymentResult> {
  const cancel = issueLinkToken();
  const now = input.now ?? new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({
        data: { id: input.eventId, type: input.eventType },
      });

      const locked = await tx.$queryRaw<
        { id: number }[]
      >`SELECT id FROM "ServiceRequest" WHERE id = ${input.requestId} FOR UPDATE`;
      if (!locked[0]) {
        // RETURNING, NOT THROWING. There is nothing to write against — the
        // request it would point at is gone — so this row is the only trace the
        // event leaves, and returning is what commits it. A throw would roll it
        // back and the caller's refund and apologies would run again on every
        // redelivery.
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: { outcome: "approvalGone" },
        });
        return { outcome: "requestGone" as const };
      }

      const before = await tx.serviceRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        include: { service: true, booking: { include: withOffering } },
      });

      const state = approvalState(factsOf(before), now);

      if (state === "paid") {
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: { outcome: "duplicatePayment" },
        });
        return { outcome: "duplicate" as const, request: before };
      }

      if (state !== "awaitingPayment") {
        await tx.stripeEvent.update({
          where: { id: input.eventId },
          data: { outcome: "approvalGone" },
        });
        return {
          outcome: "approvalGone" as const,
          request: before,
          why:
            state === "lapsed"
              ? "the approval was not paid within its window, so it had run out"
              : state === "declined"
                ? "the session had been declined"
                : "the approval had been withdrawn",
        };
      }

      const approved = before.approvedPence as number;
      if (approved !== input.amountPence) {
        console.warn(
          `[service-requests] session ${input.stripeSessionId} paid ${input.amountPence} against an approval of ${approved}. The approval was probably replaced mid-checkout. Recording what was paid.`,
        );
      }

      const booking = await tx.booking.create({
        data: {
          serviceId: before.serviceId,
          serviceRequestId: before.id,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          // One-to-one means one, here as in the schema.
          places: 1,
          // WHAT SHE APPROVED, not what the service's page says it costs. The
          // two differ the first time she drives somewhere.
          totalPence: approved,
          // Nothing is ever outstanding on a session: it is paid at once, so
          // there is no balance, no due date and no second link.
          balanceDueAt: null,
          balanceTokenHash: null,
          paidAt: input.paidAt,
          cancellationTokenHash: cancel.hash,
          status: "paid",
          payments: {
            create: {
              kind: "full",
              // What Stripe says was charged, never our recomputed figure.
              amountPence: input.amountPence,
              currency: input.currency,
              stripeSessionId: input.stripeSessionId,
              stripePaymentIntentId: input.stripePaymentIntentId,
              paidAt: input.paidAt,
            },
          },
        },
        include: withOffering,
      });

      await tx.stripeEvent.update({
        where: { id: input.eventId },
        data: { outcome: "booked" },
      });

      return {
        outcome: "confirmed" as const,
        booking,
        cancelToken: cancel.token,
      };
    });
  } catch (error) {
    // The event id, the session id, or the approval already having a booking.
    // All three are unique, and all three mean the same thing: this payment has
    // been dealt with already.
    if (isUniqueViolation(error)) return { outcome: "alreadyHandled" };
    throw error;
  }
}

// ── taking one away ──────────────────────────────────────────────────────────

export type DeleteResult =
  { outcome: "deleted" } | { outcome: "refused"; reason: string };

/**
 * Remove a request from the portal for good.
 *
 * THIS EXISTS BECAUSE SOMEBODY CAN ASK TO BE FORGOTTEN. A subscriber can be
 * taken off the list and a cancelled booking can be deleted; until now a
 * session request could not be removed from anywhere in this app, which made an
 * erasure request one she could not honour. The privacy page promises she can.
 *
 * NO EMAIL, for the reason `deletePlace` sends none: deleting changes nothing
 * for the person. Either they were already told the answer, or — on a pending
 * one — they asked for their message to be taken away and a note confirming the
 * filing would be the opposite of the thing they asked for.
 *
 * DELETABLE ON THREE OF THE FIVE STATES, and the two refusals are the two where
 * something is still live between her and them:
 *
 *   pending          YES. This is the erasure case, and it is why deleting must
 *                    not require declining first — declining SENDS a message,
 *                    and mailing somebody who asked to be forgotten to tell
 *                    them they have been is precisely the wrong move.
 *   declined         YES. It is finished and they were told.
 *   lapsed           YES. Nobody paid, the window closed, the link is dead.
 *   awaitingPayment  NO. A working payment link is in somebody's inbox and the
 *                    deadline is running. Deleting the row takes the page out
 *                    from under a person who may be part-way through paying.
 *   paid             NO. It is a booking, and the booking is the record of
 *                    money that moved. `Booking.serviceRequestId` is
 *                    `onDelete: Restrict`, so the database refuses this even if
 *                    this function were ever wrong about it.
 *
 * DELETING A PENDING REQUEST RELEASES ITS SLOT, which is right and is why it is
 * not done another way: a live request holds an hour in the diary (D-26), and
 * an hour held for a message that no longer exists is an hour lost for nothing.
 * The release falls out of the row going, with nothing to remember to run.
 *
 * Locked and re-read like every other decision here, because the row on her
 * screen may be minutes old: an approval can arrive from her phone, or a
 * payment from theirs, between the page drawing and the button being pressed.
 */
export async function deleteRequest(input: {
  id: number;
  now?: Date;
}): Promise<DeleteResult> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "ServiceRequest" WHERE id = ${input.id} FOR UPDATE`;
    // Pressing it twice means the same thing as pressing it once.
    if (!locked[0]) return { outcome: "deleted" as const };

    const before = await tx.serviceRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { booking: { select: { id: true } } },
    });

    const state = approvalState(factsOf(before), now);

    if (state === "awaitingPayment") {
      return {
        outcome: "refused" as const,
        reason:
          "There is a payment link with them and it has not run out yet, so deleting this now would break a page somebody may be part-way through. Decline it first if the answer has changed — or leave it, and once the 48 hours are up it can go.",
      };
    }

    if (state === "paid") {
      return {
        outcome: "refused" as const,
        reason:
          "This one was paid for, so it is a booking now and the booking is the record of the money. Cancel and delete it on the bookings page; this row goes with it.",
      };
    }

    await tx.serviceRequest.delete({ where: { id: input.id } });
    return { outcome: "deleted" as const };
  });
}
