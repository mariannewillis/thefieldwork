"use client";

import { useState } from "react";
import DetailSheet from "@/components/admin/DetailSheet";
import type { LibraryRow } from "@/components/admin/MediaLibrary";

/**
 * ONE DOCUMENT, ON ONE LINE — the same shape as a booking or a request.
 *
 * The documents tab printed a paragraph per file about who can open it, plus
 * everywhere it was used, plus a two-step Remove, all stacked. Three files made
 * a page; twenty made a scroll (operator, 2026-08-19). It is a table now: what
 * it is called, what kind of file, how big, and who can open it — and the rest
 * opens.
 *
 * THE NAME IS STILL A LINK, and it has to be. Pressing a document is how she
 * checks it, and it opens in a NEW TAB because the file is a download rather
 * than a page: both routes serve it `Content-Disposition: attachment`, so
 * following it in this tab would leave her on the screen she was already on,
 * wondering whether anything had happened. `stopPropagation` keeps that press
 * from also opening the sheet behind it.
 *
 * WHICH ROUTE IS NOT A GUESS. `href` is `documentHref`, and it picks: a file
 * not yet on a letter is served from `/admin/media/file/…`, which needs a
 * session; one that has gone out is served from `/newsletter-files/…`, which is
 * the address in people's inboxes. So "open it and check" and "this is the link
 * they got" are the same press for a public file, and a private one is never
 * handed a link that would 404 for its recipient.
 */

const CELL = "py-4 pr-5 align-middle";

export default function DocumentLine({
  row,
  kindWords,
  sizeWords,
  arrived,
  children,
}: {
  row: LibraryRow;
  /** "A PDF" — worked out on the server, where the mime table lives. */
  kindWords: string;
  /** "2.4 MB", or null on a file whose size nothing recorded. */
  sizeWords: string | null;
  /** "added 16 Aug", or "already on the site". */
  arrived: string;
  /** The Remove control, passed in so this knows nothing about deleting. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const name = row.title ?? row.ref;

  return (
    <>
      <tr
        tabIndex={0}
        role="button"
        aria-label={`${name}. Open the full document.`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer border-t border-pool-rule hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none"
      >
        <th
          scope="row"
          className="py-4 pr-5 text-left align-middle text-[17px] font-semibold text-ink"
        >
          {row.href ? (
            <a
              href={row.href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="t underline decoration-pool-rule underline-offset-4 hover:text-action"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </th>

        <td
          className={`${CELL} whitespace-nowrap fig font-mono text-[15px] text-ink-soft`}
        >
          {kindWords}
          {sizeWords ? ` · ${sizeWords}` : ""}
        </td>

        {/* WHO CAN OPEN IT, in three words rather than a paragraph. The long
            version was on every row and is now one fact in the sheet. */}
        <td className={CELL}>
          <span
            className={
              row.reachableWithoutASession
                ? "text-[16px] leading-tight text-gold"
                : "text-[16px] leading-tight text-ink-soft"
            }
          >
            {row.reachableWithoutASession ? "Anyone with the link" : "Only you"}
          </span>
        </td>

        <td className={`${CELL} fig font-mono text-[15px] text-ink-soft`}>
          {row.uses.length === 0
            ? "not used"
            : row.uses.length === 1
              ? "used once"
              : `used ${row.uses.length} times`}
        </td>

        <td
          className="py-4 align-middle"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {children}
        </td>
      </tr>

      <DetailSheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="The document"
        title={name}
        subtitle={`${kindWords}${sizeWords ? ` · ${sizeWords}` : ""} · ${arrived}`}
        facts={[
          {
            label: "Who can open it",
            value: row.reachableWithoutASession ? (
              <>
                <strong className="font-semibold">
                  Anybody with the address.
                </strong>{" "}
                It has gone out on a letter, so the link is in people&rsquo;s
                inboxes and cannot ask them to sign in.
              </>
            ) : (
              <>
                <strong className="font-semibold">Only you.</strong> It is not
                on any letter yet, so it needs your sign-in. Put it on a letter
                and it becomes readable by anybody with the address — which is
                what has to happen for the link to work in somebody&rsquo;s
                inbox.
              </>
            ),
          },
          {
            label: "Where it is used",
            value:
              row.uses.length === 0 ? (
                "Nowhere yet."
              ) : (
                <ul className="m-0 list-none p-0">
                  {row.uses.map((use, index) => (
                    <li key={`${use.what}-${index}`}>
                      {use.href ? (
                        <a
                          href={use.href}
                          className="t text-action underline decoration-action underline-offset-4 hover:text-ink"
                        >
                          {use.what}
                        </a>
                      ) : (
                        use.what
                      )}
                    </li>
                  ))}
                </ul>
              ),
          },
          { label: "Arrived", value: arrived },
          {
            label: "Its address",
            value: row.href ? (
              <a
                href={row.href}
                target="_blank"
                rel="noreferrer"
                className="t break-all text-action underline decoration-action underline-offset-4 hover:text-ink"
              >
                Open it in a new tab
              </a>
            ) : null,
          },
        ]}
      >
        {children}
      </DetailSheet>
    </>
  );
}
