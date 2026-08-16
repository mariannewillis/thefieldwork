import type { Metadata } from "next";
import { SiteBrand, SiteFooter } from "@/components/site/SiteChrome";
import SubscribeForm from "@/components/site/SubscribeForm";

/**
 * The page the footer's "Monthly letter" points at, and where the home page's
 * last beat sends anybody who arrives without script.
 *
 * It wears the workshops pages' clothes for the reason the cancellation page
 * does: the same fixed photograph, the same blush pool, one column, and no
 * composition of its own to keep in step with anything.
 */

export const metadata: Metadata = {
  title: "The monthly letter — The Field Work",
  description:
    "One page, once a month. What is open, and whatever the room has been like.",
  alternates: { canonical: "/subscribe" },
};

export default function Page() {
  return (
    <>
      {/* The window at dusk. Decorative, so it carries no alt. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/marianne-altar-light-2400.jpg"
        alt=""
        aria-hidden="true"
        className="page-field"
      />
      <div className="page-scrim" aria-hidden="true" />

      <main className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
        <SiteBrand />

        <section className="mt-14 max-w-[680px]">
          <div className="pool on-pool mt-5 px-8 py-9 sm:px-10">
            <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
              A letter, once a month, from a quiet room in Frome.
            </h1>
            <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
              What is open and when, and whatever the room has actually been
              like &mdash; the chair moved nearer the window, what people have
              been arriving with this autumn. One page. Nothing is ever sold to
              you twice, and nothing is passed to anybody else.
            </p>

            <div className="mt-8">
              <SubscribeForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
