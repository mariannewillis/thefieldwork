import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import DeleteDraft from "@/components/admin/DeleteDraft";
import { formatInstant } from "@/lib/format";
import { createNewsletter } from "./actions";

/**
 * Every letter — the one being written, and the ones already in inboxes.
 *
 * TWO LISTS, NOT ONE, and the split is the screen's whole argument: a draft is
 * something to carry on with and a sent letter is a record to read. They have
 * different verbs, so they do not belong in one table with a status column.
 *
 * NOTHING IS FABRICATED. The approved mockup carries "1 draft is waiting. 8
 * issues are already in people's inboxes" over seeded rows; the counts here are
 * the query's. An empty portal says it is empty.
 */

export const metadata: Metadata = {
  title: "Newsletter — The Field Work",
};

export const dynamic = "force-dynamic";

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

/** One of the two tabs, drawn as a link so the choice survives a reload. */
function Tab({
  href,
  label,
  count,
  current,
}: {
  href: string;
  label: string;
  count: number;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? "t border-b-2 border-gold pb-2 text-[19px] font-semibold text-plate-text"
          : "t border-b-2 border-transparent pb-2 text-[19px] text-plate-soft hover:text-plate-text"
      }
    >
      {label}{" "}
      <span className="fig font-mono text-[16px] tabular-nums">{count}</span>
    </Link>
  );
}

const HEAD =
  "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const letters = await prisma.newsletter.findMany({
    orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { blocks: true, attachments: true } },
      sends: { where: { outcome: "pending" }, select: { id: true } },
    },
  });

  const drafts = letters.filter((letter) => letter.status === "draft");
  const sent = letters.filter((letter) => letter.status === "sent");

  // Drafts is the default, because a draft is the one with something left to
  // do. A sent letter is a record, and she goes looking for those.
  const showingSent = show === "sent";
  const rows = showingSent ? sent : drafts;

  return (
    <section className="pt-8" aria-labelledby="letters-h">
      <p className={EYEBROW}>What you send</p>

      <h1
        id="letters-h"
        className="mt-3 max-w-[24ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {drafts.length === 0 && sent.length === 0 ? (
          <>
            Nothing written yet,
            <br />
            <span className="text-gold">and nothing sent.</span>
          </>
        ) : (
          <>
            {drafts.length === 0
              ? "No draft waiting"
              : drafts.length === 1
                ? "One draft waiting"
                : `${drafts.length} drafts waiting`}
            ,
            <br />
            <span className="text-gold">
              {sent.length === 0
                ? "nothing sent yet."
                : sent.length === 1
                  ? "one letter already out."
                  : `${sent.length} letters already out.`}
            </span>
          </>
        )}
      </h1>

      <form action={createNewsletter} className="mt-8">
        <button
          type="submit"
          className="t min-h-[56px] bg-gold px-9 py-4 text-[17px] font-semibold text-ink hover:bg-plate-text"
        >
          Write a new letter
        </button>
      </form>

      {/* TWO TABS AND A TABLE, where two grids of cards were (operator,
          2026-08-19). A letter is four facts — what it is called, what state it
          is in, how big it is and when it moved — and a card gave each of them
          a paragraph. Drafts is the default, because a draft is the one with
          something left to do. */}
      <nav
        aria-label="Which letters"
        className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-plate-rule/40"
      >
        <Tab
          href="/admin/newsletters"
          label="Drafts"
          count={drafts.length}
          current={!showingSent}
        />
        <Tab
          href="/admin/newsletters?show=sent"
          label="Sent"
          count={sent.length}
          current={showingSent}
        />
      </nav>

      {rows.length === 0 ? (
        <div className="pool on-pool mt-7 max-w-[62ch] px-7 py-7">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
            {showingSent ? "Nothing sent" : "No draft"}
          </p>
          <p className="mt-2 font-display text-[26px] leading-tight text-ink">
            {showingSent
              ? "Nothing has gone out yet."
              : "There is no letter waiting to be written."}
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
            {showingSent
              ? "A letter appears here the moment you send it, with who it went to and what happened to each one."
              : "Press “Write a new letter” above and it saves as a draft from the first word."}
          </p>
        </div>
      ) : (
        <div className="pool on-pool mt-7 px-6 py-2 sm:px-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">
                {showingSent
                  ? "Letters that have gone out, newest first. Pressing one opens the letter as it arrived and who it was sent to."
                  : "Letters still being written, most recently touched first. Pressing one opens the editor."}
              </caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  <th scope="col" className={HEAD}>
                    Subject
                  </th>
                  <th scope="col" className={HEAD}>
                    {showingSent ? "Sent to" : "What is in it"}
                  </th>
                  <th scope="col" className={HEAD}>
                    {showingSent ? "Sent" : "Last touched"}
                  </th>
                  <th scope="col" className={`${HEAD} pr-0`}>
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((letter) => (
                  <tr
                    key={letter.id}
                    className="border-t border-pool-rule hover:bg-gold/10"
                  >
                    <th
                      scope="row"
                      className="py-4 pr-5 text-left align-middle"
                    >
                      {/* THE WHOLE ROW IS NOT A BUTTON HERE, unlike the two
                          ledgers: a letter has a PAGE rather than a sheet — the
                          editor, or the record of who it went to — so the
                          subject is a link and the row is a row. */}
                      <Link
                        href={`/admin/newsletters/${letter.id}`}
                        className="t font-display text-[21px] leading-tight text-ink underline decoration-pool-rule/60 underline-offset-4 hover:decoration-ink"
                      >
                        {letter.subject}
                      </Link>
                    </th>

                    <td className="py-4 pr-5 align-middle text-[17px] text-ink-soft">
                      {showingSent ? (
                        <>
                          {letter.recipientCount}{" "}
                          {letter.recipientCount === 1 ? "person" : "people"}
                          {letter.sends.length > 0 &&
                            ` · ${letter.sends.length} still to go`}
                        </>
                      ) : letter._count.blocks === 0 ? (
                        "Nothing written into it yet"
                      ) : (
                        <>
                          {letter._count.blocks}{" "}
                          {letter._count.blocks === 1 ? "block" : "blocks"}
                          {letter._count.attachments > 0 &&
                            ` · ${letter._count.attachments} ${letter._count.attachments === 1 ? "file" : "files"}`}
                        </>
                      )}
                    </td>

                    <td className="py-4 pr-5 align-middle fig font-mono text-[15px] tabular-nums text-ink-soft">
                      {showingSent
                        ? letter.sentAt
                          ? formatInstant(letter.sentAt)
                          : ""
                        : formatInstant(letter.updatedAt)}
                    </td>

                    <td className="py-4 align-middle">
                      {/* DELETE ON A DRAFT ONLY, and the rule is the server's:
                          a letter that has gone out stays, because forty people
                          are holding a copy of what it said and a record that
                          can be removed after the fact is not a record. */}
                      {letter.status === "draft" ? (
                        <DeleteDraft id={letter.id} subject={letter.subject} />
                      ) : (
                        <span className="fig font-mono text-[15px] text-ink-soft">
                          kept
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drafts.length === 0 && sent.length === 0 && (
        <p className="mt-9 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
          Nothing has been written and nothing has gone out. The people on your
          list will hear from you the moment you write and send the first one.
        </p>
      )}
    </section>
  );
}
