import "server-only";
import { Resend } from "resend";
import { SITE_URL } from "@/content/site";
import { copy, renderLetter, type Block } from "./render";
import { resolveSlots, type Wording } from "./wording";

/**
 * Sending email, behind a port.
 *
 * Two adapters. Which one runs is decided by whether RESEND_API_KEY exists —
 * not by NODE_ENV, because the thing that actually stops mail sending is a
 * missing key, and keying off the environment would mean a production deploy
 * with no key silently pretending to send.
 *
 *  - Resend, when the key is present.
 *  - The log, when it is not. It prints the message INCLUDING the reset link,
 *    so the whole flow can be built and tested before the sending domain's DNS
 *    is verified. It returns delivered:false and says so, rather than claiming
 *    a success that never happened.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  /**
   * The branded half, when there is one.
   *
   * OPTIONAL, AND NEVER THE ONLY HALF. The six notices that go to Marianne's
   * own inbox have none and are sent as text alone — they are read on a phone
   * in a hurry and branding an alarm is decoration. The nine that reach a
   * visitor carry both parts, and `sendMail` refuses to send HTML without the
   * text: see the note on the send below.
   */
  html?: string;
  /** Where replies should land. Defaults to EMAIL_REPLY_TO. */
  replyTo?: string;
};

export type SendResult = {
  delivered: boolean;
  via: "resend" | "log";
  error?: string;
};

/**
 * Who mail comes from. Must be a domain verified in Resend — until the DNS
 * records are in place on the sending subdomain, Resend rejects anything else.
 */
const FROM =
  process.env.EMAIL_FROM ?? "The Field Work <hello@thefieldwork.co.uk>";

/**
 * Where replies go.
 *
 * The site sends FROM hello@thefieldwork.co.uk, which is not itself a mailbox
 * — it exists so mail comes from the domain, which is what DKIM and DMARC
 * align against. Replies go to marianne@thefieldwork.co.uk, which is a real
 * Microsoft 365 mailbox she reads.
 *
 * Making hello@ an alias on that mailbox would let this be dropped entirely.
 * Until then, a reply to hello@ would bounce and the sender would read that as
 * being ignored.
 */
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "marianne@thefieldwork.co.uk";

/**
 * Send it, as multipart/alternative when there is a branded half.
 *
 * BOTH PARTS OR TEXT ALONE — never HTML alone, and that is a rule rather than a
 * preference. Three things depend on it:
 *
 *  - A client that refuses HTML, or a person who has turned it off, still gets
 *    the whole message. The plain text in `bookings.ts` and
 *    `service-requests.ts` is not a fallback written to be a fallback; it is
 *    the wording, and it says everything the branded half says.
 *  - Spam scoring. An HTML-only message with no text alternative is one of the
 *    oldest heuristics there is, and a confirmation somebody has just paid for
 *    landing in junk is worse than an unbranded one landing in the inbox.
 *  - A forward as plain text, a screen reader, and a search of an inbox two
 *    months later all read the text part.
 *
 * The text is passed through UNCHANGED. Nothing here derives one part from the
 * other; both are composed side by side and the two say the same thing because
 * they were written from the same slots.
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // Deliberately loud and complete. During development this IS the inbox.
    // The HTML is reported by size rather than printed: 11kB of table markup in
    // a terminal buries the message it is a copy of.
    console.info(
      [
        "",
        "──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────",
        `To:       ${mail.to}`,
        `Reply-To: ${mail.replyTo ?? REPLY_TO}`,
        `Subject:  ${mail.subject}`,
        `Parts:    text${mail.html ? ` + html (${(mail.html.length / 1024).toFixed(1)}kB)` : " only"}`,
        "",
        mail.text,
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { delivered: false, via: "log" };
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: mail.to,
      replyTo: mail.replyTo ?? REPLY_TO,
      subject: mail.subject,
      text: mail.text,
      // Given both, Resend builds a multipart/alternative body with the text
      // first and the HTML second, which is the order RFC 2046 asks for: a
      // client shows the last part it understands.
      ...(mail.html ? { html: mail.html } : {}),
    });
    if (error) return { delivered: false, via: "resend", error: error.message };
    return { delivered: true, via: "resend" };
  } catch (e) {
    return {
      delivered: false,
      via: "resend",
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}

/**
 * The reset email.
 *
 * The one message here that reaches a person rather than a booking, and the
 * ninth of the nine she may reword. Its opening and its closing reassurance are
 * hers; the link, and the two sentences saying the link works once and expires
 * in an hour, are not — those are the whole reason the message exists.
 *
 * THE LINK IS BUILT FROM SITE_URL AND NOT FROM THE CANONICAL ORIGIN, unlike the
 * logo in the masthead. A reset token is minted by one deployment and only that
 * deployment can spend it, so a preview's reset link has to point at the
 * preview. Assets are the other way round — see `render.ts`.
 */
export function resetEmail(
  token: string,
  username: string,
  wording: Wording = {},
): Omit<Mail, "to"> {
  const link = `${SITE_URL}/admin/reset-password?token=${token}`;

  const slots = resolveSlots(
    "passwordReset",
    wording,
    {
      subject: "Reset your password — The Field Work",
      opening: `Someone asked to reset the password for ${username} on The Field Work.`,
      signOff:
        "If it wasn't you, you can ignore this. Nothing has changed, and your current password still works.",
    },
    { username },
  );

  return {
    subject: slots.subject,
    text: [
      slots.opening.text,
      "",
      "If that was you, open this link and choose a new one:",
      link,
      "",
      "The link works once and expires in 60 minutes.",
      ...(slots.signOff ? ["", slots.signOff.text] : []),
    ].join("\n"),
    html: renderLetter({
      subject: slots.subject,
      preheader:
        "Open the link to choose a new password. It works once and expires in 60 minutes.",
      mastheadLabel: "Your password",
      sections: [
        {
          ground: "pool",
          blocks: [
            ...slots.opening.html.map((text): Block => ({
              kind: "headline",
              text,
              size: 30,
            })),
          ],
        },
        {
          ground: "pool",
          blocks: [
            { kind: "eyebrow", text: copy("If that was you") },
            { kind: "button", label: "Choose a new password", href: link },
            { kind: "rule" },
            {
              kind: "paragraph",
              text: copy("The link works once and expires in *60 minutes*."),
            },
            ...(slots.signOff
              ? slots.signOff.html.map((text): Block => ({
                  kind: "note",
                  text,
                }))
              : []),
          ],
        },
      ],
      why: "You are getting this because somebody asked to reset the password on The Field Work's portal. It is not a mailing list.",
    }),
  };
}
