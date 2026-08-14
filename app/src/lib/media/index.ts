import "server-only";
import { POSTER_PREFIX } from "@/lib/film";
import { slugify } from "@/lib/offering-rules";
import {
  ACCEPTED_TYPES,
  encodeDerivatives,
  MAX_UPLOAD_BYTES,
  sniffImage,
} from "./encode";
import { listOnDisk, mediaStore, readOnDisk } from "./store";

/**
 * The media library.
 *
 * One way in — `ingestImage` — and everything downstream of it holds a
 * BASENAME rather than a path: "marianne-room-aglow", from which every page
 * builds `/media/<basename>-{1200,2400}.{avif,webp,jpg}`. That is the shape
 * `src/content/home.ts` and `Workshop.heroImage` already use, and it is why
 * nothing here ever hands a caller a URL: a caller that could be given a path
 * is one that could be given somebody else's.
 *
 * The name a file arrives with is never used as a path component. It is
 * slugified down to lowercase letters, digits and hyphens, and the result is
 * what names the six derivatives — so an upload called `../../.env` becomes
 * `env`, and there is no arrangement of characters that makes it anything
 * else.
 */

export { MAX_UPLOAD_BYTES } from "./encode";

/** What every derivative name looks like, and the only shape ever served. */
const DERIVATIVE = /^[a-z0-9-]+-(1200|2400)\.(avif|webp|jpg)$/;

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
};

/**
 * Every picture available to choose from.
 *
 * A basename counts as available only if its JPEG at 2400 is there — that is
 * the one every `<img>` falls back to, so without it the picture is a hole.
 *
 * The store and the disk are both read and the answers merged. In disk mode
 * they are the same list and the set collapses it; in bucket mode the disk
 * still holds the photographs that shipped with the code, which are not in
 * the bucket and never will be.
 *
 * Film stills are left out. They are fetched from Vimeo or YouTube when a
 * film's link is saved and they belong to that film — offering one back as a
 * photograph of the day would be offering her something she never chose.
 */
export async function listMediaBasenames(): Promise<string[]> {
  const [inStore, onDisk] = await Promise.all([
    mediaStore().list(),
    listOnDisk(),
  ]);
  const names = [...inStore, ...onDisk]
    .filter((file) => file.endsWith("-2400.jpg"))
    .map((file) => file.slice(0, -"-2400.jpg".length))
    .filter((basename) => !basename.startsWith(POSTER_PREFIX));
  return [...new Set(names)].sort();
}

/** One derivative, for the route that serves them. Null if there is no such file. */
export async function readMedia(
  file: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!DERIVATIVE.test(file)) return null;
  const bytes = (await mediaStore().get(file)) ?? (await readOnDisk(file));
  if (!bytes) return null;
  return { bytes, contentType: CONTENT_TYPES[file.split(".").pop() as string] };
}

export type Ingested =
  { ok: true; basename: string } | { ok: false; error: string };

/**
 * A name for the picture that is hers, unique, and safe as a file name.
 *
 * Numbered rather than hashed when it clashes, because she reads these — the
 * second photograph of the garden room should be `the-garden-room-2` and not
 * a string of hexadecimal.
 */
function nameFor(filename: string, taken: Set<string>): string {
  const stem = slugify(filename.replace(/\.[^.]+$/, "")) || "picture";
  if (!taken.has(stem)) return stem;
  for (let n = 2; ; n += 1) {
    const candidate = `${stem}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * A photograph, taken in.
 *
 * Refuses before it decodes, decodes before it writes, and writes six files or
 * none: a half-written set would show as a picture that loads on one browser
 * and not another, which is worse than a refusal she can read.
 *
 * `basename` is passed only by callers that own the name already — the film
 * poster, which is named after the film it belongs to and is REPLACED when
 * the film changes rather than accumulating numbered copies.
 */
export async function ingestImage(source: {
  bytes: Buffer;
  filename: string;
  /** What the browser said it was. Checked, but not trusted — see sniffImage. */
  declaredType: string;
  basename?: string;
}): Promise<Ingested> {
  if (source.bytes.length === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (source.bytes.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That picture is ${Math.round(source.bytes.length / 1048576)} MB, and ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB is as much as this takes. A photograph straight off a camera is usually under that; one exported at full size from an editor often is not.`,
    };
  }
  if (
    source.declaredType &&
    !ACCEPTED_TYPES.includes(
      source.declaredType as (typeof ACCEPTED_TYPES)[number],
    )
  ) {
    return { ok: false, error: NOT_A_PICTURE };
  }
  if (!sniffImage(source.bytes)) {
    return { ok: false, error: NOT_A_PICTURE };
  }

  const basename =
    source.basename ??
    nameFor(source.filename, new Set(await listMediaBasenames()));

  let derivatives;
  try {
    derivatives = await encodeDerivatives(source.bytes, basename);
  } catch (e) {
    // It passed the first bytes and still would not decode: truncated,
    // corrupt, or a format sharp was not built with. Not her fault and not
    // worth a stack trace on the screen.
    console.error(`[media] ${basename} would not decode`, e);
    return {
      ok: false,
      error:
        "That picture would not open. It may have been cut short on the way here — try saving it again from wherever it came from.",
    };
  }

  const store = mediaStore();
  try {
    // JPEG last, and the whole set in order, because `listMediaBasenames`
    // treats the 2400 JPEG as the proof that a basename is complete. If a
    // write fails partway, the basename never becomes available to choose.
    for (const derivative of derivatives) {
      await store.put(
        derivative.file,
        derivative.bytes,
        derivative.contentType,
      );
    }
  } catch (e) {
    console.error(`[media] could not store ${basename}`, e);
    return {
      ok: false,
      error:
        "The picture could not be saved. Nothing has changed — try again, and if it happens twice something is wrong at our end rather than with the photograph.",
    };
  }

  return { ok: true, basename };
}

const NOT_A_PICTURE =
  "That is not a picture this can use. JPEG, PNG, WebP and AVIF work — which covers anything off a phone, a camera or a Mac.";

/**
 * A picture fetched from somewhere else, put through the same pipeline.
 *
 * Only the film poster arrives this way. It goes through `ingestImage` rather
 * than being linked to, so that opening a workshop's page contacts Vimeo or
 * YouTube for nothing at all until somebody presses play — a hotlinked
 * thumbnail would tell them who is reading before anyone asked to watch.
 */
export async function ingestImageFromUrl(
  url: string,
  basename: string,
): Promise<Ingested> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      return { ok: false, error: "That still could not be fetched." };
    const bytes = Buffer.from(await response.arrayBuffer());
    return ingestImage({
      bytes,
      filename: basename,
      declaredType: response.headers.get("content-type")?.split(";")[0] ?? "",
      basename,
    });
  } catch {
    return { ok: false, error: "That still could not be fetched." };
  }
}
