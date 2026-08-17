import { prisma } from "@/lib/db";
import { getAttachment } from "@/lib/newsletter/attachments";

/**
 * Serving a file that came with a letter.
 *
 * PUBLIC, and it has to be: the link is in somebody's inbox and there is no
 * session behind it. What stands in for a session is that a key is only ever
 * minted by an upload — `newsletter-<id>-<slug>` — and this refuses anything
 * that is not a row in `NewsletterAttachment`. Nothing here is guessable in
 * the sense a password is, and nothing here is private in that sense either:
 * these are handouts she chose to send to a mailing list.
 *
 * §13's "served from a path that cannot execute" is structural rather than
 * configured, exactly as it is for pictures. `[file]` is ONE path segment so it
 * cannot contain a slash; the shape is checked; and the row has to exist. There
 * is no string a caller can send that reaches anything but a file we wrote.
 *
 * ALWAYS `Content-Disposition: attachment`, and that is the load-bearing
 * header. A PDF served inline runs its own JavaScript inside the browser's
 * viewer, ON THIS ORIGIN — so a document served inline is a document with an
 * origin's worth of trust. Downloaded, it is a file on somebody's disk. With
 * `nosniff` beside it there is no path from an upload to a script running on
 * thefieldwork.co.uk.
 */

/**
 * What an upload's key can look like. `attachmentKey` and `documentKey` mint
 * exactly these two shapes and nothing else does.
 *
 * TWO PREFIXES, because there are now two ways a document can arrive: uploaded
 * onto one letter (`newsletter-<id>-…`, which is every file that existed before
 * the media library) or uploaded into the library and picked afterwards
 * (`document-…`, which belongs to her rather than to a letter).
 *
 * This is a SHAPE check and never the security property. What actually decides
 * whether these bytes may leave the building is the row lookup below: a key of
 * either shape with no attachment row behind it is a 404, which is what makes a
 * library document private until she puts it on a letter.
 */
const KEY = /^(?:newsletter-\d+|document)-[a-z0-9-]+(\.[a-z0-9]+)?$/;

export async function GET(
  _request: Request,
  context: RouteContext<"/newsletter-files/[file]">,
) {
  const { file } = await context.params;

  const missing = new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

  if (!KEY.test(file)) return missing;

  // `findFirst`, not `findUnique`, since the media library landed — and the
  // "first" is not a guess about which letter.
  //
  // `storedAs` IS the file. It is the key in the store, so every row carrying it
  // names the same bytes, the same sniffed content type and the same filename;
  // what differs between two rows is only WHICH LETTER carried it. This route
  // serves a file, not a letter, so any row will do.
  //
  // And the existence of a row is exactly the property being checked. A
  // document is admin-only until it goes on a letter and reachable from that
  // moment on, because a link in somebody's inbox has no session behind it. So
  // "is there at least one attachment row for this key" is the whole public/
  // private rule, asked here as a query rather than read off a column that could
  // drift out of step with it. See lib/media/library.ts::documentIsPublic, which
  // asks the SAME question for the screen that has to say which state it is in.
  const row = await prisma.newsletterAttachment.findFirst({
    where: { storedAs: file },
  });
  if (!row) return missing;

  const bytes = await getAttachment(file);
  if (!bytes) return missing;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": row.contentType,
      // Her filename, quoted, so it saves as what she called it. Quotes and
      // backslashes are stripped rather than escaped — a filename is not worth
      // a parser, and `attachmentKey` has already proved the stored name safe.
      "content-disposition": `attachment; filename="${row.filename.replace(/["\\\r\n]/g, "")}"`,
      // A letter's file never changes: re-uploading writes a new letter's key.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
