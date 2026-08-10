# User Flows — webapp

Scope: the PUBLIC surface only (brief §10 routes not under `/admin`, §11 "Public
screens", §12 "Public site" / "Newsletter" / "Documents" public halves). Every
`/admin/*` screen belongs to the sibling `admin` platform and is deliberately
absent here.

Seventeen screens. Eight flows. A flow here is a TASK, not a person — the three
personas of §6 each run several of these, and two of them run some of the same
ones for different reasons.

## Personas on this surface

| Persona                 | Present? | What they run here                                                                                                                                                                                                                             |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Carrier**         | Yes      | Arrives cold, sceptical, and carrying a question they are embarrassed to ask. Runs Flow 1 before they will run anything else. Flows 1, 2, 5, 6.                                                                                                |
| **The Returner**        | Yes      | Already knows the work. Wants a date and wants it fast (§15: landing → submitted request in <60s, ≤3 clicks). Skips Flow 1 entirely. Flows 2, 3, 4, 6, 7, 8.                                                                                   |
| **The Practitioner**    | **No**   | The owner never operates this surface. She appears on it only as _subject_ — Beat 4 of `home` and the whole of `about` are about her, written from `SiteSettings`. Her only entry point is `/admin/login`, which is the admin worker's screen. |
| **Existing Subscriber** | Yes      | Not a §6 persona, but a real actor: arrives from a link inside a sent issue with no session and no account. Flows 7 and 8.                                                                                                                     |

**The load-bearing asymmetry:** the Carrier will not reach a booking screen
until the reassurance job (Flow 1) is done, and Flow 1 is done _inside_ `home`
rather than on a second page. The competitive research measured this precisely
— 0 of 6 homepages in the category answer the clothing/touch/belief question,
and the one site that answers it well answers it two clicks deep on `/faq/`.
Flow 1 is the flow that has no incumbent.

---

## Flow 1: Answer the unasked question

**Flow id**: `answer-the-unasked-question`
**Persona**: The Carrier
**Goal**: Decide, from a cold arrival, that this is credible and will not be
embarrassing — without having to ask anyone anything.

**Screens**:

1. `home.html` → `about.html` → `services-index.html` → `service-detail.html`

Also reachable mid-flow: `home.html` → `service-detail.html` directly, via the
products block.

**Notes**:

- The whole flow can terminate on `home.html` alone. That is the design intent
  of §3 ("in a single scroll") and §15 (≥80% of test visitors can state,
  unprompted, that they stay clothed and are not touched, after one scroll).
  `about.html` and the detail pages are the deepening, not the answer.
- `home.html` is **seven fixed narrative beats in a fixed ascending order**
  (root → crown) with a data-driven products block between beats 6 and 7. The
  beats are components of the one screen, not seven screens:
  1. **Root** — answers the unasked question. Always visible, cannot be hidden.
  2. **Sacral** — what the hour actually feels like, from the inside.
  3. **Solar plexus** — the method and its four verbs (clearing, charging,
     repairing, restructuring).
  4. **Heart** — the practitioner enters; empathy first, credentials second.
  5. **Throat** — what this is _not_. This beat is simultaneously the trust
     surface and the §14 compliance surface; it is not decorative.
  6. **Third eye** — the transformation, named at the level of a person.
  7. **Products block** — NOT a beat. Renders live from the Offering records.
  8. **Crown** — the call to action, resolving what Beat 1 opened. Always
     visible, cannot be hidden.
- Beats 2–6 carry a visibility toggle the owner controls. **The page must still
  compose when any subset of 2–6 is hidden** — the minimum legal composition is
  Beat 1 + products block + Beat 7. This is a layout state, not an error state,
  and it is the one a builder will forget.
- Beat 4 and `about.html` both depend on the practitioner's name and history,
  which §20 open question 1 records as **unverified**. Copy for those two
  surfaces is blocked on client confirmation; structure is not.

**States** (`home.html`):

| State                  | What it is                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| populated              | Seven published `LandingSection`s + a products block carrying all three offering kinds with real dates and real prices.                                                                                             |
| **empty**              | Zero active Offerings — day one. Beats 1–7 render in full; the products block shows its editable intro copy plus a single route to `contact.html`. The page must not show an empty rail or a "coming soon" apology. |
| partial (beats hidden) | Any subset of beats 2–6 toggled off. Beats 1, products and 7 always present.                                                                                                                                        |
| loading                | Statically rendered / cached with revalidation (§7). No client-side loading state for beats or products; if one is needed, the page is built wrong.                                                                 |
| error                  | Content fetch failure serves the last published render rather than a blank page. A public read failure must never produce an empty home page.                                                                       |
| overflow               | More Offerings of one kind than the block shows — the block caps its list and hands off to the matching index screen.                                                                                               |

**States** (`about.html`): populated · minimal (bio present, credentials empty
— she may have nothing to list on day one, and the page must not show an empty
"Credentials" heading) · error.

---

## Flow 2: Book a one-to-one service

**Flow id**: `book-a-service`
**Persona**: The Carrier (first time) and The Returner (repeat)
**Goal**: Choose a real time from the practitioner's actual calendar, ask for
it, and understand exactly what has and has not just happened.

**Screens**:

1. `home.html` → `services-index.html` → `service-detail.html` → `booking-request.html` → `booking-confirmation.html`
2. Side path from the form: `booking-request.html` → `privacy-notice.html` → back

The Returner's fast path is `home.html` → `service-detail.html` (products
block) → `booking-request.html` → `booking-confirmation.html` — three clicks,
which is the §15 budget exactly.

**Notes**:

- **This is the fork.** `booking-request.html` behaves differently by offering
  kind and the difference is a genuine state fork, not a styling variant. For a
  **Service** it renders a **live free-slot picker**, computed by subtraction
  (§5) from AvailabilityRules minus session blocks minus personal blocks minus
  held and confirmed bookings minus buffer and minimum lead time. Choosing a
  slot and submitting places a **self-expiring hold**. Flows 3 and 4 run the
  same screen with **no picker at all**.
- The slot list is **never a static list and never a stored one**. §5: there is
  no second place where availability lives. A picker rendered from a cached
  array is the canonical failure of this screen.
- The picker must **server-render**. The competitive research measured Re:Mind's
  `/book-class` returning "No results found" to a static fetch because the
  schedule is client-rendered — dates that only exist after JavaScript do not
  exist for crawlers, slow connections, or assistive tech.
- The hold is **a courtesy, not a reservation** (§5). `booking-confirmation.html`
  must say that in plain words, state the held time, and say when the hold
  expires. It must not imply a booking.
- The form must **not** solicit health information (§14) and must **not** carry
  a newsletter subscription as a condition or a default (§14 — bundling
  consent into something the visitor came for anyway is the unsafe case).
- A privacy notice must be linked from this form (§14) — `privacy-notice.html`,
  route `/privacy`. It states the booking purpose and the newsletter purpose
  **separately**, because they rest on different lawful bases (§14: taking steps
  prior to a contract vs. consent). Booking somebody in must never add them to
  the list, and the notice is where that separation is visible to the visitor.

**States** (`booking-request.html`, service variant):

| State                                | What it is                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| loading (slots)                      | The one genuinely async surface on the public site. Slot derivation runs server-side; show the offering summary and the form immediately, the slot grid under a skeleton.                                                                                                                                                                                                                                |
| populated                            | Free slots grouped by day, in Europe/London, within the booking horizon.                                                                                                                                                                                                                                                                                                                                 |
| **empty (no free slots)**            | Availability exists but every slot inside the horizon is taken or blocked. Say so honestly, offer the next horizon and a route to `contact.html`. Never render an empty grid with no explanation.                                                                                                                                                                                                        |
| empty (no availability configured)   | The owner has set no AvailabilityRules yet. Distinct from the above and needs different words — "not currently taking one-to-one times" rather than "fully booked".                                                                                                                                                                                                                                      |
| **slot-taken-while-you-were-typing** | **The one that actually happens.** Between render and submit, another visitor's hold or the owner's own block claimed the chosen slot. Re-render the picker with that slot gone, **preserve every field the visitor already typed**, and say plainly what happened without blaming them. §17 requires this asserted against real concurrency: two requests race, exactly one wins, the other lands here. |
| validation error                     | Missing name or email, malformed email, message over the size cap. Field-level, inline, non-destructive.                                                                                                                                                                                                                                                                                                 |
| duplicate-submit                     | Double click, or back-then-resubmit. Idempotent — one hold, one BookingRequest, one acknowledgement email. Never two holds from one visitor's one intent.                                                                                                                                                                                                                                                |
| rate-limited / spam-guard reject     | §13: rate-limited per IP; spam guard must not depend on the visitor's eyesight or on JavaScript being enabled. The rejection must be survivable by a real person who tripped it — a dead end here loses a genuine lead.                                                                                                                                                                                  |
| offering deactivated since load      | The Offering was deactivated while the form was open. §13 requires the request to name a real, active Offering. Explain and route to `services-index.html`.                                                                                                                                                                                                                                              |
| error                                | Network or server failure on submit. Preserve the typed values.                                                                                                                                                                                                                                                                                                                                          |

**States** (`booking-confirmation.html`): service variant (held time stated,
held-not-booked stated, hold expiry stated, a human replies) · workshop/course
variant (the event's own date, no hold language) · direct arrival with no
request in session (generic, leaks nothing) · error.

**States** (`services-index.html`, `service-detail.html`): see Flow 3's table —
identical shape, different data.

---

## Flow 3: Reserve a place on a dated workshop

**Flow id**: `reserve-a-workshop-place`
**Persona**: The Returner
**Goal**: Scan what is on, pick a date, ask for a place — without re-reading
the site to find it.

**Screens**:

1. `home.html` → `workshops-index.html` → `workshop-detail.html` → `booking-request.html` → `booking-confirmation.html`
2. Side path from the form: `booking-request.html` → `privacy-notice.html` → back

**Notes**:

- **No slot picker.** The date is the event's. `booking-request.html` states the
  workshop's date, time and venue as fact and collects name, email, optional
  phone, optional message. No hold is placed — holds exist only for services
  (§5).
- Capacity is shown as **information, never as a live seat count** (§11).
  Capacity is not enforced in v1 (§12 out-of-scope). A "3 places left" counter
  would be a lie the system cannot keep.
- A workshop whose date has passed must leave the index. An index that shows a
  dated event that already happened is a defect, not an edge case.

**States** (all three index screens — `services-index.html`,
`workshops-index.html`, `courses-index.html`):

| State     | What it is                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **empty** | **Required, and the state that matters most.** A new practitioner has zero workshops on day one and §11 says that page must still be worth landing on. It carries the kind's own standing copy — what a workshop _is_ here, what it costs to attend, what happens in the room — plus a route to `subscribe.html` (be told when there is one) and a route to `contact.html`. It is a real page with nothing scheduled, not an error. |
| loading   | Cached with revalidation (§7), so rarely seen. Skeleton cards where it is.                                                                                                                                                                                                                                                                                                                                                          |
| error     | Fetch failure. Carries the standing copy and a route to `contact.html` rather than a bare failure.                                                                                                                                                                                                                                                                                                                                  |
| populated | Active Offerings of that kind with dates, durations and prices — published on the page, not behind an enquiry. Half the researched category hides price behind contact; §6 names that as the Carrier's day-breaker.                                                                                                                                                                                                                 |
| overflow  | More than fits one screen — grouped by month for the dated kinds, paginated for services. Past-dated events have already dropped out.                                                                                                                                                                                                                                                                                               |

**States** (all three detail screens — `service-detail.html`,
`workshop-detail.html`, `course-detail.html`):

| State                     | What it is                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| populated                 | One Offering in full, with its price, its image, and a single unmistakable primary action: request a place.                                                                                         |
| loading                   | Cached; skeleton only if a cold render is possible.                                                                                                                                                 |
| **not-found / withdrawn** | The Offering was deactivated after someone shared or bookmarked the link. Offer the matching index; never a bare 404.                                                                               |
| **past-dated**            | Workshop and course detail only — the date has gone. The page still reads (someone may arrive from an old newsletter), the request CTA is gone, and it routes to the index and to `subscribe.html`. |
| error                     | Fetch failure.                                                                                                                                                                                      |
| overflow                  | `course-detail.html` only — a long Session list. See Flow 4.                                                                                                                                        |

---

## Flow 4: Commit to a course

**Flow id**: `commit-to-a-course`
**Persona**: The Returner
**Goal**: Understand what the whole series commits them to — every date, not
just the first — and then ask for a place on it.

**Screens**:

1. `home.html` → `courses-index.html` → `course-detail.html` → `booking-request.html` → `booking-confirmation.html`
2. Side path from the form: `booking-request.html` → `privacy-notice.html` → back

**Notes**:

- **A Course is one purchase covering a fixed series of Sessions** (§5). The
  visitor books the Course once, not once per Session. `course-detail.html`
  lists its Sessions with their dates, times and venues — and each Session is
  **information, not an affordance**. A Session must never render as something
  clickable or bookable; §6's Returner explicitly needs to "understand what a
  course commits them to", and a clickable Session date teaches the opposite.
- Two dated group events (a Workshop and a Course Session) look identical on
  screen and are different products. The screen has to make the difference
  legible without a glossary.
- `booking-request.html` for a course has **no picker** — same as Flow 3. The
  dates are the Course's Sessions, restated on the form so the visitor is
  agreeing to a series they can see.

**States** (`course-detail.html`, additional to the shared detail table):

| State                | What it is                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| session list (short) | 3–6 Sessions, all visible, all dated.                                                                                                                                    |
| **overflow**         | A long series. The list stays scannable — grouped or condensed — and never truncates in a way that hides a date the visitor is committing to.                            |
| part-way through     | A Course whose first Sessions have already run. The passed dates are shown as passed rather than silently dropped, because what the visitor is buying has changed shape. |
| empty session list   | A Course with zero Sessions should be impossible — §9's offerings module validates ≥1 Session. Treat an empty list as an error state, not an empty state.                |

---

## Flow 5: Get in touch without using a form

**Flow id**: `contact-without-a-form`
**Persona**: The Carrier
**Goal**: Reach a human directly — because some visitors will not put their
name in a box before they have spoken to someone.

**Screens**:

1. `home.html` → `contact.html`
2. `about.html` → `contact.html`

**Notes**:

- §11 is explicit that `contact.html` exists **for people who won't use a
  form**. Its content is `SiteSettings` — email, phone, social links. Adding a
  general-purpose contact form to this page would defeat the reason it exists;
  the form-shaped path is `booking-request.html`.
- This is the fallback destination for six other states across the site (empty
  index, no free slots, offering withdrawn, spam-guard rejection, document link
  expired, unsubscribe failure). It has to be genuinely reachable and genuinely
  answerable, not a formality.

**States** (`contact.html`): populated · partial (phone absent — she may
publish email only; the page must not show an empty "Phone" row) · error.

---

## Flow 6: Join the newsletter

**Flow id**: `join-the-newsletter`
**Persona**: The Carrier who is not ready to book, and The Returner between
offerings
**Goal**: Get on the list — and, where a document is offered, receive it.

**Screens**:

1. `subscribe.html` → `subscribe-pending.html` → _(email, out of band)_ → `subscribe-confirmed.html` → `document-download.html`
2. Side path from the form: `subscribe.html` → `privacy-notice.html` → back

Entry: the Crown beat of `home.html`, the site footer, the empty state of any
index screen, or a named subscribe form offering a specific Document.

**Notes**:

- **Double opt-in is structural, not a setting** (§5, §14). Three screens, one
  email hop, and a legal position at each step:
  - `subscribe.html` — submits an address. The address becomes `pending`. It is
    **not** on the list.
  - `subscribe-pending.html` — says "check your email" and says plainly that
    **nothing has been joined yet**. This screen's whole job is to not lie.
  - `subscribe-confirmed.html` — the clicked confirmation. **This** is where a
    Subscriber becomes mailable, and where an attached Document is delivered.
- **The Document is delivered at confirm, never at submit.** A document handed
  over on `subscribe-pending.html` would let anyone take it without confirming
  and would destroy the consent evidence the double opt-in exists to produce.
- The consent checkbox is **unticked by default**, unbundled, and carries its
  own plain wording naming what will be sent and roughly how often (§14). A
  pre-ticked box is not consent. Submission is blocked until it is ticked, and
  the block is explained.
- **`subscribe-pending.html` offers no resend.** §13: an unconfirmed address
  receives exactly one email and nothing else, ever. A "didn't get it? send
  again" button is the obvious UX instinct here and it is forbidden by the
  threat model — the abuse case is signing someone else up.
- **Enumeration is not possible** (§13). Submitting an address that is already
  subscribed returns the **same** response as a new one. There is no
  "you're already subscribed" state on `subscribe.html`, and a builder adding
  one helpfully is introducing a vulnerability.
- Where a Document is attached, the page must state plainly that subscribing is
  how the document arrives and that they can leave at any time (§14).
- **`/subscribe/[formSlug]` is the SAME screen, not a second one** (§10). The
  named forms of §12 are one screen with different framing copy and, optionally,
  an attached Document; bare `/subscribe` is the default form. One screen, two
  routes — do not build a second template.
- The consent wording links to `privacy-notice.html`, which states the newsletter
  purpose separately from the booking purpose (§14) — different lawful bases, and
  the visitor should be able to see that they are different.

**States** (`subscribe.html`): populated (no document) · populated (document
offered — states what will be sent and on what terms) · consent-not-given
(submit blocked, explained) · validation error · rate-limited (§13 says harder
than the booking form) · error · success → always routes to
`subscribe-pending.html`, identically for a new and an already-subscribed
address.

**States** (`subscribe-pending.html`): populated ("nothing has been joined
yet") · direct arrival with no submission in session (same words, no leaked
address) · **no resend affordance, by design**.

**States** (`subscribe-confirmed.html`):

| State                    | What it is                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| confirmed                | First use of a valid token. The subscription is live; where a Document was attached it is delivered here **as well as** by email.                                                                      |
| **already-confirmed**    | Tokens are single-use (§13). A second click — from a re-opened email or a mail-client prefetch — must land calmly on "you're already on the list", not on an error, and must still offer the Document. |
| **expired-token**        | Confirmation tokens expire (§13). Explain it, and route back to `subscribe.html` for a **fresh opt-in** — not an undelete, not a resend.                                                               |
| invalid / unknown token  | Tampered or truncated link. Same calm treatment; no detail about why.                                                                                                                                  |
| document-delivery-failed | The subscription still stands. Say so, and give the download route rather than implying the whole thing failed.                                                                                        |
| error                    | Server failure during confirmation. The visitor must be able to tell whether they are on the list; if the system cannot tell, it says so.                                                              |

---

## Flow 7: Retrieve a document

**Flow id**: `retrieve-a-document`
**Persona**: Existing Subscriber (subscriber-only files) and any visitor
(public files)
**Goal**: Get the PDF.

**Screens**:

1. `subscribe-confirmed.html` → `document-download.html`
2. _(link in a sent issue, out of band)_ → `document-download.html`

**Notes**:

- **A Document is not a page** (§5). `document-download.html` is a download
  route with the thinnest possible surface — a title, a description, and the
  file. It does not get a designed content page.
- **Public documents download directly.** `subscribers-only` documents require
  a **signed, short-lived link** (§9, §13) — enforced by signature, never by
  obscurity.
- §13: PDFs are stored outside the web root and served through an application
  route with an explicit `Content-Disposition` and a non-executable content
  type, never rendered inline from a same-origin path.

**States** (`document-download.html`):

| State                        | What it is                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| public, available            | Downloads directly. The page is the fallback if the download does not start.                                                                                                   |
| subscriber-only, valid       | Signature verified, inside its window. Downloads.                                                                                                                              |
| **expired signed link**      | **Required by §11.** The commonest real case — the link came from an issue read a week later. Fail closed, explain what happened in one sentence, and say what to do about it. |
| invalid / tampered signature | Fail closed. Same treatment, no diagnostic detail.                                                                                                                             |
| not-found / withdrawn        | The owner deleted the Document. §11's admin reference view exists to prevent this, but the public route must still survive it.                                                 |
| loading                      | Large PDF; the browser has taken the request but nothing has visibly happened.                                                                                                 |
| error                        | Storage unreachable. Route to `contact.html`.                                                                                                                                  |

---

## Flow 8: Leave the list

**Flow id**: `leave-the-list`
**Persona**: Existing Subscriber
**Goal**: Stop receiving the newsletter. Immediately, with no account and no
conversation.

**Screens**:

1. _(one-click link in any issue, out of band)_ → `unsubscribe.html`

**Notes**:

- **The work is already done on arrival.** §11 is unambiguous: one click from
  the link in any issue, no login, no questionnaire, no "are you sure" beyond a
  single confirmation of what happened. **The primary action of this screen is
  effectively none** — it is a confirmation of a completed act, and every
  instinct to add a retention step, a reason-code picker, or a "manage your
  preferences instead?" offer is a PECR problem as well as a design one.
- Unsubscribe tokens are per-subscriber, signed, and **do not expire** (§13) —
  a two-year-old issue must still unsubscribe correctly. So `unsubscribe.html`
  has **no expired-token state**, which distinguishes it from
  `subscribe-confirmed.html`. Invalid/tampered is the only token failure here.
- The token authorises exactly one action — removal — and never exposes or
  mutates anything else. The screen must not display the subscriber's address,
  their name, or anything else the token could be used to harvest.
- Unsubscribing from the newsletter **must never** suppress transactional
  booking email (§5). The screen should not imply it has.

**States** (`unsubscribe.html`):

| State                   | What it is                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **done-on-arrival**     | The primary state. Removal already happened; the page confirms it in one sentence.                                                                                                                         |
| already-unsubscribed    | A second click on the same link. Identical calm confirmation — not an error, not a re-subscribe offer.                                                                                                     |
| invalid token           | Signature fails. Say what to do (reply to the issue, or use `contact.html`); do not reveal whether the address exists.                                                                                     |
| **error**               | The removal genuinely failed. This one is legally load-bearing: the page **must say so** and give a human route. A page that claims success while the removal failed is the worst outcome on this surface. |
| no state: expired token | Deliberately absent — these tokens do not expire (§13).                                                                                                                                                    |

---

## Coverage

Total screens in platform slice: 17
Screens in flows: 17
Coverage: 100%

| Screen                      | Flows            |
| --------------------------- | ---------------- |
| `home.html`                 | 1, 2, 3, 4, 5, 6 |
| `services-index.html`       | 1, 2             |
| `service-detail.html`       | 1, 2             |
| `workshops-index.html`      | 3                |
| `workshop-detail.html`      | 3                |
| `courses-index.html`        | 4                |
| `course-detail.html`        | 4                |
| `about.html`                | 1, 5             |
| `contact.html`              | 5                |
| `privacy-notice.html`       | 2, 3, 4, 6       |
| `booking-request.html`      | 2, 3, 4          |
| `booking-confirmation.html` | 2, 3, 4          |
| `subscribe.html`            | 6                |
| `subscribe-pending.html`    | 6                |
| `subscribe-confirmed.html`  | 6, 7             |
| `unsubscribe.html`          | 8                |
| `document-download.html`    | 6, 7             |

## Orphaned Screens

None — full coverage achieved.

## Open Questions

Three of the four questions raised in the first pass were answered by a brief
amendment on 2026-08-06. They are recorded here as **resolved** rather than
deleted, so a downstream reader can see what changed and why.

- **RESOLVED — the privacy notice now has a route and a screen.** §10 adds
  `/privacy` and §11 adds **privacy-notice**: what is collected, why, how long it
  is kept, who it is shared with, and how to request erasure, for the booking
  purpose and the newsletter purpose **separately**, linked from the footer and
  from both forms. §11's own constraint on it — "Plain prose, not a legal wall —
  the audience is a nervous 50-year-old, not a regulator" — is a design
  instruction, not a disclaimer, and belongs in the direction brief. Carried here
  as `privacy-notice.html`, surface `marketing`, section `practice`, in flows 2,
  3, 4 and 6.
- **RESOLVED — `/book/thanks` is now `/book/thanks/[ref]`.** `ref` is an
  unguessable, non-sequential reference on the BookingRequest; the page is
  `noindex` and no-store and shows the visitor their own submission and nothing
  else. That closes the gap between §11's "the held time stated plainly" and a
  cached, parameterless route. The direct-arrival state stays modelled — an
  unknown, stale or guessed `ref` must fail closed and leak nothing, because an
  enumerable confirmation page would expose other people's names and times.
- **RESOLVED — `/subscribe/[formSlug]` is one screen, not many.** Same screen,
  different framing copy, optionally an attached Document; bare `/subscribe` is
  the default form. Modelled as the single `subscribe` screen serving both
  routes. One note for downstream: `screens.json`'s `routePattern` is a single
  string, so it holds `/subscribe` and the `/subscribe/:formSlug` variant is
  recorded in that screen's `description`. The schema cannot carry two — that is
  a schema limit, not a modelling choice, and the second route is real.

<!-- NEEDS CLARIFICATION: navigation pattern for the public header is not specified anywhere in the brief — §10 gives routes only. Inferred as a persistent top header carrying the five public destinations (services / workshops / courses / about / contact) plus one request-a-place CTA, collapsing to a drawer at small widths, over a site footer carrying contact details, social links, the newsletter route and the privacy-notice link §14 requires. Source: the common shape across the researched set (Blossom Reiki, Omnes Healing, Re:Mind Studio) — see competitors.md "UX Patterns in This Category". The header on `home.html` is modelled as transparent over the Root beat; that is an inference from §11's "the whole proposition in one scroll", not a brief mandate. Left open deliberately — composition is the designer's decision at Gate 2, not the brief's. -->
