import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageEditor, {
  type EditorBlock,
  type EditorItem,
  type EditorSection,
} from "@/components/admin/PageEditor";
import { sitePage } from "@/content/pages";
import { listMediaBasenames } from "@/lib/media";
import { pendingChanges } from "@/lib/pages/publish";
import { pictureOf, readPage, textOf } from "@/lib/pages/read";
import { BEATS, PICTURE_SLOTS, TEXT_SLOTS } from "@/lib/pages/slots";
import { ensureDraft } from "@/lib/pages/write";

/**
 * Editing one page.
 *
 * WHAT IS ON THIS SCREEN IS THE PAGE AND A PANEL BESIDE IT. The page is in an
 * iframe of its own (`app/(preview)/…`), for the reason set out there: the
 * site's stylesheet and the portal's cannot share a document. Everything else
 * here is the panel — what is selected, what can be done to it, and what is
 * waiting to go out.
 *
 * THE SERVER SENDS THE VALUES, NOT THE PANEL. The toolbox is a client component
 * and could have fetched what it needed on selection; it does not. Every word
 * and every photograph currently on the draft is handed over with the screen,
 * so opening a sentence to change it is instant and works with the network off.
 * The page has a few dozen slots — this is a few kilobytes.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const entry = sitePage(key);
  return { title: `${entry?.label ?? "Page"} — The Field Work` };
}

export default async function PageEditorScreen({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const entry = sitePage(key);
  // A page that is listed but not wired has no editor, and the panel already
  // says so — arriving here by typing the URL gets the same answer.
  if (!entry?.editable) notFound();

  // OPENING THE EDITOR IS WHAT STARTS A DRAFT. The seven sections are written
  // down here rather than on her first change, because until they exist they
  // have no ids, and every control on this screen addresses a section by one.
  await ensureDraft(key);

  const [draft, pending, library] = await Promise.all([
    readPage(key, "draft"),
    pendingChanges(key),
    listMediaBasenames(),
  ]);

  // ── what the toolbox needs to prefill its fields ───────────────────────
  const text: Record<string, string> = {};
  const pictures: Record<string, { ref: string; alt: string }> = {};
  const sections: EditorSection[] = [];
  const blocks: Record<number, EditorBlock> = {};
  const items: Record<number, EditorItem> = {};

  for (const section of draft.sections) {
    if (section.kind === "beat") {
      sections.push({
        id: section.id,
        kind: "beat",
        beat: section.beatKey,
        label:
          BEATS.find((b) => b.key === section.beatKey)?.label ?? "A section",
        note: BEATS.find((b) => b.key === section.beatKey)?.note ?? "",
        hidden: section.hidden,
        hasPicture: false,
      });
      for (const slot of TEXT_SLOTS) {
        if (slot.beat !== section.beatKey) continue;
        text[slot.key] = textOf(section, slot.key);
      }
      for (const slot of PICTURE_SLOTS) {
        if (slot.beat !== section.beatKey) continue;
        const picture = pictureOf(section, slot.key);
        pictures[slot.key] = { ref: picture.ref, alt: picture.alt };
      }
      continue;
    }

    sections.push({
      id: section.id,
      kind: "free",
      label: "A section you added",
      note: "Yours to fill, move and remove.",
      hidden: section.hidden,
      hasPicture: section.picture !== null,
      pictureRef: section.picture?.ref,
      pictureAlt: section.picture?.alt,
    });

    for (const block of section.blocks) {
      blocks[block.id] = {
        id: block.id,
        section: section.id,
        kind: block.kind,
        placement: block.placement,
        pictureRef: block.picture?.ref,
        pictureAlt: block.picture?.alt,
      };
      for (const item of block.items) {
        items[item.id] = {
          id: item.id,
          block: block.id,
          kind: item.kind,
          text: item.text,
          href: item.href,
        };
      }
    }
  }

  return (
    <PageEditor
      page={key}
      label={entry.label}
      href={entry.href}
      previewSrc={`/admin/pages/${key}/preview`}
      pending={pending}
      slots={TEXT_SLOTS}
      pictureSlots={PICTURE_SLOTS}
      text={text}
      pictures={pictures}
      sections={sections}
      blocks={blocks}
      items={items}
      library={library}
    />
  );
}
