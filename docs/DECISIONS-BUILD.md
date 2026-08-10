# Build decisions — thefieldwork

Decisions taken during the interactive build, after Mode A design completed.
These SUPERSEDE the design artifacts where they conflict.

---

## D-1 · The build is interactive, not automated (2026-08-10)

The app is built here by prompt, not through the factory's Mode B feature-graph
build or `/fix-bugs` loop.

**Consequence:** `docs/screens/**/*.html` are a **visual reference**, not a
parity target. Nothing runs `parity-verify` against them, so the built app is
free to diverge where the build finds something better. They remain the record
of what the operator approved at Gate 4, and the source of the copy.

The design-time state galleries at the foot of most screens ("— the other
states") are a review device and **never ship**. See D-2 for the one that
would have been actively harmful.

---

## D-2 · The portal CMS is an EDITABLE PAGE, not a form of named boxes (2026-08-10)

**Operator decision, verbatim:** _"I think how we do the cms in the portal will
be an editable page so she can change text and images in the homepage itself
rather than in boxes with names it in"._

She edits the home page **on the home page** — click a heading, change it; click
an image, swap it. Not a separate admin form listing "Root · eyebrow / heading /
body" fields she has to mentally map back onto the live page.

**This supersedes `docs/screens/admin/admin-landing-sections.html`**, which is
precisely the rejected pattern: seven `BeatEditorCard` panels of labelled
eyebrow/heading/body inputs. That screen was well-executed — it scored a craft
pass, and its constraint-as-design framing (no add, no delete, no reorder) was
right. The rejected part is only the _editing surface_, not the constraints.

**What carries over from that screen and must survive:**

- The seven beats are FIXED. No add, no delete, no reorder. §5 "The admin is
  not a CMS. Configurable content, fixed design."
- Beats 2–6 can be hidden; beats 1 and 7 are structural and always visible.
- Draft and published are separate records of the same shape (§7). Editing
  writes the draft; publishing copies draft → published.
- One publish action covering everything pending, with the pending set itemised
  before the irreversible control.
- No styling controls anywhere. §12 "her branding is the template, not an
  option." In-place editing must NOT become a rich-text toolbar — the editable
  targets are the specific text and image slots, nothing else.

**Shape to build:** the real home page rendered in an `editing` mode behind the
admin session, with `contentEditable`-style affordances on the defined slots and
a media picker on the defined image slots. A persistent publish bar. What she
sees while editing is the page itself, at its real width, in its real type.

**Why it is better here:** the seven beats are a narrative that only makes sense
in order and in place. A form of named boxes asks a non-technical practitioner
to hold a mapping between "Throat · body" and the paragraph she can picture.
Editing in place removes the mapping entirely.

**Open questions for when the portal is built:**

- Mobile editing — in-place editing on a phone is hard. Is the portal
  desktop-first? (She is the only user; the answer is probably yes.)
- How the products block (between beats 6 and 7) behaves in editing mode — it
  is derived data, not editable content, and must read as such.

---

## D-3 · Everything on the home page is content, not code (2026-08-10)

**Operator note:** the images, text and headings on the home page will all be
editable in the portal.

**Consequence for the homepage build:** every string and every image slot on the
home page is a **content value with a seeded default**, not a hardcoded literal.
The first build may render from a typed seed module rather than the database,
but the shape must be content-shaped from the start — a keyed record per beat
carrying its eyebrow, heading, body, link label/target and image reference.

Retrofitting this after hardcoding the copy means touching every beat twice.

**What is NOT editable** (fixed by §12 / the direction): layout, type scale,
palette, the alternating plate/pool composition, the shape law (zero radius,
zero shadow), and the beat order.

---

## D-4 · Hosting, storage and accounts (2026-08-10)

Set up by the operator, in Marianne's name:

| Concern                             | Service                                    |
| ----------------------------------- | ------------------------------------------ |
| Hosting + Postgres + object storage | **Replit**                                 |
| Email (transactional + broadcast)   | **Resend**                                 |
| Domain + mailbox                    | **GoDaddy**                                |
| Payments                            | **Stripe**                                 |
| Code                                | **GitHub** — `mariannewillis/thefieldwork` |

**Replit deployment must be a Reserved VM, not Autoscale.** Next's ISR cache is
per-instance; on Autoscale a published change appears on some requests and not
others, and the cache resets on scale events.

**SPF collision warning.** GoDaddy already publishes an SPF record for the
mailbox. A domain may have only ONE SPF record — adding Resend's as a second
makes BOTH fail. Send from a subdomain (`mail.thefieldwork.co.uk`) with
`Reply-To:` her GoDaddy address, so the apex record is never touched.

---

## D-5 · Payments are IN scope (2026-08-10)

**Operator decision:** _"I dont know why we ever put that payments were out of
scope - we are delivering a one time product to marianne"._

The brief's §12 "explicitly out of scope for v1", §13 "there is no payment data
anywhere in v1" and §19's milestone staging are **superseded**. Stripe access is
set up.

The design already anticipated this — `course-detail` carries a deposit/balance
block, `admin-dashboard` carries balance and refund triage, and the privacy
notice names Stripe as the processor. Those stop being scope leaks and become
the spec.

**Still undecided, needed before the booking flow is built:**

1. `booking-request` (`/book/:kind/:slug`) is the shared form for all three
   kinds and currently has NO payment step, stating "Nothing is charged" —
   while `course-detail` promises "a £120 deposit holds one of the six places".
   Services genuinely do not need payment at booking; courses do.
2. **Workshops have no stated payment model at all** — priced £35–95 with no
   mention of deposit, pay-in-full or pay-later.

---

## D-6 · Image assets are optimised at build time (2026-08-10)

The 14 generated brand images totalled **106 MB**, averaging 6.7 MB each with a
9.2 MB hero — a page that would not load on mobile data.

`scripts/_tmp-optimise-assets.mjs` emits AVIF + WebP + JPEG at 2400px and
1200px into `app/public/media/`. **106 MB → 5.3 MB, a 95% reduction**; a page
load fetching every image once as AVIF is under 1 MB.

Originals stay under `assets/images/new/` as masters and are NOT served.

**This same treatment must apply to HER uploads** — §13 already requires it
("images are re-encoded on the server rather than stored as received"). The
media module runs the identical pipeline, plus the palette treatment.
