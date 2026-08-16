"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * Whether the letter on the screen is the letter in the database.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * On 2026-08-16 two letters went out empty. The operator wrote a heading, a
 * paragraph, a picture and a button, attached a file, and pressed Send. The
 * file arrived; nothing else did, because nothing else had ever been written
 * down — `saveNewsletter` had not run once, and `NewsletterBlock` held no rows
 * at all. Nothing on the screen was lying, and that is the point: the sheet was
 * showing his blocks (they were in the browser's memory), the send modal was
 * showing the real subscribers, the count was right. Every part was true about
 * a different thing, and the one question nobody was answering was whether the
 * two halves were the same letter.
 *
 * ── WHY A SHARED FLAG AND NOT SOMETHING CLEVERER ─────────────────────────────
 *
 * The alternative was to make Send save first. It was rejected: the sheet and
 * the send are two different forms with two different server actions, and one
 * silently submitting the other would mean the irreversible button also carried
 * every validation failure the reversible one can produce — "a button needs
 * words on it", raised for the first time by pressing Send to two hundred
 * people. Saving is her decision and it is one click; the send simply refuses
 * to run ahead of it.
 *
 * So the editor says whether it has been touched since the last save, and the
 * send and the preview read it. It is deliberately a CLAIM ABOUT A BROWSER and
 * not a guarantee — `beginSend` carries the guarantee, and refuses a letter
 * with nothing written in it whatever any screen believes.
 *
 * IT IS NEVER SILENT. Blocking a button without saying so is how you get
 * somebody clicking it four times; every consumer of this draws the reason
 * where the button was.
 */

type Guard = {
  /** True when the sheet has changed since the last successful save. */
  unsaved: boolean;
  setUnsaved: (value: boolean) => void;
};

const Context = createContext<Guard>({
  unsaved: false,
  setUnsaved: () => {},
});

export function DraftGuard({ children }: { children: React.ReactNode }) {
  const [unsaved, setUnsavedState] = useState(false);

  // Stable, so the editor can call it from an input handler on every keystroke
  // without the whole subtree re-rendering for the second and later ones.
  const setUnsaved = useCallback((value: boolean) => {
    setUnsavedState((current) => (current === value ? current : value));
  }, []);

  const value = useMemo(() => ({ unsaved, setUnsaved }), [unsaved, setUnsaved]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDraftGuard(): Guard {
  return useContext(Context);
}

/** The one sentence every blocked control says, so they all say the same one. */
export const UNSAVED_REASON =
  "There are changes on this sheet that have not been saved. A letter is sent from what is saved, not from what is on the screen — press Save this draft above and this comes back.";

/**
 * The link to the letter as it will arrive.
 *
 * IT IS A CONTROL AND NOT A CAPTION. It used to be an anchor with "(save first,
 * it shows what is saved)" printed beside it, which is a screen asking her to
 * remember something the screen already knows. While the sheet is unsaved the
 * link is not a link: it is the same words, greyed, with the reason under them.
 */
export function PreviewLink({ id, label }: { id: number; label: string }) {
  const { unsaved } = useDraftGuard();

  if (unsaved) {
    return (
      <>
        <p className="mt-4 text-[17px] font-medium text-plate-soft/70">
          {label}
        </p>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-plate-soft">
          {UNSAVED_REASON}
        </p>
      </>
    );
  }

  return (
    <p className="mt-4">
      <a
        href={`/admin/newsletters/${id}/preview`}
        target="_blank"
        rel="noreferrer"
        className="t text-[17px] font-medium text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
      >
        {label}
      </a>
      <span className="ml-3 text-[15px] text-plate-soft">
        (opens in a new tab)
      </span>
    </p>
  );
}
