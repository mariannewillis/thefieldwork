"use server";

import { MediaKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { parseFilm } from "@/lib/film";
import { ingestImage, MAX_UPLOAD_BYTES } from "@/lib/media";
import { recordPicture, removeAsset } from "@/lib/media/library";
import {
  ATTACHMENT_KINDS,
  documentKey,
  putAttachment,
  sniffDocument,
  UPLOAD_MAX_BYTES,
} from "@/lib/newsletter/attachments";

/**
 * Writing to the library.
 *
 * FIVE THINGS SHE CAN DO HERE and no more: add a picture, add a document, paste
 * a film's address, say what something is, and take something out. There is no
 * rename, no folders, no tags and no editing of pictures — the library is a
 * place to find things and to know what they are, and every one of those would
 * be a second job bolted onto it.
 *
 * EVERY UPLOAD PATH GOES THROUGH THE SAME TWO GATES the rest of the site uses.
 * A picture goes through `ingestImage`, which refuses anything whose first bytes
 * are not a picture and re-encodes what survives into the six derivatives the
 * site serves — so the file that arrives is never the file that is stored. A
 * document goes through `sniffDocument`, which reads what it ACTUALLY is off its
 * first bytes, and is stored as it came because a PDF put through a converter is
 * a different PDF. Neither of those is new here; both are the pipeline the
 * offering forms and the newsletter editor already use, called from one more
 * place.
 */

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  const session = await getSession();
  // The admin layout already turned away anyone without one, but a server
  // action is a POST endpoint of its own: it can be called directly, and it
  // does not inherit the layout's check.
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Redrawing what changed.
 *
 * The library itself, and the screens that offer a picker — an upload she makes
 * from the library has to be pickable on an offering form without a reload, and
 * a deletion has to stop being offered there.
 */
function refresh() {
  revalidatePath("/admin/media");
  revalidatePath("/admin/offerings");
  revalidatePath("/admin/newsletters");
}

export type Added = { ok: true; ref: string } | { ok: false; error: string };

/**
 * A photograph, into the library.
 *
 * The same action the offering forms' own upload takes, with one thing added: a
 * `MediaAsset` row, so the library has somewhere to keep what she says about it.
 * `ingestImage` is idempotent about names rather than about bytes — the same
 * photograph uploaded twice becomes two basenames — so the row is an upsert on
 * the basename it returns rather than a blind insert.
 */
export async function addLibraryPicture(formData: FormData): Promise<Added> {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No picture arrived. Try choosing it again." };
  }
  // Checked before the bytes are read into memory as well as after, because
  // reading a 300 MB file in order to tell her it is too big is the failure the
  // limit exists to prevent.
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That picture is ${Math.round(file.size / 1048576)} MB, and ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB is as much as this takes.`,
    };
  }

  const result = await ingestImage({
    bytes: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    declaredType: file.type,
  });
  if (!result.ok) return result;

  await recordPicture(result.basename);
  refresh();
  return { ok: true, ref: result.basename };
}

/**
 * A document, into the library — and PRIVATE from this moment until she puts it
 * on a letter.
 *
 * Nothing here grants access to anybody. The file is stored under a
 * `document-…` key and a row is written; the only route that will serve it
 * without a session is `/newsletter-files/[file]`, and that route serves
 * nothing that is not attached to a letter. So "private by default" is not a
 * flag this action sets — it is the absence of an attachment row, which is a
 * thing she creates later by choosing the document on a letter.
 *
 * NOT RE-ENCODED, unlike a picture, and that is the decision `attachments.ts`
 * already made: her handout has to arrive as the file she made. What protects
 * the recipient instead is that it is only ever served as an attachment, with
 * `nosniff` beside it, so nothing here can render as a document on this origin.
 */
export async function addLibraryDocument(formData: FormData): Promise<Added> {
  await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file arrived. Try choosing it again." };
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `That file is ${Math.round(file.size / 1048576)} MB, and ${Math.round(UPLOAD_MAX_BYTES / 1048576)} MB is as much as this takes.`,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffDocument(bytes, file.name);
  if (!kind) {
    return {
      ok: false,
      error: `That is not a file this can keep. ${ATTACHMENT_KINDS} — read off the file itself rather than its name, so renaming something does not get it through.`,
    };
  }

  const taken = new Set(
    (
      await prisma.mediaAsset.findMany({
        where: { kind: MediaKind.document },
        select: { ref: true },
      })
    ).map((row) => row.ref),
  );
  const storedAs = documentKey(file.name, taken);

  try {
    await putAttachment(storedAs, bytes, kind.contentType);
  } catch (e) {
    console.error(`[media] could not store ${storedAs}`, e);
    return {
      ok: false,
      error:
        "The file could not be saved. Nothing has changed — try again, and if it happens twice something is wrong at our end rather than with the file.",
    };
  }

  await prisma.mediaAsset.create({
    data: {
      kind: MediaKind.document,
      ref: storedAs,
      title: file.name,
      contentType: kind.contentType,
      bytes: bytes.length,
      addedAt: new Date(),
    },
  });

  refresh();
  return { ok: true, ref: storedAs };
}

/**
 * A film, as a link.
 *
 * LINKS ONLY, AND THAT IS THE OPERATOR'S DECISION rather than a limitation
 * waiting to be lifted. Her own source file is 604 MB; a site that accepted
 * that would need an encoding queue, somewhere to keep the output and a way to
 * tell her it had finished — three things to go wrong in place of a provider
 * that already does it. So there is no upload on this tab, and the screen says
 * so rather than leaving her looking for one.
 *
 * `parseFilm` is the same parser the offering forms use, so what is stored here
 * is byte-identical to what a workshop's `filmUrl` holds — which is what makes
 * a film pasted here pickable there, and one pasted there visible here.
 */
export async function addLibraryVideo(formData: FormData): Promise<Added> {
  await requireSession();

  const raw = String(formData.get("url") ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Paste the film's address in first." };
  }

  const film = parseFilm(raw);
  if (!film) {
    return {
      ok: false,
      error:
        "That is not an address this recognises. Put the film on Vimeo or YouTube and paste the link from the address bar or the share panel — Vimeo for preference, because YouTube records who watched.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();

  // Upsert on the canonical address, so pasting the same film twice — from the
  // share panel one day and the address bar the next, which give different
  // strings for one film — does not put it in the library twice.
  await prisma.mediaAsset.upsert({
    where: { kind_ref: { kind: MediaKind.video, ref: film.watchUrl } },
    update: title ? { title } : {},
    create: {
      kind: MediaKind.video,
      ref: film.watchUrl,
      title: title || null,
      addedAt: new Date(),
    },
  });

  refresh();
  return { ok: true, ref: film.watchUrl };
}

/** One film in the library, as a picker needs it. */
export type PickableVideo = {
  ref: string;
  title: string | null;
};

/**
 * Every film she has, fetched when a picker opens.
 *
 * ASKED FOR ON DEMAND rather than passed down as a prop. The alternative was
 * threading a film list through six pages — new and edit, for workshops, courses
 * and sessions — none of which otherwise care what is in the library, and every
 * one of which would then be a place to forget it. This is one small query, run
 * when she actually opens the picker, and the plumbing stays where the feature
 * is.
 */
export async function listLibraryVideos(): Promise<PickableVideo[]> {
  await requireSession();
  const rows = await prisma.mediaAsset.findMany({
    where: { kind: MediaKind.video },
    select: { ref: true, title: true },
    orderBy: { id: "desc" },
  });
  return rows;
}

export type Described = { ok: boolean; error: string | null };

/**
 * What is in it, and what she calls it.
 *
 * The alt text lives on the asset so the answer can be given ONCE for a
 * photograph used in four places. It does not overwrite the per-use alt on
 * `WorkshopImage` and friends, and it is not meant to: a caption written for one
 * page is about that use, and this is about the file.
 */
export async function describeAsset(
  _prev: Described,
  formData: FormData,
): Promise<Described> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { ok: false, error: "That is not something in the library." };
  }

  const alt = String(formData.get("alt") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  await prisma.mediaAsset.update({
    where: { id },
    // Blank means "nothing recorded" rather than an empty string, so the screen
    // can tell "she has not said" from "she said nothing".
    data: { alt: alt || null, title: title || null },
  });

  refresh();
  return { ok: true, error: null };
}

/**
 * Taking something out for good — refused while anything points at it.
 *
 * The check and the refusal both live in `lib/media/library.ts::removeAsset`,
 * because the list of places a thing can be used is the same list adoption
 * walks and neither may have a copy of its own. This action is the form's end of
 * it: read the two fields, ask, and hand back the sentence.
 */
export async function deleteAsset(
  _prev: Described,
  formData: FormData,
): Promise<Described> {
  await requireSession();

  const kind = String(formData.get("kind") ?? "");
  const ref = String(formData.get("ref") ?? "");
  if (!isKind(kind) || !ref) {
    return { ok: false, error: "That is not something in the library." };
  }

  const result = await removeAsset(kind, ref);
  if (!result.ok) return { ok: false, error: result.error };

  refresh();
  return { ok: true, error: null };
}

/** A posted string is anything at all until this says otherwise. */
function isKind(value: string): value is MediaKind {
  return (Object.values(MediaKind) as string[]).includes(value);
}
