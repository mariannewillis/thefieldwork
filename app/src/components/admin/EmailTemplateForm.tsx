"use client";

import { useActionState, useEffect, useState } from "react";
import {
  resetTemplate,
  saveTemplate,
  type TemplateState,
} from "@/app/(admin)/admin/email-templates/actions";

/**
 * The three fields of one message, and the letter beside them.
 *
 * A CLIENT COMPONENT for two reasons and no others: it has to say whether the
 * last save worked, and it has to reload the preview frame afterwards so what
 * she is looking at is what she has just saved. Every field is in the delivered
 * HTML and the form posts and works without script.
 *
 * WHAT IS AND IS NOT HERS is drawn, not just written. The three fields are on
 * the blush working panel; the list of what the app owns sits under them in the
 * plum, with a line saying nothing typed above can move any of it. That is the
 * one thing this screen has to make obvious at a glance — she is being given a
 * pen, not a pair of scissors.
 */

const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const FIELD =
  "mt-2 w-full border border-pool-rule bg-transparent px-4 py-3 text-[19px] leading-relaxed text-ink focus:border-action focus:outline-none";
const HELP = "mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft";

const NOTHING: TemplateState = { error: null, saved: 0 };

export type Placeholder = { token: string; what: string; sample: string };

export function EmailTemplateForm({
  templateKey,
  label,
  seed,
  saved,
  placeholders,
  locked,
  previewUrl,
}: {
  templateKey: string;
  label: string;
  /** What the app writes when a field is left empty. */
  seed: { subject: string; opening: string; signOff: string };
  /** What she has written, if anything. */
  saved: {
    subject: string | null;
    opening: string | null;
    signOff: string | null;
  };
  placeholders: Placeholder[];
  locked: string[];
  previewUrl: string;
}) {
  const [state, action, pending] = useActionState(saveTemplate, NOTHING);
  const [resetState, resetAction, resetting] = useActionState(
    resetTemplate,
    NOTHING,
  );

  // The frame is reloaded by changing its address, which is the one thing a
  // parent document may do to a same-origin iframe without reaching inside it.
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    if (state.saved || resetState.saved) setStamp(Date.now());
  }, [state.saved, resetState.saved]);

  const done = Math.max(state.saved, resetState.saved);

  // Side by side only once the working pane is genuinely wide. The rail takes
  // 256px and the gutters 88 more, so at anything under about 1536 the form and
  // a 600px letter each get too little; below that the letter falls under the
  // form, which is the same reading in a different order.
  return (
    <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_620px]">
      <div>
        <form action={action} className="pool on-pool px-6 py-7 sm:px-8">
          <input type="hidden" name="key" value={templateKey} />

          <h2 className="font-display text-[26px] leading-tight text-ink">
            The three parts that are yours
          </h2>
          <p className="mt-2 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            Leave any of them empty and that part goes out in the app&rsquo;s
            own words, shown in grey underneath.
          </p>

          <label className="mt-7 block">
            <span className={LABEL}>Subject line</span>
            <input
              key={`subject-${done}`}
              name="subject"
              type="text"
              maxLength={200}
              defaultValue={saved.subject ?? ""}
              placeholder={seed.subject}
              className={FIELD}
            />
            <span className={HELP}>
              The app writes: <span className="text-ink">{seed.subject}</span>
            </span>
          </label>

          <label className="mt-7 block">
            <span className={LABEL}>The opening</span>
            <textarea
              key={`opening-${done}`}
              name="opening"
              rows={4}
              maxLength={2000}
              defaultValue={saved.opening ?? ""}
              placeholder={seed.opening}
              className={FIELD}
            />
            <span className={HELP}>
              The first thing the letter says, above every fact. The app writes:{" "}
              <span className="text-ink">{seed.opening}</span>
            </span>
          </label>

          <label className="mt-7 block">
            <span className={LABEL}>The sign-off</span>
            <textarea
              key={`signoff-${done}`}
              name="signOff"
              rows={4}
              maxLength={2000}
              defaultValue={saved.signOff ?? ""}
              placeholder={
                seed.signOff || "Nothing — this message has no closing line."
              }
              className={FIELD}
            />
            <span className={HELP}>
              {seed.signOff ? (
                <>
                  The last thing it says, under them. The app writes:{" "}
                  <span className="text-ink">{seed.signOff}</span>
                </>
              ) : (
                <>
                  This message has no closing line today. Anything you write
                  here becomes the last line before the footer.
                </>
              )}
            </span>
          </label>

          {placeholders.length > 0 && (
            <div className="mt-8 border-t border-pool-rule/40 pt-6">
              <p className={LABEL}>Facts you can drop into a sentence</p>
              <p className={HELP}>
                Type the name in double braces and the real one is put in when
                the message is sent. Every one of these is also printed
                somewhere the app owns, so leaving one out loses a nicety and
                never a fact.
              </p>
              <ul className="mt-4 grid list-none gap-x-8 gap-y-3 p-0 sm:grid-cols-2">
                {placeholders.map((placeholder) => (
                  <li key={placeholder.token}>
                    <code className="fig font-mono text-[15px] text-action">
                      {`{{${placeholder.token}}}`}
                    </code>
                    <span className="ml-3 text-[15px] text-ink-soft">
                      {placeholder.what} &mdash; &ldquo;{placeholder.sample}
                      &rdquo;
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={pending}
              className="t min-h-[52px] bg-action px-8 py-3 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save this wording"}
            </button>
            {done > 0 && !pending && !resetting && (
              <p role="status" className="text-[17px] text-pool-success">
                Saved. The preview beside it is what people will get.
              </p>
            )}
          </div>

          {(state.error ?? resetState.error) && (
            <p
              role="alert"
              className="mt-4 max-w-[54ch] text-[17px] leading-relaxed text-pool-error"
            >
              {state.error ?? resetState.error}
            </p>
          )}
        </form>

        {/* ── what the app owns ──────────────────────────────────────────── */}
        <div className="mt-8 border border-plate-rule/40 px-6 py-7 sm:px-8">
          <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
            Locked &mdash; written by the app
          </p>
          <h2 className="mt-3 max-w-[26ch] font-display text-[26px] leading-tight text-plate-text">
            Nothing you type can move, break or delete any of this.
          </h2>
          <ul className="mt-5 list-none space-y-3 p-0">
            {locked.map((item) => (
              <li
                key={item}
                className="border-l-4 border-l-gold pl-4 text-[17px] leading-relaxed text-plate-soft"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-[62ch] text-[15px] leading-relaxed text-plate-soft">
            Your words go into the letter as words. If you paste in something
            that looks like code, it arrives as the characters you typed &mdash;
            it cannot become part of the page, and it cannot reach a link or an
            amount.
          </p>

          <form action={resetAction} className="mt-7">
            <input type="hidden" name="key" value={templateKey} />
            <button
              type="submit"
              disabled={resetting}
              className="t min-h-[48px] border border-plate-soft px-6 text-[17px] font-medium text-plate-text hover:bg-plate-soft hover:text-ink disabled:opacity-60"
            >
              {resetting
                ? "Putting it back…"
                : `Reset ${label} to the original wording`}
            </button>
            <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-plate-soft">
              Clears all three fields. Nothing anybody has already received
              changes.
            </p>
          </form>
        </div>
      </div>

      {/* ── the letter itself ─────────────────────────────────────────────── */}
      <div>
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          What a person receives
        </p>
        <p className="mt-3 max-w-[54ch] text-[17px] leading-relaxed text-plate-soft">
          A real one, with made-up facts &mdash; the same message the app sends,
          rendered by the same code.
        </p>
        <div className="mt-5 border border-plate-rule/40 bg-ground">
          <iframe
            key={stamp}
            src={stamp ? `${previewUrl}?v=${stamp}` : previewUrl}
            title={`Preview of the ${label} email`}
            loading="lazy"
            className="block h-[900px] w-full"
          />
        </div>
      </div>
    </div>
  );
}
