import "server-only";
import { MediaKind, type Prisma } from "@prisma/client";
import { home } from "@/content/home";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { POSTER_PREFIX } from "@/lib/film";
import { listMediaBasenames } from "@/lib/media";
import { mediaStore } from "@/lib/media/store";

/**
 * The library, and the one place that knows where anything is used.
 *
 * THE LIBRARY IS THE RECORD; THE BASENAME IS STILL THE REFERENCE. Nothing here
 * migrates a page onto a foreign key. `Workshop.heroImage` goes on holding
 * "marianne-room-aglow", `Newsletter.backgroundBasename` goes on holding a
 * basename, `Workshop.filmUrl` goes on holding the address she pasted, and
 * `NewsletterAttachment.storedAs` goes on holding a store key. What this module
 * adds is the ability to answer two questions about any one of those strings:
 * WHAT DO WE KNOW ABOUT IT (a `MediaAsset` row), and WHERE IS IT USED.
 *
 * ONE TABLE OF REFERENCE SITES, READ TWICE. `SITES` below is the only list of
 * places a picture, a film or a file can be named. `everyReference()` walks it;
 * `adoptEverything()` inserts what it finds; `usesOf()` filters what it finds.
 * Adding a tenth place a picture can appear means adding one entry to `SITES`
 * — and both adoption and the deletion refusal pick it up in the same commit,
 * because neither has a list of its own to fall out of step with.
 *
 * THAT IS THE WHOLE REASON IT IS SHAPED THIS WAY. The failure this design is
 * built against is not a hard one to imagine: somebody adds a new column that
 * names a picture, forgets to teach the delete guard about it, and six months
 * later a photograph is deleted out from under a live page and nothing says a
 * word. A guard with its own private list of columns is a guard that will
 * eventually be out of date. A guard that reads the same list adoption reads
 * cannot be, because a missing entry means the thing never got into the library
 * either, which is visible on the first screen she opens.
 *
 * `e2e/media-smoke.mjs` closes the loop mechanically: it reads
 * `prisma/schema.prisma`, finds every column whose name says it holds a media
 * reference, and fails if one of them is not named in `SITES`.
 */

/* ── What a reference is ─────────────────────────────────────────────────── */

/** One place one asset is named, said the way she would say it. */
export type Use = {
  kind: MediaKind;
  /** The basename, the address, or the store key. */
  ref: string;
  /**
   * WHAT it is doing there, in her words and in the singular — "the hero
   * picture on Reading the Field". The refusal sentence is built by joining
   * these, so each one has to read as a phrase rather than as a column name.
   */
  what: string;
  /** Where she goes to clear it. Null when nothing on the portal can. */
  href: string | null;
  /**
   * True when nothing in the portal can clear this use — the home page's own
   * photographs are written into the code, so the honest answer is that this
   * one needs a developer rather than a screen.
   */
  inCode?: boolean;
  /** Alt text the site already holds for it, adopted on first sight. */
  alt?: string;
  /** What she would call it, adopted on first sight. */
  title?: string;
  /** Whatever the source can honestly say about when it arrived. */
  addedAt?: Date;
  /** Documents only, off the row that already sniffed them. */
  contentType?: string;
  bytes?: number;
};

/**
 * A reference site: one column, on one table, in one meaning.
 *
 * `column` is not read by the code — the loader does the querying. It is here
 * because it is what the smoke's schema sweep matches against, so a column
 * named in the schema and absent from this file is a test failure rather than a
 * silence. `table.column` is written exactly as the schema spells it.
 */
type Site = {
  /** `Table.column`, as `prisma/schema.prisma` spells it. */
  column: string;
  kind: MediaKind;
  load: () => Promise<Use[]>;
};

/** A reference with nothing to say, dropped. Empty strings are how a cleared field reads. */
function present(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && ref.trim().length > 0;
}

/**
 * Everywhere a picture, a film or a file can be named.
 *
 * ORDERED BY WHERE SHE WOULD LOOK FOR IT: the three offerings first, because
 * that is where all but one of these live, then the letters, then the home page
 * that only a developer can change.
 */
const SITES: Site[] = [
  /* ── Offerings ─────────────────────────────────────────────────────────── */
  {
    column: "Workshop.heroImage",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.workshop.findMany({
        select: { slug: true, name: true, heroImage: true, heroAlt: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the workshop ${row.name}`,
          href: `/admin/offerings/workshops/${row.slug}`,
          alt: row.heroAlt ?? undefined,
        }));
    },
  },
  {
    column: "Workshop.filmPoster",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.workshop.findMany({
        select: { slug: true, name: true, filmPoster: true },
      });
      return rows
        .filter((row) => present(row.filmPoster))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.filmPoster as string,
          what: `the still the film opens on for the workshop ${row.name}`,
          href: `/admin/offerings/workshops/${row.slug}`,
        }));
    },
  },
  {
    column: "Workshop.filmUrl",
    kind: MediaKind.video,
    load: async () => {
      const rows = await prisma.workshop.findMany({
        select: { slug: true, name: true, filmUrl: true },
      });
      return rows
        .filter((row) => present(row.filmUrl))
        .map((row) => ({
          kind: MediaKind.video,
          ref: row.filmUrl as string,
          what: `the film on the workshop ${row.name}`,
          href: `/admin/offerings/workshops/${row.slug}`,
          title: row.name,
        }));
    },
  },
  {
    column: "WorkshopImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.workshopImage.findMany({
        select: {
          url: true,
          alt: true,
          workshop: { select: { name: true, slug: true } },
        },
      });
      return rows
        .filter((row) => present(row.url))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.url,
          what: `one of the pictures on the workshop ${row.workshop.name}`,
          href: `/admin/offerings/workshops/${row.workshop.slug}`,
          alt: row.alt,
        }));
    },
  },
  {
    column: "Course.heroImage",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.course.findMany({
        select: { slug: true, name: true, heroImage: true, heroAlt: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the course ${row.name}`,
          href: `/admin/offerings/courses/${row.slug}`,
          alt: row.heroAlt ?? undefined,
        }));
    },
  },
  {
    column: "Course.filmPoster",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.course.findMany({
        select: { slug: true, name: true, filmPoster: true },
      });
      return rows
        .filter((row) => present(row.filmPoster))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.filmPoster as string,
          what: `the still the film opens on for the course ${row.name}`,
          href: `/admin/offerings/courses/${row.slug}`,
        }));
    },
  },
  {
    column: "Course.filmUrl",
    kind: MediaKind.video,
    load: async () => {
      const rows = await prisma.course.findMany({
        select: { slug: true, name: true, filmUrl: true },
      });
      return rows
        .filter((row) => present(row.filmUrl))
        .map((row) => ({
          kind: MediaKind.video,
          ref: row.filmUrl as string,
          what: `the film on the course ${row.name}`,
          href: `/admin/offerings/courses/${row.slug}`,
          title: row.name,
        }));
    },
  },
  {
    column: "CourseImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.courseImage.findMany({
        select: {
          url: true,
          alt: true,
          course: { select: { name: true, slug: true } },
        },
      });
      return rows
        .filter((row) => present(row.url))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.url,
          what: `one of the pictures on the course ${row.course.name}`,
          href: `/admin/offerings/courses/${row.course.slug}`,
          alt: row.alt,
        }));
    },
  },
  {
    column: "Service.heroImage",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.service.findMany({
        select: { slug: true, name: true, heroImage: true, heroAlt: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the session ${row.name}`,
          href: `/admin/offerings/services/${row.slug}`,
          alt: row.heroAlt ?? undefined,
        }));
    },
  },
  {
    column: "Service.filmPoster",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.service.findMany({
        select: { slug: true, name: true, filmPoster: true },
      });
      return rows
        .filter((row) => present(row.filmPoster))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.filmPoster as string,
          what: `the still the film opens on for the session ${row.name}`,
          href: `/admin/offerings/services/${row.slug}`,
        }));
    },
  },
  {
    column: "Service.filmUrl",
    kind: MediaKind.video,
    load: async () => {
      const rows = await prisma.service.findMany({
        select: { slug: true, name: true, filmUrl: true },
      });
      return rows
        .filter((row) => present(row.filmUrl))
        .map((row) => ({
          kind: MediaKind.video,
          ref: row.filmUrl as string,
          what: `the film on the session ${row.name}`,
          href: `/admin/offerings/services/${row.slug}`,
          title: row.name,
        }));
    },
  },
  {
    column: "ServiceImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.serviceImage.findMany({
        select: {
          url: true,
          alt: true,
          service: { select: { name: true, slug: true } },
        },
      });
      return rows
        .filter((row) => present(row.url))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.url,
          what: `one of the pictures on the session ${row.service.name}`,
          href: `/admin/offerings/services/${row.service.slug}`,
          alt: row.alt,
        }));
    },
  },

  /* ── Letters ───────────────────────────────────────────────────────────── */
  {
    column: "Newsletter.backgroundBasename",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.newsletter.findMany({
        select: {
          id: true,
          subject: true,
          status: true,
          backgroundBasename: true,
        },
      });
      return rows
        .filter((row) => present(row.backgroundBasename))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.backgroundBasename as string,
          what: letterUse(row, "the picture behind the top of"),
          // A sent letter is locked, so there is nothing to open and change.
          href: row.status === "sent" ? null : `/admin/newsletters/${row.id}`,
        }));
    },
  },
  {
    column: "NewsletterBlock.imageBasename",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.newsletterBlock.findMany({
        select: {
          imageBasename: true,
          alt: true,
          newsletter: { select: { id: true, subject: true, status: true } },
        },
      });
      return rows
        .filter((row) => present(row.imageBasename))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.imageBasename as string,
          what: letterUse(row.newsletter, "a picture in"),
          href:
            row.newsletter.status === "sent"
              ? null
              : `/admin/newsletters/${row.newsletter.id}`,
          alt: row.alt ?? undefined,
        }));
    },
  },
  {
    column: "NewsletterAttachment.storedAs",
    kind: MediaKind.document,
    load: async () => {
      const rows = await prisma.newsletterAttachment.findMany({
        select: {
          storedAs: true,
          filename: true,
          contentType: true,
          bytes: true,
          createdAt: true,
          newsletter: { select: { id: true, subject: true, status: true } },
        },
      });
      return rows.map((row) => ({
        kind: MediaKind.document,
        ref: row.storedAs,
        what: letterUse(row.newsletter, "attached to"),
        href:
          row.newsletter.status === "sent"
            ? null
            : `/admin/newsletters/${row.newsletter.id}`,
        title: row.filename,
        contentType: row.contentType,
        bytes: row.bytes,
        addedAt: row.createdAt,
      }));
    },
  },

  /* ── The home page ─────────────────────────────────────────────────────── */
  {
    /**
     * NOT A COLUMN, AND IT IS IN THIS LIST ANYWAY.
     *
     * The home page's seven photographs live in `src/content/home.ts` as code,
     * because `/admin/page` is not built yet. They are on the live front page of
     * the site all the same, so leaving them out would mean the delete guard
     * cheerfully removing the photograph behind the first thing anybody sees.
     * The rule this list enforces is "nothing may silently break a live page",
     * not "nothing may break a database row".
     *
     * These uses carry `inCode`, and the refusal says so in as many words: she
     * cannot clear this one from a screen, and being told to go and find one is
     * worse than being told plainly that it needs a developer.
     */
    column: "content/home.ts::Plate.src",
    kind: MediaKind.picture,
    load: async () =>
      Object.entries(home)
        .flatMap(([name, beat]) => {
          const plate = (beat as { plate?: { src?: string; alt?: string } })
            .plate;
          if (!plate || !present(plate.src)) return [];
          return [{ name, beat: beat as HomeBeat, plate }];
        })
        .map(({ name, beat, plate }) => ({
          kind: MediaKind.picture,
          ref: plate.src as string,
          what: homePlateUse(beat, name),
          href: null,
          inCode: true,
          alt: plate.alt,
        })),
  },
];

/** As much of a beat as this needs: whatever names it to her. */
type HomeBeat = { eyebrow?: string; eyebrowLead?: string; id?: string };

/**
 * Which of the home page's photographs this is, said so she can go and find it.
 *
 * The eyebrow is the line printed above the beat, so it is the phrase she would
 * use to name that part of the page — quoting it means she can scroll until she
 * sees those words. One beat has no eyebrow at all: its entire content is four
 * verbs set in light, so there is no line to quote. That one gets its anchor
 * instead, and is worded as an anchor rather than dressed up as a heading —
 * being told plainly "the part of the page called method" is more use than being
 * shown a quotation she will never find on the page.
 */
function homePlateUse(beat: HomeBeat, key: string): string {
  const named = beat.eyebrow ?? beat.eyebrowLead;
  if (named) return `the photograph behind “${named}” on the home page`;
  return `the photograph on the part of the home page called ${beat.id ?? key}`;
}

/** Every reference site, for the smoke's schema sweep and for the screen's own note. */
export const REFERENCE_SITE_COLUMNS: readonly string[] = SITES.map(
  (site) => site.column,
);

/** "the picture behind the top of the letter The Field Work — August (sent)". */
function letterUse(
  letter: { subject: string; status: string },
  phrase: string,
): string {
  const which = letter.status === "sent" ? "the sent letter" : "the draft";
  return `${phrase} ${which} ${letter.subject}`;
}

/**
 * Every reference in the system, in one pass.
 *
 * Sixteen small queries against tables a sole practitioner measures in tens of
 * rows. It is deliberately not clever: one query per site, run together, and
 * the answer is a flat list. A join across nine columns would be faster and
 * would also be the thing nobody dares to edit when a tenth column lands.
 */
export async function everyReference(): Promise<Use[]> {
  const lists = await Promise.all(SITES.map((site) => site.load()));
  return lists.flat();
}

/* ── Adoption ────────────────────────────────────────────────────────────── */

/**
 * Everything already on the site, in the library, without her importing
 * anything.
 *
 * Three sources, merged:
 *
 *   1. Every reference the site holds — so a basename that is somebody's hero
 *      picture is in the library even if the file it names has gone missing,
 *      because the fact that a page is pointing at it is the thing she needs to
 *      see.
 *   2. Every complete picture in the store — the two hundred-odd derivatives
 *      that shipped with the code, plus everything she has uploaded since,
 *      whether or not any page uses one yet.
 *   3. Every document in the store that a letter knows about, which source 1
 *      already covers, plus every document uploaded to the library itself.
 *
 * IDEMPOTENT, AND CALLED ON EVERY READ. `createMany` with `skipDuplicates`
 * against the `(kind, ref)` unique index, which makes this an insert-if-absent
 * whatever else is happening at the same moment. It is not a migration and
 * there is nothing to run: the first time she opens the library, the library is
 * already full.
 *
 * WHAT IT NEVER DOES IS OVERWRITE. A row that exists is hers — she may have
 * written the alt text herself, or renamed it — so adoption only ever fills in
 * rows that are not there. The one exception is documents, which get their
 * `contentType` and `bytes` backfilled if they are missing, because those two
 * are facts about the bytes rather than opinions about the file.
 */
export async function adoptEverything(): Promise<void> {
  const [references, pictureBasenames, existing] = await Promise.all([
    everyReference(),
    listMediaBasenames(),
    prisma.mediaAsset.findMany({ select: { kind: true, ref: true } }),
  ]);

  const already = new Set(existing.map((row) => `${row.kind} ${row.ref}`));

  /** The first thing said about a ref wins; later sites only fill in blanks. */
  const found = new Map<string, Prisma.MediaAssetCreateManyInput>();
  const consider = (candidate: Prisma.MediaAssetCreateManyInput) => {
    const key = `${candidate.kind} ${candidate.ref}`;
    if (already.has(key)) return;
    const seen = found.get(key);
    if (!seen) {
      found.set(key, candidate);
      return;
    }
    seen.title ??= candidate.title;
    seen.alt ??= candidate.alt;
    seen.contentType ??= candidate.contentType;
    seen.bytes ??= candidate.bytes;
    // The EARLIEST honest date, not the latest: a handout that went out in
    // January and again in March arrived in January.
    if (
      candidate.addedAt &&
      (!seen.addedAt || candidate.addedAt < seen.addedAt)
    ) {
      seen.addedAt = candidate.addedAt;
    }
  };

  for (const use of references) {
    consider({
      kind: use.kind,
      ref: use.ref,
      title: use.title ?? null,
      alt: use.alt ?? null,
      contentType: use.contentType ?? null,
      bytes: use.bytes ?? null,
      // Null for everything but a letter's file — nothing else on the site
      // records when a picture arrived, and today's date would be a fiction.
      addedAt: use.addedAt ?? null,
    });
  }

  for (const basename of pictureBasenames) {
    // Film stills are excluded by `listMediaBasenames` already. Belt and
    // braces, because a still adopted as a photograph is a still she would be
    // offered as a photograph of the day.
    if (basename.startsWith(POSTER_PREFIX)) continue;
    consider({
      kind: MediaKind.picture,
      ref: basename,
      alt: null,
      addedAt: null,
    });
  }

  if (found.size > 0) {
    await prisma.mediaAsset.createMany({
      data: [...found.values()],
      skipDuplicates: true,
    });
  }

  // Documents whose sniffed facts were never written down — a row adopted from
  // an older attachment, or one written before those columns were filled.
  const thin = references.filter(
    (use) => use.kind === MediaKind.document && use.contentType && use.bytes,
  );
  await Promise.all(
    thin.map((use) =>
      prisma.mediaAsset.updateMany({
        where: { kind: MediaKind.document, ref: use.ref, contentType: null },
        data: { contentType: use.contentType, bytes: use.bytes },
      }),
    ),
  );
}

/**
 * The row for a picture that has just been stored.
 *
 * HERE RATHER THAN IN THE MEDIA PAGE'S ACTIONS, and the reason is a real one:
 * everything exported from a `"use server"` file is a POST endpoint anybody can
 * call. This takes a basename and writes a row, which is harmless in itself and
 * would still be an endpoint nobody needs. It lives in a plain server module, so
 * the only callers are the two actions that have already checked the session.
 *
 * BOTH UPLOAD PATHS CALL IT, which is what makes "anything uploaded anywhere
 * else appears here too" true by construction rather than by a later sweep. The
 * offering forms and the newsletter editor upload through
 * `offerings/actions.ts::addPicture`, which predates the library and is used in
 * four places; that action calls this rather than growing a second copy of it.
 *
 * `addedAt` is set here and in the library's own uploads, and nowhere else.
 * Adoption deliberately leaves it null — see the schema for why that null is the
 * honest answer.
 */
export async function recordPicture(basename: string): Promise<void> {
  await prisma.mediaAsset.upsert({
    where: { kind_ref: { kind: MediaKind.picture, ref: basename } },
    update: {},
    create: { kind: MediaKind.picture, ref: basename, addedAt: new Date() },
  });
}

/* ── Where a thing is used, and whether it may go ────────────────────────── */

/**
 * Every place one asset is named.
 *
 * The whole reference list is loaded and filtered rather than sixteen targeted
 * queries being written by hand. That is the point: a targeted query per site
 * is sixteen more places to forget one.
 */
export async function usesOf(kind: MediaKind, ref: string): Promise<Use[]> {
  const all = await everyReference();
  return all.filter((use) => use.kind === kind && use.ref === ref);
}

/**
 * The sentence the refusal is made of.
 *
 * "This is the picture at the top of the workshop Reading the Field, and one of
 * the pictures on the course Held Attention." Two clauses joined with "and",
 * three or more with commas — because the list is read aloud in her head and
 * "a, b, c" with no "and" reads as an error message rather than a sentence.
 *
 * Identical uses are counted rather than repeated: three pictures on one
 * workshop is "three of the pictures on the workshop Reading the Field", not
 * the same phrase three times.
 */
export function usesSentence(uses: Use[]): string {
  const counts = new Map<string, number>();
  for (const use of uses) counts.set(use.what, (counts.get(use.what) ?? 0) + 1);

  const phrases = [...counts.entries()].map(([what, count]) =>
    count === 1 ? what : `${count} × ${what}`,
  );

  if (phrases.length === 1) return phrases[0];
  const last = phrases[phrases.length - 1];
  return `${phrases.slice(0, -1).join(", ")} and ${last}`;
}

export type Removal = { ok: true } | { ok: false; error: string };

/**
 * Taking something out of the library for good.
 *
 * REFUSED WHILE IT IS IN USE, and the refusal names the places. That is the
 * operator's decision and it is the right one: the alternative is a page that
 * loses its photograph at some point in the future for a reason nobody can
 * reconstruct. She clears the uses first, and then this lets it go.
 *
 * The order matters. The uses are checked, then the row goes, then the bytes.
 * A crash between the last two leaves a file in the store with no row pointing
 * at it — which costs disk and breaks nothing. The other order would leave a
 * row for a file that is gone, which is a picture-shaped hole on a page.
 */
export async function removeAsset(
  kind: MediaKind,
  ref: string,
): Promise<Removal> {
  const uses = await usesOf(kind, ref);
  if (uses.length > 0) {
    const stuck = uses.some((use) => use.inCode);
    return {
      ok: false,
      error: `This is still in use — it is ${usesSentence(uses)}. ${
        stuck
          ? "Some of that is written into the site's own code rather than set on a screen, so clearing it needs whoever built the site. Nothing has been deleted."
          : "Take it off there first, and then this will let it go. Nothing has been deleted."
      }`,
    };
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { kind_ref: { kind, ref } },
  });
  if (!asset) return { ok: false, error: "That is not in the library." };

  await prisma.mediaAsset.delete({ where: { id: asset.id } });

  // A film is a link and there is nothing of it here to remove. A picture is
  // six files; a document is one.
  if (kind === MediaKind.picture) await removePictureBytes(ref);
  if (kind === MediaKind.document) await removeStored(ref);

  return { ok: true };
}

/**
 * The six derivatives of one picture.
 *
 * `remove` is best-effort by design — a derivative that was never written, or a
 * bucket that says no, must not leave her with a row she cannot delete. What
 * matters for the screen is that the row has gone; the disk catching up is
 * housekeeping.
 */
async function removePictureBytes(basename: string): Promise<void> {
  const files = [1200, 2400].flatMap((width) =>
    ["avif", "webp", "jpg"].map((ext) => `${basename}-${width}.${ext}`),
  );
  await Promise.all(files.map(removeStored));
}

async function removeStored(file: string): Promise<void> {
  try {
    await mediaStore().remove(file);
  } catch (e) {
    console.error(`[media] could not remove ${file}`, e);
  }
}

/* ── Reading the library ─────────────────────────────────────────────────── */

/** One thing in the library, as a screen and the picker both need it. */
export type LibraryItem = {
  id: number;
  kind: MediaKind;
  ref: string;
  title: string | null;
  alt: string | null;
  contentType: string | null;
  bytes: number | null;
  /** Null means "already on the site" — see the schema for why that is honest. */
  addedAt: Date | null;
  /** Where it is named. Empty means nothing points at it. */
  uses: Use[];
  /**
   * Documents only. A document is admin-only until it goes on a letter, at
   * which point it HAS to be reachable without a session — see
   * `documentIsPublic`.
   */
  reachableWithoutASession: boolean;
};

/**
 * One kind of thing, with what is known about each and where each is used.
 *
 * Adoption runs first, every time. It is one insert-if-absent against a table
 * of a few hundred rows and it is what makes "she never imports anything" true
 * rather than aspirational: there is no sync button, and no state in which the
 * library is behind the site.
 */
export async function readLibrary(kind: MediaKind): Promise<LibraryItem[]> {
  await adoptEverything();

  const [rows, references] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { kind }, orderBy: { ref: "asc" } }),
    everyReference(),
  ]);

  const byRef = new Map<string, Use[]>();
  for (const use of references) {
    if (use.kind !== kind) continue;
    const list = byRef.get(use.ref);
    if (list) list.push(use);
    else byRef.set(use.ref, [use]);
  }

  return rows.map((row) => {
    const uses = byRef.get(row.ref) ?? [];
    return {
      id: row.id,
      kind: row.kind,
      ref: row.ref,
      title: row.title,
      alt: row.alt,
      contentType: row.contentType,
      bytes: row.bytes,
      addedAt: row.addedAt,
      uses,
      // For a document, being on a letter IS being public. Derived rather than
      // stored, because a stored flag and the attachment rows would be two
      // answers to one question and would eventually disagree.
      reachableWithoutASession:
        row.kind === MediaKind.document && uses.length > 0,
    };
  });
}

/**
 * All three tabs' counts, for the tab labels.
 *
 * DOES NOT ADOPT. The page runs this alongside `readLibrary`, which does — and
 * two adoptions racing each other would each compute their insert list from a
 * snapshot taken before the other had written. `skipDuplicates` makes that
 * harmless rather than correct, and doing the work twice on every page load to
 * arrive at the same answer is not worth the tidiness of each function being
 * self-sufficient. Any caller that reads counts alone must adopt first.
 */
export async function libraryCounts(): Promise<Record<MediaKind, number>> {
  const grouped = await prisma.mediaAsset.groupBy({
    by: ["kind"],
    _count: { _all: true },
  });
  const counts = {
    [MediaKind.video]: 0,
    [MediaKind.picture]: 0,
    [MediaKind.document]: 0,
  };
  for (const row of grouped) counts[row.kind] = row._count._all;
  return counts;
}

/**
 * Whether a document may be handed to somebody with no session.
 *
 * ONE RULE, ONE PLACE, AND IT IS A QUERY RATHER THAN A COLUMN. A document is
 * admin-only until it is attached to a letter, and reachable from that moment
 * on — because a link in somebody's inbox has no session behind it and never
 * will. So the question "is this public" is exactly the question "is there a
 * `NewsletterAttachment` row for it", and asking it that way means the two can
 * never disagree. A boolean column would be a second answer, and the day it
 * drifted the failure would be either a broken link in forty inboxes or a
 * handout readable by anybody who guessed its name.
 *
 * `/newsletter-files/[file]` already enforces this — it serves nothing that is
 * not a row — so this function is what the SCREEN reads to say which state a
 * document is in, not a second gate in front of the first.
 */
export async function documentIsPublic(storedAs: string): Promise<boolean> {
  const row = await prisma.newsletterAttachment.findFirst({
    where: { storedAs },
    select: { id: true },
  });
  return row !== null;
}

/**
 * The address a document is served from, given whether it is public yet.
 *
 * Two routes, and which one applies is not a preference: a private document is
 * behind `/admin/media/file/…`, which requires a session and would 404 for a
 * recipient; a public one is at `/newsletter-files/…`, which is what the letter
 * itself links to. The screen prints whichever is true so that "open it and
 * check" and "this is the link they will get" are the same press.
 */
export function documentHref(storedAs: string, isPublic: boolean): string {
  return isPublic
    ? `/newsletter-files/${storedAs}`
    : `/admin/media/file/${storedAs}`;
}

/** The one place that decides whether a caller may see the library at all. */
export async function requireLibrarySession() {
  const session = await getSession();
  if (!session) return null;
  return session;
}
