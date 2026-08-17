"use client";

import { useEffect } from "react";

/**
 * The ledger could not be read.
 *
 * The sentence that has to be here is the one about what has NOT happened.
 * Somebody arriving at a broken bookings page mid-cancellation needs to know
 * that nothing was cancelled, no money moved and no record was removed — that
 * is a worse thing to be uncertain about than the error itself.
 *
 * The message from the exception is not printed. It is a database error and
 * would say nothing she can act on; the log is where it belongs, and that is
 * what the effect below is for.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      "[admin/workshop-bookings] could not read the ledger:",
      error,
    );
  }, [error]);

  return (
    <section className="pt-8">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
        Bookings
      </p>

      <div className="pool on-pool mt-6 max-w-[62ch] px-7 py-7">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-pool-error">
          Error
        </p>
        <p className="mt-2 font-display text-[26px] leading-tight text-pool-error">
          Couldn&rsquo;t load the bookings.
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          Cancelling, refunding and deleting are unavailable until this loads
          again. Nothing has been cancelled, no money has moved, and no record
          has been removed.
        </p>
        <button
          type="button"
          onClick={reset}
          className="t mt-5 min-h-[52px] border border-ink px-7 py-3 text-[17px] font-semibold text-ink hover:bg-ink hover:text-pool"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
