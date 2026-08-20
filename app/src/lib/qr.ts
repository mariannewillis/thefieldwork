import "server-only";
import QRCode from "qrcode";
import { QR_MM, type Qr } from "@/lib/qr-shape";

/**
 * A QR CODE, AS THE PATHS THAT DRAW IT AND THE GRID THEY ARE DRAWN ON.
 *
 * Generated on the SERVER and inlined into the page, for three reasons that all
 * matter for a thing that gets printed:
 *
 *   NOTHING IS FETCHED. A flyer built against an image service stops printing
 *   the day the service moves, and tells somebody else's server which of her
 *   workshops she is printing.
 *
 *   IT SURVIVES PRINT. Vector paths at any size; a bitmap at screen resolution
 *   prints as a fuzzy square that phones fail on at exactly the moment it
 *   counts.
 *
 *   IT IS THE SAME EVERY TIME. No JavaScript runs on the print route at all, so
 *   there is no state in which the sheet appears with a hole where the code
 *   should be.
 *
 * ERROR CORRECTION Q — a quarter of it can be lost and it still reads. A flyer
 * gets a drawing pin through a corner, gets rained on, and gets photographed at
 * an angle in a dim corridor. L would be smaller and is the wrong trade on
 * paper.
 *
 * ── THE VERSION IS THE ENCODER'S TO CHOOSE, AND THE FIRST GO HAD IT WRONG ───
 *
 * It was pinned to version 6 (41 modules) so the sheet's code could never
 * change size. Measured: version 6 at level Q holds 58 bytes, and
 * `https://thefieldwork.co.uk/workshops/` is 37 of them before the slug starts.
 * A slug of 22 characters — "healing-the-aura" and a couple of words — refuses
 * to encode. Half her real workshops would have printed with no code on them.
 *
 * So the encoder picks, and the caller is told how many modules came back,
 * because that is the number that decides whether a phone can read it: the box
 * on the sheet is a fixed 25mm, so 41 modules is 0.61mm each and 57 modules is
 * 0.43mm. Below about 0.5mm a code stops being reliable on paper at arm's
 * length, and the editor says so rather than letting her find out from a
 * hundred printed sheets.
 */

export type { Qr } from "@/lib/qr-shape";
export { QR_MM, QR_MIN_MODULE_MM } from "@/lib/qr-shape";

export async function makeQr(url: string): Promise<Qr | null> {
  try {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "Q",
      color: { dark: "#160712", light: "#0000" },
    });

    const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    if (!box) return null;
    const modules = Number(box[1]);

    return {
      paths: svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, ""),
      modules,
      moduleMm: QR_MM / modules,
    };
  } catch {
    // A url longer than any version holds, or anything else the encoder
    // refuses. The sheet draws without it and still carries the address in
    // words, which is the reason the address is printed as well as encoded.
    return null;
  }
}
