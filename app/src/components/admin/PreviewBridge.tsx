"use client";

import { useEffect, useRef } from "react";

/**
 * WHAT MAKES THE PREVIEW CLICKABLE — the inside half of the editor.
 *
 * The page she is editing renders in an iframe of its own (see
 * `app/(preview)/layout.tsx` for why). This is the only script in that frame,
 * and it does three things:
 *
 *   1. Turns a click anywhere on the page into a SELECTION, chosen innermost
 *      first: a line inside a box beats the box, the box beats the section.
 *      That is the order she means — she clicks the sentence she wants, not the
 *      band it happens to be in.
 *   2. Stops the page BEHAVING. Every link on it would otherwise navigate the
 *      frame away from the page she is editing, and the subscribe form would
 *      post an address. Editing mode is a picture of the page, not the page.
 *   3. Posts the selection up to the editor, and draws the outline the editor
 *      asks for.
 *
 * ONE HANDLER ON THE DOCUMENT rather than a listener per element. The page is
 * re-rendered by the server on every change, so anything bound per-element
 * would have to be re-bound after each one; delegation survives a redraw
 * without knowing one happened.
 *
 * MESSAGES ARE CHECKED FOR ORIGIN both ways. The frame and its parent are the
 * same site, so `location.origin` is the whole of the rule — a message from
 * anywhere else is not ours and is dropped.
 */

export type Selection =
  | { kind: "none" }
  | { kind: "slot"; slot: string }
  | {
      kind: "section";
      section: number;
      sectionKind: "beat" | "free";
      beat?: string;
      hidden: boolean;
    }
  | { kind: "block"; block: number; blockKind: string; section: number }
  | { kind: "item"; item: number; itemKind: string; block: number };

export const PREVIEW_MESSAGE = "thefieldwork:preview";

export default function PreviewBridge() {
  const painted = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const origin = window.location.origin;

    function paint(node: HTMLElement | null) {
      if (painted.current && painted.current !== node) {
        painted.current.removeAttribute("data-chosen");
      }
      painted.current = node;
      if (node) node.setAttribute("data-chosen", "true");
    }

    function send(selection: Selection) {
      window.parent?.postMessage({ type: PREVIEW_MESSAGE, selection }, origin);
    }

    function onClick(event: MouseEvent) {
      // Nothing on this page navigates, submits or plays while she is editing.
      event.preventDefault();
      event.stopPropagation();

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // The tab first, because it sits INSIDE the section it selects and would
      // otherwise be shadowed by whatever it happens to overlap.
      const handle = target.closest<HTMLElement>("[data-handle]");
      const section = target.closest<HTMLElement>("[data-section]");
      if (handle && section) {
        paint(section);
        send({
          kind: "section",
          section: Number(section.dataset.section),
          sectionKind: section.dataset.sectionKind === "free" ? "free" : "beat",
          beat: section.dataset.beat,
          hidden: section.dataset.hidden === "true",
        });
        return;
      }

      const item = target.closest<HTMLElement>("[data-item]");
      if (item) {
        paint(item);
        send({
          kind: "item",
          item: Number(item.dataset.item),
          itemKind: item.dataset.kind ?? "paragraph",
          block: Number(
            item.closest<HTMLElement>("[data-block]")?.dataset.block ?? "0",
          ),
        });
        return;
      }

      const slot = target.closest<HTMLElement>("[data-slot]");
      if (slot) {
        paint(slot);
        send({ kind: "slot", slot: slot.dataset.slot ?? "" });
        return;
      }

      const block = target.closest<HTMLElement>("[data-block]");
      if (block) {
        paint(block);
        send({
          kind: "block",
          block: Number(block.dataset.block),
          blockKind: block.dataset.kind ?? "pool",
          section: Number(
            block.closest<HTMLElement>("[data-section]")?.dataset.section ??
              "0",
          ),
        });
        return;
      }

      if (section) {
        paint(section);
        send({
          kind: "section",
          section: Number(section.dataset.section),
          sectionKind: section.dataset.sectionKind === "free" ? "free" : "beat",
          beat: section.dataset.beat,
          hidden: section.dataset.hidden === "true",
        });
        return;
      }

      paint(null);
      send({ kind: "none" });
    }

    // The editor asks for a selection back after a redraw, so that saving a
    // sentence does not also lose her place on the page.
    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; select?: Selection } | null;
      if (!data || data.type !== PREVIEW_MESSAGE || !data.select) return;

      const select = data.select;
      const node =
        select.kind === "slot"
          ? document.querySelector<HTMLElement>(
              `[data-slot="${CSS.escape(select.slot)}"]`,
            )
          : select.kind === "item"
            ? document.querySelector<HTMLElement>(
                `[data-item="${select.item}"]`,
              )
            : select.kind === "block"
              ? document.querySelector<HTMLElement>(
                  `[data-block="${select.block}"]`,
                )
              : select.kind === "section"
                ? document.querySelector<HTMLElement>(
                    `[data-section="${select.section}"]`,
                  )
                : null;
      paint(node);
      node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    document.addEventListener("click", onClick, true);
    // A form inside the frame must not post, whatever route it takes there.
    document.addEventListener(
      "submit",
      (event) => event.preventDefault(),
      true,
    );
    window.addEventListener("message", onMessage);

    // Tell the editor the frame is ready, so a redraw can restore the outline
    // without the editor having to guess when the load finished.
    window.parent?.postMessage({ type: PREVIEW_MESSAGE, ready: true }, origin);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
