<!-- assetMode: standard -->

# Style Analysis

## Brand Context

**Project**: The Field Work — a UK sole-practitioner aura-healing practice. A public site that "sells the work by being the work", plus a private single-owner admin (offerings, merged calendar, availability, booking queue, newsletter, documents, media).

**Voice (brief §2)**: warm, unhurried, quietly certain. Speaks to an adult who is sceptical and curious at once. Never clinical, never breathless, never the soft-focus lavender register the category defaults to.

**Emotional register (brief §2)**: night-side rather than daylight — _as a register, not as a mandate that every direction be dark_. The bar is the client's own: a visitor should feel as though their aura has been lifted just by having been on the site. A light-ground direction here must feel **still and low-lit**, never spa-bright.

**The fear to design in front of (brief §2)**: the visitor half-expects to be embarrassed — that this involves undressing, being touched, or being asked to believe something. **Warmth without credibility fails as badly as credibility without warmth.** Every direction below is graded on both poles, not one.

**Audience (brief §2)**: skews 35–65. Assume reading glasses are somewhere else in the house. Body text ≥16px in every direction; generous line height; touch targets ≥44px.

**Supplied colour facts** — from `assets/brand/README.md`, sampled from the artwork's own gradient and ground. These are facts about the artwork, **not role assignments**: `plum-900 #1E0A1C` · `plum-800 #2B0E28` · `plum-700 #3A1233` · `gold #E9C87E` · `gold-deep #C99A3F` · `coral #F5876F` · `rose #E85D9B` · `magenta #D6338A` · `magenta-deep #C2187A` · `blush #FBF3F1` · `ivory #FDFAF7`.

**Supplied logo**: six SVG lockups in `assets/brand/` — `logo-primary`, `logo-horizontal`, `logo-mark`, each in a default (dark-ground) and a `-light` (light-ground) variant. Every direction below has a correct lockup available; no direction is blocked on artwork. The mark is a **radiating field** — concentric light running outward from a centre. That geometry, not the gradient, is the brand's deepest structural asset.

**Supplied imagery**: six commissioned plates in `assets/images/` — dark, warm, high-contrast, with gold-to-magenta light in them. Per direction, an **Imagery treatment** block states how the plates are handled; light-ground directions must answer this explicitly or they will ship a register collision.

**Wordmark type**: set in a Cormorant-family display face. Per the brand README that is _"a fact about the logo, not automatically the site's display face, and it says nothing about body type."_ Only Style 1 takes it literally; the other nine treat it as a fact to sit beside, not to match.

<!-- NEEDS CLARIFICATION: the brief specifies no site typography beyond the wordmark's own Cormorant-family face. All heading/body/mono pairings below are INFERRED from the brief's tone (warm, unhurried, quietly certain), the 35-65 legibility floor, and deliberate avoidance of every face measured in competitors.md. Confirm at Gate 2. -->

<!-- No wireframes were supplied (docs/asset-inventory.json.wireframes = []), so there is no Layout Patterns block and no docs/analysis/shared/wireframe-digest.json for this project — feat-103 step 6h is correctly skipped, not missed. No user icons were supplied (icons: []), so the User Icons block is likewise omitted; the icon set is an open design decision per direction. -->

**Numbering note**: this run is parameterised `## Style 1:`…`## Style 10:`. The Mode-A _"Style 0 = the user's vision"_ anchor is therefore carried by **Style 1 (Field Emanation)**, whose `**Basis**` is the user's brief. Styles 2–10 are research-derived.

## Research Insights

- **The night-side register is genuinely unoccupied.** `competitors.md` measured **5 of 6** direct/adjacent sites as cream-or-white-ground with exactly one warm earth/metallic accent (`#E1CCBE`, `#AB8041`, `#BFAD99`, `#EFE3B8`, `#533537`, `#7FA200`). The single dark exemplar (`#372338`) is a US bathhouse, not a UK energy-healing competitor. A dark direction here is differentiation, not fashion.
- **The gold→magenta axis is a chromatic gap, not a crowded lane.** _"Not one competitor in the set uses magenta or a gold→magenta gradient."_ That makes the gradient a legitimate signature — **and it also makes deliberately withholding it a legitimate signature.** Four of the ten directions below (4, 5, 7, 9) use no gradient at all, so the client is choosing a concept rather than a saturation level.
- **The typographic preset is measured, so it is avoidable.** _"A light-to-ultralight high-contrast serif display over a neutral grotesk body"_ — PP Editorial New Ultralight + PP Object Sans, Marcellus + Lato, Raleway + Inter, Roboto, Work Sans. Exactly **one** direction below (Style 7) reaches for a high-contrast display serif, and it does so by refusing the ultralight weight that is the actual tell. No direction reuses a face measured on a competitor.
- **The Othership trap is specific and avoidable.** `#372338` sits very close to the working plum `#2B0E28`; competitors.md warns that a dark direction which _also_ takes a condensed display face and a bright flat accent reads as derivative. **No direction below uses a condensed display face**, and every dark direction differentiates on radial emanation + stillness rather than on acid accent + motion.
- **The category template has no slot for the answer.** Squarespace's own prescribed order — _hero photo → mission → three-up cards → bio → testimonials → CTA_ — contains neither a reassurance beat nor a "what this is not" beat, which is _why_ 0 of 6 homepages contain the words _clothed_, _undress_, _touch_, _hands-off_ or _believe_. Every direction below states how its composition makes room for Beat 1 at the top of the scroll.

## Cross-cutting constraints (apply to all ten; each block still carries its own computed figures)

- **Every ratio below is computed** with the WCAG 2.2 relative-luminance formula, not estimated. The formula was validated against `assets/brand/README.md` first and reproduced its published figures exactly: gold on blush **1.47**, gold-deep on blush **2.35**, magenta on blush **4.08**, magenta-deep on blush **5.18**, magenta-deep on ivory **5.45**, gold on plum-800 **10.89**, derived `#8A6A22` on blush **4.61**.
- **The gold trap.** On light grounds `gold #E9C87E` measures **1.47:1** and `gold-deep #C99A3F` measures **2.35:1** — both fail AA body (4.5:1) _and_ the 3:1 large-text floor _and_ the WCAG 2.2 SC 1.4.11 3:1 non-text floor. On light grounds gold is therefore a **decorative** colour only: never text, never a functional border, never a focus ring. Where a light direction wants gold _type_, it uses a derived value and states the measured figure.
- **The magenta trap.** `magenta #D6338A` measures **4.08:1** on blush — fails AA body. `magenta-deep #C2187A` at **5.18:1** is the light-ground text-safe magenta and is the only one used as text on light grounds below.
- **The factory `success` trap.** The default `#16A34A` measures **3.30:1** on pure white and fails AA. **No direction below emits it.** Light grounds use a darker green (measured 5.76–7.32); dark grounds use a lighter green (measured 8.08–9.91).
- **WCAG 2.2 SC 1.4.11.** Focus rings and functional borders are held to 3:1 against their own ground and the measured value is stated per direction. This is where four of the ten directions had to move a border colour.
- **Motion.** Every direction's `motion_intensity` is low by design (range 1–5 across the ten) — stillness is the brand. Every motion has a `prefers-reduced-motion` fallback that leaves the composition whole, and no motion gates content (C-5 static-review-safe).
- **`aura-hands-between` is reserve in all ten.** Commissioned but, per both the brief §2 and the competitors.md imagery finding, the single most-reproduced composition in this category. Never a hero, never a beat anchor.

---

## Style 1: Field Emanation

**Basis**: user's brief (§2 night-side register, §20 working plum `#2B0E28`) + the logo mark's own concentric geometry
**Personality**: Still, cosmic, unhurried
**Ground**: **dark** · **Gradient role**: literal radial **emanation** — the mark's geometry at page scale, one per screen, never two

### Colors

- primary: `#E9C87E` — gold; the action colour, and the only colour that carries type weight on this ground
- secondary: `#E85D9B` — rose (gradient, second third). Chosen over `magenta #D6338A` because magenta measures only 3.93:1 on this ground and fails AA as text
- accent: `#F5876F` — coral (gradient, first third); used at hairline scale only
- background: `#2B0E28` — plum-800, the artwork's own ground
- surface: `#3A1233` — plum-700, the ground's falloff
- textPrimary: `#FBF3F1` — blush
- textSecondary: `#DCC0CF` — a plum-tinted light, so secondary text stays inside the world
- error: `#F58A80`
- success: `#6FCB99`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                          | Ratio                    | Verdict                                             |
| --------------------------------------------- | ------------------------ | --------------------------------------------------- |
| textPrimary `#FBF3F1` on background `#2B0E28` | **16.04:1**              | passes AA body                                      |
| textPrimary `#FBF3F1` on surface `#3A1233`    | **14.60:1**              | passes AA body                                      |
| textSecondary `#DCC0CF` on background         | **10.44:1**              | passes AA body                                      |
| textSecondary `#DCC0CF` on surface            | **9.50:1**               | passes AA body                                      |
| error `#F58A80` on background / surface       | **7.38:1** / **6.72:1**  | passes AA body                                      |
| success `#6FCB99` on background / surface     | **8.93:1** / **8.13:1**  | passes AA body (factory `#16A34A` rejected)         |
| gold `#E9C87E` on background / surface        | **10.89:1** / **9.91:1** | passes AA body — the inversion the README documents |
| rose `#E85D9B` on background / surface        | **5.41:1** / **4.92:1**  | passes AA body                                      |
| coral `#F5876F` on background                 | **7.17:1**               | passes AA body                                      |
| CTA label `#1E0A1C` on gold fill              | **11.68:1**              | passes AA body                                      |
| CTA label `#1E0A1C` on rose fill              | **5.80:1**               | passes AA body                                      |
| focus ring gold `#E9C87E` on background       | **10.89:1**              | passes SC 1.4.11 (3:1)                              |
| functional border `#996E8C` on background     | **4.15:1**               | passes SC 1.4.11 (3:1)                              |

Rejected during computation: `magenta #D6338A` on this ground (**3.93:1**, large-text only) and white-on-magenta (**4.47:1**) — both narrowly fail AA body, so magenta is absent from this direction's type and CTA labels.

### Typography

- heading: Cormorant Garamond — https://fonts.google.com/specimen/Cormorant+Garamond
- body: Source Sans 3 — https://fonts.google.com/specimen/Source+Sans+3
- mono: DM Mono — https://fonts.google.com/specimen/DM+Mono (calendar times, slot picker, prices)
- scale: 14 / 16 / 18 / 22 / 30 / 44 / 72
- body size: **18px**, line-height 1.7 — the 35–65 floor with room to spare

### Spacing

- base: 8
- scale: 8 / 16 / 24 / 32 / 48 / 64 / 96 / 160

### Visual

- radius: none — 0px on every container; the **only** curve on the page is a true circle (the emanation), never applied to a box
- shadow: flat — no drop shadows anywhere; elevation is a soft radial bloom behind the raised element. Light is the elevation currency in a dark room
- density: spacious
- characteristics:
  - one emanation per screen, placed where the eye should rest — never two competing centres
  - gold hairline rules under section eyebrows; magenta-family colour reserved for the single primary action
  - long vertical silences between beats, so the ascent root→crown is felt as pacing before it is read

### Dials

- design_variance: 4
- motion_intensity: 4
- visual_density: 3

### Named references

- Othership — the courage of a dark, warm, non-lavender wellness ground; take the confidence, explicitly not the volume or the condensed face
- Aesop — dark product pages that stay warm and adult rather than clinical
- Instrument — studio-grade restraint in how one signature move is allowed to carry a whole page

### Rationale & differentiation

- **Rationale**: The practitioner's work happens in low light and stillness, and the client's own success test is affective — a visitor should feel their aura lifted; this direction spends its entire budget on that one felt quality by rendering the logo's radiating field as the page itself, which is the only direction where the brand mark and the composition are the same idea.
- **Differentiation**: The category converges on a cream ground with one warm earth accent (measured: 5 of 6 sites; `#E1CCBE`, `#AB8041`, `#BFAD99`) and uses motion only for scroll fade-ins and testimonial carousels. This direction takes the unoccupied night-side ground and makes the _emanation_ — not a fade-in — the only motion on the page, at a 12-second drift the eye barely registers. Against the one dark exemplar (Othership `#372338`) it differentiates exactly where competitors.md says the room is: a gold→magenta radial emanation instead of an acid-yellow flat accent, and stillness instead of Webflow motion.

### Imagery treatment

The plates are native here — they were lit for this ground. `aura-two-people` runs full-bleed behind Beat 1 with the copy set in the plate's own dark quadrant, so the reassurance is answered by the picture and the sentence simultaneously. `aura-light-in-a-room` anchors Beat 2 at 16:9. `aura-radiant-portrait` is the brightest thing on the page and belongs to Beat 7 (Crown). `aura-field-abstract` is the default selectable page background at low opacity. `aura-seated-figure` covers offering detail pages. `aura-hands-between`: reserve, small inline at most.

---

## Style 2: Consulting Room

**Basis**: inspired by Blossom Reiki's content posture (plain declarative answers) inverted onto a bespoke composition; rejects its inherited beauty-parlour theme
**Personality**: Composed, credible, plain-spoken
**Ground**: **light** (ivory) · **Gradient role**: **absent from the interface** — the gradient exists only inside the photographs and the logo lockup

### Colors

- primary: `#4A1440` — a deep plum drawn down from `plum-700`; the action colour, dark enough to be text-safe on ivory
- secondary: `#C2187A` — magenta-deep, the light-ground text-safe magenta
- accent: `#C99A3F` — gold-deep. **NON-TEXT ONLY** (see contrast table); 1px rules, the mark, and image edges
- background: `#FDFAF7` — ivory
- surface: `#FFFFFF`
- textPrimary: `#241021` — a plum-black, so even the type belongs to the brand
- textSecondary: `#5E4655`
- error: `#B3261E`
- success: `#12703C`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                              | Ratio                   | Verdict                                                                                           |
| ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| textPrimary `#241021` on background `#FDFAF7`     | **17.24:1**             | passes AA body                                                                                    |
| textPrimary `#241021` on surface `#FFFFFF`        | **17.93:1**             | passes AA body                                                                                    |
| textSecondary `#5E4655` on background             | **8.13:1**              | passes AA body                                                                                    |
| textSecondary `#5E4655` on surface                | **8.46:1**              | passes AA body                                                                                    |
| error `#B3261E` on background / surface           | **6.29:1** / **6.54:1** | passes AA body                                                                                    |
| success `#12703C` on background / surface         | **5.92:1** / **6.16:1** | passes AA body (factory `#16A34A` = 3.30:1 rejected)                                              |
| secondary `#C2187A` on background / surface       | **5.45:1** / **5.67:1** | passes AA body                                                                                    |
| primary `#4A1440` on background                   | **13.78:1**             | passes AA body                                                                                    |
| CTA label `#FDFAF7` on primary fill               | **13.78:1**             | passes AA body                                                                                    |
| placeholder `#6B5464` on surface                  | **6.82:1**              | passes AA body                                                                                    |
| focus ring / input border `#7A6472` on background | **5.19:1**              | passes SC 1.4.11 (3:1)                                                                            |
| accent `#C99A3F` on background                    | **2.47:1**              | **FAILS all text floors — decorative rules only, never type, never a border, never a focus ring** |

### Typography

- heading: Newsreader — https://fonts.google.com/specimen/Newsreader
- body: Public Sans — https://fonts.google.com/specimen/Public+Sans
- mono: Source Code Pro — https://fonts.google.com/specimen/Source+Code+Pro (prices, durations, slot times)
- scale: 13 / 15 / 17 / 20 / 24 / 32 / 44
- body size: **17px**, line-height 1.65

### Spacing

- base: 4
- scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72

### Visual

- radius: subtle — uniform 2px on every container; images always 0px
- shadow: subtle — one level only: a 1px warm hairline plus a 2px / 6% ambient drop. Paper on paper, never a floating card
- density: comfortable
- characteristics:
  - the plainest possible statement of the plainest possible facts — price, duration, what happens, what it is not
  - a strict two-column measure at ≤66 characters, so nothing is ever a wall of text
  - the accent is a rule, not a fill; nothing on the page is coloured for decoration's sake

### Dials

- design_variance: 2
- motion_intensity: 2
- visual_density: 5

### Named references

- Blossom Reiki — its `/faq/` answers clothing, touch and belief in three sentences and is the most trustworthy content measured in the whole set; this direction promotes that register to the front door
- Things 3 — unhurried pacing and empty states that feel considered rather than unfinished (load-bearing: brief §11 requires a new practitioner's zero-workshop index page to still be worth landing on)
- Aesop — plain product facts presented with enough care that plainness reads as confidence

### Rationale & differentiation

- **Rationale**: The Carrier persona's day is broken by _"a price that only appears after you make contact"_ and by being asked to believe something before being told what happens; this is the direction that answers every practical question in the most literal, least decorated way available, which is the fastest route to credibility for a visitor who half-expects to be embarrassed.
- **Differentiation**: Blossom Reiki has the right content and lost it under an off-the-shelf WordPress theme (_"Spa and Salon"_ by Rara Themes, sold for _"spa, salons, beauty, care, girly, hair…"_) whose olive-lime `#7FA200` register was inherited from a beauty parlour, with the reassurance buried two clicks deep in an FAQ. This direction takes her answers and gives them a composition of their own: Beat 1's three plain sentences set at display size in the first viewport, with no hero photograph above them to scroll past. It rejects the Squarespace order at its very first move — the category always opens with a full-bleed soft-focus photograph; this opens with a sentence.

### Imagery treatment

**This is the light direction that must answer the dark plates most carefully.** The plates are never placed _on_ the ivory ground as floating cards — they run **full-bleed, edge to edge, at 0px radius**, framed as windows cut through the page into the room where the work happens. The register shift from ivory to dark plate is the point, not an accident: the page is the explanation, the plate is the room. `aura-two-people` sits directly beneath Beat 1's three sentences as corroboration. `aura-light-in-a-room` opens Beat 2 at 21:9. `aura-radiant-portrait` is the full-bleed close of Beat 7. No overlay, no tint, no scrim — the plates are not adjusted to suit the ground; the ground gets out of their way.

---

## Style 3: Long Dusk

**Basis**: research-derived — the brief §20 root→crown ascent taken literally, as the page ground itself
**Personality**: Ascending, atmospheric, patient
**Ground**: **split** — the page ground travels from `plum-900` at Beat 1 (Root) to `blush` at Beat 7 (Crown) · **Gradient role**: the **page ground itself**, vertically, across the whole scroll

### Colors

The nine tokens describe the **root (dark) system**, because that is where the visitor lands. The crown (light) system is a documented zone inversion with its own computed figures below.

- primary: `#C2187A` — magenta-deep; the one fill that is legible in **both** zones, which is what makes a travelling ground possible
- secondary: `#E9C87E` — gold
- accent: `#F5876F` — coral
- background: `#1E0A1C` — plum-900, the deepest point of the ground, at Beat 1
- surface: `#33132E`
- textPrimary: `#F7EDF3`
- textSecondary: `#CFB2C4`
- error: `#F79289`
- success: `#74CE9C`

### Contrast (computed — WCAG 2.2 AA)

**Root zone** (background `#1E0A1C`, surface `#33132E`):

| Pair                                      | Ratio                   | Verdict                |
| ----------------------------------------- | ----------------------- | ---------------------- |
| textPrimary `#F7EDF3` on background       | **16.46:1**             | passes AA body         |
| textPrimary `#F7EDF3` on surface          | **14.42:1**             | passes AA body         |
| textSecondary `#CFB2C4` on background     | **9.70:1**              | passes AA body         |
| textSecondary `#CFB2C4` on surface        | **8.50:1**              | passes AA body         |
| error `#F79289` on background / surface   | **8.45:1** / **7.40:1** | passes AA body         |
| success `#74CE9C` on background / surface | **9.91:1** / **8.68:1** | passes AA body         |
| gold `#E9C87E` on background              | **11.68:1**             | passes AA body         |
| functional border `#916787` on background | **4.03:1**              | passes SC 1.4.11 (3:1) |

**Crown zone inversion** (background `#FBF3F1`, surface `#FFFFFF`):

| Pair                                                  | Ratio                   | Verdict                |
| ----------------------------------------------------- | ----------------------- | ---------------------- |
| textPrimary inverts to `#241021` on `#FBF3F1`         | **16.39:1**             | passes AA body         |
| textPrimary `#241021` on `#FFFFFF`                    | **17.93:1**             | passes AA body         |
| textSecondary inverts to `#5A4353` on `#FBF3F1`       | **8.12:1**              | passes AA body         |
| textSecondary `#5A4353` on `#FFFFFF`                  | **8.89:1**              | passes AA body         |
| error inverts to `#A82219` on `#FBF3F1` / `#FFFFFF`   | **6.60:1** / **7.22:1** | passes AA body         |
| success inverts to `#12693B` on `#FBF3F1` / `#FFFFFF` | **6.17:1** / **6.75:1** | passes AA body         |
| secondary `#C2187A` on `#FBF3F1`                      | **5.18:1**              | passes AA body         |
| functional border `#8F7887` on `#FBF3F1`              | **3.69:1**              | passes SC 1.4.11 (3:1) |

**Crossover band** — the ~120px seam near `#7A3350` where the two zones blend. Type is permitted here and was computed rather than avoided: blush `#FBF3F1` on the seam **7.94:1**, gold `#E9C87E` on the seam **5.39:1**. Both pass AA body, so the ascent has no dead band.

| Shared                                                | Ratio      | Verdict        |
| ----------------------------------------------------- | ---------- | -------------- |
| CTA label `#FFFFFF` on primary `#C2187A` (both zones) | **5.67:1** | passes AA body |

**Two cross-zone hazards — verified independently, parent turn (2026-08-06).**
This direction is the only one where a token's legality depends on WHERE ON THE
PAGE it appears, so both are stated as build constraints rather than left to be
inferred from the tables above:

1. **Gold `#E9C87E` dies as it ascends.** It measures 11.68:1 at root, 5.39:1
   at the crossover seam, and **1.47:1 on the crown ground `#FBF3F1`** — where
   it fails AA body _and_ the 3:1 large-text and non-text floors. Gold is a
   root- and seam-only colour in this direction. It must not appear as type,
   rule, border or icon stroke above the seam. (The crown table handles this
   implicitly by re-assigning `secondary` to `#C2187A` in that zone; saying it
   out loud is what stops an executor carrying the root palette upward.)
2. **`#C2187A` is a FILL in the root zone, never type.** As type on the root
   ground it is **3.32:1** — large-text/non-text only. As a filled CTA with a
   `#FFFFFF` or `#FBF3F1` label it passes in both zones (5.67:1 / 5.18:1), and
   as type it passes only from the seam upward (5.18:1 on blush). The Colors
   note above calls it "the one fill that is legible in both zones" — that is
   correct _for fills_ and would be wrong if read as licence to set body copy
   in it at Beat 1.

Net: the travelling ground works, but two of the nine tokens are zone-scoped.
An implementation that treats the palette as position-independent WILL ship an
AA failure that no eye-review catches.

### Typography

- heading: Fraunces — https://fonts.google.com/specimen/Fraunces (variable optical size + "wonk"; a _warm humanist_ serif, deliberately not the didone-ultralight preset)
- body: Literata — https://fonts.google.com/specimen/Literata (a serif designed for long reading — the 35–65 audience gets a book face, not a UI face)
- mono: Spline Sans Mono — https://fonts.google.com/specimen/Spline+Sans+Mono
- scale: 14 / 16 / 18 / 21 / 28 / 40 / 64
- body size: **18px**, line-height 1.75

### Spacing

- base: 8
- scale: 8 / 16 / 24 / 40 / 64 / 96 / 144 / 224

### Visual

- radius: rounded — 10px on the beat panels only, so each beat reads as a step the ground passes through rather than a card sitting on it
- shadow: subtle — a single long, soft vertical ambient that follows the ground's ascent, so elements sit _in_ the gradient rather than on top of it
- density: spacious
- characteristics:
  - the ascent is structural: you can tell how far through the page you are with your eyes closed to the copy
  - Fraunces' optical size is dialled up as the ground lightens — the type gets more open as the page gets brighter
  - two zones with one long blend and no third register; the ground never doubles back

### Dials

- design_variance: 6
- motion_intensity: 3
- visual_density: 4

### Named references

- Re:Mind Studio — its airy warm-neutral discipline is the light half of this page; the direction inverts its single-register calm into a two-register journey
- The Pudding — scroll position as structural meaning rather than as a place to hang fade-ins
- Locomotive — studio-grade control of a long scroll that stays composed at every position

### Rationale & differentiation

- **Rationale**: The seven beats are named for the chakras and ascend root→crown _"so the page ends in light"_ (brief §20) — this is the only direction where that requirement is carried by the page's own material rather than illustrated by an icon or a colour band, which matters because the brief explicitly warns that the rainbow chakra chart is the measured category cliché.
- **Differentiation**: The category ships a single flat ground for the entire page — cream in 5 of 6 measured sites — and expresses progression, if at all, through section dividers. This direction makes the ground the narrative: the visitor physically travels from the darkest point of the brand to the lightest across one scroll, arriving at the CTA at the page's brightest moment. It also refuses the brief's own most obvious trap: **no chakra hue appears as a band**; the only chroma is the client's own two-stop gold→magenta axis, and the crossover seam was contrast-computed rather than kept clear of type.

### Imagery treatment

The plates sit in the **root half**, where their darkness is the ground rather than a contrast: `aura-two-people` at Beat 1 needs no treatment at all because the ground beneath it is `#1E0A1C`. `aura-light-in-a-room` at Beat 2 is the last full-dark plate. Through Beats 3–5 the plates step down in scale as the ground lightens, so the imagery hands over to typography exactly as the page brightens. `aura-radiant-portrait` returns at Beat 7 on the blush ground — and it is the only plate that works there, because its subject is a face lifted into light. `aura-field-abstract` supplies the root-end ground texture. That transition — dark photography giving way to light type and back to one bright portrait — is this direction's signature move.

---

## Style 4: Plain Type

**Basis**: research-derived — a direct rejection of the measured category template's photograph-first opening
**Personality**: Declarative, unornamented, adult
**Ground**: **light** (ivory) · **Gradient role**: **absent entirely** — there is no gradient anywhere in the interface

### Colors

- primary: `#1A0F18` — ink; the CTA is an ink-filled rectangle with an ivory label
- secondary: `#C2187A` — magenta-deep
- accent: `#7E611F` — a **derived** gold, darkened from the artwork until it clears AA body on both grounds. Not present in the artwork; measured below
- background: `#FDFAF7` — ivory
- surface: `#F5EFE9` — a faint warm tint, used for exactly one region: the Beat 5 "what this is not" block
- textPrimary: `#1A0F18`
- textSecondary: `#544452`
- error: `#A3231B`
- success: `#146B3A`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                             | Ratio                   | Verdict                                     |
| ------------------------------------------------ | ----------------------- | ------------------------------------------- |
| textPrimary `#1A0F18` on background `#FDFAF7`    | **17.94:1**             | passes AA body                              |
| textPrimary `#1A0F18` on surface `#F5EFE9`       | **16.35:1**             | passes AA body                              |
| textSecondary `#544452` on background            | **8.68:1**              | passes AA body                              |
| textSecondary `#544452` on surface               | **7.91:1**              | passes AA body                              |
| error `#A3231B` on background / surface          | **7.18:1** / **6.54:1** | passes AA body                              |
| success `#146B3A` on background / surface        | **6.32:1** / **5.76:1** | passes AA body (factory `#16A34A` rejected) |
| secondary `#C2187A` on background / surface      | **5.45:1** / **4.97:1** | passes AA body                              |
| accent `#7E611F` on background / surface         | **5.58:1** / **5.09:1** | passes AA body                              |
| CTA label `#FDFAF7` on ink `#1A0F18`             | **17.94:1**             | passes AA body                              |
| rule / functional border `#6E5C6B` on background | **5.93:1**              | passes SC 1.4.11 (3:1)                      |
| focus ring `#1A0F18` on background               | **17.94:1**             | passes SC 1.4.11 (3:1)                      |

The README's derived gold `#8A6A22` (4.61:1 on blush) was tested and **rejected for this direction**: on the `#F5EFE9` surface tint it drops to **4.42:1** and fails AA body. `#7E611F` was derived instead and clears both grounds. This is precisely the failure mode the brief warns is invisible to a designer who already knows what the text says.

### Typography

- heading: Archivo — https://fonts.google.com/specimen/Archivo (a plain, wide grotesk — the anti-preset; no display serif anywhere in this direction)
- body: Petrona — https://fonts.google.com/specimen/Petrona (a warm serif reading face; the warmth lives entirely in the body text, which is most of the rendered surface)
- mono: Space Mono — https://fonts.google.com/specimen/Space+Mono
- scale: 14 / 16 / 18 / 24 / 34 / 52 / 88
- body size: **18px**, line-height 1.7

### Spacing

- base: 4
- scale: 4 / 8 / 16 / 24 / 40 / 64 / 104 / 168

### Visual

- radius: none — 0px, absolute; there is not one rounded corner in the system
- shadow: flat — hairline rules only, no shadow at any elevation; separation is whitespace and a single rule weight
- density: comfortable
- characteristics:
  - typography **is** the layout — the seven beats are numbered and set at display scale, and there is no decorative element to remove
  - one word per beat carries the accent as a text colour; no coloured shape exists anywhere in the interface
  - the beats are set in an asymmetric two-column rag so the page reads as an argument, not a brochure

### Dials

- design_variance: 7
- motion_intensity: 1
- visual_density: 6

### Named references

- Omnes Healing — it publishes real recurring times (_"Mondays 16:30–17:00 and 17:30–18:00"_) as a standing rule rather than a maintained list; this direction gives that honesty a typographic form instead of Elementor's corporate blue
- NYT — type as structure at display scale, where hierarchy is carried by size and rag rather than by boxes
- Pentagram — plain-spoken typographic identity work that reads as confidence rather than as austerity

### Rationale & differentiation

- **Rationale**: This category is _"full of overclaim"_ (brief §1, principle 3) and the practitioner's differentiator is honesty — a direction with no decoration at all cannot overclaim visually, so every claim on the page has to be earned by a sentence, which is exactly the trade the brief's third principle asks for.
- **Differentiation**: Every measured competitor opens with a photograph — _"full-bleed soft-focus hero photograph → short mission statement → three-up service cards"_ is Squarespace's own prescribed order across Jenani / Anza / Clune / Aurora / Clove, and 5 of 6 live sites follow a variant of it. This direction has **no hero image at all**: the first viewport is three sentences at 88px answering the question nobody in the researched set answers on the homepage (measured: 0 of 6 contain _clothed_, _undress_, _touch_, _hands-off_ or _believe_). It also refuses the typographic preset from both ends — a plain wide grotesk for display and a warm serif for body is the exact inverse of the category's ultralight-serif-display-over-neutral-grotesk-body.

### Imagery treatment

The plates are **rationed, and the ration is the design**. Each of the six appears exactly once, full-bleed at 100vw, uncropped, with no overlay, no tint and no radius — and nothing else on the site is an image. Because there are no decorative graphics, no icons-as-illustration and no card thumbnails competing with them, a plate arriving after 800px of pure typography lands with the force of evidence. `aura-two-people` is deliberately withheld from the first viewport and placed immediately _below_ Beat 1's three sentences, so the visitor reads the promise and then sees it kept. `aura-hands-between` is the one plate this direction can safely omit entirely.

---

## Style 5: Nightfield Terminal

**Basis**: research-derived — the admin surface leads the design language and the public site inherits its precision; answers the tooling half of `competitors.md`
**Personality**: Precise, nocturnal, professional
**Ground**: **dark** (near-black, deliberately _not_ plum) · **Gradient role**: a **1px rule** — a gold→magenta gradient hairline, the only chromatic element in the interface

### Colors

- primary: `#E9C87E` — gold
- secondary: `#E85D9B` — rose (magenta `#D6338A` measures 4.39:1 here and fails AA body; rose was substituted after computation)
- accent: `#F5876F` — coral
- background: `#0F0A10` — a near-black with a plum bias, so it is warm without being the brand's own plum
- surface: `#171018`
- textPrimary: `#EDE6EA`
- textSecondary: `#A99DA7`
- error: `#F4746B`
- success: `#5CC98E`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                              | Ratio                     | Verdict                |
| ------------------------------------------------- | ------------------------- | ---------------------- |
| textPrimary `#EDE6EA` on background `#0F0A10`     | **15.97:1**               | passes AA body         |
| textPrimary `#EDE6EA` on surface `#171018`        | **15.22:1**               | passes AA body         |
| textSecondary `#A99DA7` on background             | **7.53:1**                | passes AA body         |
| textSecondary `#A99DA7` on surface                | **7.18:1**                | passes AA body         |
| error `#F4746B` on background / surface           | **7.05:1** / **6.72:1**   | passes AA body         |
| success `#5CC98E` on background / surface         | **9.52:1** / **9.08:1**   | passes AA body         |
| gold `#E9C87E` on background / surface            | **12.16:1** / **11.59:1** | passes AA body         |
| secondary `#E85D9B` on background / surface       | **6.04:1** / **5.76:1**   | passes AA body         |
| placeholder `#8E8290` on surface                  | **5.11:1**                | passes AA body         |
| CTA label `#0F0A10` on gold fill                  | **12.16:1**               | passes AA body         |
| focus ring gold `#E9C87E` on background           | **12.16:1**               | passes SC 1.4.11 (3:1) |
| functional / input border `#7E7182` on background | **4.27:1**                | passes SC 1.4.11 (3:1) |

Note for the executor: the aesthetically tempting hairline `#2A222B` measures **1.27:1** and fails SC 1.4.11. It is permitted as a purely decorative divider between non-interactive regions, and **forbidden** as an input, control or focus boundary — those use `#7E7182`.

### Typography

- heading: Space Grotesk — https://fonts.google.com/specimen/Space+Grotesk
- body: IBM Plex Sans — https://fonts.google.com/specimen/IBM+Plex+Sans
- mono: IBM Plex Mono — https://fonts.google.com/specimen/IBM+Plex+Mono (superfamily-matched; carries the merged calendar, availability rules, hold countdowns and subscriber counts)
- scale: 13 / 15 / 16 / 19 / 23 / 30 / 42
- body size: **16px** minimum, line-height 1.6 — the floor is respected even in the densest direction

### Spacing

- base: 4
- scale: 2 / 4 / 8 / 12 / 16 / 24 / 32 / 48

### Visual

- radius: subtle — 3px on inputs and cards; **0px on the calendar grid**, because a dense time grid reads faster square
- shadow: flat — 1px borders and zero shadow at every elevation; the cockpit convention
- density: compact
- characteristics:
  - the merged calendar is the design's centre of gravity — month and week views where confirmed / held / derived-session / personal blocks are distinguishable at a glance and free time is legible as free
  - tabular figures everywhere a time, a price or a count appears; nothing about a date is ever ambiguous
  - one gradient hairline marks the active region; everything else is achromatic, so colour always means something

### Dials

- design_variance: 3
- motion_intensity: 2
- visual_density: 8

### Named references

- Acuity Scheduling — the operational bar the admin must clear; take its self-serve competence, reject its model (it self-books where this product requests-with-a-hold, and its class series _"must book all of the classes as a group"_)
- Linear — calm data density with minimal chrome; the proof that a dark tool can be dense without being hostile
- Superhuman — speed as a felt quality in a shell that still reads warm rather than industrial

### Rationale & differentiation

- **Rationale**: The practitioner will _live_ in the admin calendar (brief §11) and her success metric is measured in seconds — block a personal afternoon in under 30, publish a workshop in under 5 minutes — so this is the only direction that lets the working surface set the language and asks the public site to inherit it, which buys operator independence at the cost of some public warmth.
- **Differentiation**: The realistic incumbent is a visual stitch — Squarespace plus Acuity plus Eventbrite plus Mailchimp, each with its own type, colour, corner radius and login, and `competitors.md` measured the seam directly (Blossom's Calendly popup and Re:Mind's Momence embed are both described as visual foreign bodies). This direction's differentiation is that **there is no seam**: the slot picker, the calendar and the newsletter template are the same design system as the landing page, in a category where owning the slot picker is a visible quality difference. Against Othership it takes a _near-black_, not plum, and a technical grotesk rather than a condensed display face.
- **Honest trade, stated for Gate 2**: this is the credibility pole of the ten. It will score highest on "she runs a real practice" and lowest on the client's 20-second affective test. Its mitigation is imagery scale, below — but if the client's felt-experience bar is the deciding criterion, this is not the direction.

### Imagery treatment

Inverted from every other direction: the plates are treated as **evidence, not atmosphere**. On the admin surface they appear small and inset at 3:2 inside a 1px frame — offering thumbnails, media-library tiles, beat previews — where their job is recognition at 64px, which the plates' strong concentric composition survives better than most photography would. On the **public** surface the ratio flips hard: exactly one plate per beat, full-bleed at 100vw and full viewport height, uninterrupted, so the public site's warmth comes in large sustained doses between precise, dense, quiet type. `aura-field-abstract` supplies the near-black ground's texture at very low opacity.

---

## Style 6: Concentric

**Basis**: research-derived from the supplied mark itself — the logo's radiating field promoted from a mark to the layout grid
**Personality**: Geometric, luminous, deliberate
**Ground**: **light** (blush) · **Gradient role**: **stroke fill only** — a gold→magenta gradient on 1px arcs; never a fill, never a background, never type

### Colors

- primary: `#C2187A` — magenta-deep
- secondary: `#3A1233` — plum-700, the structural dark
- accent: `#E9C87E` — gold. **DECORATIVE STROKE ONLY** at 1.47:1 (see table); it may never be text, a functional border or a focus ring
- background: `#FBF3F1` — blush
- surface: `#FFFFFF`
- textPrimary: `#2B0E28` — plum-800 as ink, so the brand's own ground colour becomes the type colour
- textSecondary: `#63495D`
- error: `#B02418`
- success: `#0F6B3D`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                          | Ratio                   | Verdict                                                                                               |
| --------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| textPrimary `#2B0E28` on background `#FBF3F1` | **16.04:1**             | passes AA body                                                                                        |
| textPrimary `#2B0E28` on surface `#FFFFFF`    | **17.56:1**             | passes AA body                                                                                        |
| textSecondary `#63495D` on background         | **7.27:1**              | passes AA body                                                                                        |
| textSecondary `#63495D` on surface            | **7.95:1**              | passes AA body                                                                                        |
| error `#B02418` on background / surface       | **6.17:1** / **6.75:1** | passes AA body                                                                                        |
| success `#0F6B3D` on background / surface     | **6.01:1** / **6.58:1** | passes AA body (factory `#16A34A` rejected)                                                           |
| primary `#C2187A` on background               | **5.18:1**              | passes AA body                                                                                        |
| secondary `#3A1233` on background             | **14.60:1**             | passes AA body                                                                                        |
| CTA label `#FFFFFF` on primary fill           | **5.67:1**              | passes AA body                                                                                        |
| focus ring `#C2187A` on background            | **5.18:1**              | passes SC 1.4.11 (3:1)                                                                                |
| functional border `#8A7285` on background     | **3.98:1**              | passes SC 1.4.11 (3:1)                                                                                |
| accent `#E9C87E` on background                | **1.47:1**              | **FAILS every floor — decorative arc strokes ONLY. The focus ring is `#C2187A`, never the gold arc.** |

This is the direction most exposed to the brand README's trap: its signature element is gold on a light ground, and gold on a light ground is the one thing the measured data forbids as type or as a control boundary. The separation is therefore structural — gold draws arcs, magenta-deep does every job that carries meaning.

### Typography

- heading: Syne — https://fonts.google.com/specimen/Syne (geometric and eccentric; its curves rhyme with the arcs, and it appears in no competitor)
- body: Hanken Grotesk — https://fonts.google.com/specimen/Hanken+Grotesk
- mono: Martian Mono — https://fonts.google.com/specimen/Martian+Mono
- scale: 14 / 16 / 18 / 22 / 28 / 40 / 60
- body size: **18px**, line-height 1.7

### Spacing

- base: 8
- scale: 8 / 16 / 32 / 48 / 72 / 112 / 168 / 256

### Visual

- radius: pill — media is masked to **true circles**; containers stay at 0px. Radius is the motif, not the chrome
- shadow: subtle — an inset ring-shadow so the circular apertures read as openings cut into the page rather than as stickers placed on it
- density: spacious — the airiest of the ten
- characteristics:
  - the composition is built on arcs struck from off-canvas centres, so every section is a fragment of one very large circle
  - the products block is a set of nested arcs rather than a row of cards — the measured three-up grid never appears
  - one concentric ring sits behind the primary action on every screen, marking the CTA as the centre of its own field

### Dials

- design_variance: 9
- motion_intensity: 5
- visual_density: 2

### Named references

- Sahana Sound — the only bespoke build in the direct set, and the proof that a single confident accent plus disciplined geometric SVG beats a palette; take its geometry, reject its enquiry-gated pricing and its mechanism claims
- Obys — arc- and grid-led studio composition where geometry carries the whole identity
- Readymag — editorial layouts that break the column without breaking legibility

### Rationale & differentiation

- **Rationale**: The client already owns the strongest possible structural idea and it is sitting unused inside her own logo — concentric light running outward from a centre — and this is the only direction that treats the mark as a **layout system** rather than as something to place in a header, which means the brand is legible even in a screenshot with the logo cropped out.
- **Differentiation**: The category's composition is a vertical stack of full-width strips — Wix strips at Aura Quartz, Elementor blocks at Omnes, Squarespace sections everywhere else — and its accent is one flat warm earth tone. This direction is built on circular geometry with no full-width strip anywhere and reserves the gold strictly for arcs, which is possible only because the arcs carry no information. It is also the direction that most visibly rejects the three-up service-card grid that Squarespace prescribes and every measured competitor ships.
- **Highest-variance direction of the ten** (`design_variance: 9`) — offered deliberately so Gate 2 is choosing across a real range rather than between neighbours.

### Imagery treatment

**The circular mask is this direction's answer to the light-ground problem.** The plates are masked to true circles at large scale (480–720px), which crops away their dark rectangular edges — the thing that would otherwise fight a blush ground — and leaves only the concentric field at the centre of each composition, which is the part of every plate that carries the light. `aura-two-people` becomes a large circle at Beat 1 with the reassurance copy set on an arc struck from the same centre. `aura-field-abstract` is the one plate permitted to break the mask: it runs full-bleed as the only rectangular image on the site, at the Beat 3/4 hinge, and that single break is the detail that rewards close attention. `aura-hands-between` is excluded entirely — a circular mask would render it as the exact category cliché the inventory warns about.

---

## Style 7: Ivory & Ink

**Basis**: research-derived — the category's own typographic preset, taken once and deliberately, and corrected at the point where it is actually a preset
**Personality**: Editorial, exacting, warm-cool
**Ground**: **light** (ivory) · **Gradient role**: **absent** — no gradient, and no gold anywhere in the system

### Colors

- primary: `#17121A` — ink
- secondary: `#4B3F52` — a warm graphite
- accent: `#C2187A` — magenta-deep, used **once per screen**, on the price
- background: `#FDFAF7` — ivory
- surface: `#F4EFE9`
- textPrimary: `#17121A`
- textSecondary: `#4B3F52`
- error: `#9E1B14`
- success: `#12603A`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                          | Ratio                   | Verdict                                     |
| --------------------------------------------- | ----------------------- | ------------------------------------------- |
| textPrimary `#17121A` on background `#FDFAF7` | **17.75:1**             | passes AA body                              |
| textPrimary `#17121A` on surface `#F4EFE9`    | **16.14:1**             | passes AA body                              |
| textSecondary `#4B3F52` on background         | **9.47:1**              | passes AA body                              |
| textSecondary `#4B3F52` on surface            | **8.62:1**              | passes AA body                              |
| error `#9E1B14` on background / surface       | **7.71:1** / **7.01:1** | passes AA body                              |
| success `#12603A` on background / surface     | **7.32:1** / **6.66:1** | passes AA body (factory `#16A34A` rejected) |
| accent `#C2187A` on background / surface      | **5.45:1** / **4.96:1** | passes AA body                              |
| CTA label `#FDFAF7` on ink `#17121A`          | **17.75:1**             | passes AA body                              |
| focus ring `#17121A` on background            | **17.75:1**             | passes SC 1.4.11 (3:1)                      |
| functional border `#847888` on background     | **4.02:1**              | passes SC 1.4.11 (3:1)                      |

Because this direction excludes gold entirely, it is the only one of the ten with no colour in its system that fails a contrast floor. Every value it can render is text-legal.

### Typography

- heading: Instrument Serif — https://fonts.google.com/specimen/Instrument+Serif
- body: Libre Franklin — https://fonts.google.com/specimen/Libre+Franklin
- mono: Roboto Mono — https://fonts.google.com/specimen/Roboto+Mono
- scale: 14 / 16 / 18 / 22 / 30 / 46 / 80
- body size: **18px**, line-height 1.65
- **weight discipline (the whole point)**: the display serif is set at **Regular**, very large, tight-tracked and hard-inked. It is never set light, never set at 300, and never floated in whitespace at 200

### Spacing

- base: 4
- scale: 4 / 8 / 16 / 28 / 44 / 72 / 112 / 176

### Visual

- radius: none — 0px; the only rounding on the page is optical, inside the letterforms
- shadow: flat — nothing; separation is carried by type scale alone, with no rules and no borders between content regions
- density: comfortable
- characteristics:
  - one enormous serif statement per beat, hard-inked, with body copy set close beneath it rather than floated away from it
  - the price is the only coloured thing on any screen — which makes publishing the price a _design_ feature, not just a trust one
  - the composition is classical and asymmetric: a wide measure and a narrow one, never centred

### Dials

- design_variance: 5
- motion_intensity: 2
- visual_density: 5

### Named references

- Re:Mind Studio — the design ceiling of the UK direct category and the exact preset this direction corrects; take its editorial ambition, refuse the ultralight weight that makes it indistinguishable from a template
- SSENSE — ink-on-paper commerce restraint where enormous type and a plain grid do all the work
- Kinfolk — warm-neutral editorial photography paired with type that never apologises for its size

### Rationale & differentiation

- **Rationale**: The practitioner is asking a sceptical adult to spend real money on something with no clinical evidence base, and the fastest non-verbal credibility signal available to her is editorial seriousness — a page that looks like a magazine feature reads as considered in a way that a spa brochure cannot, which is the right trade for a Carrier who is trying to tell a serious practitioner from a hobbyist.
- **Differentiation**: `competitors.md` names the typographic default precisely — _"a light-to-ultralight high-contrast serif display over a neutral grotesk body"_, concretely PP Editorial New Ultralight (Re:Mind), Marcellus (Blossom), Raleway (Sahana) — and warns that reaching for it _"is now indistinguishable from adopting a preset."_ This direction reaches for the same _class_ of face and rejects the three things that make it a preset: the ultralight weight, the airy float, and the warm metallic accent. It sets the serif at Regular and enormous, packs it hard against its body copy, and **removes gold from the palette entirely** — the accent measured on every competitor in the set (`#E1CCBE`, `#AB8041`, `#BFAD99`, `#EFE3B8`) is the one colour this direction refuses to own. What is left is ink, ivory, and one magenta price.
- Offered **once**, per the explicit constraint that naming this preset as a deliberate refined take is legitimate and repeating it is the preset.

### Imagery treatment

The plates run **full-bleed with no radius and no border**, and are given the largest single areas on the page — the ivory ground and the ink type are austere enough that the photography carries all of the site's warmth, which is how this direction avoids reading cold. Critically, the plates are **never scrimmed and never have type laid over them**: type sits on ivory, images sit alone. That separation is what stops the dark plates fighting the light ground — they alternate rather than overlap. `aura-radiant-portrait` runs at full viewport height at Beat 7 and is the only image in the composition with any brightness above the fold of its own section. `aura-hands-between` is excluded.

---

## Style 8: Warm Ledger

**Basis**: research-derived — one structure serving both the public site and the admin, answering the Mailchimp/Momence register-break measured in `competitors.md`
**Personality**: Structured, warm, operable
**Ground**: **duotone** — a persistent dark plum rail beside a light reading field, on both surfaces · **Gradient role**: the **rail's vertical falloff** only; the light field is achromatic apart from its accent

### Colors

The nine tokens describe the **light reading field**, which is the dominant ground. The dark rail is a documented second zone with its own computed figures.

- primary: `#C2187A` — magenta-deep; the light field's action colour
- secondary: `#E9C87E` — gold; the rail's accent, where it measures 10.89:1
- accent: `#3A1233` — plum-700; the rail itself
- background: `#FBF3F1` — blush
- surface: `#FFFFFF`
- textPrimary: `#26121F`
- textSecondary: `#5C4757`
- error: `#AE2018`
- success: `#0E6A3C`

### Contrast (computed — WCAG 2.2 AA)

**Light reading field** (background `#FBF3F1`, surface `#FFFFFF`):

| Pair                                      | Ratio                   | Verdict                                     |
| ----------------------------------------- | ----------------------- | ------------------------------------------- |
| textPrimary `#26121F` on background       | **16.15:1**             | passes AA body                              |
| textPrimary `#26121F` on surface          | **17.67:1**             | passes AA body                              |
| textSecondary `#5C4757` on background     | **7.70:1**              | passes AA body                              |
| textSecondary `#5C4757` on surface        | **8.42:1**              | passes AA body                              |
| error `#AE2018` on background / surface   | **6.36:1** / **6.95:1** | passes AA body                              |
| success `#0E6A3C` on background / surface | **6.10:1** / **6.68:1** | passes AA body (factory `#16A34A` rejected) |
| primary `#C2187A` on background           | **5.18:1**              | passes AA body                              |
| CTA label `#FFFFFF` on primary fill       | **5.67:1**              | passes AA body                              |
| functional border `#8F7887` on background | **3.69:1**              | passes SC 1.4.11 (3:1)                      |

**Dark rail** (background `#2B0E28`, surface `#3A1233`):

| Pair                                                | Ratio                     | Verdict                |
| --------------------------------------------------- | ------------------------- | ---------------------- |
| rail textPrimary `#F3E4EC` on rail / rail surface   | **14.31:1** / **13.03:1** | passes AA body         |
| rail textSecondary `#D2B4C5` on rail / rail surface | **9.26:1** / **8.43:1**   | passes AA body         |
| rail error `#F58A80` on rail                        | **7.38:1**                | passes AA body         |
| rail success `#6FCB99` on rail                      | **8.93:1**                | passes AA body         |
| secondary `#E9C87E` on rail / rail surface          | **10.89:1** / **9.91:1**  | passes AA body         |
| rail border / focus `#996E8C` on rail               | **4.15:1**                | passes SC 1.4.11 (3:1) |

**This is the direction that turns the brand README's split into an asset rather than a hazard.** The measured fact — gold fails on light (1.47:1) and inverts to 10.89:1 on the plum — becomes the rule that tells you which zone you are in: gold only ever appears on the rail, magenta-deep only ever in the field. Neither colour is ever asked to work on the ground where it fails.

### Typography

- heading: Epilogue — https://fonts.google.com/specimen/Epilogue
- body: Atkinson Hyperlegible — https://fonts.google.com/specimen/Atkinson+Hyperlegible (designed at the Braille Institute for maximum character disambiguation; chosen explicitly for the brief's 35–65 audience and its "reading glasses are somewhere else in the house" note)
- mono: JetBrains Mono — https://fonts.google.com/specimen/JetBrains+Mono
- scale: 13 / 15 / 17 / 20 / 25 / 32 / 46
- body size: **17px**, line-height 1.65

### Spacing

- base: 4
- scale: 4 / 8 / 12 / 20 / 28 / 40 / 60 / 88

### Visual

- radius: rounded — 8px on light-field cards, **0px in the rail**; the radius itself tells you which field you are in
- shadow: raised — three warm-tinted levels (1 / 4 / 12px) in the light field, and **zero** in the rail, which is flat by definition because it is a ground and not a surface
- density: comfortable
- characteristics:
  - one structure, two surfaces: the public rail carries identity, navigation and the emanation; the admin rail carries navigation and today's counts — same geometry, different contents
  - every colour has exactly one legal zone, which makes the palette self-policing rather than a thing to be careful with
  - the rail collapses to a top band under 768px without changing which colour lives where

### Dials

- design_variance: 4
- motion_intensity: 3
- visual_density: 6

### Named references

- Mailchimp — the register break this direction closes; its issues _"do not look like her site"_, and its double opt-in is an off-by-default toggle. Here the newsletter template is the same rail-and-field structure as the site, so she cannot send something off-brand
- Height — rail-plus-workspace structure where the rail carries state and the field carries work
- Notion — a persistent navigation rail that stays quiet enough for the content beside it to be the subject

### Rationale & differentiation

- **Rationale**: The brief's load-bearing distinction is _"the admin is not a CMS — configurable content, fixed design"_, and the owner is non-technical and _"not comfortable with anything that looks like software"_ — a single structure she learns once and then recognises on the public site, in the admin, and in the newsletter template is the most direct design expression of that requirement, and it is why this direction is the strongest candidate on the §15 owner-independence metric.
- **Differentiation**: The category's practitioner sites are single-column vertical stacks with a top nav; the third-party tools bolted onto them (Calendly, Momence, Acuity, Mailchimp) each arrive with their own type, colour, radius and motion, which `competitors.md` measured as a visible foreign body every time. This direction refuses both the single-column stack _and_ the seam: the persistent dark rail is a composition no measured competitor uses, and it is deliberately the _same_ composition that carries the newsletter and the admin. Where every competitor has three visual worlds, this has one.
- It is also the only direction that resolves the brand's central colour tension structurally rather than by care — a gold that fails on light and a magenta that fails on dark are given a zone each, and the failure becomes impossible rather than merely avoided.

### Imagery treatment

The rail is dark, so the plates get a **dark home on a light-ground direction** — the one place in the composition where they need no accommodation at all. The rail carries a single tall plate at 3:4 (`aura-two-people` on the home page, `aura-field-abstract` elsewhere) running its full height, with the logo's dark-ground lockup over it. In the light reading field the plates appear at 8px radius, at moderate scale, with a warm hairline — treated as content rather than as atmosphere. The result is that every screen has both a large dark image and a bright legible reading surface at all times, which is this direction's answer to warmth-plus-credibility: it does not choose between them, it gives each one a column.

---

## Style 9: Low Amber

**Basis**: research-derived — the night-side register at maximum restraint; deliberately withholds the gradient, the magenta and the plum
**Personality**: Quiet, amber, certain
**Ground**: **dark** (deep warm brown, not plum) · **Gradient role**: **absent from the interface entirely** — the only magenta on the entire site is inside a photograph

### Colors

- primary: `#E9C87E` — gold; the single chroma in the system
- secondary: `#C99A3F` — gold-deep
- accent: `#EFD9A8` — a paler gold for hover and focus states
- background: `#1B1310` — a deep warm brown; adjacent to the brand's dark without being its plum
- surface: `#241A16`
- textPrimary: `#F2E9DE`
- textSecondary: `#BFAE9B`
- error: `#F0857A`
- success: `#6FC48F`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                          | Ratio                     | Verdict                                                           |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| textPrimary `#F2E9DE` on background `#1B1310` | **15.24:1**               | passes AA body                                                    |
| textPrimary `#F2E9DE` on surface `#241A16`    | **14.17:1**               | passes AA body                                                    |
| textSecondary `#BFAE9B` on background         | **8.49:1**                | passes AA body                                                    |
| textSecondary `#BFAE9B` on surface            | **7.89:1**                | passes AA body                                                    |
| error `#F0857A` on background / surface       | **7.27:1** / **6.76:1**   | passes AA body                                                    |
| success `#6FC48F` on background / surface     | **8.69:1** / **8.08:1**   | passes AA body                                                    |
| primary `#E9C87E` on background / surface     | **11.36:1** / **10.55:1** | passes AA body                                                    |
| secondary `#C99A3F` on background             | **7.13:1**                | passes AA body — the same gold-deep that fails at 2.35:1 on blush |
| accent `#EFD9A8` on background                | **13.22:1**               | passes AA body                                                    |
| CTA label `#1B1310` on gold fill              | **11.36:1**               | passes AA body                                                    |
| focus ring `#E9C87E` on background            | **11.36:1**               | passes SC 1.4.11 (3:1)                                            |
| functional border `#8A755F` on background     | **4.18:1**                | passes SC 1.4.11 (3:1)                                            |

This is the only direction where **every** colour in the palette clears AA body on its own ground, including `gold-deep`, which fails on every light ground in this project. Restricting the palette to one hue family is what buys that.

### Typography

- heading: Spectral — https://fonts.google.com/specimen/Spectral (a screen-first serif with real texture and low-ish contrast — the opposite end of the serif spectrum from the category's ultralight didones)
- body: Karla — https://fonts.google.com/specimen/Karla (wide apertures and a generous x-height; unusually legible at 17px for an older reader)
- mono: Chivo Mono — https://fonts.google.com/specimen/Chivo+Mono
- scale: 14 / 16 / 17 / 20 / 26 / 34 / 50
- body size: **17px**, line-height 1.7

### Spacing

- base: 4
- scale: 4 / 8 / 12 / 18 / 28 / 44 / 68 / 104

### Visual

- radius: subtle — 2px, and **only** on the gold CTA fill; every other element in the system is square
- shadow: flat — no elevation anywhere in the interface. The only light in the composition comes out of the photographs, which is the entire concept
- density: compact
- characteristics:
  - one hue family, no gradient, no second accent — the discipline _is_ the design
  - gold 2px underline on links; a solid gold CTA with a near-black label; nothing else is coloured
  - copy is set tight and low-contrast in rhythm, so the page reads at the pace of someone speaking carefully

### Dials

- design_variance: 3
- motion_intensity: 1
- visual_density: 7

### Named references

- Aura Quartz Healing — its warm photography is genuinely good and is buried under Wix strips and unsubstantiated claims (_"can manifest as a range of distressing physical and mental symptoms"_); this direction keeps the warmth and takes none of the claims
- Le Labo — amber apothecary restraint where a single warm hue and near-zero ornament reads as expensive
- Monocle — dense, quiet editorial that trusts the reader's attention instead of competing for it

### Rationale & differentiation

- **Rationale**: The brief's voice is _"warm, unhurried, quietly certain"_, and of those three words the hardest to design is **certain** — certainty reads as the absence of persuasion, so this direction removes every persuasive device it can (no gradient, no second colour, no elevation, no motion) and lets the copy and the photography carry the whole page, which is the strongest available answer to a category that _"either overclaims or hides behind jargon."_
- **Differentiation**: The category's palette default is a cream ground with exactly one warm accent; this inverts the _ground_ while keeping the single-accent discipline, so it reads as the same restraint the category aspires to, executed in the register the brief actually asks for. Against Othership — whose `#372338` is the nearest neighbour to this brief's plum — it differentiates on three measured axes at once: **not plum** (a warm brown), **not condensed** (a textured book serif), and **not acid** (`#DBF572` replaced by the brand's own gold). And it is the only direction that treats the gold→magenta gradient as something to withhold, which `competitors.md` supports: the gradient is an unoccupied gap, and a gap is an opportunity to be spent deliberately, not a mandate.
- **`motion_intensity: 1`** — literally nothing moves. This is the stillness pole of the ten.

### Imagery treatment

**The plates are not graded, and that is the concept.** An earlier instinct here would be to colour-grade the commissioned photography into the amber world — which would destroy the magenta the client paid for. Instead the interface gives up its chroma so the photographs can keep theirs: the UI is a single gold hue, and the **only magenta and coral anywhere on the site live inside the six plates**. Arriving at `aura-two-people` after a screen of amber-on-brown type, the plate's gold-to-magenta field is the most colourful thing the visitor has seen, and it reads as the work itself breaking through a very quiet room. Plates run full-bleed at 0px radius with no overlay. `aura-radiant-portrait` closes Beat 7 as the single brightest frame on the site.

---

## Style 10: Plate Study

**Basis**: research-derived — the six commissioned plates treated as the primary asset and the composition built as a photo essay
**Personality**: Photographic, spacious, understated
**Ground**: **light** — a pale plum tint, deliberately not the category's cream · **Gradient role**: **absent from the interface**; it exists only inside the photographs

### Colors

- primary: `#3A1233` — plum-700; a deep plum action colour drawn from the artwork's own falloff
- secondary: `#C2187A` — magenta-deep
- accent: `#C99A3F` — gold-deep. **NON-TEXT ONLY** at 2.25:1 (see table); decorative hairlines beneath plate captions
- background: `#F4EEF2` — a pale plum tint. The category's light ground is cream, sand or off-white in every measured case; a light plum is unoccupied on both sides of the chromatic gap
- surface: `#FCFAFB`
- textPrimary: `#221020`
- textSecondary: `#584A56`
- error: `#A9221A`
- success: `#0F6539`

### Contrast (computed — WCAG 2.2 AA)

| Pair                                          | Ratio                   | Verdict                                                                                                       |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| textPrimary `#221020` on background `#F4EEF2` | **15.79:1**             | passes AA body                                                                                                |
| textPrimary `#221020` on surface `#FCFAFB`    | **17.37:1**             | passes AA body                                                                                                |
| textSecondary `#584A56` on background         | **7.26:1**              | passes AA body                                                                                                |
| textSecondary `#584A56` on surface            | **7.99:1**              | passes AA body                                                                                                |
| error `#A9221A` on background / surface       | **6.26:1** / **6.89:1** | passes AA body                                                                                                |
| success `#0F6539` on background / surface     | **6.24:1** / **6.87:1** | passes AA body (factory `#16A34A` rejected)                                                                   |
| secondary `#C2187A` on background / surface   | **4.95:1** / **5.45:1** | passes AA body                                                                                                |
| primary `#3A1233` on background               | **13.97:1**             | passes AA body                                                                                                |
| CTA label `#F4EEF2` on primary fill           | **13.97:1**             | passes AA body                                                                                                |
| focus ring `#3A1233` on background            | **13.97:1**             | passes SC 1.4.11 (3:1)                                                                                        |
| functional border `#806C7E` on background     | **4.21:1**              | passes SC 1.4.11 (3:1)                                                                                        |
| accent `#C99A3F` on background                | **2.25:1**              | **FAILS all text floors — decorative caption hairlines only; never type, never a border, never a focus ring** |

Note that `magenta-deep` measures **4.95:1** here rather than the 5.18:1 it reaches on blush — the plum-tinted ground costs a little contrast, and it still clears AA body. This is exactly the kind of drift the brief warns is invisible by eye, which is why it was computed rather than assumed from the README's blush figure.

### Typography

- heading: Jost — https://fonts.google.com/specimen/Jost (geometric sans, set wide-tracked and lowercase at moderate size — display _quietness_, so the type never competes with a photograph)
- body: Manrope — https://fonts.google.com/specimen/Manrope
- mono: Azeret Mono — https://fonts.google.com/specimen/Azeret+Mono
- scale: 13 / 15 / 17 / 20 / 26 / 36 / 56
- body size: **17px**, line-height 1.7

### Spacing

- base: 8
- scale: 8 / 16 / 24 / 40 / 56 / 88 / 136 / 200

### Visual

- radius: none — 0px throughout; plates bleed to the viewport edge with nothing rounded anywhere
- shadow: subtle — a single soft under-image shadow so a full-bleed plate lifts fractionally off the pale ground; no other elevation exists
- density: spacious
- characteristics:
  - the site is sequenced like a photo book — image, caption, silence, image — and the seven beats are its chapters
  - type is deliberately subordinate: no headline exceeds 56px, and the largest thing on any screen is always a photograph
  - a 3px magenta-deep caption rule at the left of every plate caption is the only chromatic element in the interface

### Dials

- design_variance: 6
- motion_intensity: 3
- visual_density: 3

### Named references

- Squarespace wellness templates (Jenani / Anza / Clune / Aurora / Clove) — the composition this direction refuses: they open with a soft-focus hero photograph as _mood_; this uses commissioned photography as _evidence_, in sequence, with captions
- Magnum Photos — photo-essay sequencing where the order of the images is the argument
- Airbnb — full-bleed photo-led composition that stays legible and bookable at scale

### Rationale & differentiation

- **Rationale**: Six art-directed plates is an unusually strong asset for a sole practitioner — most of the measured category is running stock or phone photography — and this is the only direction that spends the whole design budget on them, which matters because the brief's own note says `aura-two-people` _"does the reassurance work faster than the copy will"_, and a photo-essay structure is the composition that lets that be literally true.
- **Differentiation**: `competitors.md` measured the imagery default as _"soft-focus interiors, crystals, hands, candles, and low-saturation photography of empty rooms"_ — photography used as atmosphere, placed behind a headline, with nothing asked of it. This direction inverts that on two axes at once: every plate is **captioned**, in sequence, so the photography makes a claim rather than setting a mood; and the ground is a **pale plum** rather than the cream that 5 of 6 measured sites ship, which keeps the light direction inside the brand's own hue instead of borrowing the category's. It is the light-ground counterpart to the chromatic-gap play — nobody in the set is on a plum ground at either end of the value scale.
- The one direction where the brief's `MediaAsset` and auto-processing requirement (§12 — _"uploads are cropped to the target ratio and given a palette treatment"_) is load-bearing rather than defensive: a photo essay is exactly where one unprocessed phone snapshot would do the most damage.

### Imagery treatment

This is the imagery direction, so the treatment _is_ the design. All six plates run **full-bleed at 100vw, 0px radius, uncropped where possible and cropped only to the declared ratio**, each with a caption set at 15px beneath it and a 3px magenta-deep rule at the caption's left edge. The pale plum ground is a deliberate mediator between the dark plates and a light page: at `#F4EEF2` it is closer in hue to the plates' own shadows than cream would be, so the transition from ground to photograph reads as a dimming rather than as a collision — the failure mode a `#FFFFFF` ground would produce. The sequence is fixed to the beats: `aura-two-people` (Root, and the first thing on the site), `aura-light-in-a-room` (Sacral), `aura-seated-figure` (Solar plexus/Heart), `aura-field-abstract` (Throat — a non-figurative pause where the copy names what the work is not), `aura-radiant-portrait` (Crown, full viewport). `aura-hands-between` is the reserve and appears nowhere in the essay; in a photo-led direction it would be the most exposed possible placement of the category's most-reproduced composition.

---

## Divergence audit (for the Gate-2 reviewer)

| #   | Style               | Ground             | Heading            | Body                  | Radius  | Shadow | Density     | var / mot / den | Gradient is for    |
| --- | ------------------- | ------------------ | ------------------ | --------------------- | ------- | ------ | ----------- | --------------- | ------------------ |
| 1   | Field Emanation     | dark plum          | Cormorant Garamond | Source Sans 3         | none    | flat   | spacious    | 4 / 4 / 3       | radial emanation   |
| 2   | Consulting Room     | light ivory        | Newsreader         | Public Sans           | subtle  | subtle | comfortable | 2 / 2 / 5       | absent             |
| 3   | Long Dusk           | split dark→light   | Fraunces           | Literata              | rounded | subtle | spacious    | 6 / 3 / 4       | the page ground    |
| 4   | Plain Type          | light ivory        | Archivo            | Petrona               | none    | flat   | comfortable | 7 / 1 / 6       | absent             |
| 5   | Nightfield Terminal | dark near-black    | Space Grotesk      | IBM Plex Sans         | subtle  | flat   | compact     | 3 / 2 / 8       | a 1px rule         |
| 6   | Concentric          | light blush        | Syne               | Hanken Grotesk        | pill    | subtle | spacious    | 9 / 5 / 2       | arc strokes        |
| 7   | Ivory & Ink         | light ivory        | Instrument Serif   | Libre Franklin        | none    | flat   | comfortable | 5 / 2 / 5       | absent             |
| 8   | Warm Ledger         | duotone rail/field | Epilogue           | Atkinson Hyperlegible | rounded | raised | comfortable | 4 / 3 / 6       | the rail's falloff |
| 9   | Low Amber           | dark brown         | Spectral           | Karla                 | subtle  | flat   | compact     | 3 / 1 / 7       | absent             |
| 10  | Plate Study         | light pale plum    | Jost               | Manrope               | none    | subtle | spacious    | 6 / 3 / 3       | absent             |

**Guardrail check.** Dark grounds: 3 (styles 1, 5, 9) — floor met. Light grounds: 5 (styles 2, 4, 6, 7, 10) — floor met. Split/duotone: 2 (styles 3, 8). Heading families: 10 distinct, zero repeats. Body families: 10 distinct (floor was 5). Mono families: 10 distinct. `design_variance` spread: 2 → 9 = **7 points** (floor was 4). `visual_density` spread: 2 → 8, with two compact and four spacious. `motion_intensity` range 1 → 5 — held low across the whole set because stillness is this project's fingerprint, not a fixed 1–10 ramp. Radius range `0px → circle`, concentrated low with the circle as a brand-derived outlier — deliberately **not** the generic `0px → pill` ladder. Elevation vocabulary is light-based (`radial bloom`, `inset ring`, `long ambient`, `none`) rather than generic drop-shadow tiers, because a still, low-lit brand has almost no elevation and that is itself the fingerprint. Gradient present in 6, deliberately absent in 4. No direction uses a condensed display face; no direction reuses a typeface measured on any competitor (Marcellus, Lato, Work Sans, Roboto, Raleway, Inter, PP Editorial New, PP Object Sans, Lido Condensed, Founders Grotesk, DM Serif Display, DM Sans, Gilroy). Exactly one direction (7) takes the high-contrast display serif, and it refuses the ultralight weight that is the actual preset.

**Accessibility check.** Every one of the ten states computed ratios for `textPrimary` and `textSecondary` against both `background` and `surface`; the lowest text-role figure anywhere in the set is **7.26:1** (Style 10 `textSecondary` on background), well clear of the 4.5:1 AA body floor, and every direction's `error` and `success` values were computed against both grounds too. The factory default `success: #16A34A` (**3.30:1** on white) appears in no direction. Four values were changed _because_ the computation failed them and would not have been caught by eye: `magenta #D6338A` on plum-800 (3.93:1 → replaced with `rose #E85D9B`, 5.41:1) in Style 1; the same magenta on near-black (4.39:1 → `rose`, 6.04:1) in Style 5; the README's derived gold `#8A6A22` on the `#F5EFE9` tint (4.42:1 → `#7E611F`, 5.09:1) in Style 4; and four dark-ground borders that missed the WCAG 2.2 SC 1.4.11 3:1 non-text floor. Every remaining sub-floor value in the set is gold or gold-deep on a light ground, is labelled **non-text / decorative only** with its measured figure, and is explicitly barred from type, functional borders and focus rings.
