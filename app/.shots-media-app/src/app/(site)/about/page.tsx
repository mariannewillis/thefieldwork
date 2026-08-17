import type { Metadata } from "next";
import ClearingPlate from "@/components/site/ClearingPlate";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { about } from "@/content/about";

/**
 * The practitioner at length (brief §11) — the practice, then Marianne.
 *
 * Ported from docs/screens/webapp/about.html, the approved composition, the way
 * the workshop and course pages were ported from theirs: the structure is
 * preserved beat for beat, the stylesheet is the one the screen was drawn
 * against (workshops.css, through about/layout.tsx), and every string comes
 * from @/content/about rather than being inlined so the portal can reach them.
 *
 * THREE BEATS, and the anchor alternates — left, right, left — which is the
 * signature move of this direction: one hard-edged clearing per viewport, cut
 * out of a full-bleed plate, and nothing crossing a pool's edge.
 *
 *   1  THE PRACTICE   small pool, left, low on the hero photograph
 *   2  MARIANNE       the diptych: her portrait in its own frame, her words in
 *                     the clearing beside it. Two flex siblings, so the circle
 *                     and the pool CANNOT overlap — it is geometry, not a
 *                     guessed crop.
 *   3  BEFORE YOU BOOK  small pool, left, and the one link off this page.
 *
 * WHAT CHANGED ON THE WAY IN, and why:
 *
 *  · The screen drew its own masthead and its own five-tab nav. There is one
 *    masthead for the site now (2026-08-15) and this uses it — `SiteNav`,
 *    floated over the hero photograph the way the home page floats it, so the
 *    mark's left edge does not move between here and anywhere else.
 *  · The screen had no footer. This gets the site's, like every other page.
 *  · "the room she has practised in since she started" is gone from beat 1's
 *    body. It reads as a small warm detail and it is a CLAIM ABOUT HER HISTORY
 *    that nobody has confirmed — brief §20.1 marks even her name and her years
 *    unverified. What replaces it says the thing the sentence was there for:
 *    the person who reads your message is the person you sit with. See the rule
 *    at the top of content/about.ts.
 *  · "No group classes on this page" is gone from beat 2. It was true of the
 *    screen and is false of this site, which sells workshops and courses.
 */

export const metadata: Metadata = {
  title: about.meta.title,
  description: about.meta.description,
  alternates: { canonical: "/about" },
};

export default function Page() {
  const { practice, person, beforeYouBook } = about;

  return (
    <>
      {/* ══ BEAT 1 — THE PRACTICE ═══════════════════════════════════════════
          The masthead floats over the photograph rather than sitting above it
          in the flow, so the first thing on the page is the picture. */}
      <section className="clearing relative flex min-h-[100svh] items-end overflow-hidden pb-[clamp(48px,7vh,96px)] pt-[clamp(150px,20vh,240px)]">
        <ClearingPlate plate={practice.plate} priority />

        <div className="absolute inset-x-0 top-0 z-10">
          <SiteNav current="/about" />
        </div>

        <div className="pool on-pool relative z-[2] w-full max-w-[380px] px-8 py-8 sm:max-w-[460px] sm:px-10 sm:py-10">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {practice.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[32px] font-normal leading-[1.08] text-ink sm:text-[40px]">
            {practice.heading}
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
            {practice.body}
          </p>
          <p className="mt-5 border-t border-pool-rule/[.22] pt-5 text-[17px] leading-relaxed text-ink-soft">
            {practice.verbs}
          </p>
        </div>
      </section>

      {/* ══ BEAT 2 — MARIANNE ═══════════════════════════════════════════════
          Two flex siblings, not a pool anchored over a shared background: her
          portrait frame and the clearing never share a box, so a pool edge can
          never fall across her face. That was the fix the approved screen's own
          comment records, and it is preserved here. */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden sm:flex-row">
        {/* Frame A — the portrait, over a plate with nobody in it. */}
        <div className="relative flex min-h-[46vh] flex-1 items-center justify-center overflow-hidden sm:min-h-full sm:flex-[0_0_42%]">
          <ClearingPlate plate={person.plate} />
          {/* The one photograph on this page that is CONTENT rather than
              atmosphere, so it is the one that carries a description. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="portrait relative z-[1]"
            src={`/media/${person.portrait.src}-1200.jpg`}
            alt={person.portrait.alt}
            loading="lazy"
          />
        </div>

        {/* Frame B — the clearing, and her own words in it. */}
        <div className="pool on-pool relative z-[2] flex flex-1 items-center px-6 py-12 sm:px-[clamp(32px,4vw,64px)] sm:py-16">
          <div className="max-w-[560px]">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
              {person.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
              {person.lead}
            </h2>
            {person.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-5 text-[19px] leading-relaxed text-ink-soft"
              >
                {paragraph}
              </p>
            ))}

            {/* WHAT SHE DOES — three statements and not one number. A year, a
                school or a certificate goes in here only when she has said it;
                until then the page is written to work without them. */}
            <div className="mt-9 border-t border-pool-rule/[.22] pt-6">
              <h3 className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                {person.credentialLabel}
              </h3>
              <ul className="mt-3 list-none p-0">
                {person.credentials.map((line) => (
                  <li
                    key={line}
                    className="border-t border-pool-rule/[.22] py-3 text-[17px] leading-snug text-ink first:border-t-0"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ BEAT 3 — BEFORE YOU BOOK ════════════════════════════════════════ */}
      <section className="clearing relative flex min-h-[62vh] items-center overflow-hidden py-16">
        <ClearingPlate plate={beforeYouBook.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[420px] px-8 py-8 sm:px-10 sm:py-10">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {beforeYouBook.eyebrow}
          </p>
          <p className="mt-4 text-[19px] leading-relaxed text-ink-soft">
            {beforeYouBook.body}
          </p>
          <a
            href={beforeYouBook.linkHref}
            className="t mt-7 inline-flex min-h-[56px] items-center gap-3 border border-action px-8 text-[18px] font-semibold text-action hover:bg-action hover:text-pool"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-[16px] w-[16px] shrink-0"
            >
              <rect x="3" y="5" width="18" height="14" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            {beforeYouBook.linkLabel}
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
