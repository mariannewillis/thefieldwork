import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { SITE_URL } from "@/content/site";
import { copy, LOGO_CID, LOGO_PATH, renderLetter, type Block } from "./render";
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
  /**
   * Files riding in the envelope. The newsletter only (D-29).
   *
   * A transactional message never carries one — everything a receipt has to
   * say is in the message — and the size at which a newsletter's file stops
   * riding along and becomes a link is decided in
   * `lib/newsletter/attachments.ts`, not here.
   */
  attachments?: { filename: string; content: Buffer }[];
  /**
   * Extra headers. Used for exactly one thing: `List-Unsubscribe` and
   * `List-Unsubscribe-Post` on the newsletter (RFC 8058).
   *
   * WHY IT IS WORTH A FIELD. Gmail and Apple Mail both surface those headers
   * as a native one-tap "unsubscribe" control beside the sender's name, and
   * Gmail's bulk-sender rules have required them of anyone sending to more
   * than a handful of Gmail addresses since February 2024. A list without them
   * gets unsubscribed by people pressing "report spam" instead, which is the
   * signal that moves a sending domain into the junk folder for everybody.
   *
   * A transactional message must NOT carry them — see the note on `footer` in
   * render.ts. It is the same rule as the unsubscribe line, in the headers.
   */
  headers?: Record<string, string>;
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
 * The mark's bytes, read once and kept.
 *
 * A promise rather than a buffer, so two messages sent in the same second
 * cannot both start the read. `process.cwd()` is the app root under `next dev`
 * and under `next start` alike, and `public/` is copied into the standalone
 * output, so one path serves every environment.
 *
 * A read that fails does NOT stop a message going out. The letter's images-off
 * contingency is already the whole answer: the mark's alt text is styled blush
 * display serif on the plum plate, so a masthead with no picture in it is the
 * practice's name in its own type. Refusing to send a booking confirmation over
 * a missing logo would be the wrong trade by a wide margin.
 */
let markBytes: Promise<Buffer | null> | null = null;

function theMark(): Promise<Buffer | null> {
  markBytes ??= readFile(path.join(process.cwd(), "public", LOGO_PATH)).catch(
    (e: unknown) => {
      console.error(
        `[email] ${LOGO_PATH} could not be read; letters will show the masthead's alt text instead`,
        e,
      );
      return null;
    },
  );
  return markBytes;
}

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

  /**
   * The mark goes in the envelope, HERE and nowhere else.
   *
   * `render.ts` writes `src="cid:…"` into every branded masthead; this is the
   * one place that puts the matching file beside it. Doing it at the port
   * rather than in each composer means no caller can send a branded message
   * with a hole where the logo should be, and there is one thing to change when
   * the mark changes.
   *
   * Keyed off the HTML actually containing the reference, so the six plain-text
   * notices to her own inbox stay 2 kB of text with nothing attached.
   */
  const mark = mail.html?.includes(`cid:${LOGO_CID}`) ? await theMark() : null;

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
        ...(mark
          ? [
              `Inline:   ${LOGO_PATH} as cid:${LOGO_CID} (${(mark.length / 1024).toFixed(1)}kB)`,
            ]
          : []),
        ...(mail.attachments?.length
          ? [
              `Files:    ${mail.attachments
                .map(
                  (file) =>
                    `${file.filename} (${(file.content.length / 1024).toFixed(1)}kB)`,
                )
                .join(", ")}`,
            ]
          : []),
        ...(mail.headers
          ? Object.entries(mail.headers).map(
              ([name, value]) => `${name}: ${value}`,
            )
          : []),
        "",
        mail.text,
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { delivered: false, via: "log" };
  }

  /**
   * What actually rides in the envelope: her documents, then the mark.
   *
   * BASE64 RATHER THAN THE BUFFER. `resend@6` types `content` as
   * `string | Buffer` and passes a Buffer straight into `JSON.stringify`, which
   * serialises it as `{"type":"Buffer","data":[137,80,…]}` — four times the
   * bytes on the wire and dependent on the API special-casing that shape. A
   * base64 string is what the wire format is.
   *
   * `contentId` — camelCase — is the SDK's field; it maps it to `content_id`
   * itself. Setting it is what makes the part INLINE: there is no separate
   * disposition to set, and a client that will not resolve `cid:` shows a
   * 13 kB PNG called logo-horizontal@2x.png beside the message rather than
   * nothing.
   */
  const files = [
    ...(mail.attachments ?? []).map((file) => ({
      filename: file.filename,
      content: file.content.toString("base64"),
    })),
    ...(mark
      ? [
          {
            filename: path.basename(LOGO_PATH),
            contentType: "image/png",
            content: mark.toString("base64"),
            contentId: LOGO_CID,
          },
        ]
      : []),
  ];

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
      ...(files.length > 0 ? { attachments: files } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
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
