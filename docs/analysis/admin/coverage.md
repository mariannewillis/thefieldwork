# Coverage Report — admin

- Screens in brief: 16
- Screens extracted: 16
- Coverage: 100%

Verified mechanically against `brief.md` §10 (route table, `/admin/*` plus the
two recovery routes) and §11 ("Admin screens"), and against
`docs/analysis/admin/screens.json` (`app.screens[].id`). Validator:
`node scripts/validate-screens.mjs docs/analysis/admin/screens.json` → exit 0,
"v3.0 screens.json valid (16 screens)", first attempt.

## Screen-by-screen

| Screen                   | In brief §11 | In screens.json | In ≥1 flow | Gated |
| ------------------------ | ------------ | --------------- | ---------- | ----- |
| `admin-login`            | ✓            | ✓               | ✓          | no    |
| `admin-forgot-password`  | ✓            | ✓               | ✓          | no    |
| `admin-reset-password`   | ✓            | ✓               | ✓          | no    |
| `admin-dashboard`        | ✓            | ✓               | ✓          | yes   |
| `admin-calendar`         | ✓            | ✓               | ✓          | yes   |
| `admin-availability`     | ✓            | ✓               | ✓          | yes   |
| `admin-landing-sections` | ✓            | ✓               | ✓          | yes   |
| `admin-offerings`        | ✓            | ✓               | ✓          | yes   |
| `admin-offering-edit`    | ✓            | ✓               | ✓          | yes   |
| `admin-bookings`         | ✓            | ✓               | ✓          | yes   |
| `admin-newsletters`      | ✓            | ✓               | ✓          | yes   |
| `admin-newsletter-edit`  | ✓            | ✓               | ✓          | yes   |
| `admin-subscribers`      | ✓            | ✓               | ✓          | yes   |
| `admin-documents`        | ✓            | ✓               | ✓          | yes   |
| `admin-media`            | ✓            | ✓               | ✓          | yes   |
| `admin-settings`         | ✓            | ✓               | ✓          | yes   |

All 16 are `surface: "application"` — set explicitly, not defaulted. Every
screen routes to `interface-craft-checklist.md`; the narrative spine is a
category error on all of them.

Three screens are necessarily **ungated** (`admin-login`,
`admin-forgot-password`, `admin-reset-password`) — a password-recovery flow
that required a session would be useless. Everything else is session-gated
server-side per route, per `brief.md` §13, never by hiding UI.

## Orphaned (in brief, not in any flow)

None. 12 flows cover 16/16, cross-checked in both directions (every flow's
screen ids resolve to a screen; every screen appears in ≥1 flow).

## Extras (in screens.json, not in brief — investigate)

None.

## Amendments made during this stage

The Phase 4 worker raised five clarifications; all five were resolved into
`brief.md` rather than absorbed as assumptions:

1. **`admin-forgot-password` + `admin-reset-password` did not exist.** A sole
   operator who logs in monthly will forget the password, and there is no second
   administrator and no support desk. Added as ungated routes with a
   rate-limited, single-use, short-lived emailed link. The request returns the
   **same response whether or not the address matches**, so the pair cannot be
   used to confirm the owner's email — modelled as a deliberate state, not an
   error. Flow 12 also names the three token failures (expired / used / invalid)
   separately.
2. **Sign-out is a shell action, not a route** — confirmed and recorded as
   `authGate.signOut: shell-action`.
3. **Buffer / minimum lead time / booking horizon were owned by two screens**
   (`admin-availability` in §11 and site settings in §12). Resolved to
   `admin-availability`; `admin-settings` keeps hold duration only. Two screens
   owning one value is precisely how two disagreeing values happen.
4. **§12 required a preview but §10 had no preview route.** Added
   `/preview/[token]` — signed, short-lived, owner-issued, `noindex`, and
   deliberately the _public_ home renderer fed from draft content, because a
   preview that isn't the real page isn't a preview.
5. **Publish scope across LandingSections and SiteSettings was unclear.**
   Resolved to one publish covering both, with a confirmation that itemises
   everything going live. Two independent publish buttons would let her ship a
   beat referencing a phone number she hasn't published yet.

## Open questions carried forward

- `<!-- NEEDS CLARIFICATION -->` The admin **shell** (nav model, chrome,
  information hierarchy) is unspecified by `brief.md`. Inferred from Acuity's
  practitioner console and Mailchimp's builder, with two deliberate
  brief-grounded departures recorded in the screens YAML. This is a design
  decision, not a brief omission — recorded so it is chosen rather than
  defaulted.

## Note on state completeness

`flows.md` carries a **Screen State Matrix** (empty / loading / error /
populated / overflow per screen), an unsaved-vs-unpublished table, and a
destructive-guard table. This matters more than usual here: this product's day
one is **entirely empty states** — zero offerings, zero subscribers, zero
bookings, zero documents, and an empty calendar — so the empty states are most
of the owner's first-run experience rather than an edge case.
