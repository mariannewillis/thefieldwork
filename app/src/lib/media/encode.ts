import "server-only";
import sharp, { type Sharp } from "sharp";

/**
 * Turning a photograph into what the site serves.
 *
 * This is `scripts/_tmp-optimise-assets.mjs` promoted out of a temporary
 * script and into the app (D-6). That script produced everything now under
 * `public/media`; the same widths, the same encoders and the same qualities
 * run here, so a picture Marianne adds is indistinguishable from one we
 * generated. Nothing shells out to it — a web request must not depend on a
 * file living outside the deployed app.
 *
 * WHAT IS STORED IS NEVER WHAT ARRIVED. §13 is explicit ("images are
 * re-encoded on the server rather than stored as received") and it is also
 * what makes the upload safe: whatever a file claims to be, only pixels sharp
 * decoded survive into the six files below. Anything hidden in the original —
 * a payload after the image data, an EXIF block, a malformed chunk — is not
 * copied, because the original is not copied.
 */

/**
 * Two limits on libvips, set once when this module loads.
 *
 * A batch is uploaded one photograph at a time (see the form), so there is
 * never anything to gain from libvips holding decoded tiles for the next call
 * or spreading one resize across every core. Left at its defaults it does
 * both, and the memory is native — outside the Node heap, where nothing that
 * watches the heap will see it coming.
 *
 * Set after fifteen uploads through one long-lived dev process killed its
 * render workers. That is a development symptom and not proof of the cause,
 * but the production target is a single small Replit VM (D-4), and capping a
 * cache we cannot use costs nothing.
 */
sharp.cache(false);
sharp.concurrency(1);

/**
 * The ceiling on what may be sent.
 *
 * The masters under `assets/images/new/` run to 9 MB, and a modern phone
 * photograph is 3–5 MB, so this leaves room for both with a wide margin. It is
 * also the number `next.config.ts` sizes the server-action body against; the
 * two have to agree or the request is refused before this ever sees it.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** What a picture may be. Anything else is not a picture as far as this goes. */
export type ImageKind = "jpeg" | "png" | "webp" | "avif";

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * What the file ACTUALLY is, read off its first bytes.
 *
 * §13 asks for content-type AND magic-byte validation. They are two separate
 * gates rather than one cross-check: the browser's `Content-Type` is derived
 * from the file's extension and is a courtesy, this is the evidence, and
 * sharp's decode is the final word. Requiring the first two to AGREE would
 * only reject honest uploads whose extension is wrong — it would not stop
 * anything, because the bytes are what get decoded either way.
 */
export function sniffImage(bytes: Buffer): ImageKind | null {
  if (bytes.length < 16) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  // RIFF container, WEBP form-type. The four bytes between the two are the
  // file length, which is not worth checking — sharp will not decode a lie.
  if (
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  // An ISO base-media box: a length, then "ftyp", then the brand. `avis` is
  // an AVIF sequence — a short soundless animation, which decodes to its
  // first frame here and is a reasonable thing to hand over as a picture.
  if (bytes.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("latin1");
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

/**
 * The two widths, from D-6.
 *
 * 2400 covers a full-bleed plate on a 1440 desktop at 2×; 1200 covers a phone
 * at 2×. Both are always emitted, even from a source smaller than either —
 * `withoutEnlargement` means the file may hold fewer pixels than its name
 * says, which costs a duplicate and buys the guarantee every caller relies
 * on: six files exist for every basename, so no page has to ask.
 */
const WIDTHS = [2400, 1200] as const;

/**
 * The palette treatment (D-6, brief §12).
 *
 * A phone snapshot taken under a kitchen light and dropped into a page built
 * on plum and gold is the failure this exists to prevent. It is deliberately
 * slight: a tenth of the saturation off, and the site's own ground colour laid
 * over in soft light at low strength, which warms the shadows and leaves the
 * highlights where they are. Enough to make a stray photograph belong; not
 * enough that anyone would say her picture had been changed.
 */
const GROUND = { r: 0x16, g: 0x07, b: 0x12 };
const GROUND_STRENGTH = 0.14;
const SATURATION = 0.9;

export type Derivative = {
  /** The served file name — `<basename>-<width>.<ext>`. */
  file: string;
  bytes: Buffer;
  contentType: string;
};

/**
 * The six files a basename means.
 *
 * AVIF first, WebP second, JPEG last: the page's `<picture>` offers them in
 * that order and a browser takes the first it understands, so the JPEG is the
 * one nobody modern downloads and every caller can still fall back to.
 */
export type Encoded = {
  derivatives: Derivative[];
  /** How wide the picture she chose actually is, before any resizing. */
  sourceWidth: number;
};

export async function encodeDerivatives(
  source: Buffer,
  basename: string,
): Promise<Encoded> {
  const graded = await sharp(source)
    .rotate() // honour the EXIF orientation before the tag is discarded
    .modulate({ saturation: SATURATION })
    .composite([
      {
        input: {
          create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { ...GROUND, alpha: GROUND_STRENGTH },
          },
        },
        tile: true,
        blend: "soft-light",
      },
    ])
    // Back to a bitmap once, so the grade is not recomputed six times over.
    .toFormat("png")
    .toBuffer();

    // HOW WIDE THE PICTURE SHE CHOSE ACTUALLY IS, before anything is resized.
  // `withoutEnlargement` above means a small source is never stretched — which
  // is right, since no encoder can add detail that was never captured — but it
  // also means a 828px photograph is stored under a name that says 2400 and
  // looks soft the moment a page puts it across the top of a screen. The only
  // place that can be said is here, where the number exists.
  const sourceWidth = (await sharp(graded).metadata()).width ?? 0;

  const derivatives: Derivative[] = [];

  for (const width of WIDTHS) {
    const resized = sharp(graded).resize({ width, withoutEnlargement: true });

    for (const [ext, encode, contentType] of [
      ["avif", (b: Sharp) => b.avif({ quality: 50 }), "image/avif"],
      ["webp", (b: Sharp) => b.webp({ quality: 72 }), "image/webp"],
      [
        "jpg",
        (b: Sharp) => b.jpeg({ quality: 76, mozjpeg: true }),
        "image/jpeg",
      ],
    ] as const) {
      derivatives.push({
        file: `${basename}-${width}.${ext}`,
        bytes: await encode(resized.clone()).toBuffer(),
        contentType,
      });
    }
  }

  return { derivatives, sourceWidth };
}

/**
 * The width below which a picture will look soft where the site uses one big.
 *
 * 1600 rather than 2400: the full-bleed plates are drawn at 1440 on a desktop,
 * so anything at or above that is sharp on an ordinary screen and only short of
 * the ideal on a high-density one. Below 1600 it is visibly soft on a laptop,
 * which is what the operator saw on the detail pages — three of the heroes are
 * 828px, because they came off WhatsApp, which resamples on send.
 */
export const SHARP_ENOUGH_WIDTH = 1600;
