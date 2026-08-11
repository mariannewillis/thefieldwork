import "server-only";
import { Resend } from "resend";
import { SITE_URL } from "@/content/site";

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
const FROM = process.env.EMAIL_FROM ?? "The Field Work <hello@thefieldwork.co.uk>";

/**
 * Where replies go.
 *
 * thefieldwork.co.uk has NO MX record, so nothing can receive mail at
 * hello@thefieldwork.co.uk — a reply to it is rejected outright, and the
 * sender gets a bounce they will read as "this business ignored me".
 *
 * Reply-To sidesteps that entirely: mail still comes FROM the domain, which is
 * what DKIM and DMARC align against, but a reply is addressed to a mailbox
 * that actually exists. This stays useful even once a real mailbox is set up —
 * it just changes to point at it.
 */
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "mariannevwillis@gmail.com";

export async function sendMail(mail: Mail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // Deliberately loud and complete. During development this IS the inbox.
    console.info(
      [
        "",
        "──────────── EMAIL (not sent — no RESEND_API_KEY) ────────────",
        `To:       ${mail.to}`,
        `Reply-To: ${mail.replyTo ?? REPLY_TO}`,
        `Subject:  ${mail.subject}`,
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

/** The reset email. Plain text on purpose — it is one sentence and a link. */
export function resetEmail(token: string, username: string): Omit<Mail, "to"> {
  const link = `${SITE_URL}/admin/reset-password?token=${token}`;
  return {
    subject: "Reset your password — The Field Work",
    text: [
      `Someone asked to reset the password for ${username} on The Field Work.`,
      "",
      "If that was you, open this link and choose a new one:",
      link,
      "",
      "The link works once and expires in 60 minutes.",
      "",
      "If it wasn't you, you can ignore this. Nothing has changed, and your",
      "current password still works.",
    ].join("\n"),
  };
}
