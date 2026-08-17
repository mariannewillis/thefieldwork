import type { Metadata } from "next";
import ClearingPlate from "@/components/site/ClearingPlate";
import ContactPanel from "@/components/site/ContactPanel";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { contact } from "@/content/contact";

/**
 * Contact — the form, and the address for people who will not use one.
 *
 * Ported from docs/screens/webapp/contact.html, the approved composition: two
 * beats, one hard-edged clearing per viewport cut out of a full-bleed plate,
 * the anchor alternating left then right, and nothing crossing a pool's edge.
 *
 * THE PAGE CARRIES BOTH HALVES, and that is not a contradiction of brief §11's
 * "direct contact for people who won't use a form" — it is the fuller answer to
 * it. The first clearing is the direct half: her address, as a mailto, needing
 * nothing of ours to work. The second is the form, under the three things worth
 * knowing before somebody writes. Somebody who will not fill anything in never
 * has to scroll to the second beat.
 *
 * WHAT CHANGED ON THE WAY IN, and why. Each of these is a fact the screen
 * asserted that this practice cannot: a phone number nobody has given us, an
 * Instagram account nobody has given us, "north London" on a practice that is
 * in Frome, and a reply "usually the same evening, always within a day" that no
 * part of this app can keep. All four are recorded, with what they need in
 * order to come back, at the top of content/contact.ts.
 *
 * The screen also drew its own masthead and its own footer. There is one of
 * each for the site now (2026-08-15) and this uses them, so the mark's left
 * edge does not move between here and anywhere else.
 */

export const metadata: Metadata = {
  title: contact.meta.title,
  description: contact.meta.description,
  alternates: { canonical: "/contact" },
};

export default function Page() {
  const { direct, before } = contact;

  return (
    <>
      {/* ══ BEAT 1 — DIRECT CONTACT ═════════════════════════════════════════ */}
      <section className="clearing relative flex min-h-[100svh] items-end overflow-hidden pb-[clamp(48px,7vh,96px)] pt-[clamp(150px,20vh,240px)]">
        <ClearingPlate plate={direct.plate} priority />

        <div className="absolute inset-x-0 top-0 z-10">
          <SiteNav current="/contact" />
        </div>

        <div className="pool on-pool relative z-[2] w-full max-w-[400px] px-8 py-8 sm:max-w-[480px] sm:px-10 sm:py-10">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {direct.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[32px] font-normal leading-[1.08] text-ink sm:text-[40px]">
            {direct.heading}
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
            {direct.body}
          </p>

          {/* THE NO-FORM PATH, above the link to the form and not below it: the
              person this beat is for is the one who does not want a form, and
              making them read past one to find an address would be the page
              disagreeing with itself. */}
          <ul className="mt-7 list-none p-0">
            <li className="border-t border-pool-rule/[.22] py-3">
              <a
                href={direct.emailHref}
                className="t inline-flex items-center gap-3 text-[19px] text-action hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-[18px] w-[18px] shrink-0"
                >
                  <rect x="3" y="5" width="18" height="14" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {direct.emailLabel}
              </a>
            </li>
            <li className="flex items-center gap-3 border-y border-pool-rule/[.22] py-3 text-[19px] text-ink">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-ink-soft"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <path d="M9 10h6" />
              </svg>
              {direct.place}
            </li>
          </ul>

          <a
            href="#write"
            className="t mt-7 inline-flex min-h-[56px] w-full items-center justify-center bg-action px-8 text-[18px] font-semibold text-pool hover:bg-ink sm:w-auto"
          >
            {direct.formLinkLabel}
          </a>
        </div>
      </section>

      {/* ══ BEAT 2 — BEFORE YOU WRITE, THEN THE FORM ════════════════════════
          One clearing, two regions: the three things worth knowing, then the
          form under them. The approved screen put the facts alone in the page's
          widest pool; the form belongs in the same one rather than in a third
          beat, because reading the three things and then writing is one action
          and splitting it across two viewports would break it in half. */}
      <section
        id="write"
        className="clearing relative flex min-h-[100svh] items-center justify-end overflow-hidden py-16 sm:py-24"
      >
        <ClearingPlate plate={before.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[560px] px-8 py-8 sm:max-w-[620px] sm:px-10 sm:py-12">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {before.eyebrow}
          </p>
          <p className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
            {before.heading}
          </p>

          <dl className="mt-7 flex flex-col">
            {before.facts.map((fact) => (
              <div
                key={fact.label}
                className="border-t border-pool-rule/[.22] py-4 last:border-b"
              >
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {fact.label}
                </dt>
                <dd className="m-0 mt-1.5 text-[18px] leading-relaxed text-ink">
                  {fact.body}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 border-t border-pool-rule/[.22] pt-9">
            <ContactPanel />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
