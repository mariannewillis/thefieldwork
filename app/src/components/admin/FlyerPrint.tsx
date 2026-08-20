import { notFound } from "next/navigation";
import FlyerSheet from "@/components/admin/FlyerSheet";
import { readFlyer, type FlyerKind } from "@/lib/flyers";
import { makeQr } from "@/lib/qr";

/**
 * THE SHEET ON ITS OWN, ready for the printer.
 *
 * ── WHY THIS IS A PAGE AND NOT A DOWNLOAD ────────────────────────────────
 *
 * "Download the flyer" would mean a PDF made on the server, and making one
 * means running a browser on the server: the flyer is HTML, with a webfont, a
 * photograph and a gradient, and the only thing that renders those faithfully
 * is the engine that already does. Shipping headless Chrome to production for
 * this — a few hundred megabytes, to produce a file her own browser is holding
 * the ingredients for — is out of proportion to the job.
 *
 * So the button opens this page and she presses Ctrl+P. Her browser's print box
 * has "Save as PDF" in it, and what comes out is a true A5 PDF with the type
 * still selectable and the fonts embedded — a better file than a screenshot,
 * made by the thing that already knows how to make it. It is honestly labelled
 * as that in the panel rather than as a download.
 *
 * IT NEEDS NO JAVASCRIPT. Nothing on this page is interactive and the print
 * dialog is not opened for her: a page that summons a modal on load is one she
 * cannot look at before deciding, and print dialogs cannot be closed by the
 * page that opened them.
 *
 * IT IS BEHIND THE SESSION, like everything else under /admin. A flyer is not
 * secret, but this route reads whatever is in the draft — including a workshop
 * she has not published — and an unpublished workshop is hers alone.
 */
export default async function FlyerPrint({
  kind,
  slug,
}: {
  kind: FlyerKind;
  slug: string;
}) {
  const flyer = await readFlyer(kind, slug);
  if (!flyer) notFound();

  const qr = await makeQr(flyer.url);

  return (
    <>
      {/* Hidden the moment it is printed — see `.flyer-print-only` in
          flyer.css. On screen it is the only instruction the page needs. */}
      <p className="flyer-print-only" style={NOTE}>
        Press <kbd>Ctrl</kbd>+<kbd>P</kbd> (or <kbd>⌘</kbd>+<kbd>P</kbd>) and
        choose <strong>Save as PDF</strong>, or print it straight away. It is
        set up for A5 &mdash; leave the margins at none and background graphics
        on.
      </p>

      <div className="flyer-frame" style={SHEET}>
        <FlyerSheet flyer={flyer} qr={qr} />
      </div>
    </>
  );
}

/**
 * INLINE STYLE, and deliberately so: this page loads `flyer.css` and NOTHING
 * else. It is outside the portal's layout — no rail, no masthead, no Tailwind —
 * because a print stylesheet that has to hide six other things is a print
 * stylesheet with six ways to leak one of them onto the paper.
 */
const NOTE: React.CSSProperties = {
  margin: "0 0 16px",
  padding: "12px 16px",
  background: "#fbf3f1",
  color: "#5a4356",
  font: "15px/1.5 system-ui, sans-serif",
  maxWidth: "148mm",
};

const SHEET: React.CSSProperties = {
  // The preview scaling is off here: this is the sheet at its real size.
  ["--flyer-scale" as string]: "1",
};
