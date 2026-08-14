import { siteFooterLine, workshopsNav } from "@/content/workshops";

/**
 * The logo, the navigation and the footer line, as the approved workshops
 * screens draw them. Both pages carry them identically, so they are one
 * definition — the index and the detail page cannot drift apart into two
 * slightly different mastheads.
 *
 * The home page has its own masthead and footer in `home.css`'s vocabulary and
 * does not use these: it is a different composition, not a variant of this one.
 */

export function SiteNav({
  /**
   * Which entry this page IS, as its href. The seeded navigation carries a
   * `current` flag of its own for the workshops pages it was written for; a
   * page that is somewhere else says so here rather than the content module
   * growing one list per section.
   */
  current,
}: {
  current?: string;
} = {}) {
  return (
    <div className="flex items-center justify-between py-7">
      <a href="/" aria-label="The Field Work — home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-horizontal.svg"
          alt="The Field Work"
          width={440}
          height={120}
          className="h-[52px] w-auto"
        />
      </a>
      <nav
        className="hidden items-center gap-8 text-[17px] md:flex"
        aria-label="Main"
      >
        {workshopsNav.map((item) => {
          const here = current
            ? item.href === current
            : "current" in item && item.current;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={here ? "page" : undefined}
              className={
                here
                  ? "t text-plate-text underline decoration-gold underline-offset-8"
                  : "t text-plate-soft hover:text-plate-text"
              }
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-plate-rule/30">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
        <p className="fig font-mono text-[15px] text-plate-rule">
          {siteFooterLine}
        </p>
      </div>
    </footer>
  );
}

/**
 * A photograph from the media pipeline, at the two widths it emits, in the
 * three formats it emits. Same shape as the home page's `Plate` — one
 * basename, six files, the browser picks (D-6).
 */
export function Photograph({
  basename,
  alt,
  className,
  width,
  height,
  priority = false,
}: {
  basename: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /** True for the masthead, which is the LCP element; everything else waits. */
  priority?: boolean;
}) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`/media/${basename}-1200.avif 1200w, /media/${basename}-2400.avif 2400w`}
      />
      <source
        type="image/webp"
        srcSet={`/media/${basename}-1200.webp 1200w, /media/${basename}-2400.webp 2400w`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${basename}-2400.jpg`}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? undefined : "lazy"}
      />
    </picture>
  );
}
