import "server-only";
import sharp from "sharp";
import { CANONICAL_SITE_URL, SITE_URL } from "@/content/site";
import {
  copy,
  plain,
  renderLetter,
  type Block,
  type Section,
} from "@/lib/email/render";
import { capitalise, runShape } from "@/lib/course-run";
import { listPublishedCourses } from "@/lib/courses";
import { formatDayShort, formatMoney } from "@/lib/format";
import { readMedia } from "@/lib/media";
import { listWorkshopLedgerRows } from "@/lib/workshops";
import { fileSizeWords } from "./attachments";

/**
 * A letter she wrote, turned into the thing that arrives.
 *
 * The five block kinds the editor offers are a strict subset of the vocabulary
 * `email/render.ts` already draws, so nothing here renders anything: it maps
 * her rows onto that vocabulary and hands the result to `renderLetter`. A
 * newsletter and a booking confirmation therefore come out of ONE renderer,
 * which is what stops the branded chrome drifting between the two.
 *
 * BOTH HALVES ARE BUILT HERE, side by side, from the same rows — the plain
 * text is not derived from the HTML and does not fall back to it. `sendMail`
 * refuses HTML without text (D-28), and a letter whose text part was a stripped
 * copy of its markup would read as debris in the clients that show it.
 *
 * WHAT IS PULLED AT SEND RATHER THAN AT COMPOSE. The offerings block quotes
 * live dates and prices, and this function is what runs at the moment of
 * sending — a letter written on the 1st and sent on the 4th must not name a
 * place that went on the 2nd. Everything else on the letter is her text and is
 * exactly what she saved.
 */

/**
 * How wide a picture is inside the letter.
 *
 * 600 minus the 44px gutter either side, which is what the approved newsletter
 * mockup uses (`docs/screens/email/_build.mjs`, the image BLOCK). The `.shot`
 * rule in the head takes it to 100% below 600px.
 */
const IMAGE_WIDTH = 512;

/** The eyebrow over the live dates, carried from the approved mockup. */
const OFFERINGS_EYEBROW = "What's open";

/** The line in the footer that says why this arrived. Marketing, so PECR. */
export const NEWSLETTER_WHY =
  "You are getting this because you asked for The Field Work's monthly letter. One page, once a month.";

/**
 * The address of a picture INSIDE A LETTER. Always the JPEG.
 *
 * The site serves AVIF first, WebP second and JPEG last, and every page picks
 * the best one the browser admits to understanding. AN EMAIL CANNOT DO THAT.
 * `<picture>` and `srcset` are stripped or ignored by Outlook for Windows,
 * which renders through Word; Outlook.com, Yahoo and several Android clients
 * decode neither AVIF nor WebP at all. A letter that pointed at the AVIF would
 * be a letter with a hole in it for a large share of the people it reached, and
 * the hole would be invisible to whoever sent it.
 *
 * So this is the one place in the app that builds a media URL by hand instead
 * of reaching for the site's preferred derivative, and it is a function rather
 * than an inline template so there is exactly one of it to be wrong. 1200 and
 * not 2400: the picture is drawn at 512 CSS pixels, 1200 covers a 2× screen
 * with room to spare, and the 2400 would add roughly a megabyte to a message
 * that is already carrying attachments.
 *
 * ABSOLUTE, and against the CANONICAL origin rather than SITE_URL — the same
 * rule the masthead follows in `render.ts`. An email has no document base, and
 * a picture has to still resolve from somebody's inbox in a year's time, so it
 * cannot point at whichever deployment happened to compose the letter.
 */
export function newsletterImageUrl(basename: string): string {
  return `${CANONICAL_SITE_URL}/media/${basename}-1200.jpg`;
}

/**
 * How tall that picture is, at 512 wide.
 *
 * A mail client needs `width` and `height` ON THE ELEMENT: several reserve the
 * box from the attributes before the image arrives, and one with no height
 * collapses the letter and then jolts it open when the picture loads. So the
 * JPEG is measured rather than guessed.
 *
 * A picture that cannot be measured falls back to 2:3 — the shape of the
 * derivative pipeline's own landscape output — rather than refusing to send.
 * The letter is the thing that matters; a reserved box being fifteen pixels
 * out is not worth failing a send over.
 */
async function imageHeight(basename: string): Promise<number> {
  try {
    const file = await readMedia(`${basename}-1200.jpg`);
    if (!file) return Math.round((IMAGE_WIDTH * 2) / 3);
    const { width, height } = await sharp(file.bytes).metadata();
    if (!width || !height) return Math.round((IMAGE_WIDTH * 2) / 3);
    return Math.round((IMAGE_WIDTH * height) / width);
  } catch {
    return Math.round((IMAGE_WIDTH * 2) / 3);
  }
}

/** One row of the "what's open" block, as the renderer wants it. */
export type Offering = {
  when: string;
  price: string;
  name: string;
  detail: string;
  href: string;
};

/**
 * What is open, read at the moment of sending.
 *
 * The same two queries the home page's dates block runs and the same three
 * columns — a workshop led by its date, a course by the shape of its run. A
 * course whose run has finished is not "open" and is left out, exactly as the
 * home page leaves it out.
 *
 * Services are NOT here. They have no date and no run: a session is asked for
 * rather than joined, and a row reading "Aura healing · £75" under a heading
 * saying what's open would be advertising availability this cannot see.
 */
export async function liveOfferings(limit: number | null): Promise<Offering[]> {
  const [workshops, courses] = await Promise.all([
    listWorkshopLedgerRows(),
    listPublishedCourses(),
  ]);

  const rows: { at: number; row: Offering }[] = [];

  for (const workshop of workshops) {
    rows.push({
      at: workshop.date.getTime(),
      row: {
        when: formatDayShort(workshop.date),
        price: formatMoney(workshop.priceGBP),
        name: workshop.name,
        detail: [
          `${workshop.startTime}${workshop.endTime ? `–${workshop.endTime}` : ""}`,
          workshop.venueName,
          `${workshop.capacity} places`,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `${CANONICAL_SITE_URL}/workshops/${workshop.slug}`,
      },
    });
  }

  for (const course of courses) {
    const run = runShape(course.sessions);
    if (!run || run.finished) continue;
    rows.push({
      at: run.first.getTime(),
      row: {
        when: run.span,
        price: formatMoney(course.priceGBP),
        name: course.name,
        detail: [
          capitalise(run.words),
          run.hours,
          course.venueName,
          `${course.capacity} places`,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `${CANONICAL_SITE_URL}/courses/${course.slug}`,
      },
    });
  }

  // Soonest first, which is the order somebody reads a list of dates in.
  rows.sort((a, b) => a.at - b.at);
  const open = rows.map((entry) => entry.row);
  return limit && limit > 0 ? open.slice(0, limit) : open;
}

/** A block as the database holds it — the five kinds, all columns nullable. */
export type ComposableBlock = {
  kind: "heading" | "paragraph" | "image" | "offerings" | "button";
  text: string | null;
  imageBasename: string | null;
  caption: string | null;
  alt: string | null;
  href: string | null;
  count: number | null;
};

/** An attachment as the database holds it. */
export type ComposableAttachment = {
  filename: string;
  storedAs: string;
  bytes: number;
  delivery: "attached" | "linked";
  note: string | null;
};

/**
 * Where a file put on a letter is fetched from.
 *
 * CANONICAL, for the same reason a picture is: the link outlives the send.
 * `SITE_URL` is used only when a preview needs to reach this deployment.
 */
export function attachmentUrl(storedAs: string, origin = CANONICAL_SITE_URL) {
  return `${origin}/newsletter-files/${storedAs}`;
}

/** Where the unsubscribe link in the letter points, for one person's token. */
export function unsubscribeUrl(token: string, origin = CANONICAL_SITE_URL) {
  return `${origin}/unsubscribe/${token}`;
}

/**
 * Where the `List-Unsubscribe` HEADER points — a different URL from the one in
 * the letter, on purpose.
 *
 * The header's URL is one a mail client POSTs to (RFC 8058) and must act on
 * without asking anything further. The letter's URL is one a person opens, and
 * must NOT act on a GET, because mail scanners fetch every link in every
 * message. Two different obligations, so two different addresses.
 */
export function oneClickUnsubscribeUrl(
  token: string,
  origin = CANONICAL_SITE_URL,
) {
  return `${origin}/api/unsubscribe/${token}`;
}

/**
 * A button's destination, made absolute.
 *
 * She may type `/courses` — the address as it appears on the site — and an
 * email has no document base to resolve it against, so a root-relative href in
 * a letter is a dead link in every client there is. Anything already absolute
 * is left exactly as she wrote it.
 */
function absolute(href: string, origin: string): string {
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

export type Composed = { subject: string; text: string; html: string };

/**
 * The letter, both halves.
 *
 * `origin` is CANONICAL in a real send and this deployment in a preview — the
 * same split `email-templates/[key]/preview` makes, and for the same reason: a
 * preview that pointed at the live domain would show a mark and a document
 * this deployment may not have published yet.
 */
export async function composeNewsletter(input: {
  subject: string;
  preheader: string;
  mastheadLabel: string;
  blocks: ComposableBlock[];
  attachments: ComposableAttachment[];
  /** Null on a test copy — there is nothing for her to unsubscribe from. */
  unsubscribe: string | null;
  origin?: string;
}): Promise<Composed> {
  const origin = input.origin ?? CANONICAL_SITE_URL;

  const body: Block[] = [];
  const lines: string[] = [];

  for (const block of input.blocks) {
    switch (block.kind) {
      case "heading": {
        const text = (block.text ?? "").trim();
        if (!text) break;
        body.push({ kind: "headline", text: plain(text), size: 34 });
        lines.push(text, "");
        break;
      }

      case "paragraph": {
        const text = (block.text ?? "").trim();
        if (!text) break;
        // `plain` and not `copy`: the asterisk transform is for sentences
        // written in this repository. A run of asterisks in HER prose is a run
        // of asterisks, exactly as it is on the nine templates (D-28).
        body.push({ kind: "paragraph", text: plain(text) });
        lines.push(text, "");
        break;
      }

      case "image": {
        const basename = (block.imageBasename ?? "").trim();
        if (!basename) break;
        const src = newsletterImageUrl(basename);
        body.push({
          kind: "image",
          src,
          alt: block.alt ?? "",
          width: IMAGE_WIDTH,
          height: await imageHeight(basename),
          ...(block.caption?.trim() ? { caption: block.caption.trim() } : {}),
        });
        // The picture's own description, in the half that cannot show it. A
        // reader on plain text gets the sentence somebody who cannot see it
        // would get, which is what the alt was written to be.
        if (block.alt?.trim()) lines.push(`[${block.alt.trim()}]`);
        if (block.caption?.trim()) lines.push(block.caption.trim());
        lines.push("");
        break;
      }

      case "offerings": {
        const items = await liveOfferings(block.count ?? null);
        if (items.length === 0) break;
        body.push({ kind: "eyebrow", text: OFFERINGS_EYEBROW });
        body.push({ kind: "offerings", items });
        lines.push(OFFERINGS_EYEBROW.toUpperCase(), "");
        for (const item of items) {
          lines.push(
            `${item.when} · ${item.price} · ${item.name}`,
            item.detail,
            item.href,
            "",
          );
        }
        break;
      }

      case "button": {
        const label = (block.text ?? "").trim();
        const href = (block.href ?? "").trim();
        if (!label || !href) break;
        const target = absolute(href, origin);
        body.push({ kind: "button", label, href: target });
        lines.push(`${label}: ${target}`, "");
        break;
      }
    }
  }

  const sections: Section[] = [];
  if (body.length > 0) sections.push({ ground: "pool", blocks: body });

  /**
   * The files, on the plate, as one aside at the end.
   *
   * ONE REGION AND NOT ONE PER FILE, per the approved mockup: three separate
   * plum plates in a row would read as three beats of the letter rather than
   * as the things that came with it.
   *
   * A file's line says how it travels, in words, because the two are different
   * to the person receiving it — one is already in the message and one needs a
   * connection to fetch.
   */
  if (input.attachments.length > 0) {
    const files: Block[] = [{ kind: "eyebrow", text: "Also with this letter" }];
    lines.push("ALSO WITH THIS LETTER", "");

    input.attachments.forEach((file, index) => {
      const travels =
        file.delivery === "attached"
          ? `Attached to this message · ${fileSizeWords(file.bytes)}`
          : `${fileSizeWords(file.bytes)} — too big to attach, so it is a download`;

      /**
       * Her sentence, then how it travels.
       *
       * Joined with a full stop ONLY when hers has not ended in one already.
       * She writes "A PDF, four pages." because that is how a sentence ends,
       * and a join that adds another produces "four pages.. Attached", which
       * is the kind of thing that reads as the site being careless with her
       * words rather than as a stray character.
       */
      const hers = file.note?.trim() ?? "";
      const note = hers
        ? `${hers}${/[.!?…]$/.test(hers) ? "" : "."} ${travels}`
        : travels;
      const href = attachmentUrl(file.storedAs, origin);

      files.push({
        kind: "attachment",
        title: file.filename,
        note,
        href,
        linkText:
          file.delivery === "attached" ? "Open it here instead" : "Download it",
      });
      if (index < input.attachments.length - 1) files.push({ kind: "rule" });

      lines.push(file.filename, note, href, "");
    });

    sections.push({ ground: "plate", raised: true, blocks: files });
  }

  const text = [
    input.preheader,
    "",
    ...lines,
    "—",
    NEWSLETTER_WHY,
    ...(input.unsubscribe
      ? ["", `To stop receiving it: ${input.unsubscribe}`]
      : []),
    "",
    "The Field Work · Frome, Somerset",
  ]
    .join("\n")
    // Three or more blank lines collapse to one. Blocks each leave a blank
    // line behind them and an empty one leaves nothing, so without this a
    // dropped block prints as a hole in the plain-text half.
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    subject: input.subject,
    text,
    html: renderLetter({
      subject: input.subject,
      preheader: input.preheader,
      mastheadLabel: input.mastheadLabel,
      sections:
        sections.length > 0
          ? sections
          : // A letter with nothing in it still has to render, because the
            // preview is how she finds out it is empty.
            [
              {
                ground: "pool",
                blocks: [
                  {
                    kind: "note",
                    text: copy("Nothing has been written into this one yet."),
                  },
                ],
              },
            ],
      why: NEWSLETTER_WHY,
      unsubscribe: input.unsubscribe,
    }),
  };
}

/** The preview origin — this deployment, so an unpublished picture still shows. */
export const PREVIEW_ORIGIN = SITE_URL;
