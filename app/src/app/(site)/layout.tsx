import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ComingSoon from "@/components/site/ComingSoon";
import { SITE_PAGES } from "@/content/pages";
import {
  hiddenKeys,
  reachableWhileHidden,
  WHOLE_SITE,
} from "@/lib/site-visibility";

/**
 * THE GATE ON EVERYTHING A VISITOR CAN READ.
 *
 * Two switches, at two scales, and one place that reads them — because "why is
 * this page not showing" must have exactly one answer to look up.
 *
 *   THE SITE      → `ComingSoon`. She needs the site built, reachable and hers
 *                   to work on for weeks before anybody else reads it
 *                   (operator, 2026-08-20). Not a 503 and not a deployment: a
 *                   real page, in the site's own clothes, saying the true
 *                   thing — and asking for an address, because somebody who
 *                   arrives early is the most interested visitor there is.
 *
 *   ONE PAGE      → `notFound`. The rest of the site is open, so a page she has
 *                   taken off is honestly not there. "Coming soon" on one page
 *                   inside a working site would be a promise with no date on
 *                   it, and she has taken it off precisely because she does not
 *                   want to talk about it yet.
 *
 * THE LINKS ALREADY IN SOMEBODY'S INBOX GO ON WORKING while the site is
 * hidden — a payment, a cancellation, an unsubscribe. See
 * `reachableWhileHidden`. A person who has paid for an hour and cannot cancel
 * it is a real problem; a person who cannot read the About page for a fortnight
 * is not.
 *
 * THE PATH COMES FROM A HEADER the middleware sets. A layout is not told which
 * route it wraps, and that is normally right — this is the one decision that
 * genuinely needs the path AND the database, and neither middleware (edge, no
 * database) nor a page (one route, not all of them) can make it alone.
 *
 * A SECTION'S PAGES GO WITH IT: hiding Workshops hides `/workshops/whatever`
 * too. Hiding the index and leaving its children reachable would take the way
 * in away while leaving the room, which is worse than either.
 */

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const hidden = await hiddenKeys();

  if (hidden.has(WHOLE_SITE) && !reachableWhileHidden(pathname)) {
    return <ComingSoon />;
  }

  const page = SITE_PAGES.find((entry) =>
    entry.href === "/"
      ? pathname === "/"
      : pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );
  if (page && hidden.has(page.key)) notFound();

  return <>{children}</>;
}
