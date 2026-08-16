import { CANONICAL_SITE_URL } from "@/content/site";
import { getSession } from "@/lib/auth/server";
import { sampleMessage } from "@/lib/email/samples";
import { loadWording } from "@/lib/email/templates";
import { isTemplateKey } from "@/lib/email/wording";

/**
 * The rendered message, served as a document so the screen can put it in an
 * iframe.
 *
 * WHY AN IFRAME AND NOT THE PAGE. An email is a whole document with its own
 * `<body>` background, its own type stack and its own 600px table; dropping
 * that markup into the portal would let the portal's Tailwind preflight reset
 * it and let its own colours leak in, and what she would be looking at would be
 * a version of the letter that nobody receives. A frame gives the message its
 * own document, which is what a mail client gives it.
 *
 * SIGNED IN ONLY. There is nothing secret in a sample message — the facts are
 * invented and every address ends `.invalid` — but this renders whatever
 * wording is currently saved, and her drafts are hers. A GET that anyone could
 * read would also be a way to fingerprint the site's templates.
 *
 * Nothing is written and nothing is sent. `sampleMessage` composes in memory
 * with the real composer and hands back a `Mail` that goes nowhere.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Not found", { status: 404 });

  const { key } = await params;
  if (!isTemplateKey(key)) return new Response("Not found", { status: 404 });

  const wording = await loadWording();
  const mail = sampleMessage(key, wording);

  /**
   * The pictures, fetched from HERE rather than from the live domain.
   *
   * A real message points its `<img>` at `https://thefieldwork.co.uk/...`,
   * which is right: an email has no document base, and an asset URL has to
   * still resolve months after the message was sent. In a preview that same
   * URL asks the live site for a file this deployment may not have published
   * yet, and the operator gets a broken mark and no way to tell whether the
   * masthead is wrong or merely undeployed. Only the ORIGIN is swapped, only
   * on `src`, and only here — the letter itself is untouched.
   */
  const forPreview = (html: string) =>
    html.replaceAll(`src="${CANONICAL_SITE_URL}/`, 'src="/');

  // Every one of the nine has an HTML half. If one somehow did not, showing the
  // plain text is the honest answer rather than a blank frame.
  const body = mail.html
    ? forPreview(mail.html)
    : `<pre style="white-space:pre-wrap;font:16px/1.5 monospace;padding:24px;">${mail.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cached: she saves a sentence and presses refresh, and a cached
      // frame would look exactly like the save having failed.
      "Cache-Control": "no-store",
      // The frame is same-origin and nothing else may embed it.
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Robots-Tag": "noindex",
    },
  });
}
