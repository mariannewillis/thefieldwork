"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "./actions";

const initial: ForgotState = { sent: false, error: null };

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestReset, initial);

  if (state.sent) {
    return (
      <p className="mt-6 border-l-2 border-pool-success bg-pool-success/10 px-4 py-4 text-[17px] leading-relaxed text-ink">
        If that address belongs to an account, a reset link is on its way. It
        expires in an hour.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      {state.error && (
        <p
          role="alert"
          className="border-l-2 border-pool-error bg-pool-error/10 px-4 py-3 text-[17px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
          Email address
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          className="min-h-[48px] border-b border-pool-rule bg-transparent py-2 text-[19px] text-ink focus:border-action focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="t mt-2 min-h-[52px] bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send me a link"}
      </button>
    </form>
  );
}
