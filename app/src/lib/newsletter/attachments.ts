import "server-only";
import { mediaStore } from "@/lib/media/store";

/**
 * Files that come with a letter, and the size at which one stops being an
 * attachment and becomes a link.
 *
 * WHY THERE IS A THRESHOLD AT ALL. Past a couple of megabytes an attachment
 * stops being a convenience and starts costing delivery: Gmail and Outlook.com
 * both weight large attachments in spam scoring, corporate gateways greylist or
 * strip them, and a message that exceeds a recipient's own limit is rejected
 * outright rather than trimmed — the whole letter bounces, not the file.
 * Resend's own ceiling is 40 MB, which is far above the point at which a
 * mailing list starts landing in junk, so the ceiling is not the number that
 * matters.
 *
 * TWO MEGABYTES PER FILE AND FOUR ACROSS ONE LETTER. Two is comfortably under
 * every mainstream provider's limit even after the ~33% base64 expansion an
 * attachment carries on the wire (2 MB becomes about 2.7 MB in the envelope),
 * and it is above every PDF Marianne has described wanting to send — a
 * six-exercise handout is tens of kilobytes. Four across the letter is the same
 * judgement applied to somebody attaching three things at once.
 *
 * ANYTHING OVER IT STILL GOES OUT — as a link in the letter, with its size
 * printed beside it, exactly as the approved newsletter mockup draws the
 * attached-document plate. Nothing is refused for being large; it just travels
 * differently, and the screen says which is happening before she sends.
 *
 * WHAT IS NOT DECIDED HERE. Whether a link needs a token, and what serves it,
 * is the newsletter pass's to build: the media route only serves image
 * derivatives and will not serve a PDF.
 */

/** Above this, one file becomes a link rather than an attachment. */
export const ATTACH_MAX_BYTES = 2 * 1024 * 1024;

/** Above this in total, the letter stops attaching and starts linking. */
export const ATTACH_MAX_TOTAL_BYTES = 4 * 1024 * 1024;

/**
 * The hard ceiling on an upload, link or no link.
 *
 * The same 25 MB the picture upload uses, and for the same reason: it is the
 * number `next.config.ts` sizes the server-action body against, and the two
 * have to agree or the request is refused before anything here sees it.
 */
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export type Delivery = "attached" | "linked";

/**
 * How this file travels, given what is already on the letter.
 *
 * `alreadyAttachedBytes` is the sum of the files on this letter that are
 * already marked `attached`. Decided per upload rather than at send, so the
 * screen can say which it will be at the moment she adds it — finding out on
 * the send modal that three of her four files became links is finding out too
 * late.
 */
export function deliveryFor(
  bytes: number,
  alreadyAttachedBytes: number,
): Delivery {
  if (bytes > ATTACH_MAX_BYTES) return "linked";
  if (alreadyAttachedBytes + bytes > ATTACH_MAX_TOTAL_BYTES) return "linked";
  return "attached";
}

/** "1.4 MB", "812 kB" — what the screen and the letter both print. */
export function fileSizeWords(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/**
 * What a file is called in the store.
 *
 * PREFIXED WITH THE LETTER'S ID, so two letters can each carry a "notes.pdf"
 * without one overwriting the other, and slugified down to lowercase letters,
 * digits, hyphens and one extension — so a file called `../../.env` becomes
 * `newsletter-7-env`, and there is no arrangement of characters that makes it
 * anything else. Exactly the rule `lib/media/index.ts` applies to a picture,
 * for exactly the same reason: the name a file arrives with is never used as a
 * path component.
 */
export function attachmentKey(newsletterId: number, filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot + 1) : "";

  const clean = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const name = clean(stem) || "file";
  const suffix = clean(extension);
  return `newsletter-${newsletterId}-${name}${suffix ? `.${suffix}` : ""}`;
}

/** Put one away. The same store the photographs use — disk, or the bucket. */
export async function putAttachment(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  await mediaStore().put(key, bytes, contentType);
}

/** Read one back. Null when this store has never heard of it. */
export function getAttachment(key: string): Promise<Buffer | null> {
  return mediaStore().get(key);
}
