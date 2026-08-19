/**
 * Numbers about pictures that BOTH SIDES need to know.
 *
 * `encode.ts` is `server-only` and imports sharp, so anything a client
 * component can reach must not live there. The media actions import this
 * threshold, `GalleryPicker` and `MediaLibrary` import those actions, and
 * Next therefore traces sharp into the browser bundle — which does not merely
 * bloat it, it breaks the page: the Media screen rendered as nothing but its
 * skip link, and every upload on it silently stopped landing.
 *
 * A number is not a tool. It lives here.
 */

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
