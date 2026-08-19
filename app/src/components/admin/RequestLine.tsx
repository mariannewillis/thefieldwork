"use client";

import { useState } from "react";
import DetailSheet from "@/components/admin/DetailSheet";
import RequestActions, {
  type RequestRow,
} from "@/components/admin/RequestActions";

/**
 * ONE REQUEST, ON ONE LINE — and everything else behind a click.
 *
 * The queue used to print the whole request on every row: the message they
 * typed, her reply, both contact details, the service's duration and price and
 * place. It read as a stack of letters rather than a list to work through
 * (operator, 2026-08-19). What is left on the line is the four things she scans
 * for — who, what, when, and where it stands — and the rest opens.
 *
 * THE ROW IS A BUTTON EVERYWHERE EXCEPT THE CONTROLS. `stopPropagation` on the
 * actions cell is what keeps Approve from also opening the sheet behind its own
 * modal; without it every answer would land on two dialogs at once.
 *
 * THE SHEET CARRIES THE SAME CONTROLS, so a request can be answered from
 * whichever of the two she is looking at. `RequestActions` is rendered twice
 * with the same row, which is safe because it holds no state of its own beyond
 * which of its modals is open.
 */

export type RequestLineProps = {
  row: RequestRow;
  /** Everything the line does not show. */
  detail: {
    email: string;
    phone: string | null;
    askedAt: string;
    serviceHref: string;
    serviceMeta: string;
    /** Their own message, if they left one. */
    message: string | null;
    /** What she wrote when she declined. */
    declineNote: string | null;
    /** The line the row prints — where it stands, short enough for a cell. */
    standing: string;
    /** The same, with the reassurance the cell has no room for. */
    standingLong: string;
    /** True while the slot they chose is still out of her diary. */
    holding: boolean;
    listPrice: string;
    approved: string | null;
    answeredOn: string | null;
    payByLine: string | null;
  };
  /** Drawn on the archive, where the answer is the point. */
  answeredCell?: string;
};

const CELL = "py-4 pr-5 align-middle";
const NOTE = "block fig font-mono text-[15px] text-ink-soft";

export default function RequestLine({
  row,
  detail,
  answeredCell,
}: RequestLineProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        // A row is a real control: it takes the keyboard, says what it does, and
        // is not merely a div with a click handler on it.
        tabIndex={0}
        role="button"
        aria-label={`${row.name} — ${row.serviceName}. Open the full request.`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer border-b border-pool-rule/25 last:border-b-0 hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none"
      >
        <td className={CELL}>
          <span className="block font-display text-[21px] leading-tight text-ink">
            {row.name}
          </span>
          <span className={NOTE}>{detail.askedAt}</span>
        </td>

        <td className={CELL}>
          <span className="block text-[18px] leading-tight text-ink">
            {row.serviceName}
          </span>
        </td>

        <td className={CELL}>
          <span
            className={
              row.chosen
                ? "block fig font-mono text-[17px] tabular-nums leading-tight text-ink"
                : "block max-w-[34ch] truncate text-[18px] leading-tight text-ink"
            }
          >
            {row.wanted}
          </span>
        </td>

        <td className={CELL}>
          <span
            className={
              row.state === "lapsed"
                ? "block text-[17px] leading-tight text-pool-error"
                : "block text-[17px] leading-tight text-ink-soft"
            }
          >
            {answeredCell ?? detail.standing}
          </span>
        </td>

        {/* The controls, and the one place a click must NOT open the sheet. */}
        <td
          className="py-4 align-middle"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RequestActions request={row} />
        </td>
      </tr>

      <DetailSheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="The request"
        title={row.name}
        subtitle={`${row.serviceName} · asked ${detail.askedAt}`}
        facts={[
          {
            label: "Email",
            value: (
              <a
                href={`mailto:${detail.email}?subject=${encodeURIComponent(`Your request — ${row.serviceName}`)}`}
                className="t break-all text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                {detail.email}
              </a>
            ),
          },
          { label: "Phone", value: detail.phone },
          {
            label: row.chosen ? "The time they chose" : "When would suit them",
            value: (
              <>
                <span
                  className={row.chosen ? "fig font-mono tabular-nums" : ""}
                >
                  {row.wanted}
                </span>
                {row.chosen && detail.holding && (
                  <span className="mt-1 block text-[15px] text-gold">
                    Held for them — that hour is out of your diary
                  </span>
                )}
                {row.chosen && !detail.holding && (
                  <span className="mt-1 block text-[15px] text-ink-soft">
                    That time is back in your diary
                  </span>
                )}
              </>
            ),
          },
          {
            label: "Their message",
            value: detail.message ? (
              <span className="block whitespace-pre-line">
                {detail.message}
              </span>
            ) : null,
          },
          {
            label: "The session",
            value: (
              <>
                <a
                  href={detail.serviceHref}
                  className="t text-ink underline decoration-pool-rule/60 underline-offset-4 hover:decoration-ink"
                >
                  {row.serviceName}
                </a>
                <span className="mt-1 block text-[15px] text-ink-soft">
                  {detail.serviceMeta}
                </span>
              </>
            ),
          },
          { label: "Where it stands", value: detail.standingLong },
          { label: "What you agreed", value: detail.approved },
          { label: "When it happens", value: row.agreedTime },
          { label: "Answered", value: detail.answeredOn },
          { label: "Their link", value: detail.payByLine },
          {
            label: "What you wrote back",
            value: detail.declineNote ? (
              <span className="block whitespace-pre-line">
                {detail.declineNote}
              </span>
            ) : null,
          },
        ]}
      >
        <RequestActions request={row} />
      </DetailSheet>
    </>
  );
}
