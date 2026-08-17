"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addAttachment,
  removeAttachment,
  saveNewsletter,
} from "@/app/(admin)/admin/newsletters/actions";
import { useDraftGuard } from "@/components/admin/DraftGuard";
import {
  FIELD,
  FIELD_BIG,
  FieldError,
  HELP,
  LABEL,
  Needed,
  PicturePicker,
  QUIET_BUTTON,
  Section,
} from "@/components/admin/OfferingFormParts";
import { NO_ATTEMPT_YET } from "@/lib/offering-rules";

/**
 * Writing a letter.
 *
 * THE SAME SHEET AN OFFERING IS WRITTEN ON, deliberately. It is built from
 * `OfferingFormParts` — the same regions, the same hairlines, the same
 * "Needed" word, the same picture picker, the same one-save-at-the-bottom — so
 * that somebody who has put a workshop up already knows how this works. The
 * alternative was a block editor with its own idiom, its own toolbar and its
 * own rules about when things save, which is a second thing to learn for no
 * gain: a letter is a page of fields, exactly as a workshop is.
 *
 * ONE SAVE, AND THE BLOCKS ARE THE FORM. Adding, removing and reordering a
 * block changes the DOM and nothing else — nothing is written until she
 * presses Save, and then the whole letter is written at once. That is the
 * workshop form's picture rail exactly (`WorkshopForm`, `collectImages`), and
 * it is what makes "move this up" free: order is the order the fields appear
 * in, which is the order `FormData` yields them in.
 *
 * THE FILES ARE THE EXCEPTION and go up the moment she chooses one, like a
 * photograph does — a save that bounced must not throw four megabytes away,
 * and how the file will TRAVEL has to be said the moment it arrives rather
 * than on the send modal, which would be too late to do anything about.
 *
 * AND BECAUSE OF ALL THAT, THIS SHEET SAYS WHETHER IT IS SAVED. "One save, and
 * the blocks are the form" is the right shape and it has one edge: between a
 * change and a save, the letter on the screen is not the letter that would be
 * sent, and on 2026-08-16 that gap put two empty letters in front of the list.
 * Every change marks the sheet unsaved through `DraftGuard`; the send, the test
 * and the preview all refuse while it is, and say why. See `DraftGuard`.
 */

/** The five kinds, and what each of them is called on the button that adds it. */
const KINDS = [
  { kind: "heading", label: "Heading" },
  { kind: "paragraph", label: "Paragraph" },
  { kind: "image", label: "Picture" },
  { kind: "offerings", label: "What's open" },
  { kind: "button", label: "Button" },
] as const;

type Kind = (typeof KINDS)[number]["kind"];

export type EditableBlock = {
  kind: Kind;
  text: string;
  imageBasename: string;
  caption: string;
  alt: string;
  href: string;
  count: string;
};

type Row = EditableBlock & { key: number };

const EMPTY: Omit<EditableBlock, "kind"> = {
  text: "",
  imageBasename: "",
  caption: "",
  alt: "",
  href: "",
  count: "",
};

export type EditableAttachment = {
  id: number;
  filename: string;
  size: string;
  delivery: "attached" | "linked";
  /** The line under its name in the letter. Hers, and optional. */
  note: string;
};

const KIND_WORDS: Record<Kind, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Picture",
  offerings: "What's open",
  button: "Button",
};

const MOVE =
  "t inline-flex h-10 w-10 items-center justify-center border border-pool-rule text-ink hover:bg-ink hover:text-pool disabled:border-dashed disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft";

export default function NewsletterEditor({
  newsletter,
  blocks,
  attachments,
  media,
}: {
  newsletter: {
    id: number;
    subject: string;
    preheader: string;
    mastheadLabel: string;
    backgroundBasename: string;
  };
  blocks: EditableBlock[];
  attachments: EditableAttachment[];
  /** Every picture on the site, growing as she adds to it. */
  media: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveNewsletter,
    NO_ATTEMPT_YET,
  );

  // Removing a document is owned HERE and not in the documents panel, because
  // the forms it drives have to be rendered outside the sheet — a form cannot
  // contain another one. The panel gets the error to print and nothing else.
  const [removeState, removeAction] = useActionState(removeAttachment, {
    error: null as string | null,
  });

  const { unsaved, setUnsaved } = useDraftGuard();

  /**
   * A save that landed clears the flag; one that bounced does not.
   *
   * `attempt` is bumped on every return, so it is the thing to watch. A bounce
   * always carries either a field error or the line at the top — a clean return
   * with neither is the only shape a successful save has, which is why this
   * reads both rather than trusting the counter alone.
   */
  useEffect(() => {
    if (state.attempt === 0) return;
    const bounced = Object.keys(state.errors).length > 0 || state.message;
    if (!bounced) setUnsaved(false);
  }, [state.attempt, state.errors, state.message, setUnsaved]);

  /** What a bounced save echoed back, so nothing typed is lost. */
  const kept = (name: string, stored: string) => state.values[name] ?? stored;

  const [library, setLibrary] = useState(media);
  const [rows, setRows] = useState<Row[]>(() =>
    blocks.map((block, index) => ({ ...block, key: index })),
  );
  const [nextKey, setNextKey] = useState(blocks.length);
  const [background, setBackground] = useState(newsletter.backgroundBasename);

  const add = (kind: Kind) => {
    setUnsaved(true);
    setRows((current) => [...current, { ...EMPTY, kind, key: nextKey }]);
    setNextKey((n) => n + 1);
  };

  const remove = (key: number) => {
    setUnsaved(true);
    setRows((current) => current.filter((row) => row.key !== key));
  };

  /**
   * Moving one. The key travels with the row, so React keeps the block's own
   * fields with it rather than redrawing the two swapped rows from their
   * neighbour's values — which is what happens when the index is the key.
   */
  const move = (key: number, by: -1 | 1) => {
    setUnsaved(true);
    setRows((current) => {
      const at = current.findIndex((row) => row.key === key);
      const to = at + by;
      if (at < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });
  };

  const set = (key: number, field: keyof EditableBlock, value: string) => {
    setUnsaved(true);
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  };

  return (
    <>
      <form
        action={formAction}
        className="pool on-pool mt-9 px-7 py-8 sm:px-9"
        /**
         * Every typed character marks the sheet unsaved.
         *
         * At the form rather than on each field, because the fields it has to
         * cover are the three at the top, the note under every attached document,
         * and whatever a later block kind adds — and a rule that has to be
         * remembered on each new field is a rule that will be forgotten on one.
         * `onInput` and not `onChange`: React's `onChange` on a text input is
         * already input-time, but the native event is what a paste or an
         * autofill fires, and this listens for the bubbled native one.
         *
         * The file picker is the one exclusion. It uploads on its own the moment
         * she chooses something and does not wait for a save, so marking the
         * sheet dirty there would ask her to save a change that has already
         * happened.
         */
        onInput={(event) => {
          const target = event.target as HTMLInputElement;
          if (target.type !== "file") setUnsaved(true);
        }}
      >
        <input type="hidden" name="id" value={newsletter.id} />

        <Section
          id="letter-inbox"
          title="Subject and preheader"
          note="what somebody sees before they open it"
          first
        >
          <label className="block">
            <span className={LABEL}>
              Subject line <Needed />
            </span>
            <input
              name="subject"
              type="text"
              maxLength={160}
              defaultValue={kept("subject", newsletter.subject)}
              className={FIELD_BIG}
            />
          </label>
          <FieldError error={state.errors.subject} />

          <label className="mt-7 block">
            <span className={LABEL}>
              Preheader <Needed />
            </span>
            <input
              name="preheader"
              type="text"
              maxLength={200}
              defaultValue={kept("preheader", newsletter.preheader)}
              className={FIELD}
            />
          </label>
          <p className={HELP}>
            The line most inboxes show after the subject. Under ninety
            characters or it is cut off. Leave it blank and the inbox shows the
            first words of the letter instead, which is rarely the line you
            would choose.
          </p>
          <FieldError error={state.errors.preheader} />

          <label className="mt-7 block">
            <span className={LABEL}>
              The small line under the logo <Needed />
            </span>
            <input
              name="mastheadLabel"
              type="text"
              maxLength={80}
              defaultValue={kept("mastheadLabel", newsletter.mastheadLabel)}
              className={FIELD}
            />
          </label>
          <p className={HELP}>
            At the top of the letter, in gold, above everything else &mdash; The
            monthly letter &middot; August.
          </p>
          <FieldError error={state.errors.mastheadLabel} />

          <p className="mt-7 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            The logo, the colours, the type and the footer &mdash; including the
            unsubscribe link the law requires &mdash; are part of the template.
            They apply to this letter without you touching them.
          </p>
        </Section>

        {/**
         * A picture behind the top of the letter.
         *
         * THE CONSTRAINT IS SAID HERE, IN FULL, RATHER THAN DISCOVERED LATER.
         * Outlook for Windows draws email through Word, which does not do CSS
         * backgrounds at all — so for a large share of any list this picture
         * will never appear, and no amount of care changes that. It is written
         * on the sheet in the plainest words available, because the alternative
         * is her choosing a photograph, seeing it in her own inbox, and assuming
         * everybody else saw it too.
         *
         * WHICH IS ALSO WHY IT IS ONLY BEHIND THE MASTHEAD. Every word of the
         * letter sits on the blush panel or on the flat plum, exactly as before.
         * The one band this touches carries the mark and one uppercase label,
         * and both are drawn over a plum wash so they hold their contrast on any
         * photograph — and read identically when there is none.
         */}
        <Section
          id="letter-masthead"
          title="A picture behind the masthead"
          note={background ? "chosen" : "none — the plain plum"}
        >
          <PicturePicker
            name="backgroundBasename"
            label="The picture behind the top band"
            library={library}
            defaultValue={background}
            value={background}
            onChange={(basename) => {
              setUnsaved(true);
              setBackground(basename);
            }}
            onAdded={(basename) => {
              setLibrary((current) =>
                current.includes(basename)
                  ? current
                  : [...current, basename].sort(),
              );
              setUnsaved(true);
              setBackground(basename);
            }}
          >
            <p className={HELP}>
              Optional, and decoration only. It sits behind the logo at the very
              top, under a plum wash so the writing on it stays readable.
            </p>
          </PicturePicker>

          <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-ink">
            <strong className="font-semibold">
              Outlook on Windows will not show it.
            </strong>{" "}
            It draws email through Word, which ignores background pictures
            entirely &mdash; and many other people have pictures switched off
            until they press &ldquo;show images&rdquo;. All of them see the
            plain plum band instead, which is the letter as it was designed.
            Nothing you write depends on this picture arriving, and nothing ever
            will.
          </p>
        </Section>

        <Section
          id="letter-body"
          title="The letter"
          note={
            rows.length === 0
              ? "nothing in it yet"
              : rows.length === 1
                ? "one block"
                : `${rows.length} blocks, in this order`
          }
        >
          {rows.length === 0 ? (
            <p className="max-w-[58ch] text-[19px] leading-relaxed text-ink">
              Every letter starts blank. Add a heading or a paragraph below to
              begin &mdash; the subject and preheader above are saved with it.
            </p>
          ) : (
            <ol className="flex list-none flex-col gap-0 p-0">
              {rows.map((row, index) => (
                <li
                  key={row.key}
                  className={
                    index === 0 ? "" : "mt-7 border-t border-pool-rule/40 pt-7"
                  }
                >
                  {/* The kind, posted as a hidden field. The ORDER these appear
                    in is the order the letter reads in — see the action. */}
                  <input
                    type="hidden"
                    name={`block-kind-${row.key}`}
                    value={row.kind}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <p className="fig font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-ink">
                      {index + 1} &middot; {KIND_WORDS[row.kind]}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => move(row.key, -1)}
                        disabled={index === 0}
                        className={MOVE}
                        aria-label={`Move this ${KIND_WORDS[row.kind].toLowerCase()} up`}
                      >
                        <Arrow up />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(row.key, 1)}
                        disabled={index === rows.length - 1}
                        className={MOVE}
                        aria-label={`Move this ${KIND_WORDS[row.kind].toLowerCase()} down`}
                      >
                        <Arrow />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.key)}
                        className="t ml-3 min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {row.kind === "heading" && (
                      <>
                        <label className="block">
                          <span className="sr-only">The heading</span>
                          <input
                            type="text"
                            name={`block-text-${row.key}`}
                            value={row.text}
                            onChange={(event) =>
                              set(row.key, "text", event.target.value)
                            }
                            maxLength={200}
                            placeholder="The room has had a coat of paint."
                            className={FIELD_BIG}
                          />
                        </label>
                        <p className={HELP}>
                          A line on its own, in the serif. An empty one is left
                          out of the letter rather than refused.
                        </p>
                      </>
                    )}

                    {row.kind === "paragraph" && (
                      <>
                        <label className="block">
                          <span className="sr-only">The paragraph</span>
                          <textarea
                            name={`block-text-${row.key}`}
                            value={row.text}
                            onChange={(event) =>
                              set(row.key, "text", event.target.value)
                            }
                            rows={5}
                            className={`${FIELD} resize-y leading-relaxed`}
                          />
                        </label>
                        <p className={HELP}>
                          Write it as you would say it. Everything you type
                          arrives as words &mdash; there is no formatting to get
                          wrong and nothing you can type that changes the
                          letter&rsquo;s shape.
                        </p>
                      </>
                    )}

                    {row.kind === "image" && (
                      <>
                        <PicturePicker
                          name={`block-image-${row.key}`}
                          label="The picture"
                          library={library}
                          defaultValue={row.imageBasename}
                          value={row.imageBasename}
                          onChange={(basename) =>
                            set(row.key, "imageBasename", basename)
                          }
                          onAdded={(basename) => {
                            setLibrary((current) =>
                              current.includes(basename)
                                ? current
                                : [...current, basename].sort(),
                            );
                            set(row.key, "imageBasename", basename);
                          }}
                        >
                          <p className={HELP}>
                            It goes into the letter as a JPEG, whatever it is
                            here. Outlook shows neither of the two newer picture
                            formats the site itself uses.
                          </p>
                        </PicturePicker>

                        <label className="mt-6 block">
                          <span className={LABEL}>
                            What is in it <Needed />
                          </span>
                          <input
                            type="text"
                            name={`block-alt-${row.key}`}
                            value={row.alt}
                            onChange={(event) =>
                              set(row.key, "alt", event.target.value)
                            }
                            maxLength={300}
                            className={FIELD}
                          />
                        </label>
                        <p className={HELP}>
                          Read out to anybody who cannot see it, and shown in
                          its place when a mail client refuses to load pictures
                          &mdash; which most of them do until somebody presses
                          &ldquo;show images&rdquo;.
                        </p>
                        <FieldError
                          error={state.errors[`block-alt-${row.key}`]}
                        />

                        <label className="mt-6 block">
                          <span className={LABEL}>The line underneath</span>
                          <input
                            type="text"
                            name={`block-caption-${row.key}`}
                            value={row.caption}
                            onChange={(event) =>
                              set(row.key, "caption", event.target.value)
                            }
                            maxLength={200}
                            className={FIELD}
                          />
                        </label>
                        <p className={HELP}>
                          Optional. Printed small, under the picture, in the
                          letter itself.
                        </p>
                      </>
                    )}

                    {row.kind === "offerings" && (
                      <>
                        <p className="max-w-[58ch] text-[19px] leading-relaxed text-ink">
                          The workshops and courses that are open, with their
                          dates and prices, pulled the moment this letter is
                          sent &mdash; not now. A letter written on the 1st and
                          sent on the 4th does not quote a place that went on
                          the 2nd.
                        </p>
                        <label className="mt-6 block max-w-[16rem]">
                          <span className={LABEL}>How many to show</span>
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            name={`block-count-${row.key}`}
                            value={row.count}
                            onChange={(event) =>
                              set(row.key, "count", event.target.value)
                            }
                            className={`${FIELD} fig font-mono tabular-nums`}
                          />
                        </label>
                        <p className={HELP}>
                          Leave it empty for everything that is open, soonest
                          first. Sessions are not in this list &mdash; they have
                          no date to put beside them.
                        </p>
                      </>
                    )}

                    {row.kind === "button" && (
                      <>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div>
                            <label className="block">
                              <span className={LABEL}>
                                The words on it <Needed />
                              </span>
                              <input
                                type="text"
                                name={`block-text-${row.key}`}
                                value={row.text}
                                onChange={(event) =>
                                  set(row.key, "text", event.target.value)
                                }
                                maxLength={60}
                                placeholder="See everything that's open"
                                className={FIELD}
                              />
                            </label>
                            <FieldError
                              error={state.errors[`block-text-${row.key}`]}
                            />
                          </div>
                          <div>
                            <label className="block">
                              <span className={LABEL}>
                                Where it goes <Needed />
                              </span>
                              <input
                                type="text"
                                name={`block-href-${row.key}`}
                                value={row.href}
                                onChange={(event) =>
                                  set(row.key, "href", event.target.value)
                                }
                                maxLength={300}
                                placeholder="/courses"
                                className={FIELD}
                              />
                            </label>
                            <FieldError
                              error={state.errors[`block-href-${row.key}`]}
                            />
                          </div>
                        </div>
                        <p className={HELP}>
                          An address on the site starting with a slash, like
                          /courses, or a whole one starting https://. The
                          address is printed under the button as well, because a
                          button in an email that nobody can see the destination
                          of is one people do not press.
                        </p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 border-t border-pool-rule/40 pt-7">
            <p className={LABEL}>Add a block</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {KINDS.map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  onClick={() => add(entry.kind)}
                  className={QUIET_BUTTON}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Attachments
          newsletterId={newsletter.id}
          attachments={attachments}
          removeError={removeState.error}
        />

        <div className="mt-11 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-pool-rule/40 pt-8">
          <button
            type="submit"
            disabled={pending}
            className="t min-h-[56px] bg-action px-9 py-4 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save this draft"}
          </button>
          {/* WHICH STATE SHE IS IN, in words, beside the button that changes it.
            The two sentences are different lengths and different colours on
            purpose: "there is something to do here" has to be legible from
            across the room, and the resting state must not look like an
            alarm. */}
          {unsaved ? (
            <p
              role="status"
              className="max-w-[46ch] text-[17px] font-medium leading-relaxed text-ink"
            >
              Not saved yet. Nothing is stored until you press that &mdash; and
              sending, testing and the preview all wait for it, because a letter
              goes out as it was saved.
            </p>
          ) : (
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
              Saved. Saving changes nothing anybody else can see &mdash; sending
              is the button further down, behind a list of who would get it.
            </p>
          )}
        </div>

        {state.message && (
          <p
            role="alert"
            className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-pool-error"
          >
            {state.message}
          </p>
        )}
      </form>

      {/* One form per attached document, OUTSIDE the sheet — a form cannot
        contain another, and the Remove buttons that drive these sit up inside
        the documents panel, joined to them by `form=`. Nothing is drawn here;
        each is a submit target and a hidden id. */}
      {attachments.map((file) => (
        <form
          key={file.id}
          id={`remove-attachment-${file.id}`}
          action={removeAction}
          hidden
        >
          <input type="hidden" name="id" value={file.id} />
        </form>
      ))}
    </>
  );
}

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/**
 * The files that come with the letter.
 *
 * OUTSIDE THE FORM'S SAVE and inside its markup, which is the one structural
 * oddity on this sheet and is worth the note: a file cannot ride a server
 * action alongside the rest of the fields without the whole letter waiting on
 * the upload, so it goes up on its own the moment she chooses it (exactly as a
 * photograph does) and the list below is redrawn from the server.
 *
 * WHICH WAY IT TRAVELS IS SAID HERE, before anything is sent. That is the
 * whole reason the delivery is decided at upload time rather than at send: by
 * the send modal it would be too late for her to do anything about it.
 */
function Attachments({
  newsletterId,
  attachments,
  removeError,
}: {
  newsletterId: number;
  attachments: EditableAttachment[];
  /** Owned by the sheet, because the forms these buttons drive live out there
      alongside it rather than in here. */
  removeError: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  async function take(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    // Cleared straight away so choosing the same file twice — after a refusal
    // she has since fixed — still counts as a change and fires this again.
    input.value = "";

    setAdding(true);
    setRefused(null);
    const body = new FormData();
    body.set("newsletterId", String(newsletterId));
    body.set("file", file);
    try {
      const result = await addAttachment(body);
      if (!result.ok) setRefused(result.error);
    } catch {
      setRefused(
        "The file did not get there. Check the connection and try again.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <Section
      id="letter-files"
      title="Attached documents"
      note={
        attachments.length === 0
          ? "nothing attached"
          : attachments.length === 1
            ? "one file"
            : `${attachments.length} files`
      }
    >
      {attachments.length > 0 && (
        <ul className="flex list-none flex-col gap-0 p-0">
          {attachments.map((file, index) => (
            <li
              key={file.id}
              className={
                index === 0 ? "" : "mt-5 border-t border-pool-rule/40 pt-5"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <p className="font-display text-[24px] leading-tight text-ink">
                  {file.filename}
                </p>
                {/* This panel sits inside the letter's own form, and HTML has
                    no nested forms — React refuses to hydrate them, and a page
                    that fails to hydrate can leave every button on it inert,
                    which is what stopped Save from ever running.

                    So the button belongs to a form it does not contain. Its
                    own form is rendered after the sheet closes, and `form=`
                    associates the two across the tree — which is exactly what
                    that attribute is for.

                    NOT `formAction` on the button: React uses a button's
                    `name` to encode which action it is calling, so setting our
                    own `name` there made the server send `$ACTION_REF_6` where
                    the client had written `attachmentId`, and the tree stopped
                    matching. */}
                <button
                  type="submit"
                  form={`remove-attachment-${file.id}`}
                  className="t min-h-[44px] text-[15px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink"
                >
                  Remove
                </button>
              </div>
              <label className="mt-4 block">
                <span className={LABEL}>What it is</span>
                <input
                  type="text"
                  name={`attachment-note-${file.id}`}
                  defaultValue={file.note}
                  maxLength={200}
                  placeholder="Six short exercises, one page each. A PDF, four pages."
                  className={FIELD}
                />
              </label>
              <p className={HELP}>
                Printed under its name in the letter. Left blank, the letter
                shows the file&rsquo;s own name and how big it is, which is true
                but says nothing about what is in it.
              </p>

              <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-ink-soft">
                {file.size} &middot;{" "}
                {file.delivery === "attached" ? (
                  <>
                    it rides in the message itself, so it is there whether or
                    not they are online when they open it.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-ink">
                      too big to attach
                    </strong>
                    , so the letter carries a link to it and says how large it
                    is. Anything over two megabytes travels this way &mdash; an
                    attachment that size gets whole letters put in junk folders
                    or bounced outright.
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label
          className={`${QUIET_BUTTON} inline-flex cursor-pointer items-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
            disabled={adding}
            onChange={(event) => take(event.currentTarget)}
            className="sr-only"
          />
          {adding ? "Attaching…" : "Attach a document"}
        </label>
        <p className="max-w-[40ch] text-[15px] leading-relaxed text-ink-soft">
          It goes up straight away, so saving the draft cannot lose it.
        </p>
      </div>

      {refused && (
        <p
          role="alert"
          className="mt-3 max-w-[54ch] text-[17px] leading-relaxed text-pool-error"
        >
          {refused}
        </p>
      )}
      {removeError && (
        <p
          role="alert"
          className="mt-3 max-w-[54ch] text-[17px] leading-relaxed text-pool-error"
        >
          {removeError}
        </p>
      )}
    </Section>
  );
}
