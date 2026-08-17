"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteAsset } from "@/app/(admin)/admin/media/actions";

/**
 * One photograph, opened from the grid, with the rest of the grid behind the
 * arrows.
 *
 * ── THE ONE THING THIS FILE EXISTS TO GET RIGHT ───────────────────────────
 *
 * STEPPING TO THE NEXT PICTURE IS NOT A NAVIGATION. Nothing here writes to the
 * address bar, pushes a history entry or changes a route: Next and Previous
 * swap `index`, and the same open `<dialog>` draws a different picture. The
 * public workshop gallery — `components/site/PhotoRail.tsx` — learned this the
 * expensive way. It was a `:target` lightbox, so every step wrote a new hash,
 * every hash was a navigation, the overlay was destroyed and rebuilt on each
 * press, the page behind flashed through the scrim between photographs, and the
 * back button then walked out through every picture that had been looked at.
 * The operator rejected it in those words. No CSS fixes that; the MECHANISM was
 * the fault, and the fix was one dialog for the whole set. This is that fix,
 * ported rather than reinvented — a second answer to a solved question is a
 * second thing to get wrong.
 *
 * ── THE TWO RULES IT INHERITS FROM `GalleryPicker` ────────────────────────
 *
 * 1. IT IS RENDERED THROUGH A PORTAL, into `document.body`. The Media screen
 *    carries forms — the per-item removals, the duplicates panel — and the
 *    remove control below is a form of its own. HTML has no nested forms, React
 *    refuses to hydrate them, and a page that fails to hydrate can leave every
 *    button on it inert; that is what stopped the newsletter's Save from ever
 *    running (D-30). `createPortal` moves the real DOM node out, and the things
 *    that would go wrong follow the DOM rather than the React tree.
 *
 * 2. NO `name` ON ANY BUTTON. React encodes which action a `formAction` button
 *    calls in its `name`, and setting our own produced the `$ACTION_REF_6`
 *    mismatch D-30 records. Nothing here carries `formAction` at all — the
 *    removal calls its server action directly — which is the sturdier version
 *    of the same rule.
 *
 * ── WHAT `showModal()` GIVES, rather than what this file describes ────────
 *
 * Escape closes it; focus goes inside and is held there; the page behind is
 * inert and cannot be tabbed into; focus returns to the tile that opened it.
 * The arrows are bound as a native listener on the dialog element for the
 * reason `PhotoRail` gives: the browser moves a modal dialog into the top
 * layer, and nothing here should depend on how React delegates events to it.
 *
 * IT DOES NOT WRAP. At either end the corresponding button is disabled and
 * drawn as an end — the same decision the public gallery made, so the two
 * behave alike, and so that pressing Next thirty-eight times cannot quietly
 * put her back where she started.
 */

/** One picture, as the viewer needs it. */
export type ViewerPicture = {
  /** The basename. Every address here is built from it. */
  ref: string;
  /** What the grid calls it — the basename with its hyphens opened out. */
  name: string;
};

/** Where the viewer opens, and whether it opens mid-question. */
export type ViewerAt = {
  index: number;
  /**
   * True when she pressed Remove on the tile rather than the picture itself.
   *
   * THE CONFIRMATION IS ASKED IN FRONT OF THE PHOTOGRAPH, deliberately. A
   * corner button on a small tile asks her to destroy something she is looking
   * at four centimetres wide, and the refusal — which names every page the
   * picture is on — does not fit in a grid cell without either truncating the
   * sentence or shoving the whole grid down under her hand. So the tile's
   * Remove opens this, on that picture, with the question already showing.
   */
  asking: boolean;
};

/** The full-measure derivative — the one every `<picture>` on the site falls back to. */
function large(ref: string): string {
  return `/media/${ref}-2400.jpg`;
}

export default function PictureViewer({
  pictures,
  at,
  onClose,
}: {
  pictures: ViewerPicture[];
  /** Null while it is shut. */
  at: ViewerAt | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const [index, setIndex] = useState(0);
  const [asking, setAsking] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  /**
   * Only mounted in the browser. `document` does not exist while this is
   * rendered on the server, and the portal needs it.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        if (next < 0 || next >= pictures.length) return current;
        // If the button just pressed has become an end it has also lost focus.
        // Hand focus to the other one rather than dropping it on the floor and
        // stranding a keyboard user outside the controls.
        const active = document.activeElement;
        if (next === 0 && active === prevRef.current) nextRef.current?.focus();
        if (next === pictures.length - 1 && active === nextRef.current) {
          prevRef.current?.focus();
        }
        return next;
      });
      // A question asked about one photograph is not a question about the next
      // one. Both the confirmation and any refusal are cleared on every step,
      // so "Yes, remove it" can never land on a picture she has moved past.
      setAsking(false);
      setRefusal(null);
    },
    [pictures.length],
  );

  /**
   * Where the caller last put us, so a new `at` can be told from a step.
   *
   * ADJUSTED DURING RENDER RATHER THAN IN AN EFFECT, which is React's own
   * pattern for "this state derives from a prop that changed" and is here for a
   * visible reason: an effect runs AFTER the paint, so opening on picture 12
   * would draw picture 1 for one frame and then correct itself. That flash is
   * the exact complaint the URL-driven lightbox earned, arrived at from the
   * other direction.
   */
  const [opened, setOpened] = useState<ViewerAt | null>(null);
  if (at !== opened) {
    setOpened(at);
    // Clamped, because the grid can shrink under a stale index — a second tab
    // removing a picture, or a refresh landing between the press and the paint.
    setIndex(at ? Math.min(Math.max(at.index, 0), pictures.length - 1) : 0);
    setAsking(at?.asking ?? false);
    setRefusal(null);
  }

  // Opening and shutting, driven by the caller. `showModal()` throws if the
  // dialog is already open, so both directions are guarded on its own state
  // rather than on ours.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (at && !dialog.open) dialog.showModal();
    if (!at && dialog.open) dialog.close();
  }, [at]);

  // Both listeners are NATIVE and both are on the dialog element. `close` has
  // to be: it is the one event that fires for all three ways out — the button,
  // the backdrop and Escape — and it is where the caller is told. The arrows
  // sit beside it so there is one place to read what this dialog listens to.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCloseEvent = () => {
      // showModal() makes the page behind inert but does not stop it scrolling
      // under the plate, so the root is held while the dialog is open.
      document.documentElement.classList.remove("pv-open");
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
      // Escape is left to the dialog.
    };

    dialog.addEventListener("close", onCloseEvent);
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("close", onCloseEvent);
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [step, onClose]);

  // Held here rather than in the open effect so it is taken off again by the
  // same code that put it on, whichever of the three ways out was used.
  useEffect(() => {
    if (!at) return;
    document.documentElement.classList.add("pv-open");
    closeRef.current?.focus();
    return () => document.documentElement.classList.remove("pv-open");
  }, [at]);

  if (!ready) return null;

  const current = at ? pictures[index] : undefined;

  /**
   * Taking it out, and being told no.
   *
   * THE SERVER ACTION IS CALLED DIRECTLY rather than through a `<form action=>`.
   * There is nothing a form would add here — no field to post, no progressive
   * enhancement to preserve on a control that only exists once a dialog has
   * been opened by script — and it keeps rule 2 above trivially true.
   *
   * THE REFUSAL IS THE SERVER'S SENTENCE, printed. `removeAsset` walks every
   * place a picture can be named and names them; nothing here decides whether a
   * deletion is allowed, which is the only way that check can stay honest as
   * new columns arrive.
   */
  function remove() {
    if (!current) return;
    const body = new FormData();
    body.set("kind", "picture");
    body.set("ref", current.ref);
    startRemoving(async () => {
      const result = await deleteAsset({ ok: true, error: null }, body);
      if (!result.ok) {
        setRefusal(result.error);
        setAsking(false);
        return;
      }
      // It is gone, so there is nothing left to look at: shut, and let the grid
      // redraw without it.
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="pv"
      aria-label="Picture, larger"
      onClick={(event) => {
        // A click that lands on the dialog element itself is a click on the
        // backdrop: `.pv-inner` fills the plate edge to edge, so nothing else
        // can report the dialog as its target.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {/* Drawn only while it is open, so each opening starts from a clean
          question rather than showing the answer to the last one. */}
      {current && (
        <div className="pv-inner">
          <div className="pv-bar">
            <p className="pv-count">
              {index + 1} of {pictures.length}
            </p>
            <button
              ref={closeRef}
              className="pv-ctl t"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              <span className="pv-arrow" aria-hidden="true">
                &times;
              </span>
              Close
            </button>
          </div>

          {/* The picture takes an empty alt: its name is on the line below it,
              and saying the same thing twice to somebody on a screen reader
              helps nobody. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-shot" src={large(current.ref)} alt="" />

          <div className="pv-foot">
            <button
              ref={prevRef}
              className="pv-ctl t"
              type="button"
              disabled={index === 0}
              onClick={() => step(-1)}
            >
              <span className="pv-arrow" aria-hidden="true">
                &larr;
              </span>{" "}
              Previous
            </button>
            <button
              ref={nextRef}
              className="pv-ctl t"
              type="button"
              disabled={index === pictures.length - 1}
              onClick={() => step(1)}
            >
              Next{" "}
              <span className="pv-arrow" aria-hidden="true">
                &rarr;
              </span>
            </button>
          </div>

          {/* ── Taking it out ───────────────────────────────────────────────
              TWO PRESSES, because it cannot be undone, and the question is
              asked in the place the button was so nothing moves under her
              hand. */}
          <div className="pv-remove">
            {asking ? (
              <>
                <button
                  className="pv-ctl pv-ctl-hot t"
                  type="button"
                  disabled={removing}
                  onClick={remove}
                >
                  {removing ? "Removing…" : "Yes, remove it"}
                </button>
                <button
                  className="pv-quiet t"
                  type="button"
                  onClick={() => setAsking(false)}
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                className="pv-quiet t"
                type="button"
                onClick={() => {
                  setRefusal(null);
                  setAsking(true);
                }}
              >
                Remove from the library
              </button>
            )}
          </div>

          {refusal && (
            <p className="pv-refusal" role="alert">
              {refusal}
            </p>
          )}
        </div>
      )}

      {/* One status line, not two. It says where you are and which photograph
          it is, in that order, each time the picture changes. */}
      <p className="pv-vh" role="status">
        {current ? `${index + 1} of ${pictures.length}. ${current.name}.` : ""}
      </p>
    </dialog>,
    document.body,
  );
}
