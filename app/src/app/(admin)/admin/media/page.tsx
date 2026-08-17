import { MediaKind } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import Duplicates, {
  type DuplicateGroupRow,
} from "@/components/admin/Duplicates";
import {
  AddToLibrary,
  Documents,
  type LibraryRow,
  Pictures,
  Videos,
} from "@/components/admin/MediaLibrary";
import { formatDayShort } from "@/lib/format";
import { findDuplicates } from "@/lib/media/duplicates";
import { documentHref, libraryCounts, readLibrary } from "@/lib/media/library";

/**
 * Everything on the site, on one screen, in three tabs.
 *
 * ONE PAGE AND NOT TWO. There were two rail entries — Pictures and Documents —
 * and the second was a stub describing a filing cabinet for intake forms. Both
 * are this screen now, because they are one job: find the thing, know what it
 * is, know where it is used. Films joined them for the same reason. `/admin/
 * documents` redirects here rather than being left as a second door onto the
 * same room.
 *
 * SHE NEVER IMPORTS ANYTHING. Everything already referenced by a workshop, a
 * course, a session, a letter or the home page is here, and so is every
 * photograph on disk, whether or not a page uses one yet. That is not a
 * migration that ran once — `readLibrary` adopts on every read, so there is no
 * state in which this screen is behind the site. See `lib/media/library.ts`.
 *
 * TABS AS LINKS, NOT AS STATE. `?tab=` means the three views are addressable,
 * survive a reload, come back from a save on the right one, and need no
 * JavaScript to change. It also means each tab loads only its own rows.
 */

export const metadata: Metadata = {
  title: "Media — The Field Work",
};

export const dynamic = "force-dynamic";

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const TAB =
  "inline-flex min-h-[52px] items-center border-b-2 fig font-mono text-[18px] uppercase tracking-[0.14em]";
const TAB_ON = `${TAB} border-gold text-gold`;
const TAB_OFF = `${TAB} t border-transparent text-plate-soft hover:text-plate-text`;

/** The three tabs, in the order the operator named them. */
const TABS = [
  { key: MediaKind.video, label: "Videos", href: "videos" },
  { key: MediaKind.picture, label: "Pictures", href: "pictures" },
  { key: MediaKind.document, label: "Documents", href: "documents" },
] as const;

type TabKey = (typeof TABS)[number]["href"];

/** A query string is anything at all until this says otherwise. */
function tabOf(value: string | undefined): TabKey {
  return value === "videos" || value === "documents" ? value : "pictures";
}

const KIND_OF: Record<TabKey, MediaKind> = {
  videos: MediaKind.video,
  pictures: MediaKind.picture,
  documents: MediaKind.document,
};

/**
 * One copy in a duplicate group, ready to cross into a client component.
 *
 * The date is formatted here, on the server, for the reason the whole page
 * formats dates here: a `Date` re-parsed in the browser would be printed in the
 * reader's own timezone, so a picture added at 23:40 in London could read as the
 * previous day.
 */
function forPanel(member: {
  ref: string;
  addedAt: Date | null;
  uses: { what: string }[];
}): DuplicateGroupRow["survivor"] {
  return {
    ref: member.ref,
    addedAt: member.addedAt ? formatDayShort(member.addedAt) : null,
    uses: member.uses.map((use) => use.what),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const which = tabOf(tab);
  const kind = KIND_OF[which];

  // In this order, not in parallel: `readLibrary` adopts, and the counts have
  // to be taken after that or the tab labels are one page-load behind the
  // library they are counting.
  const rows = await readLibrary(kind);
  const counts = await libraryCounts();

  /**
   * The duplicate groups, read AFTER adoption for the same reason the counts
   * are: adoption is what fills in the hashes the grouping is done on, so
   * asking first would show her an empty panel on the one page load where the
   * answer was being computed.
   *
   * FILMS HAVE NO PANEL, and cannot. A film is a link, `parseFilm`
   * canonicalises the address before anything stores it, and `(kind, ref)`
   * already refuses the second copy — so a `youtu.be` link and its
   * `youtube.com/watch` twin are one row rather than two, and there is nothing
   * for a panel to find.
   */
  const duplicateKind =
    kind === MediaKind.picture
      ? ("picture" as const)
      : kind === MediaKind.document
        ? ("document" as const)
        : null;
  const duplicates: DuplicateGroupRow[] = duplicateKind
    ? (await findDuplicates(kind)).map((group) => ({
        hash: group.hash,
        kind: duplicateKind,
        survivor: forPanel(group.survivor),
        losers: group.losers.map(forPanel),
        refusal: group.refusal,
      }))
    : [];

  /**
   * Dates are formatted HERE, on the server, and handed over as strings.
   *
   * A `Date` crossing into a client component is serialised and re-parsed, and
   * the browser would then format it in the reader's own locale and timezone —
   * so a picture added at 23:40 in London could read as the previous day. Every
   * other admin screen prints London dates from the server for that reason.
   */
  const forScreen: LibraryRow[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind as LibraryRow["kind"],
    ref: row.ref,
    title: row.title,
    contentType: row.contentType,
    bytes: row.bytes,
    addedAt: row.addedAt ? formatDayShort(row.addedAt) : null,
    uses: row.uses.map((use) => ({
      what: use.what,
      href: use.href,
      inCode: use.inCode,
    })),
    reachableWithoutASession: row.reachableWithoutASession,
    href:
      row.kind === MediaKind.document
        ? documentHref(row.ref, row.reachableWithoutASession)
        : null,
  }));

  const total = counts.video + counts.picture + counts.document;

  return (
    <section className="pt-8" aria-labelledby="media-h">
      <p className={EYEBROW}>Your library</p>

      <h1
        id="media-h"
        className="mt-3 max-w-[26ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {total === 0 ? (
          <>
            Nothing here <span className="text-gold">yet.</span>
          </>
        ) : (
          <>
            {total} things,{" "}
            <span className="text-gold">everything the site uses.</span>
          </>
        )}
      </h1>

      <p className="mt-5 max-w-[64ch] text-[19px] leading-relaxed text-plate-soft">
        Every picture, film and document in one place &mdash; including
        everything that was already on the site before this screen existed.
        Anything you add on a workshop, a course, a session or a letter turns up
        here as well; there is only ever one copy.
      </p>

      {/* The tabs. `aria-current` rather than a class alone, so the current one
          is announced and not merely coloured. */}
      <nav
        aria-label="What kind of thing"
        className="mt-9 flex flex-wrap gap-x-9 gap-y-1 border-b border-plate-rule/30"
      >
        {TABS.map((entry) => {
          const on = entry.href === which;
          return (
            <Link
              key={entry.href}
              href={`/admin/media?tab=${entry.href}`}
              aria-current={on ? "page" : undefined}
              className={on ? TAB_ON : TAB_OFF}
            >
              {entry.label}
              <span className="ml-3 normal-case tracking-normal opacity-70">
                {counts[entry.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* The panel the tabs open onto. `pool` is the working surface every other
          admin screen writes on; the plate above it is the heading. */}
      <div className="pool on-pool mt-8 px-7 py-8 sm:px-9">
        {/* ── A pointer, not the panel ─────────────────────────────────────
            The duplicates panel lives at the BOTTOM of this pool, next to the
            other thing that changes the library, and it stays in one place
            whether or not it has anything in it — because the account of what
            a merge just did is written there, and a panel that moved when the
            last group went would take that account with it.

            So the top of the screen gets a line instead, and only when there
            is something to say. Forty cards is a long way to scroll past
            something she does not know is there. */}
        {duplicates.length > 0 && (
          <p className="mb-2 max-w-[64ch] text-[17px] leading-relaxed text-ink">
            {duplicates.length === 1
              ? "One thing here is stored more than once."
              : `${duplicates.length} things here are stored more than once.`}{" "}
            <a
              href="#duplicates-h"
              className="t font-medium underline decoration-pool-rule underline-offset-4 hover:text-action"
            >
              Keep one of each
            </a>{" "}
            &mdash; at the bottom of this page.
          </p>
        )}
        {which === "pictures" && <Pictures rows={forScreen} />}
        {which === "videos" && <Videos rows={forScreen} />}
        {which === "documents" && <Documents rows={forScreen} />}

        <AddToLibrary
          kind={
            kind === MediaKind.video
              ? "video"
              : kind === MediaKind.document
                ? "document"
                : "picture"
          }
        />

        {/* Drawn even with nothing in it, so the account of what a merge just
            did outlives the group it describes. */}
        {duplicateKind && (
          <Duplicates groups={duplicates} kind={duplicateKind} />
        )}

        {/* Said once, at the bottom, rather than on every card: the rule that
            makes this screen safe to use is that it refuses to break a page.

            IT NO LONGER SAYS "listed under it", because for pictures it is not.
            The tiles carried the list of pages under every thumbnail and now
            carry nothing; the answer is given when she tries to remove one,
            which is the moment she needs it. Saying where a thing is used is
            the same promise either way — the sentence had to say WHERE it is
            kept now rather than quietly go on describing a card that has
            gone. */}
        <p className="mt-9 max-w-[64ch] border-t border-pool-rule/40 pt-6 text-[15px] leading-relaxed text-ink-soft">
          Nothing that is in use can be removed. Try to, and this names every
          page the thing is on, so you can go and clear those first &mdash; the
          point is that no page on the site can lose a picture without you
          deciding to take it off that page yourself.
        </p>
      </div>
    </section>
  );
}
