"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addLibraryDocument,
  addLibraryPicture,
  addLibraryVideo,
} from "@/app/(admin)/admin/media/actions";
import {
  FIELD,
  LABEL,
  mediaSrc,
  QUIET_BUTTON,
} from "@/components/admin/OfferingFormParts";

/**
 * Choosing from the library, by eye.
 *
 * SHE IS CHOOSING A PHOTOGRAPH, SO SHE IS SHOWN PHOTOGRAPHS. The control this
 * sits beside is a dropdown of basenames — `marianne room aglow`,
 * `whatsapp image 2026 08 07 at 16 45 48 3` — which is a list of file names
 * pretending to be a list of pictures. It stays, because it is a real keyboard
 * path and some names are genuinely the fastest way to a picture she just
 * uploaded, but it is no longer the only way in. Documents are shown with what
 * they actually are, in words; films are shown as what they are, which is a
 * link.
 *
 * ── THE TWO RULES THIS FILE EXISTS TO OBEY ────────────────────────────────
 *
 * 1. IT NEVER NESTS A FORM. This is opened from INSIDE the offering forms and
 *    from inside the newsletter sheet. HTML has no nested forms; React refuses
 *    to hydrate them, and a page that fails to hydrate can leave every button on
 *    it inert — which is exactly what stopped the newsletter's Save from ever
 *    running (D-30). There is no `<form>` anywhere below. Every upload and every
 *    pasted link calls its server action DIRECTLY, the way `PicturePicker`'s own
 *    file input already does, so there is nothing here that needs one.
 *
 * 2. IT IS RENDERED THROUGH A PORTAL, into `document.body`. That is not about
 *    stacking context. `createPortal` moves the real DOM node out of the
 *    surrounding form, and both of the things that would otherwise go wrong
 *    follow the DOM rather than the React tree: a text input inside a form is
 *    posted with that form when it saves, and pressing Enter in it triggers the
 *    form's implicit submission. Inside the sheet, typing a film's address and
 *    pressing Enter would have saved the workshop. Outside it, the same keypress
 *    reaches the handler it was meant for.
 *
 * NO `name` ON ANY BUTTON, either — React encodes which action a `formAction`
 * button is calling in its `name`, and setting our own produced the
 * `$ACTION_REF_6` mismatch that D-30 records. Nothing here carries `formAction`
 * at all, which is the sturdier version of the same rule.
 */

export type PickerKind = "picture" | "video" | "document";

/** One thing to choose from, as the picker needs it. */
export type PickableAsset = {
  kind: PickerKind;
  /** The basename, the address, or the store key — what the caller gets back. */
  ref: string;
  title: string | null;
  /**
   * NO `alt` BESIDE THIS, and there never usefully was one. Every caller passed
   * null: the description of a photograph belongs to the page that uses it —
   * `WorkshopImage.alt` and its siblings are required columns — so there was
   * nothing on the file itself to hand over. The tiles take an empty alt and
   * carry the name as the button's own label instead, which is the honest shape
   * for a grid whose whole job is choosing by eye.
   */
  contentType: string | null;
  bytes: number | null;
  /**
   * How many places already use it, when the caller knows. Printed, and never a
   * bar to choosing. Left undefined by callers that have only a list of names —
   * an unknown count printed as "not used yet" would be a guess presented as a
   * fact, so the line is omitted instead.
   */
  useCount?: number;
  /** Documents only: whether a link to it works without a session. */
  reachableWithoutASession?: boolean;
};

const OVERLAY =
  "fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 sm:p-8";
const SHEET = "pool on-pool w-full max-w-[1000px] px-6 py-7 sm:px-9 sm:py-8";
const TILE =
  "t relative flex w-full flex-col border border-pool-rule/50 p-0 text-left hover:border-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";
const TILE_ON =
  "t relative flex w-full flex-col border-2 border-action p-0 text-left";

/** "a PDF", "a Word document" — what she would call it, from what it is. */
function kindWords(contentType: string | null): string {
  if (!contentType) return "a file";
  if (contentType === "application/pdf") return "a PDF";
  if (contentType === "image/jpeg") return "a JPEG";
  if (contentType === "image/png") return "a PNG";
  if (contentType.includes("wordprocessingml")) return "a Word document";
  if (contentType.includes("spreadsheetml")) return "a spreadsheet";
  if (contentType.includes("presentationml")) return "a PowerPoint";
  return "a file";
}

/** "1.4 MB", "812 kB". The same words the letter prints. */
function sizeWords(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/** Vimeo and YouTube, told apart for the plate that stands in for a still. */
function filmWords(url: string): string {
  if (url.includes("vimeo.com")) return "Vimeo";
  if (url.includes("youtu")) return "YouTube";
  return "A film";
}

const WORDS: Record<
  PickerKind,
  { one: string; many: string; empty: string; nothing: string }
> = {
  picture: {
    one: "Choose a picture",
    many: "Choose pictures",
    empty: "Nothing in your pictures yet. Add one below and it appears here.",
    nothing: "No pictures",
  },
  video: {
    one: "Choose a film",
    many: "Choose films",
    empty:
      "No films yet. Put one on Vimeo or YouTube and paste its address below.",
    nothing: "No films",
  },
  document: {
    one: "Choose a document",
    many: "Choose documents",
    empty: "Nothing in your documents yet. Add one below and it appears here.",
    nothing: "No documents",
  },
};

/**
 * The picker.
 *
 * SINGLE OR MANY IS THE CALLER'S DECISION, not a thing she has to notice.
 * A hero picture takes one; a workshop's rail takes several; a letter takes
 * several documents. `multiple` changes what the tiles do (replace the choice,
 * or add to it) and what the button at the bottom says, and nothing else — the
 * grid, the upload and the refusals are identical either way, because the
 * question "which pictures" is the same question whichever number of answers it
 * has.
 */
export default function GalleryPicker({
  kind,
  assets,
  multiple,
  open,
  chosen,
  onClose,
  onPick,
  onAdded,
}: {
  kind: PickerKind;
  assets: PickableAsset[];
  /** True where the calling screen takes several. */
  multiple?: boolean;
  open: boolean;
  /** What is already chosen, so re-opening shows her where she was. */
  chosen?: string[];
  onClose: () => void;
  /** One ref for a single picker; as many as she ticked for a multiple one. */
  onPick: (refs: string[]) => void;
  /** Something new arrived, so the caller can grow its own copy of the list. */
  onAdded?: (ref: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>(chosen ?? []);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /**
   * "This picture is 828 pixels wide…" — the same kind of thing as `held`
   * below: a fact she cannot otherwise learn, not a refusal. It is kept apart
   * from `refused` because nothing has gone wrong, and apart from `held`
   * because the two can both be true of one upload.
   */
  const [soft, setSoft] = useState<string | null>(null);
  /**
   * "You already have this picture…" — a fact, not a refusal, and drawn as one.
   *
   * It sits in its own state rather than sharing `refused`, because the two are
   * different events wearing different colours: one means she has to do
   * something, the other means she does not. The tile is already ticked by the
   * time she reads this.
   */
  const [held, setHeld] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const sheet = useRef<HTMLDivElement>(null);

  /**
   * Only mounted in the browser.
   *
   * `document` does not exist while this is rendered on the server, and the
   * portal needs it. A flag set in an effect is the honest version of that:
   * nothing is drawn until there is somewhere to draw it.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Re-opening shows her what is already chosen rather than a blank grid.
  useEffect(() => {
    if (open) {
      setPicked(chosen ?? []);
      setRefused(null);
      setHeld(null);
    }
    // `chosen` is deliberately not a dependency: it is a snapshot taken when the
    // sheet opens, and following it afterwards would fight her ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Escape closes it, and the page behind does not scroll while it is up.
   *
   * Escape is bound on the document rather than on the sheet because focus may
   * legitimately be on the file input, which swallows keys of its own.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !ready) return null;

  const words = WORDS[kind];

  const toggle = (ref: string) => {
    setRefused(null);
    setHeld(null);
    if (!multiple) {
      // One press is the whole interaction where one is wanted. Ticking a tile
      // and then pressing a second button to confirm is two presses for a
      // decision she has already made.
      onPick([ref]);
      onClose();
      return;
    }
    setPicked((current) =>
      current.includes(ref)
        ? current.filter((entry) => entry !== ref)
        : [...current, ref],
    );
  };

  async function take(input: HTMLInputElement) {
    const files = [...(input.files ?? [])];
    if (files.length === 0) return;
    // Cleared straight away so choosing the same file twice — after a refusal
    // she has since fixed — still counts as a change and fires this again.
    input.value = "";

    setBusy(true);
    setRefused(null);
    setHeld(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        const result =
          kind === "document"
            ? await addLibraryDocument(body)
            : await addLibraryPicture(body);
        if (!result.ok) {
          setRefused(result.error);
          break;
        }
        // Already here: the ref that came back names the copy she has, so the
        // tick below chooses THAT one and this only has to say so.
        if (result.alreadyHeld) setHeld(result.alreadyHeld);
        if (result.soft) setSoft(result.soft);
        onAdded?.(result.ref);
        // An upload is a choice: she went and found this file in order to use
        // it, so it arrives ticked rather than waiting to be found again.
        setPicked((current) =>
          multiple
            ? current.includes(result.ref)
              ? current
              : [...current, result.ref]
            : [result.ref],
        );
      }
    } catch {
      setRefused("That did not get there. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    const raw = link.trim();
    if (!raw) return;
    setBusy(true);
    setRefused(null);
    try {
      const body = new FormData();
      body.set("url", raw);
      const result = await addLibraryVideo(body);
      if (!result.ok) {
        setRefused(result.error);
        return;
      }
      setLink("");
      onAdded?.(result.ref);
      setPicked((current) =>
        multiple
          ? current.includes(result.ref)
            ? current
            : [...current, result.ref]
          : [result.ref],
      );
    } catch {
      setRefused("That did not get there. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className={OVERLAY}
      // A press on the ground behind closes it, which is what everybody
      // expects. Guarded on the target being the ground itself, or a press that
      // began on a tile and ended here would close it too.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-h"
        tabIndex={-1}
        className={SHEET}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2
            id="picker-h"
            className="font-display text-[30px] leading-tight text-ink"
          >
            {multiple ? words.many : words.one}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="t min-h-[44px] text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
          >
            Close
          </button>
        </div>

        <p className="mt-2 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
          {multiple
            ? "Press each one you want. They are added in the order you press them."
            : "Press one and this closes."}{" "}
          Everything on the site is here already — nothing needs importing.
        </p>

        {assets.length === 0 ? (
          <p className="mt-8 max-w-[54ch] text-[19px] leading-relaxed text-ink">
            {words.empty}
          </p>
        ) : (
          <ul className="mt-7 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => {
              const on = picked.includes(asset.ref);
              return (
                <li key={asset.ref}>
                  <button
                    type="button"
                    aria-pressed={multiple ? on : undefined}
                    onClick={() => toggle(asset.ref)}
                    className={on ? TILE_ON : TILE}
                  >
                    {kind === "picture" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(asset.ref)}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-[4/3] w-full items-center justify-center bg-ink/5 px-4 text-center">
                        <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
                          {kind === "video"
                            ? filmWords(asset.ref)
                            : kindWords(asset.contentType)}
                        </span>
                      </span>
                    )}

                    <span className="flex flex-col gap-1 px-3 py-3">
                      <span className="text-[15px] font-medium leading-snug text-ink">
                        {asset.title ?? asset.ref.replace(/-/g, " ")}
                      </span>
                      <span className="fig font-mono text-[13px] leading-snug text-ink-soft">
                        {kind === "document" && (
                          <>
                            {kindWords(asset.contentType)}
                            {asset.bytes ? ` · ${sizeWords(asset.bytes)}` : ""}
                            {" · "}
                            {asset.reachableWithoutASession
                              ? "anybody with the link"
                              : "only you"}
                          </>
                        )}
                        {kind === "video" && filmWords(asset.ref)}
                        {kind === "picture" &&
                          asset.useCount !== undefined &&
                          (asset.useCount === 0
                            ? "not used yet"
                            : asset.useCount === 1
                              ? "used once"
                              : `used ${asset.useCount} times`)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Adding something new, from in here ───────────────────────────
            She is already looking for a picture; making her close this, find
            the upload control on the form behind it, and come back is three
            moves for one intention. */}
        <div className="mt-8 border-t border-pool-rule/40 pt-6">
          {kind === "video" ? (
            <>
              <p className={LABEL} id="picker-link-label">
                Or paste a film&rsquo;s address
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                <input
                  type="text"
                  inputMode="url"
                  aria-labelledby="picker-link-label"
                  placeholder="https://vimeo.com/76979871"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  /* Enter adds the film rather than doing nothing. The portal
                     already means it cannot submit the form behind this, but
                     `preventDefault` is kept so the intent is on the page
                     rather than resting on where the node happens to live. */
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void paste();
                  }}
                  className={`${FIELD} min-w-[18rem] flex-1`}
                />
                <button
                  type="button"
                  onClick={() => void paste()}
                  disabled={busy}
                  className={`${QUIET_BUTTON} disabled:opacity-60`}
                >
                  {busy ? "Adding…" : "Add this film"}
                </button>
              </div>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                Films are links, never uploads &mdash; put it on Vimeo or
                YouTube and paste the address. Vimeo for preference, because
                YouTube records who watched. Nothing is loaded from either until
                somebody presses play.
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label
                className={`${QUIET_BUTTON} inline-flex cursor-pointer items-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action`}
              >
                <input
                  type="file"
                  accept={
                    kind === "document"
                      ? ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                      : "image/jpeg,image/png,image/webp,image/avif"
                  }
                  multiple={multiple}
                  disabled={busy}
                  onChange={(event) => void take(event.currentTarget)}
                  className="sr-only"
                />
                {busy
                  ? "Adding…"
                  : kind === "document"
                    ? "Add a document from this computer"
                    : "Add a picture from this computer"}
              </label>
              <p className="max-w-[40ch] text-[15px] leading-relaxed text-ink-soft">
                {kind === "document"
                  ? "It goes into your documents and stays private until you put it on a letter."
                  : "It goes up straight away and is chosen for you."}
              </p>
            </div>
          )}

          {refused && (
            <p
              role="alert"
              className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-pool-error"
            >
              {refused}
            </p>
          )}

          {/* Not an alert. Nothing needs recovering from — she asked for this
              picture and she has it; all that changed is that no seventh copy
              of it was made. */}
          {held && (
            <p
              role="status"
              className="mt-4 max-w-[62ch] border-l-2 border-action pl-4 text-[17px] leading-relaxed text-ink"
            >
              {held}
            </p>
          )}

          {/* Also not an alert, and for the same reason: the picture is in and
              she can use it. What she could not otherwise know is that it will
              look soft where the site draws one full width. */}
          {soft && (
            <p
              role="status"
              className="mt-4 max-w-[62ch] border-l-2 border-gold pl-4 text-[17px] leading-relaxed text-ink"
            >
              {soft}
            </p>
          )}
        </div>

        {/* One press to finish, and only where several are wanted — the single
            picker has already closed by the time anything could be read here. */}
        {multiple && (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-pool-rule/40 pt-6">
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={() => {
                onPick(picked);
                onClose();
              }}
              className="t min-h-[52px] bg-action px-8 py-3 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-50"
            >
              {picked.length === 0
                ? "Nothing chosen yet"
                : picked.length === 1
                  ? "Use this one"
                  : `Use these ${picked.length}`}
            </button>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {picked.length === 0
                ? words.nothing
                : "Press again on one you have chosen to take it back off."}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
