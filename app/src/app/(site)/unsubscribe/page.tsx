import type { Metadata } from "next";
import Link from "next/link";
import { SiteBrand, SiteFooter } from "@/components/site/SiteChrome";

/**
 * The unsubscribe page with no token on it.
 *
 * Two ways somebody lands here: the preview of a letter, which carries this
 * address instead of a live token so a preview cannot take anybody off the
 * list — and a person who typed the address, or whose mail program truncated
 * the link. Both get the same page, because there is nothing this can do for
 * either of them except say where the working link is.
 */

export const metadata: Metadata = {
  title: "Stop the letter — The Field Work",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/chair-with-her-coat-2400.jpg"
        alt=""
        aria-hidden="true"
        className="page-field"
      />
      <div className="page-scrim" aria-hidden="true" />
      <main className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
        <SiteBrand />
        <section className="mt-14 max-w-[620px]">
          <div className="pool on-pool mt-5 px-8 py-9 sm:px-10">
            <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
              This needs the link from the letter itself.
            </h1>
            <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
              Every monthly letter carries one at the very bottom, and it is
              yours alone &mdash; that is what lets this take the right address
              off without asking you to prove which one it is. Open the most
              recent letter and scroll to the end.
            </p>
            <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
              If you cannot find one, reply to any letter she has sent you.
              Marianne reads those and will take you off by hand.
            </p>
            <Link
              href="/"
              className="mt-7 inline-block text-[19px] text-action underline underline-offset-4 hover:text-ink"
            >
              Back to The Field Work
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
