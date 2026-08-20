import type { FlyerKind } from "@/lib/flyers";

/**
 * WHAT A SEARCH ENGINE AND AN ASSISTANT GET FROM THIS ONE.
 *
 * ── WHY THIS EXISTS AT ALL ───────────────────────────────────────────────
 *
 * Everything a machine reads about an offering is GENERATED from the row: the
 * structured data, the canonical, the share picture, the sitemap entry and the
 * `llms.txt` line all come from the same fields she fills in, so a workshop she
 * publishes tomorrow is described properly the moment it is published. There is
 * no box to tick and nothing to remember.
 *
 * Which is exactly why this panel is worth the space: a thing that happens
 * silently is a thing she cannot check. And two of the fields it is built from
 * are ones she can leave thin without the form complaining — a summary of four
 * words becomes a four-word description in every search result and every
 * assistant's answer, and no picture means every share of it is a bare blue
 * link. Neither is an error. Both are worth seeing.
 *
 * IT IS NOT A SCORE. No traffic lights, no percentage, no "SEO: 84/100" — those
 * invent a number nobody can act on and make an ordinary decision (a short
 * summary on a workshop whose name says it all) look like a failure. This says
 * what a machine will be told, in the words it will be told them, and names the
 * two things that are missing if they are missing.
 */

const LABEL =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";

/** Below this a description is a fragment rather than a sentence. */
const THIN = 60;

export default function OfferingSeo({
  kind,
  slug,
  name,
  summary,
  heroImage,
  published,
  /** Workshops and courses: the date a machine is given. Null on a service. */
  when,
}: {
  kind: FlyerKind;
  slug: string;
  name: string;
  summary: string;
  heroImage: string | null;
  published: boolean;
  when?: string | null;
}) {
  const thin = summary.trim().length < THIN;
  const url = `thefieldwork.co.uk/${kind}s/${slug}`;

  return (
    <section className="pool on-pool mt-10 px-7 py-7" aria-labelledby="seo-h">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
        Being found
      </p>
      <h2
        id="seo-h"
        className="mt-2 font-display text-[26px] leading-tight text-ink"
      >
        What a search engine and an assistant are told about this one
      </h2>
      <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
        All of it is built from what you have filled in above, every time
        somebody or something asks &mdash; so it is right the moment you publish
        and stays right when you change it. There is nothing to fill in here.
      </p>

      <dl className="mt-6 border-t border-pool-rule/40">
        <Row label="Its address">
          <span className="fig font-mono text-[15px]">{url}</span>
        </Row>

        <Row label="What it is called">{name}</Row>

        <Row label="How it is described">
          {summary.trim() || <em>Nothing yet.</em>}
          {thin && (
            <span className="mt-2 block text-[15px] leading-relaxed text-ink-soft">
              This is what appears under the link in a search result, and it is
              what an assistant repeats when somebody asks about it. A sentence
              or two does more work here than anywhere else on the page.
            </span>
          )}
        </Row>

        {when !== undefined && (
          <Row label="When it is">
            {when ?? <em>No dates yet, so nothing can be told to anybody.</em>}
          </Row>
        )}

        <Row label="Its picture">
          {heroImage ? (
            <span className="fig font-mono text-[15px]">{heroImage}</span>
          ) : (
            <>
              <em>None.</em>
              <span className="mt-2 block text-[15px] leading-relaxed text-ink-soft">
                Somebody sending this to a friend gets a bare link with no
                picture in it. A photograph above is the whole of the fix.
              </span>
            </>
          )}
        </Row>

        <Row label="Whether it is listed">
          {published ? (
            "Yes — it is in the sitemap, and in the page written for AI assistants."
          ) : (
            <>
              <em>Not yet.</em>
              <span className="mt-2 block text-[15px] leading-relaxed text-ink-soft">
                Nothing about it is given to anybody until it is on the site.
                That is on purpose: a search engine that indexes a draft will go
                on offering it after you have changed your mind.
              </span>
            </>
          )}
        </Row>
      </dl>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-pool-rule/25 py-4">
      <dt className={`${LABEL} min-w-[11rem] pt-1`}>{label}</dt>
      <dd className="m-0 min-w-0 flex-1 max-w-[62ch] text-[17px] leading-relaxed text-ink">
        {children}
      </dd>
    </div>
  );
}
