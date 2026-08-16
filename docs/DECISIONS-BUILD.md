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
and emailed the buyer to say _"Lorem Ipsum … is no longer running … £0.40 has
been sent back"_. Twice: 14:19:27→29 and 14:22:12→14, the refund landing two to
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

| The session says            | What happens                                          | The log line begins                             |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Another host                | Nothing at all — 200, no booking, no refund, no email | `NOT THIS SITE'S EVENT`                         |
| This host, workshop missing | Refunded and apologised for, exactly as before        | `WORKSHOP WITHDRAWN`                            |
| Nothing                     | Treated as this site's                                | `…carries no site stamp; it predates the guard` |

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

| If the process dies               | What is left                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| After recording, before refunding | An event recorded and not finished, a payment for a person to sort out, and a log line naming it                                        |
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

---

## D-22 · A service has a length, not a date — and one answer about where (2026-08-14)

**Operator decision, verbatim:** _"lets also create the admin new service page
following the new workshop template - difference with service is marianne -
sets a location or sets a distance from address (in case of travel) - she will
also set how long the service will run for"_.

### What was built, and what was deliberately not

The MODEL and the CREATOR. `Service` and `ServiceImage`, the two pages at
`/admin/offerings/services/new` and `/admin/offerings/services/[slug]`, one
shared form, and the Services tab on Offerings — which now lists real services
instead of saying "not built yet". All three kinds of offering are now real in
the portal.

Not built, and not stubbed either: the public service pages, and the whole
request-and-approve flow. Services will be bookable with an approval step — a
visitor asks for a slot, Marianne approves it, a payment link goes out, and an
unpaid hold returns the slot by itself — and NOTHING in this pass implies any
of it. There is no hold, no expiry, no status, no approval and no checkout, and
the portal says as much in one line on the list rather than drawing controls
with nothing behind them (D-9).

### No date, no time, no capacity — and those are the model, not the backlog

A workshop is a day. A course is a run of days. A service is neither: a visitor
asks for a slot against her availability and she answers, so there is no day to
set while she is writing it. `durationMinutes` is what she sets instead — the
length, in minutes, because a service has no start of its own for two clock
times to bracket. The form reads it back in words as she types ("Which the page
reads as 1 hour 30 minutes"), the same way the workshop form reads back a
refund deadline.

Capacity is out for the plainer reason: one-to-one means one.

`refundDays` is out too, and it is the one omission worth naming. Both the
other kinds count a refund window back from a date, and a service has no date
to count back from. It is also a term of a sale, and there is no sale here yet.
When the approval flow lands, the cancellation terms belong with it.

### Where it happens: an enum plus two nullable groups, and a CHECK constraint

`ServiceLocation` is `venue | travels`, and `Service.location` says which.

- `venue` — the same four fields a workshop and a course carry
  (`venueName` / `addressLines` / `postcode` / `gettingThere`) plus the same
  nullable `venueId` breadcrumb recording which saved place filled them.
- `travels` — `basePostcode`, `travelRadiusMiles` and an optional
  `baseAddressLines`, plus the note below.

**Why an enum and not inference from which columns are null.** The alternative
was to share one set of address columns and read "she travels" off
`travelRadiusMiles` being set. It is fewer columns and it is worse: the branch
would be a thing the reader deduces rather than a thing she decided, and
`gettingThere` — step-free, the toilet, the parking — is a fact about a room of
hers that is simply false about a client's kitchen. "Where is this?" has one
answer on the page, so it has one column in the record.

**Why a CHECK constraint.** The action empties the branch not in force on every
save; `Service_location_branch` in the migration is what makes that true of
rows the action did not write. Same reasoning as `Booking`'s `onDelete:
Restrict` (D-16): a rule only the application keeps is a rule one careless
write away from being kept by nobody. It is hand-written SQL appended to the
generated migration, because Prisma cannot express it.

Verified by the smoke test in both directions: a service set at the Garden Room
and then switched to travelling comes back with all five venue columns null,
and switched back again comes back with all four travelling columns null.

### The travel note is prose, and no fee model was invented

`Service.travelNote` is free text she writes herself. She was asked whether
travelling carries a charge and did not say. Anything structured — a per-mile
rate, a free-miles threshold, a surcharge column — would have been a pricing
policy the portal invented on her behalf and then quietly enforced on her
clients. A line she writes covers whatever her policy is, including not having
one. The schema comment says so in as many words so that nobody adds a pricing
engine on a guess; if she wants mileage charged rather than described, that is
a column added THEN, on what she tells us.

### What a service shares with the other two, it shares in code

`lib/offering-form.ts` (pounds to pence, the rail, the saved venue, the film's
still), `components/admin/OfferingFormParts.tsx` (the sheet's furniture) and
`lib/offering-rules.ts` (`slugify`, the twelve-picture ceiling) are all reused
verbatim — the extraction D-21 made for courses paid for itself here. Nothing
was duplicated to build this. What is new is `formatDuration` in `lib/format.ts`
and `lib/services.ts` for the read side.

The three forms stay three files, for the reason D-21 gives.

### `step` on a number input is a trap

The duration field first shipped as `min={1} step={5}`, which makes 60 an
invalid value to the browser: it refuses the whole form with a tooltip and no
explanation. Caught by the drive, not by review. Any whole number is allowed
here because any whole number is allowed by the check on the server, and the
two must agree.

### What it is verified by

`e2e/services-smoke.mjs` — 57 assertions against a running app and a real
database. It confirms the sheet has no date, no time, no capacity and no refund
window on it; writes one at the Garden Room and reopens it with every field
checked; writes one she travels for and confirms it is refused until it can say
where from; switches the first one's branch both ways and confirms nothing of
the abandoned answer survives; then deletes both and confirms their pages 404.
The picture rail is deliberately not exercised — adding a picture means
uploading one, and nothing in the portal can take a picture back out of the
library, so a repeatable test of the rail would litter her media list on every
run.

### Applying it

The migration is additive: two new tables, one new enum, one nullable foreign
key from `Service` to `Venue`, and one CHECK constraint on the new table.
Nothing existing is altered. Locally it is applied. On Replit:

```
npm run db:deploy
```

## D-23 · A course is bought on a deposit; the balance is a link, and an unpaid one releases the place by arithmetic (2026-08-14)

Courses go on sale. The operator's four decisions, in his words: **deposit
first, payment plans later** — two payments, not n; **the balance due date is
Marianne's, per course**, set in the course creator the same way `refundDays`
is; **a paid deposit holds the place**; and **if the balance is not paid, the
place is released and she is told**. Everything below follows from those and
from the rules that already govern workshops — the webhook confirms and the
browser never does (D-17), the event id is recorded before anything acts on it
(D-20), capacity is checked under a row lock (D-16).

### Payments became rows, and outstanding is a subtraction

The question this answers is _"how does Marianne know whether something has been
paid in full?"_, and the answer had to be arithmetic she can see rather than a
boolean somebody keeps correct.

`Booking` now records **what is owed** — `totalPence`, and `balanceDueAt` when
there is a balance. `Payment` records **what came in** — one row per completed
Checkout Session, with its kind (`deposit` | `balance` | `full`), its amount, its
session and payment-intent ids, and its own refund fields. Paid is the sum of
those rows; outstanding is the difference; "the money has gone back" is whether
anything is left. None of the three is a column, so none of them can drift.

Six columns LEFT `Booking` to get there: `stripeSessionId`,
`stripePaymentIntentId`, `currency` and the three refund fields. They were facts
about money arriving, and a booking can now have two of those. One column could
only ever have held one — a settled course refunded is two refunds against two
payment intents.

**Refund idempotency moved with them**: the key is now `refund-payment-<id>`
rather than `refund-booking-<id>`, and a refund walks every unrefunded payment,
recording each as Stripe confirms it. A deposit that went back and a balance
that would not therefore leaves the truth on the two rows.

### One Booking, two nullable keys, and a CHECK

`Booking.workshopId` became nullable and `courseId` joined it, with
`Booking_one_offering` refusing any row that names both or neither. The
alternative — a `kind` enum beside a bare integer — costs the foreign keys: no
`onDelete: Restrict` on either side, and nothing to stop a booking pointing at a
workshop id that is really a course id. This way both relations are real, both
refuse the deletion of something people have paid for, and the database can say
what the application means. Services arrive later as a third nullable key and one
more term in the same sum.

Reading is normalised ONCE, in `offeringOf()`, into an `Offering` — name, slug,
capacity, refundDays, first date, last date, the dates themselves, the address.
Every page, email and rule downstream works on that, so a rule about a refund
date cannot quietly apply to one kind and not the other.

**Existing bookings were migrated, not special-cased.** The migration writes one
`Payment` of kind `full` for every booking that existed, copying its session,
intent, currency, amount, refund and `paidAt` across. After it there is no such
thing as a booking from before payments were rows, so nothing downstream carries
a branch for one and nothing can forget to. Booking 25 — a real place, really
paid for — came out of it as one booking and one payment, which the smoke test
checks before it does anything else.

### The balance link is OURS, and it goes out immediately

The link to pay the rest is `/pay/<token>` on this site, and it is sent **in the
deposit confirmation email**, not on the due date.

**Why not on the due date**: nothing in this app runs on a schedule, and a link
the buyer already holds needs no scheduler to be correct. It sits in the inbox
from the day they book, it names the amount and the date, and pressing it on the
morning it is due works exactly as pressing it that afternoon does.

**Why not a Stripe URL**: a Checkout Session's URL expires within a day and
becomes a dead end in an inbox somebody kept for six weeks. Our page creates a
fresh session when the button is pressed — so the amount is worked out then,
from the booking and its payments, rather than fixed weeks earlier — and it can
say three things a spent Stripe link cannot: this was already paid, this place
has been released, and here is what is still owed and when. It is also
re-sendable, because it is a link of ours to reissue.

The token is stored as a SHA-256 hash on `Booking.balanceTokenHash`, exactly as
the cancellation token is. Issuing is rotation; the usable secret exists only in
the email.

### Release is LAZY, and that is the design rather than a shortcut

A place whose balance is overdue stops counting toward capacity wherever
capacity is computed — one `NOT (...)` clause in the one query behind every
count of places sold. Nothing runs, nothing sweeps, no column is set.

That is not a saving; it is the only version that cannot be wrong. A place
released by a job that has to fire is a place that stays held when the job does
not. This is true the moment the due day is over, in the same instant on the
public page, in the checkout, and under the lock in the webhook.

**The booking is not cancelled by it.** She may still want the money, the buyer
may still pay, and a row rewritten by the passing of time would be a state change
nobody made. It simply stops counting — and paying the balance makes it count
again by itself, because `hasLapsed` is derived from `outstanding`. That reclaim
is only honest while nobody else has taken the chair, which is checked on the
page and again under the lock; the losing case is the D-16 race in a different
coat and gets the same answer, refunding the balance and telling both people.
The deposit is left alone: what happens to it is Marianne's decision, not a rule
the portal invented on her behalf.

**A deposit arrangement ends on its own date.** A course whose balance day has
passed still carries a deposit figure — she set it in June and the run is in
October — and taking that deposit now would write a booking that is overdue the
instant it exists: lapsed before the confirmation lands. So from that day the
whole price is taken at once. `depositStillOffered()` is that test, and the
panel, the checkout and the webhook all call it, because three copies of it is
how a page offers £80 and a card gets charged £240.

### Telling her needs something to fire, and nothing does

This is the honest gap. A place is released by a date passing, so there is no
moment at which anything could send a message, and no cron was invented to
manufacture one.

It surfaces where she will see it: the bookings ledger says it at the top —
"2 places have been released because the balance was not paid" — and each row
says it again in red, with the date it lapsed and the deposit money still with
her. Nothing is cancelled and nothing is refunded; both are hers to decide.

**What a scheduled job would add**, so the operator can decide about Replit
scheduling separately: (1) a reminder to the buyer a few days before the balance
is due, which is the thing most likely to stop a place lapsing at all; (2) an
email to Marianne on the morning a place lapses, rather than her finding out when
she next opens the ledger; (3) a weekly digest of what is outstanding. None of
them changes what is TRUE — the arithmetic is already correct without them — so
all three are notification rather than mechanism, and can be added later without
touching any of the above.

### The balance date is hers, in one place only

`Course.balanceDueAt`, set in the course creator beside the deposit it belongs
to. It is validated against the run's first date — the rest has to be paid by
the time the run starts, because money owed by somebody already attending is a
debt rather than a deposit — and a deposit with no date cannot go on the site at
all, because that is an arrangement with no second half.

It is **copied onto the Booking** as the place is taken. Moving the course's date
afterwards must not move the date somebody already bought on, which is the same
reasoning that copies a venue's address onto the workshop rather than reading
through the relation.

There is deliberately no second concept of "when payment is due" anywhere else.

**One consequence for the operator's own data**: `ifr-course` carries a deposit
and no balance date, because the column did not exist when it was written. It
stays published and sells at the WHOLE price until she opens it and sets one —
the panel says "the whole price is taken when you book", which is exactly what
the checkout will do. The form asks for a date the next time she saves it
published.

### What it is verified by

`e2e/course-bookings-smoke.mjs` — 69 assertions against a running app and a real
database, on the same harness as `bookings-smoke.mjs` and with the same three
guarantees: no real money (a made-up `sk_test_` key belonging to no account), no
real email (`RESEND_API_KEY=""`, so the log adapter runs — asserted, not
assumed), and every address ending `.invalid`. The Stripe events are synthetic
and signed with a secret the script chose, using Stripe's own signing helper.

It covers, in order: the operator's Booking 25 surviving the migration as one
booking and one `full` payment; the database refusing a booking for neither
offering; a deposit creating one booking and one payment with £160 outstanding
and the date copied across; the same event twice making one of everything; the
confirmation naming the run, every date, what was paid, what is owed, by when,
and carrying both links; capacity counted off the deposit; the balance page
stating the amount; the balance settling it as a second payment; the receipt and
the notice; a redelivered balance writing nothing; the link then reading "already
paid in full"; the cancellation link working on a course and offering back
everything actually paid; a course with no deposit settled in one payment with no
balance link in its email; a lapsed place freeing the room with nothing having
run; that place being resold at the whole price; the lapsed link then reading
"this place has been released"; a balance arriving for it refunded with both
people told; the two-people-one-place race; and a course withdrawn mid-checkout
recorded as `courseGone` rather than as a workshop.

`bookings-smoke.mjs` (86), `admin-bookings-smoke.mjs` (56) and `courses-smoke.mjs`
(50) all still pass — the last with new coverage of the balance-date field and
its two refusals.

### Applying it

The migration adds one enum, one table, three enum values and four columns;
renames `Booking.amountPence` to `totalPence`; moves six columns' worth of data
onto the new table; and drops them. It is written by hand because the middle of
it is a data migration and the end of it is a CHECK constraint Prisma cannot
express. Locally it is applied. On Replit:

```
npm run db:deploy
```

**Restart the app after deploying.** A running server holds a Prisma client
generated against the old schema and will refuse every course save with an
unrelated-looking error until it is restarted. That is how this was found here.

---

## D-24 · A session is ASKED FOR in words; the hold and the slot picker are refused (2026-08-15)

The public services pages went up — `/services` and `/services/<slug>`, built as
the courses pages were: the same composition, the same stylesheet reached
through the same layout module, strings from the database, `notFound()` for
anything missing or unpublished. The home page's products block now reads all
three kinds from the database, and the navigation goes where it says it does.

The one decision worth writing down is what the page ASKS FOR.

### The brief asks for a slot picker and a hold. Neither could be honest.

`brief.md` §5 and the approved `booking-request` / `booking-confirmation`
screens describe a live free-slot picker — real dates and times, computed — and
a short hold placed on the chosen one, counting down ("Held for you · 9:47
remaining") while Marianne decides.

The hold rests entirely on **computed availability**, which §9 defines as a
subtraction: her recurring `AvailabilityRule` pattern, minus workshop dates,
minus course session dates, minus personal `TimeBlock`s, minus other holds,
minus the buffer and the minimum lead time. **None of that exists.** There is no
availability table, no time-block table, no derivation and no scheduling module.

A picker built on top of nothing would offer times nothing had checked. A hold
would be a promise with no mechanism behind it — nothing to expire it, nothing
to release, and nothing that could stop the same hour being offered twice. Both
would be the one lie on a site whose whole argument is that it does not tell you
anything it cannot show you.

### So the preferred time is the visitor's own sentence

`ServiceRequest.preferredTime` is TEXT. "Weekday mornings, ideally not Tuesdays"
is a real answer that no picker can take, and it is the answer she needs in
order to write back. The field's note on the form says there is no calendar and
that nothing is taken, so nobody types "14:00" and leaves believing they have it.

When availability is built, a chosen slot arrives as its own nullable pair of
columns beside this one. The sentence somebody typed is worth keeping either way.

### What the page promises, and what it refuses to

Three places say the same thing, because this is exactly what a reader assumes
the other way round: above the fields, under the button, and again on the sent
panel — **a reply is coming; nothing is booked; no time is held; nothing is
charged.** Both emails say it too. The word "booking" does not appear on the
public form at all.

### The model

`ServiceRequest` — the service, name, email, optional phone, the preferred time
as text, an optional message, `status` (`pending` only; `confirmed` and
`declined` are named because the brief names the two answers she gives, and
nothing writes them yet), and timestamps. `onDelete: Restrict` on the service,
because deleting a service somebody wrote in about would take their message with
it — `deleteService` now refuses and says so, exactly as `deleteWorkshop` does
for a paid place. There is deliberately no `expired` status: the brief's fourth
state belongs to the hold.

### The guard on the one public write

This is the only endpoint the outside world can POST to that has neither
Stripe's signature nor a token behind it (§13 asks for a rate limit and a spam
guard). Three cheap layers, no new dependency: a honeypot field clipped by `.vh`
and out of the accessibility tree; a minimum fill time read off a hidden
`drawnAt`; and a per-caller count over the hour with a global ceiling beneath it,
in memory, exactly as `lib/auth/throttle.ts` keeps its counters and for the same
reason (one always-on instance, D-4). A discarded submission is answered with
the **same** acknowledgement a real one gets — a robot that learns which field is
the trap gets past the trap next time — and only the log says otherwise. A second
identical submission inside two minutes is a double-click, not a second
question, and writes nothing.

### The answer is an email, so the queue only shows

`/admin/bookings` lists the requests with what was asked for and the visitor's
words printed whole. It has **no accept, no decline and no status control**, and
that is this pass rather than an oversight: the next one is approve → payment
link → an unpaid link releasing the slot → she is told, and every step of it
needs something that does not exist. A button that only changed a column would
put a record of a decision in the portal while the person decided about heard
nothing. Her notice email sets `Reply-To` to theirs instead, so pressing reply in
the mailbox she already has open IS the workflow.

### Two other things this pass settled

- **The nav goes somewhere.** Sessions → `/services`, Workshops → `/workshops`,
  Courses → `/courses`, each marking itself current. About pointed at `/about`,
  an approved screen that is not built; until it is, it goes to the home page's
  `#not` beat, where her portrait and what she trained in already are. A nav
  entry that 404s is worse than a shorter answer. It reverts to `/about` when
  that page lands, and nothing else changes.
- **The home products block is derived.** All three columns read the database.
  The nine seeded rows it used to draw named offerings that had never existed
  and every one of their links was a 404. An empty column keeps the composition
  and says why it is empty — a course runs two or three times a year, so months
  with nothing in them are the normal state — and carries the link to that
  kind's index, which is the one route that would otherwise be missing from the
  page when she has none of a kind.

### What it is verified by

Driven against a running app and the real database on 5433. Two services created
through the real `saveService` action — one at a venue, one travelling — and both
branches drawn correctly on the public pages: the venue one prints its address,
Getting There and the map link; the travelling one prints where she sets out
from, how far she goes and her own sentence about what it costs. Never both.

The request action was exercised over the **no-JavaScript form-submit path**, so
progressive enhancement is proven rather than assumed: a valid request writes one
row and shows the sent panel; the same person again inside two minutes writes
nothing; a blank name, half an address and no preferred time come back as three
field errors with nothing written; a filled honeypot and an instantly-submitted
form both return the ordinary acknowledgement and write nothing. Both requests
appear in the queue with their words intact. Emails were intercepted at the
module boundary (`RESEND_API_KEY=""`, so the log adapter runs) and asserted on:
the notice carries the service, the duration, the price, the place, their words
and a `Reply-To` of their address; the acknowledgement says NOTHING IS BOOKED YET
before it says anything else.

`sitemap.xml` carries `/services` and both published services. Every link on the
home page and the services pages resolves except the four the home footer has
always pointed at — `/about`, `/contact`, `/privacy`, `/subscribe` — which are
approved screens nobody has built yet and are not this pass's to build.

### Applying it

```
npm run db:deploy
```

**Restart the app after deploying**, for the reason D-23 gives: a running server
holds a Prisma client generated against the old schema, and every request will
fail on `prisma.serviceRequest` being undefined until it is restarted. That is
how this was found here, again.
---

## D-25 · A session is APPROVED before it is paid for; the approval is the thing that lapses (2026-08-15)

D-24 shipped the requests queue with no controls at all and said why: the next
pass was **approve → payment link → an unpaid link releasing the slot → she is
told**, and every step of it needed something that did not exist. All of it
exists now. The operator's decisions, in his words: **a visitor asks, she
approves, and only then does a payment link go to the client**; **if it goes
unpaid the slot returns automatically and she is told**; **approval happens in
the admin, from the Requests screen**.

Everything below follows from those and from the rules that already govern
workshops and courses — the webhook confirms and the browser never does (D-17),
the event id is recorded before anything acts on it (D-20), the amount comes
from our database and never the client, refunds are idempotency-keyed, the site
stamp keeps a preview's payment out of the live ledger (D-19).

### A Booking learned a third offering, exactly as D-23 said it would

`Booking_one_offering` was written as a SUM rather than a pair of branches
precisely so that services could arrive as one more term in it. They did:
`serviceId` joins `workshopId` and `courseId`, all three nullable, all three
`Restrict`, and the CHECK is one more `CASE` in the same expression.

A session booking carries a **fourth** key, and it is the one that makes it
different from the other two. A workshop place is bought off the page by
anybody; a session is bought only by the person she approved, at the figure she
approved, through the one link she sent. So `Booking.serviceRequestId` names the
approval, is UNIQUE (one approval buys one session), and a second CHECK —
`Booking_service_from_request` — makes the two null together: a session booking
with no approval behind it would be money taken for something nobody agreed to.

`offeringOf()` gained its third branch, and with it the one honest consequence:
**`firstDate` and `lastDate` are now nullable, and only a session makes them
so.** There is no availability engine (D-24), so a session's time is the
sentence she and the client agreed and there is no day behind it. A sentinel
date would have been a lie that every reader then printed. `hasBeen()` is what
almost every reader of those fields actually wanted, and a session is never
"past" — nothing here can read her sentence, so nothing here may retire a
cancellation link or file a booking into the archive on a date the portal
invented.

### The amount is HERS, and it is copied, not read through

`ServiceRequest.approvedPence` is what she approved. The form offers
`Service.priceGBP` as the default and she can change it before approving,
because services carry travel and vary in length — a fixed figure would be wrong
the first time she drives somewhere. What is stored is what she agreed, and it
is what the client is asked for, what the checkout charges, and what becomes
`Booking.totalPence`. Editing the service's price next month must not change
what somebody was already asked to pay, which is the same reasoning that copies
a venue's address onto a workshop.

`agreedTime` is her answer to their `preferredTime`, and it is TEXT for exactly
the reason theirs is: a datetime here would be a time nothing had checked. Both
sentences are kept — theirs is what they asked for, hers is what was agreed.

The approval email prints the duration and the place but **not** the service's
list price, because the figure beside it is hers and two numbers in one email
asking for money is a coin toss. The smoke test asserts the list price is absent.

### The pay link is the balance link, reused

`/pay/<token>` resolves EITHER a `Booking.balanceTokenHash` or a
`ServiceRequest.payTokenHash` — one address, one token scheme, one set of
reasons (D-23): stored as SHA-256 so a leaked dump cannot open a payment; a page
of ours rather than a Stripe URL, because a Checkout URL is dead in a day and
this one mints the session on the press; and able to say things a spent Stripe
link cannot. A session's states are four rather than five, because it is paid at
once: there to pay, already paid, run out, and a link that no longer works.

A token that matches nothing produces ONE sentence whichever table it failed to
match — which is why `payPage.deadBody` no longer says "the run it belonged to".
That wording would have reached somebody whose session had never been a run.

### Release is lazy, and the approval is what lapses

**The window is 48 hours from the moment she presses approve.** Why that:
`brief.md` §5 already names 48 hours as the working default for the hold it
wanted at the pending stage, and this is the other half of the same
conversation — a second figure would make "how long do people get?" a question
with two answers. §20 Q7 says the number is a guess and that she will know which
way to move it after a fortnight, and §12 already assigns hold duration to Site
settings, a screen that does not exist yet. So it is `APPROVAL_HOLD_HOURS` in
`src/lib/service-requests.ts` — **one named constant, in the place the future
Settings column will read its default from**, rather than a new per-service or
per-request configurable invented in a place the brief has already assigned
somewhere else. HOURS, not days: "by Thursday" from a Tuesday-evening approval
is one day, not two.

It is **copied onto the row as `payBy`** at the moment of approval, for the
reason `Booking.balanceDueAt` is copied from the course: moving the constant
later must not move a deadline somebody has already been told in writing.

**The lapse itself is derived, not swept** — `payBy < now` with no Booking
against the row. Nothing runs, nothing sweeps, no column is set, and there is
still deliberately no `expired` in `ServiceRequestStatus`: `confirmed` records
what SHE did, and the passing of a Tuesday is not something she did. It is true
the moment it becomes true, in the queue, on the pay page and under the lock in
the webhook, and a job that has to fire could not say the same.

**What lapsing actually releases** is worth being exact about, because the brief
imagines a calendar and there is none. Nothing was held in a diary — there is no
diary. What ran out is her answer: the link stops working, the figure stops
standing, and the request is back on her desk. Approving again is the recovery
path and it is hers: a new figure, a new time, a new token, and the link in the
old email dies by existing.

### Telling her needs something to fire, and nothing does

The same honest gap as D-23, and the same answer. It surfaces where she will see
it: the Requests headline says "2 approvals ran out unpaid and are back with
you" above everything else, and the row says it again in red with the moment it
ran out and that nothing was charged.

**What a scheduled job would add** — so the operator can decide about Replit
scheduling separately: (1) a reminder to the client a few hours before the
approval runs out, which is the thing most likely to stop one lapsing at all;
(2) an email to Marianne the moment one lapses, rather than her finding out when
she next opens the queue; (3) a weekly digest of approvals still unpaid. None of
them changes what is TRUE — the arithmetic is already correct without them — so
all three are notification rather than mechanism, and can be added later without
touching any of the above.

### A session has no refund period, and none was invented

`Offering.refundDays` is 0 on a session, and that is the ABSENCE of a policy
rather than a strict one. Nothing anybody has agreed says a session is
refundable; §20 Q5 records that cancellation terms are still unspecified. So the
automatic path declines to decide: `isRefundable()` is false, cancelling never
refunds by itself, and the money stays where the operator put it — with
Marianne, under the refund control on the row, which was always available and is
unchanged. Every sentence that would otherwise have read "this cannot be
refunded once it is taken" has a session branch saying the true thing instead:
the link tells her, and the money is a conversation with a person.

### Two answers, both under a row lock, both sending an email

`approveRequest` and `declineRequest` each re-read the row inside the same
transaction that writes, under `SELECT … FOR UPDATE`. Two tabs on the queue is
ordinary: of two simultaneous approvals exactly one approves and sends an email,
and the other reads back "this was already approved" and sends nothing. A second
approval would otherwise be two links in two emails, one quietly dead, possibly
at two different figures.

Approving again is allowed on a LAPSED one and only on a lapsed one. Declining
is refused on one that has been paid for — that is a cancellation, and a
cancellation is about money, which is the bookings page's job.

The email is sent OUTSIDE the transaction, deliberately: the approval is the
durable fact and a message that would not send must not undo a decision she
made. The cost is that a failed send leaves an approval whose link nobody holds,
which is why the screen says so and the row shows the state plainly.

### Two more things a webhook can have done

`approvalGone` — somebody paid for a session whose approval was no longer live
(it ran out, she declined it, she replaced it). Its own value rather than
`noPlace`, because no place was ever the question: a session has no room, and
what ran out was the approval.

`duplicatePayment` — a SECOND, distinct payment arrived for a session already
paid for: two checkouts opened from one link, both completed. Its own value
because it is the only outcome here that means somebody was charged twice, and
that is the one a year later that has to be findable. Both refund and tell both
people; neither is silently kept.

### What it is verified by

`e2e/service-bookings-smoke.mjs` — 52 assertions against a running app and the
real database on 5433, on the same harness as its two siblings and with the same
guarantees: no real money (a made-up `sk_test_` key belonging to no account), no
real email (`RESEND_API_KEY=""`, so the log adapter runs — asserted, not
assumed), `EMAIL_TO_OWNER` pointed at `.invalid`, and **an assertion over the
whole server log that not one message in the run was even ADDRESSED to
marianne@thefieldwork.co.uk**.

It covers, in order: the operator's Booking 25, his two pending requests, her
`credentialVersion` and `ifr-course` all read-only and unchanged, checked before
anything happens and again at the end; the database refusing a booking that
names two offerings and one that names a service with no approval; the queue
closed to strangers; the approve panel defaulting to the list price and to their
own words; approving at £95 against a £70 service and storing exactly that; only
the token's hash stored, and the window being 48 hours from the press; the email
carrying the link, £95, the agreed time and the deadline — and NOT the list
price; the stored hash being the SHA-256 of the token in that email; the pay page
stating all three; paying creating ONE booking and ONE payment of kind `full`
against the approval at her figure, with no balance and no second link; the same
event delivered twice making one of each; a second distinct payment refunded and
recorded as `duplicatePayment` with the client told they were charged twice; the
link then reading "already paid for"; declining closing the request with her own
words, clearing the token, and sending her sentence rather than a template; an
approval lapsing with nothing having run, the queue headline and the row saying
so, and the link saying so; a payment landing after the lapse writing nothing,
recorded as `approvalGone`, refunded, both told; approving again issuing a new
link and killing the old one; a stale second tab failing to approve twice and
being told why, with the first approval's figure, token and time unchanged; and
the paid session appearing in the ledger typed as a Session and placed by her
sentence.

`bookings-smoke.mjs` (86), `course-bookings-smoke.mjs` (69) and
`admin-bookings-smoke.mjs` (56) all still pass unchanged.

### What was deliberately left out

Availability, a calendar, and any real hold on a time — all still absent, and
D-24's reasoning for that is unchanged. No refund policy for services beyond the
shared path. No payment plans on a session: it is paid at once. No bookings-table
tabs. And no cron.

### Applying it

The migration adds two enum values, seven nullable columns to `ServiceRequest`,
two nullable columns and two indexes to `Booking`, and replaces
`Booking_one_offering` with the three-term version alongside a new
`Booking_service_from_request`. It is written by hand because the end of it is a
CHECK constraint Prisma cannot express. Nothing in it is destructive: every
column is nullable, every existing Booking keeps naming what it named, and every
existing ServiceRequest stays `pending`. Locally it is applied. On Replit:

```
npm run db:deploy
```

**Restart the app after deploying**, for the reason D-23 and D-24 both give: a
running server holds a Prisma client generated against the old schema and will
fail on the new columns until it is restarted.
---

## D-26 · The diary decides what a visitor may ask for; a request HOLDS its hour (2026-08-15)

D-24 refused a slot picker and said exactly why: the brief's hold rests on
computed availability — a recurring pattern minus workshops minus course dates
minus personal blocks minus other holds — and **none of that existed**, so a
picker would have offered times nothing had checked and a stored datetime would
have been a slot the calendar had never heard of. It also said what would happen
when availability was built: "a chosen slot arrives as its own nullable pair of
columns beside this one; this column stays, because the sentence somebody typed
is worth keeping either way." That is precisely what has happened.

The operator's decisions, in his words: **one calendar in admin**; **busy comes
from five places**; **personal blocks are made directly on the calendar**;
**margin is a property of the offering, not a global rule**; **working hours are
per service** — having considered a global working week and rejected it;
**offered times are computed, never stored as a list**; **a request holds its
slot**; and **the slot returns automatically and she is told**.

Everything about the approval flow it sits under is unchanged. The amount is
still hers to set, the window is still 48 hours copied onto the row, the five
states are still derived, the token is still stored only as a hash.

### The busy list is five reads and one shape

`lib/availability.ts` reads the five things the operator named and returns them
as one list of occupied spans:

1. every workshop's day and hours, **published or not** — an unpublished workshop
   is one she has not put on the site yet, not one that is not happening;
2. every `CourseSession`, with its course's margin around each;
3. sessions that have been **paid for** — a `Booking` at the slot its approval
   named;
4. requests that are **still live** — asked and unanswered, or approved and
   waiting to be paid for;
5. her own blocks.

Margins and whole-day toggles are applied there, so everything downstream — the
grid, the calendar, the re-check on submit — compares plain spans and no reader
has to know which offering carries which rule. **The calendar draws that same
list.** A month view assembled from its own queries would be a second opinion
about her diary, and the morning the two disagreed the site would be the one
that was wrong. What she sees at `/admin/calendar` is, exactly, what a visitor
is being refused.

### Holding is DERIVED, by the same arithmetic as lapsing

**A slot is taken if a live request or a booking claims it.** "Live" is not a
column: `approvalState` already answers it in five values, and the busy list asks
the same function the queue, the pay page and the webhook ask. So requesting
reserves the hour, approving keeps it, and declining or lapsing gives it back —
with nothing running, nothing sweeping, and nothing to remember.

There is still no `expired` in `ServiceRequestStatus`, and now for a third
reason on top of D-25's two: a status meaning "released" would be a column
somebody has to set, and the morning it did not get set the diary would refuse
an hour nobody wanted.

One consequence worth naming because it surprises people: **cancelling a paid
session frees its hour.** `approvalState` still reads `paid` — a Booking exists
and always will — but only `paid` Bookings are read into the busy list, and a
cancelled one is not. The hour goes back the moment she cancels, which is the
whole point of cancelling it.

### Offered times are computed, and the same rule is applied twice

`lib/slots.ts` is pure and knows nothing about the database. Given a service's
five bookable facts and a list of occupied spans it walks her days, lays a
half-hour grid inside her hours, and keeps what is clear. **Nothing is stored.**
A saved list of bookable times is a second copy of an answer the diary already
gives, and it is wrong from the moment a workshop moves.

`slotVerdict` is the whole rule, and everything else is a loop around it. The
public page calls it through `offeredSlots` to build the picker; the action that
writes a request calls it **again**, inside the transaction that writes. One
rule, applied twice, so the two cannot disagree — the list a browser is holding
is seconds old, and the honest answer to "it went while you were typing" is to
say so rather than to take the hour anyway.

**The arithmetic the operator gave himself is the acceptance test.** Ninety
minutes against a five o'clock finish makes **15:30** the last start. It is
written as "does it finish in time" rather than "is it before the last start",
because the two are the same sentence and only the first is still right on the
morning the clocks change — the end is elapsed time and the finish is her clock.
The portal prints the answer back at her as she types, on the service form and
again on Availability, because it is the one figure on those screens she cannot
see by looking at the two beside it.

**Availability is never computed in the browser.** The picker is handed days in
words, clock times in words, and an opaque value to post back; it does no
conversion of any kind. One that worked out its own times would show somebody in
Madrid eleven o'clock for her ten, and would still be wrong here twice a year.

### Margin belongs to the offering; the buffer belongs to the service being asked for

They are different kinds of fact and they are applied at different ends, which is
the only part of this that is easy to get wrong.

A **workshop's or course's margin** (`marginBeforeMinutes`, `marginAfterMinutes`,
`blocksWholeDay`) belongs to that offering and blocks the diary for everything —
so it is baked into the busy span. Per offering rather than site-wide because a
ninety-minute evening talk in the garden room takes an hour either side and a
full-day retreat two counties away takes the day; one figure would be wrong for
both, and wrong in the expensive direction. The whole-day toggle is its own
column rather than "margin = 1440" because it means something different and the
form asks it as a different question. It is set once on a Course rather than per
date: a run is one arrangement, and four copies of one answer is three that can
disagree.

A **service's travel buffer** belongs to the thing being ASKED FOR, so it travels
with the candidate slot rather than with what is already booked. The consequence
is that two sessions of a fifteen-minute-buffer service end up half an hour
apart — and that is right: a quarter of an hour to get away from one and a
quarter to get to the next is half an hour of driving, not a quarter.

**A workshop with no end time takes the rest of the day.** She has said when it
starts and not when it stops, and the diary must not offer an afternoon on the
strength of a guess. The form now says so under the field, so it is a stated
consequence rather than a surprise. The calendar feed is the one place that
differs, and says why: a calendar has to draw something, and a bar to midnight
would be more wrong than an hour.

### Working hours are per service, and Availability is the other half of that

Four columns on `Service`: the days of the week, the earliest start, the latest
**finish**, and the travel buffer. Plus `minimumNoticeHours`, which is also per
service, because an hour in the garden room and a half-day she drives to do not
need the same warning.

The decision to keep this off a global settings screen was the operator's, and
what was missing from it was somewhere to see whether the five answers agreed.
`/admin/availability` is that: one table, every session, with the last-start sum
spelled out and a link to the row that is wrong. Nothing is set there.

**Two defaults, and the reasoning is in the code beside each.** A **minimum
notice of 24 hours**, so nobody takes nine o'clock this morning at half past
eight — per service and editable, because it is a fact about the session. A
**booking window of 60 days**, which is `BOOKING_WINDOW_DAYS` in `lib/slots.ts`
and one figure for the whole site, because it is a statement about how far into
the future this diary is worth trusting rather than about any one service. Both
follow `APPROVAL_HOLD_HOURS`'s precedent: a named constant in the place the
future Settings column will read its default from, not a configurable invented
in a place the brief has already assigned somewhere else.

**Monday to Friday, nine to five, is a migration DEFAULT and not a claim about
her week.** An empty day-set would have left every service on the site offering
nothing the morning this ran, and a service that offers nothing is a form nobody
can use. The form opens on those figures and says in as many words that they are
a starting point.

### Two people, one Thursday

The check and the write are separated by however long the network takes, so they
are wrapped in one transaction under **one advisory lock on the whole diary**
(`pg_advisory_xact_lock`). One lock and not one per slot, deliberately: slots
that clash are not only the ones starting at the same minute — a ninety-minute
session at ten and a sixty-minute one at eleven overlap, and so do a session and
the travel buffer around it — so a per-slot key would let exactly the pairs this
exists to catch through. Two people asking about different weeks queue for a few
milliseconds; for a sole practitioner taking a handful of requests a day that is
correctness for nothing.

It is transaction-scoped, so Postgres releases it on commit or rollback whatever
happens and there is no path that leaves the diary locked.

The double-press guard **moved inside** the lock with it, and had to: the same
person pressing twice would otherwise race themselves and be told "somebody took
that time" — which would be us, a second ago, on their behalf.

Two things had to be fixed to make this work at all, and both are recorded in
the code because both fail in ways that look like something else.
`pg_advisory_xact_lock` returns SQL `void`, which the pg driver adapter refuses
to deserialise — it throws `UnsupportedNativeDataType` and takes the request
down; it is cast to text. And the five busy reads run **one after another**
rather than in a `Promise.all`: Prisma's interactive-transaction client owns a
single connection and does not support concurrent queries on it, and the same
function is handed a transaction client by the re-check on submit.

### Time: UTC stored, London rendered, and 25 October

Every instant is stored in UTC and rendered in Europe/London, and `lib/london.ts`
is the only place the two are converted. It uses `Intl`, which has carried the
full IANA rule set for years and is already how dates are printed; a library here
would be a second copy of the same table.

The whole problem in one sentence: **the clocks go back at two in the morning on
25 October, and a diary that stores local times moves every slot after it by an
hour on the morning it happens.** Ten o'clock on 23 October is `09:00Z`; ten
o'clock on 26 October is `10:00Z`; the same wall-clock hour, an hour apart. The
smoke test asserts both, from the block form, through the real conversion.

Consequences that follow and are written down where they bite:

- **The whole of 25 October is 25 hours.** A whole-day workshop, and an all-day
  block, count in DAYS rather than adding 86,400,000. Asserted.
- **`slotEnd` is elapsed time.** Ninety minutes is ninety minutes of the world
  whichever side of the change it starts on.
- **Day-walking adds to the day NUMBER**, never 24 hours to an instant, or the
  grid drifts into the previous evening in October and stays there.
- **The hour that happens twice** (01:00–01:59 on the 25th) resolves to the
  second, GMT reading, so the grid offers 00:30 and then 01:00 — ninety minutes
  of real time apart — rather than printing one wall-clock time twice as two
  bookable slots.
- **The hour that does not exist** (01:00–01:59 on the last Sunday in March)
  resolves an hour later, which is what every calendar does and the only answer
  that is a real moment.

### `preferredTime` went nullable, and that is the honest shape

Somebody who picks ten o'clock on Thursday writes no sentence. Storing
"Thursday at 10:00" in `preferredTime` would be a second copy of `slotStart` in
worse words — two facts to keep in step, and the one nobody was looking at would
be the one that went wrong. So exactly one of the two is set.

The sentence path is **not a fallback bolted on**. A service with no days set,
and one whose next two months are full, both come through with nothing to offer,
and then the panel is the one D-24 built, sentence for sentence, because for that
conversation every one of them is still true. "Weekday mornings, not Tuesdays" is
a real answer no picker can take.

**The operator's requests 3 and 4 are on that path and are untouched.** They keep
their typed sentences, they have no slot, they still list, and they are still
approvable. Nothing invented a time for them, and nothing will: a slot they never
chose would be an hour in her diary that nobody agreed to. Asserted at the start
of the smoke run and again at the end.

### What the emails may now say, and what they still may not

D-24's acknowledgement said "no time has been held", because none was. One is
now, so the acknowledgement says that — and stops at exactly the same place it
did: it is **not booked**, and **nothing has been charged**, and she may still
write back and suggest another time. Her own notice says the hour is out of her
diary until she answers, and how it comes back.

The request with no slot gets the OLD sentences, unchanged. Which set is used is
decided by the row rather than by a flag: `slotStart` is either there or it is
not.

### Calendar sync — the cheap half, and only that

**Built:** a private subscription feed at `/api/calendar/<token>.ics`, carrying
workshops, course dates and sessions that have been paid for. She subscribes once
— Outlook: Add calendar → Subscribe from web; Google: Other calendars → From URL
— and they appear and keep themselves up to date. `UID` is stable and derived
from the row, so an update replaces rather than duplicates; `SEQUENCE` goes up
with `updatedAt`, counted from 2020 rather than 1970 because several clients have
historically kept it in a signed 32-bit integer and Unix seconds cross that in 2038. Every stamp is UTC with a trailing `Z`, so no `VTIMEZONE` block has to be
shipped and nothing can shift across the clock change. Lines are CRLF and folded
at 75 **octets** rather than characters, because her own words contain em-dashes
and pound signs and Outlook truncates the difference silently.

Personal blocks are **not** in it — they came out of her own calendar in the
first place, and sending them back would show her every appointment twice.
Neither are requests merely holding a slot: an hour nobody has agreed to is not
an appointment.

**Both providers refresh on their own schedule, often several hours**, and
neither says what it is. The portal says so beside the address rather than
letting her think it is broken.

The token is **the one bearer token in this schema stored in the clear**, and it
has to be: a subscription address must be readable again in six months and a
SHA-256 cannot produce one. What makes that acceptable is what it can do — a GET
that renders her diary as text, writes nothing, reaches no part of the portal,
and can be replaced from the Calendar screen, which kills every subscription made
from the old one at once. A wrong token gets the same 404 as an address that
never existed.

**Not built, and deliberately separate:** reading her personal Outlook or Google
appointments back in. That needs Microsoft Graph or the Google Calendar API, an
app registration the operator has to create in his own name, a consent screen,
and somewhere to keep and refresh a token that can read a person's whole
calendar. Half-building it would be worse than not — a diary that knew SOME of
her commitments would be a diary she trusts and should not.

### What it is verified by

`e2e/availability-smoke.mjs` — 97 assertions against a running app and the real
database on 5433, on the same harness as its siblings and with the same
guarantees: no real money (**no checkout is opened at all in this run**), no real
email (`RESEND_API_KEY=""`, so the log adapter runs — asserted, not assumed),
`EMAIL_TO_OWNER` pointed at `.invalid`, and an assertion over the whole server
log that not one message was even ADDRESSED to marianne@thefieldwork.co.uk.

It covers, in order: his data surviving the migration; **15:30 being the last
start** for ninety minutes against a five o'clock finish, with 16:00 never
offered and the grid on the half-hour; minimum notice, and a service with none
offering something sooner; the sixty-day window; a workshop's **margin** taking
11:00 and 13:30 while 09:00 and 14:00 survive; a **whole-day** toggle taking
everything; asking for an hour and the panel saying it is held; the row carrying
a real slot in UTC with the end copied and NO sentence; that hour and the one
before it disappearing from what anybody else is offered while 11:30 returns;
**two people racing one two o'clock with exactly one row written**, the loser
told and shown the times as they are now; a **travel buffer** refusing 11:30 and
08:30 and allowing 12:00; a lapsed approval's hour coming back **with nothing
having run**, a live one keeping it, and a decline returning it; ten o'clock on
both sides of the clock change storing an hour apart; the whole of 25 October
being 25 hours; the calendar drawing them; Availability printing the last-start
sum; the feed's headers, UID, DTSTAMP, SEQUENCE and UTC stamps, what is in it and
what is deliberately not, a wrong address answering 404 and rotation killing the
old one; the words path still writing a sentence with no slot invented; the queue
printing both kinds; and his Booking 25, requests 3 and 4, `credentialVersion`,
`ifr-course` and both workshops coming out exactly as they went in.

`bookings-smoke.mjs` (86), `course-bookings-smoke.mjs` (69),
`admin-bookings-smoke.mjs` (56) and `service-bookings-smoke.mjs` (54) all still
pass unchanged.

### What was deliberately left out

Reading her personal calendar back in (above). The bookings-table tabs. Recurring
personal blocks — a block that repeats needs an expansion, an exception list and
a screen to manage both, and a fortnight away is one row with a last day on it.
Multi-practitioner anything. Payment plans. Cron — nothing here needs anything to
fire, which is the same claim D-23 and D-25 make and is now the claim the hold
makes too. And no refund policy for services beyond the shared path.

**What a scheduled job would still add**, unchanged from D-25 and still
notification rather than mechanism: a reminder before an approval runs out, an
email the moment one lapses, and a weekly digest. None of them changes what is
TRUE.

### Applying it

The migration adds three columns to `Workshop` and to `Course`, five to
`Service`, two to `ServiceRequest`, one to `AdminUser`, and one table with a
CHECK constraint — and drops `NOT NULL` from `ServiceRequest.preferredTime`.
Nothing in it is destructive: every column added is nullable or has a default, no
row is deleted, and no existing value is overwritten. Locally it is applied. On
Replit:

```
npm run db:deploy
```

**Restart the app after deploying**, for the reason D-23, D-24 and D-25 all give:
a running server holds a Prisma client generated against the old schema and will
fail on the new columns until it is restarted.

---

## D-27 · The slot picker becomes a date, and then a time (2026-08-16)

D-26 shipped the picker as one flat stack: every offered day in order, each with
its clock times under it as chips, the first ten showing and the rest behind a
"Later dates" disclosure. It was accurate. On the live ninety-minute service it
was also **578 half-hours across 42 days on one page**, and the operator's own
reading of it was the whole brief for this change:

> "I just checked the book service form and we have a list of available slots —
> this should be a date time picker — first a client selects the date and then
> available times."

He is right, and the reason is not length. Somebody arrives at that panel already
holding a date — the Thursday they can get childcare for — and the flat list
makes them walk down it to find out whether she can do it. A month grid answers
that question in the shape everybody already knows, and it answers it for the
days she CANNOT do just as plainly: those dates are **drawn and crossed off**
rather than left out, because a gap where a Tuesday should be tells nobody
anything.

### Nothing underneath it moved

The availability engine is untouched. `offeredSlots()` and `offeredView()`
already returned days each carrying its own slots — the grouping this needed was
computed the day D-26 shipped. The posted value is the same opaque ISO instant,
the re-check inside the transaction is the same `slotVerdict`, a slot can still
go while somebody is deciding and the panel still says so and sends the fresh
list back with the refusal.

**The words path is unchanged and still load-bearing.** A service with no days
set, and one whose next two months are full, both arrive with nothing to offer,
and both get D-24's free-text panel sentence for sentence. A calendar with every
date dead is a worse answer than a sentence.

### The grid is computed on the server too

`calendarMonths()` in `lib/slots.ts` returns the months the window touches, each
with its dates, the weekday the 1st falls on, and every date's day in words. The
browser is handed numbered cells and matches them to offered days by key. It
reads into neither. Which weekday the first of October falls on is arithmetic
like any other, and February is arithmetic that goes wrong every fourth year.

The grid does **not** know what is free, deliberately: the offered days travel
back and forth with the form and the grid does not change between one submission
and the next. Two facts with two lifetimes, kept apart, so a stale calendar
cannot outlive the times drawn on it.

### It needs script, and that was not the first choice

A radio per date plus `:has()` can reveal one day's times with no JavaScript at
all, and that was tried first — it keeps the panel working exactly as it does
today. It was rejected for **correctness, not accessibility**: CSS can hide the
other dates' times but it cannot let go of a time already chosen under one of
them. Someone who picks Thursday at ten, changes their mind and picks Friday
would post Thursday at ten out of an input they can no longer see, and the
acknowledgement in their inbox would name a day they were not looking at. Only
script can un-press it.

The two ways round it were both worse: putting the dates and the times in ONE
radio group (so choosing a date clears the time by definition) gives a screen
reader a single group of seven hundred controls mixing dates with clock times;
generating a stylesheet rule per offered day gives sixty hand-rolled `:has()`
selectors nobody can maintain.

So the step is React state, in a component that was already a client component
for its own reasons — and **without script the two steps collapse back into the
one list they replaced.** A `<noscript>` rule hides the calendar and shows every
day at once, which is the panel D-26 shipped, working exactly as it did. All 578
times are in the delivered HTML either way, so a static screenshot of the page is
still the finished composition.

### Two smaller consequences, named rather than left to be found

- **The time radios are no longer `required`.** A radio group is required as a
  whole and the browser reports it on the first radio in the group — which, once
  the other days are `display:none`, is usually not on screen. Chrome then
  refuses to submit and tells nobody why. The server has always answered the
  empty case in a sentence ("Pick a time from the list before you send this")
  and the panel draws it against that fieldset; that is the check that runs now.
- **The calendar posts a `date` field the action ignores.** It is the radio
  group's name. Nothing reads it, and nothing may: which date a slot is on is a
  fact about the instant that was posted, not a second field to keep in step.

### Accessibility

Dates and times are both radio groups — arrow keys inside, Tab between, which is
what a keyboard and a screen reader already understand. Each time still announces
the day with it ("Thursday 3 September at 10:00"). Dates she cannot do are
`disabled` AND say "nothing free" in their label, so they are marked rather than
merely greyed. The month name is a polite live region, and a visually-hidden
status line names the chosen date and how many times are under it.

`e2e/availability-smoke.mjs` drives all of it through the browser, including the
operator's own acceptance test — ninety minutes finishing by five means the last
offered time is 15:30 and there is nothing after it — asserted through the new
picker rather than off the HTML. 107 checks, up from 97.

## D-28 · Every letter is branded and multipart; she owns three sentences of it and nothing else (2026-08-16)

Six finished HTML designs sat in `docs/screens/email/` and the app sent plain
text. This wires them in, and answers the question the operator asked with them:
what may Marianne change about what people receive?

**Three parts of each message, and no more.** The subject, the opening and the
sign-off. Everything load-bearing — the amount, the date, the venue, the
deadline, the booking reference, the cancellation link, the pay link — is
emitted by code into a block of its own and is not reachable from anything she
types. That is the whole point of the choice rather than a side effect of it:
**no edit she makes can stop somebody paying.**

**Nine, not fifteen.** Booking confirmation · balance paid · cancellation ·
refund issued · could-not-be-honoured · request acknowledgement · session
approved · session declined · password reset. The six notices that go to her own
inbox stay code-owned plain text and are not on the screen: they are read on a
phone in a hurry, and branding an alarm is decoration.

### What was built

- **`src/lib/email/render.ts`** — the renderer. `docs/screens/email/_build.mjs`
  promoted out of a design record and into the app: one masthead, one footer,
  one palette, one type ramp, and a small set of BLOCKS (headline, paragraph,
  facts, figure, button, image, offerings, attachment) that a message is a list
  of. Every constraint the design pass established is carried across —
  tables-only, inline styles, 600px, no background images, no web fonts, the
  three dark-mode opt-outs, a preheader per message, and **no fact ever set in
  gold** (Gmail's Android app force-inverts and honours no opt-out, so an
  inverted eyebrow may cost a label, never a date, an amount or a link). The
  smoke asserts each of those on the emitted HTML rather than trusting it.
- **`Mail` gains `html`, and `sendMail` sends both parts.** Never HTML alone —
  the existing plain text goes unchanged as the alternative, which is what keeps
  a message readable in a client that refuses HTML and what stops it scoring as
  spam. The six notices carry no `html` and are sent as text alone.
- **`EmailTemplate`** — one row per editable message, every column nullable.
  Null or blank means "as the app writes it", and the app's own wording is
  branch-aware in a way one stored sentence cannot be: a workshop confirmation,
  a course confirmation and a paid session say three different true things. So a
  template she has never touched, and one she has emptied, both send exactly
  what the app sent before the screen existed. The screen still opens showing
  that wording, because the seed lives in `src/lib/email/wording.ts` beside each
  template's placeholders.
- **`/admin/email-templates`** — a new rail entry between Newsletter and
  Subscribers. The nine listed, each openable, with the three fields, the list
  of what the app owns drawn in the plum beside them, a reset, and **a preview
  rendered by the real composer** with representative facts. Not a second
  rendering path: a change that broke a letter breaks the preview in the same
  way at the same moment.
- **`public/brand/logo-horizontal@2x.png`** — 880×240, generated from the SVG by
  `scripts/build-email-logo.mjs` and committed. No mail client renders SVG.

### How the guard actually works

Three mechanical things, none of them a validator anybody has to remember:

1. **Her text is never a document, only a slot.** A message is a list of blocks;
   her three strings land in three of them as text. There is no code path on
   which a string from `EmailTemplate` becomes an element, an attribute, a URL
   or a style.
2. **It is escaped on the way in.** `render.ts` exports a `Safe` type that can
   only be produced by escaping first, and every block value is either a `Safe`
   or escaped by the renderer. A `<script>` she pastes arrives in the letter as
   the characters `<script>`, in blush, in Palatino — which is in the proof
   shots.
3. **A subject cannot carry a newline.** Subjects become a header, and a newline
   in a header value is how a second `Bcc:` gets injected. Every C0/C1 control
   character is stripped before the string leaves `wording.ts`.

Placeholders (`{{amount}}`, `{{when}}`, `{{offering}}`…) are substituted before
escaping, so they cannot smuggle markup either, and **every placeholder value
also appears in a block the code owns** — deleting one loses a nicety and never
a fact.

### The schema, and what the newsletter pass builds on it

One migration, `20260816120000_add_email_templates_and_newsletters`, lays down
the whole surface for both passes so the second never has to alter a table the
first pass's screen is live against. Five models:

| Model                  | What it holds                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmailTemplate`        | key + nullable subject / opening / signOff. Nine rows seeded, all null.                                                                           |
| `Subscriber`           | email, optional name, `joinedAt`, `confirmedAt`, `unsubscribedAt`, `unsubscribeToken`. Dates rather than flags — PECR wants evidence, not `true`. |
| `Newsletter`           | subject, preheader, masthead label, `draft`/`sent`, `sentAt`, `recipientCount` frozen at send, `duplicatedFromId`.                                |
| `NewsletterBlock`      | position + one of the five kinds the editor offers (heading, paragraph, image, offerings, button).                                                |
| `NewsletterAttachment` | filename, `storedAs`, contentType, bytes, `attached` \| `linked`.                                                                                 |
| `NewsletterSend`       | one row per recipient per letter — `pending`/`delivered`/`failed`, the address frozen, `subscriberId` nullable on delete.                         |

Two decisions inside that are the operator's, made here:

- **A sent letter is locked.** Forty people are holding a copy of what it said,
  and a record that can be changed afterwards is not a record. The screen
  duplicates a sent letter into a new draft, which is what "edit last month's"
  actually means.
- **Two megabytes attaches; more becomes a link.** Past a couple of megabytes an
  attachment costs deliverability — spam weighting, corporate gateways, and
  recipients whose own limit bounces the whole message rather than trimming the
  file. `src/lib/newsletter/attachments.ts` holds the thresholds (2 MB per file,
  4 MB across a letter, 25 MB hard upload ceiling) and `deliveryFor()` decides
  at upload time so the screen can say which is happening before she sends.
  Nothing is refused for being large; it travels differently.

The second pass builds the newsletter editor, the send modal with its per-
recipient records, the subscribers table, the public subscribe page and the
unsubscribe route. It should not need to touch `prisma/schema.prisma`.

`e2e/email-templates-smoke.mjs` — 94 checks, including the guard exercised with
a script tag, an anchor, an `onerror` and a CRLF subject; a template with no row
and one with blank fields both rendering byte-identically to the app's own
wording; and a real send asserted to carry both parts. Proofs at 600px and 375px
in `e2e/_email-shots/`.
---

## D-29 · The letter is composed from the same blocks it is rendered from; the send is a frozen list and a loop that can be resumed (2026-08-16)

D-28 laid the schema and the renderer and said the second pass "should not need
to touch `prisma/schema.prisma`". It did not. What follows is what was built on
top of it, and the three judgements inside it that were not already made.

### What was built

- **`/admin/newsletters`** — drafts and sent letters as two lists, not one table
  with a status column: a draft is something to carry on with, a sent letter is
  a record to read, and they have different verbs.
- **The editor (`/admin/newsletters/[id]`)** — the OFFERING FORM'S SHEET, built
  from `OfferingFormParts`: the same regions, hairlines, "Needed" word, picture
  picker and one-save-at-the-bottom. Blocks are added, removed and reordered in
  the browser; **the order the fields appear in IS the order they are written
  down in**, because `FormData.entries()` yields document order. Nothing is
  written until Save, and then the whole letter is replaced — the same move
  `WorkshopForm`'s picture rail makes, for the same reason.
  `PicturePicker` gained an optional controlled mode (`value` / `onChange`) so a
  choice cannot travel with the wrong row when a block moves; the offering forms
  are untouched by it.
- **Attachments** upload the moment she chooses one (bytes cannot wait for a
  save), sniffed from their first bytes rather than from what the browser
  claimed; `deliveryFor()` decides attach-or-link THERE, and the screen says
  which, in words, with the reason. The line she writes about a file saves with
  the letter, because a sentence is not a file.
- **`/admin/subscribers`** — three groups: confirmed (the real list, and the
  count), asked-but-not-confirmed, and gone. There is no "add somebody" and no
  "mark as confirmed", and that absence is the point: what makes the list lawful
  to send to is that nobody in this building can manufacture a consent record.
- **`/subscribe`, `/subscribe/confirm`, `/unsubscribe/[token]`,
  `/api/unsubscribe/[token]`** and the confirmation email — a tenth message,
  code-owned, NOT on the templates screen, because the sentence explaining that
  pressing the link is what joins the list IS the consent record.
- **The home page's last beat** now asks for an address instead of an hour.

### 1 · One composer, two halves, and the `.jpg` rule enforced

`src/lib/newsletter/compose.ts` maps her five block kinds onto the block
vocabulary `email/render.ts` already draws, so a newsletter and a booking
confirmation come out of ONE renderer. Both halves — text and HTML — are built
side by side from the same rows; neither is derived from the other.

D-28 flagged the `.jpg` requirement as unenforced. `newsletterImageUrl()` is now
the only way a letter names a picture, and it always builds
`<origin>/media/<basename>-1200.jpg`. **Outlook for Windows renders through Word
and decodes neither AVIF nor WebP**, and `<picture>` / `srcset` — how every page
on the site picks its best derivative — are stripped or ignored there. A letter
pointing at the AVIF is a letter with a hole in it for a large share of its
readers, and the hole is invisible to whoever sent it. The height is MEASURED
off the JPEG with sharp rather than guessed, because several clients reserve the
box from the attributes and one with no height jolts the letter open when the
picture lands.

### 2 · Sending, with no job runner and nothing on a schedule (D-23)

The work is split from the RECORD of it, and the record is written first.

1. **`beginSend`** writes one `NewsletterSend` row per chosen recipient, all
   `pending`, and locks the letter — in ONE transaction. The chosen ids are
   INTERSECTED with the confirmed list rather than trusted: a form can be posted
   with anything in it. After it returns, who this letter is going to exists in
   the database whatever happens next.
2. **`sendBatch`** takes up to 24 pending rows, sends them at two a second
   (Resend's default limit), and marks each `delivered` or `failed` AS IT GOES.
   It stops at that count or at 30 seconds, whichever comes first.
3. The screen calls it again until nothing is pending, showing the count climb.

**At 500 subscribers**: 500 rows are written in one transaction in well under a
second, then roughly 21 batches of 24 at two a second — about four and a half
minutes of the browser looping, with the count climbing throughout. Nothing
times out, because no single request is ever asked to do more than about twelve
seconds of sending. If the tab is closed at 300, the letter's own page says "200
people have not been sent to yet" and offers to carry on; the unique constraint
on `(newsletterId, subscriberId)` means carrying on cannot reach anybody twice.
Nothing retries by itself and nothing wakes up — this is not a job runner and
does not pretend to be one. What it is instead is legible: at every moment the
answer to "who has this reached" is a query rather than a guess.

`startSending` deliberately does NOT `revalidatePath`. The freeze flips the
letter to `sent`, and revalidating would redraw the page as the record of a
letter — unmounting the very component whose next job is to start sending it.

### 3 · A GET may confirm and must not unsubscribe

The asymmetry is the decision, and it is not symmetry for its own sake:

- **Confirmation acts on the GET.** A page with a second "yes, confirm" button
  loses a fifth of the people who pressed the first one. A mail scanner
  prefetching the link confirms that a message SENT TO THAT ADDRESS was received
  at that address — which is exactly the fact the confirmation establishes. The
  scanner is inside the mailbox; it cannot manufacture consent for anybody else.
- **Unsubscribe does NOT act on the GET.** The same scanner would remove
  somebody who never asked, and they would find out by noticing the letter had
  stopped. So the link opens a page with one button on it — still "one click,
  nothing to fill in and nothing to explain", as every letter's footer promises.
- **`List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058)** point at
  `/api/unsubscribe/<token>`, which honours POSTs and redirects GETs. Gmail and
  Apple Mail draw that as a one-tap control beside the sender's name; Google's
  bulk-sender rules have required it since February 2024. Making leaving easy is
  what keeps the BOOKING CONFIRMATIONS out of junk folders.

**The confirmation token is SIGNED, not stored** — an HMAC over the row's id and
address, keyed on `AUTH_SECRET` — because `Subscriber` carries
`unsubscribeToken` and no second column, and this pass did not alter the schema.
It has no expiry and no single use, which is acceptable here and would not be
for a reset: the worst it can do is confirm a row whose owner already asked to
be on the list, and the unsubscribe link undoes it in one press. If a
`confirmToken` column ever lands, `lib/newsletter/subscribers.ts` carries the
migration note.

### The home page's last beat (an operator change, and a drift from the mockup)

`content/home.ts::crown` read "Ask for an hour" over a link to `#ask` — **which
was that section's own id, so the one call to action on the home page scrolled
to itself and did nothing**. It now asks for an email address, with the form
itself in the beat rather than a link to one. The footer's "Monthly letter"
gains `/subscribe`; "Ask a question" moves from the dead `/#ask` to `/services`.

`docs/screens/webapp/home.html` still draws the old Crown. That is deliberate
drift, recorded here rather than fixed silently: the mockups are the approved
design record (D-1), and the operator asked for this after they were approved.

### Proof

`e2e/newsletter-smoke.mjs` — 69 checks, run against a copy of the app with no
`.env.local`, so the log adapter runs and no message can leave. It exercises the
whole arc: three addresses signing up on the public form, two confirming, one
unsubscribing; the editor writing all five block kinds; a 200 kB file attaching
and a 3 MB one becoming a link with the screen saying so BEFORE the send; a test
send that neither locks the letter nor writes a row; a send modal that offers
neither the unconfirmed nor the departed; the operator's own two seeded
addresses unticked and provably sent nothing; a sent letter that refuses a
forged POST; and a duplicate that carries every block into a fresh draft. The
last checks assert that `marianne@thefieldwork.co.uk` appears NOWHERE in the run
and that every address written to ends `.invalid`. Proofs of the letter at 600px
and 375px, the editor, the send modal, the subscribers screen and the sent
record in `e2e/_newsletter-shots/`.
---

## D-30 · A letter cannot leave in a state she did not compose; the mark rides in the envelope; the plate is plum in an inbox (2026-08-16)

The operator sent himself a real letter, opened it in Gmail and in Outlook, and
found four things. Two of them are the same mistake in different places: the app
was reasoning about a letter that was not the one anybody would receive.

### 1 · Two letters went out empty, and nothing warned him

He wrote a heading, a paragraph, a picture and a button, attached a file, and
pressed Send. The file arrived. Nothing else did — and nothing else had ever
existed: `saveNewsletter` had not run once in the whole session, and
`NewsletterBlock` held no rows at all. Newsletters 12 and 13 reached the list
carrying an attachment and no words round it.

**Nothing on the screen was lying.** The sheet was showing his blocks, because
D-29's "one save, and the blocks are the form" keeps them in the browser until
Save writes them. The modal was showing the real confirmed subscribers. The
count on the button was right. Every part was true about something, and the one
question nobody asked was whether the two halves were the SAME LETTER. The
preview had the same hole and printed a caption about it — "save first, it shows
what is saved" — which is a screen asking her to remember something the screen
already knows.

**The fix is a refusal, not a silent save.** The alternative considered was
making Send save first; it was rejected because the sheet and the send are two
forms with two actions, and the irreversible button would then also raise every
validation failure the reversible one can — "a button needs words on it", first
seen by pressing Send to two hundred people. Instead:

- `DraftGuard` (a context the editor, the send and the preview share) holds one
  fact: has the sheet changed since the last successful save. Every edit sets
  it; a clean save clears it.
- While it is set, **Send, the test copy and the preview all refuse**, each
  saying the same sentence in the place its button was, and the save button
  reads "Not saved yet" rather than "Saved".
- `beginSend` and `sendTest` refuse a letter with **zero blocks**, whatever any
  screen believes. An empty letter is never intentional, and the screen is a
  claim about a browser — the server is the only thing that can actually stop
  it. Blocks and not attachments: a letter that is only a file is precisely
  what went wrong.

### 2 · The mark now rides in the envelope (`cid:`), not at a URL

The masthead pointed at `https://thefieldwork.co.uk/brand/logo-horizontal@2x.png`.
That domain answers — but it is not yet this app, so the file is a **404**, and
Gmail and Outlook fetch images from THEIR OWN servers rather than the reader's
browser, cache the result, and serve everybody the miss. The logo could not
appear from a laptop, and would not have appeared in production either until the
day this app is what answers there.

`render.ts` now emits `src="cid:thefieldwork-mark"`, and `sendMail` — the one
port every branded message goes through — attaches
`public/brand/logo-horizontal@2x.png` (13 kB) with a matching `contentId`, keyed
off the HTML actually containing the reference so the six plain-text notices
stay 2 kB. `resend@6` takes `contentId` camelCase and maps it to `content_id`
itself; the bytes go as base64, because it passes a `Buffer` straight into
`JSON.stringify` and that serialises four times as large. The alt text is
unchanged: a client that will not resolve `cid:` still draws "The Field Work" in
blush display serif on the plum, which was always the images-off contingency.

**Content pictures are NOT attached, and that is a decision.** The mark is
13 kB, constant, and the one image whose absence makes a letter look broken. A
photograph is a 1200px JPEG — a few hundred kilobytes each — and attaching one
puts those bytes in every recipient's copy: three pictures for two hundred
people is most of a gigabyte of sending for something one cached URL serves
once, and it pushes letters past the size at which gateways start weighting them
as spam (the same threshold `attachments.ts` turns a 2 MB document into a link
over). So they stay absolute URLs against the canonical domain, they will not
load from a development machine, and they will not load in production either
until this app is deployed at `thefieldwork.co.uk`. That is the deployment, not
the letter, and no change here can fix it. `compose.ts::newsletterImageUrl`
carries the whole of that note.

Both preview routes swap `cid:` for the local file through one shared
`forBrowserPreview()` — they were each doing half of this rewrite already, and
the half they were both missing is the one that would have broken.

### 3 · The plate reads as plum rather than black

`GROUND` was `#160712` — the site's own `--plum-900`, RGB 22, 7, 18. On the site,
surrounded by blush and gold and photography, it reads as deep plum. In an inbox
it does not: there is no surrounding page, the plate is a 600px column on the
client's own chrome, often on a phone at half brightness, and at 6% lightness
the hue is below the threshold at which the eye finds it. Everybody who was
asked said black.

`GROUND` is now **`#33132B`** — hsl(315, 46%, 14%) against plum-900's
hsl(316, 52%, 6%). Same hue, two steps up the ramp: recognisably the site's
colour, and unmistakably plum in an inbox. `SURFACE` moved with it to `#45193B`
so the raised plate keeps its step, and `PLATE_RULE` was re-blended over the new
ground (`#533149`). Nothing was spent: blush is 15.1:1, gold 10.3:1 and the soft
plate text 9.6:1 — all far past AAA. **The site is not changed**; a page has the
context an email does not.

### 4 · A picture behind the masthead — built, with the constraint on the sheet

She picks one from the media library like any other picture
(`Newsletter.backgroundBasename`). It is drawn ONLY behind the masthead band —
the one region carrying a mark and an uppercase label, and no sentence, date,
amount or link — over the plum `bgcolor`, under an 82% plum scrim. 82 is a floor
rather than a taste: it is what holds the gold eyebrow at 5.9:1 against the
worst photograph she could choose (a white sky), where 72% took it to 4.2:1.

**Outlook for Windows will never show it**, because it renders through Word,
which supports no CSS background at all — and it draws the flat plum plate
instead, which is the approved design exactly. That sentence is printed on the
editor's own sheet in bold, because the alternative is her choosing a
photograph, seeing it in her own inbox, and assuming everybody else did.

**No VML fallback, deliberately.** A `v:rect` with a `v:fill type="frame"` is how
you put a background image into Outlook, and it was considered and rejected: it
re-implements the masthead a second time inside a conditional comment, in a
dialect that cannot be tested from here, to give the one client whose readers are
likeliest to have images off a decoration the design does not need. Getting it
wrong breaks the real masthead in the one client the whole renderer was hardened
for. The flat plate is not a degraded Outlook — it IS the letter.

### Proof

`e2e/newsletter-smoke.mjs` — **83 checks** (was 69), same rules: a copy of the
app with no `.env.local`, the log adapter, nothing delivered, and the closing
assertions that `marianne@thefieldwork.co.uk` appears nowhere and every address
written to ends `.invalid`. The fourteen new ones exercise: an edited sheet
saying so and disabling the send, the test AND the preview link; saving giving
all three back; a letter with nothing in it refusing both buttons and saying
what is missing; and — the one that matters — a letter whose block is deleted
from the database UNDERNEATH a page that has already drawn the send as
available, where pressing it writes no recipient row, leaves the letter a draft,
and says so. `e2e/email-templates-smoke.mjs` — **95** (was 94), the new one
asserting the mark leaves as `cid:` bytes rather than a URL. Proofs at 600px and
375px, plus `masthead-plain.png` and `masthead-with-picture.png`, in
`e2e/_newsletter-shots/`.

One migration, `20260816200000_add_newsletter_background`: one nullable column,
no default, so every letter already sent keeps the plate it was sent against.
