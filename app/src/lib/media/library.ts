import "server-only";
import { MediaKind, type Prisma } from "@prisma/client";
import { home } from "@/content/home";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { POSTER_PREFIX } from "@/lib/film";
import { listMediaBasenames } from "@/lib/media";
import { BEATS, pictureSlot } from "@/lib/pages/slots";
import { backfillHashes } from "@/lib/media/identity";
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
 * ONE TABLE OF REFERENCE SITES, READ FOUR WAYS. `SITES` below is the only list
 * of places a picture, a film or a file can be named. `everyReference()` walks
 * it; `adoptEverything()` inserts what it finds; `usesOf()` filters what it
 * finds; `repointEverywhere()` REWRITES what it finds, which is how the
 * duplicate merge moves a page off a copy and onto the survivor. Adding a tenth
 * place a picture can appear means adding one entry to `SITES` — and adoption,
 * the deletion refusal and the merge all pick it up in the same commit, because
 * none of them has a list of its own to fall out of step with.
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
  /**
   * What she would call it, adopted on first sight.
   *
   * THERE IS NO `alt` BESIDE THIS, and there deliberately is not. The
   * description of a photograph belongs to the USE — `WorkshopImage.alt` and
   * its siblings are required columns, and each says what that page needs said
   * — so there was never a second answer for the library to carry. Adoption
   * used to copy one of them onto `MediaAsset.alt` and no page ever read it
   * back; the column went with the form that wrote it.
   */
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
  /**
   * Move every reference here from one ref to another, and say how many moved.
   *
   * NULL WHERE NOTHING CAN. The home page's photographs are written into
   * `src/content/home.ts`, and no database write reaches a TypeScript file. A
   * site with no `repoint` is a site the duplicate merge must refuse rather
   * than skip: skipping it would leave the page pointing at a picture the merge
   * is about to delete, which is the one outcome the whole library exists to
   * prevent.
   */
  repoint: ((from: string, to: string) => Promise<number>) | null;
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
        select: { slug: true, name: true, heroImage: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the workshop ${row.name}`,
          href: `/admin/offerings/workshops/${row.slug}`,
        }));
    },
    repoint: (from, to) =>
      prisma.workshop
        .updateMany({ where: { heroImage: from }, data: { heroImage: to } })
        .then((result) => result.count),
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
    repoint: (from, to) =>
      prisma.workshop
        .updateMany({ where: { filmPoster: from }, data: { filmPoster: to } })
        .then((result) => result.count),
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
    // Films are already one row per film, because `parseFilm` canonicalises the
    // address before anything stores it. This exists so the table has no gap,
    // not because a film has ever needed moving.
    repoint: (from, to) =>
      prisma.workshop
        .updateMany({ where: { filmUrl: from }, data: { filmUrl: to } })
        .then((result) => result.count),
  },
  {
    column: "WorkshopImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.workshopImage.findMany({
        select: {
          url: true,
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
        }));
    },
    repoint: (from, to) =>
      prisma.workshopImage
        .updateMany({ where: { url: from }, data: { url: to } })
        .then((result) => result.count),
  },
  {
    column: "Course.heroImage",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.course.findMany({
        select: { slug: true, name: true, heroImage: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the course ${row.name}`,
          href: `/admin/offerings/courses/${row.slug}`,
        }));
    },
    repoint: (from, to) =>
      prisma.course
        .updateMany({ where: { heroImage: from }, data: { heroImage: to } })
        .then((result) => result.count),
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
    repoint: (from, to) =>
      prisma.course
        .updateMany({ where: { filmPoster: from }, data: { filmPoster: to } })
        .then((result) => result.count),
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
    repoint: (from, to) =>
      prisma.course
        .updateMany({ where: { filmUrl: from }, data: { filmUrl: to } })
        .then((result) => result.count),
  },
  {
    column: "CourseImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.courseImage.findMany({
        select: {
          url: true,
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
        }));
    },
    repoint: (from, to) =>
      prisma.courseImage
        .updateMany({ where: { url: from }, data: { url: to } })
        .then((result) => result.count),
  },
  {
    column: "Service.heroImage",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.service.findMany({
        select: { slug: true, name: true, heroImage: true },
      });
      return rows
        .filter((row) => present(row.heroImage))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.heroImage as string,
          what: `the picture at the top of the session ${row.name}`,
          href: `/admin/offerings/services/${row.slug}`,
        }));
    },
    repoint: (from, to) =>
      prisma.service
        .updateMany({ where: { heroImage: from }, data: { heroImage: to } })
        .then((result) => result.count),
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
    repoint: (from, to) =>
      prisma.service
        .updateMany({ where: { filmPoster: from }, data: { filmPoster: to } })
        .then((result) => result.count),
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
    repoint: (from, to) =>
      prisma.service
        .updateMany({ where: { filmUrl: from }, data: { filmUrl: to } })
        .then((result) => result.count),
  },
  {
    column: "ServiceImage.url",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.serviceImage.findMany({
        select: {
          url: true,
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
        }));
    },
    repoint: (from, to) =>
      prisma.serviceImage
        .updateMany({ where: { url: from }, data: { url: to } })
        .then((result) => result.count),
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
    // SENT LETTERS INCLUDED, and that is safe here in a way it would not be
    // for anything else. A merge only ever moves a reference between files
    // with IDENTICAL bytes, so the picture a sent letter's masthead resolves
    // to is the same photograph before and after. Leaving sent letters out
    // would instead mean the merge deleting a file a sent letter still points
    // at, which is the hole this refuses to make.
    repoint: (from, to) =>
      prisma.newsletter
        .updateMany({
          where: { backgroundBasename: from },
          data: { backgroundBasename: to },
        })
        .then((result) => result.count),
  },
  {
    column: "NewsletterBlock.imageBasename",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.newsletterBlock.findMany({
        select: {
          imageBasename: true,
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
        }));
    },
    repoint: (from, to) =>
      prisma.newsletterBlock
        .updateMany({
          where: { imageBasename: from },
          data: { imageBasename: to },
        })
        .then((result) => result.count),
  },
  /**
   * The pictures in a message about one offering (the Email tab, 2026-08-20).
   *
   * FOUND BY THE SUITE, NOT BY ME. `media-smoke` walks the schema for every
   * column that holds a media reference and fails if one is missing from this
   * list — and this one was, from the moment `OfferingMessageBlock` shipped.
   * Without it a picture used in a message she has already sent counts as
   * unused, and the Media screen would let her delete it: the copy in somebody's
   * inbox points at a file that is no longer there.
   *
   * The `href` goes to the offering the message hangs off, because that is where
   * the message is — a message has no page of its own.
   */
  {
    column: "OfferingMessageBlock.imageBasename",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.offeringMessageBlock.findMany({
        select: {
          imageBasename: true,
          message: {
            select: {
              subject: true,
              sentAt: true,
              workshop: { select: { slug: true, name: true } },
              course: { select: { slug: true, name: true } },
              service: { select: { slug: true, name: true } },
            },
          },
        },
      });
      return rows
        .filter((row) => present(row.imageBasename))
        .map((row) => {
          const on =
            row.message.workshop ??
            row.message.course ??
            row.message.service ??
            null;
          const kindWord = row.message.workshop
            ? "workshops"
            : row.message.course
              ? "courses"
              : "services";
          return {
            kind: MediaKind.picture,
            ref: row.imageBasename as string,
            what: `a picture in the message “${row.message.subject}”${
              on ? ` about ${on.name}` : ""
            }`,
            // A sent message cannot be edited, so there is nowhere useful to
            // send her — the same rule the letters follow.
            href:
              row.message.sentAt || !on
                ? null
                : `/admin/offerings/${kindWord}/${on.slug}`,
          };
        });
    },
    repoint: (from, to) =>
      prisma.offeringMessageBlock
        .updateMany({
          where: { imageBasename: from },
          data: { imageBasename: to },
        })
        .then((result) => result.count),
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
    /**
     * ONE UPDATE PER ROW, BECAUSE OF THE INDEX. `(newsletterId, storedAs)` is
     * unique, so a blanket `updateMany` would throw the moment one letter
     * carried both copies of the same document — which is exactly the state a
     * duplicate group describes. Where the letter already holds the survivor,
     * the loser's row is DELETED rather than updated: two rows for one file on
     * one letter is the thing that index refuses, and the letter ends up
     * carrying the file once, which is what she meant both times she attached
     * it.
     */
    repoint: async (from, to) => {
      const rows = await prisma.newsletterAttachment.findMany({
        where: { storedAs: from },
        select: { id: true, newsletterId: true },
      });

      let moved = 0;
      for (const row of rows) {
        const already = await prisma.newsletterAttachment.findUnique({
          where: {
            newsletterId_storedAs: {
              newsletterId: row.newsletterId,
              storedAs: to,
            },
          },
          select: { id: true },
        });
        if (already) {
          await prisma.newsletterAttachment.delete({ where: { id: row.id } });
        } else {
          await prisma.newsletterAttachment.update({
            where: { id: row.id },
            data: { storedAs: to },
          });
        }
        moved += 1;
      }
      return moved;
    },
  },

  /* ── The home page ─────────────────────────────────────────────────────── */
  {
    /**
     * NOT A COLUMN, AND IT IS IN THIS LIST ANYWAY.
     *
     * The home page's seven photographs are AUTHORED in `src/content/home.ts`
     * and stay there. The pages panel (D-34) did not move them into the
     * database: it holds only what she has CHANGED, so an unswapped plate is
     * still named in code and only in code. They are on the live front page of
     * the site all the same, so leaving them out would mean the delete guard
     * cheerfully removing the photograph behind the first thing anybody sees.
     * The three `Page*` entries below cover the ones she HAS swapped or added,
     * and those she can clear from a screen.
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
          const plate = (beat as { plate?: { src?: string } }).plate;
          if (!plate || !present(plate.src)) return [];
          return [{ name, beat: beat as HomeBeat, plate }];
        })
        .map(({ name, beat, plate }) => ({
          kind: MediaKind.picture,
          ref: plate.src as string,
          what: homePlateUse(beat, name),
          href: null,
          inCode: true,
        })),
    // NOTHING CAN REWRITE THIS FROM A SCREEN. `src/content/home.ts` is code; a
    // database write does not reach it. The duplicate merge reads this null and
    // REFUSES the whole group rather than moving the references it can and
    // deleting a file the home page still names.
    repoint: null,
  },

  /* ── The pages panel (D-34) ────────────────────────────────────────────── */
  //
  // Three entries because a picture can reach a page three ways once she can
  // edit it: swapped into one of the seven beats' slots, put behind a band she
  // added, or placed inside one. All three are hers to clear from a screen, so
  // unlike the authored plates above none of them carries `inCode` — the
  // refusal names the page and hands her the link.
  //
  // BOTH COPIES COUNT. A picture named only by the DRAFT is still in use:
  // deleting it would empty a band she is in the middle of composing and has
  // not published yet, which is a worse surprise than the live case because
  // nothing on the public site would show her it had happened.
  {
    column: "PagePicture.ref",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.pagePicture.findMany({
        select: { page: true, state: true, key: true, ref: true },
      });
      return rows
        .filter((row) => present(row.ref))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.ref,
          what: pageSlotUse(row.key, row.state),
          href: `/admin/pages/${row.page}`,
        }));
    },
    repoint: (from, to) =>
      prisma.pagePicture
        .updateMany({ where: { ref: from }, data: { ref: to } })
        .then((result) => result.count),
  },
  {
    column: "PageSection.imageRef",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.pageSection.findMany({
        where: { imageRef: { not: null } },
        select: { page: true, state: true, position: true, imageRef: true },
      });
      return rows
        .filter((row) => present(row.imageRef))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.imageRef as string,
          what: `the photograph behind the ${ordinal(row.position + 1)} section of the ${row.page} page${row.state === "draft" ? ", in the copy you are editing" : ""}`,
          href: `/admin/pages/${row.page}`,
        }));
    },
    repoint: (from, to) =>
      prisma.pageSection
        .updateMany({ where: { imageRef: from }, data: { imageRef: to } })
        .then((result) => result.count),
  },
  {
    column: "PageBlock.imageRef",
    kind: MediaKind.picture,
    load: async () => {
      const rows = await prisma.pageBlock.findMany({
        where: { imageRef: { not: null } },
        select: {
          imageRef: true,
          section: { select: { page: true, state: true, position: true } },
        },
      });
      return rows
        .filter((row) => present(row.imageRef))
        .map((row) => ({
          kind: MediaKind.picture,
          ref: row.imageRef as string,
          what: `a picture in the ${ordinal(row.section.position + 1)} section of the ${row.section.page} page${row.section.state === "draft" ? ", in the copy you are editing" : ""}`,
          href: `/admin/pages/${row.section.page}`,
        }));
    },
    repoint: (from, to) =>
      prisma.pageBlock
        .updateMany({ where: { imageRef: from }, data: { imageRef: to } })
        .then((result) => result.count),
  },
];

/** "first", "second" — she counts sections by eye, not from zero. */
function ordinal(n: number): string {
  const words = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  return words[n - 1] ?? `${n}th`;
}

/**
 * Which slot on one of the seven beats this is, said so she can go and find it.
 *
 * The slot catalogue already carries a phrase she would use for every editable
 * picture on the page — "the opening photograph", "your portrait" — so this
 * reads it rather than keeping a second list that could fall out of step.
 */
function pageSlotUse(key: string, state: string): string {
  const slot = pictureSlot(key);
  const named = slot ? slot.label.toLowerCase() : `the picture at ${key}`;
  const beat = BEAT_LABELS.get(key.split(".")[0]);
  const where = beat ? ` on “${beat}”` : "";
  const copy = state === "draft" ? ", in the copy you are editing" : "";
  return `${named}${where}, on the home page${copy}`;
}

const BEAT_LABELS = new Map(
  BEATS.map((beat) => [beat.key as string, beat.label]),
);

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

/** What a repoint did, and what it could not do. */
export type Repointed = {
  /** How many references now name the survivor instead of the copy. */
  moved: number;
  /**
   * The uses no database write can reach, in her words. Non-empty means
   * NOTHING was moved — see below.
   */
  refused: string[];
};

/**
 * Move every reference off one thing and onto another.
 *
 * THE ONLY CALLER IS THE DUPLICATE MERGE, and the only pair it is ever handed
 * is two rows with identical bytes. That is what makes this safe to do at all:
 * every page involved goes on showing the same photograph, because the two
 * files ARE the same photograph. Nothing here should be used to point a page at
 * a different picture; that is a decision she makes on the page.
 *
 * IT CHECKS BEFORE IT WRITES, AND IT IS ALL OR NOTHING. If any reference to
 * `from` sits at a site with no `repoint` — today that means the home page's
 * own photographs, which live in code — this moves NOTHING and names them. A
 * merge that moved eight references and left the ninth would leave the ninth
 * page pointing at a file the caller is about to delete, and a photograph would
 * vanish off the front of the site for a reason nobody could reconstruct six
 * months later.
 *
 * THE WRITES ARE NOT IN ONE TRANSACTION, and the caller's ORDER is what makes
 * that survive a crash. Every reference is moved before anything is deleted, so
 * the worst a half-finished run can leave is some pages on the survivor, some
 * on the copy, and both files still on disk — untidy, and nothing broken. The
 * opposite order would leave a page naming a file that has gone. Sixteen sites
 * against tables a sole practitioner measures in tens of rows do not need a
 * transaction; they need the right order, which they have.
 */
export async function repointEverywhere(
  kind: MediaKind,
  from: string,
  to: string,
): Promise<Repointed> {
  // Asked of the sites that CANNOT be rewritten, rather than inferred from the
  // `inCode` flag on a use. The two happen to coincide today — the home page is
  // both the only unwritable site and the only one that sets that flag — and
  // reading the flag would quietly stop being right the first time somebody
  // added a site that is unwritable for a different reason.
  const refused: string[] = [];
  for (const site of SITES) {
    if (site.kind !== kind || site.repoint) continue;
    const uses = await site.load();
    for (const use of uses) if (use.ref === from) refused.push(use.what);
  }
  if (refused.length > 0) return { moved: 0, refused };

  let moved = 0;
  for (const site of SITES) {
    if (site.kind !== kind || !site.repoint) continue;
    moved += await site.repoint(from, to);
  }
  return { moved, refused: [] };
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
 * WHAT IT NEVER DOES IS OVERWRITE. A row that exists is hers — so adoption only
 * ever fills in rows that are not there. The one exception is documents, which get their
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

  // LAST, and after the inserts above, so a row created on this very pass gets
  // its hash on this very pass rather than on the next page load. This is what
  // makes the duplicate panel true the first time she opens the screen: the
  // thirty-eight photographs that shipped with the code were never uploaded
  // through this app, so nothing else would ever have hashed them.
  await backfillHashes();
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
 *
 * THE HASH COMES FROM THE UPLOAD that just ran, rather than being read back off
 * the disk: `ingestImage` has the derivative's bytes in hand and hands the hash
 * over with the basename, so this is one write rather than a write and a
 * re-read. `update` fills it in on a row that predates the hash — a picture
 * adopted from disk and then uploaded again would otherwise keep its null and
 * go on being invisible to the guard.
 */
export async function recordPicture(
  basename: string,
  hash: string,
): Promise<void> {
  await prisma.mediaAsset.upsert({
    where: { kind_ref: { kind: MediaKind.picture, ref: basename } },
    update: { hash },
    create: {
      kind: MediaKind.picture,
      ref: basename,
      hash,
      addedAt: new Date(),
    },
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
  const onALetter = await prisma.newsletterAttachment.findFirst({
    where: { storedAs },
    select: { id: true },
  });
  if (onALetter) return true;

  // OR LINKED FROM A PAGE THAT IS LIVE (D-35). The rule did not change when
  // pages could carry links — it is the same rule reaching a second surface: a
  // document is public exactly when something public points at it. LIVE and not
  // draft, deliberately: a link she has written and not published points at
  // nothing anybody can reach, so the file is not public yet either, and it
  // becomes public at the same moment the link does.
  const onALivePage = await prisma.pageItem.findFirst({
    where: {
      href: documentHref(storedAs, true),
      block: { section: { state: "live" } },
    },
    select: { id: true },
  });
  return onALivePage !== null;
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
