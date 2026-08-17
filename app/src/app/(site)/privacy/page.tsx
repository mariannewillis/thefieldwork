import type { Metadata } from "next";
import ClearingPlate from "@/components/site/ClearingPlate";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { privacy } from "@/content/privacy";

/**
 * The privacy notice (brief §14) — the page the footer's "Privacy" entry has
 * been waiting for since the footer became every page's on 2026-08-15.
 *
 * Ported from docs/screens/webapp/privacy-notice.html, the approved
 * composition, the way /about and /contact were ported from theirs: five
 * beats, the anchor alternating left–right–left–right–left, one hard-edged
 * clearing per viewport cut out of a full-bleed plate, and every string coming
 * from @/content/privacy rather than being inlined so the portal can reach
 * them one day.
 *
 *   1  THE LEDE            small pool, left, on the hero photograph
 *   2  WHAT IS COLLECTED   the widest pool, right — the three public forms
 *   3  THE MONTHLY LETTER  small pool, left — consent, and what leaving does
 *   4  WHO ELSE SEES IT    wide pool, right — Stripe, Resend, Replit, named
 *   5  HOW LONG            small pool, left, and the one link off this page
 *
 * THIS PAGE IS A STATEMENT OF FACT ABOUT A REAL BUSINESS, which makes it
 * unlike every other page on this site. Its sentences were read out of the
 * code they describe — `lib/stripe.ts`, `lib/email/index.ts`,
 * `lib/newsletter/subscribers.ts`, `(site)/contact/actions.ts`,
 * `lib/request-guard.ts` and schema.prisma — rather than out of a template,
 * and content/privacy.ts names the file each block came from. Four of the
 * approved screen's own sentences are NOT reproduced because they are untrue
 * here (a two-year deletion, a thirty-day one, a booking form that asks for a
 * name, and a reply time); all four are recorded, with what changed and why,
 * at the top of content/privacy.ts. The COMPOSITION is unchanged.
 *
 * WHAT IT DOES NOT SAY is as deliberate: her legal name and postal address,
 * an ICO registration, retention periods, a lawful basis per purpose and a
 * data-protection contact are all facts nobody has supplied, and the page is
 * written to read properly without them rather than around a hole. The same
 * list is at the top of content/privacy.ts, in the shape content/about.ts and
 * content/contact.ts already use.
 *
 * The screen drew its own masthead and had no footer. This uses the site's
 * one of each, so the mark's left edge does not move between here and
 * anywhere else.
 */

export const metadata: Metadata = {
  title: privacy.meta.title,
  description: privacy.meta.description,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  const { intro, collected, letter, whoElse, keeping } = privacy;

  return (
    <>
      {/* ══ BEAT 1 — THE LEDE ═══════════════════════════════════════════════
          The masthead floats over the photograph rather than sitting above it
          in the flow, exactly as it does on /about and /contact. */}
      <section className="clearing relative flex min-h-[100svh] items-end overflow-hidden pb-[clamp(48px,7vh,96px)] pt-[clamp(212px,22vh,250px)]">
        <ClearingPlate plate={intro.plate} priority />

        <div className="absolute inset-x-0 top-0 z-10">
          <SiteNav current="/privacy" />
        </div>

        <div className="pool on-pool relative z-[2] w-full max-w-[400px] px-8 py-8 sm:max-w-[520px] sm:px-10 sm:py-10">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {intro.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[32px] font-normal leading-[1.08] text-ink sm:text-[40px]">
            {intro.heading}
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
            {intro.body}
          </p>
          {/* The date, and the invitation to correct it. Smaller than the body
              and under a rule: it is provenance rather than content, and a
              notice with no date cannot be told from a stale one. */}
          <p className="mt-5 border-t border-pool-rule/[.22] pt-5 text-[15px] leading-relaxed text-ink-soft">
            {intro.note}
          </p>
        </div>
      </section>

      {/* ══ BEAT 2 — WHAT IS COLLECTED ══════════════════════════════════════
          The page's widest pool, because it carries the three public forms
          rather than the screen's single "booking" purpose — the screen's one
          block described a form this site does not have. */}
      <section className="clearing relative flex min-h-[100svh] items-center justify-end overflow-hidden py-16 sm:py-24">
        <ClearingPlate plate={collected.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[560px] px-8 py-8 sm:max-w-[640px] sm:px-10 sm:py-12">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {collected.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
            {collected.heading}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-soft">
            {collected.lede}
          </p>

          <dl className="mt-8 flex flex-col">
            {collected.purposes.map((purpose) => (
              <div
                key={purpose.label}
                className="border-t border-pool-rule/[.22] py-5 last:border-b"
              >
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {purpose.label}
                </dt>
                <dd className="m-0 mt-2 text-[18px] leading-relaxed text-ink">
                  {purpose.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ BEAT 3 — THE MONTHLY LETTER ═════════════════════════════════════
          Its own beat, and not folded into the one above, because it is its
          own purpose with its own consent — brief §14: "booking somebody in
          must never add them to the list", and a page that ran the two
          together would be describing exactly the thing that rules out. */}
      <section className="clearing relative flex min-h-[100svh] items-center overflow-hidden py-16 sm:py-24">
        <ClearingPlate plate={letter.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[520px] px-8 py-8 sm:max-w-[580px] sm:px-10 sm:py-12">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {letter.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
            {letter.heading}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-soft">
            {letter.body}
          </p>

          <dl className="mt-8 flex flex-col">
            {letter.facts.map((fact) => (
              <div
                key={fact.label}
                className="border-t border-pool-rule/[.22] py-4 last:border-b"
              >
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {fact.label}
                </dt>
                <dd className="m-0 mt-1.5 text-[17px] leading-relaxed text-ink">
                  {fact.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ BEAT 4 — WHO ELSE SEES IT ═══════════════════════════════════════ */}
      <section className="clearing relative flex min-h-[100svh] items-center justify-end overflow-hidden py-16 sm:py-24">
        <ClearingPlate plate={whoElse.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[560px] px-8 py-8 sm:max-w-[640px] sm:px-10 sm:py-12">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {whoElse.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
            {whoElse.heading}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-soft">
            {whoElse.lede}
          </p>

          <dl className="mt-8 flex flex-col">
            {whoElse.parties.map((party) => (
              <div
                key={party.label}
                className="border-t border-pool-rule/[.22] py-4 last:border-b"
              >
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {party.label}
                </dt>
                <dd className="m-0 mt-1.5 text-[17px] leading-relaxed text-ink">
                  {party.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ BEAT 5 — HOW LONG, AND HOW TO HAVE IT BACK ══════════════════════
          The screen's fifth beat was "asking for it back" alone, and retention
          sat in beat 4 as a pair of periods this app does not keep. The two
          belong together once the honest answer is given: nothing expires, so
          "how long" IS "until you ask". */}
      <section className="clearing relative flex min-h-[100svh] items-center overflow-hidden py-16 sm:py-24">
        <ClearingPlate plate={keeping.plate} />

        <div className="pool on-pool relative z-[2] w-full max-w-[520px] px-8 py-8 sm:max-w-[580px] sm:px-10 sm:py-12">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-action">
            {keeping.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-[26px] font-normal leading-[1.12] text-ink sm:text-[32px]">
            {keeping.heading}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-soft">
            {keeping.body}
          </p>

          <dl className="mt-8 flex flex-col">
            {keeping.facts.map((fact) => (
              <div
                key={fact.label}
                className="border-t border-pool-rule/[.22] py-4 last:border-b"
              >
                <dt className="fig font-mono text-[14px] uppercase tracking-[0.14em] text-ink-soft">
                  {fact.label}
                </dt>
                <dd className="m-0 mt-1.5 text-[17px] leading-relaxed text-ink">
                  {fact.body}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={keeping.linkHref}
            className="t mt-8 inline-flex min-h-[56px] items-center gap-3 border border-action px-8 text-[18px] font-semibold text-action hover:bg-action hover:text-pool"
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
            {keeping.linkLabel}
          </a>

          <p className="mt-7 border-t border-pool-rule/[.22] pt-5 text-[15px] leading-relaxed text-ink-soft">
            {keeping.regulator}
          </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
