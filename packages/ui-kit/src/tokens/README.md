# Tokens — The Field Work (`the-lit-clearing`)

Source of truth: `tokens.json` (W3C DTCG). `tokens.css` and `tokens.ts` are
generated from it — do not hand-edit either; re-run `/stylesheet`.

## Dark-default derivation — read this before changing anything here

`/stylesheet`'s default algorithm assumes the Analyst specified a **light**
theme and derives a `.dark` override by swapping the neutral ramp. **This
project is the inverse of that assumption, and applying the default algorithm
here would invert the entire brand.**

Evidence, in order of authority:

1. The winning mockup's `<html>` element carries `data-theme="dark"`
   **unconditionally** — there is no toggle, no `prefers-color-scheme` query,
   and no light variant anywhere in either approved screen
   (`docs/mockups/the-lit-clearing-3-1/webapp/home.html`,
   `.../admin/admin-dashboard.html`).
2. `docs/design-directions.json`'s `the-lit-clearing` direction states the
   ground explicitly: _"the deepest ground in the whole set — #160712,
   plum-900 taken one step further down, so the blush pool cut into it reads
   as an actual opening rather than as a panel. **The page ground is ALWAYS a
   plate at reduced luminance over that value; the flat colour is never seen
   bare.**"_
3. The direction's own `excludes` list bars a light theme structurally: _"No
   bare dark. Every pixel outside a clearing carries a plate at reduced
   luminance... A flat black region is a failed render rather than restraint,
   and this territory has none on any screen including the admin."_ — the
   inverse statement (a flat LIGHT background) never appears as an option
   anywhere in the direction.

**Decision: `:root` carries the dark values directly.** There is no `.dark`
override block that flips a light default to dark — `:root` and
`[data-theme="dark"]` in `tokens.css` are byte-identical aliases of the SAME
values. The `[data-theme="dark"]` selector exists only because (a) the
approved mockups literally set that attribute on `<html>` and (b) the kit's
`tailwind.config.ts` declares `darkMode: ["class", '[data-theme="dark"]']` for
forward-compatibility with the shared Tailwind config shape — not because a
second theme exists to select between.

**Getting this backwards** (treating `#FBF3F1` blush as the base `:root` and
`#160712` plum as a `.dark` override) would make every screen render
light-on-white by default and require an explicit dark-mode opt-in the brand
never asked for and the approved, signed-off mockups never show. That is the
one mistake this file exists to prevent.

## The pool — a per-surface inversion, not a light mode

The direction's signature move is **one hard-edged pool of blush light per
viewport**, holding plum ink — and it appears on **every single screen**,
public and admin, at all times. It is not something the user switches to; it
coexists with the dark plate on every viewport simultaneously. This is why the
pool is modeled as its own token family, `color.pool.*`, rather than as an
alternate theme:

| Token                      | Value     | Use                                                                               |
| -------------------------- | --------- | --------------------------------------------------------------------------------- |
| `color.pool.surface`       | `#FBF3F1` | the pool background (identical to `color.surface.inverted`)                       |
| `color.pool.text`          | `#1E0A1C` | primary ink inside the pool — 17.21:1, the highest-contrast pairing in the system |
| `color.pool.textSecondary` | `#5A4356` | muted text inside the pool — 8.09:1                                               |
| `color.pool.border`        | `#8A7285` | hairlines inside the pool (ledger rows, admin in-pool nav) — 3.98:1               |
| `color.pool.danger`        | `#A3221A` | error copy/icons drawn ON the pool — 6.85:1                                       |
| `color.pool.success`       | `#0F6B3D` | confirmation copy/icons drawn ON the pool — 6.01:1                                |

Any component composed **inside** a pool (Button, Card-as-pool-panel, the
schedule ledger, the admin "Today" clearing) reads from `color.pool.*`.
Anything composed **on the plate** (nav links, eyebrows, captions, the footer)
reads from the standard `color.text.*` / `color.border.*` / `color.semantic.*`
triad, which is tuned for the dark ground.

## The palette is context-locked — do not cross the edge

The direction's own computed contrast data makes each accent colour usable in
**exactly one** context, by design (`docs/design-directions.json` →
`derivedStyle.rejectedByComputation`):

- `color.accent.500` (`#C2187A` magenta-deep / primary) — **3.45:1 on the dark
  ground (fails AA body). 5.18:1 on the pool (passes).** POOL-ONLY. Never use
  as text or a fill color on a dark plate.
- `color.secondary.500` (`#E9C87E` gold) — **10.89:1 on the dark ground
  (passes). 1.47:1 on the pool (fails everything).** PLATE-ONLY. Never use
  inside a pool.
- `color.highlight.500` (`#F5876F` coral / the locked `accent` slot in
  `selected-style.json.palette`) has **zero observed usage** in either
  approved mockup. It is still shipped (future-proofing per step 8.5 §1) but
  has no confirmed context yet — treat it as plate-safe by default (it tests
  at 7.99:1 on background per the direction's contrast table) until a screen
  proves otherwise.

This is the direction's own stated concept, not an accident: _"each colour
belongs to one side of the edge and crossing is a contrast failure as well as
a concept failure"_ (excludes list). Any consumer reaching for `accent-500`
outside a pool, or `secondary-500` inside one, is both an accessibility bug
and a violation of the signature move.

## No blue in this system

`color.semantic.info` and `color.semantic.warning` both resolve to
`color.secondary.500` (gold). This is deliberate, not a placeholder: the
locked nine-token palette (`selected-style.json.palette`) is warm-only — there
is no cool/blue hue anywhere in the brand's colour record
(`assets/brand/README.md`'s eleven sampled values are all plum/gold/coral/rose/
magenta family). Introducing a blue "info" swatch would violate the "max one
accent color, derived from research" constraint and the direction's own
closed palette. Distinguish info/warning states by **icon + copy**, never by
hue alone (this also satisfies WCAG 1.4.1 — never color-alone).

## Shape law — radius and shadow

The direction's `excludes` ban border-radius and box-shadow outright: _"No
drop shadow, no card, no rounded rectangle, no three-up grid... 0px radius on
everything that is not the pool."_ The approved admin mockup states it in its
own CSS comment: _"Zero radius, zero shadow anywhere — the cut edge is the
only elevation and the only boundary in the system."_

- `radius.none` is the **working default** for every primitive: Button, Card,
  Badge, Input, the pool itself. Do not reach for `radius.md` or `radius.lg`
  anywhere in this kit's screens.
- `radius.full` is the **one exception**, reserved for true circles only (the
  Heart-section practitioner Avatar, `border-radius: 50%` in the approved
  mockup). It is never a pill button and never a rounded card corner.
- `shadow.*` all resolve to `none`. The scale is kept for DTCG schema
  completeness and so a future kit consumer outside this direction's own
  screens (e.g. a generic focus-ring fallback) has something to reference —
  never apply any of them to this direction's own components.

## Typography

- `typography.fontFamily.display` (Cormorant Garamond) is **display-only** —
  never body text, never a form label, never below ~26px. `assets.md`'s Style
  4 block documents the hard constraint that motivated this (Cormorant's
  hairline weights disappear on dark grounds below 500/600); the approved
  mockup itself uses weight 400 successfully, but only ever at display sizes
  (23px+ headline clamps) — never as running text.
- `typography.fontSize.md` (18px) is the **pool body** default, matching the
  approved mockup's `.body { font-size: 18px; line-height: 1.62 }` exactly.
- `typography.fontSize.sm` (17px) is the **legibility floor** — the direction
  states body must never go below 17px anywhere on the public site.
- `typography.fontSize.xs` (15px) is reserved for **plate-side captions and
  mono labels only** (the admin's uppercase mono metadata, the masthead
  timestamp) — the direction's one documented exception below the 17px floor,
  and it must never go smaller.
- `typography.letterSpacing.wide` (0.18em) matches the approved mockup's
  `.eyebrow` tracking exactly — reach for it whenever composing an eyebrow /
  uppercase mono label.

## Dial-driven defaults applied this run

Per `docs/selected-style.json.dials`:

- `motion_intensity: 3` → `motion.duration.normal` locked to **150ms**, no
  spring easing applied by default anywhere (the `spring` easing token is
  shipped for schema completeness only). Matches the approved mockups' own
  near-zero motion budget: one 24s ambient plate-scale drift on the hero, and
  140ms **linear** micro-transitions on admin links — nothing else animates.
- `visual_density: 4` sits in the dial mapping's unbranched middle band (the
  skill's rule only fires at ≤3 or ≥7) — no density-driven token override
  applied; spacing values are the plain scale.
- `design_variance: 8` (≥7 branch) → asymmetric layout defaults, at least one
  broken-grid pattern. This is realized structurally by the mockup's own
  "swinging wedge" composition (the pool's horizontal anchor alternates
  left/right/left down the page and its width grows monotonically every
  beat) — a layout fact, not a token, but recorded here so a re-run of
  `/stylesheet` with a changed `design_variance` knows to re-examine it.

## Naming conventions

- CSS custom properties: `--{category}-{subcategory?}-{step}`, e.g.
  `--color-accent-500`, `--font-size-md`, `--spacing-0_5` (`.` becomes `_` in
  the custom-property name because CSS identifiers can't contain a literal
  dot outside of the value).
- `tokens.ts` mirrors `tokens.json`'s nesting exactly — `tokens.color.pool.text`,
  `tokens.motion.duration.normal`, etc.
- Every non-obvious token carries a `$description` in `tokens.json` explaining
  which mockup instance it was extracted from and why. Read those before
  guessing at intent.
