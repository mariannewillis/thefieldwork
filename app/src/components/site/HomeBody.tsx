import type { CSSProperties, ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import SubscribeForm from "@/components/site/SubscribeForm";
import type { LedgerRow } from "@/content/home";
import { BEATS } from "@/lib/pages/slots";
import {
  linesOf,
  linkOf,
  pictureOf,
  sizeOf,
  type Picture,
  type ResolvedBeat,
  type ResolvedBlock,
  type ResolvedFree,
  type ResolvedPage,
  textOf,
} from "@/lib/pages/read";

/**
 * THE HOME PAGE ITSELF — the one component the public site and the editor both
 * render.
 *
 * That is the whole point of it existing. D-2 asked for "the real home page
 * rendered in an editing mode", and the only way to be sure the thing she is
 * editing looks like the thing a visitor gets is for there to be ONE of it. The
 * editor passes `editing`, which does two things and nothing else: it draws
 * hidden sections greyed instead of dropping them, and it stamps every
 * selectable part with the attributes the toolbox reads. No layout, no type and
 * no colour is conditional on it.
 *
 * Ported from `app/(site)/page.tsx`, which is now the thin caller that reads
 * the LIVE copy and the ledger rows and hands them here.
 */

export type HomeBodyProps = {
  page: ResolvedPage;
  /** The schedule beat's three columns. Derived from Offerings, never authored. */
  rowsByLabel: Record<string, readonly LedgerRow[]>;
  /** The frame around those columns — label, index link, and what an empty month says. */
  groups: readonly {
    label: string;
    href: string;
    empty: string;
    emptyLink: string;
  }[];
  editing?: boolean;
};

/** Picture element over the optimised derivatives the media pipeline emits. */
function Plate({
  picture,
  className = "plate",
  slot,
}: {
  picture: Picture;
  className?: string;
  /** The dotted path the editor selects this photograph by. */
  slot?: string;
}) {
  const style = {
    "--b": picture.brightness ?? undefined,
    "--ox": picture.focalX ?? undefined,
    "--oy": picture.focalY ?? undefined,
  } as CSSProperties;
  return (
    <picture data-slot={slot}>
      <source
        type="image/avif"
        srcSet={`/media/${picture.ref}-1200.avif 1200w, /media/${picture.ref}-2400.avif 2400w`}
        sizes="100vw"
      />
      <source
        type="image/webp"
        srcSet={`/media/${picture.ref}-1200.webp 1200w, /media/${picture.ref}-2400.webp 2400w`}
        sizes="100vw"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={className}
        src={`/media/${picture.ref}-2400.jpg`}
        alt={picture.alt}
        style={style}
        loading={className === "plate" ? undefined : "lazy"}
      />
    </picture>
  );
}

/**
 * What the editor needs on a selectable thing, and what the public page must
 * not carry.
 *
 * `data-slot` was already on every editable value before any of this existed;
 * these are the same idea for the parts that are rows rather than slots.
 *
 * EVERY NAME HERE IS HYPHENATED, and it is not a style choice. A data attribute
 * written `data-sectionKind` is lowercased by the browser to
 * `data-sectionkind`, which `dataset.sectionKind` then does not find — the
 * frame read "beat" for every section, including the ones she had made, and
 * React logged the mistake in the console while the page went on looking right.
 * `data-section-kind` is what `dataset.sectionKind` actually maps to.
 */
function marks(editing: boolean, attrs: Record<string, string | number>) {
  if (!editing) return {};
  return Object.fromEntries(
    Object.entries(attrs).map(([key, value]) => [`data-${key}`, String(value)]),
  );
}

/**
 * What goes on one of the seven beats' editable text elements.
 *
 * `data-slot` is what the editor selects it by and has been on every one of
 * them since the page was ported. `data-size` is the step she has moved it to,
 * and it is DROPPED AT ZERO rather than written as "0" — the default is the
 * composition, and an attribute on every paragraph saying "unchanged" is noise
 * in the markup and one more thing that has to be right.
 */
function slotProps(beat: ResolvedBeat, key: string) {
  const step = sizeOf(beat, key);
  return step === 0
    ? { "data-slot": key }
    : { "data-slot": key, "data-size": String(step) };
}

// ── the seven ────────────────────────────────────────────────────────────────

function Root({
  beat,
  editing,
  head,
}: {
  beat: ResolvedBeat;
  editing: boolean;
  head: ReactNode;
}) {
  const eyebrow = linesOf(beat, "root.eyebrow");
  const link = linkOf(beat, "root.link");
  return (
    <>
      <Plate picture={pictureOf(beat, "root.plate")} slot="root.plate" />
      {head}
      <div className="pool hero__pool ink">
        <p className="eyebrow" {...slotProps(beat, "root.eyebrow")}>
          {eyebrow.map((part, index) => (
            <span key={part}>
              {index > 0 && <> &middot; </>}
              <span style={index === 1 ? { whiteSpace: "nowrap" } : undefined}>
                {part}
              </span>
            </span>
          ))}
        </p>
        <h1 className="disp hero__lines" {...slotProps(beat, "root.lines")}>
          {linesOf(beat, "root.lines").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className="note" {...slotProps(beat, "root.note")}>
          {textOf(beat, "root.note")}
        </p>
        <a className="link" href={link.href} {...slotProps(beat, "root.link")}>
          {link.label}
        </a>
      </div>
    </>
  );
}

function Sacral({ beat }: { beat: ResolvedBeat }) {
  const link = linkOf(beat, "sacral.link");
  return (
    <>
      <Plate picture={pictureOf(beat, "sacral.plate")} slot="sacral.plate" />
      <div className="onplate onplate-primary sacral__onplate">
        <p className="eyebrow" {...slotProps(beat, "sacral.eyebrow")}>
          {textOf(beat, "sacral.eyebrow")}
        </p>
        <p className="disp lead" {...slotProps(beat, "sacral.lead")}>
          {textOf(beat, "sacral.lead")}
        </p>
        <p className="obody" {...slotProps(beat, "sacral.onPlateBody")}>
          {textOf(beat, "sacral.onPlateBody")}
        </p>
      </div>
      <div className="pool sacral__pool ink">
        <p className="disp" {...slotProps(beat, "sacral.poolBody")}>
          {textOf(beat, "sacral.poolBody")}
        </p>
        <p
          className="note"
          style={{ marginTop: 16 }}
          {...slotProps(beat, "sacral.note")}
        >
          {textOf(beat, "sacral.note")}
        </p>
        <a
          className="link"
          href={link.href}
          {...slotProps(beat, "sacral.link")}
        >
          {link.label}
        </a>
      </div>
    </>
  );
}

function Method({ beat }: { beat: ResolvedBeat }) {
  return (
    <>
      <Plate picture={pictureOf(beat, "method.plate")} slot="method.plate" />
      <div className="pool method__pool ink">
        <p
          className="disp"
          style={{ margin: 0 }}
          {...slotProps(beat, "method.verbs")}
        >
          {linesOf(beat, "method.verbs").map((verb) => (
            <span key={verb}>{verb}</span>
          ))}
        </p>
      </div>
    </>
  );
}

function Throat({ beat }: { beat: ResolvedBeat }) {
  const portrait = pictureOf(beat, "throat.portrait");
  return (
    <>
      <Plate picture={pictureOf(beat, "throat.plate")} slot="throat.plate" />
      <div className="throat__intro onplate">
        <p className="eyebrow" {...slotProps(beat, "throat.eyebrow")}>
          {textOf(beat, "throat.eyebrow")}
        </p>
        <p className="disp" {...slotProps(beat, "throat.negations")}>
          {linesOf(beat, "throat.negations").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>
      <div className="pool heart__pool ink">
        {/* the sole sanctioned curve in the system — a true-circle avatar,
            rendered at 200px, so the 1200 derivative is already 6x more than
            needed; it is the smallest the pipeline emits and AVIF keeps it
            under 50KB. */}
        <picture data-slot="throat.portrait">
          <source
            type="image/avif"
            srcSet={`/media/${portrait.ref}-1200.avif`}
          />
          <source
            type="image/webp"
            srcSet={`/media/${portrait.ref}-1200.webp`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="heart__avatar"
            src={`/media/${portrait.ref}-1200.jpg`}
            alt={portrait.alt}
            loading="lazy"
          />
        </picture>
        <p className="eyebrow" {...slotProps(beat, "throat.portraitEyebrow")}>
          {textOf(beat, "throat.portraitEyebrow")}
        </p>
        <p
          className="disp heart__lead"
          {...slotProps(beat, "throat.portraitLead")}
        >
          {textOf(beat, "throat.portraitLead")}
        </p>
        <p className="body" {...slotProps(beat, "throat.portraitBody")}>
          {textOf(beat, "throat.portraitBody")}
        </p>
        <p className="heart__cred" {...slotProps(beat, "throat.credential")}>
          {textOf(beat, "throat.credential")}
        </p>
      </div>
    </>
  );
}

function Schedule({
  beat,
  rowsByLabel,
  groups,
}: {
  beat: ResolvedBeat;
  rowsByLabel: Record<string, readonly LedgerRow[]>;
  groups: HomeBodyProps["groups"];
}) {
  return (
    <>
      <Plate
        picture={pictureOf(beat, "schedule.plate")}
        slot="schedule.plate"
      />
      <div className="schedule__head onplate">
        <p className="eyebrow" {...slotProps(beat, "schedule.eyebrow")}>
          {textOf(beat, "schedule.eyebrow")}
        </p>
        <p
          className="disp schedule__lead"
          {...slotProps(beat, "schedule.lead")}
        >
          {textOf(beat, "schedule.lead")}
        </p>
        <p className="schedule__intro" {...slotProps(beat, "schedule.intro")}>
          {textOf(beat, "schedule.intro")}
        </p>
      </div>
      {/* DERIVED, and marked as such for the editor: every row here comes from
          Offerings, so there is nothing in this block to click and type over.
          The editor draws it plainly and says where the rows are edited. */}
      <div className="schedule__cols" data-derived="offerings">
        {groups.map((group) => {
          const rows = rowsByLabel[group.label] ?? [];
          return (
            <div className="pool ink schedule-col" key={group.label}>
              <p className="disp schedule-group__label">{group.label}</p>
              <div className="ledger">
                {rows.length === 0 ? (
                  <>
                    <p className="small ledger-row__meta">{group.empty}</p>
                    <p className="small ledger-row__meta">
                      <a href={group.href}>{group.emptyLink}</a>
                    </p>
                  </>
                ) : (
                  rows.map((row) => (
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
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Turn({ beat }: { beat: ResolvedBeat }) {
  return (
    <>
      <Plate picture={pictureOf(beat, "turn.plate")} slot="turn.plate" />
      <div className="turn__col onplate">
        <p className="eyebrow" {...slotProps(beat, "turn.eyebrow")}>
          {textOf(beat, "turn.eyebrow")}
        </p>
        <p className="body body--dark" {...slotProps(beat, "turn.body")}>
          {textOf(beat, "turn.body")}
        </p>
      </div>
      <div className="pool turn__pool ink">
        <p className="disp turn__close" {...slotProps(beat, "turn.close")}>
          {textOf(beat, "turn.close")}
        </p>
      </div>
    </>
  );
}

function Crown({ beat }: { beat: ResolvedBeat }) {
  return (
    <div className="crown__pool">
      <h2 className="disp crown__ask" {...slotProps(beat, "crown.ask")}>
        {textOf(beat, "crown.ask")}
      </h2>
      <div {...slotProps(beat, "crown.lines")}>
        {linesOf(beat, "crown.lines").map((line) => (
          <p className="body crown__line" key={line}>
            {line}
          </p>
        ))}
      </div>
      {/* No line under the button: the two paragraphs above it already say
          that nothing is sold twice, nothing is passed on, and every letter
          carries a way off the list. */}
      <SubscribeForm note={null} />
    </div>
  );
}

/**
 * The class and the id each of the seven is drawn with.
 *
 * The anchor is part of it, and it is FIXED PER BEAT rather than derived from
 * where the beat has ended up. The alternating rhythm is a property of the
 * compositions themselves — the sacral beat's words sit on the left BECAUSE its
 * clearing is on the right, bounded against it in CSS — so a beat carries its
 * side with it when she moves it.
 */
const BEAT_FRAME: Record<string, { className: string; id?: string }> = {
  root: { className: "beat hero anchor-left", id: "what-happens" },
  sacral: { className: "beat sacral anchor-right", id: "the-hour" },
  method: { className: "beat method anchor-left", id: "method" },
  throat: { className: "beat throat anchor-left", id: "not" },
  schedule: { className: "beat schedule", id: "dates" },
  turn: { className: "beat turn anchor-right" },
  crown: { className: "crown beat", id: "letter" },
};

// ── one she made ─────────────────────────────────────────────────────────────

/**
 * One line inside a box.
 *
 * AN EMPTY ONE IS A PLACEHOLDER WHILE SHE IS EDITING AND NOTHING AT ALL ON THE
 * SITE. A line she has added and not yet written has no words, so it has no
 * height — which made it invisible AND unclickable in the editor, so the only
 * way to fill it in was the one thing she could not do. It gets a target here
 * instead. On the public page the same line renders nothing rather than an
 * empty paragraph: a gap in a composition reads as a mistake, and no
 * placeholder text can ever reach a visitor because none of it exists outside
 * editing mode.
 */
function Item({
  item,
  editing,
}: {
  item: ResolvedBlock["items"][number];
  editing: boolean;
}) {
  if (!item.text.trim()) {
    if (!editing) return null;
    return (
      <p className="body edit__empty" data-placeholder="true">
        {item.kind === "bullets"
          ? "Write the lines here"
          : item.kind === "link" || item.kind === "button"
            ? "Write what it says here"
            : "Write here"}
      </p>
    );
  }

  switch (item.kind) {
    case "eyebrow":
      return <p className="eyebrow">{item.text}</p>;
    case "heading":
      return <p className="disp free__heading">{item.text}</p>;
    case "paragraph":
      return <p className="body">{item.text}</p>;
    case "bullets":
      return (
        <p className="disp free__lines">
          {item.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      );
    case "link":
      return (
        <a className="link" href={item.href ?? "/"}>
          {item.text}
        </a>
      );
    case "button":
      return (
        <a className="free__button" href={item.href ?? "/"}>
          {item.text}
        </a>
      );
  }
}

function FreeSection({
  section,
  editing,
  head,
}: {
  section: ResolvedFree;
  editing: boolean;
  head: ReactNode;
}) {
  const cells: Record<"left" | "centre" | "right", ResolvedBlock[]> = {
    left: [],
    centre: [],
    right: [],
  };
  for (const block of section.blocks) cells[block.placement].push(block);

  return (
    <>
      {section.picture && (
        <Plate
          picture={{
            ref: section.picture.ref,
            alt: section.picture.alt,
            brightness: null,
            focalX: null,
            focalY: null,
          }}
        />
      )}
      {head}
      <div className="free__grid">
        {(["left", "centre", "right"] as const).map((placement) =>
          cells[placement].length === 0 ? null : (
            <div
              className={`free__cell free__cell--${placement}`}
              key={placement}
            >
              {cells[placement].map((block) => (
                <div
                  key={block.id}
                  className="free__block"
                  {...marks(editing, { block: block.id, kind: block.kind })}
                >
                  {/* The same problem the sections had, one level down: once a
                      box has a line in it, a click anywhere on the box lands on
                      the line, and there is no way back to the box to add a
                      second one. The tab is the way back. */}
                  {editing && (
                    <button
                      type="button"
                      className="edit__handle edit__handle--block"
                      data-handle="block"
                    >
                      {block.kind === "pool"
                        ? "Box of words"
                        : block.kind === "onplate"
                          ? "Words on the picture"
                          : "Picture"}
                    </button>
                  )}
                  {block.kind === "picture" ? (
                    block.picture ? (
                      <Plate
                        picture={{
                          ref: block.picture.ref,
                          alt: block.picture.alt,
                          brightness: null,
                          focalX: null,
                          focalY: null,
                        }}
                        className="free__picture"
                      />
                    ) : editing ? (
                      // Same reason as an empty line: a picture with nothing in
                      // it has no height, and a thing she cannot click is a
                      // thing she cannot fill in.
                      <p className="body edit__empty" data-placeholder="true">
                        Choose a picture
                      </p>
                    ) : null
                  ) : (
                    <div
                      className={
                        block.kind === "pool"
                          ? "pool ink"
                          : "free__plain onplate"
                      }
                    >
                      {block.items.map((item) => (
                        <div
                          key={item.id}
                          data-size={item.size === 0 ? undefined : item.size}
                          {...marks(editing, {
                            item: item.id,
                            kind: item.kind,
                          })}
                        >
                          <Item item={item} editing={editing} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ),
        )}
      </div>
    </>
  );
}

/**
 * HOW A WHOLE SECTION IS SELECTED — a tab, drawn only while editing.
 *
 * Not a nicety and not decoration. Every beat's photograph is absolutely
 * positioned across the whole band, so there is no bare section left to click:
 * a click anywhere on one lands on the plate or on the words in front of it,
 * both of which are things of their own. Without this, hiding or moving a
 * section would be an action with no way to reach it.
 *
 * It also says WHICH section she is looking at, which the page itself does not
 * — the beats have names in the build ("throat", "crown") that mean nothing to
 * her, so the tab carries the name the toolbox uses for the same thing.
 */
function SectionHandle({ label, hidden }: { label: string; hidden: boolean }) {
  return (
    <button type="button" className="edit__handle" data-handle="true">
      {label}
      {hidden && <span className="edit__handle-off">not on the site</span>}
    </button>
  );
}

const BEAT_LABEL = new Map(
  BEATS.map((beat) => [beat.key as string, beat.label]),
);

// ── the page ─────────────────────────────────────────────────────────────────

export default function HomeBody({
  page,
  rowsByLabel,
  groups,
  editing = false,
}: HomeBodyProps) {
  // Hidden sections are OFF the public page and greyed in the editor. She can
  // still see and select one there, which is the difference between hiding
  // something and losing it.
  const drawn = editing
    ? page.sections
    : page.sections.filter((section) => !section.hidden);

  // THE MASTHEAD FLOATS OVER WHATEVER IS FIRST. It used to be nested in the
  // opening beat, which was safe while the opening was structurally first and
  // is not any more — she can move a section of her own above it, or hide it.
  // `.hero__head` is absolutely positioned inside a `.beat`, so it needs no
  // more than being handed to a different one.
  const first = drawn.find((section) => !section.hidden) ?? drawn[0];

  return (
    <>
      {drawn.map((section) => {
        const head =
          section === first ? (
            <div className="hero__head">
              <SiteNav />
            </div>
          ) : null;

        const frame =
          section.kind === "beat"
            ? BEAT_FRAME[section.beatKey]
            : { className: "beat beat--free", id: undefined };

        return (
          <section
            key={`${section.kind}-${section.kind === "beat" ? section.beatKey : section.id}`}
            className={`${frame.className}${section.hidden ? " is-hidden" : ""}`}
            id={frame.id}
            {...marks(editing, {
              section: section.id,
              "section-kind": section.kind,
              ...(section.kind === "beat" ? { beat: section.beatKey } : {}),
              hidden: section.hidden ? "true" : "false",
            })}
          >
            {editing && (
              <SectionHandle
                label={
                  section.kind === "beat"
                    ? (BEAT_LABEL.get(section.beatKey) ?? "A section")
                    : "A section you added"
                }
                hidden={section.hidden}
              />
            )}
            {section.kind === "free" ? (
              <FreeSection section={section} editing={editing} head={head} />
            ) : section.beatKey === "root" ? (
              <Root beat={section} editing={editing} head={head} />
            ) : (
              <>
                {head}
                {section.beatKey === "sacral" ? (
                  <Sacral beat={section} />
                ) : section.beatKey === "method" ? (
                  <Method beat={section} />
                ) : section.beatKey === "throat" ? (
                  <Throat beat={section} />
                ) : section.beatKey === "schedule" ? (
                  <Schedule
                    beat={section}
                    rowsByLabel={rowsByLabel}
                    groups={groups}
                  />
                ) : section.beatKey === "turn" ? (
                  <Turn beat={section} />
                ) : (
                  <Crown beat={section} />
                )}
              </>
            )}
          </section>
        );
      })}

      {/* The site's footer, not this page's. It sits OUTSIDE the last beat
          because it is full-bleed on the site gutter and the Crown is not. */}
      <SiteFooter />
    </>
  );
}
