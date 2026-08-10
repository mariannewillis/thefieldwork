import type { CSSProperties } from "react";
import { home, type Plate as PlateT } from "@/content/home";
import "./home.css";

/**
 * The home page — seven fixed beats in a fixed ascending order, with a
 * data-driven products block between beats 6 and 7.
 *
 * Ported from docs/screens/webapp/home.html, the gate-4 approved composition.
 * The CSS is that file's stylesheet verbatim (home.css); what changed here is
 * that every string and image now comes from @/content/home rather than being
 * inlined, so the portal can edit them in place (DECISIONS-BUILD.md D-2, D-3).
 *
 * Every `data-slot` marks a value the portal will make editable. They cost
 * nothing now and save a second pass over every beat later.
 */

/** Picture element over the optimised derivatives the media pipeline emits. */
function Plate({
  plate,
  className = "plate",
}: {
  plate: PlateT;
  className?: string;
}) {
  const style = {
    "--b": plate.b,
    "--ox": plate.ox,
    "--oy": plate.oy,
  } as CSSProperties;
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`/media/${plate.src}-1200.avif 1200w, /media/${plate.src}-2400.avif 2400w`}
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet={`/media/${plate.src}-1200.webp 1200w, /media/${plate.src}-2400.webp 2400w`}
        sizes="100vw"
      />
      <img
        className={className}
        src={`/media/${plate.src}-2400.jpg`}
        alt={plate.alt}
        style={style}
        // the hero is the LCP element; everything below it can wait
        loading={className === "plate" ? undefined : "lazy"}
      />
    </picture>
  );
}

export default function HomePage() {
  const { root, sacral, method, throat, schedule, turn, crown, nav } = home;

  return (
    <>
      {/* ══ 1 · ROOT — the clearing at the size of one seated person · LEFT ══ */}
      <section className="beat hero anchor-left" id={root.id}>
        <Plate plate={root.plate} />

        <header className="masthead">
          <a href="/" aria-label="The Field Work — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="masthead__logo"
              src="/logo-horizontal.svg"
              alt="The Field Work"
            />
          </a>
          <nav className="nav" aria-label="Main">
            {nav.map((n) => (
              <a
                key={n.href}
                className={"current" in n && n.current ? "nav--now" : undefined}
                href={n.href}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="pool hero__pool ink">
          <p className="eyebrow" data-slot="root.eyebrow">
            {root.eyebrowLead} &middot;{" "}
            <span style={{ whiteSpace: "nowrap" }}>{root.eyebrowMid}</span>{" "}
            &middot; {root.eyebrowEnd}
          </p>
          <h1 className="disp hero__lines" data-slot="root.lines">
            {root.lines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </h1>
          <p className="note" data-slot="root.note">
            {root.note}
          </p>
          <a className="link" href={root.linkHref} data-slot="root.link">
            {root.linkLabel}
          </a>
        </div>
      </section>

      {/* ══ 2 · SACRAL — RIGHT pool, the hour's words spoken from the room ══ */}
      <section className="beat sacral anchor-right" id={sacral.id}>
        <Plate plate={sacral.plate} />
        <div className="onplate onplate-primary sacral__onplate">
          <p className="eyebrow" data-slot="sacral.eyebrow">
            {sacral.eyebrow}
          </p>
          <p className="disp lead" data-slot="sacral.lead">
            {sacral.lead}
          </p>
          <p className="obody" data-slot="sacral.onPlateBody">
            {sacral.onPlateBody}
          </p>
        </div>
        <div className="pool sacral__pool ink">
          <p className="disp" data-slot="sacral.poolBody">
            {sacral.poolBody}
          </p>
          <p className="note" style={{ marginTop: 16 }} data-slot="sacral.note">
            {sacral.note}
          </p>
          <a className="link" href={sacral.linkHref} data-slot="sacral.link">
            {sacral.linkLabel}
          </a>
        </div>
      </section>

      {/* ══ 3 · SOLAR PLEXUS — LEFT, type is the entire content of the light ══ */}
      <section className="beat method anchor-left" id={method.id}>
        <Plate plate={method.plate} />
        <div className="pool method__pool ink">
          <p className="disp" style={{ margin: 0 }} data-slot="method.verbs">
            {method.verbs.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </p>
        </div>
      </section>

      {/* ══ 5 · THROAT — a short line stays outside the light; the compliance
           paragraph and the practitioner both sit INSIDE the clearing ══ */}
      <section className="beat throat anchor-left" id={throat.id}>
        <Plate plate={throat.plate} />
        <div className="throat__intro onplate">
          <p className="eyebrow" data-slot="throat.eyebrow">
            {throat.eyebrow}
          </p>
          <p className="disp" data-slot="throat.negations">
            {throat.negations.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </p>
        </div>
        <div className="pool heart__pool ink">
          {/* the sole sanctioned curve in the system — a true-circle avatar */}
          {/* the sole sanctioned curve. Rendered at 200px, so the 1200
              derivative is already 6x more than needed — but it is the
              smallest the pipeline emits, and AVIF keeps it under 50KB. */}
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${throat.portrait.src}-1200.avif`}
            />
            <source
              type="image/webp"
              srcSet={`/media/${throat.portrait.src}-1200.webp`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="heart__avatar"
              src={`/media/${throat.portrait.src}-1200.jpg`}
              alt={throat.portrait.alt}
              loading="lazy"
            />
          </picture>
          <p className="eyebrow" data-slot="throat.portraitEyebrow">
            {throat.portraitEyebrow}
          </p>
          <p className="disp heart__lead" data-slot="throat.portraitLead">
            {throat.portraitLead}
          </p>
          <p className="body" data-slot="throat.portraitBody">
            {throat.portraitBody}
          </p>
          <p className="heart__cred" data-slot="throat.credential">
            {throat.credential}
          </p>
        </div>
      </section>

      {/* ══ PRODUCTS — a hairline ledger: date · title · place · price.
           DERIVED from offerings once that module lands, not authored. ══ */}
      <section className="beat schedule" id={schedule.id}>
        <Plate plate={schedule.plate} />
        <div className="schedule__head onplate">
          <p className="eyebrow" data-slot="schedule.eyebrow">
            {schedule.eyebrow}
          </p>
          <p className="disp schedule__lead" data-slot="schedule.lead">
            {schedule.lead}
          </p>
          <p className="schedule__intro" data-slot="schedule.intro">
            {schedule.intro}
          </p>
        </div>
        <div className="schedule__cols">
          {schedule.groups.map((group) => (
            <div className="pool ink schedule-col" key={group.label}>
              <p className="disp schedule-group__label">{group.label}</p>
              <div className="ledger">
                {group.rows.map((row) => (
                  <a className="ledger-row" href={row.href} key={row.href}>
                    <p className="ledger-row__top">
                      <span className="small ledger-row__date">
                        <span className="num">{row.date}</span>
                      </span>
                      <span className="ledger-row__price">
                        <span className="disp amt num">{row.price}</span>
                      </span>
                    </p>
                    <p className="disp ledger-row__title">{row.title}</p>
                    <p className="small ledger-row__meta">{row.meta}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ THE TURN — the transformation, named at the level of a person ══ */}
      <section className="beat turn anchor-right">
        <Plate plate={turn.plate} />
        <div className="turn__col onplate">
          <p className="eyebrow" data-slot="turn.eyebrow">
            {turn.eyebrow}
          </p>
          <p className="body body--dark" data-slot="turn.body">
            {turn.body}
          </p>
        </div>
        <div className="pool turn__pool ink">
          <p className="disp turn__close" data-slot="turn.close">
            {turn.close}
          </p>
        </div>
      </section>

      {/* ══ 8 · CROWN — the swing rests, centred; the footer dissolves into
           the same plate so the page ends on the photograph ══ */}
      <section className="crown beat" id={crown.id}>
        <div className="crown__pool">
          <h2 className="disp crown__ask" data-slot="crown.ask">
            {crown.ask}
          </h2>
          <a className="cta" href={crown.ctaHref} data-slot="crown.cta">
            {crown.ctaLabel}
          </a>
        </div>

        <footer className="crown__foot">
          <picture>
            <source
              type="image/avif"
              srcSet={`/media/${crown.footPlate.src}-1200.avif 1200w, /media/${crown.footPlate.src}-2400.avif 2400w`}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcSet={`/media/${crown.footPlate.src}-1200.webp 1200w, /media/${crown.footPlate.src}-2400.webp 2400w`}
              sizes="100vw"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="crown__foot-plate"
              src={`/media/${crown.footPlate.src}-2400.jpg`}
              alt={crown.footPlate.alt}
              loading="lazy"
            />
          </picture>
          <a
            className="crown__foot__brand"
            href="/"
            aria-label="The Field Work — home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-primary.svg" alt="The Field Work" />
          </a>
          <div>
            <div className="crown__foot__cols">
              {crown.footCols.map((col) => (
                <div key={col.heading}>
                  <h3>{col.heading}</h3>
                  <ul>
                    {col.links.map((l) => (
                      <li key={l.href + l.label}>
                        <a href={l.href}>{l.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="crown__foot__legal" data-slot="crown.legal">
              {crown.legal}
            </p>
          </div>
        </footer>
      </section>
    </>
  );
}
