# Requirements — thefieldwork-v5

The Field Work: a UK sole practitioner who teaches and practises **aura healing**
(hands-off energy work on the field around a person), selling one-to-one
services, single workshops, and courses (a series of workshops) at equal
billing. Deliverable is a public marketing-and-booking site plus a private
single-owner admin she can run herself.

## Targets

- **webapp**: 17 screens — the public marketing, booking, subscribe and download surface
- **admin**: 16 screens — the private single-owner operations surface

33 screens total, 20 flows, 100% coverage on both platforms
(`docs/analysis/{webapp,admin}/coverage.md`). Both `screens.json` files validate
against `schemas/screens.schema.json` at v3.0.

## Personas

### The Practitioner (Owner)

- **Primary goal**: fill her calendar without spending evenings on admin.
- **Top tasks**: publish a dated, priced workshop · change a paragraph or a
  picture on the home page · see who has asked for a place and reply.
- **What breaks her day**: any screen that requires her to understand a concept
  before she can do a task; losing work because she didn't know she had to save.
- **Non-negotiable**: she is non-technical, there is no second administrator and
  no support desk. A capability she cannot operate alone is worse than one that
  doesn't exist.

### The Carrier

- **Primary goal**: work out whether this is credible and whether it will be
  embarrassing.
- **Top tasks**: find out what physically happens in the room · judge whether
  the practitioner is serious · find a date and a price without emailing to ask.
- **What breaks their day**: being asked to believe something before being told
  what happens; a price that only appears after you make contact.
- **The unasked question**: whether they must undress or be touched. Research
  measured that **0 of 6 comparable homepages** contain the words _clothed_,
  _undress_, _touch_, _hands-off_ or _believe_. This is the single largest
  unoccupied position in the category.

### The Returner

- **Primary goal**: find what's on and book it in under a minute.
- **Top tasks**: scan upcoming dates · understand what a course commits them to
  · request a place.
- **What breaks their day**: having to re-read the whole site to find a date.

## Features by Target

### webapp

- Seven-beat home page, fixed ascending order, content-driven (priority: core)
- Products block rendering live offerings with real dates and prices (core)
- Index + detail pages for services, workshops and courses (core)
- Booking-request flow with spam guard and rate limit (core)
- Live free-slot picker for services, placing a self-expiring hold (core)
- Newsletter subscription with double opt-in and one-click unsubscribe (core)
- PDF downloads, public direct and subscriber-only via signed links (core)
- About, contact and privacy notice (core)
- Configurable page background, decorative only, reduced-motion suppressed (core)
- WCAG 2.2 AA verified by computed contrast (core)

### admin

- Single-account login with emailed password recovery (core)
- Seven-beat content editing with visibility toggles on beats 2-6 (core)
- Draft → preview → publish, one publish covering beats and settings (core)
- Offering + Session management with per-offering prices (core)
- Merged calendar with automatic event blocking and personal time blocking (core)
- Availability rules: pattern, buffer, minimum lead time, booking horizon (core)
- Booking queue with hold countdown and status transitions (core)
- Newsletter composition on a non-editable branded template, test send, batched send (core)
- Subscriber list with suppression, search and CSV export (core)
- Media library with auto-processed uploads and required alt text (core)
- PDF library with visibility and reference-before-delete (core)

Full machine-readable catalogue: `docs/brief-capabilities.json` (58 capabilities).

## Integrations

See `docs/analysis/shared/integrations-options.md` for the full research menu
(15 categories, research-only — no vendor is picked here; the architect picks
at `/architect`). Categories this project needs, with the signal:

- **hosting-deploy**: brief §8 names Vercel. Note the menu's finding that Hobby
  is non-commercial-only and Pro is also the only tier with better-than-daily
  cron — the licence question and hold-expiry are one decision.
- **managed-postgres**: brief §8 names Neon or Supabase.
- **object-storage**: brief §8 + §13 — images AND PDFs, the latter served
  non-executable, outside web root, with `Content-Disposition`.
- **transactional-email**: brief §12 — booking notify, booking ack, opt-in confirmation.
- **broadcast-email**: brief §12 newsletter issues, with fully custom branded
  HTML, suppression, bounce handling, enforced unsubscribe.
- **sending-domain-authentication**: brief §8 — SPF/DKIM/DMARC before the first issue.
- **image-processing**: brief §12 — crop-to-ratio + palette treatment on upload.
- **scheduled-jobs**: brief §8/§13 — hold expiry cannot depend on a page load.
- **spam-guard**: brief §13 — must not depend on eyesight or JavaScript, which
  disqualifies the CAPTCHA market; menu is Akismet (subprocessor disclosure) or
  honeypot + server-rendered timestamp (no third party).
- **error-reporting-uptime**: brief §8.
- **rich-text-block-editor**: brief §12 — newsletter composer + landing beats.
- **content-cms**: brief §5/§9 mandate in-house; build-vs-buy rung documented.
- **auth**: brief §9 — single owner, no public registration.
- **email-template-rendering**: brief §12 — "branding is the template" is a
  build artefact, not a vendor feature.
- **rate-limit-store**: brief §13 needs per-IP AND per-email counters; serverless
  has nowhere to put them.

## Compliance Flags

- **uk-gdpr** — lawful basis differs per purpose: contract-steps for booking,
  consent for the newsletter. Privacy notice required and now routed (`/privacy`).
  Retention: booking requests 24 months (recommended, unconfirmed);
  unsubscribed addresses retained indefinitely in the suppression list, which is
  how the objection is honoured.
- **pecr-marketing-email-consent** — explicit, unbundled, unticked consent;
  evidence of consent recorded (source + confirmed-at); every issue carries a
  working one-click unsubscribe, sender identity and a valid postal/contactable
  address; no bought, scraped or imported lists.
- **pecr-double-opt-in** — required by this brief as the consent-evidence
  mechanism and as the control that stops the site being used to sign up third
  parties. An unconfirmed address is never mailed anything but its own
  confirmation request.
- **cap-code-asa-health-claims** — the material legal risk. Energy healing has
  no accepted clinical evidence base; the site must not state or imply treatment
  of any named condition. ASA/CAP "Health: Reiki" permits emotional/spiritual
  effects, relaxation, wellbeing; prohibits physical healing claims without
  robust clinical evidence. Two upheld rulings on point (Allan Sweeney Reiki,
  2011-07-20; Healing on the Streets – Bath, 2013-06-13). Beat 5 ("what this is
  not") is the compliance surface as well as the trust surface. **Content is
  owner-editable, so this cannot be enforced by the build alone** — the landing
  editor needs a permanent inline reminder where copy is written.
- **equality-act-2010** + **wcag-2-2-aa** — computed contrast, not eyeballed.
  Includes SC 1.4.11's 3:1 non-text floor for borders, rules and focus rings,
  which is the check that gets skipped because it is invisible by eye.
- **no-cookie-consent-required-v1** — no analytics or advertising cookies, and
  no newsletter open/click tracking, so no banner is required. Adding either
  makes a consent mechanism mandatory.

## Skills Needed

- **scheduling-availability-subtraction** — free slots computed, never stored;
  DST correctness both ways; one declared timezone (Europe/London), stored UTC.
- **double-opt-in-newsletter** — pending/confirmed/unsubscribed/bounced
  lifecycle with absolute suppression.
- **branded-email-template-rendering** — a non-editable template that carries
  the legally required footer; note email clients strip SVG, so it needs a
  raster logo the project does not yet have.
- **signed-token-links** — unsubscribe (non-expiring), opt-in confirmation
  (single-use, expiring), document links (short-lived), preview (short-lived),
  password reset (single-use, expiring).
- **pdf-safe-serving** — outside web root, non-executable, `Content-Disposition`,
  never inline from a same-origin path.
- **draft-publish-content-model** — one draft/published pair covering beats and
  settings; preview renders the real public route from draft.
- **wcag-computed-contrast-verification** — an automated gate, because this
  palette fails in ways invisible to someone who already knows what the text says.

## Open Questions

Collected from every artifact produced in phases 1-4. The full list is in
`docs/brief-summary.json.openQuestions` (19 entries). The ones that block work
rather than merely inform it:

- **The practitioner's name and history are UNVERIFIED.** "Marianne",
  "fifteen years practising, twelve teaching" were used during brief authoring
  and never confirmed with the client. Beat 4 and the about page depend on them.
  No copy should be written for those surfaces until this is confirmed.
- **A postal or contactable business address** is legally required in the
  newsletter footer. A sole practitioner working from home may not want her home
  address published; a PO box costs money. Needed before the first issue.
- **Newsletter cadence** must be stated in the consent wording, which makes it a
  promise she has to keep.
- **Whether she has an existing contact list** — it cannot be imported; those
  people must be invited to opt in, which is a launch task and a piece of copy.
- **The newsletter template needs a raster logo** — email clients strip SVG and
  the template is non-editable by her, so this cannot be fixed by hand later.
  Six SVGs and one 425x357 PNG are supplied.
- **Default working hours, buffer, lead time, booking horizon and hold duration**
  need her input; ship plausible defaults and let her correct them.

Design decisions deliberately left open for the creative director and Gate 2
(recorded so they are chosen rather than defaulted): public header/footer
composition, and the admin shell's nav model and chrome.

## Notes for downstream stages

- **Style 5 (Nightfield Terminal) will score worst on the client's own
  20-second affective success test.** Its author flagged this rather than
  selling ten styles evenly. It is a legitimate credibility-pole territory; it
  simply cannot win the metric §15 names as primary.
- **Style 3 (Long Dusk) has two zone-scoped palette tokens.** Gold dies as the
  ground ascends (11.68:1 at root → 1.47:1 at crown) and `#C2187A` is fill-only
  in the root zone (3.32:1 as type). Treating that palette as
  position-independent ships an AA failure no eye-review catches.
- **`assets/brand/README.md` is the authoritative colour record** and now carries
  both light- and dark-ground computed contrast tables. The load-bearing
  inversion: the light-ground-safe magenta is the worst performer on dark.
- **The factory default `success: #16A34A` is 3.30:1 on white and fails AA.**
  No light-ground palette may ship it unchanged.
