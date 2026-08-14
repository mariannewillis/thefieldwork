"use client";

import { useState } from "react";

/**
 * The film, not loaded until somebody asks for it.
 *
 * An ordinary Vimeo or YouTube embed reaches the provider the moment the page
 * opens: it sets cookies, and it reports that this address was read, by this
 * person, before anybody pressed anything. On a page for a hands-off healing
 * practice — a site with a privacy notice on it saying who receives what —
 * that is a third party told something the visitor did not offer.
 *
 * So what renders is the still, as a button. The provider is not contacted
 * until it is pressed, and the line under it says whose player is about to
 * open, because being asked is the whole point.
 *
 * IT RENDERS WHOLE WITHOUT SCRIPT. The still, the length and a plain link to
 * the film are all in the delivered HTML; only the swap for the player needs
 * JavaScript, and without it the link still gets somebody to the film.
 */
export default function FilmEmbed({
  embedUrl,
  watchUrl,
  providerName,
  poster,
  duration,
  title,
}: {
  embedUrl: string;
  watchUrl: string;
  providerName: string;
  /** The still's media basename, fetched from the provider when the link was saved. */
  poster: string | null;
  duration: string | null;
  /** The workshop's name — what the player is announced as. */
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="mt-7">
      <div className="relative aspect-video w-full overflow-hidden bg-surface">
        {playing ? (
          <iframe
            // autoplay, because it is the second press that would otherwise be
            // needed to start something she already asked to start.
            src={`${embedUrl}&autoplay=1`}
            title={`${title} — film`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="t group absolute inset-0 h-full w-full cursor-pointer"
          >
            {poster && (
              <picture>
                <source
                  type="image/avif"
                  srcSet={`/media/${poster}-1200.avif 1200w, /media/${poster}-2400.avif 2400w`}
                  sizes="(min-width: 1024px) 720px, 100vw"
                />
                <source
                  type="image/webp"
                  srcSet={`/media/${poster}-1200.webp 1200w, /media/${poster}-2400.webp 2400w`}
                  sizes="(min-width: 1024px) 720px, 100vw"
                />
                {/* Empty alt on purpose. The description of this picture is
                    the button's own words, said once — a still that repeated
                    them would say the same thing twice to a screen reader. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${poster}-1200.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </picture>
            )}

            {/* A veil over the still. The words on top have to be readable
                whatever the film opens on, and a frame chosen by Vimeo can be
                a bright sky as easily as a dim room — so the plate is dimmed
                to the page's own ground and lifts when the pointer is on it. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-ground/55 transition-colors duration-300 group-hover:bg-ground/30"
            />

            {/* The mark, and the words beside it. Gold on the dark ground,
                which is where gold belongs on this site. */}
            <span className="absolute inset-0 flex items-center justify-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold bg-ground/60 text-[20px] text-gold transition-colors duration-300 group-hover:bg-gold group-hover:text-ground"
              >
                &#9654;
              </span>
              <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-text">
                Play the film
                {duration && (
                  <span className="text-plate-soft"> &middot; {duration}</span>
                )}
              </span>
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 fig font-mono text-[15px] text-plate-rule">
        {playing ? (
          <>Playing from {providerName}.</>
        ) : (
          <>
            The film opens in {providerName}&rsquo;s player, and nothing is
            loaded from {providerName} until you press it.{" "}
            <a
              className="t text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
              href={watchUrl}
            >
              Watch it there instead
            </a>
            .
          </>
        )}
      </figcaption>
    </figure>
  );
}
