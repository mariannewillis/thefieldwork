"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * "I have seen all of these" — the escape hatch the per-row mark needs.
 *
 * A row can be taken in from its line alone: the name, the offering and the
 * time are all on it, and she should not have to open something she has already
 * understood just to stop it shouting. Without this, a screen she reads at a
 * glance would keep its dots for ever and the mark would go the way of every
 * unread badge nobody can clear.
 *
 * ONE PRESS, NO CONFIRM. Nothing is destroyed by it — the worst case is that a
 * dot she wanted goes, and the row is still there with everything on it.
 * Confirming a reversible, harmless action teaches her to press through
 * confirmations, which is what makes the ones that matter stop working.
 */
export default function MarkAllSeen({
  action,
  count,
}: {
  /** The screen's own action. This component knows nothing about either table. */
  action: () => Promise<void>;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (count === 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await action();
          // The action revalidates the screen; this is what makes the dots go
          // without her pressing reload.
          router.refresh();
        })
      }
      className="t min-h-[38px] py-1.5 text-[16px] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark all as seen"}
    </button>
  );
}
