# Asset Inventory

<!-- assetMode: standard -->
<!-- styleCount: 10 -->
<!-- worker: analyze/assets (phase 3b) -->
<!-- NEEDS CLARIFICATION: styles.md was authored CONCURRENTLY with this file by a sibling worker. The Style 1..10 numbering below is POSITIONAL, not a join key — each block states the register it assumed. /stylesheet MUST reconcile: match each direction in styles.md to the block whose assumed register fits, then take that block's fonts + icons + weights. Where a palette here disagrees with styles.md, styles.md wins. -->

## How to read the numbering

Ten typographic directions, derived from `brief.md` §2 + `assets/brand/README.md`

- `competitors.md`. **The numbers are positional slots, not identities.** Each
  block opens with the register it assumed (e.g. "night-side warm editorial"). At
  `/stylesheet`, map each of styles.md's directions onto the block whose register
  matches and carry that block's type + icon + weight decisions across. Do not
  assume Style 4 here is Style 4 there.

Everything below is a **URL recommendation**. Nothing has been downloaded. Font
and icon acquisition happens at `/mockups` (partial) and `/stylesheet` (full).

---

## Existing User Assets

### Logos

| File                        | viewBox     | Format | Location        | Note                                                    |
| --------------------------- | ----------- | ------ | --------------- | ------------------------------------------------------- |
| `logo-primary.svg`          | 0 0 300 329 | SVG    | `assets/brand/` | Stacked lockup (mark over wordmark). Dark grounds.      |
| `logo-primary-light.svg`    | 0 0 300 329 | SVG    | `assets/brand/` | Stacked lockup, deepened gradient. Light grounds.       |
| `logo-horizontal.svg`       | 0 0 440 120 | SVG    | `assets/brand/` | Horizontal lockup. Dark grounds.                        |
| `logo-horizontal-light.svg` | 0 0 440 120 | SVG    | `assets/brand/` | Horizontal lockup. Light grounds.                       |
| `logo-mark.svg`             | 0 0 200 225 | SVG    | `assets/brand/` | Mark only, transparent. Dark grounds.                   |
| `logo-mark-light.svg`       | 0 0 200 225 | SVG    | `assets/brand/` | Mark only, deepened gradient. Light grounds.            |
| `TheFileWork.png`           | 425×357     | PNG    | `assets/`       | Client's original artwork. Every SVG is traced from it. |

**Path warning (from the inventory, repeated because it bites):** logos live in
`assets/brand/`, **not** `assets/logos/`. Read the paths; do not assume the
canonical slot.

**The wordmark is set in a Cormorant-family display face** (`assets/brand/README.md`
§Type). That is a fact about the artwork, not a mandate for the site. It is,
however, a _constraint on every heading face below_ — see each block's **Logo fit**
line. Two high-contrast garalde serifs in the same viewport compete and both lose.

### Icons

**None.** `asset-inventory.json.icons: []`. Every icon on this project comes from
a recommended library. This is an open design decision.

### Fonts

**None.** `asset-inventory.json.fonts: []`. No font files, no licences inherited,
no foundry relationship to honour. Every face below is a recommendation and every
licence below is therefore ours to get right.

### Wireframes

**None.** `asset-inventory.json.wireframes: []`. No wireframe digest is emitted
for this project (feat-103 step 6h skipped). Layout is derived from the brief's
seven-beat structure (§11), not from supplied frames.

### Photographic plates (commissioned — the project's entire imagery pool)

| File                        | Dimensions | Role                                                                                                                        |
| --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `aura-two-people.png`       | 2528×1696  | Beat 1 (Root). Hands hovering above a **seated, fully clothed** person — does the reassurance work faster than the copy.    |
| `aura-light-in-a-room.png`  | 2528×1696  | Beat 2 (Sacral). A real domestic interior, not a spa.                                                                       |
| `aura-radiant-portrait.png` | 2528×1696  | Beat 7 (Crown). The brightest point of the page, at the CTA.                                                                |
| `aura-seated-figure.png`    | 2528×1696  | Reserve.                                                                                                                    |
| `aura-field-abstract.png`   | 2752×1536  | Selectable page background (§12). Carries the dark world without competing.                                                 |
| `aura-hands-between.png`    | 2528×1696  | **RESERVE ONLY.** Commissioned but reads as the category's single most-reproduced composition. Never a hero or beat anchor. |

**No stock imagery is to be acquired for this project.** The pool is closed and
it is commissioned. `competitors.md` measured the category's imagery default —
soft-focus interiors, crystals, hands, candles — and the supplied plates were
art-directed to sit outside it. An Unsplash fetch would drag the site back into
the cliché it was commissioned to escape.

### Brand colour record

`assets/brand/README.md` is authoritative. Eleven sampled values with computed
contrast. Restated here as a Designer convenience only — the README is the source
of truth and it says _re-measure before trusting any claim in it_.

```json
{
  "plum-900": "#1E0A1C",
  "plum-800": "#2B0E28",
  "plum-700": "#3A1233",
  "gold": "#E9C87E",
  "gold-deep": "#C99A3F",
  "coral": "#F5876F",
  "rose": "#E85D9B",
  "magenta": "#D6338A",
  "magenta-deep": "#C2187A",
  "blush": "#FBF3F1",
  "ivory": "#FDFAF7"
}
```

---

## Licence policy for this project

**Licence is load-bearing here, not paperwork.** `competitors.md` found a live
exposure in this exact category: Re:Mind Studio ships
`VCGaramondCondensed-Thin-Trial.otf` — a **trial-licensed** font — in production
on a commercial London studio site. That is the failure mode to design against.

**Permitted.** SIL Open Font Licence 1.1 (OFL), Apache 2.0, MIT, ISC, and the
Indian Type Foundry Free Font Licence (Fontshare). All permit commercial use and
self-hosted webfont embedding.

**Refused, without exception.** Anything named `*-Trial`, `*-Demo`,
`*-PersonalUse`; anything whose download page says "free for personal use";
anything whose licence page 404s or cannot be read; anything requiring
attribution in the rendered page (CC BY 4.0 — this rules out Font Awesome Free's
icon set and the Solar icon set as **icon** choices, see §Icon libraries to avoid).

**Provenance record — required at `/stylesheet`.** For every family and icon set
actually shipped, place the licence file next to the assets:
`assets/fonts/<family>/OFL.txt`, `assets/icons/<library>/LICENSE`. MIT, ISC and
Apache 2.0 all require the licence text to travel with the copied files, and a
sole practitioner has no legal department to reconstruct it later.

**Every face recommended below has a verified commercial licence.** Nineteen of
the twenty-one families are OFL 1.1 via Google Fonts; two (Style 9) are Fontshare
under the ITF Free Font Licence and are labelled as such.

---

## Legibility floor — the constraint that eliminates the category's default

Audience skews **35–65**, reading **in low light, on their own phone**, with
"reading glasses somewhere else in the house" (brief §2). Brief §15 sets zero AA
contrast failures and Lighthouse a11y ≥95 as ship conditions.

What that rules out, concretely:

- **No hairline or ultralight face as body type. Ever.** ExtraLight/Thin cuts are
  display-only, ≥40px, and even then only on a ground where they hold. Where a
  block below recommends a light weight it says so explicitly.
- **No high-contrast didone-ish serif as body type.** The thin strokes of
  Cormorant / Playfair / PP Editorial vanish at 17px, and they **bloom and close
  up on a dark ground** — the opposite failure, equally illegible. Every body face
  below is low-to-moderate contrast with a generous x-height and open apertures.
- **Body ≥17px on the public site** (brief floor is 16px; 17–18px is the honest
  reading of "reading glasses are elsewhere"). Line height ≥1.6 for prose.
- **On dark grounds, add weight.** A 400 that reads on blush reads thin on
  `#2B0E28` — light-on-dark optically thins. Body on dark grounds: 420–450 if the
  face is variable, 500 if it is static.
- **Icon strokes ≥1.5px at a 24px render** on dark grounds, ≥24px render size
  everywhere, ≥44px touch target (brief §2). 15px-grid icon sets are excluded on
  this basis alone.

---

## Style 1 Assets

**Assumed register: night-side warm editorial** — the brief's own preference
(`#2B0E28` ground, §20), soft old-style display over a calm humanist sans.

### Fonts

| Usage    | Family             | Source                                                     | Weights available                                        | Variable         | Fontsource                            | Licence |
| -------- | ------------------ | ---------------------------------------------------------- | -------------------------------------------------------- | ---------------- | ------------------------------------- | ------- |
| Headings | **Fraunces**       | https://fonts.google.com/specimen/Fraunces                 | 100–900 + italic; `opsz` 9–144, `SOFT` 0–100, `WONK` 0–1 | Yes (multi-axis) | `@fontsource-variable/fraunces`       | OFL 1.1 |
| Body     | **Hanken Grotesk** | https://fonts.google.com/specimen/Hanken+Grotesk           | 100–900 + italic                                         | Yes (`wght`)     | `@fontsource-variable/hanken-grotesk` | OFL 1.1 |
| Mono     | — none —           | Use `font-variant-numeric: tabular-nums` on Hanken Grotesk | —                                                        | —                | —                                     | —       |

Fraunces settings that do the work: `opsz` at the rendered size (this is the axis
most designers leave at default and it is the whole point of the family), `SOFT`
40–70 for warmth, `WONK: 0` — the wonky cut is charming and undercuts "quietly
certain". Weight 500–600 for headings on dark; never below 400.

### Icons

- **Library**: Phosphor Icons — six weights including Regular and Bold, warm
  rounded terminals
- **URL**: https://phosphoricons.com · repo https://github.com/phosphor-icons/homepage
- **Licence**: MIT
- **Weight on dark grounds**: Phosphor **Bold** at 24px, not Regular — Regular's
  1.5px stroke is the floor, Bold clears it comfortably against `#2B0E28`
- **Key icons needed**: the canonical set in §Key Icons. Phosphor-specific names
  for the load-bearing ones: `calendar-blank`, `clock`, `map-pin`, `users-three`
  (capacity), `envelope-simple`, `check-circle`, `warning-circle` (slot-taken),
  `arrow-right`, `eye` / `eye-slash` (beat visibility), `paper-plane-tilt` (send)

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#E9C87E",
  "secondary": "#C2187A",
  "accent": "#F5876F",
  "background": "#2B0E28",
  "surface": "#3A1233",
  "textPrimary": "#FDFAF7",
  "textSecondary": "#C9B6C4",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

**Why this pairing.** Fraunces is warm without being soft — it has the weight and
the old-style skeleton to sound like someone who has done this for fifteen years,
and none of the breathless ultralight prettiness the category defaults to. Hanken
Grotesk underneath is unhurried and completely legible at 18px on plum, which is
what a 50-year-old reading at 11pm on a phone actually needs.

**Logo fit.** Good. Fraunces is low-contrast where the Cormorant wordmark is
high-contrast, so they read as two registers of the same century rather than as
two faces fighting. Keep Fraunces off the lockup's own line.

---

## Style 2 Assets

**Assumed register: plain speech** — light blush ground, honesty-first, sans
headline over a reading serif. The register of a serious person telling you
exactly what happens.

### Fonts

| Usage    | Family                | Source                                              | Weights available             | Variable            | Fontsource                               | Licence |
| -------- | --------------------- | --------------------------------------------------- | ----------------------------- | ------------------- | ---------------------------------------- | ------- |
| Headings | **Schibsted Grotesk** | https://fonts.google.com/specimen/Schibsted+Grotesk | 400–900 + italic              | Yes (`wght`)        | `@fontsource-variable/schibsted-grotesk` | OFL 1.1 |
| Body     | **Literata**          | https://fonts.google.com/specimen/Literata          | 200–900 + italic; `opsz` 7–72 | Yes (`wght`,`opsz`) | `@fontsource-variable/literata`          | OFL 1.1 |
| Mono     | — none —              | Tabular figures from Literata                       | —                             | —                   | —                                        | —       |

### Icons

- **Library**: Lucide — the maintained fork of Feather; plain, unfussy, 24px grid
- **URL**: https://lucide.dev
- **Licence**: ISC
- **Stroke**: default 2px holds well on a light ground; do not thin it to 1.5
- **Key icons needed**: §Key Icons. Lucide names are the canonical vocabulary used
  in that section — this style needs no translation table.

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#C2187A",
  "secondary": "#2B0E28",
  "accent": "#E9C87E",
  "background": "#FBF3F1",
  "surface": "#FFFFFF",
  "textPrimary": "#1E0A1C",
  "textSecondary": "#5C4A57",
  "error": "#B3122E",
  "success": "#1F6B4A"
}
```

`accent` gold is a **non-text colour on this ground** (1.47:1) — rules, edges,
marks and fills only, per the README.

**Why this pairing.** Literata was drawn for long-form reading on screens and it
shows: big x-height, open counters, and it stays comfortable at 18px for the beat
copy that has to do the reassurance work. A grotesk headline over a reading serif
is the register of reportage, not of a spa brochure — it says _this is information
you can trust_ to a visitor whose real question is whether this is serious.

**Logo fit.** Excellent. Schibsted Grotesk is neutral enough to leave the Cormorant
wordmark as the only calligraphic voice on the page, which is exactly what a
single-wordmark brand wants.

---

## Style 3 Assets

**Assumed register: expansive / the field** — width as the signature move, deep
`#1E0A1C` ground, type stretched to feel like space rather than decorated to
feel like it.

### Fonts

| Usage    | Family              | Source                                            | Weights available               | Variable            | Fontsource                             | Licence |
| -------- | ------------------- | ------------------------------------------------- | ------------------------------- | ------------------- | -------------------------------------- | ------- |
| Headings | **Archivo**         | https://fonts.google.com/specimen/Archivo         | 100–900 + italic; `wdth` 62–125 | Yes (`wght`,`wdth`) | `@fontsource-variable/archivo`         | OFL 1.1 |
| Body     | **Source Serif 4**  | https://fonts.google.com/specimen/Source+Serif+4  | 200–900 + italic; `opsz` 8–60   | Yes (`wght`,`opsz`) | `@fontsource-variable/source-serif-4`  | OFL 1.1 |
| Mono     | **Source Code Pro** | https://fonts.google.com/specimen/Source+Code+Pro | 200–900 + italic                | Yes (`wght`)        | `@fontsource-variable/source-code-pro` | OFL 1.1 |

Mono is **admin-only** here — the calendar time gutter and the bookings queue.
It never appears on a public screen. Family-matched to Source Serif 4, so it
costs one design decision rather than two.

**The width axis is the direction, not a garnish.** `wdth: 112–125` on the beat
headings, `wdth: 100` everywhere else. Do **not** reach for a condensed cut —
`competitors.md` flags that a dark-plum site with a condensed display face reads
as an Othership (`#372338`) derivative.

### Icons

- **Library**: Iconoir — geometric, generous, 24px grid, open forms
- **URL**: https://iconoir.com · repo https://github.com/iconoir-icons/iconoir
- **Licence**: MIT
- **Stroke**: Iconoir ships 1.5px. On `#1E0A1C` that is the floor — render at 28px
  in nav and 24px minimum inline, and verify against the ground before shipping.
- **Key icons needed**: §Key Icons. Iconoir names differ: `calendar` → `calendar`,
  `clock` → `clock`, `map-pin` → `map-pin`, `users` → `group`, `chevron-right` →
  `nav-arrow-right`, `alert-circle` → `warning-circle`, `eye-off` → `eye-closed`.

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#E9C87E",
  "secondary": "#E85D9B",
  "accent": "#F5876F",
  "background": "#1E0A1C",
  "surface": "#2B0E28",
  "textPrimary": "#FBF3F1",
  "textSecondary": "#C9B6C4",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

**Why this pairing.** Expansiveness is the one thing the brief asks for that
almost nothing in the category attempts, and a width axis delivers it without a
single decorative effect. Source Serif 4 underneath keeps the prose warm and human
so the width reads as _space_, not as a tech company's hero.

**Logo fit.** Good at `wdth ≥ 112`, where Archivo stops resembling a general-purpose
grotesque. Keep the horizontal lockup well clear of a wide heading — two wide
elements on one line flatten each other.

---

## Style 4 Assets

**Assumed register: the wordmark extended** — the logo's own face promoted to
display type, gold on plum, devotional without being churchy.

### Fonts

| Usage    | Family                 | Source                                               | Weights available                 | Variable                                                                    | Fontsource                       | Licence |
| -------- | ---------------------- | ---------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------- | -------------------------------- | ------- |
| Headings | **Cormorant Garamond** | https://fonts.google.com/specimen/Cormorant+Garamond | 300, 400, 500, 600, 700 + italics | Verify on specimen — Google ships static cuts for this member of the family | `@fontsource/cormorant-garamond` | OFL 1.1 |
| Body     | **Faustina**           | https://fonts.google.com/specimen/Faustina           | 300–800 + italic                  | Yes (`wght`)                                                                | `@fontsource-variable/faustina`  | OFL 1.1 |
| Mono     | — none —               | Tabular figures from Faustina                        | —                                 | —                                                                           | —                                | —       |

**HARD CONSTRAINTS on Cormorant Garamond, because this is the face most likely to
break the legibility floor:**

- **Display only. ≥40px. Never body, never UI, never a form label, never the admin.**
- **Weight 500 or 600 on dark grounds — never 300.** Cormorant's Light hairlines
  disappear against `#2B0E28` at any size; the 300 cut is the single most common
  way this direction fails.
- Its x-height is small by design. Everything under 40px is Faustina's job.

### Icons

- **Library**: Remix Icon — line and fill pairs, slightly calligraphic terminals
- **URL**: https://remixicon.com · repo https://github.com/Remix-Design/RemixIcon
- **Licence**: Apache 2.0 (ship the `LICENSE` file alongside the SVGs)
- **Weight**: use the `-line` set at 24px on light surfaces, `-fill` for active
  nav states on dark
- **Key icons needed**: §Key Icons. Remix suffixes everything: `calendar-line`,
  `time-line`, `map-pin-line`, `group-line`, `mail-line`, `checkbox-circle-line`,
  `error-warning-line`, `eye-line` / `eye-off-line`, `send-plane-line`.

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#E9C87E",
  "secondary": "#C99A3F",
  "accent": "#D6338A",
  "background": "#2B0E28",
  "surface": "#1E0A1C",
  "textPrimary": "#FDFAF7",
  "textSecondary": "#CBB8A6",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

`accent` magenta `#D6338A` measures **3.93:1 on `#2B0E28`** — large text (≥24px,
or ≥18.66px bold) and non-text only. See §Computed contrast on dark grounds.

**Why this pairing.** This is the direction that lets the logo be the brand rather
than a sticker in the corner — the wordmark's own face setting the beat headings
makes the whole page feel authored by one hand. Faustina carries the reading load
with a big x-height, so the elegance costs the reader nothing.

**Logo fit.** Maximum harmony and the one real risk of this style: the page can
start to feel like a page-long logo. Mitigation — Cormorant Garamond on h1 and h2
only, everything else Faustina, and use `logo-mark.svg` (mark alone) in the sticky
header rather than the full lockup.

---

## Style 5 Assets

**Assumed register: practice, not spa** — ivory ground, documentary plainness,
the register of a professional's own working site rather than a wellness template.

### Fonts

| Usage    | Family                  | Source                                                | Weights available                    | Variable                                                                                                          | Fontsource                                                               | Licence |
| -------- | ----------------------- | ----------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| Headings | **Bricolage Grotesque** | https://fonts.google.com/specimen/Bricolage+Grotesque | 200–800; `wdth` 75–100, `opsz` 12–96 | Yes (multi-axis)                                                                                                  | `@fontsource-variable/bricolage-grotesque`                               | OFL 1.1 |
| Body     | **IBM Plex Sans**       | https://fonts.google.com/specimen/IBM+Plex+Sans       | 100–700 + italic                     | Static on Google Fonts; a variable cut ships in IBM's own release — verify the Fontsource package before assuming | `@fontsource/ibm-plex-sans` (check `@fontsource-variable/ibm-plex-sans`) | OFL 1.1 |
| Mono     | **IBM Plex Mono**       | https://fonts.google.com/specimen/IBM+Plex+Mono       | 100–700 + italic                     | Static                                                                                                            | `@fontsource/ibm-plex-mono`                                              | OFL 1.1 |

Mono here **is** the direction's signature — prices, durations, session dates and
the admin calendar's time gutter set in Plex Mono is what makes this read as a
practitioner's working document rather than a brochure. It earns its third family;
in most of the other nine directions it would not.

### Icons

- **Library**: Tabler Icons — 5,900+ icons, 24px grid, the deepest admin coverage
  of any permissive set (this brief has 14 admin screens)
- **URL**: https://tabler.io/icons · repo https://github.com/tabler/tabler-icons
- **Licence**: MIT
- **Stroke**: 1.75–2px on ivory
- **Key icons needed**: §Key Icons plus the admin-specific depth Tabler is chosen
  for: `calendar-week`, `calendar-month`, `clock-pause` (holds), `layout-grid`,
  `grip-vertical` (session reordering), `device-floppy`, `cloud-upload`,
  `alert-triangle` (unpublished changes), `mail-fast` (test send), `file-type-pdf`

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#C2187A",
  "secondary": "#3A1233",
  "accent": "#8A6A22",
  "background": "#FDFAF7",
  "surface": "#FFFFFF",
  "textPrimary": "#1E0A1C",
  "textSecondary": "#5C4A57",
  "error": "#B3122E",
  "success": "#1F6B4A"
}
```

`accent` `#8A6A22` is the README's **derived** light-ground gold (4.61:1) — the
only gold in this system that may be set as text on a light ground. It is not in
the artwork; using it is a deliberate extension, not a sample.

**Why this pairing.** Bricolage has just enough irregularity to sound like a person
and not a template, and Plex is the most credible-without-being-clinical body face
in open licensing — it reads as _someone who takes their work seriously_, which is
precisely the thing a sceptical 50-year-old is scanning for.

**Logo fit.** Fine. Keep Bricolage's `wdth` at 100 near the lockup; the condensed
cuts and a garalde wordmark are a period clash.

---

## Style 6 Assets

**Assumed register: apothecary warm** — mid-plum `#3A1233` ground, a workhorse
serif with display flair, herbal rather than cosmic.

### Fonts

| Usage    | Family           | Source                                         | Weights available                            | Variable         | Fontsource                          | Licence |
| -------- | ---------------- | ---------------------------------------------- | -------------------------------------------- | ---------------- | ----------------------------------- | ------- |
| Headings | **Petrona**      | https://fonts.google.com/specimen/Petrona      | 100–900 + italic                             | Yes (`wght`)     | `@fontsource-variable/petrona`      | OFL 1.1 |
| Body     | **Commissioner** | https://fonts.google.com/specimen/Commissioner | 100–900 + italic; `FLAR` 0–100, `VOLM` 0–100 | Yes (multi-axis) | `@fontsource-variable/commissioner` | OFL 1.1 |
| Mono     | — none —         | Tabular figures from Commissioner              | —                                            | —                | —                                   | —       |

Petrona at 300 or lighter is display-only and only above 44px; on `#3A1233` use
500+ for anything under that. Commissioner's `FLAR` (flare) axis at 20–40 adds a
trace of calligraphic warmth to the body without costing a second family — an
unusually cheap way to make a sans feel handmade.

**Ground note:** `#3A1233` is lighter than `#2B0E28`, so **every ratio drops**.
Gold on plum-700 computes at **9.91:1** (still comfortable); the muted text value
must be re-measured rather than inherited from the Style 1 block.

### Icons

- **Library**: Heroicons — outline / solid / mini, maintained by Tailwind Labs
- **URL**: https://heroicons.com · repo https://github.com/tailwindlabs/heroicons
- **Licence**: MIT
- **Weight**: **solid** at 24px for anything on the plum ground; outline only on
  light surfaces. Heroicons' outline stroke is 1.5px and it is marginal on mid-plum.
- **Key icons needed**: §Key Icons. Heroicons uses `bell`, `calendar-days`,
  `clock`, `map-pin`, `user-group`, `envelope`, `check-circle`,
  `exclamation-circle`, `eye` / `eye-slash`, `paper-airplane`.

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#E9C87E",
  "secondary": "#F5876F",
  "accent": "#C2187A",
  "background": "#3A1233",
  "surface": "#2B0E28",
  "textPrimary": "#FBF3F1",
  "textSecondary": "#C9B6C4",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

`accent` magenta-deep `#C2187A` measures **3.10:1 on `#2B0E28`** and lower on
`#3A1233` — on dark grounds it is a **fill and edge colour, not a text colour**.
The README's "light-ground text-safe magenta" does not invert.

**Why this pairing.** Warm, slightly old-fashioned, and completely unhurried —
this is the direction for a visitor who wants to feel they have walked into a room
someone has kept for a long time. Commissioner is quietly excellent on screen and
never raises its voice.

**Logo fit.** Good; Petrona and the Cormorant wordmark share a skeleton but sit at
opposite ends of the contrast scale, which reads as intentional rather than
accidental.

---

## Style 7 Assets

**Assumed register: long-form literary** — blush ground, ink-on-paper, a chunky
old-style display over a calligraphic reading serif. For a direction where the
copy carries the feeling.

### Fonts

| Usage    | Family          | Source                                        | Weights available | Variable     | Fontsource                      | Licence |
| -------- | --------------- | --------------------------------------------- | ----------------- | ------------ | ------------------------------- | ------- |
| Headings | **Young Serif** | https://fonts.google.com/specimen/Young+Serif | 400 only          | No           | `@fontsource/young-serif`       | OFL 1.1 |
| Body     | **Alegreya**    | https://fonts.google.com/specimen/Alegreya    | 400–900 + italic  | Yes (`wght`) | `@fontsource-variable/alegreya` | OFL 1.1 |
| Mono     | — none —        | Tabular figures from Alegreya                 | —                 | —            | —                               | —       |

Young Serif is a **single-weight display face**. That is a feature — one weight
means one voice — but it means no bold headings and no weight-based hierarchy in
the display layer; hierarchy comes from size and space. Confirm the direction wants
that before selecting it.

### Icons

- **Library**: Material Symbols — variable icon font with `wght`, `FILL`, `GRAD`
  and `opsz` axes
- **URL**: https://fonts.google.com/icons · repo https://github.com/google/material-design-icons
- **Licence**: Apache 2.0
- **Why this one, technically**: the `GRAD` axis exists precisely to compensate for
  optical thinning of light-on-dark icons. If any part of this direction inverts to
  a plum section, `GRAD: +50` restores the perceived stroke weight without changing
  the icon's size — no other permissive set has this control.
- **Key icons needed**: §Key Icons. Material names: `calendar_month`, `schedule`,
  `location_on`, `group`, `mail`, `check_circle`, `error`, `visibility` /
  `visibility_off`, `send`, `draft`.

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#2B0E28",
  "secondary": "#C2187A",
  "accent": "#C99A3F",
  "background": "#FBF3F1",
  "surface": "#FDFAF7",
  "textPrimary": "#1E0A1C",
  "textSecondary": "#5C4A57",
  "error": "#B3122E",
  "success": "#1F6B4A"
}
```

`accent` gold-deep `#C99A3F` is **2.35:1 on blush — non-text**. Rules, marks,
underlines and fills only.

**Why this pairing.** Alegreya was drawn for literature and it makes long prose
pleasurable rather than dutiful — which matters enormously here, because beats 1
and 5 (the reassurance and the "what this is not") are the two places the site
must be _read_, not skimmed. Young Serif above it is warm, solid and completely
unlike the ultralight the category reaches for.

**Logo fit.** Good. Young Serif's heavy low-contrast forms make the Cormorant
wordmark look deliberately delicate rather than merely thin.

---

## Style 8 Assets

**Assumed register: stillness / geometric** — near-black plum, minimal, the
concentric geometry of the mark echoed in the type's circular forms.

### Fonts

| Usage    | Family      | Source                                    | Weights available      | Variable     | Fontsource                    | Licence |
| -------- | ----------- | ----------------------------------------- | ---------------------- | ------------ | ----------------------------- | ------- |
| Headings | **Jost\***  | https://fonts.google.com/specimen/Jost    | 100–900 + italic       | Yes (`wght`) | `@fontsource-variable/jost`   | OFL 1.1 |
| Body     | **Mulish**  | https://fonts.google.com/specimen/Mulish  | 200–1000 + italic      | Yes (`wght`) | `@fontsource-variable/mulish` | OFL 1.1 |
| Mono     | **DM Mono** | https://fonts.google.com/specimen/DM+Mono | 300, 400, 500 + italic | No           | `@fontsource/dm-mono`         | OFL 1.1 |

**Jost is display-only in this pairing** and never below 300 on the dark ground.
Geometric faces have small x-heights relative to their caps; at body size on
`#1E0A1C` a 35–65 reader loses the counters. Mulish is the workhorse — it is
geometric enough to belong to Jost's world and humanist enough to read at 18px.

DM Mono is optional and admin-only: dates and times in the calendar gutter, where
its geometric circles rhyme with Jost rather than importing a code-editor register.

### Icons

- **Library**: Fluent UI System Icons — regular and filled, 20/24/32px optical sizes
- **URL**: https://github.com/microsoft/fluentui-system-icons
- **Licence**: MIT
- **Weight**: use the **filled** set at 24px on the near-black ground; the regular
  set only on light surfaces
- **Why this one**: it ships genuinely distinct optical sizes rather than one grid
  scaled — the 24px cut is drawn for 24px, which matters at this audience's
  eyesight more than at any other project's
- **Key icons needed**: §Key Icons. Fluent names: `ic_fluent_calendar_ltr_24`,
  `ic_fluent_clock_24`, `ic_fluent_location_24`, `ic_fluent_people_24`,
  `ic_fluent_mail_24`, `ic_fluent_checkmark_circle_24`, `ic_fluent_error_circle_24`,
  `ic_fluent_eye_24` / `ic_fluent_eye_off_24`, `ic_fluent_send_24`

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#FBF3F1",
  "secondary": "#E9C87E",
  "accent": "#D6338A",
  "background": "#1E0A1C",
  "surface": "#2B0E28",
  "textPrimary": "#FDFAF7",
  "textSecondary": "#C9B6C4",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

**Why this pairing.** This is the quietest of the ten, and quiet is a legitimate
answer to "warm, unhurried, quietly certain" — the circle is the brand's own form,
and letting the type share it means the page can carry almost no ornament and still
feel authored. Mulish keeps it readable where Jost alone would not be.

**Logo fit.** A real tension worth naming: Jost is a 1920s geometric and the
wordmark is a Renaissance garalde — two different centuries. It works only if Jost
is kept structural (labels, nav, small caps, beat numbers) and the wordmark is
allowed to remain the page's one calligraphic voice. If a direction wants Jost
setting big romantic headlines next to the lockup, it will read as a mistake.

---

## Style 9 Assets

**Assumed register: contemporary editorial hybrid** — light ground with
full-bleed dark sections, a modern old-style serif over a neo-grotesque. The
most "designed" of the ten.

### Fonts

| Usage    | Family       | Source                                   | Weights available | Variable     | Self-host                                                | Licence                                                              |
| -------- | ------------ | ---------------------------------------- | ----------------- | ------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| Headings | **Sentient** | https://www.fontshare.com/fonts/sentient | 200–700 + italic  | Yes (`wght`) | Download woff2 direct from Fontshare (not on Fontsource) | ITF Free Font Licence — commercial use + webfont embedding permitted |
| Body     | **Switzer**  | https://www.fontshare.com/fonts/switzer  | 100–900 + italic  | Yes (`wght`) | Download woff2 direct from Fontshare (not on Fontsource) | ITF Free Font Licence — commercial use + webfont embedding permitted |
| Mono     | — none —     | Tabular figures from Switzer             | —                 | —            | —                                                        | —                                                                    |

**This is the file's one licence exception and it is deliberate.** The ITF Free
Font Licence permits commercial use, modification and self-hosted webfont
embedding; it forbids reselling or redistributing the font files. It is _not_ the
OFL, so the licence story for this project stops being uniform. **Required at
`/stylesheet`: save the licence text shipped in the Fontshare download to
`assets/fonts/sentient/LICENSE.txt` and `assets/fonts/switzer/LICENSE.txt`** — a
sole practitioner will not be able to reconstruct provenance three years from now,
and this is the exact class of exposure Re:Mind Studio is currently carrying.

If the operator wants a single-licence project, substitute **Fraunces + Hanken
Grotesk** (Style 1) or **Petrona + Commissioner** (Style 6) and drop this style.

Alternate within Fontshare if Sentient is too warm: **Gambetta**
(https://www.fontshare.com/fonts/gambetta), same licence.

### Icons

- **Library**: Carbon Icons — IBM's open set, 16/20/24/32px grids, crisp and editorial
- **URL**: https://carbondesignsystem.com/elements/icons/library · repo https://github.com/carbon-design-system/carbon
- **Licence**: Apache 2.0 (ship the `LICENSE` file)
- **Stroke**: use the 24px or 32px cut, never the 16px on public screens
- **Key icons needed**: §Key Icons. Carbon names: `calendar`, `time`,
  `location--filled`, `user--multiple`, `email`, `checkmark--filled`,
  `warning--filled`, `view` / `view--off`, `send--alt`, `document--pdf`

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#C2187A",
  "secondary": "#2B0E28",
  "accent": "#E85D9B",
  "background": "#FDFAF7",
  "surface": "#2B0E28",
  "textPrimary": "#1E0A1C",
  "textSecondary": "#5C4A57",
  "error": "#B3122E",
  "success": "#1F6B4A"
}
```

`accent` rose `#E85D9B` computes at **2.97:1 on blush** — it fails even the 3:1
large-text floor on light and is non-text there; on `#2B0E28` it measures
**5.41:1** and _is_ text-safe. This style inverts between sections, so the same
token is legal in one band and illegal in the next. That is a token-naming problem,
not a colour problem — name it `accent-on-dark`.

**Why this pairing.** Sentient has the warmth of an old-style serif with none of
the wellness-preset fragility, and Switzer is one of the most legible free
neo-grotesques available. Together they read as _recently and carefully made_ —
useful against a sceptic who is quietly judging whether this practitioner is
serious about anything.

**Logo fit.** Good. Sentient is moderate-contrast, so it does not compete with the
wordmark's fine strokes.

---

## Style 10 Assets

**Assumed register: radiant** — dark plum ground, high-contrast display serif
used with restraint. **This is the block nearest the category preset and it must
justify itself.**

### Fonts

| Usage    | Family               | Source                                             | Weights available         | Variable     | Fontsource                        | Licence |
| -------- | -------------------- | -------------------------------------------------- | ------------------------- | ------------ | --------------------------------- | ------- |
| Headings | **Instrument Serif** | https://fonts.google.com/specimen/Instrument+Serif | 400 + italic (one weight) | No           | `@fontsource/instrument-serif`    | OFL 1.1 |
| Body     | **Golos Text**       | https://fonts.google.com/specimen/Golos+Text       | 400–900                   | Yes (`wght`) | `@fontsource-variable/golos-text` | OFL 1.1 |
| Mono     | — none —             | Tabular figures from Golos Text                    | —                         | —            | —                                 | —       |

**The deliberate-take justification, stated because the constraint requires it.**
`competitors.md` names the category's typographic default precisely: a
light-to-ultralight high-contrast serif over a neutral grotesk — PP Editorial New
Ultralight (Re:Mind), Marcellus (Blossom), Raleway (Sahana), Work Sans (Aura
Quartz), Roboto (Omnes). **None of those five appears anywhere in this file.**
Instrument Serif occupies the same _register_ as PP Editorial and therefore earns
its slot only under three conditions:

1. **On the dark plum ground, not cream.** The preset is high-contrast serif **over
   cream**. 5 of 6 researched sites are light-ground; the chromatic move
   (gold→magenta on plum) is measured as unoccupied. Change the ground and the same
   register stops being the preset.
2. **Regular 400 only — Instrument Serif has no lighter weight to reach for.** The
   preset's actual signature is the _ultralight_; a face with one honest weight
   cannot reproduce it.
3. **Display sizes ≥48px only.** Its hairlines close up under that, and on
   `#2B0E28` they bloom.

If a direction takes this pairing onto a cream ground, it has adopted the preset
and the style should be rejected at Gate 2.

### Icons

- **Library**: MingCute — rounded geometric, 24px grid, line and fill
- **URL**: https://www.mingcute.com · repo https://github.com/Richard9394/MingCute
- **Licence**: Apache 2.0 (ship the `LICENSE` file)
- **Weight**: fill variants on the dark ground; line at 24px minimum
- **Key icons needed**: §Key Icons. MingCute names: `calendar_line`, `time_line`,
  `location_line`, `group_line`, `mail_line`, `check_circle_line`,
  `warning_line`, `eye_line` / `eye_close_line`, `send_line`

### Color Palette

<!-- PROVISIONAL — reconcile against styles.md -->

```json
{
  "primary": "#E9C87E",
  "secondary": "#D6338A",
  "accent": "#F5876F",
  "background": "#2B0E28",
  "surface": "#1E0A1C",
  "textPrimary": "#FDFAF7",
  "textSecondary": "#C9B6C4",
  "error": "#F5876F",
  "success": "#8FD6AE"
}
```

`secondary` magenta `#D6338A` is **3.93:1 on `#2B0E28`** — large text and non-text
only, never body, never a form label.

**Why this pairing.** Golos Text is the reason this style survives its own display
face: it is a sturdy, high-x-height interface serif-adjacent sans that stays
completely legible at 18px on plum, so all the fragility lives above 48px where it
is an effect rather than a barrier. The warm gold-on-plum radiance is the only
thing in the researched category that would make a visitor feel _lifted_ rather
than _soothed_, which is the client's own stated bar.

**Logo fit.** **The weakest of the ten and it needs managing.** Instrument Serif and
the Cormorant wordmark are both high-contrast serifs; side by side they compete and
neither wins. Mitigation: use `logo-mark.svg` (mark only) in any header where an
Instrument Serif heading is within ~200px, and reserve the full lockup for the
footer and the newsletter template where no display heading sits near it.

---

## Icon Library Reference

| Library                | Style                         | URL                                                   | Licence    | Best for                                   |
| ---------------------- | ----------------------------- | ----------------------------------------------------- | ---------- | ------------------------------------------ |
| Phosphor               | 6 weights, warm terminals     | https://phosphoricons.com                             | MIT        | Dark grounds (Bold cut), warm registers    |
| Lucide                 | Minimal line, 24px            | https://lucide.dev                                    | ISC        | Plain-spoken; maintained fork of Feather   |
| Iconoir                | Geometric line, open          | https://iconoir.com                                   | MIT        | Expansive / airy directions                |
| Remix Icon             | Line + fill pairs             | https://remixicon.com                                 | Apache 2.0 | Calligraphic / editorial registers         |
| Tabler                 | 5,900+ line icons             | https://tabler.io/icons                               | MIT        | Admin-heavy builds (14 admin screens here) |
| Heroicons              | Outline / solid / mini        | https://heroicons.com                                 | MIT        | Versatile, well maintained                 |
| Material Symbols       | Variable `wght`/`FILL`/`GRAD` | https://fonts.google.com/icons                        | Apache 2.0 | Light-on-dark (the `GRAD` axis)            |
| Fluent UI System Icons | True optical sizes 20/24/32   | https://github.com/microsoft/fluentui-system-icons    | MIT        | Legibility at fixed small sizes            |
| Carbon Icons           | Crisp editorial, 4 grids      | https://carbondesignsystem.com/elements/icons/library | Apache 2.0 | Structured / systematic directions         |
| MingCute               | Rounded geometric             | https://www.mingcute.com                              | Apache 2.0 | Soft-geometric directions                  |

### Icon libraries to avoid on this project (licence, not taste)

| Library           | Why not                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Font Awesome Free | Icons are CC BY 4.0 — requires attribution in the rendered product. Not appropriate here. |
| Solar Icon Set    | CC BY 4.0 — same attribution obligation.                                                  |
| Streamline        | Free tier is a proprietary licence with usage caps; not a clean commercial grant.         |
| Iconsax           | Custom terms, historically ambiguous on commercial redistribution.                        |
| Nucleo            | Paid licence. No.                                                                         |
| Untitled UI Icons | "Free for commercial use" stated informally without a named licence — unverifiable.       |
| Feather           | Not a licence problem (MIT) but unmaintained since 2020. Use Lucide, its maintained fork. |

---

## Key Icons (canonical set, derived from the brief's screen catalog §11)

Named in Lucide's vocabulary as the reference; each style block above gives its
library's translations for the load-bearing ones.

**Public — navigation and chrome (6):** `menu`, `x`, `chevron-right`,
`chevron-down`, `arrow-right`, `arrow-up-right`

**Public — offerings and dates (7):** `calendar`, `calendar-days`, `clock`,
`map-pin` (workshop venue), `users` (capacity — information, never a live seat
count), `tag` (price), `layers` (a Course's sessions)

**Public — booking and contact (8):** `mail`, `phone`, `send`, `check-circle`
(booking-confirmation), `alert-circle` (**the slot-taken-while-you-were-typing
state — the one that actually happens**, brief §11), `timer` (the 48h hold),
`shield-check` (privacy notice), `loader` (submit pending)

**Public — newsletter and documents (6):** `mail-check` (double opt-in confirmed),
`mail-x` (unsubscribe), `download`, `file-text` (Document), `lock`
(subscribers-only), `external-link`

**Admin — shell (7):** `layout-dashboard`, `calendar-days`, `sliders-horizontal`
(availability), `file-pen` (landing sections), `package` (offerings), `inbox`
(bookings), `log-out`

**Admin — actions (12):** `plus`, `pencil`, `trash-2`, `eye` / `eye-off` (beat
visibility toggle — beats 2–6 only), `save`, `upload`, `image`, `search`, `filter`,
`grip-vertical` (reorder a Course's Sessions), `circle-alert` (unpublished changes
exist), `badge-check` (published)

**Admin — newsletter (4):** `send`, `mail-open`, `users-round` (subscribers),
`file-down` (CSV export)

**Total: ~50 icons.** Acquire 10–12 at `/mockups` (the beat-1 → products →
booking path), the full set at `/stylesheet`.

**Two icons the brief specifically needs and generic sets handle badly:**

1. **The hold-expiry indicator.** `timer` / `clock-alert` — this is a first-class
   product primitive (§5, §13) and no competitor has it. It needs to read as
   _courtesy_, not as _countdown pressure_.
2. **The derived session block.** In the admin calendar, a block generated by a
   Workshop or Course Session **cannot be edited directly** and the calendar "should
   say so rather than silently refusing" (§5). That needs a distinct lock-ish glyph
   (`link` or `lock` + the offering's own icon), not a generic disabled state.

**Icon anti-pattern for this category:** no sparkles, no lotus, no chakra wheel, no
mandala, no crystal, no candle. `competitors.md` measures these as the category's
imagery default. The brand's own concentric mark is the only mystical mark this
site needs.

---

## Computed contrast on dark grounds

`assets/brand/README.md` measured the brand values against the two **light**
grounds only. Six of the ten registers above are dark-ground. Computed here with
the WCAG 2.x relative-luminance formula against `plum-800 #2B0E28`; the method
reproduces the README's published `gold on plum-800 = 10.89:1` exactly, which is
the check that it is right.

| Foreground             | on `plum-800 #2B0E28` | AA body (4.5:1) | AA large (3:1) | Verdict                        |
| ---------------------- | --------------------- | --------------- | -------------- | ------------------------------ |
| `ivory #FDFAF7`        | 16.88:1               | passes          | passes         | body text                      |
| `blush #FBF3F1`        | 16.05:1               | passes          | passes         | body text                      |
| `gold #E9C87E`         | 10.89:1 (README)      | passes          | passes         | body text, headings, accents   |
| `coral #F5876F`        | 7.17:1                | passes          | passes         | body text, error state         |
| `gold-deep #C99A3F`    | 6.83:1                | passes          | passes         | body text                      |
| `rose #E85D9B`         | 5.41:1                | passes          | passes         | body text                      |
| `magenta #D6338A`      | 3.93:1                | **fails**       | passes         | **large text / non-text only** |
| `magenta-deep #C2187A` | 3.10:1                | **fails**       | passes         | **large text / non-text only** |

Muted-light values invented for these palettes, computed on the same ground:
`#C9B6C4` = **9.18:1**, `#CBB8A6` = **9.15:1**. Light-ground muted: `#5C4A57` on
`blush` = **7.46:1**. Light-ground status colours: `#B3122E` = **6.31:1**,
`#1F6B4A` = **5.88:1**. Gold on `plum-700 #3A1233` = **9.91:1**.

**The inversion nobody expects:** `magenta-deep #C2187A` is the README's
_light-ground text-safe_ magenta and is _not_ text-safe on dark. The brand's
text-safe magenta swaps identity with the ground. Re-run the project's contrast
script before shipping — the brief is explicit that this palette fails in ways
invisible to someone who already knows what the text says.

---

## Web Performance

A sole practitioner's site with no CDN budget. Every font decision below is
sized. **The dominant cost on this project is not type — it is six 2528×1696 PNG
plates**; see the imagery note at the end.

### Rule 0 — no display face may be text-subsetted

**The owner can edit every heading on the site** (§12: eyebrow, heading, body and
image on all seven beats; offering names; her own bio). Google's `&text=` parameter
and glyphhanger's content-derived subsetting would produce a font that renders
today's copy and shows tofu the first time she changes a word. **Full `latin`
subset minimum, on display faces as well as body.** This single constraint
invalidates the most common font-performance trick and it is specific to this brief.

Add **`latin-ext`** on both faces: the practitioner's name, credentials and
subscriber names are all free text she types, and a single `é` or `ł` rendering as
tofu on the About page is a credibility failure. Cost is roughly 10–15% more bytes.
`£` (U+00A3) is inside `latin` — no extra subset needed for prices.

### Rule 1 — self-host, don't link Google Fonts

Google's CSS endpoint costs a DNS lookup, a TLS handshake and a render-blocking
round trip to a third origin before the first glyph is requested. Install from
Fontsource, serve from the app's own origin, `preload` the two faces used above
the fold. Also removes the third-party-request question from the §14 privacy notice.

### Rule 2 — ship variable, clamp the axes

Where a variable cut exists, ship **one** woff2 per family with the weight range
clamped to what the design uses (`fonttools varLib.instancer --restrict`). Two
static weights typically cost more bytes than one clamped variable file, and the
variable file gives the dark-ground weight compensation (420/450) for free.

### Per-style shipping budget

| Style | Family (role)                 | Subset            | Ship                                                                     | Est. woff2 | Preload  |
| ----- | ----------------------------- | ----------------- | ------------------------------------------------------------------------ | ---------- | -------- |
| 1     | Fraunces (display)            | latin + latin-ext | VF clamped `wght 400–700`, `opsz` retained                               | ~40–55 KB  | Yes      |
| 1     | Hanken Grotesk (body)         | latin + latin-ext | VF clamped `wght 400–700` + italic 400                                   | ~30–40 KB  | Yes      |
| 2     | Schibsted Grotesk (display)   | latin + latin-ext | VF clamped `wght 500–800`                                                | ~25–35 KB  | Yes      |
| 2     | Literata (body)               | latin + latin-ext | VF clamped `wght 400–700`, `opsz` retained + italic 400                  | ~45–60 KB  | Yes      |
| 3     | Archivo (display)             | latin + latin-ext | VF `wght 400–800` × `wdth 100–125` (keep the axis — it is the direction) | ~55–70 KB  | Yes      |
| 3     | Source Serif 4 (body)         | latin + latin-ext | VF clamped `wght 400–700` + italic 400                                   | ~40–55 KB  | Yes      |
| 3     | Source Code Pro (mono)        | latin             | Static 400 — **admin routes only**, lazy                                 | ~20–28 KB  | No       |
| 4     | Cormorant Garamond (display)  | latin + latin-ext | Static **500 + 600 only** (no 300, no 400, no italics unless used)       | ~30–40 KB  | Yes      |
| 4     | Faustina (body)               | latin + latin-ext | VF clamped `wght 400–700` + italic 400                                   | ~35–45 KB  | Yes      |
| 5     | Bricolage Grotesque (display) | latin + latin-ext | VF clamped `wght 500–800`, `wdth` pinned 100                             | ~40–55 KB  | Yes      |
| 5     | IBM Plex Sans (body)          | latin + latin-ext | Static 400 + 600 (+ italic 400 if used)                                  | ~35–50 KB  | Yes      |
| 5     | IBM Plex Mono (mono)          | latin             | Static 400 + 500 — public prices + admin                                 | ~35–50 KB  | 400 only |
| 6     | Petrona (display)             | latin + latin-ext | VF clamped `wght 500–800`                                                | ~30–40 KB  | Yes      |
| 6     | Commissioner (body)           | latin + latin-ext | VF clamped `wght 400–700`, `FLAR` retained                               | ~40–55 KB  | Yes      |
| 7     | Young Serif (display)         | latin + latin-ext | Static 400 — the only weight there is                                    | ~25–35 KB  | Yes      |
| 7     | Alegreya (body)               | latin + latin-ext | VF clamped `wght 400–700` + italic 400                                   | ~40–55 KB  | Yes      |
| 8     | Jost\* (display)              | latin + latin-ext | VF clamped `wght 300–600`                                                | ~30–40 KB  | Yes      |
| 8     | Mulish (body)                 | latin + latin-ext | VF clamped `wght 400–700`                                                | ~30–40 KB  | Yes      |
| 8     | DM Mono (mono)                | latin             | Static 400 — **admin only**, lazy                                        | ~18–25 KB  | No       |
| 9     | Sentient (display)            | Fontshare default | VF clamped `wght 400–700`                                                | ~35–50 KB  | Yes      |
| 9     | Switzer (body)                | Fontshare default | VF clamped `wght 400–700` + italic 400                                   | ~35–50 KB  | Yes      |
| 10    | Instrument Serif (display)    | latin + latin-ext | Static 400 (+ italic 400 only if used)                                   | ~25–35 KB  | Yes      |
| 10    | Golos Text (body)             | latin + latin-ext | VF clamped `wght 400–700`                                                | ~30–40 KB  | Yes      |

Byte figures are estimates for a `latin + latin-ext` woff2 with the stated axis
clamp. **Replace them with measured bytes at `/stylesheet`** — an estimate that
survives into a performance budget is how budgets become fiction.

**Target: ≤ 110 KB of webfont on the home page's critical path** (two faces).
Styles 3 and 5 are the two that risk exceeding it (three families each) — in both,
the mono is admin-only and must be loaded on the `/admin` route, not globally.

### Loading behaviour

- `font-display: swap` — not `optional`. This site's whole bar is the felt first
  impression; a first paint in Times New Roman that never upgrades is worse than a
  brief swap.
- **Kill the swap's layout shift** with a metric-matched fallback `@font-face`
  using `size-adjust`, `ascent-override` and `descent-override` per family (measure
  against the real face; do not guess). CLS is a Lighthouse ≥95 blocker (§15).
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for **exactly two**
  files: the body face and the display face used in beat 1. Preloading more delays
  the ones that matter.
- Admin routes may load a third family; public routes may not.

### The bigger lever, stated plainly

Six plates at 2528×1696 PNG. Uncompressed these dwarf every font decision on this
page by an order of magnitude. At `/stylesheet`: convert to **AVIF with WebP
fallback**, generate a responsive `srcset` at 640/960/1440/1920/2560, `loading="lazy"`
on everything below beat 1, `fetchpriority="high"` + preload on the beat-1 plate
only. **Keep the source PNGs** — brief §12 requires uploads to be auto-processed
into the same treatment, so the pipeline needs the originals as reference.

---

## Missing Assets (for UI Designer to acquire)

### Partial batch (during `/mockups`, representative screens only)

- [ ] **Per style shown: 2 font families** — display + body, from that style's block
      above. Full `latin` subset (see Rule 0 — no text-subsetting). Weights: display
      1 instance, body 400 + 600.
- [ ] **10–12 icons** from that style's library, covering the beat-1 → products →
      booking path: `menu`, `arrow-right`, `calendar`, `clock`, `map-pin`, `tag`,
      `users`, `mail`, `check-circle`, `alert-circle`, `chevron-right`, `x`
- [ ] **Imagery: nothing to acquire.** The six commissioned plates are the pool. Do
      not fetch Unsplash or any other stock source — user assets win, and the plates
      were art-directed specifically to sit outside this category's imagery cliché.
- [ ] **Logo**: pick the correct variant for the direction's ground —
      `logo-*-light.svg` on blush/ivory, the default on plum. Both exist; using the
      wrong one is the most likely visible error in the first mockup round.

### Full batch (during `/stylesheet`, all approved screens)

- [ ] **Full icon set (~50)** per §Key Icons, from the selected style's library,
      plus its `LICENSE` file into `assets/icons/<library>/`
- [ ] **Both font families**, variable woff2, axes clamped per the budget table,
      plus `OFL.txt` (or the ITF licence for Style 9) into `assets/fonts/<family>/`
- [ ] **Metric-matched fallback metrics** (`size-adjust` / `ascent-override` /
      `descent-override`) measured against each shipped face
- [ ] **Favicon + app icons** derived from `logo-mark.svg` — 32px ICO, 180px
      apple-touch, 192/512 maskable PNG, plus a `site.webmanifest`. The mark is
      concentric and legible small; the full lockup is not.
- [ ] **OG / Twitter share image** 1200×630 — the brief's first impression extends
      to a link pasted into WhatsApp. Compose from `aura-two-people` + the wordmark.
- [ ] **Raster logo for the newsletter template**, PNG at 2× (e.g. 600×164 for a
      300px slot), light and dark variants. **Email clients do not render SVG** —
      Outlook and most Gmail contexts strip it. §12 makes her branding _the template_
      and _not editable_, so a broken logo in every issue is unrecoverable by her.
- [ ] **Email-safe type stack for the newsletter template.** Webfonts are
      unreliable across email clients; the template needs a declared fallback that
      preserves the register — a serif stack (`Georgia, 'Times New Roman', serif`)
      or a sans stack (`-apple-system, 'Segoe UI', Arial, sans-serif`) chosen to
      match the selected direction, not left to the client's default.
- [ ] **The six plates processed** — AVIF + WebP, responsive `srcset` at
      640/960/1440/1920/2560, originals retained for the upload-processing pipeline
- [ ] **Star-field asset (optional, §12)** — procedural CSS/SVG, decorative only,
      never carries content, suppressed under `prefers-reduced-motion`. Not a raster
      download; do not acquire a stock star image.
- [ ] **PDF placeholder / document thumbnail** treatment for `document-download` and
      `admin-documents` — a generated cover, not a stock PDF glyph

<!-- NEEDS CLARIFICATION: The per-style Color Palette blocks are PROVISIONAL, derived directly from assets/brand/README.md's eleven measured values rather than from styles.md (which a sibling worker was authoring concurrently). The sub-skill requires these palettes to match styles.md exactly. /stylesheet must reconcile them; where they disagree, styles.md wins. -->
<!-- NEEDS CLARIFICATION: Style 9 (Sentient + Switzer) is the only recommendation not under OFL 1.1. The ITF Free Font Licence permits commercial use and self-hosted webfont embedding, but it is a bespoke foundry licence rather than the OFL. Confirm the operator accepts a mixed-licence project before Style 9 proceeds past Gate 2; if not, substitute Style 1 or Style 6's pairing. -->
<!-- NEEDS CLARIFICATION: Variable-cut availability was recorded from the Google Fonts specimen pages. Two entries need verification at acquisition time: Cormorant Garamond (Google ships static cuts for this family member; the sibling family Cormorant has a variable release) and IBM Plex Sans (static on Google Fonts; IBM's own release ships a variable cut whose Fontsource package name should be confirmed with `npm view`). Neither affects the licence, only the byte budget. -->
