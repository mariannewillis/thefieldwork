import "server-only";
import { CONTACT_EMAIL } from "@/content/contact";
import { SITE_URL } from "@/content/site";
import { sendMail, type Mail } from "./index";
import { copy, plain, renderLetter } from "./render";

/**
 * The two emails the contact form sends.
 *
 * Composed and sent separately, for the reason `email/service-requests.ts`
 * gives on its own: both functions below are pure, so what somebody will
 * receive can be read and tested without anything being delivered to anybody.
 * The smoke suite does exactly that.
 *
 * ═══ WHICH HALF IS BRANDED, AND WHY IT IS THE OTHER WAY ROUND HERE ════════
 * Everywhere else in this app the VISITOR gets both parts and the notice to
 * Marianne's own inbox is text alone — see the note on `Mail.html` in
 * `email/index.ts`: her notices are read on a phone in a hurry and branding an
 * alarm is decoration.
 *
 * This pair is deliberately inverted, at the operator's instruction:
 *
 *  · HER NOTICE IS BRANDED, both parts, because it is not an alarm. Nothing has
 *    been booked, nothing has been paid, nothing is waiting on her in a queue —
 *    it is a stranger's question, and the thing she needs is their words
 *    legible, whole, and with a reply address that works. The plate carries
 *    what they wrote so it reads as somebody speaking rather than as a field of
 *    a form, exactly as `declineEmail` gives her note the plate.
 *  · THE ACKNOWLEDGEMENT IS PLAIN TEXT. It says one thing — it arrived, and
 *    here is what you wrote — and a branded letter for one sentence is a
 *    letterhead on a receipt.
 *
 * `sendMail` still enforces the rule that matters: HTML never travels without
 * the text part beside it, so her notice is multipart/alternative and the text
 * half says everything the branded half says.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * NOTHING IS WRITTEN DOWN. A message here is not a BookingRequest and does not
 * become one: it holds no slot, names no offering and starts no charge, so
 * there is nothing about it a table would answer that her mailbox does not.
 * The consequence is stated honestly on the page and in both messages — this
 * is a letter, and the record of it is the letter.
 */

/**
 * Where the notice goes.
 *
 * The same constant `email/bookings.ts` and `email/service-requests.ts` use,
 * read the same way and for the same reason: her admin account's email is
 * optional and stays empty until she fills it in (D-13), so a message from a
 * stranger must not depend on whether she has been into Settings.
 *
 * A deployment may point this at a sink — the smoke suite points it at
 * `.invalid` — which is why the PAGE prints `CONTACT_EMAIL` and this does not.
 */
const OWNER = process.env.EMAIL_TO_OWNER ?? CONTACT_EMAIL;

const SIGN_OFF = "The Field Work · Frome, Somerset";

/** What somebody typed. Three fields; all three are required. */
export type SubmittedMessage = {
  name: string;
  email: string;
  message: string;
};

// ── to Marianne, the moment it arrives ───────────────────────────────────────

/**
 * Their question, in their own words, with a reply address that works.
 *
 * REPLY-TO IS THE SENDER, which is the whole workflow: there is no approve
 * button and no portal screen for this, and an email she can simply reply to is
 * the honest version of that rather than a link to a page that would show her
 * the same words again. Answering is pressing reply in the mailbox she already
 * has open.
 *
 * Their words are `plain()`ed on the way into the branded half — a stray angle
 * bracket in a stranger's message must not be able to eat the sentence around
 * it, or anything else.
 */
export function contactNoticeEmail(submitted: SubmittedMessage): Mail {
  const paragraphs = submitted.message
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    to: OWNER,
    replyTo: submitted.email,
    subject: `Message from the site — ${submitted.name}`,
    text: [
      `${submitted.name} has written to you from the contact page.`,
      "",
      "WHAT THEY SAID",
      submitted.message,
      "",
      "WHO THEY ARE",
      submitted.name,
      submitted.email,
      "",
      "Nothing is booked, nothing is held and nothing has been charged — this",
      "is a question, not a request for a time.",
      "",
      "Reply to this email and you are replying to them.",
      "",
      SIGN_OFF,
    ].join("\n"),

    html: renderLetter({
      subject: `Message from the site — ${submitted.name}`,
      preheader: `${submitted.name} has a question. Reply to this email and it reaches them at ${submitted.email}.`,
      mastheadLabel: "Somebody has written to you",
      sections: [
        {
          ground: "pool",
          blocks: [
            {
              kind: "headline",
              text: plain(`${submitted.name} has written to you.`),
              size: 30,
            },
            {
              kind: "paragraph",
              text: copy(
                "From the contact page. *Nothing is booked, nothing is held and nothing has been charged* — this is a question rather than a request for a time.",
              ),
            },
          ],
        },

        /* THEIR WORDS ARE THE MESSAGE, whole, and they get the plate so they
           read as somebody speaking rather than as the contents of a field.
           Same treatment `declineEmail` gives her own note, for the same
           reason and with the same escaping. */
        {
          ground: "plate",
          blocks: [
            { kind: "eyebrow", text: "They write" },
            ...paragraphs.map((part) => ({
              kind: "paragraph" as const,
              text: plain(part),
            })),
          ],
        },

        {
          ground: "pool",
          blocks: [
            {
              kind: "factList",
              items: [
                {
                  label: "Who they are",
                  lines: [plain(submitted.name), plain(submitted.email)],
                },
              ],
            },
            { kind: "rule" },
            {
              kind: "paragraph",
              text: copy(
                "*Reply to this email and you are replying to them.* There is nothing to approve and nothing waiting in the portal — a message from this page is not a booking request and does not appear in the queue.",
              ),
            },
            {
              kind: "link",
              text: "The contact page",
              href: `${SITE_URL}/contact`,
            },
          ],
        },
      ],
      why: "You are getting this because somebody wrote to you from the contact page on The Field Work. It is not a mailing list.",
    }),
  };
}

// ── to the person who wrote ──────────────────────────────────────────────────

/**
 * The acknowledgement. Plain text, on purpose — see the module note.
 *
 * ITS WHOLE JOB is to say the message arrived and that a person will read it.
 * IT PROMISES NO TIMESCALE, because the app has none to promise: there is no
 * rota behind this address and no queue that could be measured. "She reads
 * these herself" is true and is as far as it goes.
 *
 * Their own words are read back for a practical reason rather than a warm one:
 * a question typed into a form is easy to mistype, and this is the only chance
 * to see it as it was sent.
 */
export function contactAcknowledgementEmail(submitted: SubmittedMessage): Mail {
  return {
    to: submitted.email,
    subject: "Your message — The Field Work",
    text: [
      `${submitted.name} — thank you. Your message has arrived, and Marianne`,
      "will read it and write back herself.",
      "",
      "NOTHING IS BOOKED. No time has been held and nothing has been charged;",
      "this was a question, and it is being treated as one.",
      "",
      "WHAT YOU WROTE",
      submitted.message,
      "",
      "If any of that is wrong, reply to this email and say so — it reaches",
      "her.",
      "",
      `${SITE_URL}/contact`,
      "",
      SIGN_OFF,
    ].join("\n"),
  };
}

// ── sending ──────────────────────────────────────────────────────────────────

/**
 * Send one of the above, and say in the log what happened.
 *
 * Failure is never thrown, exactly as `sendRequestMail` does not — but the
 * consequence here is different and worth stating plainly: a service request is
 * already written down when its emails go, and this is not. If BOTH sends fail
 * the message is gone, and the only trace is this log line. That is the price of
 * "no new tables" and it is a real one; the page's own answer is the address
 * printed beside the form, which needs nothing of ours to work.
 */
export async function sendContactMail(mail: Mail, what: string): Promise<void> {
  const result = await sendMail(mail);
  const outcome = result.delivered
    ? `sent via ${result.via}`
    : `NOT DELIVERED (${result.via}${result.error ? `: ${result.error}` : ""})`;
  console.info(`[contact] ${what} → ${mail.to} — ${outcome}`);
}
