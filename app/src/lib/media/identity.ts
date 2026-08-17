import "server-only";
import { createHash } from "node:crypto";
import { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDayShort } from "@/lib/format";
import { mediaStore, readOnDisk } from "./store";

/**
 * What makes two things the same thing.
 *
 * THE NAME WAS NEVER THE ANSWER. `ingestImage` names an upload after the file
 * it arrived in and numbers it when that name is taken, so the same photograph
 * sent up six times becomes `whatsapp-image-…`, `-2`, `-3`, `-4`, `-5`, `-6`
 * and thirty-six files on disk. That is not a bug in the naming — a photograph
 * of the garden room genuinely should be called `the-garden-room-2` when it is
 * the second one — it is that a NAME answers "what do I call this" and nothing
 * at all about whether we already have it.
 *
 * So identity is the bytes. Two files with different names and identical bytes
 * are one asset; two files sharing a name whose bytes differ are two, and go on
 * being named apart exactly as they are now.
 *
 * ── WHICH BYTES, FOR A PICTURE ────────────────────────────────────────────
 *
 * Not the ones that arrived, because they are not kept. `encode.ts` grades and
 * re-encodes every upload into six derivatives and discards the original —
 * that is what makes an upload safe (§13: nothing survives but pixels sharp
 * decoded) and it is also why hashing the arriving file would produce a number
 * for something the library does not have. It would be worse than useless for
 * the thirty-eight photographs that shipped with the code: those were never
 * uploaded through this app at all, so there is no arriving file to hash, and a
 * scheme that cannot describe the pictures already on the site cannot find the
 * duplicates already on the site.
 *
 * THE CANONICAL DERIVATIVE IS `<basename>-2400.jpg`. It is the one file
 * `listMediaBasenames` already treats as proof that a basename is complete, and
 * the one every `<picture>` falls back to, so it is the derivative most certain
 * to exist. It is also produced by a fixed pipeline from a fixed source, so the
 * same photograph put through twice comes out byte-identical — which is the
 * property this whole scheme rests on, and it was checked against the real
 * store before it was relied on: hashing the 2400 JPEGs of all thirty-eight
 * basenames finds exactly the four groups the operator measured by hand.
 *
 * WHAT THIS DELIBERATELY DOES NOT CATCH. The same photograph exported twice at
 * different JPEG qualities arrives as two different sets of pixels and stays
 * two pictures. Answering that needs perceptual comparison, which is a
 * judgement rather than a fact, and a library that quietly merged two pictures
 * because they LOOKED alike would be a library she could not trust. Identical
 * is a fact; similar is an opinion.
 *
 * ── A DOCUMENT ────────────────────────────────────────────────────────────
 *
 * Stored as it came — a PDF put through a converter is a different PDF — so the
 * bytes that arrived and the bytes that are kept are the same bytes, and there
 * is only one thing to hash.
 *
 * ── A FILM ────────────────────────────────────────────────────────────────
 *
 * Has no bytes here and never gets a hash. It is deduplicated by `(kind, ref)`
 * alone, which works only because `parseFilm` canonicalises the address before
 * anything stores it: a `youtu.be/xxx` link and its `youtube.com/watch?v=xxx`
 * twin both parse to the same `watchUrl`, and both `addLibraryVideo` and the
 * offering forms store `film.watchUrl` rather than the string she pasted. So
 * the two cannot both land, and nothing needs hashing to prove it.
 */

/** SHA-256, hexadecimal. What goes in `MediaAsset.hash`. */
export function hashOf(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The one derivative a picture is identified by.
 *
 * Named here rather than spelled out at each call site, so "which one" is a
 * decision with an address instead of a string repeated in four files.
 */
export function canonicalDerivative(basename: string): string {
  return `${basename}-2400.jpg`;
}

/** A file out of the store, or off the disk the seeded library lives on. */
async function readStored(file: string): Promise<Buffer | null> {
  return (await mediaStore().get(file)) ?? (await readOnDisk(file));
}

/**
 * What is on disk under this name, hashed — or null when there is nothing
 * there.
 *
 * Null is not an error. A row can outlive its file: a picture whose derivatives
 * were removed by hand, a document uploaded before the store moved. Such a row
 * keeps a null hash, never joins a duplicate group, and is left exactly as it
 * is — which is the honest outcome, because a thing whose bytes are gone cannot
 * be proved identical to anything.
 */
export async function hashOfStored(file: string): Promise<string | null> {
  const bytes = await readStored(file);
  return bytes ? hashOf(bytes) : null;
}

/** The hash of a picture already in the store, by basename. */
export function hashOfPicture(basename: string): Promise<string | null> {
  return hashOfStored(canonicalDerivative(basename));
}

/** One thing the library already holds with these exact bytes, or null. */
export type Held = {
  ref: string;
  /** Null means "already on the site" — see the schema for why that is honest. */
  addedAt: Date | null;
};

/**
 * Do we already have this?
 *
 * ASKED BEFORE ANYTHING IS WRITTEN, on every path that can bring bytes in. The
 * answer is only useful if the thing it names is still there, so the store is
 * checked as well as the table: a row pointing at a file somebody removed by
 * hand must not be handed back as "you already have this", or she would end up
 * with a hole where her photograph should be. Belt and braces, and cheap — one
 * indexed lookup and one existence check.
 *
 * `undefined` is never returned; a miss is null, so the caller has one thing to
 * test.
 */
export async function heldWithHash(
  kind: MediaKind,
  hash: string,
): Promise<Held | null> {
  const rows = await prisma.mediaAsset.findMany({
    where: { kind, hash },
    select: { ref: true, addedAt: true },
    // The oldest wins, on the same rule the duplicate merge picks its survivor
    // by: if the library is still holding two rows for one hash when an upload
    // arrives — which it is, until she clears them — she should be handed the
    // one she has had longest. `nulls: "first"` is load-bearing rather than
    // decorative: a null date means "already on the site", which is older than
    // any date, and Postgres sorts nulls LAST on an ascending column.
    orderBy: [{ addedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
  });

  for (const row of rows) {
    const file =
      kind === MediaKind.picture ? canonicalDerivative(row.ref) : row.ref;
    if (await readStored(file)) return row;
  }
  return null;
}

/**
 * The sentence she reads when the answer is yes.
 *
 * SAID AS A FACT AND NOT AS A REFUSAL, because nothing has gone wrong: she
 * wanted this picture on this page, and she is getting it. The only thing she
 * needs to know is that no second copy was made and which one she now has.
 *
 * THE DATE IS FORMATTED HERE, on the server, and travels as part of a string —
 * the same rule the library page follows, and for the same reason: a `Date`
 * crossing into a client component would be re-formatted in the reader's own
 * timezone, so a picture added at 23:40 in London could come back reading as the
 * previous day. `formatDayShort` is what the library card prints under a
 * picture, so the sentence and the card agree.
 *
 * NOT IN THE ACTIONS FILE, where it would have been closer to its callers.
 * Everything exported from a `"use server"` module is a POST endpoint, and
 * every export there must be async; a sentence-builder is neither of those
 * things.
 */
export function heldWords(held: Held, what: "picture" | "file"): string {
  const when = held.addedAt
    ? `it arrived ${formatDayShort(held.addedAt)}`
    : "it was already on the site before this library existed";
  return `You already have this ${what} — ${when}, and that is the one now chosen. Nothing was uploaded a second time.`;
}

/**
 * Fill in the hashes of rows that have none.
 *
 * CALLED FROM ADOPTION, so there is nothing to run and no button to press: the
 * first time she opens the library after this ships, the thirty-eight
 * photographs already on the site get their hashes and the duplicate groups
 * appear. Rows written by an upload arrive with a hash and never come through
 * here.
 *
 * IT COSTS ONE PASS AND THEN ALMOST NOTHING. After the first read the only rows
 * still lacking a hash are the ones whose bytes are missing from the store, and
 * for those this is a handful of misses per page load rather than a re-read of
 * the library. Capping the work per pass would only mean the panel showed a
 * partial answer on the first load, which is worse than a slow one.
 *
 * FILMS ARE SKIPPED rather than attempted and failed — they have no bytes, and
 * `hash` staying null on a film is the correct final state, not a gap.
 */
export async function backfillHashes(): Promise<void> {
  const rows = await prisma.mediaAsset.findMany({
    where: { hash: null, kind: { in: [MediaKind.picture, MediaKind.document] } },
    select: { id: true, kind: true, ref: true },
  });
  if (rows.length === 0) return;

  for (const row of rows) {
    const file =
      row.kind === MediaKind.picture ? canonicalDerivative(row.ref) : row.ref;
    const hash = await hashOfStored(file);
    if (!hash) continue;
    // `updateMany` rather than `update`: a row deleted between the read above
    // and this write is not an error worth throwing a page load away for.
    await prisma.mediaAsset.updateMany({ where: { id: row.id }, data: { hash } });
  }
}
