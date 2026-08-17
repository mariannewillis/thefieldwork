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

/**
 * What a file uploaded into the LIBRARY is called in the store.
 *
 * `document-` rather than `newsletter-<id>-`, and the difference in the prefix is
 * the difference in what owns it: a file uploaded onto a letter belongs to that
 * letter, and one uploaded into the library belongs to her and may go out on
 * several. Both shapes are served by the same route and both are refused by it
 * until an attachment row exists.
 *
 * Numbered rather than hashed on a clash, exactly as `lib/media/index.ts` names
 * a second photograph of the garden room — she reads these, and the second copy
 * of her intake form should be `document-intake-form-2.pdf` and not hexadecimal.
 * `taken` is every key already in the library.
 */
export function documentKey(filename: string, taken: Set<string>): string {
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
  const tail = suffix ? `.${suffix}` : "";

  const first = `document-${name}${tail}`;
  if (!taken.has(first)) return first;
  for (let n = 2; ; n += 1) {
    const candidate = `document-${name}-${n}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
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

/**
 * What the file ACTUALLY is, read off its first bytes.
 *
 * The same rule the picture pipeline follows and for the same reason: what the
 * browser declares is a claim, and a claim is not a fact. Unlike a picture,
 * a document CANNOT be re-encoded — a PDF put through a converter is a
 * different PDF, and Marianne's handout has to arrive as the file she made.
 * So the bytes are stored as they came, and what protects the recipient is
 * that the stored file is only ever SERVED as an attachment: the route sets
 * `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, so
 * nothing here is ever rendered as a document by a browser on this origin.
 *
 * The list is short on purpose — a handout, a form, a timetable, a picture.
 * Every entry is a shape whose magic bytes are unambiguous, so "it is what it
 * says" is decidable rather than inferred from the name.
 */
export type DocumentKind = {
  contentType: string;
  /** What she would call it, for the refusal message. */
  words: string;
};

const MAGIC: { bytes: number[]; kind: DocumentKind }[] = [
  {
    bytes: [0x25, 0x50, 0x44, 0x46],
    kind: { contentType: "application/pdf", words: "a PDF" },
  },
  {
    bytes: [0xff, 0xd8, 0xff],
    kind: { contentType: "image/jpeg", words: "a JPEG" },
  },
  {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    kind: { contentType: "image/png", words: "a PNG" },
  },
];

/**
 * The Office formats, which are all Zip archives and share one signature.
 *
 * `PK\x03\x04` says "a Zip", not "a Word document", so the extension is what
 * distinguishes them — and that is honest rather than lax: the thing being
 * decided is what Content-Type to serve it back with, and serving a .docx as
 * `application/zip` would make it download as a zip file with her handout
 * inside. Nothing is executed either way.
 */
const ZIP_TYPES: Record<string, DocumentKind> = {
  docx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    words: "a Word document",
  },
  xlsx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    words: "an Excel spreadsheet",
  },
  pptx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    words: "a PowerPoint",
  },
};

export const ATTACHMENT_KINDS =
  "PDFs, Word documents, spreadsheets, and JPEG or PNG pictures";

/** What this file is, or null when it is not something a letter may carry. */
export function sniffDocument(
  bytes: Buffer,
  filename: string,
): DocumentKind | null {
  for (const entry of MAGIC) {
    if (
      bytes.length >= entry.bytes.length &&
      entry.bytes.every((byte, index) => bytes[index] === byte)
    ) {
      return entry.kind;
    }
  }

  const zip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (zip) {
    const extension = filename.toLowerCase().split(".").pop() ?? "";
    return ZIP_TYPES[extension] ?? null;
  }

  return null;
}
