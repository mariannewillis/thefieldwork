"use client";

import { useActionState, useState } from "react";
import {
  deleteWorkshop,
  type DeleteState,
} from "@/app/(admin)/admin/offerings/actions";

/**
 * Taking a workshop down for good.
 *
 * Subordinate by design: a plain outline until it is asked for, and it never
 * deletes on the first press. The confirm step is a second control that says
 * what will go, not a browser dialog — a `confirm()` box is chrome she cannot
 * read her own workshop's name in.
 *
 * A workshop somebody has paid for CANNOT be deleted, and the refusal comes
 * from the server — `deleteWorkshop` counts the bookings, and the database
 * refuses it too (D-16). It arrives here as `state.error` and is drawn where
 * every other error on this screen is drawn, rather than as a disabled button:
 * a control that is grey before it is pressed has to explain itself in advance,
 * and the sentence depends on a count this component does not have.
 *
 * When the portal's bookings page exists, the approved screen's blocked state
 * is the better shape — the button disabled, with "Six people have paid for
 * this day. Cancel and refund them on the bookings page first." It needs the
 * count passed in, and a page to point at.
 */

const INITIAL: DeleteState = { error: null };

export default function DeleteWorkshop({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(deleteWorkshop, INITIAL);
  const [asked, setAsked] = useState(false);

  return (
    <section className="pool on-pool mt-10 px-6 py-7 sm:px-8">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
        Taking it down
      </p>

      {state.error && (
        <p role="alert" className="mt-3 text-[17px] text-pool-error">
          {state.error}
        </p>
      )}

      {!asked ? (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <p className="max-w-[54ch] text-[17px] leading-relaxed text-ink-soft">
            Deleting removes this workshop&rsquo;s page from the site and takes
            everything written about the day with it. Untick &ldquo;Show this on
            the site&rdquo; above instead and it comes down but is kept.
          </p>
          <button
            type="button"
            onClick={() => setAsked(true)}
            className="t min-h-[44px] shrink-0 border border-pool-error px-8 py-4 text-[17px] font-semibold text-pool-error hover:bg-pool-error hover:text-pool"
          >
            Delete this workshop
          </button>
        </div>
      ) : (
        <form action={formAction} className="mt-3">
          <input type="hidden" name="id" value={id} />
          <p className="max-w-[54ch] font-display text-[24px] leading-tight text-ink">
            Delete {name}, for good?
          </p>
          <p className="mt-2 max-w-[54ch] text-[17px] leading-relaxed text-ink-soft">
            There is no undo. Everything written about this day, and every
            picture chosen for it, goes with it.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={pending}
              className="t min-h-[44px] bg-pool-error px-8 py-4 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
            >
              {pending ? "Deleting…" : `Yes, delete ${name}`}
            </button>
            <button
              type="button"
              onClick={() => setAsked(false)}
              className="t min-h-[44px] text-[17px] font-medium text-ink underline decoration-pool-rule underline-offset-4 hover:decoration-ink"
            >
              Keep it
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
