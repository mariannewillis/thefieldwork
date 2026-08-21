"use client";

import { useActionState } from "react";
import {
  sendPaymentReminder,
  type ReminderState,
} from "@/app/(admin)/admin/workshop-bookings/reminder-actions";

/**
 * EVERYBODY WITH A PAYMENT TO MAKE — one line each, latest first.
 *
 * A LIST OF PHONE CALLS, in that order. The top of this table is the person who
 * has been late longest, because that is the one she would ring first, and a
 * table sorted by anything else on this screen is a table she has to read
 * before she can use.
 *
 * IT CUTS ACROSS THE OTHER TWO TABS rather than sitting inside one. A payment
 * can be overdue on a course that has already started, so filing it under Past
 * would hide the one thing she needs to chase.
 *
 * WHAT IS LATE IS SAID IN WORDS. "two weeks late" is what she would say to
 * herself; a date she has to subtract from today is a sum she has to do before
 * she knows whether to care. The date is there too, underneath, because the
 * sentence she writes to somebody names it.
 */

const NOTHING: ReminderState = { error: null, sent: 0 };

const HEAD =
  "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";
const CELL = "py-4 pr-5 align-middle";

export type OwingRow = {
  id: number;
  who: string;
  email: string;
  what: string;
  href: string | null;
  duePence: number;
  remainingPence: number;
  overdueDays: number;
  overdueWords: string;
  dueWords: string;
  /** Which payment of how many, as "3 of 4". */
  which: string;
  remindedWords: string | null;
};

export default function OwingTable({
  rows,
  money,
}: {
  rows: OwingRow[];
  /** Pence formatted the way every other figure in the portal is. */
  money: Record<number, string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="pool on-pool mt-6 max-w-[62ch] px-7 py-7">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
          Nothing owed
        </p>
        <p className="mt-2 font-display text-[26px] leading-tight text-ink">
          Everybody is up to date.
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          A course bought on a plan appears here the day one of its payments
          falls due, and leaves it the moment that payment lands.
        </p>
      </div>
    );
  }

  return (
    <div className="pool on-pool mt-6 px-6 py-2 sm:px-8">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <caption className="sr-only">
            Everybody with a payment due, the latest first. Columns: who, what
            it is for, which payment of how many and when it was due, what is
            due now and what is left on the plan, and a button that sends them a
            reminder with a link to pay.
          </caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className={HEAD}>
                Who
              </th>
              <th scope="col" className={HEAD}>
                For
              </th>
              <th scope="col" className={HEAD}>
                Payment
              </th>
              <th scope="col" className={HEAD}>
                Due now
              </th>
              <th scope="col" className={`${HEAD} pr-0`}>
                Left on the plan
              </th>
              <th scope="col" className={`${HEAD} pr-0`}>
                <span className="sr-only">Remind them</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.id} row={row} money={money} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, money }: { row: OwingRow; money: Record<number, string> }) {
  const [state, remind, sending] = useActionState(sendPaymentReminder, NOTHING);
  const late = row.overdueDays > 0;

  return (
    <tr
      className={`border-t border-pool-rule ${late ? "bg-pool-error/[0.06]" : ""}`}
    >
      <th
        scope="row"
        className="py-4 pr-5 text-left align-middle text-[17px] font-semibold text-ink"
      >
        <span className="flex items-center gap-2">
          {/* THE FLAG, and it is a dot rather than the word "OVERDUE" shouting
              down a column: the row is tinted, the words below say how late,
              and three ways of saying one thing is two too many. */}
          {late && (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-pool-error"
            />
          )}
          {row.who}
        </span>
        <a
          href={`mailto:${row.email}`}
          className="t block break-all fig font-mono text-[15px] text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
        >
          {row.email}
        </a>
      </th>

      <td className={`${CELL} text-[17px] text-ink`}>
        {row.href ? (
          <a
            href={row.href}
            className="t underline decoration-pool-rule underline-offset-4 hover:decoration-ink"
          >
            {row.what}
          </a>
        ) : (
          row.what
        )}
      </td>

      <td className={CELL}>
        <span className="block text-[17px] text-ink">{row.which}</span>
        <span
          className={`block fig font-mono text-[15px] ${late ? "font-semibold text-pool-error" : "text-ink-soft"}`}
        >
          {late ? row.overdueWords : row.dueWords}
        </span>
        {row.remindedWords && (
          <span className="block fig font-mono text-[15px] text-ink-soft">
            {row.remindedWords}
          </span>
        )}
      </td>

      <td
        className={`${CELL} whitespace-nowrap fig font-mono text-[17px] tabular-nums text-ink`}
      >
        {money[row.duePence] ?? ""}
      </td>

      <td className="py-4 pr-5 align-middle whitespace-nowrap fig font-mono text-[17px] tabular-nums text-ink-soft">
        {money[row.remainingPence] ?? ""}
      </td>

      <td className="py-4 align-middle">
        <form action={remind}>
          <input type="hidden" name="booking" value={row.id} />
          <button
            type="submit"
            disabled={sending || state.sent > 0}
            className="t min-h-[44px] border border-ink bg-transparent px-4 py-2 text-[16px] font-medium text-ink hover:bg-ink hover:text-pool disabled:opacity-60"
          >
            {sending
              ? "Sending…"
              : state.sent > 0
                ? "Sent"
                : row.remindedWords
                  ? "Remind again"
                  : "Send a reminder"}
          </button>
        </form>
        {state.error && (
          <p
            role="alert"
            className="mt-2 max-w-[28ch] text-[15px] leading-snug text-pool-error"
          >
            {state.error}
          </p>
        )}
      </td>
    </tr>
  );
}
