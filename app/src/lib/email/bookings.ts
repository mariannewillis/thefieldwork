import "server-only";
import type { Booking, Workshop } from "@prisma/client";
import { bookingReference, cancellationLink, refundOwed } from "@/lib/bookings";
import {
  formatDayLong,
  formatInstant,
  formatMoney,
  refundDeadline,
} from "@/lib/format";
import { sendMail, type Mail } from "./index";

/**
 * The emails a booking sends.
 *
 * COMPOSING AND SENDING ARE SEPARATE, deliberately. Every function below is
 * pure — it takes a booking and returns the message — so what a buyer will
 * receive can be read, and tested, without anything being delivered to anybody.
 * `sendBookingMail` is the only thing here that touches the outside world.
 *
 * Plain text, plain sentences, no marketing. These arrive at the moment
 * somebody has just spent money or just given up a day, and both of those want
 * the facts and nothing else. Everything in them is a fact this side can read:
 * the day, the room, the address, the number of places, the amount actually
 * charged, and the refund date worked out from that workshop's OWN refundDays.
 */

/**
 * Where a booking notice goes.
 *
 * Not read from her admin account: the account's email is optional and stays
 * empty until she fills it in (D-13), and a notice that a stranger has paid
 * £190 must not depend on whether she has been into Settings. `EMAIL_TO_OWNER`
 * moves it without a deploy if the mailbox ever changes.
 */
const OWNER = process.env.EMAIL_TO_OWNER ?? "marianne@thefieldwork.co.uk";

type BookingForEmail = Booking & { workshop: Workshop };

/** "Saturday 14 November, 10:00–16:30" */
function when(workshop: Workshop): string {
  const day = formatDayLong(workshop.date);
  const time = workshop.endTime
    ? `${workshop.startTime}–${workshop.endTime}`
    : workshop.startTime;
  return `${day}, ${time}`;
}

/** The venue and its address, one line per line, as it is set on the page. */
function where(workshop: Workshop): string[] {
  const lines = workshop.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return [workshop.venueName, ...lines, workshop.postcode].filter(Boolean);
}

function places(n: number): string {
  return n === 1 ? "One place" : `${n} places`;
}

/** "Saturday 31 October" — or null when this day cannot be refunded at all. */
function deadlineWords(workshop: Workshop): string | null {
  const deadline = refundDeadline(workshop.date, workshop.refundDays);
  return deadline ? formatDayLong(deadline) : null;
}

// ── to the buyer, when the payment is confirmed ──────────────────────────────

export function confirmationEmail(
  booking: BookingForEmail,
  token: string,
): Mail {
  const { workshop } = booking;
  const deadline = deadlineWords(workshop);
  const link = cancellationLink(token);

  return {
    to: booking.buyerEmail,
    subject: `Your place on ${workshop.name} — ${formatDayLong(workshop.date)}`,
    text: [
      `Thank you. ${places(booking.places)} on ${workshop.name} ${booking.places === 1 ? "is" : "are"} booked.`,
      "",
      when(workshop),
      ...where(workshop),
      "",
      `${places(booking.places)} · ${formatMoney(booking.amountPence)} paid`,
      `Reference ${bookingReference(booking.id)}`,
      "",
      "IF YOU CANNOT COME",
      "",
      // The link is the whole point of this section, so it sits above the
      // terms rather than under them: somebody who has decided they cannot
      // come is looking for the link, not for the reasoning.
      link,
      "",
      ...(deadline
        ? [
            `Cancel by ${deadline} and you are refunded in full. After that the`,
            "place is held for you and cannot be refunded, though you are still",
            "welcome to use the link to say you are not coming.",
          ]
        : [
            "A place on this day cannot be refunded once it is taken. The link",
            "still works if you cannot come — it frees the place for somebody",
            "else and tells Marianne not to expect you.",
          ]),
      "",
      "Keep this email. That link is the only one, and you do not need to ask",
      "anyone to use it.",
      "",
      "The Field Work · Frome, Somerset",
    ].join("\n"),
  };
}

// ── to Marianne, when the payment is confirmed ───────────────────────────────

export function bookingNoticeEmail(
  booking: BookingForEmail,
  left: number,
): Mail {
  const { workshop } = booking;
  return {
    to: OWNER,
    subject: `${places(booking.places)} booked — ${workshop.name}, ${formatDayLong(workshop.date)}`,
    text: [
      `${booking.buyerName} has booked ${places(booking.places).toLowerCase()} on ${workshop.name}.`,
      "",
      when(workshop),
      workshop.venueName,
      "",
      booking.buyerEmail,
      `${formatMoney(booking.amountPence)} paid`,
      `Reference ${bookingReference(booking.id)}`,
      "",
      left === 0
        ? `That is the last place. ${workshop.name} is now full.`
        : `${left} of ${workshop.capacity} places left.`,
    ].join("\n"),
  };
}

// ── to the buyer, when a place is given up ───────────────────────────────────

/**
 * Who did the cancelling. It changes almost nothing about the facts and
 * everything about the sentences: "the place is free for somebody else, and
 * Marianne knows not to expect you" is true when they used the link in their
 * own email and is nonsense when she cancelled the day herself.
 */
export type CancelledBy = "buyer" | "marianne";

/**
 * What happened to the money is READ OFF THE BOOKING, never passed in. There
 * are three endings — refunded, nothing owed, and owed but not yet returned —
 * and a caller that had to remember which is a caller that can tell somebody
 * their money is on its way when it is not.
 *
 * The one thing the booking cannot say is WHO cancelled it, so that is the only
 * argument. Note that "owed" covers both a refund that would not go through and
 * money she has deliberately kept for now: from where the buyer is standing
 * those are the same fact — it has not come back — and the sentence promises
 * nothing about which it was. Her own notice carries the difference, because
 * that is where it changes what somebody has to do.
 */
export function cancellationEmail(
  booking: BookingForEmail,
  by: CancelledBy = "buyer",
): Mail {
  const { workshop } = booking;
  const deadline = deadlineWords(workshop);
  const refunded = booking.status === "cancelledRefunded";
  const owed = refundOwed(booking);
  const day = formatDayLong(workshop.date);
  const some = places(booking.places);
  const isAre = booking.places === 1 ? "is" : "are";

  // Usually the refund is a minute old and "on its way" is exactly right. It is
  // not when she refunded somebody weeks ago, left them their place, and is
  // only now taking the place back — telling them their money is coming when it
  // arrived a fortnight ago would have them watching for it twice.
  const refundedEarlierOn =
    booking.refundedAt !== null &&
    booking.cancelledAt !== null &&
    booking.cancelledAt.getTime() - booking.refundedAt.getTime() > 60_000
      ? formatInstant(booking.refundedAt)
      : null;

  return {
    to: booking.buyerEmail,
    subject: `Cancelled — ${workshop.name}, ${day}`,
    text: [
      ...(by === "marianne"
        ? [
            "I am sorry.",
            "",
            `I have had to cancel your ${some.toLowerCase()} on ${workshop.name}, ${day}.`,
          ]
        : [`${some} on ${workshop.name}, ${day}, ${isAre} cancelled.`]),
      "",
      ...(refunded
        ? refundedEarlierOn
          ? [
              `${formatMoney(booking.refundedPence ?? booking.amountPence)} was already sent back to the card you paid`,
              `with, on ${refundedEarlierOn}. Nothing more moves now.`,
              "",
              "Nothing further is needed from you.",
            ]
          : [
              `${formatMoney(booking.refundedPence ?? booking.amountPence)} is on its way back to the card you paid with.`,
              "Stripe usually takes five to ten working days to show it.",
              "",
              "Nothing further is needed from you.",
            ]
        : owed
          ? by === "marianne"
            ? [
                `${formatMoney(booking.amountPence)} has not gone back to your card yet. Marianne will`,
                "be in touch about it. If you would rather ask now, reply to this",
                "email and it reaches her.",
              ]
            : [
                `${formatMoney(booking.amountPence)} is owed back to you and the refund did not go`,
                "through. Marianne has been told and will return it by hand.",
                "Nothing is needed from you.",
              ]
          : by === "marianne"
            ? [
                "No money has gone back. The refund date on this booking had already",
                "passed, so nothing was returned automatically. If that seems wrong,",
                "reply to this email and it reaches Marianne.",
              ]
            : [
                deadline
                  ? `The refund date was ${deadline}, which has passed, so nothing has`
                  : "This day could not be refunded once a place was taken, so nothing has",
                "been refunded. The place is free for somebody else, and Marianne",
                "knows not to expect you.",
              ]),
      "",
      `Reference ${bookingReference(booking.id)}`,
      "",
      "The Field Work · Frome, Somerset",
    ].join("\n"),
  };
}

// ── to the buyer, when money goes back on its own ────────────────────────────

/**
 * A refund sent without a cancellation attached to it.
 *
 * TWO SITUATIONS, and the difference is the whole message. On a booking that
 * was already cancelled, the money is simply arriving late and nothing else
 * changes. On a booking that is still live, she has decided not to charge
 * somebody who is still coming — and the sentence that has to be there is that
 * their place is untouched. Somebody who reads "£95 has been refunded" and
 * assumes they have been cancelled will not turn up.
 *
 * Read off the booking's status, like everything else here, so a caller cannot
 * pick the wrong one.
 */
export function refundIssuedEmail(booking: BookingForEmail): Mail {
  const { workshop } = booking;
  const day = formatDayLong(workshop.date);
  const amount = formatMoney(booking.refundedPence ?? booking.amountPence);
  const stillComing = booking.status === "paid";

  return {
    to: booking.buyerEmail,
    subject: stillComing
      ? `${amount} refunded — your place on ${workshop.name} is unchanged`
      : `${amount} refunded — ${workshop.name}, ${day}`,
    text: [
      ...(stillComing
        ? [
            `${amount} has been sent back to the card you paid with.`,
            "",
            `YOUR PLACE IS UNCHANGED. ${places(booking.places)} on ${workshop.name}`,
            `${booking.places === 1 ? "is" : "are"} still held for you, and you are still expected on the day.`,
            "",
            "Stripe usually takes five to ten working days to show the money.",
            "",
            when(workshop),
            ...where(workshop),
          ]
        : [
            `${amount} for your cancelled ${places(booking.places).toLowerCase()} on`,
            `${workshop.name}, ${day}, has been sent back to the card you paid with.`,
            "Stripe usually takes five to ten working days to show it.",
            "",
            "Nothing further is needed from you.",
          ]),
      "",
      `Reference ${bookingReference(booking.id)}`,
      "",
      "The Field Work · Frome, Somerset",
    ].join("\n"),
  };
}

// ── to Marianne, when a place is given up ────────────────────────────────────

export function cancellationNoticeEmail(
  booking: BookingForEmail,
  left: number,
): Mail {
  const { workshop } = booking;
  const refunded = booking.status === "cancelledRefunded";
  const owed = refundOwed(booking);
  return {
    to: OWNER,
    subject: owed
      ? `ACTION NEEDED: refund by hand — ${workshop.name}`
      : `A place released — ${workshop.name}, ${formatDayLong(workshop.date)}`,
    text: [
      `${booking.buyerName} has cancelled ${places(booking.places).toLowerCase()} on ${workshop.name}, ${formatDayLong(workshop.date)}.`,
      "",
      booking.buyerEmail,
      refunded
        ? `${formatMoney(booking.refundedPence ?? booking.amountPence)} refunded.`
        : owed
          ? `${formatMoney(booking.amountPence)} IS OWED BACK AND THE REFUND DID NOT GO THROUGH. Refund it in Stripe, by hand, today.`
          : "Nothing refunded — the refund date had passed.",
      `Reference ${bookingReference(booking.id)}`,
      "",
      `${left} of ${workshop.capacity} places left.`,
    ].join("\n"),
  };
}

// ── to Marianne, when a refund she asked for would not go ────────────────────

/**
 * The only notice a portal action sends her.
 *
 * She does not need telling about her own cancellations — she made them, and
 * the row she made them on says what happened. She DOES need telling when
 * Stripe refused, because the screen that said so will be closed in a minute
 * and the money will still be outstanding. This is the durable copy, and it
 * carries what refunding by hand in the Stripe dashboard needs.
 */
export function refundFailedNoticeEmail(
  booking: BookingForEmail,
  error: string,
): Mail {
  const { workshop } = booking;
  return {
    to: OWNER,
    subject: `ACTION NEEDED: refund by hand — ${workshop.name}`,
    text: [
      `You asked to refund ${formatMoney(booking.amountPence)} to ${booking.buyerName} and Stripe would not do it.`,
      "",
      `Stripe said: ${error}`,
      "",
      `${workshop.name}, ${formatDayLong(workshop.date)}`,
      booking.buyerEmail,
      `Reference ${bookingReference(booking.id)}`,
      `Payment ${booking.stripePaymentIntentId ?? "— no payment intent on this booking"}`,
      "",
      "REFUND IT IN STRIPE, BY HAND, TODAY. The booking says the money has not",
      "gone back, and it will keep saying so until it has.",
    ].join("\n"),
  };
}

// ── when a payment could not be honoured ─────────────────────────────────────

/**
 * The losing side of the race (D-16), and the rarer case of a workshop that
 * was taken down while somebody was at the checkout. One pair of messages for
 * both, because from where the buyer is standing they are the same event: they
 * paid, and there is no place.
 *
 * The refunded flag is never assumed. If the refund did not go through, this
 * says so — telling somebody their money is on its way when it is not is the
 * one thing that turns a bad morning into a complaint.
 */
export function cannotHonourEmail(args: {
  to: string;
  workshopName: string;
  workshopDay: string;
  amountPence: number;
  why: "soldOut" | "workshopGone";
  refunded: boolean;
}): Mail {
  return {
    to: args.to,
    subject: `Your payment for ${args.workshopName} — refunded`,
    text: [
      "I am sorry.",
      "",
      args.why === "soldOut"
        ? `Somebody paid for the last place on ${args.workshopName}, ${args.workshopDay}, while you were paying for yours, so there was no place left to give you.`
        : `${args.workshopName} on ${args.workshopDay} is no longer running, and your payment arrived after it came off the site.`,
      "",
      ...(args.refunded
        ? [
            `${formatMoney(args.amountPence)} has been sent back to the card you paid with.`,
            "Stripe usually takes five to ten working days to show it. You are not",
            "holding a place and you have not been charged for one.",
          ]
        : [
            `${formatMoney(args.amountPence)} is owed back to you and the automatic refund did not`,
            "go through. Marianne has been told and will return it by hand today.",
            "Nothing is needed from you.",
          ]),
      "",
      "The Field Work · Frome, Somerset",
    ].join("\n"),
  };
}

export function cannotHonourNoticeEmail(args: {
  workshopName: string;
  workshopDay: string;
  buyerEmail: string;
  amountPence: number;
  why: "soldOut" | "workshopGone";
  refunded: boolean;
  reference: string | null;
  error?: string;
}): Mail {
  return {
    to: OWNER,
    subject: args.refunded
      ? `Refunded automatically — ${args.workshopName}`
      : `ACTION NEEDED: refund by hand — ${args.workshopName}`,
    text: [
      args.why === "soldOut"
        ? `Two people paid for the last place on ${args.workshopName}, ${args.workshopDay}. The second one has no place.`
        : `A payment arrived for ${args.workshopName}, ${args.workshopDay}, after it was taken off the site.`,
      "",
      args.buyerEmail,
      formatMoney(args.amountPence),
      ...(args.reference ? [`Reference ${args.reference}`] : []),
      "",
      ...(args.refunded
        ? [
            "It has been refunded in full automatically and they have been told.",
            "There is nothing for you to do.",
          ]
        : [
            "THE REFUND DID NOT GO THROUGH. Refund it in Stripe, by hand, today.",
            ...(args.error ? [`Stripe said: ${args.error}`] : []),
          ]),
    ].join("\n"),
  };
}

// ── sending ──────────────────────────────────────────────────────────────────

/**
 * Send one of the above, and say in the log what happened.
 *
 * A booking email that silently fails to send is a person who thinks they have
 * no place, or a practitioner who does not know somebody is coming — so every
 * attempt leaves a line naming the message, the recipient and whether it was
 * delivered. Failure is never thrown: the booking is already made and the
 * money already moved, and unwinding a payment because an email bounced would
 * be the wrong end of the problem entirely.
 */
export async function sendBookingMail(mail: Mail, what: string): Promise<void> {
  const result = await sendMail(mail);
  const outcome = result.delivered
    ? `sent via ${result.via}`
    : `NOT DELIVERED (${result.via}${result.error ? `: ${result.error}` : ""})`;
  console.info(`[bookings] ${what} → ${mail.to} — ${outcome}`);
}
