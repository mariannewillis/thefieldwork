import "server-only";
import { SITE_URL } from "@/content/site";
import { formatDuration, formatMoment, formatMoney } from "@/lib/format";
import { placeInOneLine, servicePlace } from "@/lib/services";
import { sendMail, type Mail } from "./index";

/**
 * The two emails a request sends.
 *
 * Composing and sending are separate here for the reason `email/bookings.ts`
 * gives on its own: both functions below are pure, so what somebody will
 * receive can be read and tested without anything being delivered to anybody.
 *
 * WHAT THE FIRST TWO MAY PROMISE IS A REPLY, AND NOTHING ELSE. No hour is held,
 * no place is reserved and no price is charged — the whole of what has happened
 * is that a message arrived. Every sentence in them is written against that:
 * "she will write back" is true, "your session is booked for Thursday" would
 * not be, and neither would "your time is held while she decides", which is
 * what the approved screen says and what the absent hold cannot support.
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

/** What somebody sent, as they typed it. */
export type SubmittedRequest = {
  name: string;
  email: string;
  phone: string | null;
  preferredTime: string;
  message: string | null;
};

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
      "WHEN WOULD SUIT THEM (their words)",
      request.preferredTime,
      "",
      ...(request.message
        ? ["WHAT THEY SAID", request.message, ""]
        : ["They did not leave a message.", ""]),
      request.email,
      ...(request.phone ? [request.phone] : []),
      "",
      "Nothing is booked and nothing has been charged. Reply to this email and",
      "you are replying to them.",
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
): Mail {
  return {
    to: request.email,
    subject: `Your request — ${service.name}`,
    text: [
      `Thank you. Your message about ${service.name} has arrived, and Marianne`,
      "will read it and write back herself.",
      "",
      "NOTHING IS BOOKED YET. No time has been held and nothing has been",
      "charged. When she writes back you will agree a time between you.",
      "",
      `${service.name}`,
      summaryLine(service),
      "",
      "WHEN YOU SAID WOULD SUIT YOU",
      request.preferredTime,
      ...(request.message ? ["", "WHAT YOU WROTE", request.message] : []),
      "",
      "If any of that is wrong, reply to this email and say so.",
      "",
      `${SITE_URL}/services/${service.slug}`,
      "",
      SIGN_OFF,
    ].join("\n"),
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
}): Mail {
  return {
    to: args.to,
    subject: `Yes — ${args.service.name}, ${args.agreedTime}`,
    text: [
      args.again
        ? `${args.name} — the last link ran out before it was used, so here is a new one.`
        : `${args.name} — yes, let's do this.`,
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
      `${formatMoney(args.amountPence)}, by ${formatMoment(args.payBy)}.`,
      "",
      "The link opens a page on The Field Work and payment is taken by Stripe.",
      "Your card details are typed on their page and never reach this site.",
      "",
      "IF IT IS NOT PAID BY THEN the time goes back to Marianne and this link",
      "stops working. Nothing will have been charged, and nothing else happens",
      "— write to her and she will sort out another time.",
      "",
      "If anything above is wrong, reply to this email before you pay. It",
      "reaches her.",
      "",
      SIGN_OFF,
    ].join("\n"),
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
}): Mail {
  return {
    to: args.to,
    subject: `About your request — ${args.service.name}`,
    text: [
      `${args.name} — thank you for asking about ${args.service.name}.`,
      "",
      args.note,
      "",
      "Nothing has been charged, and there is nothing you need to do. If you",
      "would like to ask about another time, reply to this email and it reaches",
      "Marianne.",
      "",
      `${SITE_URL}/services/${args.service.slug}`,
      "",
      SIGN_OFF,
    ].join("\n"),
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
