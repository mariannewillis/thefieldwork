/**
 * The SHAPE of what she has not looked at — for both sides of the wire.
 *
 * `lib/unseen.ts` runs the three counts and is `server-only`, because it
 * imports the database client. `AdminShell` draws the badges and is a client
 * component. The type and the href map are facts they BOTH need and neither
 * owns, so they live here.
 *
 * This is the second time the same mistake has been made in two days — the
 * first put `SHARP_ENOUGH_WIDTH` in the server-only encoder and traced sharp
 * into the browser bundle, which broke the Media screen without a word. A
 * constant is not a query, and a type is not a database.
 */

export type UnseenCounts = {
  requests: number;
  bookings: number;
  subscribers: number;
  /**
   * Bookings with a payment past its day. NOT a "have you looked" count — it
   * clears when the money arrives, not when she opens the screen — which is
   * why the rail adds it to `bookings` rather than drawing a second badge: one
   * number on one entry, and the screen behind it says which is which.
   */
  overdue: number;
};

/** Which rail entry each count belongs to, by href. */
export const UNSEEN_BY_HREF: Record<string, keyof UnseenCounts> = {
  "/admin/bookings": "requests",
  "/admin/workshop-bookings": "bookings",
  "/admin/subscribers": "subscribers",
};
