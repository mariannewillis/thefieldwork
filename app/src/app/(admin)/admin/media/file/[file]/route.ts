import { MediaKind } from "@prisma/client";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { getAttachment } from "@/lib/newsletter/attachments";

/**
 * Serving a document to Marianne, and to nobody else.
 *
 * THE PRIVATE HALF OF PRIVATE-UNTIL-ATTACHED. Its public sibling is
 * `/newsletter-files/[file]`, which serves a document only once a letter carries
 * it — a link in somebody's inbox has no session behind it, so a document that
 * has gone out has to be reachable without one. Before that moment there is no
 * such link and no reason for the file to leave the building, so it is served
 * from here instead, where a session is required.
 *
 * TWO ROUTES RATHER THAN ONE WITH A BRANCH, deliberately. A single route that
 * decided per request whether to demand a session would be one `if` away from
 * serving everything to everybody, and that `if` would be the only thing between
 * her intake forms and the open internet. Two routes means the private one has no
 * code path that skips the check: `getSession` returns nothing, this returns 404.
 *
 * The middleware already turns away unauthenticated requests to `/admin/*` — this
 * is the second of the two gates, the same pair the admin layout and the
 * middleware form for pages, and for the same reason: neither alone is the whole
 * answer.
 *
 * §13's "served from a path that cannot execute" holds here as it does for the
 * other two: `[file]` is ONE path segment so it cannot contain a slash, the shape
 * is checked, and the row has to exist. `Content-Disposition: attachment` is the
 * load-bearing header — a PDF served inline runs its own JavaScript inside the
 * browser's viewer ON THIS ORIGIN, and this origin is the admin portal.
 */

/** What a library or letter upload's key can look like. Nothing else is served. */
const KEY = /^(?:newsletter-\d+|document)-[a-z0-9-]+(\.[a-z0-9]+)?$/;

export async function GET(
  _request: Request,
  context: RouteContext<"/admin/media/file/[file]">,
) {
  const missing = new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

  // 404 rather than a redirect to the login page. This is not a screen she can
  // be sent back to after signing in — it is bytes — and a 401 with a body would
  // tell an unauthenticated caller that the file exists.
  const session = await getSession();
  if (!session) return missing;

  const { file } = await context.params;
  if (!KEY.test(file)) return missing;

  const row = await prisma.mediaAsset.findUnique({
    where: { kind_ref: { kind: MediaKind.document, ref: file } },
  });
  if (!row) return missing;

  const bytes = await getAttachment(file);
  if (!bytes) return missing;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": row.contentType ?? "application/octet-stream",
      // Her filename, quoted, so it saves as what she called it. Quotes and
      // control characters are stripped rather than escaped — a filename is not
      // worth a parser, and the stored name has already been proved safe.
      "content-disposition": `attachment; filename="${(row.title ?? file).replace(/["\\r\n]/g, "")}"`,
      // NEVER cached. A document that is private now may be attached to a letter
      // in five minutes, and a shared cache holding a copy of an admin-only file
      // is the one way this route could leak something it refused to serve.
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
