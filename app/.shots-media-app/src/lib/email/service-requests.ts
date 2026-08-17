import "server-only";
import { SITE_URL } from "@/content/site";
import {
  formatDuration,
  formatMoment,
  formatMoney,
  formatSlot,
} from "@/lib/format";
import { placeInOneLine, servicePlace } from "@/lib/services";
import { sendMail, type Mail } from "./index";
import { copy, copyOnPlate, plain, renderLetter, type Block } from "./render";
import {
  openingBlocks,
  resolveSlots,
  signOffBlocks,
  type Wording,
} from "./wording";

/**
 * The two emails a request sends.
 *
 * Composing and sending are separate here for the reason `email/bookings.ts`
 * gives on its own: both functions below are pure, so what somebody will
 * receive can be read and tested without anything being delivered to anybody.
 *
 * WHAT THE FIRST TWO MAY PROMISE HAS CHANGED, AND THIS IS THE ONE PLACE IT
 * SHOWS (D-26). They used to say that no hour was held, because none was: there
 * was no diary to hold one in. There is now, and asking for a slot takes it out
 * of what anybody else is offered until she answers — so the acknowledgement
 * says that, in as many words, and stops short of the two things that are still
 * not true. It is not booked, and nothing is charged; she may still write back
 * and suggest another time.
 *
 * The request that has no slot — a service with no days set, or one whose next
 * two months are full — gets the OLD sentences, unchanged, because for that one
 * they are still exactly right. Which set is used is decided by the row rather
 * than by a flag: `slotStart` is either there or it is not.
 *
 * THE OTHER TWO ARE HER ANSWER (D-25), and they may say more, because by then
 * she has said it: a session at a time she has agreed, at a figure she has
 * agreed, with a link that pays for it and a deadline after which the answer
 * runs out. They still may not say a slot is held in a calendar, because there
 * is no calendar. What is held is her word, and that is what they say.
 */

/**
 * Where the notice goes. The same constant `email/bookings.ts` uses, and the
 * same reason it is not read from her admin account: that address is optional
 * and stays empty until she fills it in (D-13), and a request must not depend
 * on whether she has been into Settings.
 */
const OWNER = process.env.EMAIL_TO_OWNER ?? "marianne@thefieldwork.co.uk";

const SIGN_OFF = "The Field Work · Frome, Somerset";

/** The service, as much of it as either message needs. */
export type RequestedService = {
  name: string;
  slug: string;
  durationMinutes: number;
  priceGBP: number;
  location: "venue" | "travels";
  venueName: string | null;
  addressLines: string | null;
  postcode: string | null;
  gettingThere: string | null;
  baseAddressLines: string | null;
  basePostcode: string | null;
  travelRadiusMiles: number | null;
  travelNote: string | null;
};

/**
 * What somebody sent.
 *
 * Exactly one of `slotStart` and `preferredTime` is set, which is the shape the
 * column itself now has. `whenLine` below is the only thing that reads either,
 * so no message has to know which path it is on.
 */
export type SubmittedRequest = {
  name: string;
  email: string;
  phone: string | null;
  /** Their own sentence, when there was nothing to pick from. */
  preferredTime: string | null;
  /** The slot they chose, which is held from the moment the request exists. */
  slotStart: Date | null;
  slotEnd: Date | null;
  message: string | null;
};

/**
 * When they want it, whichever way they said it.
 *
 * "Thursday 3 September, 10:00–11:30" from a chosen slot; their own words when
 * there was no calendar to choose from. The fallback covers neither, which the
 * form does not allow and which would otherwise print an empty line in an email
 * about a time.
 */
function whenLine(request: SubmittedRequest): string {
  if (request.slotStart && request.slotEnd) {
    return formatSlot(request.slotStart, request.slotEnd);
  }
  return request.preferredTime ?? "They did not say.";
}

/** "60 minutes · £70 · The garden room" */
function summaryLine(service: RequestedService): string {
  return [
    formatDuration(service.durationMinutes),
    formatMoney(service.priceGBP),
    placeInOneLine(servicePlace(service)),
  ].join(" · ");
}

/**
 * The same line WITHOUT the price — "60 minutes · The garden room".
 *
 * For the approval, where the figure is the one SHE agreed and the service's
 * list price is a different number. Printing both would put "£70" three lines
 * above "£95 to pay" in an email asking somebody for money, and whichever they
 * remembered would be a coin toss.
 */
function summaryWithoutPrice(service: RequestedService): string {
  return [
    formatDuration(service.durationMinutes),
    placeInOneLine(servicePlace(service)),
  ].join(" · ");
}

// ── to Marianne, the moment it arrives ───────────────────────────────────────

/**
 * Everything she needs in order to answer, in the order she needs it.
 *
 * Their words are quoted rather than summarised, and the reply-to is set to
 * THEIR address, so answering is pressing reply in the mailbox she already has
 * open. That is the whole workflow this pass builds: there is no approve
 * button, and an email she can reply to is the honest version of that rather
 * than a link to a screen that would only show her the same words again.
 */
export function requestNoticeEmail(
  service: RequestedService,
  request: SubmittedRequest,
): Mail {
  return {
    to: OWNER,
    replyTo: request.email,
    subject: `Session request — ${service.name} — ${request.name}`,
    text: [
      `${request.name} has asked about ${service.name}.`,
      "",
      summaryLine(service),
      "",
      request.slotStart
        ? "WHEN THEY CHOSE"
        : "WHEN WOULD SUIT THEM (their words)",
      whenLine(request),
      "",
      ...(request.message
        ? ["WHAT THEY SAID", request.message, ""]
        : ["They did not leave a message.", ""]),
      request.email,
      ...(request.phone ? [request.phone] : []),
      "",
      ...(request.slotStart
        ? [
            "That time is out of your diary while this sits here — nobody else",
            "is being offered it. It comes back the moment you decline, or if",
            "you approve it and the payment link runs out.",
          ]
        : ["Nothing is booked and nothing has been charged."]),
      "",
      "Reply to this email and you are replying to them.",
      "",
      `The request is also in the portal: ${SITE_URL}/admin/bookings`,
    ].join("\n"),
  };
}

// ── to the person who asked ──────────────────────────────────────────────────

/**
 * The acknowledgement. Its whole job is to say that the message arrived and
 * that a person will answer it — and to say, before they can assume otherwise,
 * that nothing has been booked.
 *
 * Their own words are read back for a practical reason rather than a warm one:
 * "Tuesday or Thursday mornings" typed into a form is easy to mistype, and the
 * only chance to correct it is before she answers.
 */
export function requestAcknowledgementEmail(
  service: RequestedService,
  request: SubmittedRequest,
  wording: Wording = {},
): Mail {
  const slots = resolveSlots(
    "requestAcknowledgement",
    wording,
    {
      subject: `Your request — ${service.name}`,
      opening: `Thank you. Your message about ${service.name} has arrived, and Marianne\nwill read it and write back herself.`,
      signOff: "If any of that is wrong, reply to this email and say so.",
    },
    {
      service: service.name,
      name: request.name,
      when: whenLine(request),
    },
  );

  return {
    to: request.email,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      ...(request.slotStart
        ? [
            "THAT TIME IS HELD WHILE SHE DECIDES. Nobody else is being offered",
            "it. It is NOT booked and nothing has been charged — she may still",
            "write back and suggest another time — but it is not going anywhere",
            "in the meantime.",
          ]
        : [
            "NOTHING IS BOOKED YET. No time has been held and nothing has been",
            "charged. When she writes back you will agree a time between you.",
          ]),
      "",
      `${service.name}`,
      summaryLine(service),
      "",
      request.slotStart ? "THE TIME YOU CHOSE" : "WHEN YOU SAID WOULD SUIT YOU",
      whenLine(request),
      ...(request.message ? ["", "WHAT YOU WROTE", request.message] : []),
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      `${SITE_URL}/services/${service.slug}`,
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader: request.slotStart
        ? `${whenLine(request)} is held while she decides. It is not booked and nothing has been charged.`
        : "Nothing is booked yet and nothing has been charged. Marianne will write back herself.",
      mastheadLabel: "Your request has arrived",
      sections: [
        { ground: "pool", blocks: openingBlocks(slots.opening, 30) },

        /* THE ONE THING THIS MESSAGE EXISTS TO SAY, and the one thing somebody
           will get wrong if it is not said before they can assume otherwise.
           On the plate, in blush, at display size — it is the message, not a
           note attached to it (D-26). */
        {
          ground: "plate",
          blocks: request.slotStart
            ? ([
                {
                  kind: "eyebrow",
                  text: "That time is held while she decides",
                },
                {
                  kind: "headline",
                  text: copy("Nobody else is being offered it."),
                  size: 30,
                },
                {
                  kind: "paragraph",
                  text: copyOnPlate(
                    "It is *not* booked and nothing has been charged — she may still write back and suggest another time — but it is not going anywhere in the meantime.",
                  ),
                },
              ] as Block[])
            : ([
                { kind: "eyebrow", text: "Nothing is booked yet" },
                {
                  kind: "headline",
                  text: copy("No time has been held."),
                  size: 30,
                },
                {
                  kind: "paragraph",
                  text: copyOnPlate(
                    "Nothing has been charged. When she writes back you will agree a time between you.",
                  ),
                },
              ] as Block[]),
        },

        {
          ground: "pool",
          blocks: [
            {
              kind: "factList",
              items: [
                {
                  label: "What you asked for",
                  lines: [plain(service.name), plain(summaryLine(service))],
                },
                {
                  label: request.slotStart
                    ? "The time you chose"
                    : "When you said would suit you",
                  lines: [plain(whenLine(request))],
                },
                ...(request.message
                  ? [
                      {
                        label: "What you wrote",
                        lines: [plain(request.message)],
                      },
                    ]
                  : []),
              ],
            },
            { kind: "rule" },
            ...signOffBlocks(slots.signOff),
            {
              kind: "link",
              text: "Read the page again",
              href: `${SITE_URL}/services/${service.slug}`,
            },
          ],
        },
      ],
      why: "You are getting this because you asked about a session. It is the acknowledgement, not a mailing list.",
    }),
  };
}

// ── to the person who asked, when she says yes ───────────────────────────────

/**
 * The approval, and the one link that pays for it.
 *
 * THE AMOUNT IS THE ONE SHE APPROVED, never the service's list price. Services
 * carry travel and vary in length; the figure on the page is what a session
 * usually costs, and this is what she has agreed THIS one costs.
 *
 * THE DEADLINE IS SAID TWICE — once beside the amount and once under the link —
 * because it is the only thing in this message that takes something away, and
 * somebody skimming for the link should not have to have read the paragraph
 * above it. What happens after it is said plainly too: the answer runs out, and
 * they write to her rather than being left to wonder.
 *
 * WHAT IT DOES NOT SAY is that a slot is held in a diary. There is no diary
 * (D-24). What is held is that she has agreed this time with them and will keep
 * it until the deadline, which is a promise a person can actually make.
 */
export function approvalEmail(args: {
  service: RequestedService;
  name: string;
  to: string;
  /** In her words — "Thursday the 3rd at 10, at yours". */
  agreedTime: string;
  amountPence: number;
  payBy: Date;
  payLink: string;
  /** True when this replaces an approval that had already run out. */
  again: boolean;
  wording?: Wording;
}): Mail {
  const amount = formatMoney(args.amountPence);
  const payBy = formatMoment(args.payBy);

  const slots = resolveSlots(
    "sessionApproved",
    args.wording ?? {},
    {
      subject: `Yes — ${args.service.name}, ${args.agreedTime}`,
      opening: args.again
        ? `${args.name} — the last link ran out before it was used, so here is a new one.`
        : `${args.name} — yes, let's do this.`,
      signOff:
        "If anything above is wrong, reply to this email before you pay. It\nreaches her.",
    },
    {
      service: args.service.name,
      name: args.name,
      agreedTime: args.agreedTime,
      amount,
      payBy,
    },
  );

  return {
    to: args.to,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      `${args.service.name}`,
      summaryWithoutPrice(args.service),
      "",
      "WHEN",
      args.agreedTime,
      "",
      "TO PAY",
      "",
      args.payLink,
      "",
      `${amount}, by ${payBy}.`,
      "",
      "The link opens a page on The Field Work and payment is taken by Stripe.",
      "Your card details are typed on their page and never reach this site.",
      "",
      "IF IT IS NOT PAID BY THEN the time goes back to Marianne and this link",
      "stops working. Nothing will have been charged, and nothing else happens",
      "— write to her and she will sort out another time.",
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      // The deadline is the only thing here that takes something away, so it
      // is in the line the inbox shows before the message is even opened.
      preheader: `${amount}, by ${payBy}. After that the link stops working and the time goes back to her.`,
      mastheadLabel: "She has said yes",
      sections: [
        {
          ground: "pool",
          blocks: [
            ...openingBlocks(slots.opening),
            {
              kind: "factList",
              items: [
                {
                  label: "What",
                  lines: [
                    plain(args.service.name),
                    plain(summaryWithoutPrice(args.service)),
                  ],
                },
                { label: "When", lines: [plain(args.agreedTime)] },
              ],
            },
          ],
        },

        /* THE AMOUNT IS THE ONE SHE APPROVED, never the service's list price,
           and the deadline is said TWICE — once beside the figure and once
           under the link — because somebody skimming for the link should not
           have to have read the paragraph above it. */
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "To pay" },
            { kind: "figure", amount },
            { kind: "note", text: copyOnPlate(`by *${payBy}*.`) },
          ],
        },

        {
          ground: "pool",
          blocks: [
            {
              kind: "button",
              label: "Pay for this session",
              href: args.payLink,
            },
            { kind: "rule" },
            {
              kind: "paragraph",
              text: copy(
                "The link opens a page on The Field Work and payment is taken by Stripe. Your card details are typed on their page and never reach this site.",
              ),
            },
            {
              kind: "paragraph",
              text: copy(
                `*If it is not paid by ${payBy}* the time goes back to Marianne and this link stops working. Nothing will have been charged, and nothing else happens — write to her and she will sort out another time.`,
              ),
            },
            ...signOffBlocks(slots.signOff),
          ],
        },
      ],
      why: "You are getting this because you asked about a session and Marianne has answered. It is her reply, not a mailing list.",
    }),
  };
}

// ── to the person who asked, when she says no ────────────────────────────────

/**
 * The decline, in her words rather than the portal's.
 *
 * The note she typed IS the message; everything around it is the minimum that
 * makes it make sense — what it is about, and that nothing was charged. A
 * template that said "your request has been declined" and then quoted her would
 * be the system talking over her to somebody she is turning down.
 */
export function declineEmail(args: {
  service: RequestedService;
  name: string;
  to: string;
  note: string;
  wording?: Wording;
}): Mail {
  const slots = resolveSlots(
    "sessionDeclined",
    args.wording ?? {},
    {
      subject: `About your request — ${args.service.name}`,
      opening: `${args.name} — thank you for asking about ${args.service.name}.`,
      signOff:
        "Nothing has been charged, and there is nothing you need to do. If you\nwould like to ask about another time, reply to this email and it reaches\nMarianne.",
    },
    { service: args.service.name, name: args.name },
  );

  return {
    to: args.to,
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      args.note,
      ...(slots.signOff ? ["", slots.signOff.text] : []),
      "",
      `${SITE_URL}/services/${args.service.slug}`,
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: slots.subject,
      preheader:
        "Nothing has been charged, and there is nothing you need to do.",
      mastheadLabel: "About your request",
      sections: [
        { ground: "pool", blocks: openingBlocks(slots.opening, 30) },

        /* HER NOTE IS THE MESSAGE, whole, and it is given the plate so it is
           read as somebody speaking rather than as a paragraph of template.
           `plain()` escapes it: she is turning somebody down, and the last
           thing that should be possible is a stray angle bracket eating the
           sentence. */
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "She writes" },
            ...args.note
              .split(/\n{2,}/)
              .map((part) => part.trim())
              .filter(Boolean)
              .map((part): Block => ({ kind: "paragraph", text: plain(part) })),
          ],
        },

        {
          ground: "pool",
          blocks: [
            ...signOffBlocks(slots.signOff),
            {
              kind: "link",
              text: "Read the page again",
              href: `${SITE_URL}/services/${args.service.slug}`,
            },
          ],
        },
      ],
      why: "You are getting this because you asked about a session and Marianne has answered. It is her reply, not a mailing list.",
    }),
  };
}

// ── sending ──────────────────────────────────────────────────────────────────

/**
 * Send one of the above, and say in the log what happened.
 *
 * Failure is never thrown, for the reason `sendBookingMail` gives: the request
 * is already written down, and refusing it because an email bounced would lose
 * the one thing that actually matters. The queue at /admin/bookings is the
 * record; the email is how she finds out without opening it.
 */
export async function sendRequestMail(mail: Mail, what: string): Promise<void> {
  const result = await sendMail(mail);
  const outcome = result.delivered
    ? `sent via ${result.via}`
    : `NOT DELIVERED (${result.via}${result.error ? `: ${result.error}` : ""})`;
  console.info(`[service-requests] ${what} → ${mail.to} — ${outcome}`);
}
