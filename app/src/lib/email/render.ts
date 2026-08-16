/**
 * The branded HTML half of every message this site sends.
 *
 * This is `docs/screens/email/_build.mjs` promoted out of a design record and
 * into the app. That script holds the approved masthead, footer, palette and
 * type ramp once so six mockups cannot drift apart; this holds the same chrome
 * once so nine real messages cannot. The mockups under `docs/screens/email/`
 * ARE the specification — every colour, size and padding below is carried
 * across from them, and a change here that is not also a change there has put
 * the two out of step.
 *
 * HTML EMAIL IS NOT WEB HTML, and nearly every decision below is that fact:
 *
 *  - Tables for layout. No flex, no grid, no `position`. Outlook for Windows
 *    renders through Word, which supports none of them.
 *  - Every load-bearing style is INLINE on the element. The <style> block is a
 *    progressive enhancement carrying the responsive rules and the dark-mode
 *    re-assertion; several clients strip <head> entirely.
 *  - 600px and a single column, so the phone case is the same composition.
 *  - No web fonts. See FONTS below for the stacks and why they were chosen.
 *  - NO BACKGROUND IMAGE MAY EVER CARRY A WORD. The plum plate is a `bgcolor`
 *    on a <td> and always will be. A plate built OUT OF `background-image` is a
 *    white void with blush text on it in Outlook for Windows, which ignores CSS
 *    backgrounds entirely. The one background image this renderer will draw is
 *    the masthead's optional photograph, and it is layered OVER that same
 *    `bgcolor` — a client that drops it renders the approved plate exactly.
 *    See `masthead` for the whole of that argument.
 *
 * COLOUR IS CONTEXT-LOCKED, exactly as the site locks it: gold labels the dark
 * ground and never appears inside a blush pool; magenta works inside a pool and
 * never on the dark. Zero border-radius, zero box-shadow — both are brand
 * rules, not defaults.
 *
 * AND NO FACT IS EVER SET IN GOLD. Gmail's Android app force-inverts colours on
 * accounts with dark mode on and honours no opt-out; gold on plum becomes gold
 * on white, which is 1.6:1. So gold is only ever an eyebrow whose meaning the
 * line beneath it repeats — an inverted eyebrow costs a label, never a date, an
 * amount or a link. `figure()` is blush for that reason and no other.
 */

/* ── where a picture in a letter comes from ─────────────────────────────────
   THIS MODULE NO LONGER NAMES AN ORIGIN. It used to build the masthead's URL
   from the canonical domain; the mark now rides in the envelope instead, so
   there is nothing here to be absolute against — see LOGO_CID below.

   An email still has no document base, so every OTHER `src` a letter carries
   has to arrive absolute, built by whoever composed it. There is exactly one
   place that does it — `newsletter/compose.ts::newsletterImageUrl` — and its
   note carries the rest of this argument: canonical rather than SITE_URL,
   because a picture has to still resolve from somebody's inbox in a year and
   cannot point at whichever deployment happened to compose the letter. */

/* ── palette ──────────────────────────────────────────────────────────────────
   Carried from docs/screens/email/_build.mjs, with ONE deliberate divergence
   from the site, made 2026-08-16 after the operator read a real letter in Gmail
   and in Outlook.

   THE PLATE IS NOT THE SITE'S plum-900. The site's `--plum-900` is #160712 —
   RGB 22, 7, 18 — and on a screen, surrounded by the site's own blush and gold
   and photography, it reads as deep plum. In an inbox it does not. There is no
   surrounding page: the plate is a 600px column on the client's own white or
   grey chrome, usually smaller than a browser window and often on a phone at
   half brightness, and at 6% lightness the hue is below the threshold at which
   the eye can find it. Every reader the operator asked reported black.

   So the ground is lifted to 14% lightness at the SAME HUE — #33132B is
   hsl(315, 46%, 14%) against plum-900's hsl(316, 52%, 6%). It is recognisably
   the same colour, one the site's own ramp would reach two steps up, and in an
   inbox it reads as plum rather than as a dark rectangle. The site is not
   changed: a page has the context an email does not.

   Nothing was spent to buy it. Against the new ground blush is 15.1:1, gold is
   10.3:1 and the soft plate text is 9.6:1 — every one of them still far past
   AAA, and past what the old ground gave by margins nobody can see. */
export const GROUND = "#33132B"; // the plate — the site's plum, two steps up
export const SURFACE = "#45193B"; // the plate one step up again
export const POOL = "#FBF3F1"; // blush, the panel
export const INK = "#1E0A1C";
export const INK_SOFT = "#5A4356";
export const ACTION = "#C2187A"; // magenta — inside a pool ONLY
export const GOLD = "#E9C87E"; // gold — on the dark ground ONLY
export const PLATE_SOFT = "#D8BFC9";

/* The site draws its hairlines as `rgb(138 114 133 / 0.35)` and
   `rgb(142 106 130 / 0.35)`. Outlook does not composite rgba borders, so both
   are pre-blended here against the ground each one actually sits on. Same
   pixel, no alpha. */
const POOL_RULE = "#D3C6CB"; // 35% #8A7285 over #FBF3F1
const PLATE_RULE = "#533149"; // 35% #8E6A82 over the ground above

/* ── FONTS ──────────────────────────────────────────────────────────────────
   The site is Cormorant Garamond over Source Sans 3. Neither can load here.

   DISPLAY → Palatino first. Cormorant is a light, high-contrast old-style with
   long extenders; Georgia — the site's own declared fallback — is a sturdy
   screen serif with a large x-height, and at 34px it reads twice the weight
   Cormorant does. Palatino Linotype (every Windows since 2000) and Palatino
   (every Mac) are calligraphic old-styles with the contrast and the airiness,
   and are the nearest thing to Cormorant already on the machine. Georgia stays
   as the last stop before generic serif.

   BODY → Segoe UI and -apple-system are humanist sans with open apertures,
   which is the family Source Sans 3 belongs to. Arial is the floor.

   MONO → the booking reference and bare URLs only, where the site uses Azeret. */
const DISPLAY =
  "'Palatino Linotype','Book Antiqua',Palatino,'Iowan Old Style',Georgia,serif";
const BODY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO =
  "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace";

/** Nothing on the site is below 17px, and 17 is also above the 16px line under
    which iOS Mail zooms a message. */
const FS = 17;

// ── the escape hatch that is not one ─────────────────────────────────────────

/**
 * HTML that is already safe to emit.
 *
 * The ONLY way to make one is `escaped()`, which escapes first. Nothing in this
 * module or any caller can produce a `Safe` carrying markup somebody typed:
 * the branded field is not exported as a type anybody can forge, and every
 * other string that reaches the document goes through `esc` on the way.
 *
 * This is what makes the admin's editable openings and sign-offs harmless. Her
 * text arrives here as a `Safe` built by `escaped(esc(hers))` — five characters
 * already turned into entities — and is dropped into a text node. A `<script>`
 * she pastes renders as the characters `<script>`, in blush, in the letter.
 */
export type Safe = { readonly html: string; readonly __safe: true };

const esc = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Mark an ALREADY-ESCAPED string as safe to emit. Never call with raw input. */
export function escaped(alreadyEscaped: string): Safe {
  return { html: alreadyEscaped, __safe: true };
}

/** Escape a plain string and mark the result safe. The normal way in. */
export function plain(text: string): Safe {
  return escaped(esc(text));
}

/**
 * Code-authored copy, with one piece of markup: `*like this*` becomes bold.
 *
 * The designs put `<strong>` round a deadline or an amount inside a sentence —
 * "due by *Monday 8 September*" — and hand-writing the tag would mean the
 * sentence carried raw HTML through the whole pipeline. Escaping happens FIRST,
 * so the transform can only ever produce `<strong>` and never anything else.
 *
 * Applied to strings written in this repository only. Anything an operator
 * typed goes through `plain()` above, which has no transform at all — so a run
 * of asterisks in her opening is a run of asterisks, not markup.
 */
export function copy(text: string): Safe {
  return escaped(
    esc(text).replace(
      /\*([^*]+)\*/g,
      '<strong style="font-weight:600;">$1</strong>',
    ),
  );
}

/** The same, on the plate, where bold has to re-assert the blush. */
function copyOnPlate(text: string): Safe {
  return escaped(
    esc(text).replace(
      /\*([^*]+)\*/g,
      `<strong style="font-weight:600;color:${POOL};">$1</strong>`,
    ),
  );
}

type Ground = "pool" | "plate";

const render = (value: Safe | string): string =>
  typeof value === "string" ? esc(value) : value.html;

// ── primitives ───────────────────────────────────────────────────────────────

/** An eyebrow. 17px, 0.18em, uppercase, 600 — the site's, exactly. */
function eyebrow(text: Safe | string, on: Ground, pad = "0 0 14px"): string {
  const colour = on === "plate" ? GOLD : ACTION;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS}px;line-height:1.5;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;color:${colour};">${render(text)}</p>`;
}

/** Display serif. The type IS the hierarchy here — there are no boxes. */
function display(
  text: Safe | string,
  { size = 34, on = "pool" as Ground, cls = "d1", pad = "0" },
): string {
  const colour = on === "plate" ? POOL : INK;
  return `<p class="${cls}" style="margin:0;padding:${pad};font-family:${DISPLAY};font-size:${size}px;line-height:1.14;font-weight:400;letter-spacing:-0.005em;color:${colour};">${render(text)}</p>`;
}

function para(text: Safe | string, on: Ground, pad = "0 0 18px"): string {
  const colour = on === "plate" ? PLATE_SOFT : INK;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS + 1}px;line-height:1.62;color:${colour};">${render(text)}</p>`;
}

function quiet(text: Safe | string, on: Ground, pad = "0 0 16px"): string {
  const colour = on === "plate" ? PLATE_SOFT : INK_SOFT;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${colour};">${render(text)}</p>`;
}

/** A hairline. A rule the type sits under, never a border round a box. */
function hairline(on: Ground, pad = "26px 0 24px"): string {
  const colour = on === "plate" ? PLATE_RULE : POOL_RULE;
  const [top, , bottom] = pad.split(" ").concat(["0", "0"]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${top} 0 0;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td height="1" style="height:1px;font-size:0;line-height:0;background-color:${colour};">&nbsp;</td></tr><tr><td style="padding:${bottom} 0 0;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/**
 * The one action. A filled magenta block with a knife edge — no radius, so no
 * VML rounding is needed and Outlook gets the same rectangle everybody else
 * does. The label is a real `<a>`, so a client that strips the table still
 * leaves a working link.
 */
function actionButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td bgcolor="${ACTION}" style="background-color:${ACTION};padding:17px 30px;mso-padding-alt:17px 30px;"><a href="${esc(href)}" style="display:inline-block;font-family:${BODY};font-size:${FS}px;font-weight:600;letter-spacing:0.02em;color:${POOL};text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

/**
 * The link again, in full, as text.
 *
 * `bookings.ts` puts the bare link on its own line in every plain-text message
 * and then says "keep this email — that link is the only one". Printing it
 * under the button keeps that promise when the button is stripped, when the
 * message is forwarded as text, and when somebody wants to read the address
 * before pressing it — which, on an email asking for money, some will.
 */
function bareLink(href: string): string {
  return `<p style="margin:0;padding:14px 0 0;font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};word-break:break-word;"><a href="${esc(href)}" style="color:${INK_SOFT};text-decoration:underline;">${esc(href)}</a></p>`;
}

/** A mono line — the booking reference, and nothing else. */
function monoLine(text: string, on: Ground, pad = "16px 0 0"): string {
  const colour = on === "plate" ? PLATE_SOFT : INK_SOFT;
  return `<p style="margin:0;padding:${pad};font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${colour};">${esc(text)}</p>`;
}

/** label / value, stacked. Used for when, where, what was paid. */
function factBlock(
  label: string,
  lines: (Safe | string)[],
  on: Ground,
): string {
  const colour = on === "plate" ? POOL : INK;
  const body = lines
    .map(
      (line) =>
        `<p style="margin:0;padding:0 0 4px;font-family:${BODY};font-size:${FS + 1}px;line-height:1.5;color:${colour};">${render(line)}</p>`,
    )
    .join("");
  return `${eyebrow(label, on, "0 0 10px")}${body}`;
}

/** A figure that has to be read before the sentence around it. Never gold. */
function figure(amount: string, on: Ground): string {
  const colour = on === "plate" ? POOL : INK;
  return `<p class="d2" style="margin:0;padding:0;font-family:${DISPLAY};font-size:40px;line-height:1.05;font-weight:400;color:${colour};font-variant-numeric:tabular-nums lining-nums;">${esc(amount)}</p>`;
}

// ── blocks ───────────────────────────────────────────────────────────────────

/**
 * One part of a letter.
 *
 * A message is a list of SECTIONS — a stretch of blush pool or a stretch of
 * plum plate — and each section is a list of these. Deliberately the same set
 * of parts the newsletter editor offers (heading, paragraph, image, upcoming
 * offerings, button) plus the transactional ones the six approved mockups use,
 * so a letter she composes and a receipt the webhook sends are built from one
 * vocabulary rather than two.
 */
export type Block =
  /** Display serif. The headline of a section; there are no boxes. */
  | { kind: "headline"; text: Safe | string; size?: number }
  /** Body prose. */
  | { kind: "paragraph"; text: Safe | string }
  /** Quieter body prose — an aside, a closing note. */
  | { kind: "note"; text: Safe | string }
  /** An uppercase label. Gold on the plate, magenta in the pool. */
  | { kind: "eyebrow"; text: Safe | string }
  /** Two facts side by side, stacking on a phone. When / Where. */
  | {
      kind: "factColumns";
      columns: { label: string; lines: (Safe | string)[] }[];
    }
  /** Facts down the page, each under the last, separated by hairlines. */
  | {
      kind: "factList";
      items: { label: string; lines: (Safe | string)[] }[];
    }
  /** The figure, at display size, with what it is above it. */
  | { kind: "figure"; amount: string }
  /** Plain lines of arithmetic under a figure — deposit, outstanding, total. */
  | { kind: "lines"; lines: (Safe | string)[]; emphasiseLast?: boolean }
  /** The booking reference, in mono. */
  | { kind: "reference"; text: string }
  /** A hairline. */
  | { kind: "rule" }
  /** The one action, with its address printed underneath. */
  | { kind: "button"; label: string; href: string; showAddress?: boolean }
  /** An inline link on its own line. */
  | { kind: "link"; text: string; href: string }
  /** A photograph. Never a background — see the module note. */
  | {
      kind: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
      caption?: string;
    }
  /** What is open, pulled live at send time. */
  | {
      kind: "offerings";
      items: {
        when: string;
        price: string;
        name: string;
        detail: string;
        href: string;
      }[];
    }
  /** A file that came with the letter. */
  | {
      kind: "attachment";
      title: string;
      note: string;
      href: string;
      linkText: string;
    };

/** A stretch of one ground, and what is on it. */
export type Section = {
  ground: Ground;
  blocks: Block[];
  /** Overrides the default rhythm. Rarely needed. */
  pad?: string;
  /** The plate one step up, for an aside inside a letter. */
  raised?: boolean;
};

/** What each kind of block leaves under itself when something follows it. */
const GAP: Record<Block["kind"], string> = {
  headline: "0 0 26px",
  paragraph: "0 0 18px",
  note: "0 0 16px",
  eyebrow: "0 0 16px",
  factColumns: "0 0 22px",
  factList: "0 0 22px",
  figure: "0 0 12px",
  lines: "0 0 14px",
  reference: "16px 0 0",
  rule: "0",
  button: "0 0 24px",
  link: "0 0 0",
  image: "0 0 24px",
  offerings: "0 0 26px",
  attachment: "0",
};

function renderBlock(block: Block, on: Ground, last: boolean): string {
  const pad = last ? "0" : GAP[block.kind];

  switch (block.kind) {
    case "headline":
      return display(block.text, {
        size: block.size ?? 34,
        on,
        cls: (block.size ?? 34) <= 28 ? "d3" : "d1",
        pad,
      });

    case "paragraph":
      return para(block.text, on, pad);

    case "note":
      return quiet(block.text, on, pad);

    case "eyebrow":
      return eyebrow(block.text, on, pad);

    case "factColumns": {
      // Two columns at 600px, stacked below 600 by the `.stack` rules in the
      // head. A phone gets the same two facts, one under the other.
      const cells = block.columns
        .map(
          (column, index) =>
            `<td width="50%" valign="top" ${index > 0 ? 'class="gap" ' : ""}style="width:50%;padding:0 ${index === block.columns.length - 1 ? "0" : "20px"} 0 0;">${factBlock(column.label, column.lines, on)}</td>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="stack" style="margin:0;"><tr>${cells}</tr></table>${last ? "" : spacer(GAP.factColumns)}`;
    }

    case "factList": {
      const body = block.items
        .map(
          (item, index) =>
            (index > 0 ? hairline(on) : "") +
            factBlock(item.label, item.lines, on),
        )
        .join("");
      return body + (last ? "" : spacer(GAP.factList));
    }

    case "figure":
      return `<div style="padding:${pad};">${figure(block.amount, on)}</div>`;

    case "lines": {
      const colour = on === "plate" ? PLATE_SOFT : INK_SOFT;
      const strong = on === "plate" ? POOL : INK;
      return block.lines
        .map((line, index) => {
          const isLast = index === block.lines.length - 1;
          const tone = block.emphasiseLast && isLast ? strong : colour;
          const linePad = isLast ? pad : "0 0 4px";
          return `<p style="margin:0;padding:${linePad};font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${tone};font-variant-numeric:tabular-nums lining-nums;">${render(line)}</p>`;
        })
        .join("");
    }

    case "reference":
      return monoLine(block.text, on, last ? "16px 0 0" : GAP.reference);

    case "rule":
      return hairline(on, "26px 0 22px");

    case "button":
      return (
        `<div style="padding:0;">${actionButton(block.label, block.href)}</div>` +
        (block.showAddress === false ? "" : bareLink(block.href)) +
        (last ? "" : spacer(GAP.button))
      );

    case "link":
      return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS}px;line-height:1.6;"><a href="${esc(block.href)}" style="color:${on === "plate" ? GOLD : ACTION};text-decoration:underline;text-underline-offset:3px;">${esc(block.text)}</a></p>`;

    case "image":
      // A real <img>, never a background. The plum is set as the img's own
      // background-color: it does nothing when the picture loads, and turns
      // the reserved box into a deliberate dark band with blush type on it
      // when it does not — which is the whole images-off contingency.
      return (
        `<img class="shot" src="${esc(block.src)}" width="${block.width}" height="${block.height}" alt="${esc(block.alt)}" style="display:block;border:0;width:${block.width}px;max-width:100%;height:auto;background-color:${SURFACE};font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${PLATE_SOFT};">` +
        (block.caption
          ? `<p style="margin:0;padding:12px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};">${esc(block.caption)}</p>`
          : "") +
        (last ? "" : spacer(GAP.image))
      );

    case "offerings": {
      const rows = block.items
        .map((item, index) => {
          const isLast = index === block.items.length - 1;
          return `<tr><td style="padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="stack"><tr>
    <td width="150" valign="top" style="width:150px;padding:0 18px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};font-variant-numeric:tabular-nums lining-nums;">${esc(item.when)}<br><span style="color:${INK};">${esc(item.price)}</span></td>
    <td valign="top" class="gap" style="padding:0;">
      ${display(escaped(`<a href="${esc(item.href)}" style="color:${INK};text-decoration:none;">${esc(item.name)}</a>`), { size: 26, cls: "d3", pad: "0 0 6px" })}
      <p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};">${esc(item.detail)}</p>
    </td>
  </tr></table>
  </td></tr>${isLast ? "" : `<tr><td style="padding:20px 0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;font-size:0;line-height:0;background-color:${POOL_RULE};">&nbsp;</td></tr></table></td></tr>`}`;
        })
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>${last ? "" : spacer(GAP.offerings)}`;
    }

    case "attachment":
      return (
        display(block.title, { size: 26, on, cls: "d3", pad: "0 0 8px" }) +
        quiet(block.note, on, "0 0 18px") +
        `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;"><a href="${esc(block.href)}" style="color:${on === "plate" ? GOLD : ACTION};text-decoration:underline;text-underline-offset:3px;">${esc(block.linkText)}</a></p>`
      );
  }
}

/** Vertical air between two blocks that cannot carry their own padding. */
function spacer(pad: string): string {
  const height = Number.parseInt(pad.split(" ")[2] ?? "0", 10) || 0;
  return height
    ? `<div style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</div>`
    : "";
}

// ── the chrome ───────────────────────────────────────────────────────────────

/**
 * The mark, and how it travels.
 *
 * IT RIDES IN THE MESSAGE rather than being fetched from a URL, and that is the
 * fix for a real failure the operator found by sending himself a letter and
 * opening it (2026-08-16). A mail client does NOT fetch a remote image the way
 * a browser does: Gmail and Outlook fetch it from THEIR OWN servers, cache it,
 * and serve it to the reader from there. Neither of those servers can reach a
 * development machine, so while the site runs locally the mark can never appear
 * — and the person testing has no way to tell that apart from a broken letter.
 *
 * A CID attachment has no origin to be unreachable. The bytes are part of the
 * message, so the mark is identical from a laptop, from a preview deployment
 * and from production, and it survives the reader who has told their client
 * never to load remote images — which is the default in Outlook and in a good
 * share of everything else.
 *
 * `sendMail` is what attaches it: it looks for this reference in the HTML and
 * puts the file in the envelope with a matching `contentId`. One place, so
 * every branded message the app sends carries the mark and no caller can
 * forget. The preview route swaps the reference for the local file instead
 * (there is no envelope to put anything in).
 */
export const LOGO_CID = "thefieldwork-mark";
/** Under `public/`. Generated from the SVG by `scripts/build-email-logo.mjs`. */
export const LOGO_PATH = "brand/logo-horizontal@2x.png";

/**
 * The masthead scrim: the ground, at 82%.
 *
 * The number is a floor rather than a taste. She picks the photograph, so the
 * scrim has to hold for the WORST one she could pick — a white sky, a lit
 * window, an overexposed wall. 82% of the ground over pure white composites to
 * rgb(88, 61, 81), against which the gold eyebrow is 5.9:1 and blush is 8.7:1;
 * at the 72% this started on, the same white took gold to 4.2:1,
 * which is below the line for a 17px label and no photograph is worth that.
 * The picture still reads clearly through it — see `e2e/_newsletter-shots/`.
 */
const SCRIM = "rgba(51,19,43,0.82)";

/**
 * The same letter, as a BROWSER can draw it.
 *
 * Two swaps, both of them the frame's problem and never the message's:
 *
 *  - `cid:` resolves against the envelope a message travels in, and a preview
 *    has no envelope. The mark is served from this deployment's own `public/`
 *    instead, which is the same file `sendMail` attaches.
 *  - A picture in a real letter is absolute against the canonical domain,
 *    because it has to still resolve from an inbox in a year. In a preview that
 *    would ask the LIVE site for a photograph this deployment may not have
 *    published yet, so it is made relative and served from here.
 *
 * One function because two preview routes were doing half of it each, and the
 * half they were both missing is the one the operator hit.
 */
export function forBrowserPreview(html: string, origin: string): string {
  return html
    .replaceAll(`src="cid:${LOGO_CID}"`, `src="/${LOGO_PATH}"`)
    .replaceAll(`src="${origin}/`, 'src="/')
    .replaceAll(`background="${origin}/`, 'background="/')
    .replaceAll(`url('${origin}/`, "url('/");
}

/**
 * The masthead.
 *
 * The mark is a PNG, because NO MAIL CLIENT RENDERS SVG — Gmail, Outlook and
 * Yahoo all strip it. `public/brand/logo-horizontal@2x.png` is generated from
 * `public/brand/logo-horizontal.svg` by `scripts/build-email-logo.mjs`.
 *
 * The alt text is styled blush display serif at 26px, so with images off the
 * masthead is the practice's name in its own type on its own plum, not a
 * broken-image icon. That is the whole images-off contingency for the mark, and
 * it is why there is no duplicate text wordmark beside it: a second one would
 * print twice the moment images loaded.
 *
 * 280×76 and not smaller. `site-chrome.css` puts a floor of 74px on the mark's
 * height for a stated reason — the letterspaced WORK in the lockup is 13% of
 * that height, so 74px gives it ten pixels and anything less gives it fewer.
 *
 * ── THE OPTIONAL PHOTOGRAPH BEHIND IT ────────────────────────────────────────
 *
 * The module note above bans building a plate OUT OF a background image. This
 * does not do that, and the difference is the whole of why it is allowed:
 *
 *  - The `bgcolor` and the `background-color` are painted FIRST and are never
 *    conditional. Outlook for Windows renders through Word, which supports no
 *    CSS background at all — it therefore draws the approved plum plate, and
 *    the letter it shows is byte-for-byte the design that was signed off.
 *  - The picture is drawn over that, and then a 72% plum scrim is drawn over
 *    the picture, so the gold eyebrow and the blush mark keep the contrast they
 *    were measured at whatever the photograph turns out to be. A client that
 *    understands `background-image` also understands `rgba()`; a client that
 *    understands neither gets the flat plate, which is the same composition.
 *  - It is only ever behind the MASTHEAD — a band carrying a mark and one
 *    uppercase label. No sentence, no date, no amount and no link is ever on
 *    it. Nothing legible depends on it arriving.
 *
 * NO VML FALLBACK, deliberately. `<v:rect><v:fill type="frame">` is the way to
 * put a background image into Outlook for Windows, and it was considered and
 * rejected: it re-implements the masthead a second time inside a conditional
 * comment, in a dialect that cannot be tested from here, to give the one client
 * whose readers are most likely to have images off a decoration that the design
 * does not need. Getting it wrong breaks the real masthead in the one client
 * the whole renderer was hardened for. The flat plate is not a degraded
 * Outlook; it IS the approved letter.
 */
function masthead(label: string, background: string | null): string {
  const mark =
    `<img src="cid:${LOGO_CID}" width="280" height="76" alt="The Field Work" style="display:block;border:0;outline:none;text-decoration:none;width:280px;height:76px;font-family:${DISPLAY};font-size:26px;line-height:76px;color:${POOL};">` +
    `<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>` +
    eyebrow(label, "plate", "0");

  const pad = "34px 44px 32px";
  if (!background) return plateSection(mark, pad, GROUND);

  // `background=` as well as the CSS: it is the HTML 4 attribute, and it is
  // what Outlook.com and several Android clients read instead of the property.
  // The scrim is a nested cell rather than a gradient — Word and Gmail's
  // Android app both drop multi-layer backgrounds, and one that half-applied
  // would be worse than none.
  return `<tr><td class="p plate" bgcolor="${GROUND}" background="${esc(background)}" style="background-color:${GROUND};background-image:url('${esc(background)}');background-position:center center;background-repeat:no-repeat;background-size:cover;padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="scrim" style="background-color:${SCRIM};padding:${pad};">${mark}</td></tr></table>
</td></tr>`;
}

/**
 * The footer.
 *
 * Three things, in the order the site's own footer has them: the place, the §14
 * compliance sentence — load-bearing wording, not decoration — and then why
 * this particular message arrived.
 *
 * THE UNSUBSCRIBE LINE IS ONLY ON THE NEWSLETTER. Marketing email to UK
 * recipients needs one (PECR reg. 22); a booking confirmation is transactional
 * and must NOT carry one, because "unsubscribe" printed beside a receipt reads
 * as an offer to stop being booked.
 */
function footer(why: string, unsubscribe: string | null): string {
  const legal =
    "Complementary work. Not a substitute for medical care, and never a reason to delay it. Nothing here treats, cures, diagnoses or prevents any condition.";
  return plateSection(
    `<p style="margin:0;padding:0 0 10px;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${POOL};">The Field Work &middot; Frome, Somerset</p>` +
      `<p style="margin:0;padding:0 0 22px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};">${esc(legal)}</p>` +
      hairline("plate", "0 0 20px") +
      `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};">${esc(why)}</p>` +
      (unsubscribe
        ? `<p style="margin:0;padding:12px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};"><a href="${esc(unsubscribe)}" style="color:${GOLD};text-decoration:underline;text-underline-offset:3px;">Unsubscribe</a> &mdash; one click, nothing to fill in and nothing to explain.</p>`
        : ""),
    "36px 44px 40px",
    GROUND,
  );
}

function poolSection(inner: string, pad: string): string {
  return `<tr><td class="p" bgcolor="${POOL}" style="background-color:${POOL};padding:${pad};">${inner}</td></tr>`;
}

function plateSection(inner: string, pad: string, bg: string): string {
  return `<tr><td class="p plate" bgcolor="${bg}" style="background-color:${bg};padding:${pad};">${inner}</td></tr>`;
}

// ── the document ─────────────────────────────────────────────────────────────

/**
 * What a message is: a subject, a preheader, a masthead label, its sections,
 * and the line in the footer saying why it arrived.
 *
 * `unsubscribe` is null on everything except the newsletter — see `footer`.
 */
export type Letter = {
  subject: string;
  /** The line the inbox shows beside the subject. Always facts, never chrome. */
  preheader: string;
  mastheadLabel: string;
  sections: Section[];
  why: string;
  unsubscribe?: string | null;
  /**
   * An absolute URL for a photograph behind the masthead. Decoration only —
   * see `masthead` for what is and is not allowed to depend on it. The nine
   * transactional messages never set it; only a letter she has chosen one for.
   */
  mastheadBackground?: string | null;
};

/**
 * The whole document.
 *
 * DARK MODE, deliberately, in three layers:
 *
 *  1. `color-scheme: light dark` plus the two meta tags. This tells Apple Mail,
 *     iOS Mail and Outlook for Mac that the message handles its own scheme, and
 *     turns OFF their automatic colour inversion — the thing that would take a
 *     gold-on-plum plate to gold-on-white, which is 1.6:1 and unreadable.
 *  2. A `prefers-color-scheme` block that RE-ASSERTS the same palette. The
 *     design is already dark-first; there is no second palette to switch to.
 *  3. `[data-ogsc]` / `[data-ogsb]`, the attributes Outlook.com stamps onto
 *     elements when it rewrites a message. Same re-assertion.
 *
 * What none of that reaches is Gmail's Android app with forced inversion, which
 * honours no opt-out. The defence there is structural and lives in the design,
 * not in this block: no FACT is ever set in gold.
 */
export function renderLetter(letter: Letter): string {
  // Pads the preheader out so the inbox preview does not run on into the
  // first line of the message body.
  const filler = "&#8199;&#65279;".repeat(40);

  const body = letter.sections
    .map((section, index) => {
      const inner = section.blocks
        .map((block, blockIndex) =>
          renderBlock(
            block,
            section.ground,
            blockIndex === section.blocks.length - 1,
          ),
        )
        .join("");

      if (section.ground === "plate") {
        return plateSection(
          inner,
          section.pad ?? "34px 44px 36px",
          section.raised ? SURFACE : GROUND,
        );
      }
      // The first pool after the masthead opens the letter and gets more air
      // above it than below; every later one is the other way round.
      const pad =
        section.pad ?? (index === 0 ? "42px 44px 38px" : "38px 44px 42px");
      return poolSection(inner, pad);
    })
    .join("\n");

  return `<!doctype html>
<html lang="en-GB" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(letter.subject)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration-thickness:1px; }

  /* The phone. One column already, so this only relaxes the gutter, takes the
     display sizes down a step, and unstacks the two-column rows. 599 and not
     600: the message IS 600 wide, and a breakpoint that fires at its own width
     puts every desktop preview pane into the phone layout. */
  @media only screen and (max-width:599px) {
    .w  { width:100% !important; max-width:100% !important; }
    .p  { padding-left:22px !important; padding-right:22px !important; }
    .d1 { font-size:28px !important; }
    .d2 { font-size:34px !important; }
    .d3 { font-size:23px !important; }
    .stack, .stack > tbody, .stack > tbody > tr, .stack > tr { display:block !important; width:100% !important; }
    .stack td { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .stack .gap { padding-top:6px !important; }
    .shot { width:100% !important; height:auto !important; }
  }

  /* Layer 2 — re-assert, never re-theme. The masthead scrim is excluded from
     both layers: it is deliberately translucent, and re-asserting an opaque
     plum onto it would paint out the photograph behind it for every reader
     whose phone is in dark mode. Its own colour is the ground already. */
  @media (prefers-color-scheme: dark) {
    .plate, .plate td:not(.scrim) { background-color:${GROUND} !important; }
    .p[bgcolor="#FBF3F1"] { background-color:#FBF3F1 !important; }
  }
  /* Layer 3 — Outlook.com. */
  [data-ogsc] .plate, [data-ogsb] .plate { background-color:${GROUND} !important; }
  [data-ogsc] .plate td:not(.scrim), [data-ogsb] .plate td:not(.scrim) { background-color:${GROUND} !important; }
  [data-ogsc] .p[bgcolor="#FBF3F1"], [data-ogsb] .p[bgcolor="#FBF3F1"] { background-color:#FBF3F1 !important; }

  @media (prefers-reduced-motion:reduce) { * { transition:none !important; animation:none !important; } }
</style>
</head>
<body style="margin:0;padding:0;background-color:${GROUND};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${GROUND};">${esc(letter.preheader)}${filler}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GROUND}" style="background-color:${GROUND};width:100%;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="w" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;">
${masthead(letter.mastheadLabel, letter.mastheadBackground ?? null)}
${body}
${footer(letter.why, letter.unsubscribe ?? null)}
</table>
</td></tr>
</table>
</body>
</html>
`;
}

/** The `*bold*` transform on the plate, exported for composers on the dark. */
export { copyOnPlate };
