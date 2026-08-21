import "server-only";
import { SITE_URL } from "@/content/site";
import {
  bookingReference,
  balanceLink,
  cancellationLink,
  heldPence,
  offeringOf,
  outstandingPence,
  paidPence,
  refundOwed,
  whenWords,
  type BookingWithOffering,
  type Offering,
} from "@/lib/bookings";
import { capitalise, runShape } from "@/lib/course-run";
import {
  formatDayLong,
  formatDayShort,
  formatInstant,
  formatMoney,
  refundDeadline,
} from "@/lib/format";
import { sendMail, type Mail } from "./index";
import { copy, copyOnPlate, plain, renderLetter, type Block } from "./render";
import {
  openingBlocks,
  resolveSlots,
  signOffBlocks,
  type Wording,
} from "./wording";

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
 * the day or the run of days, the room, the address, the number of places, the
 * amount actually charged, what is still owed and by when, and the refund date
 * worked out from that offering's OWN refundDays.
 *
 * ONE SET OF MESSAGES FOR ALL THREE KINDS. A workshop, a course and a session
 * differ in three sentences — how the time reads, whether anything is still
 * owed, and what the refund terms are — and writing a second and third family
 * of functions would be three places for every future correction to a sentence
 * about money.
 *
 * A SESSION HAS NO DATE, and that is why `whenWords` below exists rather than
 * `formatDayLong(offering.firstDate)` appearing in nine places. The time it
 * happens is the sentence Marianne and the client agreed (D-24, D-25); nothing
 * here may turn that into a day, and nothing here may print an empty one.
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

const SIGN_OFF = "The Field Work · Frome, Somerset";

/**
 * When it happens, in as many lines as it takes.
 *
 * One line for a workshop — "Saturday 14 November, 10:00–16:30". For a course,
 * the shape of the run first and then every date under it, because the run is
 * the commitment and the dates are the diary: somebody who has just paid for
 * four Wednesdays wants to write all four down.
 */
function when(offering: Offering): string[] {
  if (offering.kind === "service") {
    // Her sentence, whole, and nothing else. It may be one line or three, and
    // it may say "at yours" — which is the address as well as the time.
    return offering.agreedTime ? [offering.agreedTime] : [];
  }

  if (offering.kind === "workshop") {
    const one = offering.dates[0];
    if (!one) return [];
    const time = one.endTime
      ? `${one.startTime}–${one.endTime}`
      : one.startTime;
    return [`${formatDayLong(one.date)}, ${time}`];
  }

  const run = runShape(offering.dates);
  return [
    ...(run ? [`${capitalise(run.words)} · ${run.span}`, ""] : []),
    ...offering.dates.map((date) =>
      [
        formatDayShort(date.date),
        `${date.startTime}–${date.endTime}`,
        date.title,
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  ];
}

/** The venue and its address, one line per line, as it is set on the page. */
function where(offering: Offering): string[] {
  const lines = offering.addressLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return [offering.venueName, ...lines, offering.postcode].filter(Boolean);
}

function places(n: number): string {
  return n === 1 ? "One place" : `${n} places`;
}

/** "Saturday 31 October" — or null when this cannot be refunded at all. */
function deadlineWords(offering: Offering): string | null {
  if (!offering.firstDate) return null;
  const deadline = refundDeadline(offering.firstDate, offering.refundDays);
  return deadline ? formatDayLong(deadline) : null;
}

// ── the branded half ─────────────────────────────────────────────────────────

/**
 * THE FACTS BELOW ARE EMITTED BY CODE INTO BLOCKS OF THEIR OWN, and that is
 * what makes the admin's editable wording safe. Marianne owns the subject, the
 * opening and the sign-off; the day, the room, the amount, the reference, the
 * cancellation link and the balance link are built here from the booking and
 * are not reachable from anything she types. No edit she makes can stop
 * somebody paying, because there is no code path on which her text becomes an
 * element, an attribute or a URL — see `email/wording.ts`.
 *
 * The placeholders she may drop into a sentence — `{{amount}}`, `{{when}}` —
 * are a convenience and never the only carrier of a fact: every one of them
 * also appears in a block below, so deleting a placeholder loses a nicety and
 * nothing else.
 */

/** When and where, as the two columns the approved confirmation draws them in. */
function whenWhereBlocks(offering: Offering): Block[] {
  const whenLines = when(offering);
  return [
    {
      kind: "factColumns",
      columns: [
        {
          label: "When",
          lines: (whenLines.length ? whenLines : [whenWords(offering)])
            .filter((line) => line !== "")
            .map(plain),
        },
        { label: "Where", lines: where(offering).map(plain) },
      ],
    },
  ];
}

/** The facts a sentence of hers may borrow. Each one is also drawn as a block. */
function bookingFacts(booking: BookingWithOffering): Record<string, string> {
  const offering = offeringOf(booking);
  return {
    offering: offering.name,
    when: whenWords(offering),
    places: places(booking.places),
    amount: formatMoney(paidPence(booking)),
    reference: bookingReference(booking.id),
  };
}

// ── to the buyer, when the payment is confirmed ──────────────────────────────

/**
 * What they have just bought, and what is left to do about it.
 *
 * TWO LINKS, and they do different jobs, so they are in different sections
 * under headings of their own. The balance link comes first when there is one:
 * it is the thing that still has to happen, and it is going into an inbox that
 * will be searched for it in six weeks' time.
 *
 * THE BALANCE LINK GOES OUT NOW, NOT ON THE DUE DATE. Nothing in this app runs
 * on a schedule, and a link the buyer already holds needs no scheduler to be
 * correct: it sits in the email from the day they book, it says the amount and
 * the date, and pressing it on the morning it is due works exactly as pressing
 * it that afternoon does. A reminder mailed on the day would be a job that has
 * to fire; this is a link that has to be kept (D-23).
 */
export function confirmationEmail(
  booking: BookingWithOffering,
  tokens: { cancel: string; balance: string | null },
  wording: Wording = {},
): Mail {
  const offering = offeringOf(booking);
  const deadline = deadlineWords(offering);
  const owed = outstandingPence(booking);
  const some = places(booking.places);

  const slots = resolveSlots(
    "bookingConfirmation",
    wording,
    {
      subject:
        offering.kind === "workshop"
          ? `Your place on ${offering.name} — ${whenWords(offering)}`
          : offering.kind === "service"
            ? `Paid — ${offering.name}, ${whenWords(offering)}`
            : `Your place on ${offering.name}`,
      opening:
        offering.kind === "service"
          ? `Thank you. ${offering.name} is paid for and in the diary.`
          : `Thank you. ${some} on ${offering.name} ${booking.places === 1 ? "is" : "are"} booked.`,
      signOff:
        owed > 0 && tokens.balance
          ? "Keep this email. Those two links are the only ones, and you do not need to ask anyone to use either of them."
          : "Keep this email. That link is the only one, and you do not need to ask anyone to use it.",
    },
    bookingFacts(booking),
  );

  const refundTerms = deadline
    ? `Cancel by *${deadline}* and you are refunded in full. After that the place is held for you and cannot be refunded, though you are still welcome to use the link to say you are not coming.`
    : offering.kind === "service"
      ? "Use the link and Marianne will know not to expect you. There is no refund period on a session — if you have to cancel, reply to this email and she will sort out the money with you herself."
      : `A place on this ${offering.kind} cannot be refunded once it is taken. The link still works if you cannot come — it frees the place for somebody else and tells Marianne not to expect you.`;

  return {
    to: booking.buyerEmail,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      ...when(offering),
      "",
      ...where(offering),
      "",
      ...(owed > 0
        ? [
            `${some} · ${formatMoney(booking.totalPence)} for the whole run`,
            `${formatMoney(paidPence(booking))} deposit paid`,
            `${formatMoney(owed)} still to pay${
              booking.balanceDueAt
                ? `, by ${formatDayLong(booking.balanceDueAt)}`
                : ""
            }`,
          ]
        : offering.kind === "service"
          ? [`${formatMoney(paidPence(booking))} paid`]
          : [`${some} · ${formatMoney(paidPence(booking))} paid`]),
      `Reference ${bookingReference(booking.id)}`,
      "",
      ...(owed > 0 && tokens.balance
        ? [
            "PAYING THE REST",
            "",
            balanceLink(tokens.balance),
            "",
            `${formatMoney(owed)} is due${
              booking.balanceDueAt
                ? ` by ${formatDayLong(booking.balanceDueAt)}`
                : ""
            }. The link works from today — pay it whenever you like, and it will`,
            "tell you if it has already been paid. Your place is held until then.",
            "",
            "If the balance is not paid by that date the place is released, and",
            "somebody else can take it.",
            "",
          ]
        : []),
      "IF YOU CANNOT COME",
      "",
      // The link is the whole point of this section, so it sits above the
      // terms rather than under them: somebody who has decided they cannot
      // come is looking for the link, not for the reasoning.
      cancellationLink(tokens.cancel),
      "",
      ...(deadline
        ? [
            `Cancel by ${deadline} and you are refunded in full. After that the`,
            "place is held for you and cannot be refunded, though you are still",
            "welcome to use the link to say you are not coming.",
          ]
        : offering.kind === "service"
          ? // A SESSION HAS NO PUBLISHED REFUND TERMS, and this must not invent
            // any. There is no refund window on one — nothing anybody agreed
            // says what it would be — so the honest sentence is that the link
            // tells her, and the money is a conversation with a person.
            [
              "Use the link and Marianne will know not to expect you. There is no",
              "refund period on a session — if you have to cancel, reply to this",
              "email and she will sort out the money with you herself.",
            ]
          : [
              `A place on this ${offering.kind} cannot be refunded once it is taken. The`,
              "link still works if you cannot come — it frees the place for somebody",
              "else and tells Marianne not to expect you.",
            ]),
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      // Facts only, and the ones somebody scanning an inbox for this message
      // in six weeks will search on.
      preheader: [
        whenWords(offering),
        offering.venueName,
        `Reference ${bookingReference(booking.id)}`,
      ]
        .filter(Boolean)
        .join(". "),
      mastheadLabel: "Your place is booked",
      sections: [
        {
          ground: "pool",
          blocks: [
            ...openingBlocks(slots.opening),
            ...whenWhereBlocks(offering),
          ],
        },

        /* The money, on the plate. The figure is blush and never gold: an
           amount is a fact, and no fact in this design is set in a colour a
           forced inversion would take to 1.6:1. */
        {
          ground: "plate",
          blocks: [
            {
              kind: "eyebrow",
              text: owed > 0 ? "Paid so far" : "What you paid",
            },
            { kind: "figure", amount: formatMoney(paidPence(booking)) },
            ...(owed > 0
              ? ([
                  {
                    kind: "lines",
                    emphasiseLast: true,
                    lines: [
                      copy(
                        `${some} · ${formatMoney(booking.totalPence)} for the whole run`,
                      ),
                      copy(`${formatMoney(paidPence(booking))} deposit paid`),
                      copyOnPlate(
                        `*${formatMoney(owed)} still to pay*${
                          booking.balanceDueAt
                            ? `, by ${formatDayLong(booking.balanceDueAt)}`
                            : ""
                        }`,
                      ),
                    ],
                  },
                ] as Block[])
              : ([
                  {
                    kind: "note",
                    text: plain(
                      offering.kind === "service" ? "paid" : `${some} · paid`,
                    ),
                  },
                ] as Block[])),
            {
              kind: "reference",
              text: `Reference ${bookingReference(booking.id)}`,
            },
          ],
        },

        ...(owed > 0 && tokens.balance
          ? [
              {
                ground: "pool" as const,
                blocks: [
                  { kind: "eyebrow", text: "Paying the rest" },
                  {
                    kind: "button",
                    label: "Pay the balance",
                    href: balanceLink(tokens.balance),
                  },
                  { kind: "rule" },
                  {
                    kind: "paragraph",
                    text: copy(
                      `${formatMoney(owed)} is due${
                        booking.balanceDueAt
                          ? ` by *${formatDayLong(booking.balanceDueAt)}*`
                          : ""
                      }. The link works from today — pay it whenever you like, and it will tell you if it has already been paid. Your place is held until then.`,
                    ),
                  },
                  {
                    kind: "paragraph",
                    text: copy(
                      "If the balance is not paid by that date the place is released, and somebody else can take it.",
                    ),
                  },
                ] as Block[],
              },
            ]
          : []),

        {
          ground: "pool",
          blocks: [
            { kind: "eyebrow", text: "If you cannot come" },
            {
              kind: "button",
              label: "Cancel this booking",
              href: cancellationLink(tokens.cancel),
            },
            { kind: "rule" },
            { kind: "paragraph", text: copy(refundTerms) },
            ...signOffBlocks(slots.signOff),
          ],
        },
      ],
      why: "You are getting this because you booked a place. It is your confirmation, not a mailing list.",
    }),
  };
}

// ── to Marianne, when the payment is confirmed ───────────────────────────────

export function bookingNoticeEmail(
  booking: BookingWithOffering,
  left: number,
): Mail {
  const offering = offeringOf(booking);
  const owed = outstandingPence(booking);

  return {
    to: OWNER,
    subject:
      offering.kind === "workshop"
        ? `${places(booking.places)} booked — ${offering.name}, ${whenWords(offering)}`
        : offering.kind === "service"
          ? `Paid — ${offering.name}, ${whenWords(offering)}`
          : `${places(booking.places)} booked — ${offering.name}`,
    text: [
      offering.kind === "service"
        ? `${booking.buyerName} has paid for ${offering.name}.`
        : `${booking.buyerName} has booked ${places(booking.places).toLowerCase()} on ${offering.name}.`,
      "",
      ...when(offering),
      offering.venueName,
      "",
      booking.buyerEmail,
      ...(owed > 0
        ? [
            `${formatMoney(paidPence(booking))} deposit paid of ${formatMoney(booking.totalPence)}.`,
            `${formatMoney(owed)} OUTSTANDING${
              booking.balanceDueAt
                ? `, due ${formatDayLong(booking.balanceDueAt)}`
                : ""
            }.`,
            "The link to pay it is in their confirmation. If it is not paid by",
            "that date the place is released and you will see it marked so on",
            "the bookings page.",
          ]
        : [`${formatMoney(paidPence(booking))} paid`]),
      `Reference ${bookingReference(booking.id)}`,
      "",
      // A session has no room to count, so there is nothing true to say here
      // about places left. The line is left out rather than filled with "0 of 1".
      ...(offering.kind === "service"
        ? []
        : [
            left === 0
              ? `That is the last place. ${offering.name} is now full.`
              : `${left} of ${offering.capacity} places left.`,
          ]),
    ].join("\n"),
  };
}

// ── to the buyer, when the balance lands ─────────────────────────────────────

export function balancePaidEmail(
  booking: BookingWithOffering,
  wording: Wording = {},
): Mail {
  const offering = offeringOf(booking);
  const balance = booking.payments.find((one) => one.kind === "balance");
  const arrived = formatMoney(balance?.amountPence ?? 0);

  const slots = resolveSlots(
    "balancePaid",
    wording,
    {
      subject: `Paid in full — ${offering.name}`,
      opening: `Thank you. ${arrived} has been paid and ${offering.name} is settled in full. There is nothing else to pay.`,
      signOff:
        "The link in your first email still cancels the place if you cannot come. Its terms have not changed.",
    },
    { ...bookingFacts(booking), amount: arrived },
  );

  return {
    to: booking.buyerEmail,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      ...when(offering),
      "",
      ...where(offering),
      "",
      `${places(booking.places)} · ${formatMoney(paidPence(booking))} paid in total`,
      `Reference ${bookingReference(booking.id)}`,
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader: `${arrived} received. Nothing else to pay. Reference ${bookingReference(booking.id)}.`,
      mastheadLabel: "Paid in full",
      sections: [
        {
          ground: "pool",
          blocks: [
            ...openingBlocks(slots.opening, 30),
            ...whenWhereBlocks(offering),
          ],
        },
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "Paid in total" },
            { kind: "figure", amount: formatMoney(paidPence(booking)) },
            {
              kind: "note",
              text: plain(`${places(booking.places)} · nothing outstanding`),
            },
            {
              kind: "reference",
              text: `Reference ${bookingReference(booking.id)}`,
            },
          ],
        },
        ...(slots.signOff
          ? [{ ground: "pool" as const, blocks: signOffBlocks(slots.signOff) }]
          : []),
      ],
      why: "You are getting this because you paid the rest of a course fee. It is your receipt, not a mailing list.",
    }),
  };
}

export function balanceNoticeEmail(booking: BookingWithOffering): Mail {
  const offering = offeringOf(booking);
  const balance = booking.payments.find((one) => one.kind === "balance");

  return {
    to: OWNER,
    subject: `Balance paid — ${offering.name}`,
    text: [
      `${booking.buyerName} has paid the ${formatMoney(balance?.amountPence ?? 0)} balance on ${offering.name}.`,
      "",
      booking.buyerEmail,
      `${formatMoney(paidPence(booking))} paid in full. Nothing is outstanding.`,
      `Reference ${bookingReference(booking.id)}`,
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
 *
 * THE FIGURE IS WHAT THEY ACTUALLY PAID, not what the booking cost. A course
 * cancelled between the deposit and the balance gets its deposit back and owes
 * nothing else, and quoting the whole price here would promise money that never
 * arrived.
 */
/**
 * A REMINDER THAT A PAYMENT ON A PLAN HAS NOT COME (operator, 2026-08-21).
 *
 * ONE PAYMENT, NAMED, and never "you owe money". A plan of four is four
 * separate asks and a person two payments in is not in arrears on the whole
 * course — they are late on one. Saying the amount and the day it was due is
 * the difference between a nudge and a demand, and it is also the only version
 * a person can act on without going and looking something up.
 *
 * THE LINK IS THE ONE THEY ALREADY HAVE. `/pay/<token>` does not expire and now
 * charges what is due TODAY rather than the whole outstanding balance, so a
 * reminder cannot become an instruction to pay the rest of the year early.
 *
 * NOTHING IS SAID ABOUT LOSING THE PLACE. The place-releasing rule belongs to
 * `balanceDueAt` and a plan is not that; inventing a consequence in a reminder
 * would be inventing a policy she has not set.
 */
export function paymentReminderEmail(
  booking: BookingWithOffering,
  due: { amountPence: number; dueAt: Date },
  payUrl: string,
  wording: Wording = {},
): Mail {
  const offering = offeringOf(booking);
  const slots = resolveSlots(
    "paymentReminder",
    wording,
    {
      subject: `A payment on ${offering.name}`,
      opening: `This is a note about ${offering.name} — the next payment on it was due on ${formatDayLong(due.dueAt)}, and it has not come through yet.`,
      signOff:
        "If you have already sent it, or if something has changed, just reply to this — Marianne reads these herself.",
    },
    {
      ...bookingFacts(booking),
      due: formatDayLong(due.dueAt),
      amount: formatMoney(due.amountPence),
    },
  );

  return {
    to: booking.buyerEmail,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      `${formatMoney(due.amountPence)}, due ${formatDayLong(due.dueAt)}.`,
      "",
      "Pay it here — nothing is charged until you press the button on that page:",
      payUrl,
      ...(slots.signOff ? ["", slots.signOff.text] : []),
    ].join("\n"),
    html: renderLetter({
      subject: slots.subject,
      preheader: `${formatMoney(due.amountPence)} was due on ${formatDayLong(due.dueAt)}. Reference ${bookingReference(booking.id)}.`,
      mastheadLabel: "A payment due",
      sections: [
        {
          ground: "pool",
          blocks: openingBlocks(slots.opening, 30),
        },
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "Due" },
            { kind: "figure", amount: formatMoney(due.amountPence) },
            {
              kind: "note",
              text: plain(`Was due ${formatDayLong(due.dueAt)}`),
            },
            {
              kind: "button",
              label: `Pay ${formatMoney(due.amountPence)}`,
              href: payUrl,
            },
            {
              kind: "reference",
              text: `Reference ${bookingReference(booking.id)}`,
            },
          ],
        },
        ...(slots.signOff
          ? [{ ground: "pool" as const, blocks: signOffBlocks(slots.signOff) }]
          : []),
      ],
      why: `You are getting this because you booked a place on ${offering.name}. It is about that booking, not a mailing list.`,
    }),
  };
}

export function cancellationEmail(
  booking: BookingWithOffering,
  by: CancelledBy = "buyer",
  wording: Wording = {},
): Mail {
  const offering = offeringOf(booking);
  const deadline = deadlineWords(offering);
  const refunded = booking.status === "cancelledRefunded";
  const owed = refundOwed(booking);
  const day = whenWords(offering);
  const some = places(booking.places);
  const isAre = booking.places === 1 ? "is" : "are";
  const paid = paidPence(booking);
  const held = heldPence(booking);

  const heading =
    offering.kind === "course"
      ? `${offering.name}, from ${day}`
      : `${offering.name}, ${day}`;

  // Usually the refund is a minute old and "on its way" is exactly right. It is
  // not when she refunded somebody weeks ago, left them their place, and is
  // only now taking the place back — telling them their money is coming when it
  // arrived a fortnight ago would have them watching for it twice.
  const lastRefundedAt = booking.payments
    .map((one) => one.refundedAt)
    .filter((at): at is Date => at !== null)
    .sort((one, other) => other.getTime() - one.getTime())[0];
  const refundedEarlierOn =
    lastRefundedAt &&
    booking.cancelledAt !== null &&
    booking.cancelledAt.getTime() - lastRefundedAt.getTime() > 60_000
      ? formatInstant(lastRefundedAt)
      : null;

  const slots = resolveSlots(
    "cancellation",
    wording,
    {
      subject: `Cancelled — ${heading}`,
      opening: (by === "marianne"
        ? [
            "I am sorry.",
            "",
            offering.kind === "service"
              ? `I have had to cancel your session — ${heading}.`
              : `I have had to cancel your ${some.toLowerCase()} on ${heading}.`,
          ]
        : offering.kind === "service"
          ? [`Your session — ${heading} — is cancelled.`]
          : [`${some} on ${heading}, ${isAre} cancelled.`]
      ).join("\n"),
      // No closing note in the app today: this message ends on a fact about
      // the money and then the practice's name. The field opens empty on the
      // screen rather than being given words nobody wrote.
      signOff: "",
    },
    bookingFacts(booking),
  );

  /**
   * What happened to the money, as the plate draws it.
   *
   * The same four endings the text below has, in the same order and with the
   * same sentences. They are written out twice rather than derived from each
   * other because the plain-text half is hand-wrapped at the width it has
   * always been wrapped at, and re-flowing it to share one source would change
   * every cancellation email the site has ever sent.
   *
   * `amount` is null in the one ending where nothing moved. A figure of £0.00
   * on a plate reading "the money" would be a claim about a refund, and there
   * was not one.
   */
  const money: {
    label: string;
    amount: string | null;
    lines: string[];
    /** The reassurance the approved design puts under the plate, when the
     *  money has gone and there is genuinely nothing left to do. */
    closing?: string;
  } = refunded
    ? refundedEarlierOn
      ? {
          label: "Already sent back",
          amount: formatMoney(paid),
          lines: [
            `to the card you paid with, on ${refundedEarlierOn}. Nothing more moves now.`,
          ],
          closing: "Nothing further is needed from you.",
        }
      : {
          label: "On its way back",
          amount: formatMoney(paid),
          lines: [
            "to the card you paid with. Stripe usually takes five to ten working days to show it.",
          ],
          closing: "Nothing further is needed from you.",
        }
    : owed
      ? by === "marianne"
        ? {
            label: "Not gone back yet",
            amount: formatMoney(held),
            lines: [
              "has not gone back to your card yet. Marianne will be in touch about it. If you would rather ask now, reply to this email and it reaches her.",
            ],
          }
        : {
            label: "Owed back to you",
            amount: formatMoney(held),
            lines: [
              "is owed back to you and the refund did not go through. Marianne has been told and will return it by hand. Nothing is needed from you.",
            ],
          }
      : offering.kind === "service"
        ? {
            label: "Not gone back yet",
            amount: formatMoney(held),
            lines: [
              "has not gone back yet. There is no refund period on a session — Marianne decides that herself and will be in touch. If you would rather ask now, reply to this email and it reaches her.",
            ],
          }
        : {
            label: "The money",
            amount: null,
            lines:
              by === "marianne"
                ? [
                    "No money has gone back. The refund date on this booking had already passed, so nothing was returned automatically. If that seems wrong, reply to this email and it reaches Marianne.",
                  ]
                : [
                    deadline
                      ? `The refund date was *${deadline}*, which has passed, so nothing has been refunded. The place is free for somebody else, and Marianne knows not to expect you.`
                      : `A place on this ${offering.kind} could not be refunded once it was taken, so nothing has been refunded. The place is free for somebody else, and Marianne knows not to expect you.`,
                  ],
          };

  const closingBlocks: Block[] = [
    ...(money.closing
      ? ([{ kind: "headline", text: copy(money.closing), size: 26 }] as Block[])
      : []),
    ...signOffBlocks(slots.signOff),
    // Named for the kind that was cancelled. A session has no index to send
    // somebody back to — there is one page, and they have read it.
    ...(offering.kind === "service"
      ? []
      : ([
          {
            kind: "link",
            text: "See what else is on",
            href: `${SITE_URL}/${offering.kind === "course" ? "courses" : "workshops"}`,
          },
        ] as Block[])),
  ];

  return {
    to: booking.buyerEmail,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      ...(refunded
        ? refundedEarlierOn
          ? [
              `${formatMoney(paid)} was already sent back to the card you paid`,
              `with, on ${refundedEarlierOn}. Nothing more moves now.`,
              "",
              "Nothing further is needed from you.",
            ]
          : [
              `${formatMoney(paid)} is on its way back to the card you paid with.`,
              "Stripe usually takes five to ten working days to show it.",
              "",
              "Nothing further is needed from you.",
            ]
        : owed
          ? by === "marianne"
            ? [
                `${formatMoney(held)} has not gone back to your card yet. Marianne will`,
                "be in touch about it. If you would rather ask now, reply to this",
                "email and it reaches her.",
              ]
            : [
                `${formatMoney(held)} is owed back to you and the refund did not go`,
                "through. Marianne has been told and will return it by hand.",
                "Nothing is needed from you.",
              ]
          : // A SESSION HAS NO REFUND DATE TO HAVE PASSED. Saying one had would
            // be inventing terms nobody agreed, and saying "the place is free
            // for somebody else" would be nonsense about an hour with one
            // person in it. Either way the money is a conversation with her.
            offering.kind === "service"
            ? [
                `${formatMoney(held)} has not gone back yet. There is no refund period on`,
                "a session — Marianne decides that herself and will be in touch. If",
                "you would rather ask now, reply to this email and it reaches her.",
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
                    : `A place on this ${offering.kind} could not be refunded once it was taken, so nothing has`,
                  "been refunded. The place is free for somebody else, and Marianne",
                  "knows not to expect you.",
                ]),
      ...(outstandingPence(booking) > 0
        ? ["", "Nothing further is owed. The balance is no longer due."]
        : []),
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      `Reference ${bookingReference(booking.id)}`,
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader: money.amount
        ? `${money.amount} — ${money.lines[0]}`
        : money.lines[0].replace(/\*/g, ""),
      mastheadLabel: "Cancelled",
      sections: [
        { ground: "pool", blocks: openingBlocks(slots.opening) },
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: money.label },
            ...(money.amount
              ? ([{ kind: "figure", amount: money.amount }] as Block[])
              : []),
            ...money.lines.map((line): Block => ({
              kind: "note",
              text: copyOnPlate(line),
            })),
            ...(outstandingPence(booking) > 0
              ? ([
                  { kind: "rule" },
                  {
                    kind: "note",
                    text: copyOnPlate(
                      "Nothing further is owed. The balance is no longer due.",
                    ),
                  },
                ] as Block[])
              : []),
            {
              kind: "reference",
              text: `Reference ${bookingReference(booking.id)}`,
            },
          ],
        },
        // Only when there is something to put on it. An empty blush band under
        // the plate would read as a section that failed to load.
        ...(closingBlocks.length
          ? [{ ground: "pool" as const, blocks: closingBlocks }]
          : []),
      ],
      why: "You are getting this because a booking of yours was cancelled. It is the record of it, not a mailing list.",
    }),
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
export function refundIssuedEmail(
  booking: BookingWithOffering,
  wording: Wording = {},
): Mail {
  const offering = offeringOf(booking);
  const day = whenWords(offering);
  const amount = formatMoney(paidPence(booking));
  const stillComing = booking.status === "paid";

  const slots = resolveSlots(
    "refundIssued",
    wording,
    {
      subject: stillComing
        ? `${amount} refunded — your place on ${offering.name} is unchanged`
        : `${amount} refunded — ${offering.name}, ${day}`,
      // Wrapped where it has always been wrapped, so an untouched template
      // sends the plain text this message has always sent.
      opening: stillComing
        ? `${amount} has been sent back to the card you paid with.`
        : `${amount} for your cancelled ${places(booking.places).toLowerCase()} on\n${offering.name}, ${day}, has been sent back to the card you paid with.`,
      // On a booking that is still live there is no closing note today, and
      // "nothing further is needed" beside a place somebody is still expected
      // at would read as a discharge. It stays empty on that branch.
      signOff: stillComing ? "" : "Nothing further is needed from you.",
    },
    { ...bookingFacts(booking), amount },
  );

  return {
    to: booking.buyerEmail,
    subject: slots.subject,
    text: [
      ...(stillComing
        ? [
            slots.opening.text,
            "",
            `YOUR PLACE IS UNCHANGED. ${places(booking.places)} on ${offering.name}`,
            `${booking.places === 1 ? "is" : "are"} still held for you, and you are still expected.`,
            "",
            "Stripe usually takes five to ten working days to show the money.",
            "",
            ...when(offering),
            "",
            ...where(offering),
          ]
        : [
            slots.opening.text,
            "Stripe usually takes five to ten working days to show it.",
          ]),
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      `Reference ${bookingReference(booking.id)}`,
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader: stillComing
        ? `${amount} is on its way back. Your place is unchanged and you are still expected.`
        : `${amount} is on its way back to the card you paid with. Nothing further is needed from you.`,
      mastheadLabel: stillComing ? "Money back to you" : "Refunded",
      sections: [
        { ground: "pool", blocks: openingBlocks(slots.opening, 30) },
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "On its way back" },
            { kind: "figure", amount },
            {
              kind: "note",
              text: copyOnPlate(
                "to the card you paid with. Stripe usually takes five to ten working days to show it.",
              ),
            },
            {
              kind: "reference",
              text: `Reference ${bookingReference(booking.id)}`,
            },
          ],
        },
        /* THE ONE SENTENCE THIS MESSAGE EXISTS FOR, when the place is still
           theirs. Somebody who reads "£95 refunded" and assumes they have been
           cancelled does not turn up. */
        ...(stillComing
          ? [
              {
                ground: "pool" as const,
                blocks: [
                  {
                    kind: "headline",
                    text: copy("Your place is unchanged."),
                    size: 26,
                  },
                  {
                    kind: "paragraph",
                    text: copy(
                      `${places(booking.places)} on ${offering.name} ${booking.places === 1 ? "is" : "are"} still held for you, and you are still expected.`,
                    ),
                  },
                  ...whenWhereBlocks(offering),
                ] as Block[],
              },
            ]
          : []),
        ...(slots.signOff
          ? [{ ground: "pool" as const, blocks: signOffBlocks(slots.signOff) }]
          : []),
      ],
      why: "You are getting this because money has gone back to your card. It is the record of it, not a mailing list.",
    }),
  };
}

// ── to Marianne, when a place is given up ────────────────────────────────────

export function cancellationNoticeEmail(
  booking: BookingWithOffering,
  left: number,
): Mail {
  const offering = offeringOf(booking);
  const refunded = booking.status === "cancelledRefunded";
  const owed = refundOwed(booking);
  return {
    to: OWNER,
    subject: owed
      ? `ACTION NEEDED: refund by hand — ${offering.name}`
      : `A place released — ${offering.name}, ${whenWords(offering)}`,
    text: [
      `${booking.buyerName} has cancelled ${places(booking.places).toLowerCase()} on ${offering.name}, ${whenWords(offering)}.`,
      "",
      booking.buyerEmail,
      refunded
        ? `${formatMoney(paidPence(booking))} refunded.`
        : owed
          ? `${formatMoney(heldPence(booking))} IS OWED BACK AND THE REFUND DID NOT GO THROUGH. Refund it in Stripe, by hand, today.`
          : "Nothing refunded — the refund date had passed.",
      `Reference ${bookingReference(booking.id)}`,
      "",
      `${left} of ${offering.capacity} places left.`,
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
  booking: BookingWithOffering,
  error: string,
): Mail {
  const offering = offeringOf(booking);
  return {
    to: OWNER,
    subject: `ACTION NEEDED: refund by hand — ${offering.name}`,
    text: [
      `You asked to refund ${formatMoney(heldPence(booking))} to ${booking.buyerName} and Stripe would not do it.`,
      "",
      `Stripe said: ${error}`,
      "",
      `${offering.name}, ${whenWords(offering)}`,
      booking.buyerEmail,
      `Reference ${bookingReference(booking.id)}`,
      // Every payment, because a course is two and the one that failed is not
      // necessarily the one at the top.
      ...booking.payments.map(
        (payment) =>
          `${payment.kind} ${formatMoney(payment.amountPence)} — payment ${payment.stripePaymentIntentId ?? "— none on this row"}${payment.refundId ? " (already refunded)" : ""}`,
      ),
      "",
      "REFUND IT IN STRIPE, BY HAND, TODAY. The booking says the money has not",
      "gone back, and it will keep saying so until it has.",
    ].join("\n"),
  };
}

// ── when a payment could not be honoured ─────────────────────────────────────

/**
 * The losing side of the race (D-16), the rarer case of something taken down
 * while somebody was at the checkout, the balance that arrived for a place
 * already gone (D-23), and the session paid for against an approval that had
 * run out or been paid already (D-25). One pair of messages for all of them,
 * because from where the buyer is standing they are the same event: they paid,
 * and there is nothing to give them.
 *
 * The refunded flag is never assumed. If the refund did not go through, this
 * says so — telling somebody their money is on its way when it is not is the
 * one thing that turns a bad morning into a complaint.
 */
export type CannotHonour =
  | "soldOut"
  | "offeringGone"
  | "placeReleased"
  /** The approval this paid against was no longer live — it had run out, or
   *  she had declined it, or she had replaced it. */
  | "approvalGone"
  /** They were charged twice for one session. The second one goes back. */
  | "paidTwice";

export function cannotHonourEmail(args: {
  to: string;
  offeringName: string;
  offeringDay: string;
  amountPence: number;
  why: CannotHonour;
  refunded: boolean;
  wording?: Wording;
}): Mail {
  const amount = formatMoney(args.amountPence);

  /** What actually happened, in one sentence. Never hers to soften. */
  const whatHappened =
    args.why === "soldOut"
      ? `Somebody paid for the last place on ${args.offeringName}, ${args.offeringDay}, while you were paying for yours, so there was no place left to give you.`
      : args.why === "placeReleased"
        ? `The balance on ${args.offeringName} was overdue, so the place had been released, and it has since been taken by somebody else.`
        : args.why === "approvalGone"
          ? `The time Marianne agreed for ${args.offeringName} ran out before this was paid, so the payment arrived after the arrangement had ended.`
          : args.why === "paidTwice"
            ? `${args.offeringName} was already paid for, and this is a second payment for the same session. It should never have been taken.`
            : `${args.offeringName} on ${args.offeringDay} is no longer running, and your payment arrived after it came off the site.`;

  const slots = resolveSlots(
    "cannotHonour",
    args.wording ?? {},
    {
      subject:
        args.why === "paidTwice"
          ? `You were charged twice for ${args.offeringName} — refunded`
          : `Your payment for ${args.offeringName} — refunded`,
      opening: "I am sorry.",
      // No closing note in the app today — see `cancellationEmail`.
      signOff: "",
    },
    {
      offering: args.offeringName,
      when: args.offeringDay,
      amount,
    },
  );

  /** The tail that is true only of two of the five reasons. */
  const tail: string[] = [
    ...(args.why === "placeReleased" || args.why === "approvalGone"
      ? [
          args.why === "approvalGone"
            ? "If you would still like the session, reply to this email and it reaches Marianne."
            : "If you would still like a place, reply to this email and it reaches Marianne.",
        ]
      : []),
    ...(args.why === "paidTwice"
      ? [
          "Your session is unaffected. It is still paid for and still in the diary — only the duplicate has gone back.",
        ]
      : []),
  ];

  return {
    to: args.to,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      whatHappened,
      "",
      ...(args.refunded
        ? [
            `${amount} has been sent back to the card you paid with.`,
            "Stripe usually takes five to ten working days to show it. You are not",
            "holding a place and you have not been charged for one.",
          ]
        : [
            `${amount} is owed back to you and the automatic refund did not`,
            "go through. Marianne has been told and will return it by hand today.",
            "Nothing is needed from you.",
          ]),
      ...(args.why === "placeReleased" || args.why === "approvalGone"
        ? [
            "",
            args.why === "approvalGone"
              ? "If you would still like the session, reply to this email and it reaches"
              : "If you would still like a place, reply to this email and it reaches",
            "Marianne.",
          ]
        : []),
      ...(args.why === "paidTwice"
        ? [
            "",
            "Your session is unaffected. It is still paid for and still in the",
            "diary — only the duplicate has gone back.",
          ]
        : []),
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader: args.refunded
        ? `${amount} has been sent back to the card you paid with. You are not holding a place.`
        : `${amount} is owed back to you and the automatic refund did not go through. Marianne has been told.`,
      mastheadLabel: "I am sorry",
      sections: [
        {
          ground: "pool",
          blocks: [
            ...openingBlocks(slots.opening),
            { kind: "paragraph", text: copy(whatHappened) },
          ],
        },
        {
          ground: "plate",
          blocks: [
            {
              kind: "eyebrow",
              text: args.refunded ? "On its way back" : "Owed back to you",
            },
            { kind: "figure", amount },
            {
              kind: "note",
              text: copyOnPlate(
                args.refunded
                  ? "to the card you paid with. Stripe usually takes five to ten working days to show it. You are not holding a place and you have not been charged for one."
                  : "and the automatic refund did not go through. Marianne has been told and will return it by hand today. Nothing is needed from you.",
              ),
            },
          ],
        },
        ...(tail.length || slots.signOff
          ? [
              {
                ground: "pool" as const,
                blocks: [
                  ...tail.map((line): Block => ({
                    kind: "paragraph",
                    text: copy(line),
                  })),
                  ...signOffBlocks(slots.signOff),
                ],
              },
            ]
          : []),
      ],
      why: "You are getting this because a payment of yours could not be honoured. It is the record of it, not a mailing list.",
    }),
  };
}

export function cannotHonourNoticeEmail(args: {
  offeringName: string;
  offeringDay: string;
  buyerEmail: string;
  amountPence: number;
  why: CannotHonour;
  refunded: boolean;
  reference: string | null;
  error?: string;
}): Mail {
  return {
    to: OWNER,
    subject: args.refunded
      ? `Refunded automatically — ${args.offeringName}`
      : `ACTION NEEDED: refund by hand — ${args.offeringName}`,
    text: [
      args.why === "soldOut"
        ? `Two people paid for the last place on ${args.offeringName}, ${args.offeringDay}. The second one has no place.`
        : args.why === "placeReleased"
          ? `A balance arrived for ${args.offeringName} after that place had lapsed and been taken by somebody else. Their deposit is still with you — that one is your decision, and the row on the bookings page says so.`
          : args.why === "approvalGone"
            ? `Somebody paid for ${args.offeringName} after the approval had run out. Nothing is booked, and the request is on the requests page marked as lapsed — approve it again if you still want to see them.`
            : args.why === "paidTwice"
              ? `${args.offeringName} was paid for TWICE — two checkouts were opened from one link and both went through. The session itself is fine; this is the duplicate.`
              : `A payment arrived for ${args.offeringName}, ${args.offeringDay}, after it was taken off the site.`,
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
