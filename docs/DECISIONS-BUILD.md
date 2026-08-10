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

## D-7 · Marianne configures her own identity; workshops are paid in full (2026-08-10)

Three answers from the operator, recorded so they aren't re-litigated:

- **Her name is a CMS field, not a constant.** It appears on the site, in the
  portal chrome and in every email, and she can change it herself in Settings
  without anyone touching the code. Nothing hardcodes "Marianne" except the
  placeholder in `src/content/admin-nav.tsx`, which is marked as such and dies
  when authentication lands.
- **Workshops are paid IN FULL at booking.** Courses take a deposit; sessions
  are paid after. Three payment shapes, one checkout — see D-5.
- **Images come in through the portal.** The photographs currently on the site
  are seeded from `assets/`, but from here on Marianne adds and replaces them
  in Pictures. No image is ever added by editing code.

## D-8 · Tailwind is scoped to the portal; the public site stays bespoke (2026-08-10)

The admin screens were composed against Tailwind utilities; the public site was
composed as bespoke CSS. Rather than converting one to the other, each keeps
what it was designed in, and the boundary is enforced by where the stylesheet
is imported: `app/(admin)/admin.css` is imported only by the admin layout, so
Next emits it as a route-scoped chunk that never loads on the site.

This is load-bearing, not tidiness. Tailwind's preflight resets margins the
site's `home.css` depends on, and BOTH stylesheets define a `.pool` class for
different jobs — the site's is a blush hero panel, the portal's is a working
surface. Loaded together, one would silently win.

The two type systems are kept apart the same way. next/font instances in the
admin layout carry `--admin-display` / `--admin-body` / `--admin-mono`, so they
cannot shadow the site's `--font-display` / `--font-body` even if a future
change made both stylesheets load at once.

**Type system, resolved:** Cormorant Garamond + Source Sans 3 + Azeret Mono.
32 of the 33 approved screens use it. `admin-dashboard.html` is the single
screen that drifted to Newsreader + Karla; the majority is canonical and the
outlier was not followed.

## D-9 · The portal shows no state it cannot read (2026-08-10)

The approved admin screens carry three pieces of fabricated status: an "All
changes published" indicator, a "2" badge on Requests, and "session ends 2 Sep"
in the rail. None has a source yet, and the Today greeting was hardcoded to
"Thursday morning" — which contradicted the live clock four inches above it the
moment the portal was opened on a Monday.

None of them shipped. A status light that is green because it is painted green
teaches the owner to stop reading it, and the day she needs it to mean
something is the day it lies to her. Each returns when something real backs it.

The header clock and the Today greeting DO ship, because they read a real
clock. Both are fixed to Europe/London rather than the browser's timezone:
Marianne's diary is in London, and a booking time that shifts when she travels
would be wrong in the one place it must not be.

## D-10 · Admin sign-in (2026-08-10)

One user, one password she owns. Username defaults to `mariannevwillis`
(`ADMIN_USERNAME` overrides), temporary password `test1234`.

**The temporary password cannot be used to run the portal.** Signing in with it
lands on a forced change screen, and every admin page redirects back there
until it is replaced — enforced in the layout, not just after login, so it
cannot be stepped around by typing a URL. An eight-character password that
appears in a handover note is a handover mechanism, not a password; treating it
as one for even a week is how it ends up permanent.

How it is built, and why each part is there:

- **scrypt** (Node's own, no dependency) for hashing, with the cost parameters
  stored inside each hash so they can be raised later without locking her out.
- **Signed session cookie**, httpOnly + secure + sameSite=lax, 12-hour life.
  Stateless, but every token carries a **credential version** that is checked
  against the stored record — so changing the password instantly kills every
  session ever issued, including one on a laptop she no longer has. A stateless
  session without that is a session you cannot revoke.
- **Two gates.** Middleware refuses forged and expired tokens before a page
  renders; the admin layout does the authoritative check, because only it can
  read the credential file and see a revocation. Either alone would do; both
  means removing one by accident is not a breach.
- **One error message** for a wrong username and a wrong password, and both
  checks always run, so neither the wording nor the response time reveals which
  usernames exist.
- **Throttling** — per-caller lockout with doubling backoff, plus a global
  limiter that only ever slows things down, so a flood of deliberate failures
  cannot lock the owner out of her own portal.
- **Password rules**: 12 characters minimum, no composition rules. Length is
  what buys strength; "one capital, one symbol" produces Password1! and is no
  longer recommended by NCSC or NIST.

Verified by `scripts/auth-smoke.mjs` — 22 checks, all passing, including
revocation of a pre-change session, rejection of a tampered signature, refusal
to redirect off-site after sign-in, and lockout after 7 wrong guesses.

**`AUTH_SECRET` is required in production and the app refuses to start without
it.** The tempting alternative — inventing a random secret at boot — signs
everyone out on every restart and nobody ever works out why.

### The open problem: this does not survive a redeploy

The credential is a JSON file. On a Replit Reserved VM that survives restarts,
but a REDEPLOY builds a fresh container — so unless `DATA_DIR` points at
storage that outlives the deployment, changing the password and then
redeploying silently restores `test1234`.

That is a real security hole, not a rough edge, and it is the reason a database
is now the next priority rather than a later one. Until it is fixed, treat
every redeploy as a password reset and check afterwards.

### Still to build

Forgotten-password reset by email (the approved screens exist; it needs Resend
wired first), and the username/password controls on the Settings screen, which
currently only points at this flow.
