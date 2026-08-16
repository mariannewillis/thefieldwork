import { CANONICAL_SITE_URL, SITE_URL } from "@/content/site";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  composeNewsletter,
  type ComposableAttachment,
  type ComposableBlock,
} from "@/lib/newsletter/compose";

/**
 * The letter, rendered as a document so the screen can put it in a frame.
 *
 * NOT A SECOND RENDERING PATH. It composes through `composeNewsletter`, which
 * is the function the send calls — so a change that broke a letter breaks this
 * in the same way at the same moment. The alternative, a preview that
 * approximates the message, is the one kind of preview that is worse than none:
 * it tells you a letter is fine that is not.
 *
 * SIGNED IN ONLY. A draft is hers until she sends it, and a GET anybody could
 * read would publish next month's letter a fortnight early.
 *
 * The pictures are fetched from HERE rather than from the live domain — the
 * same swap `email-templates/[key]/preview` makes, and for the same reason: a
 * real letter points at `https://thefieldwork.co.uk/...` because it has to
 * still resolve in a year, and in a preview that asks the live site for a file
 * this deployment may not have published yet.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/admin/newsletters/[id]/preview">,
) {
  const session = await getSession();
  if (!session) return new Response("Not found", { status: 404 });

  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const letter = await prisma.newsletter.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { id: "asc" } },
    },
  });
  if (!letter) return new Response("Not found", { status: 404 });

  const composed = await composeNewsletter({
    subject: letter.subject,
    preheader: letter.preheader,
    mastheadLabel: letter.mastheadLabel,
    blocks: letter.blocks as ComposableBlock[],
    attachments: letter.attachments as ComposableAttachment[],
    // A real letter carries one person's token. There is no person here, so
    // the link goes to the page that explains what unsubscribing does — a
    // preview that carried a live token would be a preview that could take
    // somebody off the list.
    unsubscribe: `${SITE_URL}/unsubscribe`,
    origin: SITE_URL,
  });

  const forPreview = (html: string) =>
    html.replaceAll(`src="${CANONICAL_SITE_URL}/`, 'src="/');

  return new Response(forPreview(composed.html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cached: she saves a paragraph and presses refresh, and a cached
      // frame would look exactly like the save having failed.
      "Cache-Control": "no-store",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Robots-Tag": "noindex",
    },
  });
}
