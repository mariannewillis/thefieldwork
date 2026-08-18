import { notFound } from "next/navigation";
import PreviewBridge from "@/components/admin/PreviewBridge";
import HomeBody from "@/components/site/HomeBody";
import { home } from "@/content/home";
import { sitePage } from "@/content/pages";
import { homeLedger } from "@/lib/pages/home-ledger";
import { readPage } from "@/lib/pages/read";
import { TEXT_SLOTS } from "@/lib/pages/slots";
import { ensureDraft } from "@/lib/pages/write";
import "../../../../../(site)/home.css";
import "../../../../../(site)/sections.css";
import "./editing.css";

/**
 * The page as she is editing it — the DRAFT, in the site's own world.
 *
 * The same `HomeBody` the public page renders, given `editing`, which draws
 * hidden sections greyed instead of dropping them and stamps every selectable
 * part with what the toolbox needs to name it. Nothing about the layout, the
 * type or the colour is conditional on it: what she is looking at is the page.
 *
 * `editing.css` adds the only things that are not the page — the outline on
 * what is selected, and the treatment on a section that is hidden.
 */

export const dynamic = "force-dynamic";

export default async function PagePreview({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const entry = sitePage(key);
  if (!entry?.editable) notFound();

  // Also here, and not only in the editor beside it: this frame can be opened
  // on its own, and a section with no id is a section nothing can select.
  await ensureDraft(key);

  const [page, rowsByLabel] = await Promise.all([
    readPage(key, "draft"),
    homeLedger(),
  ]);

  return (
    <>
      {/* HOW EACH SLOT'S WORDS ARE SHAPED, so the frame knows whether Enter
          means a new line or means done, and how to read a value back off the
          page. Sent as data rather than looked up in the frame, because the
          catalogue is the server's and a second copy would drift. */}
      <PreviewBridge
        shapes={Object.fromEntries(
          TEXT_SLOTS.map((slot) => [slot.key, slot.shape]),
        )}
      />
      <HomeBody
        page={page}
        rowsByLabel={rowsByLabel}
        groups={home.schedule.groups}
        editing
      />
    </>
  );
}
