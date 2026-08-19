import Link from "next/link";

/**
 * TWELVE ROWS TO A PAGE, and the pages under them (operator, 2026-08-19).
 *
 * LINKS RATHER THAN STATE, for the same reason the tabs beside them are links:
 * the page she is on survives a reload, can be bookmarked, and costs the screen
 * no client component. It also means the server sends twelve rows instead of
 * every row it has, which is the point of paging a table at all.
 *
 * THE PAGE NUMBER IS CLAMPED, not trusted. `?page=99` on a two-page table is
 * not an error worth a screen of its own — she gets the last page, which is
 * what she was reaching for. `?page=banana` gets the first.
 */
export const PER_PAGE = 12;

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PER_PAGE));
}

/** The 1-based page she asked for, clamped to one that exists. */
export function currentPage(asked: string | undefined, total: number): number {
  const wanted = Number(asked);
  if (!Number.isFinite(wanted)) return 1;
  return Math.min(Math.max(1, Math.trunc(wanted)), pageCount(total));
}

export function pageSlice<T>(rows: T[], page: number): T[] {
  const from = (page - 1) * PER_PAGE;
  return rows.slice(from, from + PER_PAGE);
}

export default function Pager({
  page,
  total,
  href,
  label,
}: {
  page: number;
  total: number;
  /** Builds the address for a page, keeping whatever else is in the query. */
  href: (page: number) => string;
  /** "bookings", "requests" — what is being counted, for the line of words. */
  label: string;
}) {
  const pages = pageCount(total);
  // ONE PAGE IS NOT A PAGER. Drawing "Page 1 of 1" beside a table of four rows
  // is chrome that answers a question nobody asked.
  if (pages <= 1) return null;

  const from = (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const STEP =
    "t min-h-[40px] border border-pool-rule px-4 py-2 text-[16px] text-ink hover:border-ink";
  const SPENT =
    "t min-h-[40px] border border-dashed border-pool-rule px-4 py-2 text-[16px] text-ink-soft";

  return (
    <nav
      aria-label={`Pages of ${label}`}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-pool-rule py-5"
    >
      <p className="fig font-mono text-[16px] tabular-nums text-ink-soft">
        {from}&ndash;{to} of {total} {label} &middot; page {page} of {pages}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={STEP} rel="prev">
            Back
          </Link>
        ) : (
          <span className={SPENT} aria-hidden="true">
            Back
          </span>
        )}

        {/* Every page, numbered. A table she is paging through has a handful of
            pages, not a hundred, so the ellipsis machinery a bigger list needs
            would be more moving parts than the thing it is drawing. */}
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) =>
          number === page ? (
            <span
              key={number}
              aria-current="page"
              className="t min-h-[40px] border border-ink bg-ink px-4 py-2 text-[16px] text-pool"
            >
              {number}
            </span>
          ) : (
            <Link key={number} href={href(number)} className={STEP}>
              {number}
            </Link>
          ),
        )}

        {page < pages ? (
          <Link href={href(page + 1)} className={STEP} rel="next">
            Next
          </Link>
        ) : (
          <span className={SPENT} aria-hidden="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
