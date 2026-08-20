"use client";

import { useEffect, useRef } from "react";

/**
 * WHAT MAKES THE PREVIEW EDITABLE — the inside half of the editor.
 *
 * The page she is editing renders in an iframe of its own (see
 * `app/(preview)/layout.tsx` for why). This is the only script in that frame,
 * and it does four things:
 *
 *   1. SHE TYPES ON THE PAGE. Click a sentence and the caret is in it; type
 *      over it; click away and it saves. This is what D-2 asked for in the
 *      first place — "click the sentence you want to change and type over it" —
 *      and the first build put the words in a field beside the page instead,
 *      which the operator reported as the page not working: he clicked the
 *      paragraph, typed, and nothing appeared, because nothing was listening.
 *   2. Turns a click into a SELECTION, innermost first, so the toolbox beside
 *      the frame becomes that thing's structural controls.
 *   3. Stops the page BEHAVING. Every link would otherwise navigate the frame
 *      away from the page she is editing, and the subscribe form would post an
 *      address. Editing mode is the page, not the page working.
 *   4. Draws the outline the editor asks for after a redraw.
 *
 * REACT NEVER TOUCHES THE EDITABLE ELEMENTS. `contentEditable` is set from
 * here, on the DOM, and the words are read back on blur — React only ever sees
 * the server-rendered result after a save. Letting React own a contentEditable
 * node is the classic way to get a caret that jumps to the start on every
 * keystroke, and none of that can happen if React does not know the node is
 * being typed into.
 *
 * MESSAGES ARE CHECKED FOR ORIGIN both ways. The frame and its parent are the
 * same site, so `location.origin` is the whole rule.
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

/** What she is asked to save, once she has clicked away from it. */
export type Edit =
  | { kind: "slot"; slot: string; value: string }
  | { kind: "item"; item: number; value: string };

export const PREVIEW_MESSAGE = "thefieldwork:preview";

/**
 * How a thing's words are read back off the page.
 *
 * `lines` — the spans are display:block, so `innerText` already has a newline
 * between them and one line typed is one line wanted.
 * `parts` — the hero's eyebrow is three phrases on ONE line divided by a
 * middot, so a newline never appears in it and the divider is what separates
 * them. Read back on the middot; she edits what she sees.
 * everything else — one value, whatever she typed.
 */
function readBack(node: HTMLElement, shape: string): string {
  const text = (node.innerText ?? "").replace(/ /g, " ");
  if (shape === "parts") {
    return text
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 || index < all.length - 1)
    .join("\n")
    .trim();
}

export default function PreviewBridge({
  shapes,
}: {
  /** Slot key → how its words are shaped, from the slot catalogue. */
  shapes: Record<string, string>;
}) {
  const painted = useRef<HTMLElement | null>(null);
  const typing = useRef<{ node: HTMLElement; before: string } | null>(null);

  useEffect(() => {
    const origin = window.location.origin;

    function post(message: Record<string, unknown>) {
      window.parent?.postMessage({ type: PREVIEW_MESSAGE, ...message }, origin);
    }

    /** What kind of value this node holds, or null if it is not words. */
    function shapeOf(node: HTMLElement): string | null {
      const slot = node.dataset.slot;
      if (slot) {
        const shape = shapes[slot];
        // A picture slot has no shape here, which is how a photograph is told
        // apart from a sentence without a second list to keep in step.
        return shape ?? null;
      }
      if (node.dataset.item) {
        const kind = node.dataset.kind ?? "paragraph";
        if (kind === "bullets") return "lines";
        return "line";
      }
      return null;
    }

    /** Stop typing into whatever we were typing into, and save if it changed. */
    function stopTyping() {
      const current = typing.current;
      typing.current = null;
      if (!current) return;

      const { node, before } = current;
      const shape = shapeOf(node);

      /**
       * READ IT BACK BEFORE TAKING `contenteditable` OFF (operator, 2026-08-20
       * — a list of lines came back as one line).
       *
       * `innerText` is LAYOUT-AWARE: it reports what is rendered, not what is
       * in the DOM. `contenteditable="plaintext-only"` carries
       * `white-space: pre-wrap` from the UA stylesheet, so the newline she
       * typed is a line break while she is typing — and the moment the
       * attribute comes off, the element goes back to `white-space: normal`,
       * where that same newline collapses to a SPACE. Reading afterwards
       * therefore read a different string from the one on the screen, and
       * every multi-line edit on the page lost its breaks: a list of lines
       * became one line, and so would the opening's three.
       *
       * Nothing about the order was deliberate; it was just written this way.
       */
      const after = shape ? readBack(node, shape) : null;

      node.removeAttribute("contenteditable");
      node.classList.remove("is-typing");
      if (after === null) return;
      if (after === before) return;

      if (node.dataset.slot) {
        post({ edit: { kind: "slot", slot: node.dataset.slot, value: after } });
      } else if (node.dataset.item) {
        post({
          edit: { kind: "item", item: Number(node.dataset.item), value: after },
        });
      }
    }

    /** Put the caret in a thing and let her type over it. */
    function startTyping(node: HTMLElement) {
      if (typing.current?.node === node) return;
      stopTyping();

      const shape = shapeOf(node);
      if (!shape) return;

      // A line she has added and not written yet is showing the words "Write
      // here", which are the editor's and not hers. They go the moment she
      // starts, or her first sentence would be typed onto the end of them.
      const placeholder = node.querySelector<HTMLElement>("[data-placeholder]");
      if (placeholder || node.dataset.placeholder) {
        node.textContent = "";
      }

      node.setAttribute("contenteditable", "plaintext-only");
      node.classList.add("is-typing");
      typing.current = { node, before: readBack(node, shape) };
      node.focus();

      // The caret goes to the end rather than to wherever the click landed
      // inside text that is about to be replaced — she is nearly always
      // rewriting a line rather than correcting one letter of it.
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    function paint(node: HTMLElement | null) {
      if (painted.current && painted.current !== node) {
        painted.current.removeAttribute("data-chosen");
      }
      painted.current = node;
      if (node) node.setAttribute("data-chosen", "true");
    }

    function choose(node: HTMLElement, selection: Selection) {
      paint(node);
      post({ selection });
      startTyping(node);
    }

    function onClick(event: MouseEvent) {
      // Nothing on this page navigates, submits or plays while she is editing.
      event.preventDefault();
      event.stopPropagation();

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // A TAB IS ALWAYS WHAT IT SAYS IT IS, and it is checked before anything
      // else, because it sits INSIDE the thing it selects and would otherwise
      // be shadowed by whatever it overlaps. The block tab exists for the same
      // reason the section tab does: once a box has a line in it, every click
      // on the box lands on the line, and there is no way back to the box.
      const handle = target.closest<HTMLElement>("[data-handle]");
      const section = target.closest<HTMLElement>("[data-section]");

      if (handle?.dataset.handle === "block") {
        const block = handle.closest<HTMLElement>("[data-block]");
        if (block) {
          stopTyping();
          paint(block);
          post({
            selection: {
              kind: "block",
              block: Number(block.dataset.block),
              blockKind: block.dataset.kind ?? "pool",
              section: Number(section?.dataset.section ?? "0"),
            },
          });
          return;
        }
      }

      if (handle && section) {
        stopTyping();
        paint(section);
        post({
          selection: {
            kind: "section",
            section: Number(section.dataset.section),
            sectionKind:
              section.dataset.sectionKind === "free" ? "free" : "beat",
            beat: section.dataset.beat,
            hidden: section.dataset.hidden === "true",
          },
        });
        return;
      }

      const item = target.closest<HTMLElement>("[data-item]");
      if (item) {
        choose(item, {
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
        choose(slot, { kind: "slot", slot: slot.dataset.slot ?? "" });
        return;
      }

      const block = target.closest<HTMLElement>("[data-block]");
      if (block) {
        stopTyping();
        paint(block);
        post({
          selection: {
            kind: "block",
            block: Number(block.dataset.block),
            blockKind: block.dataset.kind ?? "pool",
            section: Number(
              block.closest<HTMLElement>("[data-section]")?.dataset.section ??
                "0",
            ),
          },
        });
        return;
      }

      if (section) {
        stopTyping();
        paint(section);
        post({
          selection: {
            kind: "section",
            section: Number(section.dataset.section),
            sectionKind:
              section.dataset.sectionKind === "free" ? "free" : "beat",
            beat: section.dataset.beat,
            hidden: section.dataset.hidden === "true",
          },
        });
        return;
      }

      stopTyping();
      paint(null);
      post({ selection: { kind: "none" } });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!typing.current) return;
      // Escape puts it back the way it was; Enter finishes a single-line value
      // rather than putting a second line into something that only has one.
      if (event.key === "Escape") {
        const { node, before } = typing.current;
        node.innerText = before;
        typing.current = null;
        node.removeAttribute("contenteditable");
        node.classList.remove("is-typing");
        return;
      }
      const shape = shapeOf(typing.current.node);
      if (event.key === "Enter" && shape !== "lines" && shape !== "prose") {
        event.preventDefault();
        stopTyping();
      }
    }

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
    document.addEventListener("keydown", onKeyDown, true);
    // Clicking outside the frame entirely — into the toolbox — must still save
    // what she was in the middle of. The window loses focus; that is the signal.
    window.addEventListener("blur", stopTyping);
    document.addEventListener(
      "submit",
      (event) => event.preventDefault(),
      true,
    );
    window.addEventListener("message", onMessage);

    post({ ready: true });

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", stopTyping);
      window.removeEventListener("message", onMessage);
    };
  }, [shapes]);

  return null;
}
