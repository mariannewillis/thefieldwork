# User Flows — admin

The private, single-owner surface. One user, one account, no registration, no
roles, no team. Every flow below is a TASK the practitioner performs, timed
against brief §15's owner-independence bar: publish a workshop in under 5
minutes, change a paragraph and a picture in under 3, block a personal
afternoon in under 30 seconds, write and send an issue in under 15 — unaided,
without documentation, the first time she tries.

Two constraints from brief §6 govern every flow and are not repeated in each
one: **she must never have to understand a concept before she can do a task**,
and **she must never lose work because she didn't know she had to save.** Where
a flow's design decision exists only to satisfy one of those, the note says so.

Day one, this product is entirely empty. Zero offerings, zero bookings, zero
subscribers, zero documents, zero uploaded images, an empty calendar. The empty
states are not a fallback branch — they are the first-run experience, and they
are most of what she will see in week one.

**Three admin routes are ungated** — `/admin/login`, `/admin/forgot-password`
and `/admin/reset-password/[token]`. Everything else under `/admin` is behind
the owner session, enforced server-side per route (§13).

---

## Flow 1: First sign-in and first-run setup

**Flow id**: `first-run-setup`
**Persona**: The Practitioner (Owner), day one
**Goal**: get from a seeded account to a site carrying her details, her working
pattern and her words — without her having to know what any of those things are
called.

**Screens**:

1. `admin-login.html` → `admin-dashboard.html` (day-one empty) → `admin-settings.html` → `admin-availability.html` → `admin-media.html` → `admin-landing-sections.html` → publish

**Notes**:

- The dashboard is the first screen she ever sees and it has nothing on it. Its
  empty state IS the first-run screen: an ordered, short setup list — tell
  people how to reach you · say when you work · put your first thing up — each
  item linking to the screen that does it and ticking itself off when it is
  done. An empty table with column headers would be a failure here.
- There is no sign-up screen and there must never be one. The account is seeded
  (§13: no public registration endpoint exists). `admin-login.html` carries
  exactly one route out — "forgotten your password" → `admin-forgot-password.html`
  (flow 12) — and nothing else.
- The seven landing beats arrive **pre-seeded** with launch copy (§9: the seven
  keys are seeded and cannot be created or destroyed through the API). Day one
  is therefore an EDIT task, never a blank-page task — she never faces seven
  empty boxes and has to invent a website.
- The media library is likewise never empty on day one: the six supplied plates
  are already in it (§12).
- Availability ships with plausible defaults (§20 Q6) explicitly labelled as
  defaults she may change, not as a decision already made on her behalf.
- Nothing prompts her to publish until there is something to publish. The
  publish control is present but quiet while draft and published are identical.

---

## Flow 2: Publish a workshop with a date and a price

**Flow id**: `publish-a-workshop`
**Persona**: The Practitioner (Owner)
**Goal**: a dated, priced workshop live on the public site and blocking her own
calendar — in under 5 minutes, with no second edit anywhere. This is the §15
headline task.

**Screens**:

1. `admin-dashboard.html` → `admin-offerings.html` → `admin-offering-edit.html` (new · kind = workshop) → `admin-media.html` (choose a plate or upload; alt text required before use) → `admin-offering-edit.html` (save · set active) → `admin-calendar.html` (the derived block is now on the date)

**Notes**:

- **Kind is chosen once, at create,** and is the first decision on the screen
  because it changes every field beneath it — a Service has a duration, a
  Workshop has a date, a time, a venue and a capacity, a Course has Sessions.
  Changing kind after save is not offered; creating the right kind is.
- **`active` IS live.** There is no separate publish step for offerings.
  §12's draft → preview → publish governs the seven landing beats and site
  settings (the `content` module, §9) — not the offering catalogue, which the
  `offerings` module owns with an active flag. The control says which of the
  two models it is, in plain words, on the screen, because she cannot be
  expected to carry two mental models she was never told about.
- Setting active writes a **derived session TimeBlock** (§5). She is never
  asked to block her own event. The final calendar step in this flow exists
  only so she SEES that it happened — it is confirmation, not an action.
  Editing the date moves the block; deactivating or deleting removes it.
- Price is per Offering, always; no price is hard-coded anywhere (§12). An
  offering cannot go active without one, and the error names the missing field
  in her language, not "validation failed".
- Capacity is **information, never a live seat count** (§5). The field is
  labelled to say so, because "20 places" and "20 places left" are different
  promises and only one of them is one the system can keep in v1.
- Overflow: `admin-offerings` filters by kind and by active/inactive rather
  than paginating. She will have tens of records over years, not thousands.

---

## Flow 3: Build a course out of its sessions

**Flow id**: `build-a-course`
**Persona**: The Practitioner (Owner)
**Goal**: sell a fixed series of dates as ONE purchase.

**Screens**:

1. `admin-offerings.html` → `admin-offering-edit.html` (kind = course · add Sessions inline · order them · save · set active) → `admin-calendar.html` (one derived block per Session)

**Notes**:

- **A Course is not a Workshop repeated** (§5), and this is the single most
  likely mental-model error in the whole admin. The editor says it once, in
  plain words, at the moment she adds the second session: she is describing one
  thing that meets six times, not six things.
- Sessions are added and ordered inline. A Course cannot be made active with
  zero Sessions (§9 validation), and out-of-order dates are re-sorted with a
  visible note rather than rejected with an error.
- **Each Session derives its own calendar block.** Six sessions produce six
  blocks. Deleting the Course removes all six at once.
- **A Session is never separately bookable** (§5). There is no "publish this
  session" control anywhere on the screen — the absence is the clearest way to
  say it, and a disabled control would say the opposite.
- Destructive guard: deleting a Course that already has booking requests
  against it names **how many** and what becomes of them before the delete
  becomes live. Deactivating is offered first, in the same guard, because it is
  almost always what she actually means.

---

## Flow 4: Change a paragraph and a picture on the home page

**Flow id**: `edit-and-publish-a-beat`
**Persona**: The Practitioner (Owner)
**Goal**: change one beat's words and its image and get it live — in under 3
minutes (§15), with certainty at every moment about whether the public can see
it yet.

**Screens**:

1. `admin-dashboard.html` → `admin-landing-sections.html` (open beat 4) → `admin-media.html` (swap the picture) → `admin-landing-sections.html` (unpublished-changes state) → **preview at `/preview/[token]`** (new tab) → `admin-landing-sections.html` → publish confirmation → published

**Notes**:

- **Preview is a real route: `/preview/[token]`** — signed, short-lived,
  issued by the owner session, `noindex`, and rendering the REAL public home
  page from draft content. It is deliberately the public route's own renderer
  rather than a second implementation, because a preview that is not the real
  page is not a preview. It is not an admin screen and is not counted in this
  slice; the renderer belongs to the webapp platform slice's `home` screen.
- **Seven fixed beats, seven groups, fixed ascending order.** No add, no
  delete, no reorder, no styling controls (§5) — and no disabled versions of
  those controls either. Their absence is the design; a greyed-out "add
  section" button would invite her to look for the way to enable it.
- Beats 2–6 carry a visibility toggle. **Beats 1 and 7 do not**, and the screen
  says why in one line rather than showing a dead switch: a page with no
  reassurance and no way to get in touch is not a page.
- Three beats (3, 6, 7) have a link label and target. The other four have no
  link fields at all, rather than empty ones she has to ignore.
- **Draft versus published is the whole model.** Edits are never live. The
  screen states which of the two she is looking at at all times, and the
  unpublished-changes state is unmissable and **names which beats changed** —
  not just that something did.
- **One publish, one scope.** The seven landing beats and SiteSettings share a
  SINGLE draft/published pair (§9's `content` module owns both). One publish
  makes everything pending go live. The reason is concrete: two independent
  publish buttons would let her ship a beat referencing a phone number she
  hasn't published yet. So the confirmation **itemises across both** — the
  beats that changed AND the settings that changed — in one list, before she
  commits. The global unpublished-changes indicator counts both, on every
  screen, including `admin-settings.html`.
- Autosave to draft, with the save state visible constantly. §6's stated
  failure mode is losing work because she didn't know she had to save; the
  answer is that on this screen she never has to.
- Leaving with unsaved keystrokes in flight is impossible. Leaving with
  UNPUBLISHED draft changes is normal, expected, and must not nag — that
  distinction is the difference between a tool she trusts and one she dreads.
- A short, permanent, non-dismissible inline reminder sits where copy is
  written (§14 requires it): describe what happens and what people report; do
  not promise to treat, cure or relieve a named condition. One line, always
  there, never a modal.
- Publish is **one button with one confirmation** — not a workflow (§12).

---

## Flow 5: Block out a personal afternoon

**Flow id**: `block-personal-time`
**Persona**: The Practitioner (Owner)
**Goal**: make Thursday afternoon disappear from what visitors can ask for — in
one gesture, in under 30 seconds (§15), without leaving the calendar.

**Screens**:

1. `admin-calendar.html` (week view · drag Thu 14:00–18:00 · name it · done)

**Branch — a derived block she cannot edit here**:

2. `admin-calendar.html` → tap a workshop or course-session block → explainer names its Offering → `admin-offering-edit.html`

**Notes**:

- The primary action happens **in place**. No navigation, no separate "new
  block" screen, and no modal that covers the calendar it is about. 30 seconds
  is a gesture budget, not a page-load budget.
- **Four visually distinct kinds on one grid**: confirmed service bookings ·
  pending holds (carrying their time remaining) · derived workshop and course
  session blocks · personal blocks. **Free time reads as free** — it is the
  only thing on the grid with nothing on it, and that legibility is the entire
  point of the screen.
- **A derived block is not editable here and never pretends to be.** Tapping
  one explains where it came from, names the Workshop or Course Session that
  generated it, and offers to open the Offering. §5 is explicit: the calendar
  "should say so rather than silently refusing." A greyed block that does
  nothing on tap is the failure this note exists to prevent.
- The personal block's label is **personal data** (§13) and can be intimate —
  "hospital", "funeral". It never reaches a public surface; the public
  availability response says unavailable and never says why. The naming field
  carries that reassurance where she is typing it.
- **Empty state** — a brand-new practitioner's calendar carries her
  availability pattern and nothing else. That is a designed, legitimate state:
  it must read as "you're open, nobody has asked yet", never as a broken
  screen, and it offers the one action available from it (block time) plus a
  route to publishing her first offering.
- **Dense state** — a fully booked week has to stay legible with four block
  kinds and overlaps. Month view collapses to per-day counts that keep kind
  legible; a day opens into the week.
- **Expired hold** — a hold that has run out is drawn as _released_, not as
  booked, and its slot is publicly available again the moment it expires
  (§13: expired by a scheduled job, not on read). A day carrying an expired
  hold shows what happened rather than quietly dropping it.
- One declared timezone, Europe/London, everywhere (§9). No timezone picker. A
  DST-boundary week is the canonical failure of this module and the grid has to
  be right across it in both directions.

---

## Flow 6: Triage a booking request

**Flow id**: `triage-a-booking`
**Persona**: The Practitioner (Owner)
**Goal**: decide on a request before its hold runs out, and have the calendar
be true either way.

**Screens**:

1. `admin-dashboard.html` (holds nearest expiry first) → `admin-bookings.html` → confirm → `admin-calendar.html` (now a confirmed booking)

**Branch — decline**:

2. `admin-bookings.html` → decline → the slot returns to the public picker immediately

**Notes**:

- **A BookingRequest is not a booking** (§5). Nothing is paid and nothing is
  promised. The queue's language is "asked for a place", never "booked".
- Every service request shows the held slot **and the time left on the hold**.
  Time remaining decides her order of work, so it is the one thing on a row
  that has to be legible without being read.
- **Confirming converts the hold into a confirmed booking on the calendar.
  Declining releases the slot immediately.** The screen says which of those it
  is about to do before she commits.
- **Expired** — a hold that ran out while she was deciding is shown as expired
  with its slot already released. It is neither silently deleted nor still
  confirmable: the only action offered is "ask her for a new time", never a
  silent re-grab of a slot another visitor may now be holding.
- Workshop and course requests have no slot and no hold — capacity is displayed
  and never enforced (§5) — so those rows carry the event's own date and offer
  no slot controls at all.
- The visitor's message is displayed in full and treated as **untrusted text**
  (§13). Never rendered as markup.
- Retention: she needs a way to delete a single request on request (§14). It
  lives here, guarded, and it is a real delete.
- **Empty** — zero requests is the normal state of a new practice for weeks. It
  says so without alarm and points at what generates requests (publish an
  offering; send an issue) rather than showing an empty table.
- **Overflow** — after months the queue filters by status. Pending is the
  default view, because pending is the only status carrying a deadline.

---

## Flow 7: Set the working pattern and the timing rules

**Flow id**: `set-the-working-pattern`
**Persona**: The Practitioner (Owner)
**Goal**: describe when she works ONCE, so the calendar can compute free time
forever.

**Screens**:

1. `admin-dashboard.html` → `admin-availability.html` (weekdays · hours · buffer · minimum lead time · booking horizon · save) → `admin-calendar.html` (free time redrawn)
2. `admin-settings.html` (hold duration) → `admin-calendar.html`

**Notes**:

- **Availability is subtraction, not a list** (§5). This screen is the base
  layer everything else is taken away from. There is no second place free slots
  live and no way for two places to disagree — the screen says that in one
  line, because it is the difference between this and every tool she has used.
- **`admin-availability` owns buffer, minimum lead time and booking horizon**
  outright, and the brief now says so explicitly: they are scheduling inputs,
  they belong beside the pattern they modify, and two screens owning one value
  is how two disagreeing values happen. `admin-settings` owns **hold duration
  only** of the timing rules.
- Deliberately separate from the calendar because it is set rarely and changing
  it by accident would be expensive (§11). **This is the one screen in the
  admin that does not autosave**, and it says why — the explicit save is the
  safety, not an oversight.
- Saving reports the change in **consequences, not settings**: "Tuesday
  afternoons are now bookable. Nothing else changed."
- **Guard** — narrowing hours that already contain a confirmed booking does not
  silently orphan it. The affected booking is named, and she is told it stays
  and simply sits outside the new pattern. The system never cancels on her
  behalf.
- Hold duration is stated on `admin-settings.html` as a trade — her response
  time against a visitor's patience — because 48 hours is a guess (§20 Q7) and
  she will want to move it after a fortnight, needing to know which way.

---

## Flow 8: Write and send an issue

**Flow id**: `write-and-send-an-issue`
**Persona**: The Practitioner (Owner)
**Goal**: write something, be sure it is right, and send it to the people who
actually said yes — in under 15 minutes (§15).

**Screens**:

1. `admin-dashboard.html` → `admin-newsletters.html` → `admin-newsletter-edit.html` (subject · preheader · blocks) → `admin-documents.html` (attach a PDF) → `admin-newsletter-edit.html` → **test send to herself** → **send guard naming the exact recipient count** → `admin-newsletters.html` (sent, with the number it went to)
2. `admin-subscribers.html` (the confirmed count she is about to reach)

**Notes**:

- **Her branding is the template, not an option** (§12). There are no styling
  controls on this screen — no colour, no type, no layout, and no disabled ones
  either. Logo, palette, type, footer, sender identity and the one-click
  unsubscribe link are applied to every issue and cannot be edited out. That is
  precisely what makes it impossible for her to send something off-brand or
  non-compliant.
- The body is built from a **small fixed block set**: paragraph, heading,
  image, button, and an upcoming-offerings block that pulls live dates in at
  send time. The upcoming-offerings block shows what it currently contains, so
  she is never sending a surprise she cannot see.
- **Test send and Send are two distinct states of the same screen and must not
  look alike.** Test send is repeatable, reversible and unguarded, and it comes
  first in the layout because it comes first in the task.
- **The send guard names the EXACT recipient count and says the word
  irreversible BEFORE she commits, not after** (§11). The count is **confirmed
  subscribers only** — never the pending ones (§5, §14). It matches the
  confirmed figure on `admin-subscribers.html` exactly; if those two numbers
  can ever disagree, one of them is a lie with legal consequences.
- Suppressed addresses — unsubscribed or bounced — are never in the count and
  never in the send, by any code path (§9).
- **Sending** is a real state, not a spinner over a dead screen: batched
  progress, and it cannot be double-fired.
- **Sent issues are read-only forever.** The copy in someone's inbox cannot be
  edited, so neither can the record of it.
- **Empty** — zero issues ever written. The list says what an issue is for and
  offers exactly one action.
- **Error** — a send that fails part-way names how many went and what happens
  next. The one thing it must never do is imply that trying again is free.

---

## Flow 9: Look after the list

**Flow id**: `look-after-the-list`
**Persona**: The Practitioner (Owner)
**Goal**: know who is actually on the list, and take someone off when they ask
her by email.

**Screens**:

1. `admin-dashboard.html` → `admin-subscribers.html` (confirmed and pending as separate counts · search · manual unsubscribe · CSV export)

**Notes**:

- **Confirmed and pending are two counts, never summed** (§11). Only the
  confirmed number is the audience, and it is the number the send guard in
  flow 8 uses. A single "214 subscribers" figure would be a comfortable lie.
- **A subscriber is not confirmed until they confirm** (§5). Pending rows say
  what is true: one confirmation request was sent and nothing else ever will
  be, unless they click it.
- **No bulk import in v1, at all** (§14) — and no disabled import control
  either. The screen carries one plain line saying an existing list has to be
  invited to opt in rather than added, because she will look for the button.
- **Manual unsubscribe is a suppression, not a delete.** The record stays so
  the objection can be honoured forever (§14), and the screen says that in one
  line rather than implying she has erased a person.
- Source and joined date appear on every row because they **are the consent
  evidence** (§14) — not analytics.
- CSV export states what it contains before it downloads.
- **Empty** — zero subscribers is the day-one state. The honest thing to say is
  where subscribers come from: the public subscribe form, and the document
  offer, with a route to the document library.
- **Overflow** — search first, status filter second. Never an infinite scroll
  she can lose her place in.

---

## Flow 10: Publish and retire a document

**Flow id**: `publish-and-retire-a-document`
**Persona**: The Practitioner (Owner)
**Goal**: put a PDF somewhere it can be attached or offered — and later remove
one without breaking anything she has already sent.

**Screens**:

1. `admin-documents.html` (upload · title · description · visibility) → attached from `admin-newsletter-edit.html` or offered with a subscribe form
2. `admin-documents.html` (reference view) → delete guard → `admin-newsletters.html` (the issue that references it)

**Notes**:

- Every document shows **which newsletters and which subscribe forms reference
  it**, in plain words, so she can see what would break before deleting (§11).
  That is this screen's actual job; upload is the easy half.
- **Deleting a PDF that a SENT newsletter references is the guarded case.** The
  guard names the issue and its date. A link in an inbox cannot be repaired by
  an apology, and the copy says that instead of asking "are you sure?".
- Visibility is two words, not a permissions model: public downloads directly;
  subscribers-only goes out as a **signed link that expires** (§9, §13). The
  screen says which one this file is and what a recipient will experience.
- Upload validation is real (§13) — content type and magic bytes, size capped.
  A `.pdf` that is not a PDF is rejected with a sentence she can act on.
- **A Document is not a page** (§5). There is no page-design surface here and
  none is implied.
- **Empty** — zero documents, with the one reason she would want one (offer
  something in exchange for a subscription) stated rather than assumed.
- **Error** — a failed upload keeps the metadata she already typed. She retries
  the file, not the form.

---

## Flow 11: Add a picture she took herself

**Flow id**: `add-a-picture`
**Persona**: The Practitioner (Owner)
**Goal**: get her own photograph into the library and safely onto the site.

**Screens**:

1. `admin-media.html` (upload → processing → alt text → in the library) → used from `admin-landing-sections.html` and `admin-offering-edit.html`

**Notes**:

- The library **opens with the six supplied plates already in it**, marked as
  supplied (§12). The only genuinely empty state here is "nothing you have
  uploaded yet", which is a much smaller and less frightening thing than an
  empty screen.
- **Uploads are auto-processed** — cropped to the target ratio for their slot
  and given the palette treatment (§12) — so one phone snapshot cannot destroy
  the design. Processing is a **visible state with a visible before and after**,
  not a silent rewrite: she has to recognise her own picture afterwards or she
  will not trust the library again.
- **Alt text is required before an image can be used anywhere** (§12). It is a
  gate, and the gate explains itself in one line — this is what someone hears
  when they cannot see the picture — because otherwise it is an inexplicable
  obstacle between her and a task she thought was finished.
- `aura-hands-between` is present but marked **reserve** (§2 and the asset
  inventory): it is the category's most-reproduced composition and must never
  be offered as a default hero.
- **Error** — a rejected file says which of the three it was: wrong type, too
  big, or corrupt.
- **Overflow** — after a year the library needs search and a supplied/uploaded
  filter. Not folders.

---

## Flow 12: Get back in after forgetting the password

**Flow id**: `recover-the-password`
**Persona**: The Practitioner (Owner), returning after weeks away
**Goal**: get back into her own admin without calling anyone — the failure mode
that actually happens to a sole operator who signs in monthly.

**Screens**:

1. `admin-login.html` → `admin-forgot-password.html` (submit the account address) → **the same acknowledgement is shown whether or not the address matches** → (email) → `admin-reset-password.html` (from the signed link) → new password set → `admin-login.html` → `admin-dashboard.html`

**Branch — the link has expired or has already been used**:

2. `admin-reset-password.html` (expired / used state) → request a new one → `admin-forgot-password.html`

**Notes**:

- **This is a first-class journey, not an error path.** She logs in monthly.
  Forgetting is the expected case, and there is nobody to call — §1 principle 2
  says a capability she cannot operate alone is worse than one that doesn't
  exist, and that applies to getting in as much as to publishing.
- **The identical-response state is deliberate and must be designed as a
  state, not as an error.** Requesting a reset returns the same acknowledgement
  whether or not the address matches an account, so the pair cannot be used to
  confirm the owner's email address (§13 — enumeration is not possible). The
  copy therefore says what was _done_ ("if that address is the one on this
  account, a link is on its way"), never what was _found_. It must not read as
  a failure, because for the real owner it is a success.
- The link is **rate-limited, single-use and short-lived** (§13). All three
  failure modes land on `admin-reset-password.html` and are named separately —
  expired, already used, not valid — because they need different next actions
  and "something went wrong" would leave her stuck.
- Both screens are **necessarily ungated**, along with `/admin/login`. They are
  the only three unauthenticated routes under `/admin`; every other admin route
  stays session-gated server-side (§13).
- The new-password screen states the rule before she types, not after she
  fails, and confirms plainly that she is now signed in or must sign in again.
- No security questions, no secondary factor, no "contact support" — there is
  no support to contact.

---

## Coverage

Total screens in platform slice: 16
Screens in flows: 16
Coverage: 100%

| Screen                   | Flows                   |
| ------------------------ | ----------------------- |
| `admin-login`            | 1, 12                   |
| `admin-forgot-password`  | 12                      |
| `admin-reset-password`   | 12                      |
| `admin-dashboard`        | 1, 2, 4, 6, 7, 8, 9, 12 |
| `admin-calendar`         | 2, 3, 5, 6, 7           |
| `admin-availability`     | 1, 7                    |
| `admin-landing-sections` | 1, 4, 11                |
| `admin-offerings`        | 2, 3                    |
| `admin-offering-edit`    | 2, 3, 5, 11             |
| `admin-bookings`         | 6                       |
| `admin-newsletters`      | 8, 10                   |
| `admin-newsletter-edit`  | 8, 10                   |
| `admin-subscribers`      | 8, 9                    |
| `admin-documents`        | 8, 10                   |
| `admin-media`            | 1, 2, 4, 11             |
| `admin-settings`         | 1, 7                    |

Required-flow checklist from the brief: first-run setup (1) · publish a
workshop (2) · edit and publish a landing beat (4) · block personal time (5) ·
triage a booking (6) · write and send an issue (8). All present, plus password
recovery (12).

## Orphaned Screens

None — full coverage achieved.

---

## Screen State Matrix

State completeness is a requirement, not a branch (`interface-craft-checklist.md`
I-1; brief §16 Definition of Done). Every data surface below enumerates empty /
loading / error / populated / overflow, plus the guards and the unsaved-or-
unpublished state wherever it can occur. Day one, the **empty** column is the
product.

| Screen                   | Empty (day one)                                                                 | Loading                                              | Error                                                                                | Populated                                                     | Overflow                                                     |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `admin-login`            | n/a                                                                             | button pending state                                 | wrong password · **rate-limited** (§13), which says when to try again                | the form + one route out (forgotten password)                 | n/a                                                          |
| `admin-forgot-password`  | n/a                                                                             | button pending state                                 | rate-limited only; a non-matching address is **not** an error (see below)            | one field; **identical acknowledgement either way**           | n/a                                                          |
| `admin-reset-password`   | n/a                                                                             | token being checked                                  | **three named states**: expired · already used · not valid — each with a next action | new password + the rule stated before she types               | n/a                                                          |
| `admin-dashboard`        | **the first-run setup list** — ordered, ticking off, not an empty table         | skeleton rows for requests + upcoming                | data unavailable, with the last known state named                                    | requests first, holds nearest expiry, then what's coming up   | "3 more" per group; never a scrolling wall                   |
| `admin-calendar`         | availability pattern drawn, nothing on it — "you're open, nobody has asked yet" | grid skeleton, week structure already visible        | can't load this week; the previous week stays readable                               | four visually distinct kinds; free reads as free              | densely booked week stays legible; month collapses to counts |
| `admin-availability`     | ships with plausible defaults, labelled as defaults                             | form skeleton                                        | save failed — the typed values are still there                                       | seven weekdays + buffer, lead time, horizon                   | n/a (fixed shape)                                            |
| `admin-landing-sections` | never empty — seven beats seeded with launch copy                               | seven card skeletons in fixed order                  | autosave failed, stated inline, with a retry that keeps the text                     | seven groups; visibility toggles on 2–6 only                  | n/a (exactly seven, forever)                                 |
| `admin-offerings`        | **zero offerings** — says what the three kinds are, one create action           | table skeleton                                       | list unavailable                                                                     | kind + active/inactive + date + price                         | filter by kind and by active, not pagination                 |
| `admin-offering-edit`    | new record: kind picked first, everything else follows                          | form skeleton                                        | field-level, in her language, never "validation failed"                              | fields per kind; Sessions inline for a Course                 | a long Course session list stays orderable                   |
| `admin-bookings`         | **zero requests** — normal for weeks; points at what generates them             | queue skeleton                                       | queue unavailable                                                                    | message in full, held slot, **time left on the hold**         | filter by status; pending is the default                     |
| `admin-newsletters`      | **zero issues** — says what an issue is for, one action                         | list skeleton                                        | list unavailable                                                                     | draft and sent, with date and the number it went to           | year grouping; sent issues are read-only                     |
| `admin-newsletter-edit`  | a new issue: subject, preheader, one empty paragraph block                      | template + block skeleton                            | **partial send failure** — how many went, what happens next                          | blocks on the branded template; test-send state               | many blocks stay reorderable                                 |
| `admin-subscribers`      | **zero subscribers** — says where subscribers come from                         | count skeletons + table skeleton                     | list unavailable                                                                     | **confirmed and pending as separate counts**, never summed    | search first, then status filter                             |
| `admin-documents`        | **zero documents** — states the one reason to have one                          | table skeleton                                       | upload rejected: wrong type / too big / corrupt — metadata kept                      | title, visibility, **what references this file**              | search; reference lists collapse                             |
| `admin-media`            | six supplied plates present; the empty state is "nothing YOU have uploaded"     | tile skeletons; **processing** is its own real state | upload rejected, with which of the three reasons                                     | supplied + uploaded, alt text status visible per tile         | search + supplied/uploaded filter, not folders               |
| `admin-settings`         | seeded with placeholders that are obviously placeholders                        | form skeleton                                        | save failed, values retained                                                         | contact, bio, credentials, socials, background, hold duration | n/a (singleton)                                              |

**The one state that must not be designed as an error**: `admin-forgot-password`
returns the **same acknowledgement whether or not the address matches an
account** (§13, enumeration). For the real owner this is a success; the copy
says what was done, never what was found.

**Unsaved / unpublished states — everywhere they can occur:**

| Surface                   | Model                        | What she must see                                                     |
| ------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `admin-landing-sections`  | autosave draft → publish     | save state always visible; **which beats** have unpublished changes   |
| `admin-settings`          | autosave draft → publish     | **same single publish**; the confirmation itemises beats AND settings |
| `admin-offering-edit`     | explicit save; active = live | unsaved indicator; "active means visitors can see this now"           |
| `admin-newsletter-edit`   | autosave draft               | draft saved; sent is irreversible and separate                        |
| `admin-availability`      | **explicit save only**       | unsaved changes are stated, and leaving warns — deliberately          |
| Shell (all gated screens) | global                       | one unpublished-changes indicator, counting beats + settings together |

**Destructive-action guards:**

| Action                                        | Guard                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Delete an Offering that has booking requests  | names the count; offers deactivate first; delete stays inert until acknowledged  |
| Delete a Course                               | names how many Sessions and how many derived calendar blocks disappear with it   |
| Delete a PDF a **sent** newsletter references | names the issue and its date; states plainly that a sent link cannot be repaired |
| Delete a booking request (retention, §14)     | a real delete; says the visitor's record goes and cannot be recovered            |
| Manual unsubscribe                            | **not** destructive — a suppression; says the record stays so it can be honoured |
| Narrow availability over a confirmed booking  | names the booking; it stays; the system never cancels on her behalf              |
| Send a newsletter                             | exact confirmed-recipient count + the word irreversible, before, not after       |
| Deactivate an Offering with a derived block   | names that the calendar time is about to be given back                           |
| Publish                                       | itemises **everything** pending across beats and settings, in one list           |

---

## Resolved (was: Open Questions)

All five clarifications this worker raised have been answered and `brief.md`
amended. Recorded here so downstream agents read the resolution, not the
question.

1. **Password recovery exists.** `admin-forgot-password` (`/admin/forgot-password`)
   and `admin-reset-password` (`/admin/reset-password/[token]`) are real
   screens — rate-limited, single-use, short-lived signed link to the account
   address, with an identical response whether or not the address matches. Both
   ungated. Flow 12.
2. **Sign-out is a shell action, not a route.** It lives in the header account
   menu; no `/admin/logout` screen exists or should.
3. **`admin-availability` owns buffer, minimum lead time and booking horizon.**
   `admin-settings` owns hold duration only. Reason recorded in flow 7.
4. **Preview is `/preview/[token]`** — signed, short-lived, owner-issued,
   `noindex`, rendering the real public home from draft. The public route's own
   renderer, not a second implementation. Flow 4.
5. **One publish, one scope.** Beats and SiteSettings share a single
   draft/published pair; one publish, one confirmation itemising both. Flow 4.

**Standing note, reviewed and accepted:** the admin shell (persistent left rail

- thin top bar) is INFERRED — `brief.md` §10 gives routes and §11 gives screens
  but specifies no admin chrome. The inference is cited to the tooling half of
  `competitors.md` (Acuity's practitioner console, Mailchimp's campaign builder),
  with its two deliberate brief-grounded departures documented in
  `navigation-schema.md`. Accepted at the analyze gate as inferred-and-cited.
