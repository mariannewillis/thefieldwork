"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  resetFlyer,
  saveFlyer,
  type FlyerState,
} from "@/app/(admin)/admin/offerings/flyer-actions";
import GalleryPicker from "@/components/admin/GalleryPicker";
import { mediaSrc } from "@/components/admin/OfferingFormParts";
import type { ResolvedFlyer } from "@/lib/flyers";
// From the SHAPE module, never from `lib/qr.ts`: that one is `server-only`
// and one value import of it takes the whole route down.
import { QR_MIN_MODULE_MM } from "@/lib/qr-shape";

/**
 * THE PANEL BESIDE THE SHEET.
 *
 * A flyer is a piece of paper, so there is nothing on it to click and nothing
 * on it is editable in place — the opposite decision from the pages panel,
 * where the page IS the thing she is changing and typing on it is the whole
 * point. Here the sheet is the RESULT, and the controls sit next to it.
 *
 * EVERY FIELD SAYS WHAT IT WILL DO IF LEFT EMPTY, because "empty" is ambiguous
 * on this screen in a way it is not elsewhere: it means "use what the workshop
 * says", not "print nothing". A person who guessed wrong would either get the
 * workshop's name on a flyer she meant to leave blank, or spend an afternoon
 * wondering why her deletion keeps coming back.
 *
 * IT SAVES ON BLUR, like the pages panel, and for the reason the operator gave
 * on 2026-08-20: a screen where the preview beside the field goes on showing
 * the old words until a button is pressed is a screen that loses work.
 */

const NOTHING: FlyerState = { error: null, done: 0 };

const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const HINT = "mt-1 block text-[15px] leading-snug text-ink-soft";
const FIELD =
  "mt-2 w-full border border-pool-rule bg-transparent px-3 py-2.5 text-[17px] text-ink focus:border-ink focus:outline-none";
const CHIP =
  "t min-h-[38px] border border-pool-rule px-3 py-1.5 text-[15px] text-ink hover:border-ink";
const CHIP_ON =
  "t min-h-[38px] border-2 border-action px-3 py-1.5 text-[15px] font-semibold text-ink";
const GHOST =
  "t min-h-[38px] py-1.5 text-[16px] text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";

/** What each of the three photographs is FOR, said where she chooses it. */
const PICTURES = [
  {
    name: "groundRef",
    label: "Behind everything",
    hint: "The whole sheet, under the plum. It is atmosphere rather than a picture — nothing on it needs to be legible.",
  },
  {
    name: "detailRef",
    label: "The large one",
    hint: "The one worth looking at. It is the biggest thing on the sheet anybody actually looks AT.",
  },
  {
    name: "placeRef",
    label: "The small one",
    hint: "The room. It answers “what am I walking into”, which is the question that stops people coming.",
  },
] as const;

export default function FlyerEditor({
  flyer,
  own,
  library,
  printHref,
  qrModuleMm,
}: {
  flyer: ResolvedFlyer;
  /** What the OFFERING says, so the panel can tell an override from a match. */
  own: {
    eyebrow: string;
    headline: string;
    blurb: string;
    footnote: string;
    groundRef: string;
    detailRef: string;
    placeRef: string;
  };
  library: string[];
  printHref: string;
  /** Millimetres per module on the printed code. Null when there is no code. */
  qrModuleMm: number | null;
}) {
  const [state, save, saving] = useActionState(saveFlyer, NOTHING);
  const [resetState, reset] = useActionState(resetFlyer, NOTHING);

  const [layout, setLayout] = useState(flyer.layout);
  const [text, setText] = useState({
    eyebrow: flyer.eyebrow,
    headline: flyer.headline,
    blurb: flyer.blurb,
    footnote: flyer.footnote,
  });
  const [pictures, setPictures] = useState({
    groundRef: flyer.ground ?? "",
    detailRef: flyer.detail ?? "",
    placeRef: flyer.place ?? "",
  });
  const [focus, setFocus] = useState(flyer.groundFocus);
  const [picking, setPicking] = useState<string | null>(null);
  // A ref rather than a document query: the picker is portalled into
  // `document.body`, so its handlers have no form above them to reach through
  // `event.currentTarget.form`, and looking one up by selector would find
  // whichever form the portal happened to land beside.
  const form = useRef<HTMLFormElement>(null);

  // The panel is redrawn from the server after every save, so it has to be told
  // when the thing it is showing changed underneath it.
  useEffect(() => {
    setLayout(flyer.layout);
    setText({
      eyebrow: flyer.eyebrow,
      headline: flyer.headline,
      blurb: flyer.blurb,
      footnote: flyer.footnote,
    });
    setPictures({
      groundRef: flyer.ground ?? "",
      detailRef: flyer.detail ?? "",
      placeRef: flyer.place ?? "",
    });
    setFocus(flyer.groundFocus);
  }, [
    flyer.layout,
    flyer.eyebrow,
    flyer.headline,
    flyer.blurb,
    flyer.footnote,
    flyer.ground,
    flyer.detail,
    flyer.place,
    flyer.groundFocus,
  ]);

  /**
   * ONE FORM, SUBMITTED WHOLE, whichever control fired it.
   *
   * The alternative is nine actions taking one field each, and the reason not
   * to is that a flyer is one object: a layout change that did not carry the
   * unsaved sentence beside it would silently throw the sentence away, which is
   * the exact complaint the pages panel had.
   */
  /**
   * ALWAYS THROUGH THE REF, never through the event.
   *
   * `event.currentTarget` is only valid WHILE the handler runs: React nulls it
   * on the way out, so reading `.form` off it inside a `requestAnimationFrame`
   * throws "Cannot read properties of null". It did — the browser console
   * caught it on the first drive of this screen, and the control it was on
   * simply stopped working while everything around it kept behaving.
   */
  const submit = () => {
    // Next frame, so a `setState` in the same handler has reached the hidden
    // input this form is about to read.
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  return (
    <form ref={form} action={save} className="pool on-pool px-7 py-7">
      <input type="hidden" name="kind" value={flyer.kind} />
      <input type="hidden" name="slug" value={flyer.slug} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
          {flyer.untouched ? "As the workshop is written" : "Your words"}
        </p>
        {saving && (
          <p className="fig font-mono text-[15px] text-ink-soft">Saving…</p>
        )}
      </div>

      <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">
        The flyer
      </h2>
      <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
        Everything here starts as whatever this one already says. Change a line
        and the flyer says that instead; empty a box and it goes back to the
        offering&rsquo;s own words.
      </p>

      {/* ── how many photographs ──────────────────────────────────────── */}
      <div className="mt-7 border-t border-pool-rule pt-5">
        <span className={LABEL}>How it is laid out</span>
        <span className={HINT}>
          Two shapes rather than a number, because three pictures at the same
          size is the one thing a flyer must not do.
        </span>
        <input type="hidden" name="layout" value={layout} />
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { value: "one", label: "One photograph" },
              { value: "three", label: "Three photographs" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              aria-pressed={layout === option.value}
              className={layout === option.value ? CHIP_ON : CHIP}
              onClick={() => {
                setLayout(option.value);
                submit();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── the words ─────────────────────────────────────────────────── */}
      <div className="mt-7 border-t border-pool-rule pt-5">
        <span className={LABEL}>What it says</span>

        {(
          [
            { name: "eyebrow", label: "The small line", rows: 0 },
            { name: "headline", label: "Its name", rows: 0 },
            { name: "blurb", label: "The sentence under it", rows: 3 },
            { name: "footnote", label: "The line at the foot", rows: 2 },
          ] as const
        ).map((one) => (
          <label key={one.name} className="mt-4 block">
            <span className="fig font-mono text-[15px] text-ink-soft">
              {one.label}
            </span>
            <input
              type="hidden"
              name={`${one.name}-own`}
              value={own[one.name]}
            />
            {one.rows > 0 ? (
              <textarea
                name={one.name}
                rows={one.rows}
                value={text[one.name]}
                onChange={(event) =>
                  setText((now) => ({ ...now, [one.name]: event.target.value }))
                }
                onBlur={() => {
                  if (text[one.name] !== flyer[one.name]) submit();
                }}
                className={`${FIELD} leading-relaxed`}
              />
            ) : (
              <input
                type="text"
                name={one.name}
                value={text[one.name]}
                onChange={(event) =>
                  setText((now) => ({ ...now, [one.name]: event.target.value }))
                }
                onBlur={() => {
                  if (text[one.name] !== flyer[one.name]) submit();
                }}
                className={FIELD}
              />
            )}
          </label>
        ))}

        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
          The date, the address, the price and the number of places are not here
          &mdash; they are read off the offering every time, so a flyer can
          never print a price you have since changed.
        </p>
      </div>

      {/* ── the photographs ───────────────────────────────────────────── */}
      <div className="mt-7 border-t border-pool-rule pt-5">
        <span className={LABEL}>The photographs</span>

        {PICTURES.filter(
          (one) => layout === "three" || one.name === "groundRef",
        ).map((one) => (
          <div key={one.name} className="mt-5">
            <p className="fig font-mono text-[15px] text-ink-soft">
              {one.label}
            </p>
            <p className="mt-1 max-w-[42ch] text-[15px] leading-snug text-ink-soft">
              {one.hint}
            </p>

            <input type="hidden" name={one.name} value={pictures[one.name]} />
            <input
              type="hidden"
              name={`${one.name}-own`}
              value={own[one.name]}
            />

            {pictures[one.name] ? (
              <figure className="m-0 mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaSrc(pictures[one.name])}
                  alt=""
                  className="block h-auto w-full max-w-[220px] border border-pool-rule"
                />
              </figure>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">None chosen yet.</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                className={CHIP}
                onClick={() => setPicking(one.name)}
              >
                {pictures[one.name] ? "Choose another" : "Choose a picture"}
              </button>
              {pictures[one.name] && (
                <button
                  type="button"
                  className={GHOST}
                  onClick={() => {
                    setPictures((now) => ({ ...now, [one.name]: "" }));
                    submit();
                  }}
                >
                  Take it away
                </button>
              )}
            </div>
          </div>
        ))}

        {/* WHERE THE GROUND IS LOOKING. A flyer is a tall crop of a landscape
            photograph, so what is worth seeing is very often not in the middle
            of it — the same control, and the same reasoning, as a band on the
            pages panel. */}
        <div className="mt-6">
          <span className={LABEL}>Where the photograph sits</span>
          <span className={HINT}>
            {focus === 50
              ? "The middle of it."
              : `${focus}% from the top of the photograph.`}
          </span>
          <input type="hidden" name="groundFocus" value={focus} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {([-10, 10] as const).map((step) => (
              <button
                key={step}
                type="button"
                disabled={saving || focus + step < 0 || focus + step > 100}
                className={CHIP}
                onClick={() => {
                  setFocus((now) => Math.max(0, Math.min(100, now + step)));
                  submit();
                }}
              >
                {step < 0 ? "↑ Up" : "↓ Down"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── printing it ───────────────────────────────────────────────── */}
      <div className="mt-7 border-t border-pool-rule pt-5">
        <span className={LABEL}>Getting it out</span>
        <span className={HINT}>
          Opens the sheet on its own at A5. Your browser&rsquo;s print box will
          save it as a PDF, or send it straight to a printer.
        </span>
        <Link
          href={printHref}
          target="_blank"
          className="t mt-3 inline-flex min-h-[52px] items-center bg-action px-7 py-3 text-[17px] font-semibold text-pool hover:bg-ink"
        >
          Print it, or save it as a PDF
        </Link>

        {/* SAID BEFORE A HUNDRED SHEETS COME OUT OF THE PRINTER, not after. A
            long web address makes a denser code, and below about half a
            millimetre a module a phone stops reading it reliably on paper. */}
        {qrModuleMm !== null && qrModuleMm < QR_MIN_MODULE_MM && (
          <p
            role="note"
            className="mt-4 max-w-[46ch] border-l-2 border-pool-error pl-4 text-[15px] leading-relaxed text-ink-soft"
          >
            <strong className="font-semibold text-ink">
              Check the code scans before you print a lot of these.
            </strong>{" "}
            This one&rsquo;s web address is long, which makes a denser square
            &mdash; try it with your own phone from arm&rsquo;s length first. A
            shorter web address for the offering would make a bolder code.
          </p>
        )}

        {qrModuleMm === null && (
          <p
            role="alert"
            className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-pool-error"
          >
            The square could not be made for this one&rsquo;s address, so the
            flyer carries the address in words only.
          </p>
        )}
      </div>

      {!flyer.untouched && (
        <div className="mt-7 border-t border-pool-rule pt-5">
          <button
            type="submit"
            formAction={reset}
            className={GHOST}
            onClick={(event) => {
              // Its own submission, so the fields above do not ride along and
              // immediately write back what this is removing.
              event.currentTarget.form?.setAttribute("novalidate", "true");
            }}
          >
            Put the whole sheet back to how this one is written
          </button>
          {resetState.error && (
            <p role="alert" className="mt-2 text-[15px] text-pool-error">
              {resetState.error}
            </p>
          )}
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-pool-error"
        >
          {state.error}
        </p>
      )}

      <GalleryPicker
        kind="picture"
        assets={library.map((ref) => ({
          kind: "picture" as const,
          ref,
          title: null,
          contentType: null,
          bytes: null,
        }))}
        open={picking !== null}
        chosen={picking ? [pictures[picking as keyof typeof pictures]] : []}
        onClose={() => setPicking(null)}
        onPick={(refs) => {
          if (!picking || !refs[0]) return;
          const name = picking;
          setPictures((now) => ({ ...now, [name]: refs[0] }));
          setPicking(null);
          submit();
        }}
        onAdded={() => undefined}
      />
    </form>
  );
}
