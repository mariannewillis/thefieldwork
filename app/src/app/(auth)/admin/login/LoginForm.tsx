"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />

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
          Username
        </span>
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-[48px] border-b border-pool-rule bg-transparent py-2 text-[19px] text-ink focus:border-action focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-[48px] border-b border-pool-rule bg-transparent py-2 text-[19px] text-ink focus:border-action focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="t mt-2 min-h-[52px] bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
