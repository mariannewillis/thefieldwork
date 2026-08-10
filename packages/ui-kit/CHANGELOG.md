# @repo/ui-kit — changelog

## 0.1.0-tokens-only — 2026-08-08

First `/stylesheet` run. Agnostic core only; React primitives land via
`/stylesheet-primitives` once `/architect` picks the stack.

**Direction:** `the-lit-clearing` (Gate 2, projected from `design-directions.json`
via the contracts package's own projector). Winning mockup:
`the-lit-clearing-3-1`.

**Dial mapping applied** — `design_variance: 8` (asymmetric layout defaults, the
mockup's alternating-anchor composition), `motion_intensity: 3`
(`duration.normal = 150ms`, fades only, no spring by default), `visual_density: 4`
(mid-band, no override).

**Decisions worth carrying forward:**

- **Dark-default.** `:root` carries the plum values directly and
  `[data-theme="dark"]` is a byte-identical alias — there is no light-mode flip to
  get backwards. Reasoning in `src/tokens/README.md`.
- **The pool is a surface, not a theme.** Blush clearings are modelled as
  `color.pool.*` because the dark plate and the light pool coexist in the same
  viewport on every screen.
- **The palette is context-locked.** `accent.500` (magenta) is pool-only —
  3.45:1 on the plate fails, 5.18:1 in a pool passes. `secondary.500` (gold) is
  plate-only — 10.89:1 on dark, 1.47:1 in a pool fails. Swapping them is a
  legibility failure, not a style choice.
- **Hard edges.** `radius.none` is the working default and every `shadow.*`
  resolves to `none`; the cut edge of pool against plate is the only elevation
  cue. The single sanctioned curve in the system is a true-circle avatar.
- **Typography** — Cormorant Garamond (display), Source Sans 3 (body, 18px in a
  pool / 17px floor), Azeret Mono (tabular + machine references). Corrected at
  source: the direction's `derivedStyle` still carried Newsreader/Karla, which
  appear nowhere in the approved mockups.

**Shipped:** tokens (JSON/CSS/TS + README), fonts.css, globals.css (with the
bug-077 `@tailwind` header), tailwind.config.ts, preview-bootstrap.html
(self-contained — token vars inlined, never linked), lib/{cn,cva,motion},
`.components-plan.json`, `.components-shapes.json`, `.patterns-extracted.json`
plus 8 extracted patterns, stub `package.json`, and
`docs/design-system-preview.html` (coverage audit: PASS).

**Catalog note.** `components.md`'s `projectSpecific` was collapsed 68 → 20
before the plan was built: 7 entries were landing-page narrative beats, 12
resolved to components the kit already ships, and 29 merged into shared local
names. Provenance is on each entry's `mergedFrom`.
