import { calendarFeed } from "@/lib/calendar-feed";
import { prisma } from "@/lib/db";

/**
 * The address her own calendar subscribes to.
 *
 * THE TOKEN IS THE WHOLE OF THE AUTHENTICATION, and that is what a subscription
 * feed is: Outlook and Google fetch it on a schedule of their own, with no
 * session, no cookie and nobody sitting in front of it. Anything that could
 * prompt for a password would simply never be fetched.
 *
 * SO WHAT IT CAN DO IS THE SECURITY. It is a GET that writes nothing and reads
 * three tables. It cannot reach the portal, cannot see a card detail, and cannot
 * change a single row. If the address escapes, what escapes is her timetable —
 * which is bad and is why it is 32 random bytes and replaceable from the
 * Calendar screen, but it is not an account.
 *
 * IT IS COMPARED IN FULL AND ANSWERS ONE WAY. A wrong token, a retired token and
 * a token belonging to nobody all get the same 404 as an address that never
 * existed. Anything else would let somebody sit here and learn which tokens are
 * real.
 *
 * `.ics` IS PART OF THE ADDRESS rather than a header trick. Outlook decides what
 * a subscription is partly from the extension, and pasting an address with no
 * file ending into its "Subscribe from web" box is the single most common way
 * this goes quietly wrong.
 */

// Read on every fetch. A cached feed is a diary that is hours out of date on top
// of the hours the providers already add.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // The extension is part of the address, so it is taken off before the lookup.
  const secret = token.replace(/\.ics$/i, "");

  // Short values cannot be one of ours and are not worth a query — the same
  // guard `findBookingByToken` makes on the cancellation link.
  if (!secret || secret.length < 20) return notThere();

  const owner = await prisma.adminUser.findUnique({
    where: { calendarFeedToken: secret },
    select: { id: true },
  });
  if (!owner) return notThere();

  return new Response(await calendarFeed(), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      // Named so that a client saving a copy produces a file she recognises.
      "content-disposition": 'inline; filename="the-field-work.ics"',
      // Nothing between here and her calendar may keep a copy: the point of a
      // subscription is that it is current, and a proxy holding yesterday's is
      // the failure this whole feed exists to avoid.
      "cache-control": "no-store, max-age=0",
      // It is her diary. It must not appear in a search result, whatever else
      // happens — the same rule the admin layout applies to every portal page.
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

/** One answer for every kind of wrong token. */
function notThere() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
