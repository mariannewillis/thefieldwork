import "server-only";
import { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  everyReference,
  removeAsset,
  repointEverywhere,
  type Use,
  usesSentence,
} from "@/lib/media/library";

/**
 * The same thing, held more than once — found, explained, and cleared.
 *
 * WHY THIS IS A SCREEN AND NOT A SCRIPT. The eighteen files this was written
 * against are IN USE: they are the pictures on live workshops and live letters.
 * Clearing them is not a tidy-up somebody runs once at a terminal and forgets —
 * it moves references on pages that are on the internet, and the person who
 * should decide that, one group at a time, having read what will happen, is
 * Marianne. So it lives on the Media screen, it says exactly what it will do
 * before it does it, and it does nothing until she presses.
 *
 * THE ORDER IS THE WHOLE SAFETY PROPERTY. Every reference is moved onto the
 * survivor FIRST, and only then are the copies deleted. A crash between the two
 * leaves an unused duplicate — untidy, and nothing broken. The other order
 * would leave a page naming a file that has gone, which is a photograph-shaped
 * hole on the front of the site.
 *
 * AND IT REFUSES RATHER THAN HALF-DOING IT. The home page's seven photographs
 * are written into `src/content/home.ts`, which is code: no database write
 * reaches it. If one of the copies about to be deleted is named there, this
 * merges NOTHING and says why. Half a merge is the failure; a group left alone
 * is a group she can still see.
 */

/** One of the copies, with everywhere it is named. */
export type DuplicateMember = {
  id: number;
  ref: string;
  /** Null means "already on the site" — see the schema for why that is honest. */
  addedAt: Date | null;
  uses: Use[];
};

/** One set of files that are all the same file. */
export type DuplicateGroup = {
  /** What they all hash to. The merge is addressed by this, not by an id. */
  hash: string;
  kind: MediaKind;
  /** The one that stays. */
  survivor: DuplicateMember;
  /** The ones that go, once nothing names them any more. */
  losers: DuplicateMember[];
  /** How many references the merge would move. Zero is common and fine. */
  moves: number;
  /**
   * Null when this can be merged. A sentence when it cannot, saying which copy
   * is written into the site's code and what that means for her.
   */
  refusal: string | null;
};

/**
 * WHICH ONE STAYS: the one she has had longest, and then the one with the
 * original name.
 *
 * `addedAt` null means the picture was on the site before this library existed,
 * so it is older than anything carrying a date and sorts first. Between two
 * dates, the earlier.
 *
 * THE TIE IS THE INTERESTING PART, because the four groups this was written
 * against are ALL ties: eighteen photographs adopted off the disk in one pass,
 * every one of them with a null date, because nothing recorded when any of them
 * arrived. So the tie-break is the NAME, shortest first — and that is not
 * arbitrary. `ingestImage` names the first copy `whatsapp-image-…` and numbers
 * every one after it `…-2`, `…-3`, so the shortest name in a group is by
 * construction the one that got there first. Sorting by row id instead would
 * pick whichever the adoption sweep happened to insert first, which is a fact
 * about the sweep and not about her library — and on the operator's own data it
 * picked `…-45-48-3` over `…-45-48`, which is an answer nobody could defend.
 *
 * Alphabetical, then the id, last: two names of equal length are a tie nobody
 * will ever see, and a total order is worth having anyway so the panel does not
 * shuffle between page loads.
 */
function oldestFirst(a: DuplicateMember, b: DuplicateMember): number {
  if ((a.addedAt === null) !== (b.addedAt === null)) return a.addedAt ? 1 : -1;
  if (a.addedAt && b.addedAt && a.addedAt.getTime() !== b.addedAt.getTime()) {
    return a.addedAt.getTime() - b.addedAt.getTime();
  }
  if (a.ref.length !== b.ref.length) return a.ref.length - b.ref.length;
  if (a.ref !== b.ref) return a.ref < b.ref ? -1 : 1;
  return a.id - b.id;
}

/** "written into the site's own code" — the one thing no button can move. */
function refusalFor(losers: DuplicateMember[]): string | null {
  const stuck = losers.flatMap((loser) =>
    loser.uses.filter((use) => use.inCode),
  );
  if (stuck.length === 0) return null;

  return `One of the copies this would delete is ${usesSentence(stuck)} — and that is written into the site's own code rather than set on a screen, so no button here can move it onto the copy that stays. Nothing has been done to this group. Clearing it needs whoever built the site; until then the extra copies are only taking up room, and every page is still showing the right picture.`;
}

/**
 * Every set of things the library is holding more than once.
 *
 * ONE KIND AT A TIME, because the screen shows one tab at a time and a panel
 * about documents on the pictures tab is a panel she has to read past. Films
 * never appear here at all and cannot: a film is a link, `parseFilm`
 * canonicalises the address before anything stores it, and `(kind, ref)`
 * already refuses the second copy.
 *
 * ROWS WITH NO HASH ARE NOT IN A GROUP, and that is the honest answer rather
 * than an omission — a row whose file has gone missing from the store cannot be
 * proved identical to anything, so it is left exactly where it is.
 */
export async function findDuplicates(
  kind: MediaKind,
): Promise<DuplicateGroup[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: { kind, hash: { not: null } },
    select: { id: true, ref: true, addedAt: true, hash: true },
    orderBy: { id: "asc" },
  });

  const byHash = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byHash.get(row.hash as string);
    if (list) list.push(row);
    else byHash.set(row.hash as string, [row]);
  }

  const repeated = [...byHash.entries()].filter(([, list]) => list.length > 1);
  if (repeated.length === 0) return [];

  // One pass over every reference site, shared by every group — sixteen small
  // queries whichever way this is written, so they are run once rather than
  // once per group.
  const references = await everyReference();
  const usesOf = (ref: string) =>
    references.filter((use) => use.kind === kind && use.ref === ref);

  const groups = repeated.map(([hash, list]) => {
    const members: DuplicateMember[] = list
      .map((row) => ({
        id: row.id,
        ref: row.ref,
        addedAt: row.addedAt,
        uses: usesOf(row.ref),
      }))
      .sort(oldestFirst);

    const [survivor, ...losers] = members;
    return {
      hash,
      kind,
      survivor,
      losers,
      moves: losers.reduce((total, loser) => total + loser.uses.length, 0),
      refusal: refusalFor(losers),
    };
  });

  // The biggest pile first — six copies of one photograph is the thing worth
  // her attention before a pair.
  return groups.sort((a, b) => b.losers.length - a.losers.length);
}

export type Merged =
  { ok: true; report: string } | { ok: false; error: string };

/** "six files" — a picture is six derivatives; a document is one. */
function filesWords(kind: MediaKind, copies: number): string {
  const each = kind === MediaKind.picture ? 6 : 1;
  const total = copies * each;
  return total === 1 ? "one file" : `${total} files`;
}

/**
 * Clearing one group, when she asks.
 *
 * ADDRESSED BY HASH rather than by the ids the screen was drawn from. The
 * screen is a claim about a moment that has passed: she may have left it open,
 * uploaded something, or cleared a use in another tab. Re-finding the group
 * here means the merge acts on what is true now, and a group that has since
 * gone says so plainly instead of deleting whatever inherited those ids.
 *
 * THE LAST DELETION GOES THROUGH `removeAsset`, which re-checks every reference
 * site before it removes anything and takes the derivative files with it. That
 * is not belt-and-braces for its own sake: it means the deletion half of this
 * cannot delete something in use even if the repointing half missed a site, and
 * it means the bytes leave through `mediaStore()` rather than through a second
 * copy of that logic living here.
 */
export async function mergeDuplicates(
  kind: MediaKind,
  hash: string,
): Promise<Merged> {
  const group = (await findDuplicates(kind)).find(
    (candidate) => candidate.hash === hash,
  );
  if (!group) {
    return {
      ok: false,
      error:
        "There is nothing held twice here any more — it may have been cleared in another tab. Nothing has been done.",
    };
  }
  if (group.refusal) return { ok: false, error: group.refusal };

  const what = kind === MediaKind.picture ? "picture" : "document";
  const survivor = group.survivor.ref;
  // What she is shown is not what is written. A picture's basename is read
  // aloud with spaces, exactly as the library card above prints it; a
  // document's ref is a filename, where the hyphens are part of the name and
  // taking them out would name a file that does not exist.
  const survivorWords =
    kind === MediaKind.picture ? survivor.replace(/-/g, " ") : survivor;

  // ── 1 · move every reference, before anything is deleted ──────────────────
  const moved: string[] = [];
  for (const loser of group.losers) {
    const result = await repointEverywhere(kind, loser.ref, survivor);
    if (result.refused.length > 0) {
      // Only reachable if a use appeared between the check above and here.
      return {
        ok: false,
        error: `Something on the site started using one of these copies while this was running — ${result.refused.join("; ")}. Nothing more has been changed; open the screen again and it will say where things stand.`,
      };
    }
    for (const use of loser.uses) moved.push(use.what);
  }

  // ── 2 · and only now, take the copies out ─────────────────────────────────
  const removed: string[] = [];
  const kept: string[] = [];
  for (const loser of group.losers) {
    const result = await removeAsset(kind, loser.ref);
    if (result.ok) removed.push(loser.ref);
    else kept.push(loser.ref);
  }

  const lines: string[] = [];
  lines.push(
    `Kept one ${what}: ${survivorWords}. ${removed.length === 1 ? "One copy was" : `${removed.length} copies were`} removed, and ${filesWords(kind, removed.length)} with them.`,
  );
  lines.push(
    moved.length === 0
      ? "Nothing on the site was pointing at the copies, so nothing had to move."
      : `${moved.length === 1 ? "One page was" : `${moved.length} places were`} pointing at a copy and now point at the one that stayed: ${usesSentence(group.losers.flatMap((loser) => loser.uses))}. Every one of them is showing the same photograph it was before, because the copies were the same photograph.`,
  );
  if (kept.length > 0) {
    lines.push(
      `${kept.join(", ")} could not be removed and ${kept.length === 1 ? "is" : "are"} still here. Open the screen again to see what is holding on to ${kept.length === 1 ? "it" : "them"}.`,
    );
  }
  return { ok: true, report: lines.join(" ") };
}
