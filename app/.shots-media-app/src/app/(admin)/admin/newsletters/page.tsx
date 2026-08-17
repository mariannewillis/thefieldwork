import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
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

export default async function Page() {
  const letters = await prisma.newsletter.findMany({
    orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { blocks: true, attachments: true } },
      sends: { where: { outcome: "pending" }, select: { id: true } },
    },
  });

  const drafts = letters.filter((letter) => letter.status === "draft");
  const sent = letters.filter((letter) => letter.status === "sent");

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

      <p className="mt-6 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
        A letter saves as a draft the moment you start writing and goes to
        nobody until you choose to send it. Once it has gone it closes: what
        people are holding cannot be changed afterwards, so a letter you want to
        write again is duplicated into a new draft rather than edited.
      </p>

      <form action={createNewsletter} className="mt-8">
        <button
          type="submit"
          className="t min-h-[56px] bg-gold px-9 py-4 text-[17px] font-semibold text-ink hover:bg-plate-text"
        >
          Write a new letter
        </button>
      </form>

      {/* ── drafts ───────────────────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <div className="mt-11">
          <p className="fig font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-plate-text">
            Drafts
          </p>
          <ul className="mt-5 grid list-none gap-px border border-plate-rule/40 bg-plate-rule/40 p-0 lg:grid-cols-2">
            {drafts.map((letter) => (
              <li key={letter.id} className="pool on-pool p-6">
                <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
                  Draft &middot; last touched {formatInstant(letter.updatedAt)}
                </p>
                <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
                  <Link
                    href={`/admin/newsletters/${letter.id}`}
                    className="t underline decoration-pool-rule/60 underline-offset-[6px] hover:decoration-ink"
                  >
                    {letter.subject}
                  </Link>
                </h2>
                <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
                  {letter._count.blocks === 0
                    ? "Nothing written into it yet."
                    : `${letter._count.blocks} ${letter._count.blocks === 1 ? "block" : "blocks"} written`}
                  {letter._count.attachments > 0 &&
                    `, ${letter._count.attachments} ${letter._count.attachments === 1 ? "file" : "files"} attached`}
                  . Nobody has seen this &mdash; not even a test has gone out
                  unless you sent one.
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── sent ─────────────────────────────────────────────────────────── */}
      {sent.length > 0 && (
        <div className="mt-11">
          <p className="fig font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-plate-text">
            Sent &middot; newest first &middot; none of them can be changed now
          </p>
          <ul className="mt-5 grid list-none gap-px border border-plate-rule/40 bg-plate-rule/40 p-0 lg:grid-cols-2">
            {sent.map((letter) => (
              <li key={letter.id} className="pool on-pool p-6">
                <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                  Sent {letter.sentAt ? formatInstant(letter.sentAt) : ""}
                </p>
                <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
                  <Link
                    href={`/admin/newsletters/${letter.id}`}
                    className="t underline decoration-pool-rule/60 underline-offset-[6px] hover:decoration-ink"
                  >
                    {letter.subject}
                  </Link>
                </h2>
                <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
                  Sent to {letter.recipientCount}{" "}
                  {letter.recipientCount === 1 ? "person" : "people"}
                  {letter.sends.length > 0 &&
                    ` · ${letter.sends.length} still waiting to go`}
                  .
                </p>
              </li>
            ))}
          </ul>
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
