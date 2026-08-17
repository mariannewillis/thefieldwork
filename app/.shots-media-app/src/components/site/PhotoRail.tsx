"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The stills rail, and the photograph opened.
 *
 * Ported from docs/screens/webapp/workshop-detail.html, whose comments say
 * exactly what the built version must do. Keeping to them:
 *
 *  · ONE dialog for the whole set, opened with `showModal()`. Next and
 *    Previous swap the picture and its caption IN PLACE. This replaces a
 *    `:target` lightbox that wrote a new hash on every step — a new hash is a
 *    navigation, a navigation destroyed and rebuilt the overlay, the page
 *    flashed through the scrim on every press, and the back button walked out
 *    through every photograph looked at. No CSS fixes that; the mechanism was
 *    the fault.
 *  · THE URL NEVER CHANGES. The rail click is prevented and nothing is pushed.
 *  · Escape closes it, the page behind is inert, focus is held inside, and
 *    focus returns to the photograph that opened it. All of that is what
 *    `showModal()` gives, rather than a description of it.
 *  · Left and Right arrows move through the set. At the two ends the
 *    corresponding button is disabled and drawn as an end — the set does not
 *    wrap.
 *  · A visually hidden status line announces the new position and caption each
 *    time the picture swaps.
 *
 * WITHOUT SCRIPT the dialog is `display: none` — a `<dialog>` with no `open`
 * attribute always is — and the rail keeps its anchors: `.rail > li:target` in
 * workshops.css opens the targeted picture to the full measure in place.
 * Nothing is lost and nothing is claimed. Every photograph is in the delivered
 * HTML at full opacity with its description on it; the dialog is an
 * interaction layer over a finished composition.
 */

export type RailImage = { url: string; alt: string };

export default function PhotoRail({ images }: { images: RailImage[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta;
        if (next < 0 || next >= images.length) return current;
        // If the button just pressed has become an end it has also lost focus.
        // Hand focus to the other one rather than dropping it on the floor and
        // stranding a keyboard user outside the controls.
        const active = document.activeElement;
        if (next === 0 && active === prevRef.current) nextRef.current?.focus();
        if (next === images.length - 1 && active === nextRef.current) {
          prevRef.current?.focus();
        }
        return next;
      });
    },
    [images.length],
  );

  // Both listeners are NATIVE and both are on the dialog element, which is the
  // shape the approved screen's script asks a builder to keep. `close` has to
  // be: it is the one event that fires for all three ways out — the button,
  // the backdrop and Escape — and it is where focus is handed back. The arrow
  // keys sit beside it rather than on a React prop so there is one place to
  // read what this dialog listens to, and so nothing depends on how React
  // delegates events to an element the browser has moved into the top layer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => {
      // showModal() makes the page behind inert but does not stop it scrolling
      // under the plate, so the root is held while the dialog is open.
      document.documentElement.classList.remove("lb-open");
      openerRef.current?.focus();
      openerRef.current = null;
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

    dialog.addEventListener("close", onClose);
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [step]);

  if (images.length === 0) return null;

  const current = images[index];

  function open(position: number, event: React.MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks alone — opening a photograph in a new tab is a
    // reasonable thing to want.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;

    event.preventDefault(); // the hash is never written
    openerRef.current = event.currentTarget;
    setIndex(position);
    dialog.showModal();
    document.documentElement.classList.add("lb-open");
    closeRef.current?.focus();
  }

  return (
    <>
      <ul className="rail mt-9" id="stills">
        {images.map((image, position) => (
          <li key={`${image.url}-${position}`} id={`photo-${position + 1}`}>
            <a
              className="shot"
              href={`#photo-${position + 1}`}
              onClick={(event) => open(position, event)}
            >
              <picture>
                <source
                  type="image/avif"
                  srcSet={`/media/${image.url}-1200.avif`}
                />
                <source
                  type="image/webp"
                  srcSet={`/media/${image.url}-1200.webp`}
                />
                {/* No loading="lazy" on any of these on purpose: a lazy image
                    below the fold does not paint in a static full-page
                    screenshot, and a strip that reviews as an empty band is
                    the same failure as one gated behind a scroll-reveal. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${image.url}-1200.jpg`}
                  alt={image.alt}
                  width={1600}
                  height={1067}
                  className="aspect-[3/2] w-full object-cover"
                />
              </picture>
              <span className="vh">&mdash; open this photograph larger</span>
            </a>
          </li>
        ))}
      </ul>

      {/* It carries no picture and no sentence of its own: the file and the
          caption are read off the rail photograph that was clicked, so the
          caption IS that photograph's description and the two can never drift
          apart. The image takes an empty alt because the description is
          visible beneath it as the figure's caption — saying it twice to
          somebody on a screen reader helps nobody. */}
      <dialog
        ref={dialogRef}
        className="lb"
        aria-label="Photograph, larger"
        onClick={(event) => {
          // A click that lands on the dialog element itself is a click on the
          // backdrop: .lb-inner fills the plate edge to edge, so nothing else
          // can report the dialog as its target.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="lb-inner">
          <div className="lb-bar">
            <p className="lb-count">
              {index + 1} of {images.length}
            </p>
            <button
              ref={closeRef}
              className="lb-ctl t"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              <span className="lb-arrow" aria-hidden="true">
                &times;
              </span>
              Close
            </button>
          </div>

          <figure className="lb-fig">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${current.url}-2400.jpg`}
              alt=""
              width={1600}
              height={1067}
            />
            <figcaption className="lb-cap">{current.alt}</figcaption>
          </figure>

          <div className="lb-foot">
            <button
              ref={prevRef}
              className="lb-ctl t"
              type="button"
              disabled={index === 0}
              onClick={() => step(-1)}
            >
              <span className="lb-arrow" aria-hidden="true">
                &larr;
              </span>{" "}
              Previous
            </button>
            <button
              ref={nextRef}
              className="lb-ctl t"
              type="button"
              disabled={index === images.length - 1}
              onClick={() => step(1)}
            >
              Next{" "}
              <span className="lb-arrow" aria-hidden="true">
                &rarr;
              </span>
            </button>
          </div>
        </div>

        {/* One status line, not two. It says where you are and what you are
            looking at, in that order, each time the picture changes. */}
        <p className="vh" role="status">
          {index + 1} of {images.length}. {current.alt}
        </p>
      </dialog>
    </>
  );
}
