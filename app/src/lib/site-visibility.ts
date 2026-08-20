import "server-only";
import { prisma } from "@/lib/db";

/**
 * WHAT IS SHOWING, AND WHAT IS NOT.
 *
 * Two scales, one table, one idea: a page can be taken off the site, and so can
 * the whole site. A row exists only where she has changed something, so the
 * absence of a row means showing — which is what everything was before this
 * existed, and what a page she has never touched should be.
 *
 * ── WHY "COMING SOON" IS NOT A DEPLOYMENT SWITCH ────────────────────────────
 *
 * She needs the site built, reachable and hers to work on for weeks before
 * anybody else should be reading it (operator, 2026-08-20). That is a different
 * thing from taking a site down, and the difference is what `ALWAYS_REACHABLE`
 * below is for: a link already sitting in somebody's inbox — a payment, a
 * cancellation, an unsubscribe — must go on working while the front of the site
 * says "coming soon". A person who has paid for an hour and cannot cancel it is
 * a real problem; a person who cannot read the About page for a fortnight is
 * not.
 *
 * THE ADMIN IS NOT GATED HERE AT ALL. It is behind a session, which is a
 * stronger gate than this one and a separate concern — and a switch that could
 * lock her out of the portal that holds the switch would be a trap.
 */

/** The one reserved key. No page may be called this; see `SITE_PAGES`. */
export const WHOLE_SITE = "site";

/**
 * Paths that answer even while the site is behind "coming soon".
 *
 * Prefixes, not exact matches, because each of these ends in a token: they are
 * addressed to ONE person, arrived by email, and are the tail of a transaction
 * that was already agreed. Nothing here is browsable — you cannot find one of
 * these by looking, and there is nothing on the end of it but the thing that
 * person already asked for.
 */
const ALWAYS_REACHABLE = ["/pay/", "/cancel/", "/unsubscribe/", "/api/"];

export function reachableWhileHidden(pathname: string): boolean {
  return ALWAYS_REACHABLE.some((prefix) => pathname.startsWith(prefix));
}

/** Every key that is currently hidden — pages and, possibly, the site. */
export async function hiddenKeys(): Promise<Set<string>> {
  const rows = await prisma.siteSwitch.findMany({
    where: { hidden: true },
    select: { key: true },
  });
  return new Set(rows.map((row) => row.key));
}

export async function isHidden(key: string): Promise<boolean> {
  const row = await prisma.siteSwitch.findUnique({
    where: { key },
    select: { hidden: true },
  });
  return row?.hidden ?? false;
}

/**
 * Take something off the site, or put it back.
 *
 * An upsert rather than an update, because the first time she hides anything
 * there is no row to update — and putting something back writes `false` rather
 * than deleting the row, so the table also records that she has thought about
 * this one. A missing row and a `false` row mean the same thing to every reader.
 */
export async function setHidden(key: string, hidden: boolean): Promise<void> {
  await prisma.siteSwitch.upsert({
    where: { key },
    create: { key, hidden },
    update: { hidden },
  });
}
