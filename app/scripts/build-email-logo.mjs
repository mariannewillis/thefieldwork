/**
 * The wordmark, as a PNG, because no mail client renders SVG.
 *
 * Gmail, Outlook and Yahoo all strip `<svg>` and `<img src="*.svg">` alike, so
 * `public/brand/logo-horizontal.svg` — the only version the site had — is
 * invisible in every inbox. This makes the raster the email masthead points at,
 * and commits it: an asset an email links to has to exist on the domain long
 * after the message was sent, and generating it at request time would put a
 * render on the path of a person opening their receipt.
 *
 *   node scripts/build-email-logo.mjs
 *
 * 880×240 — the SVG's own 440×120 viewBox at 2×, displayed at 280×76 in the
 * template. Three times the display width rather than two because the mark is
 * fine-lined and letterspaced, and Outlook resamples with nearest-neighbour on
 * some scaling paths; the extra pixels cost 30kB and survive that.
 *
 * TRANSPARENT, not flattened onto the plum. The masthead's <td> carries the
 * plum as a `bgcolor`, which is what survives Outlook and images-off both, and
 * a flattened PNG would show its own plum rectangle against a dark-mode client
 * that had shifted the ground underneath it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = join(HERE, "..", "public", "brand");

const WIDTH = 880;
const HEIGHT = 240;

const svg = readFileSync(join(BRAND, "logo-horizontal.svg"));

const png = await sharp(svg, { density: 288 })
  .resize(WIDTH, HEIGHT, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  // Level 9 and a full effort: this is generated once and read by every
  // recipient of every message, so the bytes are worth the seconds.
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();

mkdirSync(BRAND, { recursive: true });
const out = join(BRAND, "logo-horizontal@2x.png");
writeFileSync(out, png);

const meta = await sharp(png).metadata();
console.log(
  `wrote public/brand/logo-horizontal@2x.png — ${meta.width}×${meta.height}, ${(png.length / 1024).toFixed(1)}kB, alpha ${meta.hasAlpha}`,
);
