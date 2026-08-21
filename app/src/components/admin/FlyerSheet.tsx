import type { CSSProperties } from "react";
import type { ResolvedFlyer } from "@/lib/flyers";
import type { Qr } from "@/lib/qr-shape";
import "./flyer.css";

/**
 * THE SHEET ITSELF — one composition, two layouts, drawn at 148×210mm.
 *
 * The same component the portal previews and the printer prints, which is the
 * point: a preview built separately from the thing it previews is a picture of
 * a flyer rather than the flyer, and it drifts the first time either is
 * touched.
 *
 * IT TAKES NO CALLBACKS AND HOLDS NO STATE. Everything on it is resolved before
 * it is called (`lib/flyers.ts`), so it can be rendered on the server, printed
 * from a route with no JavaScript at all, and screenshotted by a test without a
 * session. The editing happens in a panel BESIDE it, never on it — a flyer is
 * a piece of paper and there is nothing on it to click.
 *
 * The design, and the reasoning for it, is in `docs/screens/flyers/`. This is
 * that design parameterised; the mockups remain the record of what was agreed.
 */
export default function FlyerSheet({
  flyer,
  qr,
}: {
  flyer: ResolvedFlyer;
  /** Made server-side. Null if the address would not encode at all. */
  qr: Qr | null;
}) {
  /**
   * THE COUNT DECIDES THE SHAPE (operator, 2026-08-21).
   *
   * One band, an asymmetric pair, a pair with a third beneath, three across,
   * four across — the arrangement changes with the number rather than the same
   * tile repeating, because pictures at the SAME size with no focal point is
   * the documented failure of event-poster layout. The rules are in
   * `flyer.css`; this only says which one applies.
   */
  const pictures = flyer.pictures;
  const shape =
    pictures.length === 0
      ? "none"
      : pictures.length <= 3
        ? String(pictures.length)
        : pictures.length <= 6
          ? "few"
          : "many";

  // What the type and the wash key off: whether there ARE pictures, and how
  // much room they are taking from everything else.
  const room =
    pictures.length === 0
      ? "none"
      : shape === "1" || shape === "2" || shape === "3"
        ? "pictures"
        : shape;

  return (
    <div
      className={`flyer flyer--${room}${pictures.length > 0 ? " flyer--pictures" : ""}`}
    >
      {flyer.ground && flyer.showGround ? (
        // The six derivatives the media pipeline emits, AVIF first — the same
        // choice every photograph on the site gets. A bare 2400 JPEG stretched
        // over a page is what made the detail pages look low quality (D-6).
        <picture>
          <source
            type="image/avif"
            srcSet={`/media/${flyer.ground}-1200.avif 1200w, /media/${flyer.ground}-2400.avif 2400w`}
            sizes="148mm"
          />
          <source
            type="image/webp"
            srcSet={`/media/${flyer.ground}-1200.webp 1200w, /media/${flyer.ground}-2400.webp 2400w`}
            sizes="148mm"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="flyer__plate"
            src={`/media/${flyer.ground}-2400.jpg`}
            alt=""
            style={{ "--focus": `${flyer.groundFocus}%` } as CSSProperties}
          />
        </picture>
      ) : (
        <div className="flyer__plate flyer__plate--none" />
      )}
      <div className="flyer__wash" />

      <div className="flyer__body">
        {/* The mark is a file on disk rather than a component, because this
            sheet has to draw in a print engine with no JavaScript. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="flyer__mark"
          src="/brand/logo-horizontal.svg"
          alt="The Field Work"
        />

        <div className="flyer__top">
          {flyer.eyebrow && <p className="flyer__eyebrow">{flyer.eyebrow}</p>}
          <h1 className="flyer__name">{flyer.headline}</h1>
          {flyer.blurb && <p className="flyer__blurb">{flyer.blurb}</p>}
        </div>

        {pictures.length > 0 && (
          <div className={`flyer__strip flyer__strip--${shape}`}>
            {pictures.map((ref) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={ref} src={`/media/${ref}-1200.jpg`} alt="" />
            ))}
          </div>
        )}

        <div className="flyer__when">
          <p className="flyer__day">{flyer.when}</p>
          {flyer.hours && <p className="flyer__hours">{flyer.hours}</p>}
        </div>

        <div className="flyer__clearing">
          <dl className="flyer__facts">
            {flyer.venue && (
              <div className="flyer__fact">
                <dt>Where</dt>
                <dd>
                  {flyer.venue}
                  {flyer.address && (
                    <span className="flyer__quiet">{flyer.address}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="flyer__fact">
              <dt>The room</dt>
              <dd>
                {flyer.room}
                {flyer.roomNote && (
                  <span className="flyer__quiet">{flyer.roomNote}</span>
                )}
              </dd>
            </div>
            <div className="flyer__fact">
              <dt>Price</dt>
              <dd className="flyer__price">{flyer.price}</dd>
            </div>
          </dl>

          <div className="flyer__way">
            <p className="flyer__book">Book</p>
            {qr && (
              <svg
                className="flyer__qr"
                // THE ENCODER'S OWN GRID, not a fixed one — a longer address
                // needs a bigger version, and pinning the viewBox drew it at
                // the wrong scale. See `lib/qr.ts`.
                viewBox={`0 0 ${qr.modules} ${qr.modules}`}
                preserveAspectRatio="xMidYMid meet"
                shapeRendering="crispEdges"
                role="img"
                aria-label={`Opens ${flyer.url}`}
                // Server-generated `<path>` markup: our own string, built from
                // our own url by the `qrcode` library. Nothing here comes from
                // a form or from anything a person typed.
                dangerouslySetInnerHTML={{
                  __html: `<rect width="${qr.modules}" height="${qr.modules}" />${qr.paths}`,
                }}
              />
            )}
            <p className="flyer__address">{printableUrl(flyer.url)}</p>
          </div>
        </div>

        {flyer.footnote && <p className="flyer__foot">{flyer.footnote}</p>}
      </div>
    </div>
  );
}

/**
 * The address, broken where SHE would break it.
 *
 * `word-break: break-word` splits wherever the box runs out, and a wrapped
 * `lorem-` / `ipsum` reads as two words and gets typed as two. Breaking at the
 * slashes puts the fold where a person already reads one.
 */
function printableUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, "");
  const cut = bare.indexOf("/");
  if (cut === -1) return bare;
  return `${bare.slice(0, cut)}\n${bare.slice(cut).replace(/\/(?=[^/]*$)/, "\n/")}`;
}
