import { readMedia } from "@/lib/media";

/**
 * Serving a picture.
 *
 * The photographs that ship with the code sit in `public/media` and Next
 * serves them as static files without this ever running. What Marianne adds
 * may not be on this machine's disk at all — on Replit it is in object storage
 * — so `/media/<file>` needs a handler behind the static one for the requests
 * the static one cannot answer. Both addresses are the same, which is the
 * point: no page has to know where a picture is kept.
 *
 * §13's "served from a path that cannot execute" is structural here rather
 * than configured. `[file]` is ONE path segment, so it cannot contain a
 * slash; `readMedia` then refuses anything that is not `<basename>-<width>.
 * <ext>` with the basename in lowercase letters, digits and hyphens. There is
 * no string a caller can send that reaches anything but an image we wrote,
 * and the response says exactly which of three image types it is.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/media/[file]">,
) {
  const { file } = await context.params;
  const media = await readMedia(file);

  if (!media) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "content-type": media.contentType,
      // A derivative never changes: a new picture gets a new basename, and
      // replacing one replaces the workshop's reference rather than the file.
      "cache-control": "public, max-age=31536000, immutable",
      // Nothing here is a document, and a browser must not decide otherwise.
      "x-content-type-options": "nosniff",
    },
  });
}
