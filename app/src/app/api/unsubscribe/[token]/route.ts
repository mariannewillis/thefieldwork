import { SITE_URL } from "@/content/site";
import { unsubscribeByToken } from "@/lib/newsletter/subscribers";

/**
 * The one-tap unsubscribe control Gmail and Apple Mail draw beside the sender.
 *
 * RFC 8058. A message carrying `List-Unsubscribe: <this url>` and
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click` is telling the mail
 * client it may POST here and expect the sender to honour it without asking
 * the reader anything further. Which is what this does.
 *
 * WHY IT IS WORTH HAVING AT ALL. Somebody who cannot find the way off a list
 * presses "report spam" instead, and a handful of those move a whole sending
 * domain into everybody's junk folder — including the booking confirmations,
 * which is the part that costs real money. Google's bulk-sender rules have
 * required these headers since February 2024. Making leaving easy is what keeps
 * the transactional mail arriving.
 *
 * A GET IS NOT AN UNSUBSCRIBE. Mail scanners fetch every URL in every message,
 * so a GET here would take people off who never asked; it redirects to the page
 * with the button on it instead. The POST is safe from the same problem because
 * no scanner posts.
 */

export async function POST(
  _request: Request,
  context: RouteContext<"/api/unsubscribe/[token]">,
) {
  const { token } = await context.params;
  const outcome = await unsubscribeByToken(token);

  // 200 either way, and deliberately: a mail client that gets a 404 here shows
  // the reader an error about a list they have just asked to leave. A token
  // this does not recognise is not their problem to solve.
  return new Response(null, { status: outcome.ok ? 200 : 200 });
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/unsubscribe/[token]">,
) {
  const { token } = await context.params;
  return Response.redirect(`${SITE_URL}/unsubscribe/${token}`, 302);
}
