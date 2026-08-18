import type { Metadata } from "next";
import Link from "next/link";
import { SITE_PAGES } from "@/content/pages";
import { pendingChanges } from "@/lib/pages/publish";

/**
 * Pages — every page on the site, and which of them you can change here.
 *
 * ALL SEVEN ARE LISTED AND ONE OF THEM OPENS (operator, 2026-08-18). The six
 * that are not wired say what they are and where their words currently live,
 * rather than being left off the list or drawn as a link that goes nowhere. A
 * list that shows only what is finished makes the portal look complete and
 * leaves her wondering where the About page went; D-9 — the portal shows no
 * state it cannot read, and says so when it cannot.
 *
 * THE ONE THAT OPENS SAYS WHETHER ANYTHING IS WAITING. A page with unpublished
 * changes is the state she is most likely to have forgotten about, because it
 * looks finished from her side and has not moved from a visitor's.
 */

export const metadata: Metadata = {
  title: "Pages — The Field Work",
};

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

export default async function PagesPanel() {
  const pending = await Promise.all(
    SITE_PAGES.filter((page) => page.editable).map(async (page) => ({
      key: page.key,
      count: (await pendingChanges(page.key)).length,
    })),
  );
  const pendingByKey = new Map(pending.map((row) => [row.key, row.count]));

  return (
    <section className="pt-8" aria-labelledby="pages-h">
      <p className={EYEBROW}>Your words</p>
      <h1
        id="pages-h"
        className="font-display font-normal text-[34px] sm:text-[40px] text-plate-text mt-3 leading-[1.08]"
      >
        Pages
      </h1>
      <p className="mt-4 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Open a page and you get the page itself, at its real width and in its
        real type, with everything on it selectable. Change it as much as you
        like &mdash; nothing reaches the site until you press Publish.
      </p>

      <ul className="mt-9 flex max-w-[70ch] flex-col">
        {SITE_PAGES.map((page) => {
          const waiting = pendingByKey.get(page.key) ?? 0;

          const inner = (
            <>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-[24px] leading-tight text-ink group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
                  {page.label}
                </span>
                <span className="fig font-mono text-[15px] text-ink-soft">
                  {page.href}
                </span>
                {waiting > 0 && (
                  <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
                    {waiting === 1
                      ? "1 change not published"
                      : `${waiting} changes not published`}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">
                {page.note}
              </p>
              {!page.editable && (
                <p className="mt-2 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">
                  Not editable here yet. Its words are in{" "}
                  <span className="fig font-mono text-[15px]">
                    {page.authoredIn}
                  </span>{" "}
                  and changing them needs a developer.
                </p>
              )}
            </>
          );

          return (
            <li
              key={page.key}
              className="border-b border-pool-rule last:border-b-0"
            >
              {page.editable ? (
                <Link
                  href={`/admin/pages/${page.key}`}
                  className="group block py-6"
                >
                  {inner}
                </Link>
              ) : (
                // Not a link and not a disabled link: there is nowhere for it
                // to go, and a control that looks pressable and is not is
                // worse than plain text that explains itself.
                <div className="py-6 opacity-60">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
