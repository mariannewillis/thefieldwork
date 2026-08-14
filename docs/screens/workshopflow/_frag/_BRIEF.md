# Workshop-flow ADMIN screens — shared authoring brief

You are authoring ONE `<main>` fragment for the admin side of The Field Work's
workshop booking flow. Five screens are being authored in parallel by five
agents against this brief; yours is named in your dispatch.

---

## 1 · THE FRAGMENT CONTRACT (read this twice)

**You write exactly one file: `_frag/<your-screen-id>.html`** — and optionally
`_frag/<your-screen-id>.dialogs.html` for top-level `<dialog>` elements.

Your fragment is the **inner content of the main column** and nothing else. It is
spliced by `_build-admin-screens.mjs` into 33KB of pre-built chrome.

**FORBIDDEN in your fragment — every one of these is already in the chrome:**

- `<!doctype>`, `<html>`, `<head>`, `<body>`, `<style>`, `<script>`, `<link>`
- the Tailwind config, the kit token block, any `:root {}` CSS
- `<aside>` / the sidebar rail / the logo / the nav
- `<header>` / the utility bar / the "View site" link / Marianne's avatar
- `<main>` itself, the background field `<img>`, the `max-w-[1280px]` wrapper
- `<footer>`

Your fragment starts at the first `<section>` and ends at the last `</section>`.
Indent it by 12 spaces so it sits correctly inside the wrapper. If you emit any
chrome, the splice produces a broken document and your work is rejected.

**Your skip-link anchor id is given in your dispatch — put it on your first
heading** (e.g. `<h1 id="ledger-h">`), or the skip link lands nowhere.

---

## 2 · READ THESE FIRST (in this order)

1. **`.claude/skills/interface-craft/SKILL.md`** — the GENERATIVE method you RUN.
   This is not optional and not a checklist to answer at the end. It tells you
   what to do first. Screens that skip it pass every gate and read as dead
   spreadsheets — that is the exact failure this project has already shipped once.
2. **`.claude/skills/design/dated-things-are-typeset/SKILL.md`** — the client's
   bespoke technique for dated/priced/bookable things. **Central to all five
   screens.** Dates are typeset as content, not hidden in cards or filters.
3. **`.claude/skills/design/night-side-emanation/SKILL.md`** — the palette law.
4. **`.claude/skills/design/plain-declarative-voice/SKILL.md`** — every word of
   copy you write, including button labels and empty states.
5. **`.claude/skills/design/stillness-as-motion-budget/SKILL.md`** — motion, and
   the hard static-render rule.
6. **`docs/screens/admin/admin-bookings.html` lines 815–1476** — the reference
   `<main>` for class vocabulary and `data-kit-*` idiom. Read this range only;
   do not read the file's first 814 lines (that is the chrome you must not write).

Do NOT read `ascending-beat-scroll` or `the-answered-question` — both are
home-scroll-only and explicitly do not fire on admin surfaces.

---

## 3 · THE WORLD (use these facts; invent nothing that contradicts them)

**Who.** Marianne — sole practitioner, non-technical, comfortable with email and a
phone but not with anything that looks like software. She runs The Field Work from
Frome, Somerset. She will not read a manual. What breaks her day: any screen that
requires her to understand a concept before she can do a task.

**Admin "today" is Thursday 6 August**, 09:14, Europe/London. (This is stamped in
the chrome's utility bar — don't restate it, but keep every date you write
consistent with it.) All payments already taken happened in July or early August.

**The workshops** (use these exact names, dates, times, venue and prices — they
are already shipped on the public pages and must match):

| Workshop                       | Date       | Time        | Venue                  | Price | Capacity | State                        |
| ------------------------------ | ---------- | ----------- | ---------------------- | ----- | -------- | ---------------------------- |
| Reading the Field              | Sat 20 Sep | 10:00–16:30 | The Garden Room, Frome | £95   | 10       | 6 sold, 4 places left        |
| Grounding for Beginners        | Sat 11 Oct | 10:00–16:00 | The Garden Room, Frome | £85   | 10       | 1 sold, 9 places left        |
| The Long Attention             | Sat 8 Nov  | 10:00–16:30 | The Garden Room, Frome | £95   | 8        | FULL · 3 on the waiting list |
| Reading the Field (past)       | Sat 14 Jun | 10:00–16:30 | The Garden Room, Frome | £95   | 10       | finished · 10 came           |
| Grounding for Beginners (past) | Sat 22 Mar | 10:00–16:00 | The Garden Room, Frome | £85   | 10       | finished · 8 came            |

Do not invent weekdays for other dates — reuse the ones above. (These weekdays
come from the shipped public pages; treat them as fixed.)

**Money.** Stripe. Prices are per place. Someone may book more than one place
(2 × £95 = £190). Cards are shown as "the card ending 4242" style. Refunds take
five to ten working days to show.

**The refund rule** — this is the load-bearing policy and the public pages already
state it. **14 days clear of the workshop = full refund. Inside 14 days = no
refund, but the place is still released** (which matters, because someone is on
the waiting list). For Reading the Field on Sat 20 Sep, the refund date is
**6 September**. A cancellation past that date is honest about returning nothing
and is never hidden or made punitive.

**Names for people.** Real, plain, unremarkable British first-and-last names. No
"Jane Doe", no "user@example.com". Emails match the names.

---

## 4 · THE PALETTE LAW (non-negotiable — it is position-dependent)

The kit is dark-default. There is no light mode. Two grounds exist and **the
accent colour is different on each**:

- **PLATE** — the dark plum ground (`bg-surface-base` #160712 / `bg-surface-raised`
  #260F20). On the plate the accent is **gold** (`text-secondary-500` #E9C87E).
  **Magenta is FORBIDDEN on the plate.**
- **POOL** — the cream inset panel (`bg-pool-surface` #FBF3F1, `text-pool-text`).
  Any pool block carries the `on-pool` class. On the pool the accent is
  **magenta** (`text-accent-500` #C2187A). **Gold is FORBIDDEN on the pool.**

Data lives on the POOL. The canonical wrapper — lift this shape verbatim:

```html
<div
  data-pattern="clearing-plate"
  data-variant="admin-panel"
  data-kit-component="DataTable"
  class="on-pool bg-pool-surface text-pool-text px-6 sm:px-8 mt-4"
></div>
```

Semantic colours on the pool: `text-pool-danger` (#A3221A), `text-pool-success`
(#0F6B3D). On the plate: `text-danger` (#F58A80), `text-success` (#6FCB99).

**Shape law: zero radius everywhere.** `rounded-none`. The single exception is a
true circle avatar (`rounded-full`). **Zero shadows** — the tokens are all `none`.

**Type.** `font-display` (Cormorant Garamond) for headings — always
`font-normal`, never bold. `font-sans` (Source Sans 3) for body.
`font-mono` (Azeret Mono) for every figure, date, time, price, count and
eyebrow — and mono figures get `font-variant-numeric: tabular-nums` via the
existing `.fig` idiom or the `font-mono` class. Eyebrows are
`font-mono text-xs uppercase tracking-wide text-secondary-500` on the plate.

Use ONLY Tailwind classes that resolve against the kit's token scale (the config
is in the chrome). Never inline a hex value. Never invent a token.

---

## 5 · WHAT MAKES THIS GOOD RATHER THAN A SPREADSHEET

Run `interface-craft`. Its procedure, compressed, and the bar you are held to:

1. **Name the question the screen answers.** One sentence, before you draw
   anything. Then compose so that question is answered in under two seconds. Your
   `<h1>` states the ANSWER, in numbers, not the screen's name. The reference
   screen does this: _"3 requests are waiting on you. The oldest hold ends in 48
   minutes."_ — not "Requests".
2. **Draw the data's own dramatic shape from OBSERVED VALUES ONLY.** Do not
   invent a chart. If Sat 8 Nov is full and Sat 11 Oct has sold one place, the
   composition should make that asymmetry visible without the reader doing
   arithmetic. Never fabricate a trend the numbers don't contain.
3. **Type-as-structure on the datum that matters.** The important number is
   large and typeset, not a cell in a row of equal cells.
4. **ONE static signature move.** One. Realised fully. Static — it must survive a
   screenshot with no JS and no scroll (see §6).
5. **Design every state (I-1).** Populated / empty / loading (skeleton) /
   error / overflow. A table that only shows rows is half-designed. Label each
   state variant with a small plate eyebrow so the reviewer can see them, exactly
   as the reference screen does with its `data-state="..."` articles.
6. **ONE primary action (I-2).** Unmistakable. Everything else subordinate.
   Destructive actions are guarded.
7. **Cut the weakest 10%.** One detail that rewards close attention — not ten.

**Copy register (`plain-declarative-voice`).** Describe what happens; never promise
an outcome. Marianne's own voice, plain and unhurried, no product-speak, no
exclamation marks, no "Oops!", no "Awesome". UK English and UK date order
throughout. Button labels say what will happen: _"Cancel both places and refund
£190"_ beats _"Confirm"_. Empty states say what to do next, warmly, in one breath.

---

## 6 · HARD MECHANICAL RULES

- **STATIC-RENDER-SAFE.** The fragment must render whole in a screenshot with no
  JS and no scrolling. **BANNED:** `opacity:0` + IntersectionObserver,
  scroll-reveal, any `hidden`/`display:none` that gates real content, and any
  `<script>` at all. Tabs and filters are rendered as links in their selected
  state — never as JS-gated panels. Motion is enhancement on already-visible
  content, never a gate.
- **`prefers-reduced-motion`** is already handled in the chrome's stylesheet.
  Don't restate it. Don't add animation that needs a new fallback.
- **Accessibility.** Every `<section>` gets `aria-labelledby` pointing at its
  heading. Interactive targets ≥ 44px high. Icons `aria-hidden="true"`. Real
  `<table>` semantics if you build a table; `<th scope="col">` on headers.
  Destructive buttons name their consequence in the accessible name.
- **`data-kit-*` attributes are load-bearing** — a builder translates this HTML
  to JSX by reading them. Every component-ish element carries
  `data-kit-component="..."` and, where it varies, `data-kit-variant="..."`.
  Reuse the names in the reference screen (`DataTable`, `BookingRow`, `Button`,
  `Link`, `Heading`, `FilterBar`, `ConfirmDialog`, `Avatar`, `Nav`, `NavItem`)
  and only coin a new one when nothing existing fits.
- **Images.** Only these exist, at `../../../assets/images/new/<name>`:
  `aura-field-abstract.png`, `aura-hands-between.png`, `aura-light-in-a-room.png`,
  `aura-seated-figure.png`, `chair-with-her-coat.png`, `marianne-altar-light.png`,
  `marianne-hands-at-the-edge.png`, `marianne-portrait-in-the-light.png`,
  `marianne-room-aglow.png`, `window-last-light.png`, `work-close-hands.png`,
  `work-down-the-body.png`, `work-wide-the-room.png`. The page already has a
  background field image — only add more if a screen genuinely needs a workshop
  thumbnail. Never reference an image not on this list.
- **No lorem, no placeholder, no `#` href where a real path is known.** Paths:
  `/admin/workshop-bookings`, `/admin/offerings`, `/admin/offerings/workshops`,
  `/admin/offerings/workshops/new`, `/admin/offerings/workshops/<slug>`,
  `/admin/offerings/workshops/<slug>/attendees`. Public: `/workshops/<slug>`.
  Slugs: `reading-the-field`, `grounding-for-beginners`, `the-long-attention`.

---

## 7 · WHEN YOU ARE DONE

1. Write your fragment file (and dialogs file if you have dialogs).
2. Run `node _build-admin-screens.mjs <your-screen-id>` from
   `docs/screens/workshopflow/` and confirm it prints `ok`.
3. Re-read your own fragment start-to-finish and check it against §1 (no chrome),
   §4 (no magenta on plate / no gold on pool / zero radius), §6 (no script, no
   gated content) and §5.5 (every state drawn).
4. Return ONLY a short structured status: the screen id, the one-sentence question
   your screen answers, your signature move, the states you drew, and anything you
   deliberately left out. **Do not include HTML in your reply** — it is in the file.
