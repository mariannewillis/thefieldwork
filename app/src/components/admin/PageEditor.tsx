"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  editPage,
  type PageActionState,
} from "@/app/(admin)/admin/pages/actions";
import GalleryPicker from "@/components/admin/GalleryPicker";
import {
  PREVIEW_MESSAGE,
  type Edit,
  type Selection,
} from "@/components/admin/PreviewBridge";
import type { PendingChange } from "@/lib/pages/publish";
import type { PictureSlot, TextSlot } from "@/lib/pages/slots";

/**
 * THE TOOLBOX — what she can do to whatever she has just clicked.
 *
 * ONE PANEL THAT CHANGES, not a form of named boxes. That is D-2's whole
 * argument and it survived D-34 intact: the seven beats are a narrative that
 * only makes sense in order and in place, and a list of "Throat · body" fields
 * asks a non-technical practitioner to hold a mapping between a label and a
 * paragraph she can picture. She clicks the paragraph; the panel becomes that
 * paragraph's controls.
 *
 * WHAT IS OFFERED IS DECIDED BY WHAT IS SELECTED, and there are five things to
 * select:
 *
 *   nothing   how to start, and what the page is.
 *   a slot    one of the seven beats' words or photographs. Change it, or put
 *             it back to how it was written.
 *   a section a band. Hide it, move it, add one above or below. If it is one
 *             she made: its background, what goes in it, and delete.
 *   a block   a box of words, words on the picture, or a picture. Where it
 *             sits, what lines are in it, and delete.
 *   an item   one line. Its words, where it goes if it is a link, and delete.
 *
 * NO SIZE, NO COLOUR, NO ALIGNMENT, ANYWHERE IN HERE. She chooses WHAT a thing
 * is and WHERE it goes; the stylesheet decides how it looks. That is brief §12
 * — "her branding is the template, not an option" — and it is the half of D-2
 * the operator kept when the rest was superseded (2026-08-18). It is also what
 * makes a band she adds in December look like the page it was added to.
 *
 * NOTHING HERE IS A `<form>` INSIDE ANOTHER ONE, and no button carries a
 * `formAction` with a `name` of its own. Both rules are D-30's, learned the
 * hard way on the newsletter editor: the first left every button on that screen
 * inert including Save, and the second produced an `$ACTION_REF` hydration
 * mismatch. Every control here calls the one server action directly.
 */

export type EditorSection = {
  id: number;
  kind: "beat" | "free";
  beat?: string;
  label: string;
  note: string;
  hidden: boolean;
  hasPicture: boolean;
  pictureRef?: string;
  pictureAlt?: string;
  /** free only: steps taller than the band sets itself, and where it looks. */
  tall: number;
  focusY: number;
};

export type EditorBlock = {
  id: number;
  section: number;
  kind: string;
  placement: string;
  pictureRef?: string;
  pictureAlt?: string;
  /** picture only: the frame it is cut to, and what stays in frame. */
  shape: string;
  focusX: number;
  focusY: number;
};

export type EditorItem = {
  id: number;
  block: number;
  kind: string;
  text: string;
  href: string | null;
  /** Steps bigger or smaller than this kind of line is set at. */
  size: number;
  /** The edge this one line is set to. Null follows the box it is in. */
  align: "left" | "centre" | "right" | null;
};

type Props = {
  page: string;
  label: string;
  href: string;
  previewSrc: string;
  pending: PendingChange[];
  slots: TextSlot[];
  pictureSlots: PictureSlot[];
  text: Record<string, string>;
  /** Steps bigger or smaller, per text slot on the seven beats. */
  sizes: Record<string, number>;
  pictures: Record<string, { ref: string; alt: string }>;
  sections: EditorSection[];
  blocks: Record<number, EditorBlock>;
  items: Record<number, EditorItem>;
  library: string[];
  /** Documents she can point a link at, from the media library. */
  documents: { ref: string; title: string | null; href: string }[];
  /** Somewhere on this site a link can go, so the common case is not typing. */
  destinations: { href: string; label: string }[];
};

// ── the portal's own type, borrowed from the screens beside this one ─────────

const PRIMARY =
  "t min-h-[48px] bg-action px-6 py-2.5 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60";
const OUTLINE =
  "t min-h-[42px] border border-ink bg-transparent px-4 py-2 text-[16px] font-medium text-ink hover:bg-ink hover:text-pool disabled:opacity-60";
const GHOST =
  "t min-h-[38px] py-1.5 text-[16px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";
const CHIP =
  "t min-h-[38px] border border-pool-rule px-3 py-1.5 text-[15px] text-ink hover:border-ink";
const CHIP_ON =
  "t min-h-[38px] border border-ink bg-ink px-3 py-1.5 text-[15px] text-pool";
const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const HINT = "mt-1 block text-[15px] leading-relaxed text-ink-soft";
const FIELD =
  "mt-2 w-full border border-pool-rule bg-transparent px-3 py-2.5 text-[17px] text-ink focus:border-ink focus:outline-none";
const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

/** The three placements, in her words and in the order they read across. */
const PLACEMENTS = [
  { value: "left", label: "Left" },
  { value: "centre", label: "Centre" },
  { value: "right", label: "Right" },
] as const;

/** What she can put in a section, said as the thing rather than as the class. */
const BLOCK_KINDS = [
  {
    value: "pool",
    label: "A box of words",
    note: "The pale clearing the page uses.",
  },
  {
    value: "onplate",
    label: "Words on the picture",
    note: "Nothing behind them.",
  },
  {
    value: "picture",
    label: "A picture",
    note: "Placed in the band, not behind it.",
  },
] as const;

/**
 * KEEP WHAT SHE WROTE WHEN SHE LEAVES THE FIELD (operator, 2026-08-20 — "it
 * seems like we have to click save or text doesnt show it should automatically
 * save and render what i wrote so text isnt lost when i click out of the tool
 * box").
 *
 * Typing on the PAGE has always saved itself: the bridge writes back the moment
 * the caret leaves. Typing in the TOOLBOX did not — it waited for Save, so
 * clicking anywhere else threw the sentence away, and the preview beside it
 * went on showing the old words as if nothing had been typed. Two ways of
 * writing on one screen, one of which quietly loses work.
 *
 * ONLY WHEN IT CHANGED. Leaving a field she did not touch must not write a row,
 * reload the frame and refresh the page for nothing — most blurs are her moving
 * on, not editing.
 *
 * THE SAVE BUTTON STAYS. It is how she says "I have finished" when she wants to
 * see the result without clicking away first, and taking it out would make a
 * screen where nothing visibly commits.
 */
function keepOnBlur(changed: boolean, save: () => void) {
  return () => {
    if (changed) save();
  };
}

/**
 * HOW MUCH OF THE SCREEN A SECTION SHE MADE TAKES.
 *
 * Four, because there are four answers to "how tall should this be" — and
 * because the version this replaced was seven steps of a multiplier that never
 * reached the size the question was about. The order is the order she reads
 * them in: least room first.
 */
const TALL_CHOICES = [
  { label: "A band", note: "As deep as the page makes a band." },
  { label: "Half the screen", note: "Half of what somebody can see at once." },
  { label: "Most of the screen", note: "Three quarters of it." },
  {
    label: "The whole screen",
    note: "All of it — the band fills the screen, which is what a photograph worth showing wants.",
  },
] as const;

/**
 * The frames a placed photograph can be cut to.
 *
 * "As it is" leads because it is the default and every picture already on a
 * page is one. The circle is here because the operator asked for it by name —
 * see the note on `PagePictureShape` in the schema for why that overrules the
 * site's one-curve rule rather than drifting past it.
 */
const PICTURE_SHAPES = [
  { value: "natural", label: "As it is" },
  { value: "rectangle", label: "Rectangle" },
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
] as const;

/** The kinds of line, in the order she is most likely to want them. */
const ITEM_KINDS = [
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Paragraph" },
  { value: "bullets", label: "A list of lines" },
  { value: "eyebrow", label: "Small gold line" },
  { value: "link", label: "Link" },
  { value: "button", label: "Button" },
] as const;

/**
 * BIGGER AND SMALLER, in steps, on whatever is selected.
 *
 * Added at the operator's direction (2026-08-18), reversing the answer he gave
 * the same day on styling controls. It is the version that cannot break the
 * page: each step MULTIPLIES the size the composition set rather than replacing
 * it, so the responsive behaviour survives and a heading stays bigger than the
 * paragraph under it — and the range is bounded at both ends, so there is no
 * step that makes anything unreadable.
 */
/**
 * WHICH EDGE ONE LINE IS SET TO (operator, 2026-08-20).
 *
 * "Follow the box" is the fourth chip rather than an absence, because it is a
 * choice she comes back to: having centred a heading over left-set paragraphs,
 * the way to undo it has to be as findable as the way she did it. A control
 * that can only be set is a control that traps her.
 */
function EdgeRow({
  align,
  busy,
  onSet,
}: {
  align: "left" | "centre" | "right" | null;
  busy: boolean;
  onSet: (next: "left" | "centre" | "right" | "") => void;
}) {
  const OPTIONS = [
    { value: "", label: "Follow the box" },
    { value: "left", label: "Left" },
    { value: "centre", label: "Centre" },
    { value: "right", label: "Right" },
  ] as const;

  return (
    <div className="mt-5">
      <span className={LABEL}>Set to</span>
      <span className={HINT}>
        {align === null
          ? "Wherever the box it is in sits."
          : "This line only — the rest of the box is unchanged."}
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={busy}
            aria-pressed={(align ?? "") === option.value}
            className={
              (align ?? "") === option.value ? `${CHIP} border-ink` : CHIP
            }
            onClick={() => onSet(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A PERCENTAGE, IN TENS, AS A ROW OF STEPS — never a slider.
 *
 * A slider is a control that has to be dragged accurately in a panel beside a
 * page that redraws on every change; two presses and looking at the result is
 * both easier to aim and easier to undo. Tens are as fine as this needs to be:
 * the difference between 40% and 45% of a photograph is not a decision anybody
 * makes on purpose.
 */
function FocusRow({
  label,
  hint,
  value,
  busy,
  lower,
  higher,
  onSet,
}: {
  label: string;
  hint: string;
  value: number;
  busy: boolean;
  /** What 0 means, in her words — "Top" or "Left". */
  lower: string;
  /** And 100 — "Bottom" or "Right". */
  higher: string;
  onSet: (next: number) => void;
}) {
  return (
    <div className="mt-5">
      <span className={LABEL}>{label}</span>
      <span className={HINT}>
        {value === 50 ? hint : `${value}% from the ${lower.toLowerCase()}.`}
      </span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || value <= 0}
          className={CHIP}
          onClick={() => onSet(value - 10)}
        >
          &uarr; {lower}
        </button>
        <button
          type="button"
          disabled={busy || value >= 100}
          className={CHIP}
          onClick={() => onSet(value + 10)}
        >
          &darr; {higher}
        </button>
        {value !== 50 && (
          <button type="button" className={GHOST} onClick={() => onSet(50)}>
            Back to the middle
          </button>
        )}
      </div>
    </div>
  );
}

function SizeRow({
  step,
  busy,
  onStep,
}: {
  step: number;
  busy: boolean;
  onStep: (next: number) => void;
}) {
  return (
    <div className="mt-5">
      <span className={LABEL}>Size</span>
      <span className={HINT}>
        {step === 0
          ? "As the page was designed."
          : `${step > 0 ? "Bigger" : "Smaller"} than the page was designed, by ${Math.abs(step)}.`}
      </span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || step <= -2}
          className={CHIP}
          onClick={() => onStep(step - 1)}
          aria-label="Smaller"
        >
          &minus; Smaller
        </button>
        <button
          type="button"
          disabled={busy || step >= 3}
          className={CHIP}
          onClick={() => onStep(step + 1)}
          aria-label="Bigger"
        >
          + Bigger
        </button>
        {step !== 0 && (
          <button type="button" className={GHOST} onClick={() => onStep(0)}>
            Back to the designed size
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * WHERE A LINK OR A BUTTON GOES, without her having to know what a URL is.
 *
 * Three ways in, and typing one out is the last of them: a page on this site
 * from a list, a document from her library, or an address she writes. The
 * operator asked for documents by name — "add links or documents" — and a
 * document linked from a page becomes reachable the moment that page is
 * published, by the same rule that makes one on a letter reachable.
 */
function TargetField({
  href,
  setHref,
  destinations,
  documents,
}: {
  href: string;
  setHref: (value: string) => void;
  destinations: Props["destinations"];
  documents: Props["documents"];
}) {
  const [showing, setShowing] = useState<null | "pages" | "documents">(null);
  const named =
    destinations.find((one) => one.href === href)?.label ??
    documents.find((one) => one.href === href)?.title ??
    null;

  return (
    <div className="mt-4">
      <span className={LABEL}>Where it goes</span>
      {named && (
        <span className={HINT}>
          {named} &mdash; press one of the two below to change it.
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={showing === "pages" ? CHIP_ON : CHIP}
          onClick={() => setShowing(showing === "pages" ? null : "pages")}
        >
          A page on this site
        </button>
        <button
          type="button"
          className={showing === "documents" ? CHIP_ON : CHIP}
          onClick={() =>
            setShowing(showing === "documents" ? null : "documents")
          }
        >
          A document
        </button>
      </div>

      {showing === "pages" && (
        <ul className="mt-3 flex flex-col border-t border-pool-rule">
          {destinations.map((one) => (
            <li key={one.href} className="border-b border-pool-rule">
              <button
                type="button"
                className="w-full py-2.5 text-left text-[16px] text-ink hover:underline"
                onClick={() => {
                  setHref(one.href);
                  setShowing(null);
                }}
              >
                {one.label}{" "}
                <span className="fig font-mono text-[14px] text-ink-soft">
                  {one.href}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showing === "documents" && (
        <div className="mt-3">
          {documents.length === 0 ? (
            <p className="text-[16px] leading-relaxed text-ink-soft">
              There are no documents in your library yet. They are added on the
              Media screen.
            </p>
          ) : (
            <>
              <p className="text-[15px] leading-relaxed text-ink-soft">
                Anybody who can see the page can open the document once it is
                published, the same as one on a letter.
              </p>
              <ul className="mt-2 flex flex-col border-t border-pool-rule">
                {documents.map((one) => (
                  <li key={one.ref} className="border-b border-pool-rule">
                    <button
                      type="button"
                      className="w-full py-2.5 text-left text-[16px] text-ink hover:underline"
                      onClick={() => {
                        setHref(one.href);
                        setShowing(null);
                      }}
                    >
                      {one.title ?? one.ref}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <input
        type="text"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        className={FIELD}
        aria-label="Where it goes"
      />
      <span className={HINT}>
        Or write it: a page on this site like <code>/services</code>, or a place
        further down this one like <code>#dates</code>.
      </span>
    </div>
  );
}

export default function PageEditor(props: Props) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);

  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [state, setState] = useState<PageActionState>({ error: null, done: 0 });
  const [busy, setBusy] = useState(false);
  const [browsingFor, setBrowsingFor] = useState<null | {
    intent: string;
    extra: Record<string, string>;
    alt: string;
  }>(null);
  const [confirming, setConfirming] = useState<
    null | "publish" | "discard" | "delete"
  >(null);

  /**
   * WHAT WIDTH THE PAGE IS DRAWN AT, and it is not the width of the column.
   *
   * The panel takes 380px, so the frame is about 875px across — which is under
   * the page's own 900px breakpoint, so she would be editing the TABLET
   * composition while thinking she was looking at the site. The frame is given
   * a real width instead and scaled down to fit, so what she sees is the real
   * arrangement at a smaller size rather than a different arrangement at the
   * right size.
   *
   * The phone width is here because about a third of the people who read this
   * page will be on one, and the two compositions genuinely differ.
   */
  const [width, setWidth] = useState<1440 | 390>(1440);
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const available = node.clientWidth;
      setScale(available > 0 ? Math.min(1, available / width) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  /** The frame's own height, before scaling. Tall enough to be worth scrolling. */
  const frameHeight = width === 390 ? 844 : 900;

  const slotByKey = new Map(props.slots.map((slot) => [slot.key, slot]));
  const pictureByKey = new Map(
    props.pictureSlots.map((slot) => [slot.key, slot]),
  );

  const run = useCallback(
    async (intent: string, extra: Record<string, string> = {}) => {
      setBusy(true);
      setState({ error: null, done: 0 });

      const form = new FormData();
      form.set("page", props.page);
      form.set("intent", intent);
      for (const [key, value] of Object.entries(extra)) form.set(key, value);

      const result = await editPage({ error: null, done: 0 }, form);
      setState(result);
      setBusy(false);

      if (!result.error) {
        frame.current?.contentWindow?.location.reload();
        router.refresh();
      }
      return result;
    },
    [props.page, router],
  );

  // ── talking to the frame ────────────────────────────────────────────────
  useEffect(() => {
    const origin = window.location.origin;
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      const data = event.data as {
        type?: string;
        selection?: Selection;
        ready?: boolean;
        edit?: Edit;
      } | null;
      if (!data || data.type !== PREVIEW_MESSAGE) return;

      // SHE TYPED ON THE PAGE AND CLICKED AWAY. The frame has read the words
      // back off the element; this is the only thing that writes them down.
      if (data.edit) {
        const edit = data.edit;
        void (edit.kind === "slot"
          ? run("set-text", { key: edit.slot, value: edit.value })
          : run("set-item", { item: String(edit.item), value: edit.value }));
        return;
      }

      if (data.ready) {
        // A redraw has finished. Put the outline back where she left it, so
        // saving a sentence does not also lose her place on a long page.
        frame.current?.contentWindow?.postMessage(
          { type: PREVIEW_MESSAGE, select: selection },
          origin,
        );
        return;
      }
      if (data.selection) setSelection(data.selection);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selection, run]);

  /**
   * Do one thing, then redraw both halves.
   *
   * `router.refresh()` re-renders this screen from the server — which is what
   * re-reads the pending list and the values in these fields — and the frame is
   * reloaded separately because it is a document of its own and Next's refresh
   * does not reach inside it.
   */
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-6 lg:flex-row">
      {/* ── the page itself ────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className={EYEBROW}>Your words</p>
            <h1 className="mt-2 font-display text-[30px] font-normal leading-tight text-plate-text">
              {props.label}
            </h1>
          </div>
          <Link href="/admin/pages" className={GHOST}>
            All pages
          </Link>
        </div>

        <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-plate-soft">
          Click anything on the page below and the panel beside it becomes that
          thing&rsquo;s controls. Nothing here is on the site until you publish.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft">
            Seen as
          </span>
          {(
            [
              [1440, "A computer"],
              [390, "A phone"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                width === value
                  ? "t min-h-[36px] border border-gold bg-gold px-3 py-1.5 text-[15px] text-ink"
                  : "t min-h-[36px] border border-plate-rule px-3 py-1.5 text-[15px] text-plate-soft hover:border-gold"
              }
              onClick={() => setWidth(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* A document of its own, so the site's stylesheet and the portal's
            never meet — see app/(preview)/layout.tsx. Drawn at a real width and
            scaled to fit, so the composition is the site's rather than the
            column's. Clicks land correctly through the transform: the browser
            maps the coordinates, so the frame inside knows nothing about it. */}
        <div
          ref={stage}
          className="mt-3 overflow-hidden border border-plate-rule bg-black"
          style={{ height: frameHeight * scale }}
        >
          <iframe
            ref={frame}
            src={props.previewSrc}
            title={`${props.label} — the page as you are editing it`}
            className="block border-0"
            style={{
              width,
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      </div>

      {/* ── the toolbox ────────────────────────────────────────────────── */}
      <aside aria-label="The toolbox" className="w-full shrink-0 lg:w-[380px]">
        <div className="pool on-pool sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto px-6 py-6">
          <Toolbox
            {...props}
            selection={selection}
            slotByKey={slotByKey}
            pictureByKey={pictureByKey}
            busy={busy}
            run={run}
            onBrowse={setBrowsingFor}
            confirming={confirming}
            setConfirming={setConfirming}
          />

          {state.error && (
            <p
              role="alert"
              className="mt-5 text-[16px] leading-relaxed text-pool-error"
            >
              {state.error}
            </p>
          )}

          {/* ── what is waiting to go out ─────────────────────────────── */}
          <div className="mt-8 border-t border-pool-rule pt-6">
            {props.pending.length === 0 ? (
              <p className="text-[16px] leading-relaxed text-ink-soft">
                Nothing is waiting. What is on the site is what you have here.
              </p>
            ) : (
              <>
                <p className={EYEBROW}>
                  {props.pending.length === 1
                    ? "1 change not published"
                    : `${props.pending.length} changes not published`}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {props.pending.map((change, index) => (
                    <li
                      key={`${change.where}-${change.what}-${index}`}
                      className="text-[16px] leading-snug text-ink"
                    >
                      <span className="text-ink-soft">{change.where}</span>{" "}
                      &mdash; {change.what}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {confirming === "publish" ? (
              <div className="mt-5">
                <p className="text-[16px] leading-relaxed text-ink">
                  Put {props.pending.length === 1 ? "this" : "all of these"} on
                  the site now? Anybody visiting{" "}
                  <span className="fig font-mono text-[15px]">
                    {props.href}
                  </span>{" "}
                  sees it straight away.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={busy}
                    className={PRIMARY}
                    onClick={async () => {
                      const result = await run("publish");
                      if (!result.error) setConfirming(null);
                    }}
                  >
                    {busy ? "Publishing…" : "Yes, publish it"}
                  </button>
                  <button
                    type="button"
                    className={GHOST}
                    onClick={() => setConfirming(null)}
                  >
                    Not yet
                  </button>
                </div>
              </div>
            ) : confirming === "discard" ? (
              <div className="mt-5">
                <p className="text-[16px] leading-relaxed text-ink">
                  Throw away everything you have changed since you last
                  published, and go back to what is on the site now? It cannot
                  be undone.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={busy}
                    className={OUTLINE}
                    onClick={async () => {
                      const result = await run("discard");
                      if (!result.error) setConfirming(null);
                    }}
                  >
                    {busy ? "Putting it back…" : "Throw it away"}
                  </button>
                  <button
                    type="button"
                    className={GHOST}
                    onClick={() => setConfirming(null)}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className={PRIMARY}
                  disabled={props.pending.length === 0}
                  onClick={() => setConfirming("publish")}
                >
                  Publish
                </button>
                {props.pending.length > 0 && (
                  <button
                    type="button"
                    className={GHOST}
                    onClick={() => setConfirming("discard")}
                  >
                    Start again from what is live
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Portalled out of everything by GalleryPicker itself, so it is never
          inside a form and never inside the scrolling panel. */}
      <GalleryPicker
        kind="picture"
        assets={props.library.map((basename) => ({
          kind: "picture" as const,
          ref: basename,
          title: null,
          contentType: null,
          bytes: null,
        }))}
        open={browsingFor !== null}
        onClose={() => setBrowsingFor(null)}
        onPick={(refs) => {
          const chosen = refs[0];
          const asking = browsingFor;
          setBrowsingFor(null);
          if (!chosen || !asking) return;
          void run(asking.intent, {
            ...asking.extra,
            ref: chosen,
            alt: asking.alt,
          });
        }}
      />
    </div>
  );
}

// ── what the panel shows ─────────────────────────────────────────────────────

type ToolboxProps = Props & {
  selection: Selection;
  slotByKey: Map<string, TextSlot>;
  pictureByKey: Map<string, PictureSlot>;
  busy: boolean;
  run: (
    intent: string,
    extra?: Record<string, string>,
  ) => Promise<PageActionState>;
  onBrowse: (
    asking: {
      intent: string;
      extra: Record<string, string>;
      alt: string;
    } | null,
  ) => void;
  confirming: null | "publish" | "discard" | "delete";
  setConfirming: (value: null | "publish" | "discard" | "delete") => void;
};

function Toolbox(props: ToolboxProps) {
  const { selection } = props;

  if (selection.kind === "slot") {
    const picture = props.pictureByKey.get(selection.slot);
    if (picture) return <PictureSlotPanel {...props} slot={picture} />;
    const slot = props.slotByKey.get(selection.slot);
    if (slot) return <TextSlotPanel {...props} slot={slot} />;
    return (
      <Nothing
        title="Nothing to change here"
        body="This part of the page is drawn from what you have in Offerings — change a date or a price there and it appears here."
      />
    );
  }

  if (selection.kind === "section") {
    const section = props.sections.find((row) => row.id === selection.section);
    if (section) return <SectionPanel {...props} section={section} />;
  }

  if (selection.kind === "block") {
    const block = props.blocks[selection.block];
    if (block) return <BlockPanel {...props} block={block} />;
  }

  if (selection.kind === "item") {
    const item = props.items[selection.item];
    if (item) return <ItemPanel {...props} item={item} />;
  }

  return (
    <Nothing
      title="Click anything on the page"
      body="A sentence, a photograph, or the edge of a section. What you can do to it appears here."
    />
  );
}

function Nothing({ title, body }: { title: string; body: string }) {
  return (
    <>
      <p className={EYEBROW}>The toolbox</p>
      <h2 className="mt-2 font-display text-[23px] leading-tight text-ink">
        {title}
      </h2>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{body}</p>
    </>
  );
}

function Head({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <>
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className="mt-2 font-display text-[23px] leading-tight text-ink">
        {title}
      </h2>
      {note && (
        <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{note}</p>
      )}
    </>
  );
}

// ── one of the seven beats' words ────────────────────────────────────────────

function TextSlotPanel(props: ToolboxProps & { slot: TextSlot }) {
  const { slot } = props;
  const current = props.text[slot.key] ?? "";
  const isLink = slot.shape === "link";
  const [label, setLabel] = useState(
    isLink ? (current.split("\n")[0] ?? "") : current,
  );
  const [href, setHref] = useState(
    isLink ? (current.split("\n")[1] ?? "") : "",
  );

  // The panel is one component that changes what it is showing, so it has to be
  // told when the thing it is showing changed underneath it.
  useEffect(() => {
    if (isLink) {
      setLabel(current.split("\n")[0] ?? "");
      setHref(current.split("\n")[1] ?? "");
    } else {
      setLabel(current);
    }
  }, [current, isLink]);

  const multiline =
    slot.shape === "prose" || slot.shape === "lines" || slot.shape === "parts";

  /** What Save would send — so leaving the field sends exactly the same thing. */
  const saveWords = isLink ? `${label}\n${href}` : label;

  return (
    <>
      <Head eyebrow="These words" title={slot.label} note={slot.hint} />

      <div className="mt-5">
        <span className={LABEL}>{isLink ? "What it says" : "The words"}</span>
        {multiline ? (
          <textarea
            value={label}
            rows={slot.shape === "prose" ? 7 : 4}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={keepOnBlur(saveWords !== current, () =>
              props.run("set-text", { key: slot.key, value: saveWords }),
            )}
            className={`${FIELD} leading-relaxed`}
          />
        ) : (
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={keepOnBlur(saveWords !== current, () =>
              props.run("set-text", { key: slot.key, value: saveWords }),
            )}
            className={FIELD}
          />
        )}
      </div>

      {isLink && (
        <TargetField
          href={href}
          setHref={setHref}
          destinations={props.destinations}
          documents={props.documents}
        />
      )}

      <SizeRow
        step={props.sizes[slot.key] ?? 0}
        busy={props.busy}
        onStep={(next) =>
          void props.run("size-text", { key: slot.key, step: String(next) })
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={props.busy}
          className={PRIMARY}
          onClick={() =>
            void props.run("set-text", {
              key: slot.key,
              value: isLink ? `${label}\n${href}` : label,
            })
          }
        >
          {props.busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className={GHOST}
          onClick={() => void props.run("reset-text", { key: slot.key })}
        >
          Put it back to how it was
        </button>
      </div>
    </>
  );
}

// ── one of the seven beats' photographs ──────────────────────────────────────

function PictureSlotPanel(props: ToolboxProps & { slot: PictureSlot }) {
  const { slot } = props;
  const current = props.pictures[slot.key] ?? { ref: "", alt: "" };
  const [alt, setAlt] = useState(current.alt);

  useEffect(() => setAlt(current.alt), [current.alt]);

  return (
    <>
      <Head eyebrow="This photograph" title={slot.label} note={slot.hint} />

      <p className="mt-4 fig font-mono text-[15px] text-ink-soft">
        {current.ref || "None"}
      </p>

      {/* ASKED FOR, NOT DEMANDED. Choosing a picture used to be refused until a
          description existed, which meant every picture chosen for a section
          that had none was refused at the moment of choosing — she picked, and
          nothing appeared. She picks by eye and describes afterwards; this says
          so until she has. */}
      {!current.alt.trim() && (
        <p className="mt-4 text-[16px] leading-relaxed text-pool-error">
          This picture has no description yet. Please write one before you
          publish &mdash; it is read aloud to anybody who cannot see it.
        </p>
      )}

      <div className="mt-4">
        <span className={LABEL}>What is in it</span>
        <span className={HINT}>
          Read aloud to somebody who cannot see it, and shown if the picture
          ever fails to load.
        </span>
        <textarea
          value={alt}
          rows={3}
          onChange={(event) => setAlt(event.target.value)}
          onBlur={keepOnBlur(alt !== current.alt, () =>
            props.run("set-picture", {
              key: slot.key,
              ref: current.ref,
              alt,
            }),
          )}
          className={`${FIELD} leading-relaxed`}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className={OUTLINE}
          onClick={() =>
            props.onBrowse({
              intent: "set-picture",
              extra: { key: slot.key },
              alt,
            })
          }
        >
          Choose a different picture
        </button>
        <button
          type="button"
          disabled={props.busy}
          className={PRIMARY}
          onClick={() =>
            void props.run("set-picture", {
              key: slot.key,
              ref: current.ref,
              alt,
            })
          }
        >
          {props.busy ? "Saving…" : "Save the words"}
        </button>
      </div>
      <button
        type="button"
        className={`${GHOST} mt-3`}
        onClick={() => void props.run("reset-picture", { key: slot.key })}
      >
        Put the original photograph back
      </button>
    </>
  );
}

// ── a band ───────────────────────────────────────────────────────────────────

function SectionPanel(props: ToolboxProps & { section: EditorSection }) {
  const { section } = props;
  const free = section.kind === "free";
  const [alt, setAlt] = useState(section.pictureAlt ?? "");
  useEffect(() => setAlt(section.pictureAlt ?? ""), [section.pictureAlt]);

  return (
    <>
      <Head eyebrow="This section" title={section.label} note={section.note} />

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={CHIP}
          onClick={() =>
            void props.run("move-section", {
              section: String(section.id),
              direction: "up",
            })
          }
        >
          Move up
        </button>
        <button
          type="button"
          className={CHIP}
          onClick={() =>
            void props.run("move-section", {
              section: String(section.id),
              direction: "down",
            })
          }
        >
          Move down
        </button>
        <button
          type="button"
          className={CHIP}
          onClick={() =>
            void props.run(section.hidden ? "show" : "hide", {
              section: String(section.id),
            })
          }
        >
          {section.hidden ? "Put it back on the site" : "Take it off the site"}
        </button>
      </div>

      <div className="mt-6">
        <span className={LABEL}>Add a section</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={CHIP}
            onClick={() =>
              void props.run("add-section", {
                section: String(section.id),
                where: "above",
              })
            }
          >
            Above this one
          </button>
          <button
            type="button"
            className={CHIP}
            onClick={() =>
              void props.run("add-section", {
                section: String(section.id),
                where: "below",
              })
            }
          >
            Below this one
          </button>
        </div>
      </div>

      {free && (
        <>
          {/* ── its photograph ─────────────────────────────────────────── */}
          <div className="mt-7 border-t border-pool-rule pt-5">
            <span className={LABEL}>The photograph behind it</span>
            <span className={HINT}>
              {section.hasPicture
                ? section.pictureRef
                : "None — the band is plum, like the page behind every other photograph."}
            </span>
            {section.hasPicture && !alt.trim() && (
              <p className="mt-2 text-[16px] leading-relaxed text-pool-error">
                No description yet. Please write one before you publish.
              </p>
            )}
            {section.hasPicture && (
              <textarea
                value={alt}
                rows={2}
                onChange={(event) => setAlt(event.target.value)}
                onBlur={keepOnBlur(alt !== (section.pictureAlt ?? ""), () =>
                  props.run("set-section-picture", {
                    section: String(section.id),
                    ref: section.pictureRef ?? "",
                    alt,
                  }),
                )}
                className={`${FIELD} leading-relaxed`}
                aria-label="What is in the photograph"
              />
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={OUTLINE}
                onClick={() =>
                  props.onBrowse({
                    intent: "set-section-picture",
                    extra: { section: String(section.id) },
                    alt: alt || "",
                  })
                }
              >
                {section.hasPicture ? "Choose another" : "Choose a photograph"}
              </button>
              {section.hasPicture && (
                <button
                  type="button"
                  disabled={props.busy}
                  className={PRIMARY}
                  onClick={() =>
                    void props.run("set-section-picture", {
                      section: String(section.id),
                      ref: section.pictureRef ?? "",
                      alt,
                    })
                  }
                >
                  Save the description
                </button>
              )}
              {section.hasPicture && (
                <button
                  type="button"
                  className={GHOST}
                  onClick={() =>
                    void props.run("clear-section-picture", {
                      section: String(section.id),
                    })
                  }
                >
                  Take it away
                </button>
              )}
            </div>
          </div>

          {/* HOW MUCH ROOM THE BAND HAS, and where in the photograph it is
              looking. Both are on the section rather than on what is in it,
              because both are properties of the band: a picture placed in a
              band that is too shallow has nowhere to be, and a letterbox cut
              out of a tall photograph very often misses the thing worth seeing
              (operator, 2026-08-20). */}
          {section.kind === "free" && (
            <div className="mt-7 border-t border-pool-rule pt-5">
              <span className={LABEL}>How tall it is</span>
              <span className={HINT}>
                {section.tall === 0
                  ? "As deep as the page makes a band."
                  : TALL_CHOICES[section.tall].note}
              </span>
              {/* FOUR ANSWERS, NOT A PAIR OF STEPS (operator, 2026-08-20 —
                  "I clicked taller a few times and it stops getting taller and
                  nothing happens when i click").

                  It was + Taller / − Shorter over seven steps of a padding
                  multiplier: 405px to 648px on a 900px screen, and then the
                  button greyed out with nothing saying why. Every press did
                  something and none of it was what she wanted, which is the
                  worst shape a control can have — it looks like it is working
                  right up until it stops.

                  A height is the decision she is making, and there are four
                  answers to it. Each is one press, each is visibly different
                  from its neighbour, and the one she is on is marked — so
                  there is never a press that does nothing without saying so. */}
              <div className="mt-2 flex flex-wrap gap-2">
                {TALL_CHOICES.map((choice, step) => (
                  <button
                    key={choice.label}
                    type="button"
                    disabled={props.busy}
                    aria-pressed={section.tall === step}
                    className={section.tall === step ? CHIP_ON : CHIP}
                    onClick={() =>
                      void props.run("tall-section", {
                        section: String(section.id),
                        step: String(step),
                      })
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>

              {section.hasPicture && (
                <FocusRow
                  label="Where the photograph sits"
                  hint="The middle of it, which is where a band looks by default."
                  value={section.focusY}
                  busy={props.busy}
                  lower="Up"
                  higher="Down"
                  onSet={(next) =>
                    void props.run("focus-section", {
                      section: String(section.id),
                      percent: String(next),
                    })
                  }
                />
              )}
            </div>
          )}

          {/* ── what goes in it ────────────────────────────────────────── */}
          <div className="mt-7 border-t border-pool-rule pt-5">
            <span className={LABEL}>Put something in it</span>
            <span className={HINT}>
              Choose what it is, then where it sits across the band.
            </span>
            {BLOCK_KINDS.map((kind) => (
              <div key={kind.value} data-add-kind={kind.value} className="mt-4">
                <p className="text-[16px] text-ink">{kind.label}</p>
                <p className="text-[15px] leading-snug text-ink-soft">
                  {kind.note}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLACEMENTS.map((placement) => (
                    <button
                      key={placement.value}
                      type="button"
                      className={CHIP}
                      onClick={() =>
                        void props.run("add-block", {
                          section: String(section.id),
                          kind: kind.value,
                          placement: placement.value,
                        })
                      }
                    >
                      {placement.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── and away ───────────────────────────────────────────────── */}
          <div className="mt-7 border-t border-pool-rule pt-5">
            {props.confirming === "delete" ? (
              <>
                <p className="text-[16px] leading-relaxed text-ink">
                  Delete this section and everything in it? It cannot be undone.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    className={OUTLINE}
                    onClick={async () => {
                      await props.run("delete-section", {
                        section: String(section.id),
                      });
                      props.setConfirming(null);
                    }}
                  >
                    Delete it
                  </button>
                  <button
                    type="button"
                    className={GHOST}
                    onClick={() => props.setConfirming(null)}
                  >
                    Keep it
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className={GHOST}
                onClick={() => props.setConfirming("delete")}
              >
                Delete this section
              </button>
            )}
          </div>
        </>
      )}

      {!free && (
        <p className="mt-7 border-t border-pool-rule pt-5 text-[16px] leading-relaxed text-ink-soft">
          This is one of the page&rsquo;s original sections, composed as it is.
          Its words and photographs are changed by clicking them; what it is
          made of is not. To put something else here, add a section above or
          below it.
        </p>
      )}
    </>
  );
}

// ── a box, some words on the picture, or a picture ───────────────────────────

function BlockPanel(props: ToolboxProps & { block: EditorBlock }) {
  const { block } = props;
  const kind = BLOCK_KINDS.find((one) => one.value === block.kind);
  const [alt, setAlt] = useState(block.pictureAlt ?? "");
  useEffect(() => setAlt(block.pictureAlt ?? ""), [block.pictureAlt]);

  return (
    <>
      <Head
        eyebrow="This is"
        title={kind?.label ?? "Something in a section"}
        note={kind?.note}
      />

      <div className="mt-5">
        <span className={LABEL}>Where it sits</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLACEMENTS.map((placement) => (
            <button
              key={placement.value}
              type="button"
              className={block.placement === placement.value ? CHIP_ON : CHIP}
              onClick={() =>
                void props.run("place-block", {
                  block: String(block.id),
                  placement: placement.value,
                })
              }
            >
              {placement.label}
            </button>
          ))}
        </div>
      </div>

      {block.kind === "picture" ? (
        <div className="mt-6">
          <span className={LABEL}>The picture</span>
          <span className={HINT}>{block.pictureRef ?? "None chosen yet."}</span>
          {block.pictureRef && !alt.trim() && (
            <p className="mt-2 text-[16px] leading-relaxed text-pool-error">
              No description yet. Please write one before you publish.
            </p>
          )}
          <textarea
            value={alt}
            rows={2}
            onChange={(event) => setAlt(event.target.value)}
            onBlur={keepOnBlur(
              Boolean(block.pictureRef) && alt !== (block.pictureAlt ?? ""),
              () =>
                props.run("set-block-picture", {
                  block: String(block.id),
                  ref: block.pictureRef ?? "",
                  alt,
                }),
            )}
            className={`${FIELD} leading-relaxed`}
            aria-label="What is in the picture"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className={OUTLINE}
              onClick={() =>
                props.onBrowse({
                  intent: "set-block-picture",
                  extra: { block: String(block.id) },
                  alt,
                })
              }
            >
              {block.pictureRef ? "Choose another" : "Choose a picture"}
            </button>
            {block.pictureRef && (
              <button
                type="button"
                disabled={props.busy}
                className={PRIMARY}
                onClick={() =>
                  void props.run("set-block-picture", {
                    block: String(block.id),
                    ref: block.pictureRef ?? "",
                    alt,
                  })
                }
              >
                Save the words
              </button>
            )}
          </div>

          {/* THE SHAPE SHE CUTS IT TO, and what stays in frame once it does
              (operator, 2026-08-20). Only shown once there IS a picture: three
              shapes offered for nothing is a decision about an empty box.

              "As it is" first, because it is the default and every picture
              already placed is one — and because it is how she undoes the
              other three rather than a state she has to be talked out of. */}
          {block.pictureRef && (
            <>
              <div className="mt-6">
                <span className={LABEL}>Its shape</span>
                <span className={HINT}>
                  {block.shape === "natural"
                    ? "However tall the photograph is. Nothing is cut off."
                    : "The photograph is cut to fit — choose what stays in frame below."}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PICTURE_SHAPES.map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      disabled={props.busy}
                      aria-pressed={block.shape === shape.value}
                      className={block.shape === shape.value ? CHIP_ON : CHIP}
                      onClick={() =>
                        void props.run("shape-block", {
                          block: String(block.id),
                          shape: shape.value,
                        })
                      }
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {block.shape !== "natural" && (
                <>
                  <FocusRow
                    label="What stays in frame, up and down"
                    hint="The middle of it."
                    value={block.focusY}
                    busy={props.busy}
                    lower="Up"
                    higher="Down"
                    onSet={(next) =>
                      void props.run("focus-block", {
                        block: String(block.id),
                        axis: "y",
                        percent: String(next),
                      })
                    }
                  />
                  <FocusRow
                    label="And across"
                    hint="The middle of it."
                    value={block.focusX}
                    busy={props.busy}
                    lower="Left"
                    higher="Right"
                    onSet={(next) =>
                      void props.run("focus-block", {
                        block: String(block.id),
                        axis: "x",
                        percent: String(next),
                      })
                    }
                  />
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <span className={LABEL}>Add a line</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ITEM_KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={CHIP}
                onClick={() =>
                  void props.run("add-item", {
                    block: String(block.id),
                    kind: item.value,
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 border-t border-pool-rule pt-5">
        <button
          type="button"
          className={GHOST}
          onClick={() =>
            void props.run("delete-block", { block: String(block.id) })
          }
        >
          Remove this from the section
        </button>
      </div>
    </>
  );
}

// ── one line ─────────────────────────────────────────────────────────────────

function ItemPanel(props: ToolboxProps & { item: EditorItem }) {
  const { item } = props;
  const kind = ITEM_KINDS.find((one) => one.value === item.kind);
  const wantsHref = item.kind === "link" || item.kind === "button";

  const [text, setText] = useState(item.text);
  const [href, setHref] = useState(item.href ?? "");
  useEffect(() => {
    setText(item.text);
    setHref(item.href ?? "");
  }, [item.text, item.href]);

  const keepItem = keepOnBlur(
    text !== item.text || href !== (item.href ?? ""),
    () =>
      void props.run("set-item", {
        item: String(item.id),
        value: text,
        ...(wantsHref ? { href } : {}),
      }),
  );

  return (
    <>
      <Head
        eyebrow="This line"
        title={kind?.label ?? "A line"}
        note={
          item.kind === "bullets"
            ? "One per line. Each gets its own line on the page."
            : item.kind === "eyebrow"
              ? "The small gold line the page uses above a section."
              : undefined
        }
      />

      <div className="mt-5">
        <span className={LABEL}>
          {wantsHref ? "What it says" : "The words"}
        </span>
        {item.kind === "paragraph" || item.kind === "bullets" ? (
          <textarea
            value={text}
            rows={item.kind === "paragraph" ? 6 : 4}
            onChange={(event) => setText(event.target.value)}
            onBlur={keepItem}
            className={`${FIELD} leading-relaxed`}
          />
        ) : (
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={keepItem}
            className={FIELD}
          />
        )}
      </div>

      {wantsHref && (
        <TargetField
          href={href}
          setHref={setHref}
          destinations={props.destinations}
          documents={props.documents}
        />
      )}

      <SizeRow
        step={item.size}
        busy={props.busy}
        onStep={(next) =>
          void props.run("size-item", {
            item: String(item.id),
            step: String(next),
          })
        }
      />

      <EdgeRow
        align={item.align}
        busy={props.busy}
        onSet={(next) =>
          void props.run("align-item", {
            item: String(item.id),
            align: next,
          })
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={props.busy}
          className={PRIMARY}
          onClick={() =>
            void props.run("set-item", {
              item: String(item.id),
              value: text,
              ...(wantsHref ? { href } : {}),
            })
          }
        >
          {props.busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className={GHOST}
          onClick={() =>
            void props.run("delete-item", { item: String(item.id) })
          }
        >
          Remove this line
        </button>
      </div>
    </>
  );
}
