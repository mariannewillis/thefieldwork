"use server";

import type { PageAnchor, PageBlockKind, PageItemKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sitePage } from "@/content/pages";
import { getSession } from "@/lib/auth/server";
import { discardDraft, publishPage } from "@/lib/pages/publish";
import {
  addBlock,
  addItem,
  addSection,
  clearPicture,
  clearText,
  deleteBlock,
  deleteItem,
  deleteSection,
  moveSection,
  setBlockPicture,
  setBlockPlacement,
  setHidden,
  setItem,
  setPicture,
  setSectionPicture,
  setText,
  type Outcome,
} from "@/lib/pages/write";

/**
 * EVERYTHING SHE CAN DO TO A PAGE, as one action.
 *
 * ONE ENTRY POINT RATHER THAN TWENTY. The toolbox is a single client component
 * whose controls all do the same shape of thing — say what changed, get back an
 * error or a redraw — and twenty near-identical server actions would have been
 * twenty places to forget the session check. What varies is named in `intent`
 * and dispatched below; what does not vary happens once, at the top:
 *
 *   1. Refuse anyone who is not signed in. A server action is a POST endpoint
 *      of its own and does not inherit the admin layout's check.
 *   2. Refuse a page that is not editable, which is the same list the panel
 *      draws from — so a route that does not exist and an action against a page
 *      that is not wired are refused by one fact rather than two.
 *   3. Do the thing, in `lib/pages/write`, where the rule lives.
 *   4. Redraw the editor AND the public page. The second one matters on publish
 *      and costs nothing otherwise.
 *
 * NOTHING HERE WRITES THE LIVE COPY except `publish`, and it does it in one
 * transaction from the draft. That is the whole of D-2 that survived D-34.
 */

export type PageActionState = {
  /** Drawn beside the control that was pressed. Null when it worked. */
  error: string | null;
  /** Stamped on success so the toolbox knows something happened. */
  done: number;
  /** What was published, itemised, so the bar can say what went out. */
  published?: number;
};

const NOTHING: PageActionState = { error: null, done: 0 };

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

const num = (form: FormData, name: string): number => {
  const value = Number(form.get(name));
  return Number.isInteger(value) ? value : Number.NaN;
};

const str = (form: FormData, name: string): string =>
  String(form.get(name) ?? "");

function settled(outcome: Outcome): PageActionState {
  return outcome.ok
    ? { error: null, done: Date.now() }
    : { error: outcome.reason, done: 0 };
}

export async function editPage(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  await requireSession();

  const page = str(formData, "page");
  const entry = sitePage(page);
  if (!entry || !entry.editable) {
    return { ...NOTHING, error: "That page is not editable here yet." };
  }

  const intent = str(formData, "intent");
  const result = await dispatch(page, intent, formData);

  revalidatePath(`/admin/pages/${page}`);
  revalidatePath("/admin/pages");
  if (intent === "publish" || intent === "discard") revalidatePath(entry.href);

  return result;
}

async function dispatch(
  page: string,
  intent: string,
  form: FormData,
): Promise<PageActionState> {
  switch (intent) {
    // ── the seven beats ───────────────────────────────────────────────────
    case "set-text":
      return settled(await setText(page, str(form, "key"), str(form, "value")));
    case "reset-text":
      return settled(await clearText(page, str(form, "key")));
    case "set-picture":
      return settled(
        await setPicture(page, str(form, "key"), {
          ref: str(form, "ref"),
          alt: str(form, "alt"),
        }),
      );
    case "reset-picture":
      return settled(await clearPicture(page, str(form, "key")));

    // ── sections ──────────────────────────────────────────────────────────
    case "hide":
      return settled(await setHidden(page, num(form, "section"), true));
    case "show":
      return settled(await setHidden(page, num(form, "section"), false));
    case "add-section": {
      const where = str(form, "where") === "above" ? "above" : "below";
      const outcome = await addSection(page, {
        relativeTo: num(form, "section"),
        where,
      });
      return outcome.ok
        ? { error: null, done: outcome.id }
        : { error: outcome.reason, done: 0 };
    }
    case "delete-section":
      return settled(await deleteSection(page, num(form, "section")));
    case "move-section":
      return settled(
        await moveSection(
          page,
          num(form, "section"),
          str(form, "direction") === "up" ? "up" : "down",
        ),
      );
    case "set-section-picture":
      return settled(
        await setSectionPicture(page, num(form, "section"), {
          ref: str(form, "ref"),
          alt: str(form, "alt"),
        }),
      );
    case "clear-section-picture":
      return settled(await setSectionPicture(page, num(form, "section"), null));

    // ── what is in a section ──────────────────────────────────────────────
    case "add-block": {
      const outcome = await addBlock(page, {
        sectionId: num(form, "section"),
        kind: str(form, "kind") as PageBlockKind,
        placement: str(form, "placement") as PageAnchor,
      });
      return outcome.ok
        ? { error: null, done: outcome.id }
        : { error: outcome.reason, done: 0 };
    }
    case "place-block":
      return settled(
        await setBlockPlacement(
          page,
          num(form, "block"),
          str(form, "placement") as PageAnchor,
        ),
      );
    case "set-block-picture":
      return settled(
        await setBlockPicture(page, num(form, "block"), {
          ref: str(form, "ref"),
          alt: str(form, "alt"),
        }),
      );
    case "delete-block":
      return settled(await deleteBlock(page, num(form, "block")));

    // ── the lines inside a box ────────────────────────────────────────────
    case "add-item": {
      const outcome = await addItem(page, {
        blockId: num(form, "block"),
        kind: str(form, "kind") as PageItemKind,
      });
      return outcome.ok
        ? { error: null, done: outcome.id }
        : { error: outcome.reason, done: 0 };
    }
    case "set-item":
      return settled(
        await setItem(page, num(form, "item"), {
          text: str(form, "value"),
          href: form.get("href") === null ? null : str(form, "href"),
        }),
      );
    case "delete-item":
      return settled(await deleteItem(page, num(form, "item")));

    // ── out it goes ───────────────────────────────────────────────────────
    case "publish": {
      const result = await publishPage(page);
      if (result.outcome === "nothing") {
        return {
          error:
            "Nothing is waiting to go out — what is on the site is already what you have here.",
          done: 0,
        };
      }
      return { error: null, done: Date.now(), published: result.count };
    }
    case "discard":
      await discardDraft(page);
      return { error: null, done: Date.now() };

    default:
      return { error: "That is not something this page can do.", done: 0 };
  }
}
