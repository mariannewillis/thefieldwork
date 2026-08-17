"use client";

import { useActionState } from "react";
import { changePassword, type ChangeState } from "./actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";

const initial: ChangeState = { error: null };

const FIELD =
  "min-h-[48px] border-b border-pool-rule bg-transparent py-2 text-[19px] text-ink focus:border-action focus:outline-none";
const LABEL =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initial);

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
        <span className={LABEL}>Current password</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={LABEL}>New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={FIELD}
        />
        <span className="text-[15px] leading-relaxed text-ink-soft">
          At least {MIN_PASSWORD_LENGTH} characters. Three or four unrelated
          words you will remember — the length is what makes it strong, not the
          symbols.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className={LABEL}>New password again</span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={FIELD}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="t mt-2 min-h-[52px] bg-action px-6 text-[19px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
