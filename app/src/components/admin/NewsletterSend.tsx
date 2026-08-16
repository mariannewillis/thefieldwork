"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  continueSending,
  sendTestCopy,
  startSending,
  type SendState,
  type TestState,
} from "@/app/(admin)/admin/newsletters/actions";

/**
 * The two ways a letter leaves — to her, and to everybody.
 *
 * THEY ARE DRAWN AS TWO DIFFERENT THINGS because they are two different
 * things. One is reversible in the sense that nothing happened; the other puts
 * a copy of the letter in two hundred inboxes and cannot be recalled. The test
 * is a quiet outlined button with a sentence under it. The send is magenta,
 * and there is a list of names between it and anything leaving.
 *
 * WHY THE MODAL IS A LIST AND NOT A COUNT. The approved mockup draws a
 * confirmation saying "send to 96 subscribers", and that is what most tools
 * do. The operator asked for the people themselves, every one ticked, so that
 * the last thing she sees before pressing send is WHO — and so that leaving
 * one person out is unticking a box rather than a support request. The count
 * on the button is still there; it counts the ticks.
 */

const PRIMARY =
  "t min-h-[56px] bg-action px-9 py-4 text-[17px] font-semibold text-pool hover:bg-ink disabled:opacity-60";
const OUTLINE =
  "t min-h-[52px] border border-ink bg-transparent px-7 py-3 text-[17px] font-medium text-ink hover:bg-ink hover:text-pool disabled:opacity-60";
const GHOST =
  "t min-h-[44px] py-2 text-[17px] font-medium text-ink-soft underline decoration-pool-rule underline-offset-4 hover:text-ink";
const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-action";

export type Recipient = {
  id: number;
  name: string | null;
  email: string;
  /** The day they confirmed, already in words. */
  since: string;
};

const NO_TEST: TestState = { error: null, sentTo: null, at: 0 };
const NOT_STARTED: SendState = { error: null, recipients: 0, started: 0 };

/** A real `<dialog>`: focus goes into it, Escape closes it, the page behind
 *  cannot be tabbed to. The same one the bookings ledger uses. */
function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={() => open && onClose()}
      onCancel={() => open && onClose()}
      className="modal pool on-pool text-ink"
    >
      {open && <div className="px-7 py-7 sm:px-8">{children}</div>}
    </dialog>
  );
}

export default function NewsletterSend({
  newsletterId,
  recipients,
  testTo,
  /** Rows already written and still `pending` — a send that stopped part-way. */
  pending,
  sent,
}: {
  newsletterId: number;
  recipients: Recipient[];
  testTo: string | null;
  pending: number;
  sent: boolean;
}) {
  const router = useRouter();

  const [test, testAction, testing] = useActionState(sendTestCopy, NO_TEST);
  const [send, sendAction, starting] = useActionState(
    startSending,
    NOT_STARTED,
  );

  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<Set<number>>(
    // ALL TICKED. The letter is for the list; unticking is the exception, and
    // a modal that opened with nobody selected would make the ordinary case
    // the laborious one.
    () => new Set(recipients.map((person) => person.id)),
  );

  /** Live progress while the batches run. Null until one starts. */
  const [progress, setProgress] = useState<{
    delivered: number;
    failed: number;
    remaining: number;
    total: number;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [stalled, setStalled] = useState<string | null>(null);

  /**
   * The loop.
   *
   * Each call sends a couple of dozen and returns how many are left; this
   * calls it again until nothing is pending. Nothing here is a job runner —
   * the browser is what keeps it going, and if the tab is closed the pending
   * rows simply wait for somebody to press "carry on". See
   * `lib/newsletter/send.ts` for the whole reasoning.
   */
  async function drain() {
    setRunning(true);
    setStalled(null);
    try {
      for (;;) {
        const batch = await continueSending(newsletterId);
        setProgress((current) => ({
          delivered: (current?.delivered ?? 0) + batch.delivered,
          failed: (current?.failed ?? 0) + batch.failed,
          remaining: batch.remaining,
          total: batch.total,
        }));
        if (batch.remaining === 0) break;
        // A batch that attempted nothing while rows are still pending would
        // spin forever. Stop and say so rather than looping in silence.
        if (batch.attempted === 0) {
          setStalled(
            "The sending stopped without getting through the rest. Nothing has gone out twice — press carry on to try the remaining ones again.",
          );
          break;
        }
      }
    } catch {
      setStalled(
        "The connection dropped part-way. Everything sent so far is recorded — press carry on and it picks up where it stopped.",
      );
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  // The freeze succeeded, so start sending. Separate from the action itself
  // because the action's job is to write the rows and lock the letter — the
  // messages are a loop that has to be able to be resumed independently.
  useEffect(() => {
    if (send.started > 0 && !running && progress === null) {
      setOpen(false);
      void drain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send.started]);

  const count = ticked.size;
  const excluded = recipients.length - count;

  if (sent && pending === 0 && progress === null) return null;

  return (
    <section
      aria-labelledby="send-h"
      className="pool on-pool mt-9 px-7 py-8 sm:px-9"
    >
      <p className={EYEBROW}>Before you send</p>
      <h2
        id="send-h"
        className="mt-3 font-display text-[30px] leading-tight text-ink"
      >
        {sent || pending > 0
          ? "This letter is on its way."
          : "A test goes only to you. A send goes to everybody."}
      </h2>

      {/* ── a send in progress, or one that stopped part-way ──────────────── */}
      {(progress || pending > 0) && (
        <div className="mt-6 border-l-2 border-action px-5 py-4">
          <p className="text-[19px] leading-relaxed text-ink">
            {progress
              ? `${progress.delivered} of ${progress.total} sent${
                  progress.failed > 0 ? `, ${progress.failed} refused` : ""
                }${progress.remaining > 0 ? `, ${progress.remaining} still to go` : "."}`
              : `${pending} ${pending === 1 ? "person has" : "people have"} not been sent to yet. Nothing goes out twice — carrying on only reaches the ones still waiting.`}
          </p>

          {(progress?.remaining ?? pending) > 0 && (
            <button
              type="button"
              onClick={() => void drain()}
              disabled={running}
              className={`${OUTLINE} mt-5`}
            >
              {running ? "Sending…" : "Carry on sending"}
            </button>
          )}

          {stalled && (
            <p
              role="alert"
              className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-pool-error"
            >
              {stalled}
            </p>
          )}
        </div>
      )}

      {/* ── the test ──────────────────────────────────────────────────────── */}
      {!sent && (
        <div className="mt-8 border-t border-pool-rule/40 pt-7">
          <form action={testAction}>
            <input type="hidden" name="id" value={newsletterId} />
            <button type="submit" disabled={testing} className={OUTLINE}>
              {testing ? "Sending the test…" : "Send a test to yourself"}
            </button>
          </form>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            {testTo ? (
              <>
                It goes to <strong className="text-ink">{testTo}</strong> and
                nowhere else. Send as many as you like &mdash; a test never
                reaches anybody on the list, does not lock this letter, and
                leaves no record against anybody&rsquo;s name.
              </>
            ) : (
              <>
                There is no email address on your account, so there is nowhere
                to send a test. Settings has the field.
              </>
            )}
          </p>
          {test.sentTo && (
            <p className="mt-3 text-[17px] leading-relaxed text-ink">
              Sent to {test.sentTo}. It should be there within a minute; if it
              is not, look in junk.
            </p>
          )}
          {test.error && (
            <p
              role="alert"
              className="mt-3 max-w-[58ch] text-[17px] leading-relaxed text-pool-error"
            >
              {test.error}
            </p>
          )}
        </div>
      )}

      {/* ── the send ──────────────────────────────────────────────────────── */}
      {!sent && pending === 0 && (
        <div className="mt-8 border-t border-pool-rule/40 pt-7">
          <p className="max-w-[62ch] text-[19px] leading-relaxed text-ink">
            {recipients.length === 0 ? (
              <>
                Nobody has confirmed an address yet, so there is nobody to send
                this to. Somebody joins by using the form on the site and then
                pressing the link in the message that arrives.
              </>
            ) : (
              <>
                {recipients.length}{" "}
                {recipients.length === 1 ? "person has" : "people have"}{" "}
                confirmed their address and would get this. Anyone who has not
                confirmed, and anyone who has asked to be taken off, is not on
                that list and cannot be put on it here.
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={recipients.length === 0}
            className={`${PRIMARY} mt-6`}
          >
            Send this letter
          </button>

          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
            Once it starts, this letter is closed: it cannot be edited, and what
            has gone cannot be recalled. You will see who it went to and when.
          </p>

          {send.error && (
            <p
              role="alert"
              className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-pool-error"
            >
              {send.error}
            </p>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="who-h">
        <form action={sendAction}>
          <input type="hidden" name="id" value={newsletterId} />

          <p className={EYEBROW}>Send to subscribers</p>
          <h3
            id="who-h"
            className="mt-3 font-display text-[28px] leading-tight text-ink"
          >
            {count === recipients.length
              ? `All ${recipients.length} of them.`
              : `${count} of ${recipients.length}.`}
          </h3>
          <p className="mt-3 max-w-[48ch] text-[17px] leading-relaxed text-ink-soft">
            Everybody is ticked. Untick anyone who should not get this one
            &mdash; they get nothing at all, and no record is kept against their
            name.
          </p>

          <div className="mt-6 flex gap-5">
            <button
              type="button"
              onClick={() =>
                setTicked(new Set(recipients.map((person) => person.id)))
              }
              className={GHOST}
            >
              Tick everyone
            </button>
            <button
              type="button"
              onClick={() => setTicked(new Set())}
              className={GHOST}
            >
              Untick everyone
            </button>
          </div>

          <ul className="mt-6 flex max-h-[42vh] list-none flex-col gap-0 overflow-y-auto border-y border-pool-rule/40 p-0">
            {recipients.map((person) => (
              <li
                key={person.id}
                className="border-b border-pool-rule/25 last:border-b-0"
              >
                <label className="flex cursor-pointer items-start gap-4 py-3.5">
                  <input
                    type="checkbox"
                    name="recipient"
                    value={person.id}
                    checked={ticked.has(person.id)}
                    onChange={(event) =>
                      setTicked((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(person.id);
                        else next.delete(person.id);
                        return next;
                      })
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-action"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[19px] text-ink">
                      {person.name ?? person.email}
                    </span>
                    <span className="fig block truncate font-mono text-[15px] text-ink-soft">
                      {person.name ? `${person.email} · ` : ""}
                      {person.since}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {excluded > 0 && (
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              {excluded === 1 ? "One person is" : `${excluded} people are`}{" "}
              unticked and will get nothing.
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="submit"
              disabled={count === 0 || starting}
              className={PRIMARY}
            >
              {starting
                ? "Starting…"
                : count === 1
                  ? "Send it to 1 person"
                  : `Send it to ${count} people`}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={GHOST}
            >
              Not yet
            </button>
          </div>

          <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft">
            This cannot be paused, edited or undone once it starts.
          </p>
        </form>
      </Modal>
    </section>
  );
}
