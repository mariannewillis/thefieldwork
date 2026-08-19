"use client";

import { useActionState, useState } from "react";
import {
  addLibraryDocument,
  addLibraryPicture,
  addLibraryVideo,
  deleteAsset,
} from "@/app/(admin)/admin/media/actions";
import {
  FIELD,
  HELP,
  LABEL,
  mediaSrc,
  QUIET_BUTTON,
} from "@/components/admin/OfferingFormParts";
import PictureViewer, { type ViewerAt } from "@/components/admin/PictureViewer";

/**
 * The library's own screen — the parts of it that have to react.
 *
 * THE PAGE IS NOT A FORM, which is why every control here can have one of its
 * own. That is the opposite of the newsletter sheet's problem (D-30): there, the
 * documents panel sat INSIDE the letter's form and its Remove buttons had to be
 * joined to forms rendered outside it by `form=`. Here there is no surrounding
 * form at all, so a per-item form is simply a form, and nothing is nested.
 *
 * IT DOES NOT ASK HER WHAT ANYTHING IS CALLED, and that is a simplification
 * rather than a loss. There was a "what is in it" field and a "what to call it"
 * field on every card, and both were asking for something the page that uses the
 * picture asks for again — `WorkshopImage.alt`, `CourseImage.alt` and
 * `ServiceImage.alt` are REQUIRED columns, and a letter's picture block will not
 * validate without one. The same photograph is the garden room on a workshop and
 * the room she works in on a session; the description belongs where the picture
 * is used, and it is written there.
 *
 * SO THE PICTURES ARE A GRID OF PICTURES. No name, no date, no list of pages
 * under each one — she recognises a photograph by looking at it, which is the
 * only thing a wall of forty thumbnails is good for. What each is used for is
 * still known and still enforced; it is said at the moment it matters, which is
 * when she tries to remove one.
 *
 * WHAT THIS SCREEN REFUSES TO DO is the interesting half. A picture in use
 * cannot be deleted, and the refusal is not a warning she can click past: the
 * server checks every place a picture can be named and hands back a sentence
 * saying where. See `lib/media/library.ts`.
 */

/** One thing in the library, as this screen needs it. */
export type LibraryRow = {
  id: number;
  kind: "picture" | "video" | "document";
  ref: string;
  title: string | null;
  contentType: string | null;
  bytes: number | null;
  /** Null means "already on the site" — nothing recorded when it arrived. */
  addedAt: string | null;
  /** Where it is named, in her words. Empty means nothing points at it. */
  uses: { what: string; href: string | null; inCode?: boolean }[];
  /** Documents only. */
  reachableWithoutASession: boolean;
  /** Documents only: where to open it, whichever route applies. */
  href: string | null;
};

const NOTHING = { ok: true, error: null };

/** "a PDF", "a Word document" — what she would call it, from what it is. */
export function kindWords(contentType: string | null): string {
  if (!contentType) return "a file";
  if (contentType === "application/pdf") return "a PDF";
  if (contentType === "image/jpeg") return "a JPEG";
  if (contentType === "image/png") return "a PNG";
  if (contentType.includes("wordprocessingml")) return "a Word document";
  if (contentType.includes("spreadsheetml")) return "a spreadsheet";
  if (contentType.includes("presentationml")) return "a PowerPoint";
  return "a file";
}

function sizeWords(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/**
 * Where it is used, or plainly that it is not.
 *
 * THE LIST IS THE POINT OF THIS SCREEN. "In use" on its own is a fact she can
 * do nothing with; "the picture at the top of Reading the Field" is a place she
 * can go. Each one is a link where a screen can clear it, and plain text where
 * nothing can — the home page's photographs are written into the code, and
 * pretending otherwise would send her looking for a control that is not there.
 */
function Uses({ uses }: { uses: LibraryRow["uses"] }) {
  if (uses.length === 0) {
    return (
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Not used anywhere. Safe to remove.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="fig font-mono text-[13px] uppercase tracking-[0.14em] text-ink">
        {uses.length === 1 ? "Used here" : `Used in ${uses.length} places`}
      </p>
      <ul className="mt-2 flex list-none flex-col gap-1 p-0">
        {uses.map((use, index) => (
          <li
            key={`${use.what}-${index}`}
            className="text-[15px] leading-relaxed text-ink-soft"
          >
            {use.href ? (
              <a
                href={use.href}
                className="t underline decoration-pool-rule underline-offset-4 hover:text-ink"
              >
                {use.what}
              </a>
            ) : (
              <>
                {use.what}
                {use.inCode && (
                  <span className="text-ink-soft">
                    {" "}
                    &mdash; set in the site&rsquo;s code, not on a screen
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Taking one out, and being told no.
 *
 * TWO PRESSES, because it cannot be undone. The first press asks; the second
 * does it. There is no modal — a confirmation sheet for a photograph is heavier
 * than the decision — and the question is asked in the place the button was, so
 * nothing moves under her hand.
 */
function Remove({ row }: { row: LibraryRow }) {
  const [state, action, pending] = useActionState(deleteAsset, NOTHING);
  const [asking, setAsking] = useState(false);

  return (
    <div className="mt-4">
      {asking ? (
        <form
          action={action}
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <input type="hidden" name="kind" value={row.kind} />
          <input type="hidden" name="ref" value={row.ref} />
          <button
            type="submit"
            disabled={pending}
            className="t min-h-[44px] bg-action px-5 text-[15px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
          >
            {pending ? "Removing…" : "Yes, remove it"}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="t min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
          >
            Keep it
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="t min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
        >
          Remove from the library
        </button>
      )}

      {/* The refusal, in the place the button was. It names every page the thing
          is on, because "it is in use" is not something she can act on. */}
      {state.error && (
        <p
          role="alert"
          className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}

/* ── The three tabs' contents ────────────────────────────────────────────── */

/** The basename, opened out into something readable. */
function nameOf(ref: string): string {
  return ref.replace(/-/g, " ");
}

/** A bin, at tile scale. The same drawing the bookings ledger deletes with. */
function BinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 13h10l1-13" />
    </svg>
  );
}

/**
 * The wall of photographs.
 *
 * TWO CONTROLS PER TILE AND NO WORDS. The picture opens the viewer; the bin in
 * its corner opens the SAME viewer on the SAME picture with the removal already
 * being asked. One removal, in one place, in front of a photograph big enough to
 * recognise — see `PictureViewer.tsx` for why the question is not asked on the
 * tile itself.
 *
 * The two are siblings rather than one inside the other, because a button
 * inside a button is not a thing HTML has.
 */
export function Pictures({ rows }: { rows: LibraryRow[] }) {
  const [at, setAt] = useState<ViewerAt | null>(null);

  if (rows.length === 0) {
    return <Empty what="pictures" />;
  }

  const pictures = rows.map((row) => ({
    ref: row.ref,
    name: nameOf(row.ref),
  }));

  return (
    <>
      <ul className="mt-8 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {rows.map((row, index) => (
          <li key={row.id} className="relative">
            <button
              type="button"
              onClick={() => setAt({ index, asking: false })}
              className="t block w-full border border-transparent p-0 hover:border-action"
            >
              {/* The name is the button's accessible name and nothing else —
                  said to a screen reader, never drawn. A photograph she can
                  see does not need labelling; a photograph she cannot see
                  needs nothing else. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(row.ref)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="sr-only">Open {nameOf(row.ref)}, larger</span>
            </button>

            {/* A control ON the photograph rather than a hole punched in it:
                a dark scrim and a light glyph read as something laid over a
                picture, where the panel's own blush read as a torn corner. It
                stays visible rather than appearing on hover, because a control
                that only exists under a pointer does not exist on a tablet. */}
            <button
              type="button"
              onClick={() => setAt({ index, asking: true })}
              className="t absolute right-1 top-1 flex h-11 w-11 items-center justify-center bg-ink/55 text-pool hover:bg-action"
            >
              <BinIcon />
              <span className="sr-only">
                Remove {nameOf(row.ref)} from the library
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Said once, under the grid, rather than as a field on every tile. */}
      <p className={HELP}>
        What a picture is called, and what it says to somebody who cannot see
        it, are set on the workshop, session, course or letter it is used on
        &mdash; because the same photograph means something different in each
        place.
      </p>

      <PictureViewer pictures={pictures} at={at} onClose={() => setAt(null)} />
    </>
  );
}

export function Videos({ rows }: { rows: LibraryRow[] }) {
  if (rows.length === 0) return <Empty what="films" />;

  return (
    <ul className="mt-8 flex list-none flex-col gap-0 p-0">
      {rows.map((row) => (
        <li key={row.id} className="border-t border-pool-rule/40 py-7">
          <p className="font-display text-[26px] leading-tight text-ink">
            {row.title ?? "A film"}
          </p>
          <p className="mt-2 break-all text-[15px] leading-relaxed text-ink-soft">
            <a
              href={row.ref}
              target="_blank"
              rel="noreferrer"
              className="t underline decoration-pool-rule underline-offset-4 hover:text-ink"
            >
              {row.ref}
            </a>
          </p>
          <p className="fig font-mono mt-2 text-[13px] text-ink-soft">
            A link, not a file on this site &middot;{" "}
            <Arrived addedAt={row.addedAt} />
          </p>
          <Uses uses={row.uses} />
          <Remove row={row} />
        </li>
      ))}
    </ul>
  );
}

export function Documents({ rows }: { rows: LibraryRow[] }) {
  if (rows.length === 0) return <Empty what="documents" />;

  return (
    <>
      <ul className="mt-8 flex list-none flex-col gap-0 p-0">
        {rows.map((row) => (
          <li key={row.id} className="border-t border-pool-rule/40 py-7">
            {/* ── PRESSING IT OPENS IT, IN A NEW TAB ───────────────────────────
              A NEW TAB BECAUSE THE FILE IS A DOWNLOAD, not a page. Both routes
              serve it with `Content-Disposition: attachment` — a PDF served
              inline runs its own JavaScript inside the browser's viewer on this
              origin, and this origin is the admin portal — so following it in
              this tab would leave her staring at the screen she was already on,
              wondering whether anything had happened.

              WHICH ROUTE IS NOT A GUESS. `href` is `documentHref`, and it
              picks: a document not yet on a letter is served from
              `/admin/media/file/…`, which requires a session; one that has gone
              out is served from `/newsletter-files/…`, which is the address in
              people's inboxes. So "open it and check" and "this is the link
              they got" are the same press for a public file, and the private
              one is never handed a link that would 404 for its recipient. */}
            <p className="font-display text-[26px] leading-tight text-ink">
              {row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="t underline decoration-pool-rule underline-offset-4 hover:text-action"
                >
                  {row.title ?? row.ref}
                </a>
              ) : (
                (row.title ?? row.ref)
              )}
            </p>
            <p className="fig font-mono mt-2 text-[13px] text-ink-soft">
              {kindWords(row.contentType)}
              {row.bytes ? ` · ${sizeWords(row.bytes)}` : ""} &middot;{" "}
              <Arrived addedAt={row.addedAt} />
            </p>

            {/* ── WHO CAN OPEN IT, in words rather than a padlock ───────────
              A document is admin-only until it goes on a letter, and reachable
              from that moment on — because a link in somebody's inbox has no
              session behind it. Both halves are said plainly, because "private"
              and "public" are the two states she is actually deciding between
              when she attaches something. */}
            {row.reachableWithoutASession ? (
              <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink">
                <strong className="font-semibold">
                  Anybody with the address can open this.
                </strong>{" "}
                It has gone out on a letter, so the link is in people&rsquo;s
                inboxes and cannot ask them to sign in. Nothing stops one of
                them forwarding it on.
              </p>
            ) : (
              <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink">
                <strong className="font-semibold">
                  Only you can open this.
                </strong>{" "}
                It is not on any letter yet, so it needs your sign-in. Put it on
                a letter and it becomes readable by anybody with the address
                &mdash; which is what has to happen for the link to work in
                somebody&rsquo;s inbox.
              </p>
            )}

            <Uses uses={row.uses} />
            <Remove row={row} />
          </li>
        ))}
      </ul>
      <p className={HELP}>
        Press a name to open the file in a new tab. What it is called is the
        filename it arrived under; a letter sends it out under that name.
      </p>
    </>
  );
}

/** When it arrived, or the honest answer that nothing recorded it. */
function Arrived({ addedAt }: { addedAt: string | null }) {
  if (!addedAt) return <>already on the site</>;
  return <>added {addedAt}</>;
}

function Empty({ what }: { what: string }) {
  return (
    <p className="mt-8 max-w-[54ch] text-[19px] leading-relaxed text-ink">
      Nothing in your {what} yet. Add something below, and anything you add
      anywhere else in the portal turns up here too.
    </p>
  );
}

/* ── Adding, per tab ─────────────────────────────────────────────────────── */

/**
 * The upload, and the one place a film is different.
 *
 * NO FILM UPLOAD, and the screen says why rather than leaving her hunting for a
 * control that does not exist. Her own source file is 604 MB; a site that
 * accepted that would need an encoding queue, somewhere to keep the output and a
 * way to tell her it had finished — three things to go wrong in place of a
 * provider that already does it.
 */
export function AddToLibrary({ kind }: { kind: LibraryRow["kind"] }) {
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /** "You already have this picture…" — a fact rather than a refusal. */
  const [held, setHeld] = useState<string | null>(null);
  /** "This picture is 828 pixels wide…" — a fact, like `held`, not a refusal. */
  const [soft, setSoft] = useState<string | null>(null);
  const [link, setLink] = useState("");

  async function take(input: HTMLInputElement) {
    const files = [...(input.files ?? [])];
    if (files.length === 0) return;
    input.value = "";
    setBusy(true);
    setRefused(null);
    setHeld(null);
    setSoft(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        const result =
          kind === "document"
            ? await addLibraryDocument(body)
            : await addLibraryPicture(body);
        if (!result.ok) {
          setRefused(result.error);
          break;
        }
        // Said for the LAST one that was already here rather than for each, so
        // dropping twelve photographs of which three are repeats leaves one
        // sentence to read instead of three stacked on top of each other.
        if (result.alreadyHeld) setHeld(result.alreadyHeld);
        if (result.soft) setSoft(result.soft);
      }
    } catch {
      setRefused("That did not get there. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    const raw = link.trim();
    if (!raw) return;
    setBusy(true);
    setRefused(null);
    setHeld(null);
    setSoft(null);
    try {
      const body = new FormData();
      body.set("url", raw);
      const result = await addLibraryVideo(body);
      if (!result.ok) {
        setRefused(result.error);
        return;
      }
      setLink("");
    } catch {
      setRefused("That did not get there. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-9 border-t border-pool-rule/40 pt-7">
      {kind === "video" ? (
        <>
          <p className={LABEL} id="add-film-label">
            Add a film
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            <input
              type="text"
              inputMode="url"
              aria-labelledby="add-film-label"
              placeholder="https://vimeo.com/76979871"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void paste();
              }}
              className={`${FIELD} min-w-[20rem] flex-1`}
            />
            <button
              type="button"
              onClick={() => void paste()}
              disabled={busy}
              className={`${QUIET_BUTTON} disabled:opacity-60`}
            >
              {busy ? "Adding…" : "Add this film"}
            </button>
          </div>
          <p className={HELP}>
            Films are links and never uploads. Put it on Vimeo or YouTube and
            paste the address &mdash; Vimeo for preference, because YouTube
            records who watched. Nothing is loaded from either until somebody
            presses play.
          </p>
        </>
      ) : (
        <>
          <p className={LABEL}>
            {kind === "document" ? "Add a document" : "Add a picture"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <label
              className={`${QUIET_BUTTON} inline-flex cursor-pointer items-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action`}
            >
              <input
                type="file"
                accept={
                  kind === "document"
                    ? ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                    : "image/jpeg,image/png,image/webp,image/avif"
                }
                multiple
                disabled={busy}
                onChange={(event) => void take(event.currentTarget)}
                className="sr-only"
              />
              {busy
                ? "Adding…"
                : kind === "document"
                  ? "Choose files"
                  : "Choose pictures"}
            </label>
          </div>
          <p className={HELP}>
            {kind === "document"
              ? "It stays private to you until you put it on a letter. Nothing else on the site can reach it."
              : "Each one is re-saved in six sizes so pages load quickly. What arrives is never what gets stored."}
          </p>
        </>
      )}

      {refused && (
        <p
          role="alert"
          className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-pool-error"
        >
          {refused}
        </p>
      )}

      {/* Not an alert. Nothing has gone wrong and there is nothing to recover
          from — the library simply already had it, and made no second copy. */}
      {held && (
        <p
          role="status"
          className="mt-4 max-w-[62ch] border-l-2 border-action pl-4 text-[17px] leading-relaxed text-ink"
        >
          {held}
        </p>
      )}

      {/* Also not an alert: the picture is in and she can use it. What she
          could not otherwise know is that it will look soft where the site
          draws one full width. */}
      {soft && (
        <p
          role="status"
          className="mt-4 max-w-[62ch] border-l-2 border-gold pl-4 text-[17px] leading-relaxed text-ink"
        >
          {soft}
        </p>
      )}
    </div>
  );
}
