"use client";

import { useActionState } from "react";
import { payBalance, type PayState } from "../actions";

/**
 * The one button on the balance page.
 *
 * A client component only because the press has a middle state worth drawing —
 * making a Checkout Session takes a moment against Stripe, and a button that
 * looks unpressed for a second is a button somebody presses again. The action
 * behind it is the rule; this is the drawing of it.
 *
 * The error comes back as a sentence rather than a redirect, because every way
 * this can fail is a fact about the booking — cancelled, already paid, the
 * place gone — and those belong on the page that just claimed otherwise.
 */
export default function PayButton({
  token,
  amount,
}: {
  token: string;
  /** Already written out, e.g. "£120". */
  amount: string;
}) {
  const [state, submit, pending] = useActionState<PayState, FormData>(
    payBalance,
    { error: null },
  );

  return (
    <form action={submit}>
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="t mt-8 min-h-[56px] w-full bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Taking you to pay…" : `Pay the remaining ${amount}`}
      </button>

      {state.error && (
        <p
          role="alert"
          className="mt-4 border-l-2 border-pool-error bg-pool-error/10 px-4 py-3 text-[17px] leading-relaxed text-ink"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
