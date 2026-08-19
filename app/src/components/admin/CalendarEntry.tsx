"use client";

import Link from "next/link";
import { useState } from "react";
import { UnblockButton } from "@/components/admin/BlockForm";
import DetailSheet from "@/components/admin/DetailSheet";

/**
 * ONE THING IN A DAY — with its time on it, and everything else behind a press.
 *
 * THE GRID DID NOT SAY WHEN (operator, 2026-08-19). A cell listed what was on
 * that day and nothing else, so "Tuesday has three things in it" was legible
 * and "am I free at two" was not — which is the question a calendar is opened
 * to answer. The time now leads every entry in both places.
 *
 * ONE COMPONENT FOR THE GRID AND THE LIST, because they draw the same spans and
 * had already drifted once: the list showed times and the grid did not. Two
 * renderings of one fact is how a screen starts disagreeing with itself.
 *
 * A BUTTON RATHER THAN A LINK. Every entry used to navigate straight to its
 * page, which is a long way to go to find out that a booking is at ten. The
 * sheet answers that in place and carries the link for when she does want the
 * page — nothing is lost, and the common case stops costing a page load.
 */

export type CalendarEntryData = {
  /** `workshop-12` — unique within a day. */
  key: string;
  kind: "workshop" | "course" | "session" | "request" | "block";
  /** What it is, in her words. */
  label: string;
  /** "10:00–16:30", or "all day". */
  clock: string;
  /** The same, short enough for a cell: "10:00" or "all day". */
  clockShort: string;
  /** "A workshop" · "A day of a course" — the kind, in words. */
  kindWords: string;
  /** "1 hour 30 minutes". Null on a whole-day entry, which has no length. */
  howLong: string | null;
  /** The day it is on, written out. */
  dayWords: string;
  /** Its page in the portal, when it has one. */
  href?: string;
  /** `block` only — the row id, so it can be lifted from the sheet. */
  blockId?: number;
};

export default function CalendarEntry({
  entry,
  tone,
  variant,
}: {
  entry: CalendarEntryData;
  /** The kind's own left-hand rule, passed in so the palette stays on the page. */
  tone: string;
  variant: "grid" | "list";
}) {
  const [open, setOpen] = useState(false);

  return (
    <li
      className={`border-l-4 ${variant === "grid" ? "pl-2" : "pl-4"} ${tone}`}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${entry.label}, ${entry.clock}, ${entry.dayWords}. Open the details.`}
        className={
          variant === "grid"
            ? "t block w-full text-left text-[14px] leading-snug text-ink hover:underline"
            : "t block w-full text-left"
        }
      >
        {variant === "grid" ? (
          <>
            {/* THE TIME FIRST, and in the figures face, because it is what the
                eye is looking for in a cell of three or four of these. */}
            <span className="fig font-mono tabular-nums text-ink-soft">
              {entry.clockShort}
            </span>{" "}
            {entry.label}
          </>
        ) : (
          <>
            <span className="block fig font-mono text-[15px] tabular-nums text-ink-soft">
              {entry.clock} &middot; {entry.kindWords}
            </span>
            <span className="block text-[19px] leading-snug text-ink underline decoration-pool-rule/50 underline-offset-4 hover:decoration-ink">
              {entry.label}
            </span>
          </>
        )}
      </button>

      <DetailSheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={entry.kindWords}
        title={entry.label}
        subtitle={entry.dayWords}
        facts={[
          { label: "When", value: entry.clock },
          { label: "How long", value: entry.howLong },
          { label: "What it is", value: entry.kindWords },
          {
            label: "Its page",
            value: entry.href ? (
              <Link
                href={entry.href}
                className="t text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                Open it
              </Link>
            ) : null,
          },
        ]}
      >
        {/* A block is the one entry with something to DO from here: it is hers,
            it is never published, and lifting it is the whole of what she can
            do to it. The other four are edited on their own pages. */}
        {entry.kind === "block" && entry.blockId !== undefined ? (
          <UnblockButton id={entry.blockId} reason={entry.label} />
        ) : (
          <p className="text-[17px] leading-relaxed text-ink-soft">
            {entry.href
              ? "Everything about this one is on its own page."
              : "This one has no page of its own."}
          </p>
        )}
      </DetailSheet>
    </li>
  );
}
