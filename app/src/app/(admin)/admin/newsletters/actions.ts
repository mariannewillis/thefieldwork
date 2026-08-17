"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/content/site";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  ATTACHMENT_KINDS,
  attachmentKey,
  deliveryFor,
  fileSizeWords,
  putAttachment,
  sniffDocument,
  UPLOAD_MAX_BYTES,
} from "@/lib/newsletter/attachments";
import {
  beginSend,
  sendBatch,
  sendTest,
  type BatchResult,
} from "@/lib/newsletter/send";
import { NO_ATTEMPT_YET, type OfferingFormState } from "@/lib/offering-rules";

/**
 * Writing, sending and putting away a letter.
 *
 * The write path is the offering forms' path, deliberately: one sheet, one
 * save, every check on the server, errors keyed by field name and drawn beside
 * the field. The blocks are replaced wholesale on every save for the same
 * reason a workshop's picture rail is (`offerings/actions.ts`) — the form posts
 * the whole letter, so what was submitted IS the new letter, and matching rows
 * up by id would be more code for the same answer.
 *
 * THE SEND PATH IS NOT A FORM SAVE and is kept apart from it on purpose. A save
 * changes something only Marianne can see; a send puts a copy of it in other
 * people's inboxes and cannot be taken back. So they are different actions,
 * behind different buttons, with a modal between the second one and the list.
 */

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  // The admin layout already turned away anyone without a session, but a
  // server action is a POST endpoint of its own: it can be called directly,
  // and it does not inherit the layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** A letter that is still hers to change. Anything else is refused. */
async function requireDraft(id: number) {
  if (!Number.isInteger(id)) return null;
  const letter = await prisma.newsletter.findUnique({ where: { id } });
  if (!letter || letter.status !== "draft") return null;
  return letter;
}

function refresh(id?: number) {
  revalidatePath("/admin/newsletters");
  if (id) revalidatePath(`/admin/newsletters/${id}`);
}

// ── writing ──────────────────────────────────────────────────────────────────

/**
 * A new letter.
 *
 * It is created and then opened, rather than opened and then created on first
 * save. A draft with an id can carry an attachment straight away — a file has
 * to be stored under something, and `attachmentKey` prefixes it with the
 * letter's id so two letters can each hold a "notes.pdf".
 *
 * The subject and preheader open with the app's own words rather than blank,
 * because a blank subject is the one field that cannot be left to fix later:
 * it is what an inbox shows.
 */
export async function createNewsletter(): Promise<void> {
  await requireSession();

  const month = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  const letter = await prisma.newsletter.create({
    data: {
      subject: `The Field Work — ${month}`,
      preheader: "What is open, and what the room has been like.",
      mastheadLabel: `The monthly letter · ${month}`,
    },
  });

  refresh();
  redirect(`/admin/newsletters/${letter.id}`);
}

/** The five kinds, as the form posts them. Anything else is not a block. */
const KINDS = ["heading", "paragraph", "image", "offerings", "button"] as const;
type Kind = (typeof KINDS)[number];

const isKind = (value: string): value is Kind =>
  (KINDS as readonly string[]).includes(value);

/**
 * The whole letter, saved.
 *
 * BLOCK ORDER COMES FROM THE FORM'S OWN ORDER, not from a position field she
 * could get out of step with. `FormData.entries()` yields fields in document
 * order, so the order the blocks appear on the sheet is the order they are
 * written down in — which means "move this one up" is a change to the DOM and
 * nothing else, and there is no second source of truth to reconcile.
 */
export async function saveNewsletter(
  prev: OfferingFormState,
  formData: FormData,
): Promise<OfferingFormState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const letter = await requireDraft(id);
  if (!letter) {
    return {
      ...NO_ATTEMPT_YET,
      message:
        "This letter has already been sent, so it cannot be changed. Nothing was saved. Duplicate it if you want to write another like it.",
      attempt: prev.attempt + 1,
    };
  }

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  const errors: Record<string, string> = {};

  const subject = (values.subject ?? "").trim();
  const preheader = (values.preheader ?? "").trim();
  const mastheadLabel = (values.mastheadLabel ?? "").trim();

  if (!subject) {
    errors.subject =
      "The subject is the only thing somebody sees before they open it, so it cannot be blank.";
  }
  if (!preheader) {
    errors.preheader =
      "The preheader follows the subject in most inboxes. Left blank, the inbox shows the first words of the letter instead, which is rarely the line you would choose.";
  }
  if (preheader.length > 140) {
    errors.preheader = `Most inboxes cut this off around ninety characters. This one is ${preheader.length}.`;
  }
  if (!mastheadLabel) {
    errors.mastheadLabel =
      "This is the small line under the logo at the top of the letter.";
  }

  const blocks: {
    position: number;
    kind: Kind;
    text: string | null;
    imageBasename: string | null;
    caption: string | null;
    alt: string | null;
    href: string | null;
    count: number | null;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("block-kind-") || typeof value !== "string") continue;
    const row = key.slice("block-kind-".length);
    if (!isKind(value)) continue;

    const field = (name: string) =>
      String(formData.get(`block-${name}-${row}`) ?? "").trim();

    const text = field("text");
    const imageBasename = field("image");
    const caption = field("caption");
    const alt = field("alt");
    const href = field("href");
    const count = field("count");

    // An empty block is DROPPED rather than refused. She added a paragraph,
    // thought better of it, and moved on; a form that would not save until she
    // found and removed it would be arguing with her about her own draft.
    if (value === "heading" && !text) continue;
    if (value === "paragraph" && !text) continue;
    if (value === "image" && !imageBasename) continue;
    if (value === "button" && !text && !href) continue;

    if (value === "image" && !alt) {
      errors[`block-alt-${row}`] =
        "Say what is in this one, the way you would describe it to somebody on the phone. It is what a person who cannot see it is read, and what shows when a mail client refuses to load pictures — which most of them do by default.";
    }
    if (value === "button") {
      if (!text) {
        errors[`block-text-${row}`] = "A button needs words on it.";
      }
      if (!href) {
        errors[`block-href-${row}`] =
          "A button needs somewhere to go — /courses, or a whole address beginning https://.";
      } else if (!/^(https?:\/\/|mailto:|\/)/i.test(href)) {
        errors[`block-href-${row}`] =
          "Write this as an address on the site starting with a slash, like /courses, or a whole one starting https://.";
      }
    }

    blocks.push({
      position: blocks.length,
      kind: value,
      text: text || null,
      imageBasename: imageBasename || null,
      caption: caption || null,
      alt: alt || null,
      href: href || null,
      count: /^\d+$/.test(count) && Number(count) > 0 ? Number(count) : null,
    });
  }

  const count = Object.keys(errors).length;
  if (count > 0) {
    return {
      errors,
      message:
        count === 1
          ? "One thing needs another look. Nothing has been lost, and the letter is unchanged."
          : `${count} things need another look. Nothing has been lost, and the letter is unchanged.`,
      values,
      attempt: prev.attempt + 1,
    };
  }

  /**
   * The picture behind the masthead.
   *
   * NOT VALIDATED AGAINST THE LIBRARY, on purpose. The field is a `<select>`
   * built from the library, and a basename that names nothing produces a
   * background that does not load — which is the same outcome as choosing
   * none, and the same outcome a large share of readers get anyway (see
   * `render.ts::masthead`). There is nothing here for a forged value to reach:
   * it becomes one URL, escaped, inside a `background-image`.
   *
   * Blank means none, which is what the picker's own "No picture" posts.
   */
  const backgroundBasename = (values.backgroundBasename ?? "").trim() || null;

  await prisma.newsletter.update({
    where: { id },
    data: {
      subject,
      preheader,
      mastheadLabel,
      backgroundBasename,
      blocks: { deleteMany: {}, create: blocks },
    },
  });

  /**
   * The line under each file's name, saved with the letter rather than with
   * the upload.
   *
   * The FILE goes up on its own the moment she chooses it, because bytes
   * cannot wait for a save. What she writes ABOUT it is a sentence like any
   * other on this sheet, so it saves when the sheet does — otherwise the one
   * field on the page that wrote itself when she looked away would be the one
   * next to the thing that had already surprised her by uploading itself.
   *
   * `updateMany` scoped to this letter: an id from a form is a number somebody
   * could change, and the scope is what makes changing it useless.
   */
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("attachment-note-") || typeof value !== "string") {
      continue;
    }
    const attachmentId = Number(key.slice("attachment-note-".length));
    if (!Number.isInteger(attachmentId)) continue;
    await prisma.newsletterAttachment.updateMany({
      where: { id: attachmentId, newsletterId: id },
      data: { note: value.trim() || null },
    });
  }

  refresh(id);
  return { ...NO_ATTEMPT_YET, attempt: prev.attempt + 1 };
}

/**
 * Duplicating a letter.
 *
 * This is what "edit last month's" actually means once a letter is locked, and
 * it is the reason locking is not a wall. Everything is copied — subject,
 * preheader, masthead, every block in order — except the files: an attachment
 * is stored under a key prefixed with the letter it belongs to, and two rows
 * pointing at one stored file would mean deleting either letter took the other
 * one's download with it.
 */
export async function duplicateNewsletter(formData: FormData): Promise<void> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/newsletters");

  const source = await prisma.newsletter.findUnique({
    where: { id },
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  if (!source) redirect("/admin/newsletters");

  const copy = await prisma.newsletter.create({
    data: {
      subject: source.subject,
      preheader: source.preheader,
      mastheadLabel: source.mastheadLabel,
      // The picture travels with the copy, unlike the files: it is a reference
      // to something in the shared library rather than bytes stored under this
      // letter's id, so two letters naming it cost nothing and deleting either
      // takes nothing away from the other.
      backgroundBasename: source.backgroundBasename,
      duplicatedFromId: source.id,
      blocks: {
        create: source.blocks.map((block, position) => ({
          position,
          kind: block.kind,
          text: block.text,
          imageBasename: block.imageBasename,
          caption: block.caption,
          alt: block.alt,
          href: block.href,
          count: block.count,
        })),
      },
    },
  });

  refresh();
  redirect(`/admin/newsletters/${copy.id}`);
}

/**
 * Throwing a draft away.
 *
 * Only a draft. A sent letter is a record of what two hundred people are
 * holding, and there is no button anywhere in this portal that deletes one.
 */
export async function deleteDraft(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  await requireSession();

  const id = Number(formData.get("id"));
  const letter = await requireDraft(id);
  if (!letter) {
    return {
      error:
        "Only a draft can be thrown away. A letter that has been sent stays, because it is the record of what people were sent.",
    };
  }

  await prisma.newsletter.delete({ where: { id } });
  refresh();
  redirect("/admin/newsletters");
}

// ── the files that come with it ──────────────────────────────────────────────

export type AttachmentAdded =
  | {
      ok: true;
      id: number;
      filename: string;
      bytes: number;
      size: string;
      delivery: "attached" | "linked";
    }
  | { ok: false; error: string };

/**
 * A file, put on a letter.
 *
 * It goes up the moment she chooses it, like a photograph does and for the
 * same three reasons (`offerings/actions.ts::addPicture`): a save that bounces
 * must not throw away four megabytes she waited for, the file has to be
 * VISIBLE before she writes the line about it, and a form posting three
 * documents at once is a form that times out.
 *
 * HOW IT WILL TRAVEL IS DECIDED HERE, at the moment it arrives, and returned
 * so the screen can say so immediately. Finding out on the send modal that
 * three of four files became links is finding out too late.
 */
export async function addAttachment(
  formData: FormData,
): Promise<AttachmentAdded> {
  await requireSession();

  const id = Number(formData.get("newsletterId"));
  const letter = await requireDraft(id);
  if (!letter) {
    return {
      ok: false,
      error: "This letter has been sent, so nothing more can be added to it.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file arrived. Try choosing it again." };
  }
  // Checked before the bytes are read into memory as well as after: reading a
  // 300 MB file in order to say it is too big is the failure the limit exists
  // to prevent.
  if (file.size > UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `That file is ${fileSizeWords(file.size)}, and ${fileSizeWords(UPLOAD_MAX_BYTES)} is as much as this takes.`,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffDocument(bytes, file.name);
  if (!kind) {
    return {
      ok: false,
      error: `That is not a file a letter can carry. ${ATTACHMENT_KINDS} — read off the file itself rather than its name, so renaming something does not get it through.`,
    };
  }

  // What is already riding in the envelope, which is what decides whether this
  // one can. Only `attached` files count towards the total: a link costs the
  // message nothing.
  const riding = await prisma.newsletterAttachment.aggregate({
    where: { newsletterId: id, delivery: "attached" },
    _sum: { bytes: true },
  });
  const delivery = deliveryFor(bytes.length, riding._sum.bytes ?? 0);

  const storedAs = attachmentKey(id, file.name);
  try {
    await putAttachment(storedAs, bytes, kind.contentType);
  } catch (e) {
    console.error(`[newsletter] could not store ${storedAs}`, e);
    return {
      ok: false,
      error:
        "The file could not be saved. Nothing has changed — try again, and if it happens twice something is wrong at our end rather than with the file.",
    };
  }

  // Upsert on `storedAs`, so choosing the same filename twice REPLACES it
  // rather than failing on the unique constraint. The bytes in the store were
  // already overwritten a line above; a second row pointing at the same key
  // would be two rows for one file.
  const row = await prisma.newsletterAttachment.upsert({
    where: { storedAs },
    update: {
      filename: file.name,
      contentType: kind.contentType,
      bytes: bytes.length,
      delivery,
    },
    create: {
      newsletterId: id,
      filename: file.name,
      storedAs,
      contentType: kind.contentType,
      bytes: bytes.length,
      delivery,
    },
  });

  refresh(id);
  return {
    ok: true,
    id: row.id,
    filename: row.filename,
    bytes: row.bytes,
    size: fileSizeWords(row.bytes),
    delivery,
  };
}

export async function removeAttachment(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "That file is already gone." };

  const row = await prisma.newsletterAttachment.findUnique({ where: { id } });
  if (!row) return { error: null };

  const letter = await requireDraft(row.newsletterId);
  if (!letter) {
    return {
      error: "This letter has been sent, so what came with it cannot change.",
    };
  }

  // The row goes; the stored bytes stay. Deleting from the store would be one
  // more thing that can fail halfway, and a file nothing points at costs a few
  // kilobytes — a letter that had lost its download would cost more.
  await prisma.newsletterAttachment.delete({ where: { id } });
  refresh(row.newsletterId);
  return { error: null };
}

// ── sending ──────────────────────────────────────────────────────────────────

export type TestState = {
  error: string | null;
  sentTo: string | null;
  at: number;
};

/**
 * A copy to herself, first.
 *
 * NOTHING IS LOCKED AND NO RECIPIENT ROW IS WRITTEN. She can send twenty of
 * these and the letter is still a draft that has been sent to nobody.
 *
 * It goes to the address on her own account. There is no box to type an
 * address into, because a box would be a way to send Marianne's branded letter
 * to any address in the world from a form on a page.
 */
export async function sendTestCopy(
  _prev: TestState,
  formData: FormData,
): Promise<TestState> {
  const session = await requireSession();

  const id = Number(formData.get("id"));
  const letter = await requireDraft(id);
  if (!letter) {
    return {
      error:
        "This letter has already been sent, so there is nothing to test — open it to see who has it.",
      sentTo: null,
      at: Date.now(),
    };
  }

  if (!session.email) {
    return {
      error:
        "There is no email address on your account, so there is nowhere to send the test. Settings has the field.",
      sentTo: null,
      at: Date.now(),
    };
  }

  const result = await sendTest(id, session.email, SITE_URL);
  return result.ok
    ? { error: null, sentTo: result.to, at: Date.now() }
    : { error: result.error, sentTo: null, at: Date.now() };
}

export type SendState = {
  error: string | null;
  /** How many the letter was frozen against. Zero until it starts. */
  recipients: number;
  started: number;
};

/**
 * The send itself — the freeze, not the delivery.
 *
 * This writes one row per chosen recipient and locks the letter, and then
 * stops. The messages go out through `continueSending` below, a few at a time,
 * called by the screen until nothing is pending. See `lib/newsletter/send.ts`
 * for why it is split that way and what happens at five hundred subscribers.
 */
export async function startSending(
  _prev: SendState,
  formData: FormData,
): Promise<SendState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const chosen = formData
    .getAll("recipient")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  const result = await beginSend(id, chosen);

  /**
   * NO `revalidatePath` HERE, and it is not an omission.
   *
   * The freeze flips the letter to `sent`, so revalidating would immediately
   * redraw this page as the RECORD of a letter — unmounting the very component
   * whose next job is to start putting the messages out. The screen would show
   * "nobody has been sent to yet" over a letter that had just been locked, and
   * the sending would not begin until somebody pressed carry-on.
   *
   * The screen refreshes itself when the last batch lands (see the drain in
   * `NewsletterSend`), which is the moment there is something new to draw.
   */
  return result.ok
    ? { error: null, recipients: result.recipients, started: Date.now() }
    : { error: result.error, recipients: 0, started: 0 };
}

/**
 * The next few messages.
 *
 * Called straight from the browser rather than through a form, in a loop, so
 * the count on the screen climbs while it runs. Every call is safe to repeat:
 * it only ever picks up rows still marked `pending`.
 */
export async function continueSending(
  newsletterId: number,
): Promise<BatchResult> {
  await requireSession();
  const result = await sendBatch(newsletterId);
  if (result.remaining === 0) refresh(newsletterId);
  return result;
}
