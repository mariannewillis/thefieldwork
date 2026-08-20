"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteAsset } from "@/app/(admin)/admin/media/actions";
import type { LibraryRow } from "@/components/admin/MediaLibrary";

/**
 * ONE FILM, WATCHED WHERE IT IS LISTED (operator, 2026-08-20).
 *
 * A film in the library used to be a line of text with its address printed
 * underneath — so the only way to find out WHICH film it was, was to open it on
 * YouTube in another tab and come back. The grid gives her the still; this
 * gives her the film.
 *
 * THE PLAYER IS NOT LOADED UNTIL SHE PRESSES PLAY, exactly as `FilmEmbed` does
 * on the public side and for the same reason: an iframe from YouTube is
 * YouTube, arriving with everything YouTube brings, and it should arrive
 * because somebody asked. Until then this is a still and a button.
 *
 * IT IS PORTALLED, because it is opened from inside a grid cell and a `<dialog>`
 * inside a list item inherits that stacking context — the same reason
 * `DetailSheet` is portalled.
 */

const NOTHING = { ok: true, error: null };

export type FilmAt = {
  index: number;
  /** True when she pressed the bin on the tile rather than the still. */
  asking: boolean;
};

export type ViewerFilm = {
  row: LibraryRow;
  /** The provider's still, as a media basename. Null if nothing uses it yet. */
  poster: string | null;
  embedUrl: string | null;
  watchUrl: string;
  providerName: string;
};

export default function FilmViewer({
  films,
  at,
  onClose,
}: {
  films: ViewerFilm[];
  /** Null while it is shut. */
  at: FilmAt | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState(deleteAsset, NOTHING);

  useEffect(() => setMounted(true), []);

  // Opened on a different film, or opened at all: the player closes and the
  // question resets. A film left playing behind a shut dialog is a voice in
  // the room with no picture.
  useEffect(() => {
    setPlaying(false);
    setAsking(at?.asking ?? false);
  }, [at?.index, at?.asking]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (at && !dialog.open) dialog.showModal();
    if (!at && dialog.open) dialog.close();
  }, [at]);

  if (!mounted) return null;

  const film = at ? films[at.index] : null;

  return createPortal(
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={film ? (film.row.title ?? "A film") : "A film"}
      /* `modal` is the portal's own dialog rule — no border, no padding,
         `margin: auto` (Tailwind's preflight zeroes it, and without that a
         dialog lands in the top-left corner), and it scrolls inside itself.
         The width is widened past its 560px because this one holds a
         16:9 player. */
      className="modal pool on-pool !max-w-[min(920px,calc(100vw-32px))] text-ink"
    >
      {film && (
        <div className="p-7 sm:p-9">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
            <div>
              <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
                {film.providerName}
              </p>
              <h2 className="mt-2 font-display text-[28px] leading-tight text-ink">
                {film.row.title ?? "A film"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="t min-h-[44px] text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
            >
              Close
            </button>
          </div>

          {/* THE STILL, THEN THE PLAYER. The aspect box is on the wrapper so
              nothing jumps when the iframe replaces the image. */}
          <div className="relative mt-6 aspect-video w-full bg-ink/10">
            {playing && film.embedUrl ? (
              <iframe
                src={`${film.embedUrl}${film.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
                title={film.row.title ?? "A film"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <>
                {film.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/media/${film.poster}-1200.jpg`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  disabled={!film.embedUrl}
                  className="t absolute inset-0 flex items-center justify-center bg-ink/35 hover:bg-ink/20 disabled:bg-ink/45"
                >
                  <span className="bg-action px-7 py-3 text-[17px] font-semibold text-pool">
                    {film.embedUrl
                      ? "Play it"
                      : "This address is not one we can play"}
                  </span>
                </button>
              </>
            )}
          </div>

          <dl className="mt-7 border-t border-pool-rule/40 pt-5">
            <div className="flex flex-wrap gap-x-4 border-b border-pool-rule/25 py-3">
              <dt className="min-w-[9rem] fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                Where it is
              </dt>
              <dd className="m-0 min-w-0 flex-1 break-all text-[17px] text-ink">
                <a
                  href={film.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="t text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
                >
                  {film.watchUrl}
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-4 border-b border-pool-rule/25 py-3">
              <dt className="min-w-[9rem] fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                What it is
              </dt>
              <dd className="m-0 min-w-0 flex-1 text-[17px] text-ink">
                A link, not a file on this site &mdash; nothing of it is stored
                here but the address.
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-4 py-3">
              <dt className="min-w-[9rem] fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                Used on
              </dt>
              <dd className="m-0 min-w-0 flex-1 text-[17px] text-ink">
                {film.row.uses.length === 0
                  ? "Nothing points at it."
                  : film.row.uses.map((use) => use.what).join(" · ")}
              </dd>
            </div>
          </dl>

          {/* ASKED IN FRONT OF THE FILM, the same reasoning `PictureViewer`
              gives: the refusal names every page the thing is on, and that
              sentence does not fit in a grid cell. */}
          <div className="mt-6 border-t border-pool-rule/40 pt-5">
            {asking ? (
              <form
                action={action}
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <input type="hidden" name="kind" value={film.row.kind} />
                <input type="hidden" name="ref" value={film.row.ref} />
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

            {state.error && (
              <p
                role="alert"
                className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-pool-error"
              >
                {state.error}
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
