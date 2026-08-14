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

Verified by `app/e2e/auth-smoke.mjs` — 22 checks, all passing, including
revocation of a pre-change session, rejection of a tampered signature, refusal
to redirect off-site after sign-in, and lockout after 7 wrong guesses.

**`AUTH_SECRET` is required in production and the app refuses to start without
it.** The tempting alternative — inventing a random secret at boot — signs
everyone out on every restart and nobody ever works out why.

### The open problem: this does not survive a redeploy — CLOSED by D-11

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

## D-11 · The database is Postgres, inside Replit (2026-08-10)

The admin credential moves from a JSON file to Postgres, via Prisma. This
closes the hole left open in D-10: a Replit redeploy rebuilds the container, so
a file-backed password was silently restored to `test1234` every time the site
was published.

**Contained in Replit — no outside provider.** The architect had specified Neon
in London (`docs/_architect-decisions.json`), chosen when the deploy target was
Vercel. The operator's call supersedes it: production uses Replit's own
Postgres, so there is one account, one bill, and one thing for Marianne to own.
Portability is preserved anyway — it is plain Postgres, `pg_dump` moves it, and
the schema lives in this repo rather than in the host.

**Local and production are separate databases sharing one schema.** Development
runs a Postgres on the developer's machine; production runs Replit's. They
share migrations through the repo and no data. `DATABASE_URL` is the only
difference between them.

- `npm run db:migrate` — author a migration locally against the dev database
- `npm run db:deploy` — apply committed migrations; wired into `.replit`'s
  build so a publish can never run against an un-migrated database

`prisma migrate deploy` only ever plays forward migration files that are
committed. It never derives a change from the schema, so a deploy cannot alter
production in a way nobody reviewed.

**Prisma 7 with the `pg` driver adapter**, not the classic client. Prisma 7
moved the connection URL out of the schema, and the adapter route means no
query-engine binary is shipped — one less thing to fail on Replit's Nix
environment.

**A missing `DATABASE_URL` is fatal and says so.** No fallback to a local file,
however tempting: a silent fallback is precisely the failure mode that made the
file store dangerous, and it would reintroduce it invisibly.

Verified: the full 22-check `app/e2e/auth-smoke.mjs` suite passes against
Postgres, and — the point of the exercise — after killing the app, rebuilding
from scratch and restarting, `test1234` is refused while the password set
before the rebuild still works.

### Left over

`app/data/admin-credential.json` may still exist on a developer machine from
the file-store era. Nothing reads it. It is gitignored and safe to delete.

## D-12 · The sign-in screens get the photograph (2026-08-11)

`assets/images/new/window-last-light.png` — a lamp lit against a window at dusk
— becomes the ground for sign-in and the password-change screen. It is the
literal image the whole design is named for, and it is the ONE place in the
portal that gets a photographic background. The working screens stay plain: a
picture behind a data table is noise. A threshold can be a room.

Two things worth keeping when this is next touched:

**The panel is centred, under the homepage's own logo** (`/logo-horizontal.svg`
— the same file the public masthead uses, so the private side still reads as
her site rather than a generic admin login). At 1440 the centred panel spans
x=500–940 and the lamp sits at roughly x=360, so it stays clear; that was
measured, not assumed. An earlier version placed the panel right to protect the
lamp — unnecessary once checked.

**The panel carries no brand eyebrow.** With the logo above it, "THE FIELD
WORK" appeared twice in four lines. The logo says it; the panel goes straight
to "Sign in".

**Narrow screens get a genuinely different crop, not a resize.** A portrait
phone crops a landscape interior down to a narrow column; centring it lost the
lamp entirely and left dark smears at the edges that read as a failed image
load. `auth-window-portrait.avif` is framed on the lamp and window and served
via a `media` query in the `<picture>`. This is art direction, and deleting it
in favour of "one image, one source" quietly restores the mud.

**Only converted derivatives are served.** The 7.8MB source PNG stays in
`assets/` and never reaches a browser: AVIF at 32KB (desktop) / 29KB (portrait),
WebP behind it for anything that cannot read AVIF. Verified by watching what the
browser actually requested, not by trusting the markup.

## D-13 · Password reset, and a second account (2026-08-11)

Accounts gain an email address, reset-by-link exists, and there is now more
than one account. This supersedes the "there is exactly one user" line in D-10
and D-11 — the model allows several, though in practice there are two.

**The second account has no usable password.** It is seeded with 32 random
bytes that are hashed and immediately forgotten, so the only way in is a reset
link sent to its address. A second admin sharing the same guessable temporary
password would simply be a second front door; this way the account is exactly
as strong as the mailbox behind it. It exists so the reset flow can be tested
against an inbox we control, since Marianne's is not available to us.
Controlled by `ADMIN_TEST_USERNAME` / `ADMIN_TEST_EMAIL`; blank the username
and it is never created.

**Email is optional on an account, on purpose.** An account with no address
cannot be reset by email. That is safer than seeding a plausible-looking
address nobody controls — a reset link to `marianne@…` would be a live route
into her account through a mailbox that may not exist. Hers stays empty until
she sets it in Settings.

**The migration renames rather than recreates.** Production already held her
live account, and Prisma's automatic diff for this change drops
`AdminCredential` and creates `AdminUser` — deleting the password she had set.
`20260811093000_admin_users_and_reset_tokens` is hand-written to `ALTER TABLE
… RENAME`, so every existing row survives. Verified against a copy of the live
shape before applying.

**Only the hash of a reset token is stored**, so a leaked dump of that table
cannot reset anything — the usable secret exists only in the email. SHA-256
rather than scrypt, deliberately: the token is already 256 bits of randomness,
so there is nothing to brute-force and nothing a slow hash would protect.
Links last an hour, work exactly once, and asking for a new one kills the old.
Spending the token and setting the password happen in one transaction.

**The answer is identical whether or not the address exists.** Otherwise the
form becomes a way to discover which addresses have accounts. Delivery failures
are logged, never shown, for the same reason.

**Sending is a port with two adapters**, chosen by whether `RESEND_API_KEY` is
set — not by `NODE_ENV`, so a production deploy without a key cannot silently
pretend to send. Without the key, links are printed to the server log marked
"not sent", which is what makes the flow testable before the sending domain's
DNS is verified.

Verified by `app/e2e/reset-smoke.mjs` — 13 checks — plus the existing 22 in
`auth-smoke.mjs` re-run against the new model. 35 passing.

### Still needed for real email

`RESEND_API_KEY` in Replit Secrets, and a sending domain verified in Resend
(DNS records on GoDaddy). Until both are in place the flow works end to end but
the link only reaches the server log.

## D-14 · Pictures are uploaded; film is a pasted link (2026-08-13)

**Operator decision:** _"Pictures I should be able to set from pictures on my
computer … same with video"_. The two halves turn out to want opposite answers.

**Pictures upload, and are re-encoded on the way in.** `scripts/_tmp-optimise-assets.mjs`
is promoted into the app as `app/src/lib/media/` — same widths, same encoders,
same qualities — so a photograph she adds is indistinguishable from one we
generated, which is what D-6 said had to happen. She chooses a file; the server
refuses anything whose first bytes are not a JPEG, PNG, WebP or AVIF, decodes
it, applies the palette treatment (§12), and writes the six derivatives under a
name it slugifies itself. The original is never stored and the name her file
arrived with never becomes a path. Alt text stays required.

**Where they are kept is a port with two adapters**, chosen by whether
`MEDIA_BUCKET_ID` is set — the same rule as `RESEND_API_KEY`, and for the same
reason. Without it, `app/public/media` on local disk. With it, Replit Object
Storage, served through `/media/[file]`. **Local disk must not be the
production store**: Replit's filesystem does not survive a redeploy, which is
the failure that kept restoring the temporary admin password until the
credential moved into Postgres (D-11) — except that here it takes the
photographs with it. The bucket adapter is written and type-checks but has
never made a real call; the first deploy that sets `MEDIA_BUCKET_ID` is its
test.

**Film is a LINK, not an upload.** Her source file is 604 MB. Accepting that
would mean an encoding queue, somewhere to keep the output and a way to tell
her it had finished — three things to go wrong in place of a provider that
already does it. So she puts the film on Vimeo or YouTube and pastes the
address; `filmUrl` holds what she pasted and `src/lib/film.ts` derives the
player from it at render.

**The still and the length are no longer hers to type.** Both belong to the
film and both are read from the provider's oEmbed when the link is saved — a
duration typed by hand is a figure with no source behind it (D-9). Vimeo
reports a duration; YouTube does not, so a YouTube film simply says less.
Neither can stop a save: an unreachable provider leaves both null and the page
shows a plain plate, exactly as the address lookup never blocks a save (D-15).

**The player is click-to-load, and the still is fetched rather than linked.**
An ordinary embed reaches the provider when the page opens — cookies set, the
read reported — on a page for a hands-off practice with a privacy notice on it.
So the provider is not contacted until somebody presses play, and the poster
frame is pulled through the media pipeline so even the still is served from
here. Verified by counting off-site requests: none before the press, Vimeo's
four hosts after it, and none at all with JavaScript off, where the still and a
plain link to the film are still in the delivered HTML.

**Prefer Vimeo.** `dnt=1` is a real do-not-track flag; `youtube-nocookie` is
the least YouTube offers. The form says so in one line rather than leaving her
to guess.

## D-15 · An address is looked up from its postcode (2026-08-13)

> **Superseded in part by D-16, the same day — and then wholly by D-19.** The
> lookup this describes no longer exists in any form; see D-19. The endpoint
> this chose — `GET /find/{postcode}` — no longer exists, and the reasoning below that
> rejects a typeahead on cost was wrong about how getAddress bills. Read D-16.
> What survives: the choice of getAddress over postcodes.io, and every rule
> about absent keys, saves, saved venues and editability.

**postcodes.io could never have done what the form implied.** It is the
Ordnance Survey's open postcode data: it knows areas and coordinates, and has
never heard of The Garden Room. It could confirm BA11 2QN was real and in
Frome, and could not produce the two lines above it. What was asked for was
typing an address and picking the actual building out of a list, and no amount
of postcode data reaches that.

**So the source is getAddress.io**, which resells Royal Mail's Postcode Address
File — the register of front doors. `GETADDRESS_API_KEY` buys it.

**Postcode → list, not typeahead.** getAddress sells both. The postcode is the
thing she has to hand, and the key may never reach the browser, so a typeahead
would be a round trip through our own server on every letter typed to arrive at
the same address in twenty requests instead of one. The list flow is also
closer to how a hall gives you its address in the first place.

**postcodes.io is gone.** Its whole remaining sentence — "Real. It lands in
Frome, Somerset — which is the area it covers, not the address" — existed to
explain a limitation that no longer applies. Pressing Find on a wrong postcode
now says nothing is listed there, which is the same warning arriving inside the
gesture she was already making. Two answers under one field is the chrome the
form was simplified to remove. What is lost: with no key configured, a typo in
a postcode is no longer caught at all. It never blocked a save either way.

**Absent key means the search is not offered**, on the same rule as
`RESEND_API_KEY` and `MEDIA_BUCKET_ID` — presence of the key, never `NODE_ENV`.
No button, no error, no dead control; the four fields are typed by hand as they
always were. A key that is wrong or out of allowance is logged loudly, because
a search that quietly answers "not just now" forever is how that survives for
months.

**The saved places stay, and stay first.** Nearly every workshop is in The
Garden Room, and one press filling four fields beats any lookup. The search is
for the rare new venue.

**Nothing it fills is final.** Name, address lines and postcode all stay
visible and editable after any fill — "we are in the church hall for this one,
second door" has to be possible on top of whatever the register said.

## D-16 · `/find` no longer exists, so the lookup is a typeahead (2026-08-13)

> **Superseded by D-19 (2026-08-14): there is no address lookup any more.**
> getAddress does not sell `/autocomplete` on the free tier and the open-data
> alternative cannot find the venue, so the whole feature is withdrawn and the
> address is four typed fields. Everything below is kept as the record of what
> was tried. Read D-19 before proposing a typeahead again.

**D-15 was built against an endpoint that has been withdrawn.** `GET
/find/{postcode}?expand=true` — the one-request-per-postcode call the whole of
D-15 rests on — now answers 404, with a valid key and with no key at all. It is
absent from getAddress's documentation, which lists Autocomplete, Private
Addresses, Validate, Location, Typeahead, Nearest, Distance and no Find. The
JavaScript "Find" library still ships; the REST path behind it does not.

**Nothing caught it, and the reason is the lesson.** D-15 was verified against
a stubbed network call, and a stub answers whatever it was told to answer — it
cannot report that the endpoint it is standing in for has been retired. A stub
proves the parsing; only the live service proves the path. Both are needed and
neither substitutes for the other.

**What replaced it is the pair getAddress now documents:**

    GET /autocomplete/{term}?api-key=…   → { suggestions: [ { address, url, id } ] }
    GET /get/{id}?api-key=…              → postcode, formatted_address[],
                                           building_name, sub_building_name,
                                           line_1…line_4, locality,
                                           town_or_city, county, district, …

A suggestion carries a line to read and an id, and no address parts, so the
second call is what turns the one she picked into filled fields.

**Which makes it the typeahead she asked for in the first place** — "start
typing an address and see options in a drop down I can select" — and D-15's
argument against one is now moot twice over. It reasoned that a typeahead would
spend twenty requests where the list flow spent one. It would not: **suggesting
is free and only rate-limited, and only resolving the picked suggestion is
billed**, so a whole address still costs exactly one look-up. The postcode-first
flow was never cheaper; it was only ever the shape `/find` happened to have.

**It is the FIELD, not a control beside it.** She types into "The name of the
place"; suggestions appear under it; picking one fills the name, the lines and
the postcode. No search box of its own, because that would be two places to
type a venue where the form has one, and no button, because there is nothing
left to press. The typeahead is less chrome than the button and results panel
it replaces — one line of help under the field is the whole of it.

**350ms after she stops, and not before three letters.** Every keystroke is a
round trip through our own server, since the key may never reach the browser.
350ms is longer than the gap between letters of someone typing a name they
know, so a burst spends one request at the end rather than one per letter —
measured at fifteen keystrokes to a single request. Three letters, because a
two-letter term answers with whatever the country has most of. getAddress's own
widget uses 500ms and two; ours is quicker to answer and slower to start, which
is the right trade when the round trip is longer and the term is a venue name.

**A refused key now says so in words.** This was rebuilt while the key was
being refused 401 on every endpoint that exists, and "401" alone leaves whoever
reads the log guessing — which is exactly the situation it was written in. The
log names the status, the call, getAddress's own message, and the three things
a 401 is ever caused by: an unactivated subscription, the admin key used in
place of an API key, or a domain restriction that a server-side call can never
satisfy because it carries no Origin. It still never logs the URL, because the
key is in it — and the key is struck out of getAddress's message before that is
passed through, since a service is free to echo back what it was sent.

**Everything D-15 got right is unchanged**: absent key means the feature is not
offered, chosen by presence of the key and never `NODE_ENV`; the action is
session-guarded, and now for two reasons, since the billed half would otherwise
be an address finder charged to her; nothing can stop a save; the saved-venue
picker stays and stays first; and nothing it fills is final.

## D-16 · Places are counted and capacity is ENFORCED; the loser of a race is refunded (2026-08-13)

**This departs from the brief, deliberately.** `brief.md` says capacity is
"displayed and never enforced". That was written for a request-a-place model,
where Marianne read the requests and decided. Places are now bought with a card
before she has seen anything, and selling the eleventh place of ten stops being
an administrative untidiness and becomes taking money for a chair that does not
exist — in a room, in front of nine other people, on the day.

So capacity is enforced, in two places:

- **When a Checkout Session is opened.** Stops somebody being sent to pay for a
  place that has already gone, which is the common case. It cannot stop two
  people paying for the last place at once, because at that moment neither has
  paid.
- **Again on the webhook, under a row lock**, before the Booking is written.
  `SELECT … FOR UPDATE` on the workshop makes two simultaneous confirmations a
  queue, so the second one counts the place the first has just taken. This is
  the check that actually decides.

### The race: refund the loser, automatically, and tell Marianne

Two answers were available — oversell by one and alert her, or refund the loser.
**The loser is refunded in full, automatically, and Marianne is told anyway.**

Overselling puts a person in a room with no chair. That failure happens in
public, on the day, to somebody who has travelled; and it happens to Marianne
too, who has to be the one to say it. The alternative failure is an email
arriving within seconds of paying that says the last place went while you were
paying and your £95 is already on its way back. That is disappointing and
complete: nobody is holding anything they should not, nobody is owed anything,
and it is over before it is thought about.

The window this happens in is a few seconds wide, on the last place of a day
that is about to sell out. It will be rare and it must still be right.

**When the automatic refund itself fails** — Stripe unreachable, the payment
uncapturable — the booking is written `cancelledUnrefunded` with the reason
`soldOut`, which is the ledger saying _cancelled, and we owe them_. The buyer's
email says the money is owed and has not moved yet rather than claiming a
refund that did not happen, and Marianne's says ACTION NEEDED with the amount
and the address. `refundOwed()` in `src/lib/bookings.ts` is what tells that
apart from a place given up after the refund date, where nothing was owed.

### What follows from it

- **`Workshop.capacity` is load-bearing now.** Lowering it below what is already
  sold does not cancel anybody — it shows "Full" and stops further sales.
- **Places left is real on both public pages**, counted as the sum of paid
  bookings' places. A cancellation stops counting, so a released place appears
  immediately with no second column to keep in step.
- **A workshop with any booking against it cannot be deleted**, in the portal
  and in the database (`onDelete: Restrict`). Cancelled bookings count for this:
  they are the record of a refund, and it has to outlive the day.

## D-17 · The webhook confirms a booking; the browser never does (2026-08-13)

A paid `Booking` row is written by exactly one thing: a signature-verified
`checkout.session.completed` arriving at `/api/stripe/webhook`. Not by the
success page, and not by anything the browser says.

The success URL Stripe returns somebody to can be typed by hand, kept from a
previous purchase, or never reached at all because the payment finished on a
phone that then lost signal. None of it is evidence that money moved. So
`/workshops/<slug>/booked` writes nothing and believes nothing — it looks up
the booking the webhook wrote and, if the webhook has not landed yet, says so
and reloads itself rather than inventing a receipt.

**Delivered more than once, on purpose by Stripe.** The event id is written
inside the same transaction as the Booking (`StripeEvent`), and the checkout
session id is unique on `Booking`. A redelivery collides on one or the other and
the whole transaction rolls back, so one payment cannot become two bookings or
two confirmation emails. On the refund side the guard is Stripe's own
idempotency key, `refund-booking-<id>`: the cancellation link gets clicked
twice, from two devices, by somebody upset, and the second click returns the
refund that already exists rather than making a second one.

**Amounts are never taken from the browser.** The client says which workshop and
how many places; the price, the currency and the total are read from the
workshop's own row. What is STORED is Stripe's `amount_total` — what they were
actually charged, which is what has to be refunded — and it is compared against
our own figure on the way in, with a loud log if they differ. The only way they
can differ is a price edited while somebody was at the checkout.

**The cancellation token is a bearer credential and only its hash is stored**,
the same rule as password-reset links (D-13). Whoever holds the link can cancel
that place and move that money, so a leaked dump of the table cannot do either.
The cost is that the link cannot be reprinted: resending it issues a new one and
retires the old, which is the right way round and is what the portal's bookings
page will do when it is built.

## D-18 · The paid-bookings ledger is its own screen, and delete is gated on cancellation rather than on the date (2026-08-14)

### Two rail entries, because they are two jobs

`/admin/bookings` is **Requests** — somebody asking for an hour and waiting to
be answered. Confirm, decline, no money. `/admin/workshop-bookings` is
**Bookings** — the ledger of places that have been paid for. Cancel, refund,
delete, real money.

They are separate screens because they have no action in common. Merging them
would put a confirm/decline pair in the same table as a refund, and the one
question that decides which control is safe to press — _has money moved?_ —
would have to be read off the row before every action. The approved screen
(`docs/screens/workshopflow/admin-workshop-bookings.html`) gives them separate
rail rows and this follows it. Requests stays a stub; there is no Service model
to make a request against.

### Two tables, and nothing to file

A booking is in "still to come" until its day has been and in the archive the
morning after. That is derived from `workshop.date` at render — there is no
column to keep in step, nothing that can get stuck in the wrong table, and
nothing she has to move. Upcoming is soonest-first; the archive is most-recent
first and shows five with an honest overflow line, because it only ever grows.

### The empty columns stay, and say why once

Type reads "Workshop" on every row and Deposit is empty on every row, because a
workshop is the only thing that can be bought and only a course takes a deposit.
Both columns stay — they are the shape the table those things will arrive into —
and the page says so once, quietly, under the introduction. Inventing a Service
row to make a column look busy would be a lie the size of a whole product.

### The open question: a finished workshop's bookings

**Delete is gated on `status !== "paid"` — on the booking having been
CANCELLED — never on whether the day has passed.** That closes the hole.

The worry was that "delete only after cancelled" would make a finished
workshop's bookings deletable, erasing the record of money actually received.
It does not, and the reason is the second rule the approved screen already
carried: **a day that has been cannot be cancelled.** Cancel releases a place
and changes somebody's plans; after the day there is no place to release and no
plans to change, and a record saying she cancelled a workshop that had already
run would be a false one. So an attended booking stays `paid` for ever, delete
never enables on it, and the record of what was taken outlives the day.

What she can still do to an archived booking is **refund** it — the only thing
left that changes anything — and the row says exactly that when the disabled
delete control is pressed: _"Delete stays out of reach — it is available once a
booking is cancelled, and a day that has been cannot be cancelled, so this
record stays."_

Both halves are enforced on the server against the booking re-read at that
moment, not against what the page was drawn with. A disabled button is a
courtesy; `isCancellable` / `isDeletable` in `src/lib/bookings.ts` are the rule.

### `CancelReason.marianne` — a migration

The enum gains a third member. A row that only said "cancelled" could not answer
the question she asks a month later — _did they drop out, or did I?_ — and it
decides what the buyer's email says, because "the place is free for somebody
else" is true when they cancelled and nonsense when she did.

    npm run db:migrate -- --name add_marianne_cancel_reason   (applied locally)
    npm run db:deploy                                          (Replit)

### Refunding is not cancelling

`refundId` is independent of `status`, and that is deliberate. Refunding a
booking she is NOT cancelling is a real thing she does: somebody who is still
coming and whom she has decided not to charge. That row stays `paid`, keeps
counting against the room's capacity, and carries the refund as well — and the
buyer's email says YOUR PLACE IS UNCHANGED in as many words, because somebody
who reads "£95 refunded" and assumes they have been cancelled will not turn up.

So `alreadyRefunded()` — has this `refundId` — is the honest test of "has the
money gone back", and `status === "cancelledRefunded"` is a narrower question.

### One refund path, not two

`cancelBookingFromPortal` and `refundBookingFromPortal` sit beside the buyer's
own `cancelBooking` and share its `refundInFull` — same Stripe call, same
`refund-booking-<id>` idempotency key, same order: **Stripe first, then the
record.** Repeating a refund under the same key costs nothing and moves nothing;
a row claiming money went back when it did not is what somebody discovers weeks
later. A standalone refund Stripe refuses writes NOTHING at all.

The one thing the portal decides that the buyer's link does not is whether to
refund, and it is only asked while the money is still hers to send back —
measured against that booking's OWN `Workshop.refundDays`, never a site-wide
rule.

### Who gets told

**Every admin-initiated cancel and refund emails the buyer.** They paid for
something and something has changed about it; finding out by turning up, or by
noticing a figure on a statement, is not a way to be told. What each email says
about the money is read off the booking after the write, so none of them can
claim a refund that did not happen.

**Marianne gets exactly one email from this screen: a refund Stripe refused.**
She made the cancellation and the row in front of her says what happened, so a
notice about her own action would be noise. A refund that would not go through
is different — the screen that said so will be closed in a minute and the money
will still be outstanding, so there is a durable copy carrying the payment
intent and the amount that refunding by hand in Stripe needs.

### No "resend the cancellation link"

Not built, on purpose. Only the SHA-256 of the token is stored (D-17), so the
table cannot show or re-send the link that is in somebody's inbox — it can only
mint a new one, which silently retires theirs. The approved screen has three
actions and no fourth, and every one of them is now reachable from the row
itself, so there is nothing she needs the buyer's link for. If it is ever added
it must say plainly that it replaces the old link rather than repeating it.

### Bulk "cancel this whole workshop and refund everyone" — NOT built

Deferred deliberately, and it still looks right. See the report accompanying
this decision: the case is a Saturday morning she cannot run, which is the worst
possible moment to be asked for one guarded action per booking. It wants to be
one confirmation naming the number of people and the total, then per-booking
results — because each booking has its own refund period and some of them will
be outside it, and a bulk action that hides a partial failure would be worse
than the per-row loop it replaced.

### What it is verified by

`app/e2e/admin-bookings-smoke.mjs` — 53 assertions, its own dev server, Stripe
replaced at the module boundary (`src/lib/stripe.ts` overwritten inside a
throwaway copy) so both the succeeding and the failing refund branch can be
exercised without touching anybody's account, and email intercepted by the
module's own log adapter so nothing is delivered.

## D-19 · The address lookup is withdrawn; a saved address gets a map link (2026-08-14)

> **Supersedes D-16 ("`/find` no longer exists, so the lookup is a typeahead")
> and what was left of D-15.** Everything those two said about the four address
> fields, the saved-venue picker and a lookup never blocking a save survives —
> because there is no lookup left to block anything.

**Operator decision:** _"okay no lookup just have address as input boxes but can
we have view in maps once its saved?"_

**Two ways were built and neither one works without paying.**

- **getAddress.io refuses the free tier the typeahead needs.** The key is valid
  — `/usage` answers 200 with it — and `/autocomplete` answers 401 with the same
  key. The 401 handling D-16 added was written for a key that might be wrong;
  the key is right, and autocomplete is simply not sold on the free plan. Every
  branch of that module works and there is nothing behind it to work with.
- **The free open-data alternative cannot find the venue.** Searching
  OpenStreetMap for "The Garden Room Frome" returns Garden Rooms in Minnesota,
  in London and in Rome, and not the one in Frome. This is the same wall D-15
  hit with postcodes.io, arrived at from the other side: open data knows places
  that somebody has mapped, and a hired room off Fromefield is not one of them.

Building-level UK addresses are Royal Mail's Postcode Address File, and the PAF
is sold. Both routes were tried; a third would be a third way of finding that
out.

**So it is gone rather than switched off.** `src/lib/addresses.ts`, the two
server actions behind it, the typeahead in the workshop form,
`GETADDRESS_API_KEY` and the four e2e scripts that exercised it are deleted.
Nothing is left disabled, feature-flagged or commented "for when we have a
plan": a key-shaped hole in `.env.example` is an invitation to spend a morning
re-discovering the 401, and this entry is here so the next person to propose a
typeahead reads what happened first.

**The address is four fields, typed.** The name of the place, the postcode, the
lines, and getting there — the same four, the same names, the same validation.
The form is shorter than it was, which is the right direction for a sheet that
was deliberately simplified.

**The saved-venue picker stays, and stays first.** One press fills all four, and
nearly every workshop is in The Garden Room. It was always the thing doing the
work; it is now the only shortcut there is.

**In its place: the address, in a map.** The workshop's own page has carried a
Google Maps search link since it was built. The portal now carries the same one,
on the edit page, under the address — and the URL is built in one place,
`src/lib/maps.ts`, used by both, so what she checks is exactly what a visitor
gets. It is a link and not an embed: nothing is asked of Google until she
presses it, which is the rule the film player follows (D-14). It appears only on
a workshop that exists and has an address, because a form with nothing saved in
it has nothing to look up.

**It is there because the seeded postcode may be wrong.** Two independent
sources place **BA11 2QN** in Buckland Dinham rather than Fromefield, and both
give Fromefield as BA11 2HE / 2AB / 1AZ. The client is being asked. The data is
NOT being corrected here on the strength of a web search — but a postcode that
is real, and a mile from the door, is exactly the mistake nothing in the form
could catch and one press on this link now can. The line of help under it says
so.

**Not added to the Offerings list.** Each row there is one large link to the
workshop's own page, and an anchor inside an anchor is not valid HTML — it would
mean unpicking the row to put a second link in it. That is not free, and the map
link is one press further on.

---

## D-19 · A webhook acts only on checkouts this deployment opened (2026-08-14)

**Two real refunds, and an apology to somebody who had done nothing wrong.**
On 14 August a place was bought on the Replit dev preview. Stripe delivered
`checkout.session.completed` to the PRODUCTION endpoint, which reads a different
database and had never held that workshop. The webhook took the only path that
fits a workshop it cannot find — `workshopGone` — refunded the payment in full
and emailed the buyer to say *"Lorem Ipsum … is no longer running … £0.40 has
been sent back"*. Twice: 14:19:27→29 and 14:22:12→14, the refund landing two to
three seconds after the completed session each time.

The routing was never at fault, and the evidence says so: the refunds fired
promptly, which means the endpoint was reachable and the handler ran to
completion. The workshop simply was not at
`https://thefieldwork.co.uk/admin/workshop-bookings`, because it never had been.

**The code was right and the environments were wrong.** One Stripe account
serves the live site and every preview of it, and Stripe sends every completed
session to EVERY endpoint registered on the account. So "an event that is not
mine" is an ordinary thing that arrives on an ordinary day — and the webhook had
no way to see it, because a foreign session and a withdrawn workshop look
identical from inside the handler: a `workshopId` the database cannot find.

### The stamp is the site's own host, and it is not a new variable

Every Checkout Session this app opens now carries `site` in its metadata — the
host of `NEXT_PUBLIC_SITE_URL`. `thefieldwork.co.uk` live, the `.replit.dev`
address on the preview, `localhost:3100` under the smoke test.

Deliberately NOT a new `APP_ENV`-style variable. `NEXT_PUBLIC_SITE_URL` already
differs between deployments and already has to be correct, because the
cancellation links inside emails are built from it — a wrong value is noticed
within one booking. A variable that mattered only to this guard could be wrong
for months with nothing to notice, which is the same failure again wearing a
different name. The consequence is that a preview must carry its OWN address:
two deployments claiming one origin are one deployment as far as this is
concerned.

### Three answers, and they read differently in the log

| The session says | What happens | The log line begins |
| --- | --- | --- |
| Another host | Nothing at all — 200, no booking, no refund, no email | `NOT THIS SITE'S EVENT` |
| This host, workshop missing | Refunded and apologised for, exactly as before | `WORKSHOP WITHDRAWN` |
| Nothing | Treated as this site's | `…carries no site stamp; it predates the guard` |

**200 on a foreign event, not an error.** Stripe delivered it correctly; it
belongs to another deployment, which has had its own copy and dealt with it. A
4xx or 5xx would have Stripe retrying for days something we will never act on.

**Nothing is written for a foreign event**, so its id never reaches
`StripeEvent` and a redelivery arrives at the guard again rather than at the
idempotency check. That is fine, and it is the reason the guard sits before
everything else: doing nothing twice is doing nothing.

**`workshopGone` is untouched.** It is a correct path and Marianne relies on it —
a day taken off the site while somebody is at the checkout must be refunded and
apologised for. What it lost is only the impostors.

### An unstamped session is treated as ours, on purpose

Sessions opened before this shipped are valid for hours afterwards, and a real
buyer's payment is inside some of them. Calling those foreign would take the
money, write no booking and send nothing — a silent swallow, which is a worse
failure than the one being fixed: at least the refund gave the money back. The
unstamped population only shrinks, because every session opened from now on
carries the stamp, and the log says so each time one appears so it can be seen
draining away.

### The real fix is configuration, and the app can only notice

`sk_test_` on the preview and `sk_live_` in production makes this structurally
impossible — a test-mode event is only ever delivered to a test-mode endpoint,
so the crossing cannot occur at all. Nothing in the app can arrange that, so at
boot it says, once, when the keys and the site do not belong to each other: live
keys off the live domain, or test keys on it.

**A line in the log, never a refusal.** Refusing to start on a mismatch would
take the site down over a guess about which host is production, and the guard
above already makes the crossed case harmless.

### What it is verified by

`app/e2e/bookings-smoke.mjs` — now 72 assertions, of which 19 are this decision.
The events are synthetic and signed with Stripe's own signing helper against a
secret the script chose; no live Stripe call is made and no email is delivered.
Four claims carry it: a session stamped with this host books normally; one
stamped with another host is answered 200 and does NOTHING — no booking, no
email, no refund attempted — and does nothing again when redelivered; one with
no stamp books normally; and one stamped with this host for a workshop that is
genuinely absent still refunds and still says the day is no longer running.

---

## D-20 · An event is acted on once whatever it turned out to be (2026-08-14)

The event id is Stripe's idempotency handle. If the webhook acted on an event —
booked a place, sent money back, wrote to somebody — that has to be durable, and
it has to be durable on every path and not only the one that writes a `Booking`.

### What prompted it, and what was actually found

Deliveries had been returning 404 for days on an unrelated routing fault. When
that was fixed the whole backlog arrived at once and cleared as a wave of
refunds and apology emails to a real inbox. A real buyer was told twice that her
day was no longer running. Then a workshop of the same name was created again in
the live database, which makes the sharper question the live one: a replay of one
of those events would now FIND a workshop where there had been none, take the
booking path, and confirm a payment that was refunded days earlier.

**The row turned out to already be written.** `confirmPaidBooking` writes the
event id as the first act of its transaction, and the `workshopGone` branch
RETURNS rather than throwing — and returning from a Prisma interactive
transaction commits it. So the refund path was already recorded and already
protected. That was checked against the running database before anything was
changed, not assumed.

So what was missing was not the row. It was this:

- **Nothing said so.** The guarantee rested entirely on `return` and not
  `throw`, three lines apart, with no comment naming it and the schema's own
  note framing it as "one event, one booking" — the booking, not the refund.
- **Nothing tested it.** Redelivery was only ever exercised on the booking path.
- **The row could not say what it did.** Four rows existed against one `Booking`
  and there is now no way to learn what happened to the other three.

### What changed

**An `outcome` on `StripeEvent`** — `booked`, `noPlace` or `workshopGone` —
stamped inside the same transaction, at the point the answer is known. It is the
PATH TAKEN, not the result: whether Stripe accepted the refund arrives after the
transaction has committed, and it is already in the log and in the email
Marianne gets, which says REFUND DID NOT GO THROUGH in as many words. A column
repeating that would be a second thing to keep in step with no second question
to answer. It is nullable, and the four rows that predate it stay null — an
outcome nobody recorded should read as unknown rather than as a guess.

The stamp also puts a visible write to `StripeEvent` inside the `workshopGone`
branch, which is what makes the ordering hard to lose by accident.

**A replay is named as one.** `ALREADY SEEN — event evt_… was acted on when it
first arrived, so nothing has been done again: no booking, no refund, no email.`
Its own opening words, because this is the line that has to be findable when a
backlog clears: it is the difference between a wave of redeliveries costing
nothing and a buyer being apologised to twice. The response carries
`replay: true` alongside `acted: false`.

### The ordering, and which way it fails

Recorded first, then acted on. Every side effect — the refund, the confirmation,
the apology — happens in the route, after the transaction has committed.

| If the process dies | What is left |
| --- | --- |
| After recording, before refunding | An event recorded and not finished, a payment for a person to sort out, and a log line naming it |
| After refunding, before recording | Money returned and an apology sent with nothing written down — and Stripe redelivers for days, so the same buyer is apologised to again |

The first is recoverable by somebody reading the log. The second is the thing
that happened. That is the whole reason for the order.

### What is deliberately NOT recorded

The foreign-event guard (D-19), the unpaid branch, and the unusable-metadata
branch write nothing, and that is unchanged. None of them takes any action, so
there is no action to protect from happening twice, and a redelivery landing
there again is a second helping of nothing.

### What it is verified by

`app/e2e/bookings-smoke.mjs` — now 85 assertions, signed with Stripe's own
helper against a secret the script chose. No live Stripe call, no email
delivered, no data of the operator's touched.

Four claims: a `workshopGone` event delivered twice attempts one refund and
sends one pair of emails, the second delivery a recognised no-op at 200; a
booking event delivered twice still makes exactly one booking; the same
`workshopGone` event replayed AFTER a workshop exists at that id again creates
no booking and sends no confirmation; and the foreign guard still records
nothing at all, not even that the event arrived.

**These were proved to bite, not assumed to.** The plausible refactor — bail out
of the missing-workshop branch by throwing instead of returning — was applied on
purpose and the suite run against it. Nine assertions failed, and they failed by
reproducing the incident exactly: two refunds, two apologies, and a real
`Booking` written against the resurrected workshop for a payment that had
already been sent back. Reverted, and 85 of 85 pass.

### Applying it

The migration is additive and nullable: a new enum type and one new column on a
table of four rows. Locally it is applied. On Replit:

```
npm run db:deploy
```

---

## D-21 · A course is a run of dates, and the order IS the date (2026-08-14)

**Operator decision, verbatim:** _"lets generate the admin course creator page
for real - use workshop/new as the guide with the addition of being able to add
new course worshop title date/time location and description - these should be
deletable but not re-ordereable"_.

### What was built, and what was deliberately not

The MODEL and the CREATOR. `Course`, `CourseSession` and `CourseImage`, the two
pages at `/admin/offerings/courses/new` and `/admin/offerings/courses/[slug]`,
one shared form, and the Courses tab on Offerings — which now lists real
courses instead of saying "not built yet".

Not built, and not stubbed either: the public course pages, any checkout for a
course, the deposit-and-balance payment flow, reminders, and course bookings in
the ledger. Where the approved mockup implies those, the screen leaves them out
rather than drawing a control with nothing behind it (D-9). Two consequences
are said in as many words in the portal: the deposit field is "written down
rather than charged", and a published course is "a decision the site will
honour rather than one anybody can see" until the pages exist.

Also left out of the mockup: the weekly-run generator ("write four dated
evenings"), the drag-to-reorder handle, the calendar blocking, and the
"put it up and start another" button. The first three are the reordering
machinery this entry exists to avoid; the last is a second save path that
nothing else in the portal has.

### `CourseSession` carries a title and a paragraph

The public course page gives every date a name and something somebody can open,
so the record holds both. They are ordinary columns, filled in on the same row
as the date and the times.

### There is no sequence column, and nothing reorders

The order is the date — in the portal, on the page, and in the numbering the
page prints. It sorts by date on the way in and on the way out, and there is
nothing else it could sort by.

That removes a class of bug rather than solving it. A sequence integer beside a
date creates a state where the two disagree: a run whose numbers say one thing
and whose calendar says another, a screen that has to explain it, and a repair
to design. The approved mockup drew that screen — "Won't go up · Evening 3
falls before evening 2" with a "Put them in date order" button. None of it can
happen here, so none of it is built. Dates are added and taken off, and a week
she forgot goes on the end and lands in the right place.

The form makes the rule visible rather than writing it down: each row is headed
with where that date falls in the run — "1 of 3 · Wed 21 Oct" — worked out from
the dates as she types them. Rows stay where she put them while she is writing,
so nothing jumps under her hand; the run reads back in date order above, and
comes back in date order when she reopens it.

### What things are called

The model is `CourseSession` in code. Nothing Marianne or a visitor reads ever
says "session": this site already sells one-to-one **sessions** as a Service,
and two meanings of one word is a trap.

The approved public page says "evenings" and the admin mockup says "the dates".
The portal uses **the dates** throughout, because a course that meets on a
Saturday morning has no evenings in it and the neutral word is true of every
run. The form posts its rows as `run-<n>-*`, so the word does not appear in the
markup either.

### The deposit is stored and not charged

`Course.depositGBP`, in pence, nullable — null means the whole price is taken
at once, the way a workshop is (D-7). Zero is written as null, because "no
deposit" and "a deposit of £0" are the same arrangement and two spellings of
one fact eventually get read as two facts.

Nothing acts on it. It is a column now because the figure is hers to decide
while she is writing the course, not months later when the checkout lands.

### What a course shares with a workshop, it shares in code

A workshop and a course ask the same questions about money, clock times,
places, pictures and film. Three moves keep one answer to each:

- `src/lib/offering-form.ts` — the checks and conversions both actions make
  (pounds to pence, the time format, the rail, the saved venue, the film's
  still). They were private to the workshop's actions file and could not stay
  there: a `"use server"` module may export nothing but async functions.
- `src/components/admin/OfferingFormParts.tsx` — the sheet's furniture: the
  field classes, the hairline regions, the word Needed, the picture picker.
- `src/lib/workshop-rules.ts` → `src/lib/offering-rules.ts`, since `slugify`
  and the twelve-picture ceiling were never about workshops.

The two forms and the two actions stay separate files. What differs between
them is which fields exist and what the words beside them say, and one
component parameterised into covering both would be harder to read than either.

### The Offerings tabs are now links

Workshops and Courses are two lists on one page, chosen with `?kind=courses`;
Services still says "not built yet" because it is. The rows are the same row
twice — where a workshop prints its day, a course prints its run, read off its
dates.

### What it is verified by

`e2e/courses-smoke.mjs` — 46 assertions against a running app and a real
database. It writes a course with three dates entered deliberately out of
order, saves it, reopens it and checks every field and every date came back;
checks the run reads back in date order while she is still typing; clears one
date's name, ticks publish and confirms the save is refused with the fault
drawn beside that date and nothing else lost; takes one date off and confirms
only that one went and the rest are still in date order; then deletes the
course and confirms its page is gone. It creates one course and removes it.

### Applying it

The migration is additive: three new tables and one nullable foreign key from
`Course` to `Venue`. Nothing existing is altered. Locally it is applied. On
Replit:

```
npm run db:deploy
```
