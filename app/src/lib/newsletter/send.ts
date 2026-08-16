import "server-only";
import { randomUUID } from "node:crypto";
import { CANONICAL_SITE_URL } from "@/content/site";
import { prisma } from "@/lib/db";
import { sendMail, type Mail } from "@/lib/email";
import {
  attachmentUrl,
  composeNewsletter,
  NEWSLETTER_WHY,
  oneClickUnsubscribeUrl,
  unsubscribeUrl,
  type ComposableAttachment,
  type ComposableBlock,
} from "./compose";
import { getAttachment } from "./attachments";

/**
 * Sending a letter to a list, inside ordinary web requests, with no job runner.
 *
 * ── THE CONSTRAINT ───────────────────────────────────────────────────────────
 *
 * Nothing in this app runs on a schedule (D-23). There is no queue, no worker
 * and no cron; a Replit Reserved VM runs one Next server and that is all. So
 * "send the newsletter" has to happen inside requests that a browser makes,
 * and a request that tries to send two hundred messages in one go dies —
 * Resend's default rate limit is two calls a second, so two hundred is a
 * hundred seconds of waiting, and the platform's proxy gives up long before
 * that. Whatever it had sent by then would be unrecorded.
 *
 * ── WHAT IS DONE INSTEAD ─────────────────────────────────────────────────────
 *
 * The work is SPLIT FROM THE RECORD OF IT, and the record is written first.
 *
 *  1. `beginSend` writes one `NewsletterSend` row per chosen recipient, all
 *     `pending`, and locks the letter — in ONE transaction. After it returns,
 *     the full list of who this letter is going to exists in the database,
 *     whatever happens next.
 *  2. `sendBatch` takes the next few `pending` rows, sends them, and marks each
 *     `delivered` or `failed` AS IT GOES. It stops at a fixed count or a fixed
 *     wall-clock budget, whichever comes first, and reports how far it got.
 *  3. The screen calls `sendBatch` again until nothing is pending. If the
 *     browser is closed halfway, the pending rows are still there and the
 *     letter's own page offers to carry on.
 *
 * The unique constraint on `(newsletterId, subscriberId)` is what makes that
 * safe to repeat: pressing "carry on" twice cannot send anybody a second copy,
 * because there is no second row to send.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 *
 * It is not a job runner and it is not pretending to be one. Nothing retries by
 * itself, nothing wakes up, and a letter left half-sent stays half-sent until
 * somebody opens the screen. What it IS is legible: at every moment the answer
 * to "who has this reached" is a query, not a guess.
 */

/**
 * How many messages one request will attempt.
 *
 * 24 at Resend's two-a-second is about twelve seconds of sending, which sits
 * comfortably inside every serverless and proxy timeout there is with room for
 * the compose on top. Larger batches are not faster — the rate limit, not the
 * request, is the ceiling — they just make a timeout more likely and lose the
 * progress the screen would otherwise have shown.
 */
const BATCH = 24;

/**
 * And the wall-clock cap on one batch, whichever comes first.
 *
 * A provider having a slow morning turns 24 sends into something much longer
 * than twelve seconds, and the batch has to give the request back before
 * anything upstream takes it away. Every row it did send is already recorded.
 */
const BATCH_MILLIS = 30_000;

/** Two a second, which is Resend's default rate limit for a single account. */
const GAP_MILLIS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type BeginOutcome =
  { ok: true; recipients: number } | { ok: false; error: string };

/**
 * Freezing the letter and writing down who it is for.
 *
 * ONE TRANSACTION, and the lock is inside it. The alternative — send first,
 * lock afterwards — has a window in which the letter is out and still editable,
 * and a letter that can be edited after people are holding it is not a record
 * of what they were sent.
 *
 * THE CHOSEN LIST IS INTERSECTED WITH THE CONFIRMED LIST HERE rather than
 * trusted. The ids arrive from a form; a form can be posted with anything in
 * it, and "the send modal only showed confirmed people" is a fact about a
 * screen and not about a request. Anyone unticked, unconfirmed or departed is
 * dropped, silently, because the intersection IS the intent in every case.
 */
export async function beginSend(
  newsletterId: number,
  chosenSubscriberIds: number[],
): Promise<BeginOutcome> {
  const chosen = new Set(
    chosenSubscriberIds.filter((id) => Number.isInteger(id)),
  );
  if (chosen.size === 0) {
    return {
      ok: false,
      error:
        "Nobody is ticked, so there is nobody to send it to. Tick at least one person, or close this and come back to it.",
    };
  }

  const recipients = await prisma.subscriber.findMany({
    where: {
      id: { in: [...chosen] },
      confirmedAt: { not: null },
      unsubscribedAt: null,
    },
    select: { id: true, email: true },
  });

  if (recipients.length === 0) {
    return {
      ok: false,
      error:
        "None of the people ticked can be sent to any more — they have either not confirmed their address or have since asked to be taken off. Nothing was sent.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: the letter may have been sent by
      // another tab between the screen drawing and this button being pressed.
      const letter = await tx.newsletter.findUnique({
        where: { id: newsletterId },
      });
      if (!letter) throw new Error("gone");
      if (letter.status !== "draft") throw new Error("already");

      await tx.newsletterSend.createMany({
        data: recipients.map((person) => ({
          newsletterId,
          subscriberId: person.id,
          // FROZEN. She may change her address next week, and "we sent it to
          // you" has to mean the address it actually went to.
          email: person.email,
        })),
        skipDuplicates: true,
      });

      await tx.newsletter.update({
        where: { id: newsletterId },
        data: {
          status: "sent",
          sentAt: new Date(),
          recipientCount: recipients.length,
        },
      });
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "";
    if (reason === "already") {
      return {
        ok: false,
        error:
          "This letter has already been sent. Nothing went out twice — open it to see who has it.",
      };
    }
    return { ok: false, error: "That letter no longer exists." };
  }

  return { ok: true, recipients: recipients.length };
}

export type BatchResult = {
  /** How many rows this call actually attempted. */
  attempted: number;
  delivered: number;
  failed: number;
  /** How many are still `pending` after it. Zero means the send is done. */
  remaining: number;
  /** Of the whole letter. Both are frozen numbers, not live counts. */
  total: number;
};

/**
 * The next few, sent.
 *
 * THE LETTER IS COMPOSED ONCE PER BATCH, not once per person, and the one
 * thing that differs per person — the unsubscribe link — is stitched in
 * afterwards. Composing per recipient would re-run the offerings queries and
 * re-measure every picture two hundred times for a letter that is identical
 * except for one URL.
 *
 * The stitch uses a nonce minted for this batch rather than a fixed marker, so
 * there is no string Marianne could type into her own prose that this could
 * mistake for the placeholder.
 */
export async function sendBatch(newsletterId: number): Promise<BatchResult> {
  const letter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: {
      blocks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { id: "asc" } },
    },
  });
  if (!letter)
    return { attempted: 0, delivered: 0, failed: 0, remaining: 0, total: 0 };

  const [pending, total] = await Promise.all([
    prisma.newsletterSend.findMany({
      where: { newsletterId, outcome: "pending" },
      orderBy: { id: "asc" },
      take: BATCH,
      include: { subscriber: { select: { unsubscribeToken: true } } },
    }),
    prisma.newsletterSend.count({ where: { newsletterId } }),
  ]);

  if (pending.length === 0) {
    return { attempted: 0, delivered: 0, failed: 0, remaining: 0, total };
  }

  const nonce = `unsub-${randomUUID()}`;
  const composed = await composeNewsletter({
    subject: letter.subject,
    preheader: letter.preheader,
    mastheadLabel: letter.mastheadLabel,
    blocks: letter.blocks as ComposableBlock[],
    attachments: letter.attachments as ComposableAttachment[],
    unsubscribe: nonce,
  });

  const files = await envelopeFiles(
    letter.attachments as ComposableAttachment[],
  );

  let delivered = 0;
  let failed = 0;
  let attempted = 0;
  const startedAt = Date.now();

  for (const row of pending) {
    if (attempted > 0) {
      if (Date.now() - startedAt > BATCH_MILLIS) break;
      await wait(GAP_MILLIS);
    }
    attempted += 1;

    const token = row.subscriber?.unsubscribeToken ?? null;
    const link = token
      ? unsubscribeUrl(token)
      : // The subscriber row is gone — removed between the freeze and now, and
        // `onDelete: SetNull` kept the send record. There is no token left to
        // build a link from, so the letter carries the subscribe page instead
        // of a dead one. The send still goes: they were on the list when it
        // was frozen, and the row is the evidence of that.
        `${CANONICAL_SITE_URL}/subscribe`;

    const mail: Mail = {
      to: row.email,
      subject: composed.subject,
      text: composed.text.split(nonce).join(link),
      html: composed.html.split(nonce).join(link),
      ...(files.length > 0 ? { attachments: files } : {}),
      // The header points at the one-click POST endpoint, not at the page —
      // see `oneClickUnsubscribeUrl`. A send whose subscriber row has gone has
      // no token, so it carries no header: an unsubscribe control that cannot
      // unsubscribe anybody is worse than none.
      ...(token ? { headers: listHeaders(oneClickUnsubscribeUrl(token)) } : {}),
    };

    const result = await sendMail(mail);

    await prisma.newsletterSend.update({
      where: { id: row.id },
      data: result.delivered
        ? { outcome: "delivered", sentAt: new Date(), error: null }
        : {
            outcome: "failed",
            error:
              result.error ??
              (result.via === "log"
                ? "No sending key is configured, so nothing left this machine."
                : "The provider did not accept it."),
          },
    });

    if (result.delivered) delivered += 1;
    else failed += 1;
  }

  const remaining = await prisma.newsletterSend.count({
    where: { newsletterId, outcome: "pending" },
  });

  return { attempted, delivered, failed, remaining, total };
}

/**
 * The headers Gmail and Apple Mail turn into a one-tap control.
 *
 * `List-Unsubscribe-Post` is what makes it ONE tap rather than a trip to the
 * page — RFC 8058 says a client may POST `List-Unsubscribe=One-Click` to the
 * URL and expect the sender to honour it without asking anything further,
 * which `/unsubscribe/<token>` does.
 */
function listHeaders(link: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${link}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * The files that actually ride in the envelope.
 *
 * Only the ones `deliveryFor()` marked `attached` at upload time. A `linked`
 * one is a URL in the letter and its bytes never go near the message — which
 * is the whole point of the threshold.
 *
 * A file the store has lost is DROPPED rather than fatal. The letter still
 * names it and still links to it; losing an attachment is a worse letter, and
 * refusing to send to two hundred people over one missing PDF is a worse day.
 */
async function envelopeFiles(
  attachments: ComposableAttachment[],
): Promise<{ filename: string; content: Buffer }[]> {
  const riding = attachments.filter((file) => file.delivery === "attached");
  const files: { filename: string; content: Buffer }[] = [];
  for (const file of riding) {
    const bytes = await getAttachment(file.storedAs);
    if (!bytes) {
      console.error(
        `[newsletter] ${file.storedAs} is not in the store; sending without it`,
      );
      continue;
    }
    files.push({ filename: file.filename, content: bytes });
  }
  return files;
}

export type TestOutcome =
  { ok: true; to: string } | { ok: false; error: string };

/**
 * One copy, to her.
 *
 * NEITHER LOCKS THE LETTER NOR WRITES A SINGLE ROW, and that is the whole
 * reason it exists. She has no other way to see a letter in a real inbox —
 * the preview is a frame in a browser, and a frame cannot tell her that
 * Outlook has eaten the picture or that the subject is truncated on a phone.
 * Without this, the only way to find a typo would be to mail it to everybody.
 *
 * It goes to the address on her own admin account. Not to an address typed
 * into a box beside the button: a box would be a way to send Marianne's
 * branded letter to any address in the world from a form, and there is no
 * version of that which is worth the convenience.
 *
 * The unsubscribe link points at the subscribe page rather than at anybody's
 * token — a test copy has no recipient, so there is nothing to unsubscribe.
 */
export async function sendTest(
  newsletterId: number,
  to: string,
  origin: string,
): Promise<TestOutcome> {
  const letter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: {
      blocks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { id: "asc" } },
    },
  });
  if (!letter) return { ok: false, error: "That letter no longer exists." };

  const composed = await composeNewsletter({
    subject: `[Test] ${letter.subject}`,
    preheader: letter.preheader,
    mastheadLabel: letter.mastheadLabel,
    blocks: letter.blocks as ComposableBlock[],
    attachments: letter.attachments as ComposableAttachment[],
    unsubscribe: `${origin}/subscribe`,
    origin,
  });

  const files = await envelopeFiles(
    letter.attachments as ComposableAttachment[],
  );

  const result = await sendMail({
    to,
    subject: composed.subject,
    text: composed.text,
    html: composed.html,
    ...(files.length > 0 ? { attachments: files } : {}),
  });

  if (!result.delivered) {
    return {
      ok: false,
      error:
        result.via === "log"
          ? "There is no sending key configured on this machine, so the test was written to the server log instead of an inbox. On the live site it would have arrived."
          : `The test did not go: ${result.error ?? "the provider did not say why"}.`,
    };
  }
  return { ok: true, to };
}

/** Restated here so the send path and the letter agree on why it arrived. */
export { NEWSLETTER_WHY, attachmentUrl };
