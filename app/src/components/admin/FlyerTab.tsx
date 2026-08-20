import FlyerEditor from "@/components/admin/FlyerEditor";
import FlyerSheet from "@/components/admin/FlyerSheet";
import { readFlyer, type FlyerKind } from "@/lib/flyers";
import { listMediaBasenames } from "@/lib/media";
import { makeQr } from "@/lib/qr";

/**
 * THE FLYER TAB — the sheet, and the panel that changes it.
 *
 * ONE COMPONENT FOR ALL THREE KINDS, because a flyer for a course differs from
 * one for a workshop in exactly one line — when it is — and that difference is
 * already resolved by `lib/flyers.ts` before anything here runs. Three copies
 * of this file would be three places for the layout to drift.
 *
 * THE SHEET IS DRAWN AT FULL SIZE AND SCALED, never laid out smaller. A sheet
 * composed at 62% of A5 is a different sheet: the type reflows and the line
 * breaks move, which is exactly what a preview must not do. What she is looking
 * at is what comes out of the printer.
 */
export default async function FlyerTab({
  kind,
  slug,
}: {
  kind: FlyerKind;
  slug: string;
}) {
  const [flyer, library] = await Promise.all([
    readFlyer(kind, slug),
    listMediaBasenames(),
  ]);

  if (!flyer) return null;

  const qr = await makeQr(flyer.url);

  return (
    <div className="mt-8 flex flex-wrap items-start gap-x-10 gap-y-8">
      {/* STICKY, because the panel beside it is four screens long and every
          control on it changes this. A preview that scrolls away is a preview
          she has to scroll back to after every press. */}
      <div className="flyer-frame sticky top-6 shrink-0">
        <FlyerSheet flyer={flyer} qr={qr} />
      </div>

      <div className="min-w-[20rem] flex-1">
        <FlyerEditor
          flyer={flyer}
          own={{
            eyebrow: flyer.ownEyebrow,
            headline: flyer.ownHeadline,
            blurb: flyer.ownBlurb,
            footnote: flyer.ownFootnote,
            groundRef: flyer.ownGround ?? "",
            detailRef: flyer.ownDetail ?? "",
            placeRef: flyer.ownPlace ?? "",
          }}
          library={library}
          printHref={`/admin/offerings/${kind}s/${slug}/flyer`}
          qrModuleMm={qr?.moduleMm ?? null}
        />
      </div>
    </div>
  );
}
