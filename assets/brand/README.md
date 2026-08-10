# The Field Work — brand assets

The client supplied one thing: `../TheFileWork.png` — a gradient-filled figure
over a plum ground, with the wordmark beneath. Everything here derives from it.

## Files

The logo traced to vector — the mark Marianne already has, refit as bezier
curves so it is crisp at any size and recolourable. Traced, not redrawn.

| File                        | What it is                                   |
| --------------------------- | -------------------------------------------- |
| `logo-mark.svg`             | Mark only, transparent. Dark grounds.        |
| `logo-mark-light.svg`       | Mark only, deepened gradient. Light grounds. |
| `logo-primary.svg`          | Stacked lockup (mark over wordmark). Dark.   |
| `logo-primary-light.svg`    | Stacked lockup. Light grounds.               |
| `logo-horizontal.svg`       | Horizontal lockup. Dark grounds.             |
| `logo-horizontal-light.svg` | Horizontal lockup. Light grounds.            |

Both a light-ground and a dark-ground variant of every lockup exist, so either
choice stays open.

## Colours present in the artwork

Sampled from the reference's own gradient and ground. **These are facts about
the artwork, not role assignments** — which colour becomes the page ground, and
what the gradient is for, are design decisions.

| Name           | Hex       | Where it occurs                                  |
| -------------- | --------- | ------------------------------------------------ |
| `plum-900`     | `#1E0A1C` | Darkest region of the ground                     |
| `plum-800`     | `#2B0E28` | The artwork's ground                             |
| `plum-700`     | `#3A1233` | Lighter plum in the ground's falloff             |
| `gold`         | `#E9C87E` | Gradient start; the wordmark's own colour        |
| `gold-deep`    | `#C99A3F` | A darker gold                                    |
| `coral`        | `#F5876F` | Gradient, first third                            |
| `rose`         | `#E85D9B` | Gradient, second third                           |
| `magenta`      | `#D6338A` | Gradient end                                     |
| `magenta-deep` | `#C2187A` | Magenta darkened for light grounds               |
| `blush`        | `#FBF3F1` | Not in the source — a near-white plum complement |
| `ivory`        | `#FDFAF7` | As above, a second light option                  |

## Measured contrast (computed, not estimated)

| Colour                 | on `blush #FBF3F1` | on `ivory #FDFAF7` | AA body (4.5:1) |
| ---------------------- | ------------------ | ------------------ | --------------- |
| `gold #E9C87E`         | 1.47:1             | 1.55:1             | fails           |
| `gold-deep #C99A3F`    | 2.35:1             | 2.47:1             | fails           |
| `magenta #D6338A`      | 4.08:1             | 4.30:1             | fails           |
| `magenta-deep #C2187A` | 5.18:1             | 5.45:1             | passes          |

Consequences, as facts: on a light ground **neither gold clears the AA body
floor, nor the 3:1 large-text floor** — gold is a non-text colour there (rules,
edges, marks, fills). `magenta-deep` is the light-ground text-safe magenta. On
the dark grounds it inverts: `gold #E9C87E` on `plum-800` measures **10.89:1**.
If a light direction wants gold _type_, `#8A6A22` clears at 4.61:1 — derived,
not from the artwork, and optional.

Re-measure before trusting any contrast claim in this file.

## Type

The wordmark is set in a Cormorant-family display face. That is a fact about the
logo, not automatically the site's display face, and it says nothing about body
type.

## Measured contrast — DARK grounds (added 2026-08-06)

The table above covers light grounds only, which left the symmetric trap
undocumented: **the light-ground-safe magenta is NOT safe on the dark ground.**
Computed with the same method (WCAG 2.x relative luminance); the method
reproduces every figure in the light table above exactly.

| Colour                 | on `plum-900 #1E0A1C` | on `plum-800 #2B0E28` | on `plum-700 #3A1233` | AA body (4.5:1) |
| ---------------------- | --------------------- | --------------------- | --------------------- | --------------- |
| `gold #E9C87E`         | 11.68:1               | 10.89:1               | 9.91:1                | passes          |
| `gold-deep #C99A3F`    | 7.33:1                | 6.84:1                | 6.22:1                | passes          |
| `coral #F5876F`        | 7.69:1                | 7.17:1                | 6.53:1                | passes          |
| `rose #E85D9B`         | 5.80:1                | 5.41:1                | 4.92:1                | passes          |
| `magenta #D6338A`      | 4.21:1                | 3.93:1                | 3.58:1                | **fails**       |
| `magenta-deep #C2187A` | 3.32:1                | 3.10:1                | 2.82:1                | **fails**       |
| `blush #FBF3F1`        | 17.21:1               | 16.04:1               | 14.60:1               | passes          |
| `ivory #FDFAF7`        | 18.10:1               | 16.88:1               | 15.37:1               | passes          |

Consequences, as facts:

- **The two magentas invert.** `magenta-deep #C2187A` is the light-ground
  text-safe magenta (5.18:1 on blush) and is the WORST performer on dark
  (3.10:1 on `plum-800`, and 2.82:1 on `plum-700` where it fails even the 3:1
  large-text and non-text floor). `magenta #D6338A` fails AA body on BOTH
  ground families. Neither magenta is a body-text colour on a dark ground.
- **`rose #E85D9B` is the dark-ground text-safe pink** (5.41:1 on `plum-800`).
  If a dark direction wants pink type, this is the one — but note it drops to
  4.92:1 on `plum-700`, so it clears AA body on the darker two grounds only.
- **Gold is the opposite of what it is on light.** On light grounds gold fails
  everything; on dark it is the strongest warm colour available at 10.89:1.

### WCAG 2.2 SC 1.4.11 — the non-text floor (3:1)

Borders, rules, focus rings, input outlines and icon strokes need **3:1
against their adjacent colour**, not 4.5:1 — and this is the check that gets
skipped, because it is invisible to anyone reviewing by eye. On these dark
grounds a hairline border in any mid-gradient stop is likely to miss it.
Measure the border against the ground it sits on, not against the page.

### One factory default to override

The factory's default `success: #16A34A` measures **3.30:1 on pure white** and
**fails AA body**. Any light-ground palette in this project must substitute a
darker green and state the computed ratio. This is a known factory-wide issue,
not specific to this client.
