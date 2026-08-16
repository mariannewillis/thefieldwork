# Email templates — design record

> **These are now WIRED IN (D-28, 2026-08-16).** `app/src/lib/email/render.ts`
> is this directory's `_build.mjs` promoted into the app, and every message the
> site sends to a visitor now carries an HTML half built from it alongside the
> plain text. The six points under "What has to change" below each
> carry a note saying what landed and what did not. These files stay the design record and remain the
> specification the renderer is checked against; edit `_build.mjs` and the
> renderer together, or they drift.

Six branded HTML messages for The Field Work. **These are design records, like
the rest of `docs/screens/`**, and they are also the specification the app's
renderer is held to — the smoke test asserts the rules below against the HTML
the app actually emits.

Open `index.html` (the contact sheet) through the project's static server:

```sh
node docs/screens/_serve.mjs        # from the project root, then
# http://localhost:8901/docs/screens/email/index.html
```

(The server resolves files by path and does not serve directory indexes, so the
`index.html` on the end is needed.)

Rendered proofs are in `shots/` — every template at 600px and 375px with images
loaded, plus a 600px render with images **blocked**, which is Outlook's default
and every corporate client that asks before it draws anything.

The `.html` files are emitted by `_build.mjs`, which holds the shared masthead,
footer, palette and type ramp once so six files cannot drift apart. Edit that
and re-run `node docs/screens/email/_build.mjs`. `_shot.mjs` takes the proofs.

---

## Which template goes with which trigger

| Template                       | Kind              | Sent when                                                                                                                                                     | Source of the wording                                     |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `newsletter.html`              | **Marketing**     | By hand, from Admin → Newsletter. Once a month, usually the first week.                                                                                       | New copy, in her register (see below)                     |
| `booking-confirmation.html`    | **Transactional** | Stripe `payment_intent.succeeded` for a workshop or course place.                                                                                             | `bookings.ts::confirmationEmail`                          |
| `session-request-received.html`| **Transactional** | The moment the request form is submitted.                                                                                                                     | `service-requests.ts::requestAcknowledgementEmail`        |
| `session-approved.html`        | **Transactional** | Marianne approves a request in Admin → Requests.                                                                                                              | `service-requests.ts::approvalEmail`                      |
| `balance-due.html`             | **Transactional** | **No automatic trigger — sent by hand.** See the note below.                                                                                                  | `bookings.ts::confirmationEmail`, the PAYING THE REST part |
| `cancelled-refunded.html`      | **Transactional** | The cancellation link is used and the Stripe refund goes through.                                                                                             | `bookings.ts::cancellationEmail`                          |

Both source files live under `app/src/lib/email/`. Their plain-text wording is
already carefully written — the deadlines, the amounts, what is and is not
promised. **These templates give that wording a shape; they do not restate it.**
If a sentence changes there, change it here.

### The transactional / marketing line, and why it matters

Only `newsletter.html` carries an unsubscribe link. Marketing email to UK
recipients needs one (PECR reg. 22); a booking confirmation is a transactional
message and must **not** have one, because "unsubscribe" printed beside a
receipt reads as an offer to stop being booked. Every transactional template
instead closes with one line saying why that particular message arrived — "It is
your confirmation, not a mailing list."

### The balance-due template has no trigger, on purpose

`bookings.ts` puts the balance link **inside the confirmation**, on the day the
deposit is paid, and says why in as many words:

> The balance link goes out now, not on the due date. Nothing in this app runs
> on a schedule, and a link the buyer already holds needs no scheduler to be
> correct… A reminder mailed on the day would be a job that has to fire; this is
> a link that has to be kept (D-23).

So `balance-due.html` is the same wording lifted into its own envelope, for
Marianne to send by hand from the bookings page when somebody has forgotten.
Making it fire automatically needs a scheduler the app does not have, and that
is a decision about D-23, not a template change.

---

## The templates that are NOT here

There are eleven more messages in those two files than the six drawn here.
Nine of them go **to Marianne**, not to a visitor — the booking notice, the
balance notice, the request notice, the two `ACTION NEEDED: refund by hand`
alerts. Those are operational, they are read on a phone in a hurry, and plain
text is the right shape for them; branding them would be decoration on an
alarm. The remaining two — `declineEmail` and `cannotHonourEmail` — are messages
somebody is being turned down or unwound by, and both are mostly her own typed
note. They can reuse `session-request-received.html`'s chrome unchanged when
somebody wants them.

---

## What has to change when these become real code

1. **DONE.** **Absolute asset URLs must resolve.** Every `src` and `href` is absolute
   against `https://thefieldwork.co.uk`, which is correct — an email has no
   document base, so a relative path resolves against `mail.google.com` and
   404s. In code they should be built from `SITE_URL` in `src/content/site.ts`,
   the same constant the app's canonical tags and sitemap use. **Do not use
   `NEXT_PUBLIC_SITE_URL` for these**: an email sent from a preview deployment
   would carry preview URLs into somebody's inbox forever, so email assets want
   `CANONICAL_SITE_URL`.

2. **DONE** — `scripts/build-email-logo.mjs` generates it and
   `app/public/brand/logo-horizontal@2x.png` is committed.
   **The wordmark has to exist as a PNG, and it does not yet.**
   `app/public/logo-horizontal.svg` is the only version. **No mail client
   renders SVG** — Gmail, Outlook and Yahoo all strip it. The templates point at
   `/brand/logo-horizontal@2x.png` (880×240, displayed at 280×76), which needs
   generating from the SVG and committing to `app/public/brand/`. A local copy
   sits in `assets/` here purely so the proofs in `shots/` can render.
   With images off the `<img>`'s styled `alt` renders the practice's name in
   blush display serif on its own plum — that is the whole images-off
   contingency for the mark, and it is why there is no second text wordmark
   beside it.

3. **STILL TRUE, and unenforced.** **Photographs must be JPEG or PNG.** The site serves AVIF and WebP
   derivatives. Outlook for Windows renders neither. `window-last-light-1200.jpg`
   already exists; any picture added to a letter needs its `.jpg` derivative
   present.

4. **SCHEMA DONE, ROUTE PENDING** — `Subscriber.unsubscribeToken` exists
   (per recipient, single row, stored in the clear because it is printed into
   every letter). The page and the `List-Unsubscribe` header are the newsletter
   pass. **The unsubscribe token.** `newsletter.html` links to
   `/unsubscribe/9c1f4a7be2` — a placeholder. The real one is per-recipient,
   single-use, and the page behind it already exists as a design
   (`docs/screens/webapp/unsubscribe.html`, which has the used / expired states
   drawn). A `List-Unsubscribe` header should go out alongside the visible link;
   Gmail and Apple Mail surface it as a one-tap control above the message.

5. **DONE.** `Mail` has `html`, `sendMail` sends both parts, and the plain
   text is unchanged. **The app currently sends plain text.** `sendMail` takes `{to, subject,
   text}`. Adding HTML means adding an `html` field and sending
   **multipart/alternative with both parts** — never HTML alone. The existing
   plain text is the alternative part, unchanged; these templates are the HTML
   one. That also keeps the messages readable in a client that refuses HTML, and
   it is what stops them scoring as spam.

6. **RENDERER DONE, EDITOR PENDING** — all five block kinds plus the
   attachment plate exist in `render.ts::Block`; the editor that composes them
   is the newsletter pass. **Content regions are marked in `_build.mjs`.** The newsletter body is built
   from exactly the five block kinds the admin editor offers — heading,
   paragraph, image, upcoming offerings, button — plus the optional
   attached-document plate. Each is bracketed `BLOCK` / `/BLOCK` and can be
   reordered, repeated or dropped without touching the chrome. The offerings
   rows should pull live dates and prices at send time, as
   `docs/screens/admin/admin-newsletter-edit.html` says they do.

---

## The rules these were drawn to

Same as the site, and checked in the proofs:

- **Zero border-radius, zero box-shadow.** Both are brand rules, not defaults.
- **Colour is context-locked.** Gold labels the dark plate and never appears in
  a blush pool; magenta works in a pool and never on the dark.
- **Nothing below 17px**, which is also above the 16px line under which iOS Mail
  zooms a message.
- **Tables for layout.** No flex, no grid, no `position` — Outlook for Windows
  renders through Word and supports none of them.
- **Critical styles inline.** The `<style>` block carries the responsive rules
  and the dark-mode re-assertion and nothing the message needs to be readable;
  several clients strip `<head>`.
- **No background images.** The plum plate is a `bgcolor` on a `<td>`, which is
  what stops it becoming a white void with blush text on it in Outlook.
- **No web fonts.** See `_build.mjs` § FONTS for the stacks and the reasoning.
- **A preheader per template**, written out on the contact sheet beside its
  subject line so Marianne can see both.
