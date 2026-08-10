# Coverage Report — webapp

- Screens in brief: 17
- Screens extracted: 17
- Coverage: 100%

Verified mechanically against `brief.md` §10 (route table, excluding `/admin/*`)
and §11 ("Public screens"), and against `docs/analysis/webapp/screens.json`
(`app.screens[].id`). Validator: `node scripts/validate-screens.mjs
docs/analysis/webapp/screens.json` → exit 0, "v3.0 screens.json valid
(17 screens)".

## Screen-by-screen

| Screen                 | In brief §11 | In screens.json | In ≥1 flow | Surface     |
| ---------------------- | ------------ | --------------- | ---------- | ----------- |
| `home`                 | ✓            | ✓               | ✓          | marketing   |
| `services-index`       | ✓            | ✓               | ✓          | marketing   |
| `service-detail`       | ✓            | ✓               | ✓          | marketing   |
| `workshops-index`      | ✓            | ✓               | ✓          | marketing   |
| `workshop-detail`      | ✓            | ✓               | ✓          | marketing   |
| `courses-index`        | ✓            | ✓               | ✓          | marketing   |
| `course-detail`        | ✓            | ✓               | ✓          | marketing   |
| `about`                | ✓            | ✓               | ✓          | marketing   |
| `contact`              | ✓            | ✓               | ✓          | marketing   |
| `privacy-notice`       | ✓            | ✓               | ✓          | marketing   |
| `subscribe`            | ✓            | ✓               | ✓          | marketing   |
| `booking-request`      | ✓            | ✓               | ✓          | application |
| `booking-confirmation` | ✓            | ✓               | ✓          | application |
| `subscribe-pending`    | ✓            | ✓               | ✓          | application |
| `subscribe-confirmed`  | ✓            | ✓               | ✓          | application |
| `unsubscribe`          | ✓            | ✓               | ✓          | application |
| `document-download`    | ✓            | ✓               | ✓          | application |

Surface split: 11 marketing / 6 application. Set deliberately per screen, not
defaulted — the split routes each screen to the correct craft model downstream
(`narrative-spine-model.md` for marketing, `interface-craft-checklist.md` for
application). Note that `subscribe` is classed marketing (it is a persuasion
surface with a conversion job) while its two follow-on screens are application
(they are transactional confirmations with states, not persuasion).

## Orphaned (in brief, not in any flow)

None.

## Extras (in screens.json, not in brief — investigate)

None.

## Amendments made during this stage

Three screens/routes in this platform changed after the first pass, because the
Phase 4 worker surfaced genuine defects in `brief.md` rather than working around
them. All three were fixed in the brief, then re-extracted:

1. **`privacy-notice` did not exist.** §14 required a privacy notice linked from
   the booking form, the subscribe form and the footer, but §10 had no route and
   §11 no screen — a legal obligation with nowhere to live. Added at `/privacy`.
2. **`booking-confirmation` was `/book/thanks`, with no identifier**, yet §11
   required it to state the held slot time. A parameterless route cannot do that
   on a cached surface. Now `/book/thanks/[ref]` — unguessable, non-sequential,
   `noindex` + no-store, fail-closed on an unknown ref.
3. **`/subscribe/[formSlug]` added** for §12's "named subscribe form". Recorded
   as a second route on the existing `subscribe` screen — one screen, two route
   patterns — rather than duplicating the screen.

## Open questions carried forward

- `<!-- NEEDS CLARIFICATION -->` Public header/footer composition is not
  specified anywhere in `brief.md`. The worker inferred it from
  `competitors.md` (Blossom / Omnes / Re:Mind) and cited the source rather than
  inventing it. This is correctly a **design** decision for the creative
  director and Gate 2, not a brief omission — recorded here so it is a choice
  rather than an accident. Note the site footer is NOT the `navigation.footer`
  field in `screens.json`: that field is the mobile tab-bar slot (enum
  `tab-bar | hidden`) and is correctly `hidden` for a web surface.
