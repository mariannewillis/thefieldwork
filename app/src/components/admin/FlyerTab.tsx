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
  const flyer = await readFlyer(kind, slug);
  if (!flyer) return null;

  /**
   * THIS OFFERING'S OWN PICTURES, and the whole library only when it has none.
   *
   * A course with twelve photographs had her choosing the flyer's three from
   * the site's thirty (operator, 2026-08-21). A flyer for a course is made of
   * that course's pictures; one she wants that is not on it yet belongs on the
   * course first, where it also does the page some good.
   *
   * The fallback exists because a picker with nothing in it is a dead end: a
   * brand-new offering with no pictures should still be able to put one on its
   * flyer while she decides what goes on the page.
   */
  const library =
    flyer.gallery.length > 0 ? flyer.gallery : await listMediaBasenames();

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
            pictures: flyer.ownPictures,
          }}
          library={library}
          ownCount={flyer.gallery.length}
          printHref={`/admin/offerings/${kind}s/${slug}/flyer`}
          qrModuleMm={qr?.moduleMm ?? null}
        />
      </div>
    </div>
  );
}
