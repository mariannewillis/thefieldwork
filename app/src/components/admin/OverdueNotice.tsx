"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * WHAT SHE IS TOLD ON ARRIVAL WHEN MONEY IS LATE (operator, 2026-08-21).
 *
 * ── WHY THERE IS ONE AT ALL ──────────────────────────────────────────────
 *
 * Nothing in this application runs on a timer, so nothing sends a reminder at
 * four weeks by itself. What CAN be relied on is that she opens the portal —
 * and the moment she does, this says what she would otherwise have to go
 * looking for. It is the honest version of "automatic": not a promise that a
 * machine chased somebody while she slept, but the thing she needs, waiting at
 * the door.
 *
 * ── IT IS DISMISSED, NOT CLEARED ─────────────────────────────────────────
 *
 * Pressing the cross puts it away FOR THIS VISIT and nothing else — the money
 * is still late and the rail still says so. A notice that could be permanently
 * dismissed would be one she dismissed in a hurry one Tuesday and never saw
 * again while three people drifted a month behind.
 *
 * `sessionStorage` and not a cookie or a column: it lasts exactly as long as
 * the tab, which is what "for this visit" means, and it leaves nothing of hers
 * on the server to go stale.
 *
 * ── AND IT IS NOT A TOAST THAT FLIES AWAY ────────────────────────────────
 *
 * It sits in the page, above the screen she opened, and stays until she puts it
 * away or goes to it. Something that appears in a corner and slides off after
 * four seconds is a thing she misses while carrying a cup of tea, and this is
 * the one message on the site about money somebody has not sent.
 */

const KEY = "tfw-overdue-dismissed";

export default function OverdueNotice({
  count,
  oldest,
}: {
  /** How many bookings have a payment past its day. */
  count: number;
  /** How late the latest one is, in her words. */
  oldest: string;
}) {
  const [shown, setShown] = useState(false);

  // Drawn only after mounting, so the server and the first client render agree
  // — `sessionStorage` does not exist on the server, and reading it during
  // render is the classic hydration mismatch.
  useEffect(() => {
    if (count > 0 && sessionStorage.getItem(KEY) !== "yes") setShown(true);
  }, [count]);

  if (!shown) return null;

  return (
    <div
      role="status"
      className="pool on-pool mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-l-4 border-l-pool-error px-7 py-5"
    >
      <div className="max-w-[62ch]">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
          {count === 1 ? "A payment is late" : `${count} payments are late`}
        </p>
        <p className="mt-2 font-display text-[24px] leading-tight text-ink">
          {count === 1
            ? `Somebody is ${oldest} on a course payment.`
            : `The furthest behind is ${oldest}.`}
        </p>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">
          Nothing has been sent to them automatically. Open the list and you can
          send a reminder with a link to pay, in one press each.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href="/admin/workshop-bookings?show=owing"
          className="t min-h-[52px] bg-action px-7 py-3 text-[17px] font-semibold text-pool hover:bg-ink"
        >
          {count === 1 ? "See it" : "See them"}
        </Link>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(KEY, "yes");
            setShown(false);
          }}
          className="t min-h-[44px] text-[16px] text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
