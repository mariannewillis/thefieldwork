import { SITE_URL } from "@/content/site";
import "server-only";
import type { BookingWithOffering } from "@/lib/bookings";
import {
  balancePaidEmail,
  paymentReminderEmail,
  cancellationEmail,
  cannotHonourEmail,
  confirmationEmail,
  refundIssuedEmail,
} from "./bookings";
import { resetEmail, type Mail } from "./index";
import {
  approvalEmail,
  declineEmail,
  requestAcknowledgementEmail,
  type RequestedService,
  type SubmittedRequest,
} from "./service-requests";
import { EMAIL_TEMPLATE_KEYS, type TemplateKey, type Wording } from "./wording";

/**
 * One representative example of each of the nine, for the preview on
 * /admin/email-templates.
 *
 * THE PREVIEW IS THE REAL COMPOSER, not a copy of it. Every message below is
 * produced by exactly the function the webhook and the portal call, with
 * exactly the wording she has saved — so what the screen shows is what a person
 * receives, and a change to a template that broke the letter would break the
 * preview in the same way and at the same moment. A second rendering path
 * written "just for the preview" is a second thing to keep in step, and the day
 * it drifted the screen would be reassuring her about a message it was no
 * longer describing.
 *
 * THE FACTS ARE THE APPROVED MOCKUPS' FACTS — Reading the Field, £190,
 * reference TFW-4417 — so the preview and `docs/screens/email/` can be held up
 * next to each other. The DAYS are moved by one: the mockups were hand-written
 * and say "Sat 20 Sep", but 20 September 2026 is a Sunday, and a sample that
 * renders "Saturday" over a Sunday teaches the wrong thing about the code that
 * formats it. Every date here is a real weekday — Saturday 19 September, its
 * refund deadline on Saturday 5 September, two Tuesday course evenings.
 *
 * The rows are BUILT IN MEMORY AND NEVER WRITTEN. Nothing here touches the
 * database, and the sample addresses are all `.invalid` (RFC 2606), which
 * cannot resolve — so a preview that somehow reached a transport would have
 * nowhere to go.
 */

/** Midnight UTC on a day, which is how a SQL DATE arrives from Prisma. */
const day = (year: number, month: number, date: number) =>
  new Date(Date.UTC(year, month - 1, date));

/** A moment, in London, for a payment or a deadline. */
const moment = (iso: string) => new Date(iso);

/**
 * The fields below are the ones the composers actually read. The rest of each
 * Prisma model is deliberately absent and the object is asserted into shape:
 * filling in forty columns nothing looks at would bury the six that decide what
 * the letter says, and a preview is not a database row.
 */
function sampleWorkshopBooking(
  over: Partial<BookingWithOffering> = {},
): BookingWithOffering {
  return {
    id: 4417,
    buyerName: "Sarah Ellis",
    buyerEmail: "sarah@example.invalid",
    places: 2,
    totalPence: 19000,
    balanceDueAt: null,
    status: "paid",
    cancelledAt: null,
    workshop: {
      id: 1,
      slug: "reading-the-field",
      name: "Reading the Field",
      capacity: 10,
      refundDays: 14,
      date: day(2026, 9, 19),
      startTime: "10:00",
      endTime: "16:30",
      venueName: "The Garden Room",
      addressLines: "Fromefield",
      postcode: "Frome BA11",
    },
    course: null,
    service: null,
    serviceRequest: null,
    payments: [
      {
        kind: "full",
        amountPence: 19000,
        refundedPence: null,
        refundedAt: null,
        refundId: null,
        stripePaymentIntentId: "pi_sample",
        paidAt: moment("2026-08-04T09:12:00Z"),
      },
    ],
    ...over,
  } as unknown as BookingWithOffering;
}

/** A course bought on a deposit, settled by its balance. */
function sampleCourseBooking(
  over: Partial<BookingWithOffering> = {},
): BookingWithOffering {
  return {
    id: 4392,
    buyerName: "Ruth Callaghan",
    buyerEmail: "ruth@example.invalid",
    places: 1,
    totalPence: 48000,
    balanceDueAt: day(2026, 9, 7),
    status: "paid",
    cancelledAt: null,
    workshop: null,
    course: {
      id: 2,
      slug: "aura-healing-foundations",
      name: "Aura Healing: Foundations",
      capacity: 6,
      refundDays: 21,
      venueName: "The Garden Room",
      addressLines: "Fromefield",
      postcode: "Frome BA11",
      createdAt: day(2026, 7, 1),
      sessions: [
        {
          date: day(2026, 9, 15),
          startTime: "19:00",
          endTime: "21:00",
          title: "Where the edge is",
          venue: "The Garden Room",
        },
        {
          date: day(2026, 9, 22),
          startTime: "19:00",
          endTime: "21:00",
          title: "Reading with the hands",
          venue: "The Garden Room",
        },
      ],
    },
    service: null,
    serviceRequest: null,
    payments: [
      {
        kind: "deposit",
        amountPence: 15000,
        refundedPence: null,
        refundedAt: null,
        refundId: null,
        stripePaymentIntentId: "pi_sample_deposit",
        paidAt: moment("2026-08-01T10:00:00Z"),
      },
      {
        kind: "balance",
        amountPence: 33000,
        refundedPence: null,
        refundedAt: null,
        refundId: null,
        stripePaymentIntentId: "pi_sample_balance",
        paidAt: moment("2026-09-02T14:30:00Z"),
      },
    ],
    ...over,
  } as unknown as BookingWithOffering;
}

const sampleService: RequestedService = {
  name: "First session, with time to ask",
  slug: "first-session",
  durationMinutes: 90,
  priceGBP: 9500,
  location: "venue",
  venueName: "The garden room",
  addressLines: "Fromefield",
  postcode: "Frome BA11",
  gettingThere: null,
  baseAddressLines: null,
  basePostcode: null,
  travelRadiusMiles: null,
  travelNote: null,
};

const sampleRequest: SubmittedRequest = {
  name: "Sarah",
  email: "sarah@example.invalid",
  phone: null,
  preferredTime: null,
  slotStart: moment("2026-08-20T09:00:00Z"),
  slotEnd: moment("2026-08-20T10:30:00Z"),
  message:
    "I have been reading the page since about March. I would rather ask the questions in the room than by email, if that is all right.",
};

/** Every one of the nine, composed with the wording currently saved. */
export function sampleMessages(wording: Wording): Record<TemplateKey, Mail> {
  return {
    bookingConfirmation: confirmationEmail(
      sampleWorkshopBooking(),
      { cancel: "9f4c2ab7d1sample", balance: null },
      wording,
    ),

    balancePaid: balancePaidEmail(sampleCourseBooking(), wording),

    // A plan two payments in, with the third a fortnight late — which is the
    // state she will actually be looking at when she reaches for this one.
    paymentReminder: paymentReminderEmail(
      sampleCourseBooking(),
      { amountPence: 7500, dueAt: moment("2026-09-12T00:00:00Z") },
      `${SITE_URL}/pay/9f4c2ab7d1sample`,
      wording,
    ),

    cancellation: cancellationEmail(
      sampleWorkshopBooking({
        status: "cancelledRefunded",
        cancelledAt: moment("2026-08-30T11:00:00Z"),
        payments: [
          {
            kind: "full",
            amountPence: 19000,
            refundedPence: 19000,
            refundedAt: moment("2026-08-30T11:00:00Z"),
            refundId: "re_sample",
            stripePaymentIntentId: "pi_sample",
            paidAt: moment("2026-08-04T09:12:00Z"),
          },
        ] as BookingWithOffering["payments"],
      }),
      "buyer",
      wording,
    ),

    refundIssued: refundIssuedEmail(
      sampleWorkshopBooking({
        payments: [
          {
            kind: "full",
            amountPence: 19000,
            refundedPence: 19000,
            refundedAt: moment("2026-08-30T11:00:00Z"),
            refundId: "re_sample",
            stripePaymentIntentId: "pi_sample",
            paidAt: moment("2026-08-04T09:12:00Z"),
          },
        ] as BookingWithOffering["payments"],
      }),
      wording,
    ),

    cannotHonour: cannotHonourEmail({
      to: "sarah@example.invalid",
      offeringName: "Reading the Field",
      offeringDay: "Saturday 19 September",
      amountPence: 9500,
      why: "soldOut",
      refunded: true,
      wording,
    }),

    requestAcknowledgement: requestAcknowledgementEmail(
      sampleService,
      sampleRequest,
      wording,
    ),

    sessionApproved: approvalEmail({
      service: sampleService,
      name: "Sarah",
      to: "sarah@example.invalid",
      agreedTime: "Thursday the 20th at 10, at the garden room",
      amountPence: 9500,
      payBy: moment("2026-08-15T16:12:00Z"),
      payLink: "https://thefieldwork.co.uk/pay/2f8ad1c6e0sample",
      again: false,
      wording,
    }),

    sessionDeclined: declineEmail({
      service: sampleService,
      name: "Sarah",
      to: "sarah@example.invalid",
      note: "I am afraid I have nothing free before the middle of October, and I would rather say so than put you a long way out and hope. If October still suits, write back and I will hold you a morning.",
      wording,
    }),

    passwordReset: {
      to: "marianne@example.invalid",
      ...resetEmail("sampletoken0123456789", "marianne", wording),
    },
  };
}

/** One of the nine, composed with the wording currently saved. */
export function sampleMessage(key: TemplateKey, wording: Wording): Mail {
  return sampleMessages(wording)[key];
}

export { EMAIL_TEMPLATE_KEYS };
