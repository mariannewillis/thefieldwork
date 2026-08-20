/**
 * THE PARTS OF THE QR A BROWSER IS ALLOWED TO KNOW.
 *
 * `lib/qr.ts` is `server-only` — it imports the encoder, which has no business
 * in a browser bundle. The editor panel is a CLIENT component and needs exactly
 * two things from it: the type, and the number below which a printed code stops
 * being reliable. Importing either from `lib/qr.ts` pulls the whole module in
 * and takes the entire route down with a "'server-only' cannot be imported from
 * a Client Component module" — not the component, the ROUTE, including the sign
 * in page next door.
 *
 * This is the THIRD time that boundary has been crossed in this app the same
 * way: `SHARP_ENOUGH_WIDTH` from the encoder (which put sharp in the browser
 * bundle and made the Media screen render as a bare skip link), then `lib/
 * unseen`, now this. The pattern that fixes it every time is this file: the
 * shapes and constants in a module with no imports, and the machinery in one
 * beside it that says `server-only` on the first line.
 */

/** The size of the code on the sheet, in millimetres. */
export const QR_MM = 25;

/**
 * Below this many millimetres per module, a printed code is unreliable at arm's
 * length — the ink bleeds between modules and a phone camera cannot resolve the
 * grid. It is a printing fact rather than a preference, which is why it is a
 * named constant and not a number in a condition.
 */
export const QR_MIN_MODULE_MM = 0.5;

export type Qr = {
  /** The `<path>` markup, to be placed inside our own `<svg>`. */
  paths: string;
  /** The grid it is drawn on — the SVG's viewBox is `0 0 modules modules`. */
  modules: number;
  /** Millimetres per module at the size the sheet gives it. */
  moduleMm: number;
};
