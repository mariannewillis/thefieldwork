---
$schema: ./schemas/brief-frontmatter.schema.json
version: "1.0.0"
status: draft
project-name: "thefieldwork-v5"
author: "David Morgan"
created: 2026-08-06
last-modified: 2026-08-06
brief-schema-version: "1.0"
companion-files: []
tags:
  - wellness
  - energy-healing
  - bookings
  - small-business
amendments: []
---

# Project Brief

## 1. Vision & Principles

The Field Work teaches and practises **aura healing** — hands-off energy work on
the field that surrounds a person, delivered as one-to-one services, single
workshops, and courses (a series of workshops). The practitioner is a sole
operator. Today she has no way for a stranger to find out what she does, decide
it is for them, and ask for a time. This product is that: a public site that
sells the work by being the work, and a private admin she can run herself.

Principles, in priority order when they conflict:

1. **The visitor must feel something before they understand anything.** This is
   a felt-experience business. A correct, informative page that produces no
   feeling has failed at the only thing that matters.
2. **Prefer the owner's independence over feature depth.** She must be able to
   change every word and picture on the public site without calling anyone. A
   capability she cannot operate alone is worse than one that doesn't exist.
3. **Prefer honesty over persuasion where they diverge.** This category is
   full of overclaim. Naming what the work is *not* buys more trust than one
   more testimonial would.
4. **Prefer a fixed, well-made structure over configurability.** Configurable
   content, fixed design. See §5.

## 2. Visual Design Requirements

**Voice.** Warm, unhurried, quietly certain. Speaks to an adult who is
sceptical and curious at the same time. Never clinical, never breathless,
never the soft-focus lavender register the category defaults to.

**Emotional register.** Night-side rather than daylight — the work happens in
low light, in stillness, and the site should feel like that room rather than
like a spa brochure. Expansive, cosmic, transformational. The success test is
the client's own: *a visitor should feel as though their aura has been lifted
just by having been on the site.* That is an emotional requirement, and it is
the bar.

**The category truth this brand must defeat.** Prospective clients arrive
carrying a specific fear — that this involves undressing, being touched, or
being asked to believe something. Every visual decision is made in front of an
adult who half-expects to be embarrassed. Warmth without credibility fails
here as badly as credibility without warmth.

**Supplied brand assets (facts, not role assignments).**

- Logo: six SVG lockups in `assets/brand/` (`logo-primary`, `logo-horizontal`,
  `logo-mark`, each in a default and a `-light` variant) plus
  `assets/TheFileWork.png`. The mark is a radiating field — concentric light
  running outward from a centre.
- **`assets/brand/README.md` is the authoritative record of the artwork's
  colours** — eleven named values sampled from the logo's own gradient and
  ground, with computed contrast ratios against both candidate light grounds.
  Read it rather than restating it here; a second list in this brief would
  drift from the measured one. The load-bearing measured facts: on a light
  ground neither gold clears the AA body floor *or* the 3:1 large-text floor,
  so gold is a non-text colour there; `magenta-deep #C2187A` is the
  light-ground text-safe magenta; and gold on the dark plum inverts to
  10.89:1. Which colour becomes ground, accent or type remains a design
  decision, not a brief mandate.
- Six art-directed photographic plates in `assets/images/`
  (`aura-two-people`, `aura-light-in-a-room`, `aura-radiant-portrait`,
  `aura-field-abstract`, `aura-seated-figure`, `aura-hands-between`). These
  are commissioned, not stock, and are the project's imagery pool. Note for
  the art director: `aura-hands-between` (cupped hands around a glowing orb)
  is the single most-reproduced image in this category and reads as stock even
  though it isn't — treat it as a reserve, not a hero.

**Accessibility floor.** WCAG 2.2 AA, verified by computed contrast rather
than by eye — this palette's mid-stops fail against light grounds and the
failure is not visible to a designer who already knows what the text says.
Body text ≥16px, touch targets ≥44px. Every motion has a
`prefers-reduced-motion` fallback that leaves the composition whole.

**Audience note.** Skews 35–65. Assume reading glasses are somewhere else in
the house.

## 3. Problem Statement

A sole practitioner with fifteen years of practice has no shopfront. Her work
reaches people only by word of mouth and a personal phone number, which means
her income depends on whoever happens to already know her.

The person who needs her has a harder problem. They have been carrying
something — grief, burnout, a fog that no test explains — long enough that
they have started searching. What they find is a category that either
overclaims ("heal your life") or hides behind jargon. They cannot tell a
serious practitioner from a hobbyist, they cannot tell what actually happens
in the room, and the specific thing they are too embarrassed to ask is whether
they will have to take their clothes off. So they close the tab. Not because
they decided against it — because nobody answered the question they couldn't
ask.

When this ships: a stranger can arrive cold, feel the register of the work,
have that question answered before they have to ask it, see real dates and
real prices, and ask for one — in a single scroll. And the practitioner can
change any of it herself.

## 4. Core Entities

- **Offering** — the abstract thing a visitor can book. Exactly three concrete
  kinds, at equal billing:
  - **Service** — a one-to-one session. Owns: name, description, duration,
    price, image, active flag.
  - **Workshop** — a single dated group event. Owns: name, description, date,
    start/end time, venue, capacity, price, image, active flag.
  - **Course** — a series of workshops sold as one unit. Owns: name,
    description, price, capacity, image, active flag; has many **Sessions**.
- **Session** — one dated occurrence inside a Course. Owns: date, start/end
  time, venue, sequence number. Belongs to exactly one Course.
- **BookingRequest** — a visitor asking for a place. Owns: name, email, phone
  (optional), message, the Offering requested, the requested slot (services
  only — start and end datetime), status
  (`pending | confirmed | declined | expired`), hold-expiry, created-at.
  Belongs to one Offering.
- **AvailabilityRule** — the owner's recurring working pattern. Owns: weekday,
  start time, end time, active flag. The base layer the calendar subtracts
  from.
- **TimeBlock** — a span the calendar is unavailable for services. Owns: start
  datetime, end datetime, kind (`personal | session | holding`), label,
  and — when `kind = session` — the Workshop or Course Session that generated
  it. Session blocks are derived, not hand-made: they appear and disappear
  with their Offering and cannot be edited directly.
- **Subscriber** — someone on the newsletter list. Owns: email, name
  (optional), status (`pending | confirmed | unsubscribed | bounced`),
  confirmed-at, unsubscribed-at, source (which form or document lead), and an
  unsubscribe token.
- **Newsletter** — one issue. Owns: subject, preheader, body blocks, attached
  Documents, status (`draft | sent`), sent-at, and per-issue delivery counts.
- **Document** — a stored PDF. Owns: file, title, description, slug,
  visibility (`public | subscribers-only`), and the Newsletters and
  subscribe-forms that reference it.
- **LandingSection** — one of the seven fixed narrative beats on the home
  page. Owns: fixed key (`root`…`crown`), eyebrow, heading, body, image
  reference, optional link label + target, visible flag. Order is not owned by
  the record — see §5.
- **MediaAsset** — an image in the owner's library. Owns: file, alt text,
  caption, source (`supplied | uploaded`).
- **SiteSettings** — the singleton. Owns: contact email, phone, practitioner
  bio, credentials, social links, background-image selection.
- **Owner** — the single administrator account. Owns nothing; authenticates.

## 5. Key Distinctions

- **A Course is not a Workshop repeated.** A Course is one purchase covering a
  fixed series of Sessions; a Workshop is one purchase covering one date. A
  visitor books a Course once, not once per Session.
- **A Session is not a Workshop.** A Session exists only inside a Course and
  cannot be booked on its own. Two dated group events look identical on screen
  and are different products.
- **A BookingRequest is not a booking.** Nothing is paid and nothing is
  promised. It is a lead the owner converts by hand, outside the system. For
  workshops and courses, capacity is displayed and never enforced.
- **A held slot is not a confirmed slot.** For services, a request does put a
  short **hold** on the chosen time so the same slot is not offered to the
  next visitor while the owner is deciding. The hold expires by itself (48
  hours is the working default) and the slot returns to the calendar. A hold
  is a courtesy to prevent double-offering, not a reservation — the visitor is
  told exactly that on the confirmation screen.
- **Availability is subtraction, not a list.** The calendar never stores "free
  slots". It computes them: the recurring AvailabilityRules minus workshop and
  course sessions, minus personal blocks, minus held and confirmed bookings,
  minus the buffer and the minimum lead time. There is no second place where
  availability lives and no way for the two to disagree.
- **A session block is not a personal block.** Session blocks are *derived*
  from Workshops and Course Sessions — they appear when the event is
  published, move when it moves, and vanish when it is deleted. Personal
  blocks are authored by the owner and belong to nothing. She can delete a
  personal block; she cannot delete a session block without deleting the
  event, and the calendar should say so rather than silently refusing.
- **A newsletter is not a transactional email.** Booking acknowledgements go
  to anyone who asks for a place, on the basis of their request. The
  newsletter goes only to people who have separately and actively consented
  and can leave in one click. The two systems never share a recipient list,
  and an unsubscribe from one must never suppress the other.
- **A subscriber is not confirmed until they confirm.** A submitted email is
  `pending` and receives nothing but the confirmation request. Only a clicked
  confirmation makes them mailable. See §14 — this is a legal position, not a
  preference.
- **A Document is not a page.** PDFs are stored assets that get attached to a
  newsletter or offered in exchange for a subscription. They are not the
  site's content and do not get their own designed page beyond a download
  route.
- **The admin is not a CMS.** The owner edits *content inside a fixed
  structure*. She can change every word and picture on the seven landing
  beats; she cannot add a beat, delete a beat, reorder the beats, or change
  type, colour, or spacing. This is the load-bearing distinction of the whole
  product: a fixed, well-made structure is what makes it operable by a
  non-technical owner and is what stops the design decaying in month two.
  Configurable content, fixed design.
- **Hiding is not deleting.** Beats 2–6 have a visibility toggle. Beats 1 and
  7 do not — a page with no reassurance and no call to action is not a page.
- **The products block is not one of the seven beats.** It renders from the
  live Offering records, so publishing a workshop makes it appear with no
  second edit. Its intro copy is editable; its contents are never free text.
- **An aura is not a mood and the work is not therapy.** See §14.

## 6. User Personas

**The Practitioner (Owner)** — sole operator, non-technical, comfortable with
email and a phone but not with anything that looks like software. Primary
goal: fill her calendar without spending evenings on admin. Top tasks:
(1) publish a new workshop with a date and a price, (2) change a paragraph or
a picture on the home page, (3) see who has asked for a place and reply. What
breaks her day: any screen that requires her to understand a concept before
she can do a task; losing work because she didn't know she had to save.

**The Carrier** — 40s–50s, has been unwell or flattened for long enough to
start looking, has never done anything like this. Primary goal: work out
whether this is credible and whether it will be embarrassing. Top tasks:
(1) find out what physically happens in the room, (2) judge whether the
practitioner is serious, (3) find a date and a price without emailing to ask.
What breaks their day: being asked to believe something before being told what
happens; a price that only appears after you make contact.

**The Returner** — has had a session, wants the next thing. Primary goal: find
what's on and book it in under a minute. Top tasks: (1) scan upcoming dates,
(2) understand what a course commits them to, (3) request a place. What breaks
their day: having to re-read the whole site to find a date.

## 7. Architecture Overview

```text
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│  public web  │ ─────> │       api        │ ─────> │      db      │
│  (marketing  │        │  offerings       │        │  offerings   │
│   + booking  │        │  content         │        │  sessions    │
│   + subscribe│        │  bookings        │        │  bookings    │
│   + download)│        │  scheduling  ◀───┼── the  │  availability│
└──────────────┘        │  newsletter      │  only  │  timeblocks  │
                        │  documents       │  source│  sections    │
┌──────────────┐        │  media           │  of    │  subscribers │
│  admin web   │ ─────> │  settings        │  free  │  newsletters │
│  (owner only)│        │  auth (owner)    │  slots │  documents   │
└──────────────┘        └──────────────────┘        │  media       │
                                 │                  │  settings    │
                                 │                  └──────────────┘
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 object storage          transactional email       bulk/broadcast email
 (images, PDFs)          (booking, opt-in)         (newsletter issues)
```

Public pages are read-mostly and should be statically rendered or cached with
revalidation; the only public write is a BookingRequest. The admin is fully
dynamic and sits behind a single-account session. Draft and published content
are separate records of the same shape — the public site reads published, the
admin edits draft, publishing copies one to the other (§12).

## 8. Infrastructure Architecture

Single-region, small-scale, cheap to run and possible for one person to
maintain. Vercel for both web surfaces (the owner is the only admin user;
there is no scale case for splitting hosting). Managed Postgres (Neon or
Supabase) for data. Object storage for uploaded images and PDFs, with on-upload
processing for images (§12). One email provider covering both lanes — Resend
or equivalent — used transactionally for booking notifications, booking
acknowledgements and opt-in confirmations, and in broadcast mode for
newsletter issues. Sending domain authenticated with SPF, DKIM and DMARC
before the first issue goes out; without it a newsletter from a new domain
lands in spam and the feature is worthless however well built.

A scheduled job runner is required — hold expiry (§13) cannot depend on
somebody loading a page. Platform cron is sufficient; there is no queue
worth running at this scale.

Environments: `dev` and `production`. No staging — a two-environment setup a
sole operator can reason about beats a three-environment one she can't.
Observability: platform error reporting plus uptime checks. No custom
dashboards.

## 9. Backend Module Architecture

- **offerings** — CRUD for Services, Workshops, Courses and their Sessions.
  Owns validation that a Course has ≥1 Session and that Session dates are
  ordered. Exposes the public read model the products block consumes.
- **content** — the seven LandingSections plus SiteSettings. Owns the
  draft/published pair and the publish operation. Enforces the fixed beat set:
  the seven keys are seeded and cannot be created or destroyed through the API,
  only edited and toggled.
- **bookings** — accepts a BookingRequest against an Offering, rate-limits and
  spam-guards the public endpoint, notifies the owner, acknowledges the
  visitor, and exposes the owner's queue with status transitions.
- **scheduling** — the single source of truth for service availability. Owns
  AvailabilityRules, personal TimeBlocks, and the derivation of session
  TimeBlocks from Workshops and Course Sessions. Exposes one public read —
  "free slots for service X between dates A and B" — computed by subtraction
  (§5), never stored. Owns the hold lifecycle: place a hold on request,
  release it on decline or expiry, convert it on confirm. Slot length comes
  from the Service's duration; buffer and minimum lead time come from
  SiteSettings. All computation is done in a single declared timezone
  (Europe/London) and stored in UTC — a booking that lands an hour out across
  a DST boundary is the canonical failure of this module.
- **newsletter** — subscriber lifecycle (double opt-in, confirmation,
  unsubscribe, bounce suppression), issue authoring and rendering into the
  branded email template, test sends, and the batched broadcast. Owns the
  suppression list absolutely: an unsubscribed or bounced address is never
  sent to again by any code path, and re-subscribing is a fresh opt-in, not an
  undelete.
- **documents** — PDF upload and storage, metadata, download routes, and the
  attachment relationships to Newsletters and subscribe forms. Enforces
  `subscribers-only` visibility with signed, expiring links rather than by
  obscurity.
- **media** — upload, image processing (crop to the target ratio, palette
  treatment per §12), library listing, alt-text storage.
- **auth** — single-owner session. Email + password with a strong hash, plus
  rate-limited login. No public registration, no multi-tenancy.

## 10. Navigation Schema

```json
{
  "routes": [
    { "path": "/", "screen": "home" },
    { "path": "/services", "screen": "services-index" },
    { "path": "/services/[slug]", "screen": "service-detail" },
    { "path": "/workshops", "screen": "workshops-index" },
    { "path": "/workshops/[slug]", "screen": "workshop-detail" },
    { "path": "/courses", "screen": "courses-index" },
    { "path": "/courses/[slug]", "screen": "course-detail" },
    { "path": "/about", "screen": "about" },
    { "path": "/contact", "screen": "contact" },
    { "path": "/book/[kind]/[slug]", "screen": "booking-request" },
    { "path": "/book/thanks/[ref]", "screen": "booking-confirmation" },
    { "path": "/subscribe", "screen": "subscribe" },
    { "path": "/subscribe/[formSlug]", "screen": "subscribe" },
    { "path": "/subscribe/check-email", "screen": "subscribe-pending" },
    { "path": "/subscribe/confirm/[token]", "screen": "subscribe-confirmed" },
    { "path": "/unsubscribe/[token]", "screen": "unsubscribe" },
    { "path": "/downloads/[slug]", "screen": "document-download" },
    { "path": "/privacy", "screen": "privacy-notice" },
    { "path": "/preview/[token]", "screen": "home" },
    { "path": "/admin/login", "screen": "admin-login" },
    { "path": "/admin/forgot-password", "screen": "admin-forgot-password" },
    { "path": "/admin/reset-password/[token]", "screen": "admin-reset-password" },
    { "path": "/admin", "screen": "admin-dashboard" },
    { "path": "/admin/calendar", "screen": "admin-calendar" },
    { "path": "/admin/availability", "screen": "admin-availability" },
    { "path": "/admin/page", "screen": "admin-landing-sections" },
    { "path": "/admin/offerings", "screen": "admin-offerings" },
    { "path": "/admin/offerings/[id]", "screen": "admin-offering-edit" },
    { "path": "/admin/bookings", "screen": "admin-bookings" },
    { "path": "/admin/newsletters", "screen": "admin-newsletters" },
    { "path": "/admin/newsletters/[id]", "screen": "admin-newsletter-edit" },
    { "path": "/admin/subscribers", "screen": "admin-subscribers" },
    { "path": "/admin/documents", "screen": "admin-documents" },
    { "path": "/admin/media", "screen": "admin-media" },
    { "path": "/admin/settings", "screen": "admin-settings" }
  ]
}
```

Everything under `/admin` is gated by the owner session, except `/admin/login`,
`/admin/forgot-password` and `/admin/reset-password/[token]`, which cannot be.
Everything else is public and requires no account.

Four routes carry a token or reference, and each is load-bearing for a reason
worth stating:

- **`/book/thanks/[ref]`** — the confirmation must state the held time
  (§11), which a parameterless route cannot do on a cached surface. `ref` is
  an unguessable, non-sequential reference on the BookingRequest, and the page
  it renders is `noindex` and no-store. It shows the visitor their own
  submission and nothing else.
- **`/subscribe/[formSlug]`** — the named subscribe forms of §12. Each is the
  same screen with different framing copy and, optionally, an attached
  Document. `/subscribe` bare is the default form. There is one screen, not
  many.
- **`/preview/[token]`** — the admin's preview (§12) renders the real public
  home from DRAFT content. Signed, short-lived, owner-session-issued, and
  `noindex`. It is deliberately the public route's renderer rather than a
  second implementation, because a preview that isn't the real page isn't a
  preview.
- **`/privacy`** — required by §14 and linked from the booking form, the
  subscribe form and the footer. A legal obligation needs a page to live on.

Sign-out is a shell action, not a route.

## 11. Screen Catalog

**Public screens.**

**home** — the whole proposition in one scroll. Composed of seven fixed
narrative beats in a **fixed ascending order**, with the products block
between beats 6 and 7. Data: the seven published LandingSections, the live
Offering set, SiteSettings. Primary action: request a place. The seven beats
and the job each does:

| # | Beat | The job it does |
|---|------|-----------------|
| 1 | Root | Answer the unasked question. You stay clothed, nobody touches you, nothing is asked of your beliefs. Names the specific fear and disarms it. Always visible. |
| 2 | Sacral | What the hour actually feels like, from the inside. Sensory, not procedural. |
| 3 | Solar plexus | The method and its authority — the four verbs of the work: clearing, charging, repairing, restructuring. |
| 4 | Heart | The practitioner enters. Empathy first, credentials second. |
| 5 | Throat | What this is not. Not therapy, not medicine, not a replacement for either. The honesty that earns the rest. |
| 6 | Third eye | The transformation, named at the level of a person rather than a feature — who someone was before, and after. |
| — | **Products block** | Courses, workshops and services at equal billing, rendered live from the Offering records with real dates and real prices. Intro copy editable; listings automatic. |
| 7 | Crown | The call to action, at the brightest point of the page, resolving the specific thing beat 1 opened. Always visible. |

**services-index / workshops-index / courses-index** — the full set of one
kind, with dates, durations and prices. Data: active Offerings of that kind.
Primary action: open one. Must design the empty state — a new practitioner
will have zero workshops on day one and that page must still be worth
landing on.

**service-detail / workshop-detail / course-detail** — one Offering in full.
Course detail additionally lists its Sessions with dates. Shows capacity as
information, never as a live seat count. Primary action: request a place.

**about** — the practitioner at length. Data: SiteSettings bio + credentials.

**contact** — direct contact for people who won't use a form. Data:
SiteSettings.

**privacy-notice** — what is collected, why, how long it is kept, who it is
shared with, and how to request erasure, for both the booking and the
newsletter purposes separately (§14). Linked from the footer and from both
forms. Plain prose, not a legal wall — the audience is a nervous 50-year-old,
not a regulator.

**booking-request** — name, email, optional phone, optional message, against
a named Offering. **For services this screen also shows the live free-slot
picker** — real dates and times computed by the scheduling module, never a
static list. Choosing a slot places the hold described in §5. Must design
error, duplicate-submit, and the slot-taken-while-you-were-typing state, which
is the one that actually happens. For workshops and courses there is no
picker — the date is the event's.

**booking-confirmation** — what happens next and when to expect a reply, and
for services, the held time stated plainly along with the fact that it is held
rather than booked until she replies. Sets the expectation that a human
replies, because a human does.

**subscribe** — the newsletter sign-up. Email, optional name, and an explicit
unticked consent checkbox with its own wording (§14). Where a Document is
attached to the form, the page says clearly what will be sent and on what
terms. Primary action: subscribe.

**subscribe-pending** — "check your email to confirm". Nothing has been joined
yet and the screen says so.

**subscribe-confirmed** — the double opt-in landing. Confirms the
subscription, and where a Document was attached, delivers it here as well as
by email. Must design the already-confirmed and expired-token states.

**unsubscribe** — one click from the link in any issue, no login, no
questionnaire, no "are you sure" beyond a single confirmation of what
happened. Primary action: none — the work is already done on arrival.

**document-download** — a stored PDF. Public documents download directly;
`subscribers-only` documents require a signed link and explain what to do if
the link has expired.

**Admin screens.**

**admin-login** — single account. Primary action: sign in.

**admin-forgot-password / admin-reset-password** — a sole operator who logs in
monthly WILL forget the password, and there is no second administrator and no
support desk to call. Recovery is a rate-limited, single-use, short-lived
signed link emailed to the account address. Requesting a reset returns the same
response whether or not the address matches, so the pair cannot be used to
confirm the owner's email.

**admin-dashboard** — new booking requests first, then what's coming up.
Answers "what needs me today" above the fold. Surfaces holds that are about to
expire, because those are decisions with a deadline.

**admin-calendar** — the operational heart of the admin and the screen she
will live in. A month and a week view of one merged calendar showing, visually
distinct from one another: confirmed service bookings, pending holds,
workshops and course sessions (derived, not editable here), and personal
blocks. Free time is legible as free. Primary action: **block out personal
time** — drag or tap a span, name it, done, without leaving the calendar.
Tapping a derived session block explains where it came from and offers to open
the Offering rather than pretending to be editable. Must design: the empty
calendar of a new practitioner, a densely booked week, and a day with an
expired hold on it.

**admin-availability** — the recurring working pattern behind the calendar:
which days, which hours, session buffer, minimum lead time, and the furthest
ahead a visitor may book. Deliberately separate from the calendar because it
is set rarely and changing it by accident would be expensive. Primary action:
save.

**admin-landing-sections** — the seven beats as seven editable groups. Per
beat: eyebrow, heading, body, image, and (beats 3, 6, 7) link label + target.
Per beat on 2–6: a visibility toggle. No add, no delete, no reorder, no
styling controls. Primary action: publish. Must show clearly whether there
are unpublished changes.

**admin-offerings** — all Services, Workshops and Courses in one list,
filterable by kind, showing active/inactive. Primary action: create.

**admin-offering-edit** — one Offering. For Courses, add and order Sessions
inline. Primary action: save.

**admin-bookings** — the request queue with status transitions and the
visitor's message. For services, shows the held slot and how long is left on
the hold. Confirming converts the hold into a confirmed booking on the
calendar; declining releases the slot immediately. Primary action: confirm.

**admin-newsletters** — every issue, draft and sent, with the date and the
number it went to. Primary action: write a new issue.

**admin-newsletter-edit** — compose one issue: subject, preheader, and a body
built from a small fixed set of blocks (paragraph, heading, image, button,
and an upcoming-offerings block that pulls live dates in). Attach Documents.
**Her branding is not authored here — it is the template**: logo, palette,
type and footer are applied automatically to every issue, so there is no way
to send something off-brand. Primary actions: send a test to herself, then
send. Sending is guarded by a confirmation naming the exact recipient count,
and is irreversible — the screen must say so before, not after.

**admin-subscribers** — the list with status, source and joined date; search;
export to CSV; manual unsubscribe on request. Shows the confirmed count
distinctly from the pending count, because only one of those is the real
audience. No manual bulk import in v1 — see §14.

**admin-documents** — the PDF library. Upload, title, description,
visibility, and a plain view of which newsletters and forms reference each
one, so she can see what would break before deleting. Primary action: upload.

**admin-media** — the image library: the six supplied plates plus anything
uploaded, with alt text. Primary action: upload.

**admin-settings** — contact details, bio, credentials, social links,
background-image selection.

## 12. Key Features Summary

**Public site.**

- Seven-beat home page in a fixed ascending order, content-driven from
  published LandingSections
- Products block rendering live Courses, Workshops and Services at equal
  billing with real dates and prices
- Index and detail pages for each of the three offering kinds
- Course detail listing its Sessions with dates
- Booking-request form against any Offering, with spam guard and rate limit
- **Live free-slot picker for services**, computed from the owner's calendar,
  placing a self-expiring hold on the chosen time
- Email acknowledgement to the visitor, email notification to the owner
- **Newsletter subscription** with double opt-in, one-click unsubscribe from
  every issue, and an optional PDF offered with a named subscribe form
- **PDF downloads** — public documents direct, subscriber-only documents via
  signed expiring links
- About and contact pages
- **Privacy notice** at `/privacy`, linked from the footer and from both the
  booking and subscribe forms, covering the two purposes separately (§14)
- Configurable page background: the owner picks from a curated set of
  supplied plates, or a plain ground. A sparse, procedural star field is
  available as an option and is decorative only — never carries content, and
  is suppressed under `prefers-reduced-motion`
- Full WCAG 2.2 AA conformance verified by computed contrast

**Admin (owner only).**

- Single-account login, rate-limited, with emailed password recovery (a sole
  operator has no second admin and no support desk)
- Edit all seven landing beats: eyebrow, heading, body, image, and link on the
  three beats that have one
- Show/hide beats 2–6; beats 1 and 7 are always visible
- **Draft → preview → publish.** Edits are never live until published. Preview
  renders the real page from draft content. Publishing is one button with one
  confirmation, not a workflow.
- Create, edit, activate and deactivate Services, Workshops and Courses
- Add, order and edit a Course's Sessions
- Set prices per Offering (no price is hard-coded anywhere)
- Booking-request queue with status transitions
- Media library: the six supplied plates plus upload. **Uploads are
  auto-processed** — cropped to the target ratio for their slot and given a
  palette treatment so anything the owner adds lands inside the site's visual
  world. This is what stops one phone snapshot destroying the design.
- Alt text required on every image before it can be used
- Site settings: contact details, bio, credentials, social links, background
  selection, and hold duration. **Buffer, minimum lead time and booking
  horizon live on `admin-availability`, NOT here** — they are scheduling
  inputs, they belong beside the pattern they modify, and two screens owning
  one value is exactly how two disagreeing values happen.
- **One publish, one scope.** The seven landing beats and SiteSettings share a
  single draft/published pair, so one publish makes everything pending go
  live at once. The confirmation itemises what that is. Two independent
  publish buttons would let her ship a beat that references a phone number
  she hasn't published yet.

**Calendar and availability.**

- One merged calendar: confirmed bookings, pending holds, workshop and course
  sessions, and personal blocks, in month and week views
- **Workshops and course sessions block the calendar automatically** the
  moment they are published, and unblock when moved or removed — she never
  blocks her own events by hand
- **Personal time blocking** in one gesture from the calendar itself
- A recurring weekly availability pattern, plus buffer, minimum lead time and
  booking horizon
- Free slots for a service derived by subtraction (§5) — never stored, never
  editable as a list, never able to disagree with the calendar
- Hold lifecycle: placed on request, released on decline or expiry, converted
  on confirm

**Newsletter.**

- Public subscribe form with explicit unticked consent, double opt-in, and
  confirmation email
- One-click unsubscribe via signed token in every issue, no login required
- Permanent suppression of unsubscribed and bounced addresses across every
  send path
- Issue composition in the admin from a small fixed block set, with an
  upcoming-offerings block that pulls live dates
- **Her branding is the template, not an option** — logo, palette, type and
  footer applied automatically to every issue, including the postal/contact
  identification and unsubscribe link the law requires
- Test send to herself before any broadcast
- Batched send with a confirmation naming the exact recipient count
- Subscriber list with status, source, search, CSV export, manual unsubscribe

**Documents.**

- PDF library with title, description and visibility
- Attach one or more Documents to a newsletter issue
- Offer a Document with a subscribe form as the reason to join
- Signed, expiring links for subscriber-only documents
- Reference view before deletion — she can see what would break

**Explicitly out of scope for v1** — online payment, visitor accounts,
capacity enforcement / real seat-holding for group events, external calendar
sync (Google/iCal), a blog, email open/click tracking, bulk import of an
existing contact list, multi-practitioner support. See §19 and §14.

## 13. Security

**Threat model.** The public surface has three write endpoints — booking
request, newsletter subscribe, and opt-in confirmation — plus two token-bearing
read endpoints (unsubscribe, document download). The realistic threats are form
abuse (spam, injection, mail-relay attempts through the notification path),
**using the site as a spam cannon** by submitting other people's addresses to
the subscribe form, slot-exhaustion by placing holds in bulk, unauthorised
admin access, and leakage of the subscriber list. There is no payment data
anywhere in v1.

**AuthN/AuthZ.** One owner account. Password hashed with a modern memory-hard
algorithm; login rate-limited by IP and by account; sessions
`httpOnly`/`Secure`/`SameSite=Lax` with a sensible idle expiry. No public
registration endpoint exists — the account is seeded. Every `/admin` route and
every mutating API route other than booking-create requires the session; this
is enforced server-side, never by hiding UI.

**Data classification.** BookingRequest contents (name, email, phone, free
text), Subscriber records, and the owner's personal TimeBlock labels are
personal data. Personal block labels in particular can be intimate ("hospital",
"funeral") and must never appear on any public surface or in any public
availability response — the public API returns *unavailable*, never a reason.
Everything else — offerings, prices, page copy, images, published documents —
is public by design.

**Booking endpoint.** Rate-limited per IP, size-capped, validated against the
Offering set (a request must name a real, active Offering), and spam-guarded
by a method that does not depend on the visitor's eyesight or JavaScript
being enabled. All values are treated as untrusted text on the way into the
notification email — no user input is interpolated into headers.

**Subscribe endpoint.** Rate-limited harder than the booking form, because
the abuse case is signing someone else up. Double opt-in is the primary
control: an unconfirmed address receives exactly one email and nothing else,
ever. Confirmation tokens are single-use, expiring, and unguessable.
Enumeration is not possible — submitting an address that is already subscribed
returns the same response as a new one.

**Tokens.** Unsubscribe tokens are per-subscriber, signed, and do not expire
(a two-year-old issue must still unsubscribe correctly). They authorise
exactly one action — removal — and never expose or mutate anything else.
Document links for subscriber-only files are signed and short-lived.

**Holds.** Rate-limited per IP and per email, capped in number, and expired by
a scheduled job rather than only on read — so an abandoned hold cannot silently
occupy a slot because nobody looked at the calendar.

**Uploads.** Content-type and magic-byte validated, size-capped, and served
from a path that cannot execute. Images are re-encoded on the server rather
than stored as received. PDFs cannot be re-encoded, so they are instead stored
outside the web root, served through an application route with an explicit
`Content-Disposition` and a non-executable content type, and are never
rendered inline from a same-origin path where an embedded script could run
against the site's origin.

**Secrets.** Environment variables only, never committed. No secret is ever
read by, or exposed to, the public bundle.

## 14. Regulatory Notes

**Jurisdiction: United Kingdom.** UK GDPR and the Data Protection Act 2018
apply.

- **Lawful basis** for processing a BookingRequest is the visitor's request to
  take steps prior to entering into a contract. The lawful basis for the
  newsletter is **consent**, and it is a separate basis for a separate
  purpose. Booking somebody in must never add them to the list.
- **Privacy notice** required and linked from the booking form, the subscribe
  form and the footer: what is collected, why, how long it is kept, who it is
  shared with (nobody beyond the email providers), and how to request erasure.
- **Retention:** booking requests deleted or anonymised after a defined period
  (recommend 24 months) — the owner needs a way to delete one on request.
  Unsubscribed addresses are retained in the suppression list indefinitely,
  which is both permitted and necessary: keeping a record of who not to email
  is how you honour the objection.
- **Cookies:** no analytics or advertising cookies in v1, so no consent banner
  is required. The session cookie is strictly necessary. Adding analytics —
  **or newsletter open-tracking pixels, which are the same thing in an email**
  — makes a consent mechanism mandatory. This is the reason open/click
  tracking is out of scope in v1 (§12): it buys a vanity metric and costs a
  compliance surface.

**Marketing email — PECR (Privacy and Electronic Communications Regulations).**
This is new obligation, not a variation of the above, and it is strict.

- **Consent must be explicit, unbundled and freely given.** A pre-ticked box
  is not consent. Consent buried in terms is not consent. The subscribe form
  carries its own unticked checkbox with its own plain wording naming what
  will be sent and roughly how often.
- **Double opt-in** is required by this brief. PECR does not literally mandate
  it, but it is the only mechanism that produces defensible evidence of
  consent and it is the control that stops the site being used to sign up
  third parties (§13). An unconfirmed address is never mailed anything except
  its own confirmation request.
- **Evidence of consent must be recorded and kept** — when, from which form,
  and against which wording. The Subscriber record's `source` and
  `confirmed-at` exist for this reason, not for analytics.
- **Every issue must carry** a working one-click unsubscribe, the sender's
  identity, and a valid postal or contactable address for the business.
  These are in the template and cannot be edited out — that is the point of
  making the branding a template rather than a setting.
- **No bought, scraped or imported lists.** Bulk import is out of scope in v1
  precisely so that consent provenance is never in doubt. If she has an
  existing list of clients she has emailed before, those people must be
  invited to opt in — not added.
- **The PDF-for-subscription exchange is permitted, with care.** Offering a
  document in return for signing up is normal practice and does not by itself
  invalidate consent, because a free download is not a service the visitor is
  otherwise entitled to. What makes it safe is disclosure: the form must state
  plainly that subscribing is how the document arrives and that they can leave
  at any time. What would make it unsafe is bundling the newsletter into
  something they came for anyway — so a booking, a contact form, or anything
  attached to a paid offering must never carry a subscription as a condition
  or a default.

**Advertising and health claims — the material risk in this category.** The
CAP Code (enforced by the ASA) restricts claims about health outcomes for
therapies without robust evidence, and the Consumer Protection from Unfair
Trading Regulations prohibit misleading commercial practices. Energy healing
has no accepted clinical evidence base.

Therefore the site must not state or imply that the work treats, cures,
diagnoses, prevents or alleviates any named medical condition — physical or
psychological. It describes what happens, what people report, and what the
practitioner does; it does not promise outcomes. Beat 5 ("what this is not")
carries this explicitly and is not decorative — it is the compliance surface
as well as the trust surface. A visible statement that the work is
complementary and not a substitute for medical care is required, and the
booking flow must not solicit health information.

Content is owner-editable, so this constraint cannot be enforced by the build
alone. The admin's landing-section editor should carry a short, permanent
inline reminder of it where copy is written.

**Accessibility:** Equality Act 2010 makes reasonable adjustment a legal
expectation for a service website. §2's WCAG 2.2 AA floor is the response.

## 15. Success Metrics

- **The register lands.** A first-time visitor shown the home page for 20
  seconds and asked "how did that feel?" answers in affective terms rather
  than functional ones. This is the client's own bar and it is the primary
  metric; it is measured by asking real people, not by a proxy.
- **The unasked question gets answered.** ≥80% of test visitors, unprompted,
  can state that they keep their clothes on and are not touched, after one
  scroll.
- **Booking friction.** A returning visitor can go from landing to submitted
  request in under 60 seconds and ≤3 clicks.
- **Owner independence.** The owner, unaided and without documentation, can
  publish a new workshop with a date and price in under 5 minutes, change a
  paragraph and a picture on the home page in under 3, block out a personal
  afternoon in under 30 seconds, and write and send a newsletter issue in
  under 15 minutes. Measured by watching her do it, once, before launch. If
  she can't, the admin has failed regardless of what the tests say.
- **The calendar never lies.** Zero double-offers: no visitor is ever shown a
  slot that a workshop, a course session, a personal block or another hold
  has already taken. This is a defect count, and the target is zero, not low.
- **Newsletter health.** ≥40% of confirmed subscribers open an issue is *not*
  a metric here — open tracking is out of scope (§14). The measurable ones
  are: opt-in confirmation rate ≥60% of submitted addresses, unsubscribe rate
  per issue <1%, and hard-bounce rate <2%.
- **Reach.** ≥1 booking request per week within 8 weeks of launch.
- **Conformance.** Zero AA contrast failures on computed styles across every
  public screen; Lighthouse accessibility ≥95.

## 16. Development Workflow

Trunk-based with short-lived feature branches per feature in the task graph;
merge to `main` on reviewer approval. Definition of Done for a feature:
implementation plus happy-path tests written by the builder, edge-case and
integration tests by the tester, ≥80% combined line coverage, reviewer
approved across all eight dimensions, no new AA contrast failures, and — for
any screen with a data surface — empty, loading, error and populated states
all present. Plans move draft → approved → in-progress → archived; the
attempt log is filled in on every failure, and no fix is tried twice.

## 17. Testing Strategy

Per `.claude/rules/testing-policy.md` (hybrid TDD). Specific to this project:

- **Must be tested.** Booking-request creation including validation, rate
  limit and spam guard. The publish operation — draft never leaks to public,
  published never silently reverts. Admin route protection, asserted
  server-side per route. The fixed-beat invariant: the API refuses to create,
  delete or reorder a LandingSection, and refuses to hide beats 1 or 7. Course
  → Session ordering. Image upload validation and processing. Price display
  for every Offering kind.
- **Availability derivation is the highest-risk logic in the build and gets
  the deepest tests.** A published workshop removes its slots; deleting it
  restores them; moving it moves them. A personal block removes its slots. A
  held slot is invisible to the next visitor and reappears when the hold
  expires. Buffer, minimum lead time and booking horizon each constrain the
  set. Two requests racing for the last slot: exactly one wins and the other
  gets the slot-taken state, asserted against real concurrency rather than
  assumed. **DST both ways** — a slot on the spring-forward and autumn-back
  weekends lands where a human expects, and a booking made in one offset
  displays correctly in the other.
- **Newsletter must be tested.** Pending subscribers receive nothing but the
  confirmation. Tokens are single-use and expiring where specified. An
  unsubscribed or bounced address is not sent to by any path, asserted at the
  send layer rather than the UI. Re-subscribing after unsubscribing requires a
  fresh confirmation. Every rendered issue contains an unsubscribe link and
  the sender identity — asserted on the rendered HTML, because that is the
  legal requirement and a template regression would be silent.
- **Documents.** Subscriber-only files are not reachable without a valid
  signed link; expired links fail closed; upload validation rejects a
  non-PDF with a PDF extension.
- **E2E (Playwright).** The Carrier's path: land → scroll → open a service →
  pick a slot → request → confirmation. The Returner's path: subscribe →
  confirm → receive the document. The Owner's path: log in → edit a beat →
  preview → publish → verify the public page changed; and → publish a workshop
  → verify its slots disappeared from the public picker. Seeding follows
  Strategy C (real backend + DB) per the testing policy — the gated
  `/test/seed`, `/test/cleanup` and `/test/seed-baseline` endpoints are
  required. Time-dependent specs pin a fixed clock; a test that passes only on
  Tuesdays is a defect in the test.
- **Accessibility.** Automated axe pass on every public screen in CI, plus a
  computed-contrast assertion — an eyeball check does not count here, because
  this palette fails in ways that are invisible to someone who already knows
  what the text says.
- **Email.** Both providers are mocked in all default-on tests, per the
  external-API constraint in the testing policy. No test ever sends a real
  message — a broadcast test that reaches a real inbox is not a flake, it is
  an incident.
- **Discretionary.** Visual regression, load testing.

## 18. Deployment Pipeline

Commit → typecheck → lint → unit + integration → build → E2E against a
preview deployment → axe + contrast gate → human approval → production.
Every gate blocks. Rollback is a redeploy of the previous build, which must be
achievable in under five minutes without a local machine. Database migrations
are forward-only and additive within a release; anything destructive is a
separate, deliberate step.

## 19. Milestones & Timeline

Dates aspirational; sequence firm.

**Milestone 1 — the shopfront.** The seven-beat home page, the three offering
kinds with index and detail pages, the booking-request flow with email
notification, about and contact, and the admin core (landing sections with
draft/preview/publish, offerings, bookings queue, media library, settings).

**Milestone 2 — the calendar.** Availability rules, the merged admin calendar,
automatic blocking from workshops and course sessions, personal time blocking,
the public free-slot picker for services, and the hold lifecycle with its
expiry job. Sequenced after M1 rather than inside it because the booking flow
must work end-to-end before slot selection is layered onto it — but the
service booking experience is materially incomplete until this ships, so the
gap between M1 and M2 should be short. Do not launch publicly between them
unless services are hidden.

**Milestone 3 — the list.** Newsletter subscription with double opt-in, the
subscriber list, issue composition on the branded template, batched send,
unsubscribe and suppression, the PDF library, and PDF-for-subscription forms.
Requires the sending domain to be authenticated (§8) before the first issue.

Milestones 1–3 together are the launchable product; everything in §12 that
isn't marked out of scope belongs to one of them.

**Milestone 4 — transacting.** Online payment for workshops and courses,
deposits, real capacity enforcement with seat-holding, and visitor accounts to
support both. All four are one decision, not four — capacity only becomes
meaningful once money reserves a place.

**Milestone 5 — reach.** Writing/blog, external calendar sync (Google/iCal),
and analytics — which brings a cookie-consent requirement with it, and would
also make newsletter open-tracking newly viable under the same consent
mechanism. See §14.

## 20. Appendix

**Open questions.**

1. **The practitioner's name and history are not confirmed.** The name
   "Marianne" and the figures "fifteen years practising, twelve teaching" were
   used during brief authoring and have **not** been verified with the client.
   Beat 4 and the about page depend on them. Confirm before any copy is
   written for those surfaces; treat the §3 "fifteen years" as provisional for
   the same reason.
2. **Prices are unknown by design.** No price is hard-coded anywhere; every
   Offering carries its own. Nothing blocks on this.
3. **Venue.** Whether workshops happen at a fixed venue or vary per event —
   currently modelled as per-event, which is the safe superset.
4. **Retention period** for booking requests: 24 months recommended, needs the
   client's agreement.
5. **Cancellation and refund terms** are not specified and will be needed
   before Milestone 4, and arguably before launch as a published policy.
6. **Working hours and lead time.** The recurring availability pattern, the
   buffer between sessions, how far ahead someone may book, and how much
   notice she needs are all configurable — but the *defaults* she starts with
   need her input. Ship with something plausible and let her correct it.
7. **Hold duration.** 48 hours is the working default and is a guess. It
   trades her response time against a visitor's patience; she will know which
   way to move it after a fortnight.
8. **Newsletter cadence and its promise.** The consent wording has to state
   roughly how often she will write (§14). Monthly is the safe claim; she
   should pick one she can keep, because the wording is the consent.
9. **Whether she has an existing contact list.** If so it cannot be imported
   (§14) — those people need inviting to opt in, which is a launch task and a
   piece of copy, not a feature.
10. **A postal or contactable business address** is legally required in the
    newsletter footer. A sole practitioner working from home may not want her
    home address published; a PO box or a registered-office service is the
    usual answer and costs money. Needs deciding before the first issue.

**Settled during brief authoring — recorded as defaults, not mandates.**

- **The chakra arc is content structure, not composition.** The seven beats
  are named for the chakras and ascend root → crown so the page ends in light.
  That is a requirement (§11). *How* a direction expresses the ascent is a
  design decision made per direction and chosen at Gate 2.
- **Palette approach.** The client's own six gradient stops carry the page;
  at most one true chakra hue appears per beat as a small accent, never as a
  full band. The rainbow chakra chart is the measured category cliché and
  reproducing it would undo §2's register. This is a strong default, and a
  direction that departs from it should be able to say why.
- **Ground.** A dark, warm plum ground (`#2B0E28` was the working value) was
  the client's preference during authoring. Recorded as a preference, not a
  mandate — §2 deliberately does not fix the page ground, because a ground
  fixed in the brief binds every direction and collapses the divergence Gate 2
  exists to produce. (Empirical: thefieldwork v1 lost three design re-runs to
  exactly that mistake.)
- **Beat 1 imagery.** `aura-two-people` — hands hovering over a seated,
  clothed person — does the reassurance work faster than the copy will.

**Glossary.**

- **Aura / field** — the energetic field the practitioner works with. The work
  is hands-off; the field, not the body, is the object of the work.
- **The four verbs** — clearing, charging, repairing, restructuring. The
  practitioner's own description of what she does to a field.
- **Course** — a series of workshops sold as one unit. See §5.
