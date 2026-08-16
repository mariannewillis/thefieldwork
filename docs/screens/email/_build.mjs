/* ===========================================================================
   The Field Work — email templates, built
   ---------------------------------------------------------------------------
   Six templates share one masthead, one footer, one palette and one type ramp.
   Hand-copying that chrome into six files is how six files drift, so it lives
   here once and the .html files beside this script are emitted from it. The
   .html files ARE the deliverable and the design record — read those. Edit
   this and re-run `node docs/screens/email/_build.mjs` from the project root.

   HTML EMAIL IS NOT WEB HTML, and nearly every decision below is that fact:

   - Tables for layout. No flex, no grid, no position. Outlook for Windows
     renders through Word, which supports none of them.
   - Every load-bearing style is INLINE on the element. The <style> block is a
     progressive enhancement — it carries the responsive rules, the dark-mode
     re-assertion and nothing that the message depends on to be readable.
   - 600px, which is the width every client has been safe at for twenty years,
     and a single column so the phone case is the same composition.
   - No web fonts. Cormorant Garamond and Source Sans 3 will not load. The
     stacks below are chosen to fall in the same direction — see FONTS.
   - No background images anywhere. The plum plate is a bgcolor on a <td>, so
     it survives images-off and Outlook, which is where a background-image
     plate becomes a white void with blush text on it.

   COLOUR IS CONTEXT-LOCKED, exactly as the site locks it (workshops.css):
   gold labels the dark ground and never appears inside a blush pool; magenta
   works inside a pool and never on the dark. Zero border-radius. Zero
   box-shadow. Both of those are load-bearing brand rules, not defaults.
   =========================================================================== */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── the origin every asset and link is absolute against ────────────────────
   An email has no document base. A relative src resolves against the client's
   own domain — mail.google.com — and 404s. So every URL below is absolute,
   built from this one constant, the same way src/content/site.ts builds the
   app's. */
const SITE = "https://thefieldwork.co.uk";

/* ── palette — verbatim from workshops.css @theme / home.css :root ───────── */
const GROUND = "#160712"; // plum-900, the plate
const SURFACE = "#260F20"; // plum-800, the plate one step up
const POOL = "#FBF3F1"; // blush, the panel
const INK = "#1E0A1C";
const INK_SOFT = "#5A4356";
const ACTION = "#C2187A"; // magenta — inside a pool ONLY
const GOLD = "#E9C87E"; // gold — on the dark ground ONLY
const PLATE_SOFT = "#D8BFC9";

/* The site draws its hairlines as rgb(138 114 133 / 0.35) and
   rgb(142 106 130 / 0.35). Outlook does not composite rgba borders, so both
   are pre-blended here against the ground each one actually sits on. Same
   pixel, no alpha. */
const POOL_RULE = "#D3C6CB"; // 35% #8A7285 over #FBF3F1
const PLATE_RULE = "#402A39"; // 35% #8E6A82 over #160712

/* ── FONTS ──────────────────────────────────────────────────────────────────
   The site is Cormorant Garamond over Source Sans 3. Neither can load here.

   DISPLAY → Palatino first. Cormorant is a light, high-contrast old-style
   with long extenders; Georgia — which the site itself names as its fallback
   — is a sturdy screen serif with a large x-height and short extenders, and
   at 34px it reads twice the weight Cormorant does. Palatino Linotype (every
   Windows since 2000) and Palatino (every Mac) are calligraphic old-styles
   with the contrast and the airiness, and they are the nearest thing to
   Cormorant that is already on the machine. Georgia stays as the last stop
   before generic serif, because that is the fallback the site declares.

   BODY → Segoe UI and -apple-system are both humanist sans with open
   apertures, which is the family Source Sans 3 belongs to. Arial is the floor.

   MONO → for the booking reference and the bare URLs only, which is where the
   site uses Azeret Mono. */
const DISPLAY =
  "'Palatino Linotype','Book Antiqua',Palatino,'Iowan Old Style',Georgia,serif";
const BODY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO =
  "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace";

/* Nothing on the site is below 17px. That floor is kept: it is also above the
   16px line under which iOS Mail zooms the message. */
const FS = 17;

/* ── helpers ─────────────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** An eyebrow. 17px, 0.18em, uppercase, 600 — the site's, exactly. */
function eyebrow(text, { on = "pool", pad = "0 0 14px" } = {}) {
  const colour = on === "plate" ? GOLD : ACTION;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS}px;line-height:1.5;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;color:${colour};">${esc(text)}</p>`;
}

/** Display serif. The type IS the hierarchy here — there are no boxes. */
function display(text, { size = 34, on = "pool", cls = "d1", pad = "0" } = {}) {
  const colour = on === "plate" ? POOL : INK;
  return `<p class="${cls}" style="margin:0;padding:${pad};font-family:${DISPLAY};font-size:${size}px;line-height:1.14;font-weight:400;letter-spacing:-0.005em;color:${colour};">${text}</p>`;
}

function para(text, { on = "pool", pad = "0 0 18px", size = FS + 1 } = {}) {
  const colour = on === "plate" ? PLATE_SOFT : INK;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${size}px;line-height:1.62;color:${colour};">${text}</p>`;
}

function note(text, { on = "pool", pad = "0 0 16px" } = {}) {
  const colour = on === "plate" ? PLATE_SOFT : INK_SOFT;
  return `<p style="margin:0;padding:${pad};font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${colour};">${text}</p>`;
}

/** A hairline. A rule the type sits under, never a border round a box. */
function rule({ on = "pool", pad = "26px 0 24px" } = {}) {
  const c = on === "plate" ? PLATE_RULE : POOL_RULE;
  const [top, , bottom] = pad.split(" ").concat(["0", "0"]);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${top} 0 0;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td height="1" style="height:1px;font-size:0;line-height:0;background-color:${c};">&nbsp;</td></tr><tr><td style="padding:${bottom} 0 0;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/**
 * The one action. A filled magenta block with a knife edge — no radius, so no
 * VML rounding is needed and Outlook gets the same rectangle everybody else
 * does. The label is a real <a>, so a client that strips the table still
 * leaves a working link.
 */
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td bgcolor="${ACTION}" style="background-color:${ACTION};padding:17px 30px;mso-padding-alt:17px 30px;"><a href="${href}" style="display:inline-block;font-family:${BODY};font-size:${FS}px;font-weight:600;letter-spacing:0.02em;color:${POOL};text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

/**
 * The link again, in full, as text.
 *
 * bookings.ts puts the bare link on its own line in every plain-text message
 * and then says "keep this email — that link is the only one". Printing it
 * under the button keeps that promise when the button is stripped, when the
 * message is forwarded as text, and when somebody wants to read the address
 * before pressing it — which, on an email asking for money, some will.
 */
function bareLink(href) {
  return `<p style="margin:0;padding:14px 0 0;font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};word-break:break-word;"><a href="${href}" style="color:${INK_SOFT};text-decoration:underline;">${esc(href)}</a></p>`;
}

function inPool(href, text) {
  return `<a href="${href}" style="color:${ACTION};text-decoration:underline;text-underline-offset:3px;">${esc(text)}</a>`;
}

/** label / value, stacked. Used for when, where, what was paid. */
function fact(label, lines, { on = "pool" } = {}) {
  const colour = on === "plate" ? POOL : INK;
  const body = lines
    .map(
      (l) =>
        `<p style="margin:0;padding:0 0 4px;font-family:${BODY};font-size:${FS + 1}px;line-height:1.5;color:${colour};">${l}</p>`,
    )
    .join("");
  return `${eyebrow(label, { on, pad: "0 0 10px" })}${body}`;
}

/** A figure that has to be read before the sentence around it. */
function figure(amount, { on = "plate" } = {}) {
  const colour = on === "plate" ? POOL : INK;
  return `<p class="d2" style="margin:0;padding:0;font-family:${DISPLAY};font-size:40px;line-height:1.05;font-weight:400;color:${colour};font-variant-numeric:tabular-nums lining-nums;">${esc(amount)}</p>`;
}

/** A section on the blush pool. */
function pool(inner, { pad = "42px 44px" } = {}) {
  return `<tr><td class="p" bgcolor="${POOL}" style="background-color:${POOL};padding:${pad};">${inner}</td></tr>`;
}

/** A section on the plum plate. */
function plate(inner, { pad = "38px 44px", bg = GROUND } = {}) {
  return `<tr><td class="p plate" bgcolor="${bg}" style="background-color:${bg};padding:${pad};">${inner}</td></tr>`;
}

/* ── the masthead ───────────────────────────────────────────────────────────
   The mark is a PNG, because no mail client renders SVG — Gmail, Outlook and
   Yahoo all strip it. The alt text is styled blush display serif at 24px, so
   with images off the masthead is the practice's name set in its own type on
   its own plum, not a broken-image icon. That is the whole images-off
   contingency for the logo, and it is why there is no duplicate text wordmark
   beside it: a second one would print twice the moment images loaded.

   280×76 and not smaller. site-chrome.css puts a floor of 74px on the mark's
   height for a stated reason: the letterspaced WORK in the lockup is 13% of
   that height, so 74px gives it ten pixels and anything less gives it fewer.
   At the 220px width this started on, WORK was eight pixels and read as a
   texture rather than as half the practice's name. */
function masthead(label) {
  return plate(
    `<img src="${SITE}/brand/logo-horizontal@2x.png" width="280" height="76" alt="The Field Work" style="display:block;border:0;outline:none;text-decoration:none;width:280px;height:76px;font-family:${DISPLAY};font-size:26px;line-height:76px;color:${POOL};">` +
      `<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>` +
      eyebrow(label, { on: "plate", pad: "0" }),
    { pad: "34px 44px 32px" },
  );
}

/* ── the footer ─────────────────────────────────────────────────────────────
   Three things, in the order the site's own footer has them: the place, the
   §14 compliance sentence — which is load-bearing wording, not decoration —
   and then why this particular message arrived.

   The unsubscribe line is ONLY on the newsletter. Marketing email to UK
   recipients needs one (PECR reg. 22); a booking confirmation is transactional
   and must not carry one, because "unsubscribe" beside a receipt reads as an
   offer to stop being booked. */
function footer({ unsubscribe = null, why }) {
  const legal =
    "Complementary work. Not a substitute for medical care, and never a reason to delay it. Nothing here treats, cures, diagnoses or prevents any condition.";
  return plate(
    `<p style="margin:0;padding:0 0 10px;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${POOL};">The Field Work · Frome, Somerset</p>` +
      `<p style="margin:0;padding:0 0 22px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};">${legal}</p>` +
      rule({ on: "plate", pad: "0 0 20px" }) +
      `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};">${why}</p>` +
      (unsubscribe
        ? `<p style="margin:0;padding:12px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};"><a href="${unsubscribe}" style="color:${GOLD};text-decoration:underline;text-underline-offset:3px;">Unsubscribe</a> — one click, nothing to fill in and nothing to explain.</p>`
        : ""),
    { pad: "36px 44px 40px" },
  );
}

/* ── the document ───────────────────────────────────────────────────────────
   The <style> block below carries the responsive rules and the dark-mode
   re-assertion. Several clients strip <head> entirely; nothing here is
   load-bearing, and every colour and size it names is already inline.

   DARK MODE, deliberately, in three layers:

   1. `color-scheme: light dark` + the two meta tags. This tells Apple Mail,
      iOS Mail and Outlook for Mac that the message handles its own scheme, and
      turns OFF their automatic colour inversion. That inversion is the thing
      that would take a gold-on-plum plate to gold-on-white, which is 1.6:1 and
      unreadable.
   2. A prefers-color-scheme block that re-asserts the SAME palette. The design
      is already dark-first; there is no second palette to switch to. A client
      that honours the query gets the intended colours back rather than
      whatever it computed.
   3. [data-ogsc] / [data-ogsb], which is the attribute Outlook.com stamps onto
      elements when it rewrites a message for dark mode. Same re-assertion.

   What none of that reaches is Gmail's Android app on accounts with forced
   inversion — it rewrites colours and honours no opt-out. The defence there is
   structural, not CSS: no FACT in this design is ever set in gold. Gold is
   only ever an eyebrow whose meaning is repeated by the line beneath it, so an
   inverted eyebrow costs a label, never a date, an amount or a link. */
function doc({ subject, preheader, sections }) {
  const spacer = "&#8199;&#65279;".repeat(40);
  return `<!doctype html>
<html lang="en-GB" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
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

  /* Layer 2 — re-assert, never re-theme. */
  @media (prefers-color-scheme: dark) {
    .plate, .plate td { background-color:#160712 !important; }
    .p[bgcolor="#FBF3F1"] { background-color:#FBF3F1 !important; }
  }
  /* Layer 3 — Outlook.com. */
  [data-ogsc] .plate, [data-ogsb] .plate { background-color:#160712 !important; }
  [data-ogsc] .p[bgcolor="#FBF3F1"], [data-ogsb] .p[bgcolor="#FBF3F1"] { background-color:#FBF3F1 !important; }

  @media (prefers-reduced-motion:reduce) { * { transition:none !important; animation:none !important; } }
</style>
</head>
<body style="margin:0;padding:0;background-color:${GROUND};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${GROUND};">${esc(preheader)}${spacer}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GROUND}" style="background-color:${GROUND};width:100%;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="w" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;">
${sections.join("\n")}
</table>
</td></tr>
</table>
</body>
</html>
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 · THE MONTHLY LETTER
   ---------------------------------------------------------------------------
   The one she sends herself, and the one with no tooling behind it yet. Its
   body is built from exactly the five block kinds the admin editor offers
   (docs/screens/admin/admin-newsletter-edit.html) — heading, paragraph,
   image, upcoming offerings, button — plus the attached-document region, so
   that what she composes in the portal and what lands in an inbox are the same
   set of parts. Every one is marked BLOCK / /BLOCK below: they can be
   reordered, repeated or dropped and the chrome above and below is untouched.

   The prose is the draft that screen holds, continued in the same voice.
   ═══════════════════════════════════════════════════════════════════════════ */

const OFFERINGS = [
  {
    when: "15 Sep–20 Oct",
    price: "£480",
    name: "Aura Healing: Foundations",
    detail: "Six evenings, 19:00–21:00, Tuesdays · Garden room · 6 places",
    href: `${SITE}/courses/aura-healing-foundations`,
  },
  {
    when: "Sat 24 Oct",
    price: "£95",
    name: "Reading the Field",
    detail: "10:00–16:00 · Garden room · 10 places",
    href: `${SITE}/workshops/reading-the-field`,
  },
];

function offeringRow(o, last) {
  return `<tr><td style="padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="stack"><tr>
    <td width="150" valign="top" style="width:150px;padding:0 18px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};font-variant-numeric:tabular-nums lining-nums;">${esc(o.when)}<br><span style="color:${INK};">${esc(o.price)}</span></td>
    <td valign="top" class="gap" style="padding:0;">
      ${display(`<a href="${o.href}" style="color:${INK};text-decoration:none;">${esc(o.name)}</a>`, { size: 26, cls: "d3", pad: "0 0 6px" })}
      <p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};">${esc(o.detail)}</p>
    </td>
  </tr></table>
  </td></tr>${last ? "" : `<tr><td style="padding:20px 0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;font-size:0;line-height:0;background-color:${POOL_RULE};">&nbsp;</td></tr></table></td></tr>`}`;
}

const newsletter = {
  file: "newsletter.html",
  title: "The monthly letter",
  kind: "Marketing",
  trigger:
    "Sent by hand from Admin → Newsletter, once a month, usually the first week.",
  subject: "A coat of paint, and the September dates",
  preheader:
    "The garden room is repainted and the chair has moved nearer the window. Nothing about the hour has changed.",
  html: doc({
    subject: "A coat of paint, and the September dates",
    preheader:
      "The garden room is repainted and the chair has moved nearer the window. Nothing about the hour has changed.",
    sections: [
      masthead("The monthly letter · August"),

      pool(
        /* BLOCK: heading — swappable */
        display("The room has had a coat of paint.", { pad: "0 0 22px" }) +
          /* /BLOCK */
          /* BLOCK: paragraph — repeatable */
          para(
            "We repainted the garden room over the summer and moved the chair nearer the window. Nothing about the hour itself has changed — you still keep your clothes on, and nobody touches you without asking first.",
          ) +
          para(
            "The lamp is in the same corner. The chair is a foot to the left of where it was, which is the only thing anyone has said out loud about it, and only twice.",
            { pad: "0" },
          ),
        /* /BLOCK */
        { pad: "42px 44px 34px" },
      ),

      /* BLOCK: image — swappable. A real <img>, never a background: a plate
         built from a background-image is a white void in Outlook. The alt is
         a sentence somebody could read instead of the picture, not a filename.

         The img carries the plum as its own background-color, which does
         nothing at all when the picture loads and turns the reserved box into
         a deliberate dark band with blush type on it when it does not. Without
         it, images-off leaves 341px of empty blush — the one place in these
         templates where a missing picture cost the composition. */
      pool(
        `<img class="shot" src="${SITE}/media/window-last-light-1200.jpg" width="512" height="341" alt="Last light through the garden-room window at dusk." style="display:block;border:0;width:512px;max-width:100%;height:auto;background-color:${SURFACE};font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${PLATE_SOFT};">` +
          `<p style="margin:0;padding:12px 0 0;font-family:${BODY};font-size:${FS}px;line-height:1.5;color:${INK_SOFT};">The window, about six o'clock, before anybody arrives.</p>`,
        { pad: "0 44px 34px" },
      ),
      /* /BLOCK */

      /* BLOCK: paragraph */
      pool(
        para(
          "September is when the courses start again. Three things are open. The dates and the prices are below, the same ones that are on the page — if a date has gone, ask, because most of them run again.",
          { pad: "0" },
        ),
        { pad: "0 44px 30px" },
      ),
      /* /BLOCK */

      /* BLOCK: upcoming offerings — pulls live dates and prices at send */
      pool(
        eyebrow("What's open", { pad: "0 0 20px" }) +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${OFFERINGS.map((o, i) => offeringRow(o, i === OFFERINGS.length - 1)).join("")}</table>`,
        { pad: "0 44px 32px" },
      ),
      /* /BLOCK */

      /* BLOCK: button */
      pool(button("See everything that's open", `${SITE}/offerings`), {
        pad: "0 44px 40px",
      }),
      /* /BLOCK */

      /* BLOCK: attached document — optional; drop the whole plate when there
         is nothing attached. On the plum so it reads as an aside to the
         letter rather than another beat of it. */
      plate(
        eyebrow("Also with this letter", { on: "plate", pad: "0 0 12px" }) +
          display("Grounding practices you can do at home", {
            size: 26,
            on: "plate",
            cls: "d3",
            pad: "0 0 8px",
          }) +
          note("Six short exercises, one page each. A PDF, four pages.", {
            on: "plate",
            pad: "0 0 18px",
          }) +
          `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;"><a href="${SITE}/documents/grounding-practices" style="color:${GOLD};text-decoration:underline;text-underline-offset:3px;">Download it</a></p>`,
        { pad: "34px 44px 36px", bg: SURFACE },
      ),
      /* /BLOCK */

      footer({
        why: "You are getting this because you asked for The Field Work's monthly letter. One page, once a month.",
        unsubscribe: `${SITE}/unsubscribe/9c1f4a7be2`,
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   2 · BOOKING CONFIRMATION
   Wording carried from src/lib/email/bookings.ts::confirmationEmail — the
   workshop branch, nothing outstanding.
   ═══════════════════════════════════════════════════════════════════════════ */

const CANCEL_LINK = `${SITE}/cancel/9f4c2ab7d1`;

const confirmation = {
  file: "booking-confirmation.html",
  title: "Booking confirmation",
  kind: "Transactional",
  trigger:
    "On the Stripe payment_intent.succeeded webhook for a workshop or course place — confirmationEmail() in src/lib/email/bookings.ts.",
  subject: "Your place on Reading the Field — Sat 20 Sep",
  preheader:
    "Saturday 20 September, 10:00–16:30. The Garden Room, Frome. Reference TFW-4417.",
  html: doc({
    subject: "Your place on Reading the Field — Sat 20 Sep",
    preheader:
      "Saturday 20 September, 10:00–16:30. The Garden Room, Frome. Reference TFW-4417.",
    sections: [
      masthead("Your place is booked"),

      pool(
        display(
          "Thank you. Two places on Reading the Field are booked.",
          { pad: "0 0 28px" },
        ) +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="stack"><tr>
            <td width="50%" valign="top" style="width:50%;padding:0 20px 0 0;">${fact("When", ["Saturday 20 September", "10:00–16:30"])}</td>
            <td width="50%" valign="top" class="gap" style="width:50%;padding:0;">${fact("Where", ["The Garden Room", "Fromefield", "Frome BA11"])}</td>
          </tr></table>`,
        { pad: "42px 44px 38px" },
      ),

      /* The money, on the plate. The figure is blush, not gold: an amount is a
         fact, and no fact in this design is ever set in a colour that a forced
         inversion would take to 1.6:1. */
      plate(
        eyebrow("What you paid", { on: "plate", pad: "0 0 12px" }) +
          figure("£190.00") +
          note("Two places · paid", { on: "plate", pad: "10px 0 0" }) +
          `<p style="margin:0;padding:16px 0 0;font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${PLATE_SOFT};">Reference TFW-4417</p>`,
        { pad: "34px 44px 36px" },
      ),

      pool(
        eyebrow("If you cannot come", { pad: "0 0 18px" }) +
          button("Cancel this booking", CANCEL_LINK) +
          bareLink(CANCEL_LINK) +
          rule({ pad: "26px 0 22px" }) +
          para(
            "Cancel by <strong style=\"font-weight:600;\">Saturday 6 September</strong> and you are refunded in full. After that the place is held for you and cannot be refunded, though you are still welcome to use the link to say you are not coming.",
          ) +
          note(
            "Keep this email. That link is the only one, and you do not need to ask anyone to use it.",
            { pad: "0" },
          ),
        { pad: "38px 44px 42px" },
      ),

      footer({
        why: "You are getting this because you booked a place. It is your confirmation, not a mailing list.",
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   3 · SESSION REQUEST RECEIVED
   Wording carried from src/lib/email/service-requests.ts::
   requestAcknowledgementEmail — the branch where a slot WAS chosen, which is
   the one whose promise changed at D-26: the time is held, it is not booked,
   and nothing has been charged.
   ═══════════════════════════════════════════════════════════════════════════ */

const acknowledgement = {
  file: "session-request-received.html",
  title: "Session request received",
  kind: "Transactional",
  trigger:
    "The moment the request form is submitted — requestAcknowledgementEmail() in src/lib/email/service-requests.ts.",
  subject: "Your request — First session, with time to ask",
  preheader:
    "Thursday 21 August, 10:00–11:30 is held while she decides. It is not booked and nothing has been charged.",
  html: doc({
    subject: "Your request — First session, with time to ask",
    preheader:
      "Thursday 21 August, 10:00–11:30 is held while she decides. It is not booked and nothing has been charged.",
    sections: [
      masthead("Your request has arrived"),

      pool(
        display(
          "Thank you. Your message about First session, with time to ask has arrived, and Marianne will read it and write back herself.",
          { size: 30, pad: "0" },
        ),
        { pad: "42px 44px 34px" },
      ),

      /* The one thing this message exists to say, and the one thing somebody
         will get wrong if it is not said before they can assume otherwise. On
         the plate, in blush, at display size — it is the message, not a note
         attached to it. */
      plate(
        eyebrow("That time is held while she decides", {
          on: "plate",
          pad: "0 0 16px",
        }) +
          display("Nobody else is being offered it.", {
            size: 30,
            on: "plate",
            cls: "d3",
            pad: "0 0 16px",
          }) +
          para(
            "It is <strong style=\"font-weight:600;color:#FBF3F1;\">not</strong> booked and nothing has been charged — she may still write back and suggest another time — but it is not going anywhere in the meantime.",
            { on: "plate", pad: "0" },
          ),
        { pad: "34px 44px 36px" },
      ),

      pool(
        fact("What you asked for", [
          "First session, with time to ask",
          `<span style="color:${INK_SOFT};">90 minutes · £95 · The garden room</span>`,
        ]) +
          rule() +
          fact("The time you chose", ["Thursday 21 August, 10:00–11:30"]) +
          rule() +
          fact("What you wrote", [
            `<span style="color:${INK_SOFT};">“I have been reading the page since about March. I would rather ask the questions in the room than by email, if that is all right.”</span>`,
          ]) +
          rule() +
          note("If any of that is wrong, reply to this email and say so.", {
            pad: "0 0 14px",
          }) +
          `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;">${inPool(`${SITE}/services/first-session`, "Read the page again")}</p>`,
        { pad: "38px 44px 42px" },
      ),

      footer({
        why: "You are getting this because you asked about a session. It is the acknowledgement, not a mailing list.",
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   4 · SESSION APPROVED, WITH THE PAYMENT LINK
   Wording carried from service-requests.ts::approvalEmail. The deadline is
   said TWICE — once beside the amount and once under the link — because it is
   the only thing here that takes something away, and somebody skimming for the
   link should not have to have read the paragraph above it.
   ═══════════════════════════════════════════════════════════════════════════ */

const PAY_LINK = `${SITE}/pay/2f8ad1c6e0`;

const approval = {
  file: "session-approved.html",
  title: "Session approved, with the payment link",
  kind: "Transactional",
  trigger:
    "When Marianne approves a request in Admin → Requests — approvalEmail() in src/lib/email/service-requests.ts.",
  subject: "Yes — First session, with time to ask, Thursday the 21st at 10",
  preheader:
    "£95.00, by Saturday 16 August, 5:12pm. After that the link stops working and the time goes back to her.",
  html: doc({
    subject: "Yes — First session, with time to ask, Thursday the 21st at 10",
    preheader:
      "£95.00, by Saturday 16 August, 5:12pm. After that the link stops working and the time goes back to her.",
    sections: [
      masthead("She has said yes"),

      pool(
        display("Sarah — yes, let’s do this.", { pad: "0 0 26px" }) +
          fact("What", [
            "First session, with time to ask",
            `<span style="color:${INK_SOFT};">90 minutes · The garden room</span>`,
          ]) +
          rule() +
          fact("When", ["Thursday the 21st at 10, at the garden room"]),
        { pad: "42px 44px 38px" },
      ),

      plate(
        eyebrow("To pay", { on: "plate", pad: "0 0 14px" }) +
          figure("£95.00") +
          note(
            "by <strong style=\"font-weight:600;color:#FBF3F1;\">Saturday 16 August, 5:12pm</strong>.",
            { on: "plate", pad: "12px 0 0" },
          ),
        { pad: "34px 44px 32px" },
      ),

      pool(
        button("Pay for this session", PAY_LINK) +
          bareLink(PAY_LINK) +
          rule({ pad: "26px 0 22px" }) +
          para(
            "The link opens a page on The Field Work and payment is taken by Stripe. Your card details are typed on their page and never reach this site.",
          ) +
          para(
            "<strong style=\"font-weight:600;\">If it is not paid by then</strong> the time goes back to Marianne and this link stops working. Nothing will have been charged, and nothing else happens — write to her and she will sort out another time.",
          ) +
          note(
            "If anything above is wrong, reply to this email before you pay. It reaches her.",
            { pad: "0" },
          ),
        { pad: "36px 44px 42px" },
      ),

      footer({
        why: "You are getting this because you asked about a session and Marianne has answered. It is her reply, not a mailing list.",
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   5 · BALANCE DUE
   ---------------------------------------------------------------------------
   THE APP DOES NOT CURRENTLY SEND THIS, AND THAT IS ON PURPOSE. bookings.ts
   puts the balance link inside the confirmation on the day the deposit is
   paid, and says why: "A reminder mailed on the day would be a job that has to
   fire; this is a link that has to be kept" (D-23). Nothing in the app runs on
   a schedule.

   So this template is the same wording lifted out of confirmationEmail's
   PAYING THE REST section and given its own envelope, for Marianne to send by
   hand from the bookings page when somebody has forgotten. Wiring it to fire
   automatically needs a scheduler that does not exist — see README.
   ═══════════════════════════════════════════════════════════════════════════ */

const BALANCE_LINK = `${SITE}/balance/7a3e9d0c45`;

const balance = {
  file: "balance-due.html",
  title: "Balance due",
  kind: "Transactional",
  trigger:
    "No automatic trigger — sent by hand. The app ships this link inside the confirmation instead (D-23); see README.",
  subject: "£330.00 still to pay on Aura Healing: Foundations",
  preheader:
    "Due by Monday 8 September. The link works from today and will tell you if it has already been paid.",
  html: doc({
    subject: "£330.00 still to pay on Aura Healing: Foundations",
    preheader:
      "Due by Monday 8 September. The link works from today and will tell you if it has already been paid.",
    sections: [
      masthead("There is a balance to pay"),

      pool(
        display("One place on Aura Healing: Foundations is booked.", {
          pad: "0 0 22px",
        }) +
          para(
            "The deposit is paid and the place is yours. What is left is the rest of the course fee, and the link below has been live since the day you booked.",
            { pad: "0" },
          ),
        { pad: "42px 44px 34px" },
      ),

      plate(
        eyebrow("Still to pay", { on: "plate", pad: "0 0 12px" }) +
          figure("£330.00") +
          note(
            "by <strong style=\"font-weight:600;color:#FBF3F1;\">Monday 8 September</strong>.",
            { on: "plate", pad: "12px 0 20px" },
          ) +
          rule({ on: "plate", pad: "0 0 18px" }) +
          `<p style="margin:0;padding:0 0 4px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};font-variant-numeric:tabular-nums lining-nums;">One place · £480.00 for the whole run</p>` +
          `<p style="margin:0;padding:0 0 4px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};font-variant-numeric:tabular-nums lining-nums;">£150.00 deposit paid</p>` +
          `<p style="margin:0;padding:0 0 14px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${POOL};font-variant-numeric:tabular-nums lining-nums;">£330.00 still to pay, by Monday 8 September</p>` +
          `<p style="margin:0;padding:0;font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${PLATE_SOFT};">Reference TFW-4392</p>`,
        { pad: "34px 44px 36px" },
      ),

      pool(
        eyebrow("Paying the rest", { pad: "0 0 18px" }) +
          button("Pay the balance", BALANCE_LINK) +
          bareLink(BALANCE_LINK) +
          rule({ pad: "26px 0 22px" }) +
          para(
            "£330.00 is due by <strong style=\"font-weight:600;\">Monday 8 September</strong>. The link works from today — pay it whenever you like, and it will tell you if it has already been paid. Your place is held until then.",
          ) +
          para(
            "If the balance is not paid by that date the place is released, and somebody else can take it.",
          ) +
          note(
            "It is the same link that was in your first email. You do not need to ask anyone to use it.",
            { pad: "0" },
          ),
        { pad: "38px 44px 42px" },
      ),

      footer({
        why: "You are getting this because you have a place on a course with a balance outstanding. It is about your booking, not a mailing list.",
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   6 · CANCELLED AND REFUNDED
   Wording carried from bookings.ts::cancellationEmail — cancelled by the buyer,
   status cancelledRefunded, refund a minute old.
   ═══════════════════════════════════════════════════════════════════════════ */

const cancelled = {
  file: "cancelled-refunded.html",
  title: "Cancelled and refunded",
  kind: "Transactional",
  trigger:
    "When the cancellation link is used and the Stripe refund goes through — cancellationEmail() in src/lib/email/bookings.ts.",
  subject: "Cancelled — Reading the Field, Sat 20 Sep",
  preheader:
    "£190.00 is on its way back to the card you paid with. Nothing further is needed from you.",
  html: doc({
    subject: "Cancelled — Reading the Field, Sat 20 Sep",
    preheader:
      "£190.00 is on its way back to the card you paid with. Nothing further is needed from you.",
    sections: [
      masthead("Cancelled"),

      pool(
        display("Two places on Reading the Field, Sat 20 Sep, are cancelled.", {
          pad: "0",
        }),
        { pad: "42px 44px 34px" },
      ),

      plate(
        eyebrow("On its way back", { on: "plate", pad: "0 0 12px" }) +
          figure("£190.00") +
          note("to the card you paid with.", {
            on: "plate",
            pad: "12px 0 18px",
          }) +
          rule({ on: "plate", pad: "0 0 18px" }) +
          `<p style="margin:0;padding:0 0 4px;font-family:${BODY};font-size:${FS}px;line-height:1.6;color:${PLATE_SOFT};">Stripe usually takes five to ten working days to show it.</p>` +
          `<p style="margin:0;padding:14px 0 0;font-family:${MONO};font-size:${FS}px;line-height:1.5;color:${PLATE_SOFT};">Reference TFW-4417</p>`,
        { pad: "34px 44px 36px" },
      ),

      pool(
        display("Nothing further is needed from you.", {
          size: 26,
          cls: "d3",
          pad: "0 0 16px",
        }) +
          para(
            "The place is free for somebody else, and Marianne knows not to expect you. If the money has not appeared after ten working days, reply to this email and it reaches her.",
            { pad: "0 0 22px" },
          ) +
          `<p style="margin:0;padding:0;font-family:${BODY};font-size:${FS}px;line-height:1.6;">${inPool(`${SITE}/workshops`, "See what else is on")}</p>`,
        { pad: "38px 44px 42px" },
      ),

      footer({
        why: "You are getting this because a booking of yours was cancelled. It is the record of it, not a mailing list.",
      }),
    ],
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   The contact sheet
   ═══════════════════════════════════════════════════════════════════════════ */

const TEMPLATES = [
  newsletter,
  confirmation,
  acknowledgement,
  approval,
  balance,
  cancelled,
];

function contactSheet() {
  const rows = TEMPLATES.map(
    (t) => `      <li class="row">
        <p class="kind">${t.kind}</p>
        <h2><a href="./${t.file}">${esc(t.title)}</a></h2>
        <p class="lbl">Subject</p>
        <p class="val">${esc(t.subject)}</p>
        <p class="lbl">Preheader</p>
        <p class="val dim">${esc(t.preheader)}</p>
        <p class="lbl">Sent</p>
        <p class="val dim">${esc(t.trigger)}</p>
      </li>`,
  ).join("\n");

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Email templates · The Field Work</title>
<style>
  :root { --ground:${GROUND}; --pool:${POOL}; --ink:${INK}; --ink-soft:${INK_SOFT};
          --gold:${GOLD}; --action:${ACTION}; --soft:${PLATE_SOFT}; --rule:${PLATE_RULE};
          --gut: clamp(22px,5.4vw,92px); }
  * { box-sizing:border-box; }
  html,body { margin:0; padding:0; }
  body { background:var(--ground); color:var(--pool);
         font-family:${BODY}; font-size:17px; line-height:1.6; }
  header { padding:clamp(48px,8vh,96px) var(--gut) clamp(32px,5vh,56px); }
  .eyebrow { font-size:17px; letter-spacing:0.18em; text-transform:uppercase;
             font-weight:600; color:var(--gold); margin:0 0 18px; }
  h1 { font-family:${DISPLAY}; font-weight:400; font-size:clamp(38px,6vw,64px);
       line-height:1.08; letter-spacing:-0.005em; margin:0 0 20px; max-width:20ch; }
  header p { max-width:66ch; color:var(--soft); margin:0; }
  ul { list-style:none; margin:0; padding:0 var(--gut) clamp(64px,10vh,120px);
       display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:1px;
       background:var(--rule); border-top:1px solid var(--rule); }
  .row { background:var(--pool); color:var(--ink); padding:34px 32px 36px; }
  .kind { font-size:17px; letter-spacing:0.18em; text-transform:uppercase;
          font-weight:600; color:var(--action); margin:0 0 14px; }
  .row h2 { font-family:${DISPLAY}; font-weight:400; font-size:32px; line-height:1.1;
            margin:0 0 22px; }
  .row h2 a { color:var(--ink); text-decoration:none;
              border-bottom:1px solid var(--action); padding-bottom:3px; }
  .row h2 a:hover { color:var(--action); }
  .lbl { font-size:17px; letter-spacing:0.18em; text-transform:uppercase;
         font-weight:600; color:var(--action); margin:0 0 6px; }
  .val { margin:0 0 18px; max-width:52ch; }
  .val:last-child { margin-bottom:0; }
  .dim { color:var(--ink-soft); }
  footer { padding:0 var(--gut) clamp(64px,10vh,110px); color:var(--soft); max-width:74ch; }
  footer a { color:var(--gold); }
  a:focus-visible { outline:3px solid var(--gold); outline-offset:3px; }
</style>
</head>
<body>
<header>
  <p class="eyebrow">Design record</p>
  <h1>Email templates</h1>
  <p>Six branded messages. Five are transactional — the app sends them off the back of something somebody did, and their wording is carried across from <code>src/lib/email/bookings.ts</code> and <code>src/lib/email/service-requests.ts</code>. One is marketing: the monthly letter, which Marianne writes and sends herself.</p>
</header>
<ul>
${rows}
</ul>
<footer>
  <p>These are static mockups at 600px, not app code. Nothing here is wired in — the app currently sends plain text. See <a href="./README.md">README.md</a> for what has to change when they become real, and <code>shots/</code> for the rendered proofs at 600px and 375px, with images on and off.</p>
</footer>
</body>
</html>
`;
}

/* ── emit ────────────────────────────────────────────────────────────────── */

mkdirSync(HERE, { recursive: true });
for (const t of TEMPLATES) {
  writeFileSync(join(HERE, t.file), t.html, "utf8");
  console.log("wrote", t.file, `${(t.html.length / 1024).toFixed(1)}kB`);
}
writeFileSync(join(HERE, "index.html"), contactSheet(), "utf8");
console.log("wrote index.html");

export { TEMPLATES, SITE };
