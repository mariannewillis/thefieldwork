"use client";

import { useActionState, useState } from "react";
import {
  saveMessage,
  sendMessage,
  type MessageState,
} from "@/app/(admin)/admin/offerings/message-actions";
import GalleryPicker from "@/components/admin/GalleryPicker";
import PictureReachWarning from "@/components/admin/PictureReachWarning";
import { mediaSrc } from "@/components/admin/OfferingFormParts";
import type { Attendee } from "@/lib/attending";

/**
 * WRITING TO THE PEOPLE ON ONE OFFERING.
 *
 * THE SAME LOOK, NOT THE SAME EDITOR. What arrives is rendered by
 * `composeNewsletter`, unchanged — the same masthead, the same plum plate, the
 * same type — because there is one design for mail from this site. The COMPOSER
 * is its own, and simpler: a letter is a monthly piece with attachments, a
 * subscriber list and an unsubscribe link; this is "the room has moved", and
 * giving it the letter's whole apparatus would be giving her ten controls to
 * write two sentences with.
 *
 * THE RECIPIENT CONTROL IS WHERE THE TWO KINDS PART, and it is the operator's
 * distinction made structural (2026-08-20):
 *
 *   workshop · course   TICKS. A cohort — ten people, one Saturday, one room —
 *                       and "the room has moved" is one fact they all need.
 *                       Cancelled places are listed and start UNTICKED: she may
 *                       still need to write to them, but a message to everyone
 *                       coming must not include somebody who is not.
 *
 *   service             ONE, chosen. A sequence of individuals, each with their
 *                       own hour and no shared fact. "Everyone who has ever had
 *                       this" is not a group — it is a mailing list assembled
 *                       from bookings, and mailing it is marketing to people
 *                       who gave an address to book an hour. That is what the
 *                       letter is for, and why the letter has double opt-in.
 *
 * NO UNSUBSCRIBE LINK ON EITHER, and that is not an omission — see the note in
 * `lib/offering-mail.ts`. Unsubscribing from a day you have paid for is
 * meaningless, and this channel never touches the subscriber list.
 */

export type DraftBlock = {
  kind: "heading" | "paragraph" | "image" | "button";
  text: string;
  imageBasename: string;
  alt: string;
  href: string;
};

const NOTHING: MessageState = { error: null, done: 0 };

const PRIMARY =
  "t min-h-[52px] bg-action px-7 py-3 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60";
const OUTLINE =
  "t min-h-[44px] border border-ink bg-transparent px-5 py-2 text-[16px] font-medium text-ink hover:bg-ink hover:text-pool";
const CHIP =
  "t min-h-[38px] border border-pool-rule px-3 py-1.5 text-[15px] text-ink hover:border-ink";
const GHOST =
  "t min-h-[38px] py-1.5 text-[16px] text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";
const LABEL =
  "block fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft";
const FIELD =
  "mt-2 w-full border border-pool-rule bg-transparent px-3 py-2.5 text-[17px] text-ink focus:border-ink focus:outline-none";

const KINDS = [
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Paragraph" },
  { value: "image", label: "Picture" },
  { value: "button", label: "Button" },
] as const;

export default function OfferingMessage({
  kind,
  offeringId,
  slug,
  subject: savedSubject,
  blocks: savedBlocks,
  attendees,
  media,
  sent,
}: {
  kind: "workshop" | "course" | "service";
  offeringId: number;
  slug: string;
  subject: string;
  blocks: DraftBlock[];
  attendees: Attendee[];
  media: string[];
  /** Messages already gone, newest first, so she can see what was said. */
  sent: { id: number; subject: string; when: string; count: number }[];
}) {
  const one = kind === "service";

  const [subject, setSubject] = useState(savedSubject);
  const [blocks, setBlocks] = useState<DraftBlock[]>(
    savedBlocks.length > 0
      ? savedBlocks
      : [{ kind: "paragraph", text: "", imageBasename: "", alt: "", href: "" }],
  );
  // A cohort starts with everyone who is coming ticked; a cancelled place is
  // listed and left off. One-to-one starts with nobody, because choosing is the
  // point rather than a default to correct.
  const [ticked, setTicked] = useState<string[]>(
    one ? [] : attendees.filter((a) => a.coming).map((a) => a.key),
  );
  const [picking, setPicking] = useState<number | null>(null);

  const [saveState, save, saving] = useActionState(saveMessage, NOTHING);
  const [sendState, send, sending] = useActionState(sendMessage, NOTHING);

  const chosen = attendees.filter((a) => ticked.includes(a.key));

  function edit(index: number, patch: Partial<DraftBlock>) {
    setBlocks((current) =>
      current.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    );
  }

  return (
    <div className="mt-7 flex flex-col gap-7 lg:flex-row">
      {/* ── what it says ─────────────────────────────────────────────────── */}
      <form action={save} className="pool on-pool min-w-0 flex-1 px-7 py-7">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="offeringId" value={offeringId} />
        <input type="hidden" name="slug" value={slug} />

        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          What it says
        </p>

        <label className="mt-5 block">
          <span className={LABEL}>Subject</span>
          <span className="mt-1 block text-[15px] leading-relaxed text-ink-soft">
            The line they see in their inbox before they open anything.
          </span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={FIELD}
            required
          />
        </label>

        {blocks.map((block, index) => (
          <div key={index} className="mt-6 border-t border-pool-rule/50 pt-5">
            <input
              type="hidden"
              name={`block-${index}-kind`}
              value={block.kind}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={LABEL}>
                {KINDS.find((k) => k.value === block.kind)?.label}
              </span>
              <button
                type="button"
                onClick={() =>
                  setBlocks((current) => current.filter((_, i) => i !== index))
                }
                className={GHOST}
              >
                Remove
              </button>
            </div>

            {block.kind === "image" ? (
              <>
                <input
                  type="hidden"
                  name={`block-${index}-image`}
                  value={block.imageBasename}
                />
                {/* THE PICTURE, NOT ITS FILENAME (operator, 2026-08-20). This
                    said `aura-seated-figure` and nothing else, so choosing one
                    looked exactly like choosing the wrong one, and the only way
                    to find out which she had was to send it. A composer shows
                    what is being composed. */}
                {block.imageBasename ? (
                  <figure className="mt-3 m-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(block.imageBasename)}
                      alt=""
                      className="block h-auto w-full max-w-[280px] border border-pool-rule"
                    />
                    <figcaption className="mt-2 fig font-mono text-[15px] text-ink-soft">
                      {block.imageBasename}
                    </figcaption>
                  </figure>
                ) : (
                  <p className="mt-2 fig font-mono text-[15px] text-ink-soft">
                    None chosen yet
                  </p>
                )}
                <PictureReachWarning />
                <button
                  type="button"
                  onClick={() => setPicking(index)}
                  className={`${OUTLINE} mt-2`}
                >
                  {block.imageBasename ? "Choose another" : "Choose a picture"}
                </button>
                <label className="mt-3 block">
                  <span className={LABEL}>What is in it</span>
                  <input
                    type="text"
                    name={`block-${index}-alt`}
                    value={block.alt}
                    onChange={(event) =>
                      edit(index, { alt: event.target.value })
                    }
                    className={FIELD}
                  />
                </label>
              </>
            ) : (
              <>
                {block.kind === "paragraph" ? (
                  <textarea
                    name={`block-${index}-text`}
                    value={block.text}
                    rows={5}
                    onChange={(event) =>
                      edit(index, { text: event.target.value })
                    }
                    className={`${FIELD} leading-relaxed`}
                  />
                ) : (
                  <input
                    type="text"
                    name={`block-${index}-text`}
                    value={block.text}
                    onChange={(event) =>
                      edit(index, { text: event.target.value })
                    }
                    className={FIELD}
                  />
                )}

                {block.kind === "button" && (
                  <label className="mt-3 block">
                    <span className={LABEL}>Where it goes</span>
                    <input
                      type="text"
                      name={`block-${index}-href`}
                      value={block.href}
                      onChange={(event) =>
                        edit(index, { href: event.target.value })
                      }
                      className={FIELD}
                      placeholder="https://thefieldwork.co.uk/…"
                    />
                  </label>
                )}
              </>
            )}
          </div>
        ))}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-pool-rule/50 pt-5">
          <span className={LABEL}>Add</span>
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              className={CHIP}
              onClick={() =>
                setBlocks((current) => [
                  ...current,
                  {
                    kind: k.value,
                    text: "",
                    imageBasename: "",
                    alt: "",
                    href: "",
                  },
                ])
              }
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-5">
          <button type="submit" disabled={saving} className={OUTLINE}>
            {saving ? "Saving…" : "Save it"}
          </button>
          {saveState.done > 0 && !saveState.error && (
            <span role="status" className="text-[16px] text-ink-soft">
              Saved. Nothing has gone anywhere.
            </span>
          )}
        </div>

        {saveState.error && (
          <p
            role="alert"
            className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-pool-error"
          >
            {saveState.error}
          </p>
        )}

        <GalleryPicker
          kind="picture"
          assets={media.map((basename) => ({
            kind: "picture" as const,
            ref: basename,
            title: null,
            contentType: null,
            bytes: null,
          }))}
          open={picking !== null}
          onClose={() => setPicking(null)}
          onPick={(refs) => {
            const at = picking;
            setPicking(null);
            if (at !== null && refs[0]) edit(at, { imageBasename: refs[0] });
          }}
        />
      </form>

      {/* ── who gets it ──────────────────────────────────────────────────── */}
      <form
        action={send}
        className="pool on-pool w-full shrink-0 px-7 py-7 lg:w-[400px]"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="offeringId" value={offeringId} />
        <input type="hidden" name="slug" value={slug} />
        {ticked.map((key) => (
          <input key={key} type="hidden" name="to" value={key} />
        ))}

        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          {one ? "Who is this for?" : "Who gets it"}
        </p>

        <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
          {one
            ? "One person at a time. A session is an hour with somebody, and a message about it is to them — anything you want to say to everybody goes in the letter."
            : "Everybody on this one, unless you say otherwise. This is about the day they have booked; it carries no way to unsubscribe, because there is nothing to unsubscribe from."}
        </p>

        {attendees.length === 0 ? (
          <p className="mt-5 text-[17px] leading-relaxed text-ink">
            Nobody is on this one yet, so there is nobody to write to.
          </p>
        ) : (
          <ul className="mt-5 flex list-none flex-col gap-0 p-0">
            {attendees.map((person) => {
              const on = ticked.includes(person.key);
              return (
                <li
                  key={person.key}
                  className="border-t border-pool-rule/40 py-3 first:border-t-0"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type={one ? "radio" : "checkbox"}
                      name="choice"
                      checked={on}
                      onChange={() =>
                        setTicked((current) =>
                          one
                            ? [person.key]
                            : current.includes(person.key)
                              ? current.filter((key) => key !== person.key)
                              : [...current, person.key],
                        )
                      }
                      className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-action)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[17px] leading-tight text-ink">
                        {person.name}
                      </span>
                      <span className="block break-all fig font-mono text-[15px] text-ink-soft">
                        {person.email}
                      </span>
                      <span
                        className={
                          person.coming
                            ? "block text-[15px] text-ink-soft"
                            : "block text-[15px] text-pool-error"
                        }
                      >
                        {person.standing}
                        {person.detail ? ` · ${person.detail}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-7 border-t border-pool-rule pt-6">
          <button
            type="submit"
            disabled={sending || chosen.length === 0}
            className={PRIMARY}
          >
            {sending
              ? "Sending…"
              : chosen.length === 0
                ? one
                  ? "Choose somebody first"
                  : "Nobody is ticked"
                : one
                  ? `Send it to ${chosen[0].name}`
                  : `Send it to ${chosen.length} ${chosen.length === 1 ? "person" : "people"}`}
          </button>

          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Save what you have written first — sending uses the saved version,
            not what is on the screen.
          </p>
        </div>

        {sendState.error && (
          <p
            role="alert"
            className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-pool-error"
          >
            {sendState.error}
          </p>
        )}
        {sendState.done > 0 && !sendState.error && (
          <p role="status" className="mt-4 text-[16px] text-ink">
            It has gone.
          </p>
        )}

        {sent.length > 0 && (
          <div className="mt-8 border-t border-pool-rule pt-6">
            <p className={LABEL}>Already sent about this one</p>
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {sent.map((message) => (
                <li key={message.id} className="text-[16px] text-ink-soft">
                  <span className="text-ink">{message.subject}</span> &middot;{" "}
                  {message.when} &middot; {message.count}{" "}
                  {message.count === 1 ? "person" : "people"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
