import { siteFooter, siteNav } from "@/content/site";
import "./site-chrome.css";

/**
 * The masthead and the footer, as every public page draws them.
 *
 * One definition for the whole site, the home page included. There were three
 * mastheads until 2026-08-15: the home page's own `.masthead` in home.css at a
 * fluid 74–104px with five in-page anchors; the workshops, courses and
 * services pages at a fixed 52px with four links to elsewhere; and the
 * cancellation and balance-payment pages at 56px with no nav at all. There
 * were three footers to match — the home page's full one, a single grey
 * sentence on the section pages, and a hand-copied duplicate of that sentence
 * on the two transactional pages.
 *
 * Both bands are full-bleed and sit on the same gutter on every page, so the
 * logo's left edge and the last tab's right edge do not move as you navigate.
 * The page CONTENT keeps its own measure underneath; only the chrome is shared.
 *
 * The styles are hand CSS in `site-chrome.css` rather than utilities because
 * the home page does not load Tailwind; see the note at the top of that file.
 */

/**
 * The lockup, linked home, at the site's one logo size. Every surface that
 * shows the mark uses this.
 */
export function SiteBrand({ className }: { className?: string } = {}) {
  return (
    <a
      className={className ?? "site-brand"}
      href="/"
      aria-label="The Field Work — home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-horizontal.svg"
        alt="The Field Work"
        width={440}
        height={120}
        className="site-brand__logo"
      />
    </a>
  );
}

export function SiteNav({
  /**
   * Which entry this page IS, as its href. The home page passes nothing: it is
   * not one of the four sections, so none of them is marked.
   */
  current,
}: {
  current?: string;
} = {}) {
  return (
    <header className="site-head">
      <SiteBrand />
      <nav className="site-head__nav" aria-label="Main">
        {siteNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            // The gold marker is styled off this attribute, so a page cannot
            // look current without also announcing it.
            aria-current={item.href === current ? "page" : undefined}
            className="site-head__link"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

/**
 * The footer: the altar photograph, the mark, three columns and the compliance
 * paragraph. This was the home page's ending and is now every page's.
 *
 * EVERY ENTRY NOW CARRIES AN HREF. There were four without one when this
 * footer became the whole site's; /subscribe (2026-08-16), /about and then
 * /privacy (both 2026-08-17) took theirs back as their pages were built.
 *
 * The href-less branch below is KEPT rather than deleted, and so is
 * `.site-foot__soon` in site-chrome.css. `href` is still optional on the type
 * in content/site.ts, so the next entry added before its page exists renders as
 * the honest dimmed word instead of as a link to a 404 — which is the whole
 * behaviour this branch exists for and the reason all four of them landed
 * safely. Idle, not dead.
 */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      {/* MUST be a direct child of .site-foot and MUST carry the class. The
          band is laid out with
            .site-foot > :not(.site-foot__plate) { position: relative; z-index: 1 }
          so any wrapper element here is caught by that rule, becomes the
          positioning context, and collapses this inset:0 image to zero height.
          A <picture> wrapper did exactly that on the home page and the plate
          vanished. A bare <img> with the JPEG costs 0.24MB against 0.09MB for
          the AVIF, which is the price of not fighting the approved layout. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="site-foot__plate"
        src={`/media/${siteFooter.plate.src}-2400.jpg`}
        alt={siteFooter.plate.alt}
        loading="lazy"
      />

      <SiteBrand className="site-foot__brand" />

      <div>
        <div className="site-foot__cols">
          {siteFooter.cols.map((col) => (
            <div key={col.heading}>
              <h3>{col.heading}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      // No page to send anyone to yet. The words stay, the
                      // link does not — see siteFooter in content/site.ts.
                      <span className="site-foot__soon">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="site-foot__legal">
          <span className="site-foot__place">{siteFooter.place}</span>
          {siteFooter.legal}
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
