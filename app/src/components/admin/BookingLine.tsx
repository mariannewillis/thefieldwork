"use client";

import { useState } from "react";
import { markBookingSeen } from "@/app/(admin)/admin/workshop-bookings/actions";
import BookingActions, {
  type LedgerRow,
} from "@/components/admin/BookingActions";
import DetailSheet from "@/components/admin/DetailSheet";

/**
 * ONE BOOKING, ON ONE LINE — and everything else behind a click.
 *
 * The ledger used to print seven columns of prose on every row: the email, the
 * deposit and what was still owed on it, the refund period and when it closed,
 * who cancelled it and when, whether the money had gone back. It read as a file
 * rather than a list (operator, 2026-08-19). What is left is the four things
 * she scans for — who, what kind, which offering, what she is holding — and the
 * rest opens.
 *
 * THE ROW IS A BUTTON EVERYWHERE EXCEPT THE CONTROLS, and `stopPropagation` on
 * the actions cell is what keeps Cancel from also opening the sheet behind its
 * own modal.
 */

export type BookingLineProps = {
  row: LedgerRow;
  line: {
    /** Workshop · Course · Session, as the column draws it. */
    kindWord: string;
    offeringName: string;
    /** The date, or the run, or her agreed sentence. */
    whenWords: string;
    /** "£95" — what she is holding on this one right now. */
    held: string;
    /** One short line under the offering: where this booking stands. */
    standing: string;
    /** True when that standing is the kind she needs to see in red. */
    alarming: boolean;
  };
  detail: {
    email: string;
    reference: string;
    places: string;
    paidOn: string;
    /** Null on a workshop, which is paid in full when it is booked. */
    deposit: string | null;
    outstanding: string | null;
    refundPeriod: string | null;
    everPaid: string;
    cancelled: string | null;
    refunded: string | null;
  };
  /** True until she has opened it. A booking arrives by webhook, unwatched. */
  unseen: boolean;
};

const CELL = "py-4 pr-5 align-middle";
const NOTE = "block fig font-mono text-[15px] text-ink-soft";

export default function BookingLine({
  row,
  line,
  detail,
  unseen,
}: BookingLineProps) {
  const [open, setOpen] = useState(false);
  /** Optimistic, and honestly so: she IS looking at it. See `RequestLine`. */
  const [seen, setSeen] = useState(!unseen);

  function look() {
    setOpen(true);
    if (!seen) {
      setSeen(true);
      void markBookingSeen(row.id);
    }
  }

  return (
    <>
      <tr
        tabIndex={0}
        role="button"
        aria-label={`${seen ? "" : "New. "}${row.buyerName} — ${line.offeringName}. Open the full booking.`}
        onClick={look}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            look();
          }
        }}
        className="cursor-pointer border-t border-pool-rule hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none"
      >
        <th
          scope="row"
          className="whitespace-nowrap py-4 pr-5 text-left align-middle text-[17px] font-semibold text-ink"
        >
          <span className="flex items-center gap-2">
            {!seen && (
              <>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-action"
                />
              </>
            )}
            {row.buyerName}
          </span>
        </th>

        <td
          className={`${CELL} whitespace-nowrap fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft`}
        >
          {line.kindWord}
        </td>

        <td className={CELL}>
          <span className="block font-display text-[20px] leading-tight text-ink">
            {line.offeringName}
          </span>
          <span className={NOTE}>{line.whenWords}</span>
        </td>

        <td className={CELL}>
          <span
            className={
              line.alarming
                ? "block text-[16px] leading-tight text-pool-error"
                : "block text-[16px] leading-tight text-ink-soft"
            }
          >
            {line.standing}
          </span>
        </td>

        <td
          className={`${CELL} whitespace-nowrap fig font-mono text-[19px] tabular-nums text-ink`}
        >
          {line.held}
        </td>

        <td
          className="py-4 align-middle"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <BookingActions booking={row} />
        </td>
      </tr>

      <DetailSheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={`${line.kindWord} · ${detail.reference}`}
        title={row.buyerName}
        subtitle={`${line.offeringName} · ${line.whenWords}`}
        facts={[
          {
            label: "Email",
            value: (
              <a
                href={`mailto:${detail.email}`}
                className="t break-all text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                {detail.email}
              </a>
            ),
          },
          { label: "Places", value: detail.places },
          { label: "Where it stands", value: line.standing },
          { label: "Held right now", value: line.held },
          { label: "Ever paid", value: detail.everPaid },
          { label: "Deposit", value: detail.deposit },
          { label: "Still owed", value: detail.outstanding },
          { label: "Refund period", value: detail.refundPeriod },
          { label: "Paid", value: detail.paidOn },
          { label: "Cancelled", value: detail.cancelled },
          { label: "Refunded", value: detail.refunded },
        ]}
      >
        <BookingActions booking={row} />
      </DetailSheet>
    </>
  );
}
