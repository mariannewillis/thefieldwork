/**
 * The address, as something a map can be asked about.
 *
 * ONE definition, used by the public page and by the portal, so the link she
 * presses to check an address is the same link a visitor presses to find it.
 * Two of these would eventually search for two different things, and the one
 * that was never checked would be the one on the site.
 *
 * A SEARCH, not an embed and not a pin. Nothing is asked of Google until
 * somebody presses it — the page carries a link and no script, which is the
 * same rule the film player follows. A search also survives an address the
 * register has never heard of: it lands on the town rather than on nothing.
 *
 * Deliberately NOT server-only. Nothing here is secret — there is no key and
 * no request, only a string — and the portal builds it beside the form.
 */

/** The parts of an address the map is asked about, as the record holds them. */
export type MappableAddress = {
  venueName: string;
  /** One line each, as typed. Split here rather than by every caller. */
  addressLines: string;
  postcode: string;
};

/**
 * Google Maps, searching for this address — or null when there is nothing to
 * search for.
 *
 * Null rather than a link to an empty search, because a workshop whose place
 * is not set yet should show no link at all. A link that searches for nothing
 * lands on whatever Google thinks of last, which is worse than saying nothing.
 */
export function mapSearchUrl(address: MappableAddress): string | null {
  const query = [
    address.venueName,
    ...address.addressLines.split("\n"),
    address.postcode,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
