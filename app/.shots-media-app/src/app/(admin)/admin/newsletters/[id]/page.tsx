import { MediaKind } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDraft from "@/components/admin/DeleteDraft";
import { DraftGuard, PreviewLink } from "@/components/admin/DraftGuard";
import NewsletterEditor, {
  type EditableAttachment,
  type EditableBlock,
  type LibraryDocument,
} from "@/components/admin/NewsletterEditor";
import NewsletterSend, {
  type Recipient,
} from "@/components/admin/NewsletterSend";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { formatDayShort, formatInstant } from "@/lib/format";
import { listMediaBasenames } from "@/lib/media";
import { readLibrary } from "@/lib/media/library";
import { fileSizeWords } from "@/lib/newsletter/attachments";
import { confirmedRecipients } from "@/lib/newsletter/subscribers";
import { duplicateNewsletter } from "../actions";

/**
 * One letter — either the sheet it is written on, or the record of where it
 * went.
 *
 * THE SAME URL FOR BOTH, and the status decides which one it draws. A sent
 * letter that redirected somewhere else would break every link in the list and
 * would say, wrongly, that the two are different objects: it is one letter, and
 * what changed is that it is no longer hers to alter.
 *
 * THE PREVIEW IS THE REAL COMPOSER. `[id]/preview` renders through
 * `composeNewsletter` — the same function the send calls — so a change that
 * broke a letter breaks the preview in the same way at the same moment. It is
 * in a frame for the reason the email-templates preview is: an email is a whole
 * document with its own body background and its own 600px table, and dropping
 * that into the portal would let the portal's own CSS reset it.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const letter = await prisma.newsletter.findUnique({
    where: { id: Number(id) || 0 },
    select: { subject: true },
  });
  return {
    title: letter ? `${letter.subject} — The Field Work` : "Not found",
  };
}

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();

  const letter = await prisma.newsletter.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { id: "asc" } },
    },
  });
  if (!letter) notFound();

  const session = await getSession();

  const [media, library, people, sends] = await Promise.all([
    listMediaBasenames(),
    // Her whole document library, for the "pick from your documents" modal.
    // Read even on a sent letter, which costs one small query and keeps the
    // shape of this page's data the same in both branches.
    readLibrary(MediaKind.document),
    letter.status === "draft" ? confirmedRecipients() : Promise.resolve([]),
    letter.status === "sent"
      ? prisma.newsletterSend.findMany({
          where: { newsletterId: id },
          orderBy: [{ outcome: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  /**
   * Her documents, as the picker needs them.
   *
   * `onALetter` is what the picker prints as "anybody with the link" — it is
   * derived from whether anything already references the file, never stored, so
   * it cannot drift from what /newsletter-files actually serves.
   */
  const documents: LibraryDocument[] = library.map((document) => ({
    ref: document.ref,
    title: document.title,
    contentType: document.contentType,
    bytes: document.bytes,
    onALetter: document.reachableWithoutASession,
  }));

  const blocks: EditableBlock[] = letter.blocks.map((block) => ({
    kind: block.kind,
    text: block.text ?? "",
    imageBasename: block.imageBasename ?? "",
    caption: block.caption ?? "",
    alt: block.alt ?? "",
    href: block.href ?? "",
    count: block.count === null ? "" : String(block.count),
  }));

  const attachments: EditableAttachment[] = letter.attachments.map((file) => ({
    id: file.id,
    filename: file.filename,
    size: fileSizeWords(file.bytes),
    delivery: file.delivery,
    note: file.note ?? "",
  }));

  const recipients: Recipient[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    since: person.confirmedAt
      ? `confirmed ${formatDayShort(person.confirmedAt)}`
      : "confirmed",
  }));

  const pending = sends.filter((row) => row.outcome === "pending").length;
  const delivered = sends.filter((row) => row.outcome === "delivered").length;
  const failed = sends.filter((row) => row.outcome === "failed");

  return (
    <section className="pt-8" aria-labelledby="letter-h">
      <p className={EYEBROW}>
        <Link
          href="/admin/newsletters"
          className="t underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Newsletter
        </Link>
        {" · "}
        {letter.status === "draft" ? "draft" : "sent"}
      </p>

      <h1
        id="letter-h"
        className="mt-3 max-w-[26ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {letter.subject}
      </h1>

      {letter.status === "draft" ? (
        // The sheet, the preview and the send share one piece of state: whether
        // what is on the screen is what is stored. See `DraftGuard` for the
        // empty letters that made it necessary.
        <DraftGuard>
          <p className="mt-5 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
            Nobody has seen this. It saves when you press save and goes nowhere
            until you send it.
          </p>

          <PreviewLink
            id={letter.id}
            label="See the letter as it will arrive"
          />

          <NewsletterEditor
            newsletter={{
              id: letter.id,
              subject: letter.subject,
              preheader: letter.preheader,
              mastheadLabel: letter.mastheadLabel,
              backgroundBasename: letter.backgroundBasename ?? "",
            }}
            blocks={blocks}
            attachments={attachments}
            documents={documents}
            media={media}
          />

          <NewsletterSend
            newsletterId={letter.id}
            recipients={recipients}
            testTo={session?.email ?? null}
            pending={0}
            sent={false}
            written={letter.blocks.length}
          />

          <div className="mt-9 border-t border-plate-rule/40 pt-7">
            <DeleteDraft id={letter.id} subject={letter.subject} />
          </div>
        </DraftGuard>
      ) : (
        <>
          <p className="mt-5 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
            Sent {letter.sentAt ? formatInstant(letter.sentAt) : ""} to{" "}
            {letter.recipientCount}{" "}
            {letter.recipientCount === 1 ? "person" : "people"}. This letter is
            closed &mdash; what they are holding cannot be changed, which is
            what makes it a record.
          </p>

          <p className="mt-4">
            <a
              href={`/admin/newsletters/${letter.id}/preview`}
              target="_blank"
              rel="noreferrer"
              className="t text-[17px] font-medium text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
            >
              Read what went out
            </a>
          </p>

          {pending > 0 && (
            <NewsletterSend
              newsletterId={letter.id}
              recipients={[]}
              testTo={null}
              pending={pending}
              sent
              written={letter.blocks.length}
            />
          )}

          <div className="pool on-pool mt-9 px-7 py-8 sm:px-9">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
              Who has it
            </p>
            <h2 className="mt-3 font-display text-[30px] leading-tight text-ink">
              {delivered} of {sends.length} delivered
              {failed.length > 0 && `, ${failed.length} refused`}
              {pending > 0 && `, ${pending} still to go`}.
            </h2>

            {failed.length > 0 && (
              <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink">
                A refusal is the mail provider saying no &mdash; usually an
                address that no longer exists. It is worth taking those off the
                list on Subscribers; a list that keeps sending to dead addresses
                is a list that ends up in junk folders.
              </p>
            )}

            <ul className="mt-6 flex list-none flex-col gap-0 border-t border-pool-rule/40 p-0">
              {sends.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-pool-rule/25 py-3"
                >
                  <span className="fig font-mono text-[17px] text-ink">
                    {row.email}
                  </span>
                  <span className="text-[15px] text-ink-soft">
                    {row.outcome === "delivered" &&
                      `sent ${row.sentAt ? formatInstant(row.sentAt) : ""}`}
                    {row.outcome === "pending" && "not sent yet"}
                    {row.outcome === "failed" &&
                      `refused — ${row.error ?? "no reason given"}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <form action={duplicateNewsletter} className="mt-9">
            <input type="hidden" name="id" value={letter.id} />
            <button
              type="submit"
              className="t min-h-[56px] bg-gold px-9 py-4 text-[17px] font-semibold text-ink hover:bg-plate-text"
            >
              Write the next one from this
            </button>
          </form>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-plate-soft">
            Every block copied into a fresh draft, which is what &ldquo;edit
            last month&rsquo;s&rdquo; actually means. The files are not copied
            &mdash; attach them again if this one needs them.
          </p>
        </>
      )}
    </section>
  );
}
