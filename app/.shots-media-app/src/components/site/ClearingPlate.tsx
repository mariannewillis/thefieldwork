import type { CSSProperties } from "react";
import type { Plate } from "@/content/home";

/**
 * The photograph behind one beat of /about or /contact.
 *
 * Same job and same shape as the home page's own `Plate` — one basename, six
 * files, the browser picks (D-6) — but it belongs to the two pages that are
 * drawn in the workshops stylesheet's vocabulary rather than in home.css, so it
 * is a component both of them import instead of a function copied into each.
 *
 * THE FILTER TRAVELS AS CUSTOM PROPERTIES, not as a Tailwind class: brightness
 * is tuned per photograph (0.42 on the room, 0.5 on the hands) and a utility
 * for each value would be a class per picture. `.plate` in workshops.css reads
 * `--b`, `--ox` and `--oy` and does the rest.
 *
 * IT IS PAINTED, ALWAYS. Nothing here starts at opacity 0 and nothing waits for
 * a scroll: the page is whole in a static screenshot and whole with script
 * switched off, which is the mockup-safe rule the approved screens were drawn
 * to and the craft checklist's C-5.
 *
 * `priority` on the first beat only — it is the LCP element on both pages;
 * everything below it waits.
 */
export default function ClearingPlate({
  plate,
  priority = false,
}: {
  plate: Plate;
  /** True for the hero beat, which is the LCP element. */
  priority?: boolean;
}) {
  const style = {
    "--b": plate.b,
    "--ox": plate.ox,
    "--oy": plate.oy,
  } as CSSProperties;

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`/media/${plate.src}-1200.avif 1200w, /media/${plate.src}-2400.avif 2400w`}
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet={`/media/${plate.src}-1200.webp 1200w, /media/${plate.src}-2400.webp 2400w`}
        sizes="100vw"
      />
      {/* Decorative on every beat: the words beside it say what the page says,
          and a described photograph behind prose is the same sentence twice.
          The one picture on either page that DOES carry a description is her
          portrait, which is content — see the about page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="plate"
        src={`/media/${plate.src}-2400.jpg`}
        alt=""
        aria-hidden="true"
        style={style}
        loading={priority ? undefined : "lazy"}
      />
    </picture>
  );
}
