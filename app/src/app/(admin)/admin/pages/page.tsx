import type { Metadata } from "next";
import Link from "next/link";
import { setVisibility } from "@/app/(admin)/admin/pages/visibility-actions";
import { SITE_PAGES } from "@/content/pages";
import { pendingChanges } from "@/lib/pages/publish";
import { hiddenKeys, WHOLE_SITE } from "@/lib/site-visibility";

/**
 * Pages — every page on the site, whether it is showing, and what is waiting.
 *
 * EVERY PAGE IS LISTED, INCLUDING THE ONES THAT DO NOT OPEN YET. A list that
 * shows only what is finished makes the portal look complete and leaves her
 * wondering where the About page went; D-9 — the portal shows no state it
 * cannot read, and says so when it cannot.
 *
 * CARDS, NOT A STACK OF RULES (operator, 2026-08-20 — "atm its hard to see any
 * of them"). Eight pages in a single column of hairline-separated rows reads as
 * one long paragraph: nothing has an edge, so nothing is a thing. The same grid
 * the email templates use gives each page a box of its own, which is what makes
 * a list of eight scannable rather than readable.
 *
 * AND EACH ONE SAYS WHETHER IT IS SHOWING. A page taken off the site is the
 * state she is most likely to forget, because from her side it looks exactly
 * like a page she has not opened lately.
 */

export const metadata: Metadata = {
  title: "Pages — The Field Work",
};

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";
const CHIP =
  "t min-h-[38px] border border-pool-rule px-3 py-1.5 text-[15px] text-ink hover:border-ink";

export default async function PagesPanel() {
  const [pending, hidden] = await Promise.all([
    Promise.all(
      SITE_PAGES.filter((page) => page.editable).map(async (page) => ({
        key: page.key,
        count: (await pendingChanges(page.key)).length,
      })),
    ),
    hiddenKeys(),
  ]);
  const pendingByKey = new Map(pending.map((row) => [row.key, row.count]));
  const siteHidden = hidden.has(WHOLE_SITE);

  return (
    <section className="pt-8" aria-labelledby="pages-h">
      <p className={EYEBROW}>Your words</p>
      <h1
        id="pages-h"
        className="mt-3 font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        Pages
      </h1>
      <p className="mt-4 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Open a page and you get the page itself, at its real width and in its
        real type, with everything on it selectable. Change it as much as you
        like &mdash; nothing reaches the site until you press Publish.
      </p>

      {/* ── THE WHOLE SITE ─────────────────────────────────────────────────
          Above the pages, because it overrules every one of them: while this
          is on, none of the switches below make any difference to what a
          visitor sees, and a control that silently overrules eight others
          belongs where they can be read together. */}
      <div
        className={`pool on-pool mt-9 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 px-7 py-6 ${
          siteHidden ? "border-l-4 border-l-pool-error" : ""
        }`}
      >
        <div className="max-w-[62ch]">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
            {siteHidden ? "Not open yet" : "The site is open"}
          </p>
          <p className="mt-2 font-display text-[26px] leading-tight text-ink">
            {siteHidden
              ? "Anybody arriving is told the room is being got ready."
              : "Anybody with the address can read the site."}
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
            {siteHidden
              ? "They are shown one page asking for an address, and nothing else. Payment, cancellation and unsubscribe links already in somebody's inbox go on working — a person who has paid for an hour can still cancel it."
              : "Turn this off while you are still working on it. The site stays here and stays yours to edit; what a visitor gets is one page saying it is not open yet, with somewhere to leave an address."}
          </p>
        </div>

        <form action={setVisibility}>
          <input type="hidden" name="key" value={WHOLE_SITE} />
          <input
            type="hidden"
            name="hidden"
            value={siteHidden ? "false" : "true"}
          />
          <button
            type="submit"
            className="t min-h-[52px] bg-action px-7 py-3 text-[17px] font-semibold text-pool hover:bg-ink"
          >
            {/* WHAT PRESSING IT DOES, not what is true now — the sentences
                above already say what is true, and a button labelled with a
                state reads as a description of one. */}
            {siteHidden ? "Open the site" : "Put up ‘coming soon’"}
          </button>
        </form>
      </div>

      <ul className="mt-6 grid list-none gap-px border border-plate-rule/40 bg-plate-rule/40 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {SITE_PAGES.map((page) => {
          const waiting = pendingByKey.get(page.key) ?? 0;
          const off = hidden.has(page.key);

          return (
            <li key={page.key} className="pool on-pool flex flex-col p-6">
              <p
                className={`fig font-mono text-[15px] uppercase tracking-[0.14em] ${
                  off ? "text-pool-error" : "text-action"
                }`}
              >
                {off ? "Taken off the site" : page.href}
              </p>

              <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
                {page.editable ? (
                  <Link
                    href={`/admin/pages/${page.key}`}
                    className="t underline decoration-pool-rule/60 underline-offset-[6px] hover:decoration-ink"
                  >
                    {page.label}
                  </Link>
                ) : (
                  // Not a link and not a disabled one: there is nowhere for it
                  // to go, and a control that looks pressable and is not is
                  // worse than plain text that explains itself.
                  page.label
                )}
              </h2>

              {waiting > 0 && (
                <p className="mt-2 fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
                  {waiting === 1
                    ? "1 change not published"
                    : `${waiting} changes not published`}
                </p>
              )}

              <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
                {page.note}
              </p>

              {!page.editable && (
                <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
                  Not editable here yet. Its words are in{" "}
                  <span className="fig font-mono text-[15px]">
                    {page.authoredIn}
                  </span>
                  .
                </p>
              )}

              {/* `mt-auto` so every card's control sits on the same line
                  whatever length its note is — a row of buttons at eight
                  different heights reads as eight unrelated things. */}
              <form action={setVisibility} className="mt-auto pt-5">
                <input type="hidden" name="key" value={page.key} />
                <input
                  type="hidden"
                  name="hidden"
                  value={off ? "false" : "true"}
                />
                <button type="submit" className={CHIP}>
                  {off ? "Put it back on the site" : "Take it off the site"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {siteHidden && (
        <p className="mt-6 max-w-[68ch] text-[17px] leading-relaxed text-plate-soft">
          While the site is not open, the switches on the cards above make no
          difference to what anybody sees &mdash; every page is behind the same
          one. They are still worth setting now, so that opening the site shows
          exactly what you meant it to.
        </p>
      )}
    </section>
  );
}
