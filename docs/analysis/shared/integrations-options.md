# Integration Options — Research Menu

<!-- Research-only. Produced by /analyze phase 2.5 via integrations.md
     sub-skill. 2–3 vendor candidates per category. /architect (task 020,
     post-design) picks one per slot and records the decision in
     architecture.yaml.apps.*.integrations[]. No decisions made here. -->

## Summary

Fifteen categories apply. Five are core-list (`content-cms`, `auth`,
`transactional-email`, `media-hosting`, `monitoring`); ten are project-specific
and fall out of §8, §12, §13 and §14 (`bulk-broadcast-email`,
`sending-domain-authentication`, `email-template-rendering`, `image-processing`,
`hosting-deploy`, `managed-postgres`, `scheduled-jobs`, `spam-guard`,
`rate-limit-store`, `rich-text-block-editor`). Omitted because §12 scopes them
out: `payments`, visitor `auth` (the owner account is a different category),
`analytics`, external calendar sync, `push-notifications`, `search`,
`feature-flags`, `ai-inference`, `i18n`.

Three brief signals bias the research. §8 names **Vercel**, **Neon or
Supabase**, and **Resend or equivalent**; those are Candidate 1 in their slots,
with alternatives supplied because the architect may find the pricing or the
cron granularity doesn't fit. §5 and §9 mandate in-house for `content-cms`,
`auth` and the suppression list; those are honoured, not re-litigated.

Four cross-cutting findings shape more than one category:

1. **The Vercel Hobby plan is non-commercial-only, verbatim: _"the Hobby plan
   restricts users to non-commercial, personal use only"_
   ([docs](https://vercel.com/docs/plans/hobby)). A practice selling sessions is
   commercial. Pro is $20 per developer seat/month — and Pro is _also_ the plan
   that lifts cron from "once per day, ±59 min" to "once per minute"
   ([cron pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). The
   licence requirement and the §13 hold-expiry requirement land on the same $20
   line; they are not two decisions.
2. **§14's no-tracking rule is a live vendor filter, not a preference.** Open
   tracking is a 1×1 pixel; on-by-default providers make the site's
   "no consent banner required" position untenable the day the first issue
   sends. Resend ships tracking **off by default**
   ([docs](https://resend.com/docs/dashboard/domains/tracking)); EmailOctopus
   disables per campaign; Mailchimp's opens are on by default and its double
   opt-in is an off-by-default setting (competitors.md §9).
3. **The suppression list cannot live in a vendor's audience.** §9 requires the
   project to own suppression "absolutely… by any code path", and §12 forbids
   bulk import. That rules out the Mailchimp/Substack/Kit shape where the vendor
   holds the list, and pushes every broadcast candidate into a port+adapter
   posture: `Subscriber` in the project's Postgres is the source of truth, the
   vendor is a delivery pipe filtered at the send layer.
4. **Serverless vs one always-on container is the fork under four categories.**
   Vercel/Cloudflare/Netlify push cron, the rate-limit store and (for Listmonk)
   the newsletter engine out to separate services. A single small container
   (Railway/Render/Fly) collapses those into one process at a comparable monthly
   figure. The architect is choosing once, in `hosting-deploy`, and inheriting
   the consequence in `scheduled-jobs` and `rate-limit-store`.

**In-house surfaces added by this research: none.** The Rung-B `/admin` decisions
below (`content-cms`, `auth`, `rich-text-block-editor`) are already fully
catalogued in brief §10 and §11 — `admin-login`, `admin-landing-sections`,
`admin-newsletter-edit` et al. No screen needs injecting into `screens.json`
that the brief has not already specified.

---

## Category: content-cms

### Candidate 1: In-house (/admin + DB)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — brief-specified, not inferred.
  §5 "the admin is not a CMS" makes the _fixed_ beat set the load-bearing
  product property; §9's content module must refuse create/delete/reorder on
  `LandingSection` at the API. No external CMS enforces "exactly seven records,
  keys seeded, two of them non-hideable" without fighting its own data model.
  The draft/published pair (§7, §12) is two rows of the same shape and a copy
  operation — days of work, not weeks.
- **Signup:** N/A — in-house
- **Pricing tier:** $0 forever
- **Credentials emitted after signup:** none — in-house
- **SDK maturity:** N/A — in-house
- **Lock-in risk:** low — content is rows in the project's own Postgres
- **EU residency / GDPR:** in-house = your own infra; residency inherited from
  the `managed-postgres` pick
- **Compliance:** §14's inline health-claim reminder in the landing-section
  editor is authorable only where the project owns the editor chrome
- **Brief signal:** §5 _"The admin is not a CMS… Configurable content, fixed
  design."_ §9 _"the seven keys are seeded and cannot be created or destroyed
  through the API."_

### Candidate 2: Sanity

- **Deployment:** vendor
- **In-house feasibility:** would be a rung to the right of what the brief asks
  for; Sanity's schema _can_ express a singleton-ish document set, but the
  editor is Sanity Studio, so §12's "she cannot add a beat" becomes a convention
  rather than an API refusal
- **Signup:** https://www.sanity.io/get-started
- **Pricing tier:** free tier exists (seats + API request quotas); paid tiers
  publish per-seat pricing <!-- NEEDS CLARIFICATION: Sanity's 2026 tier figures were not fetched this session; verify at sanity.io/pricing before quoting. -->
- **Credentials emitted after signup:** `SANITY_PROJECT_ID`, `SANITY_DATASET`,
  `SANITY_API_READ_TOKEN` (`sk...`)
- **SDK maturity:** mature — first-party JS/TS client, GROQ, Next.js integration
- **Lock-in risk:** medium — content lives in Sanity's dataset; export exists
  but the editing surface does not come with it
- **EU residency / GDPR:** EU dataset hosting available on paid tiers
  <!-- NEEDS CLARIFICATION: confirm which Sanity plan unlocks EU dataset region. -->
- **Compliance:** SOC 2 Type II, published DPA
- **Brief signal:** — (the brief argues against this shape)

### Candidate 3: In-repo (MDX / typed content files)

- **Deployment:** in-repo
- **In-house feasibility:** Rung **in-repo** — the cheapest rung, and it fails
  the brief's second principle. §1 requires the owner to change every word and
  picture "without calling anyone"; MDX requires a commit. Listed so the
  architect can see the rung was considered and rejected on a stated ground, not
  overlooked.
- **Signup:** N/A — in-repo
- **Pricing tier:** $0 forever
- **Credentials emitted after signup:** none — in-repo
- **SDK maturity:** N/A — in-repo
- **Lock-in risk:** low
- **EU residency / GDPR:** in-house = your own infra
- **Compliance:** —
- **Brief signal:** §1 principle 2 rules it out — _"A capability she cannot
  operate alone is worse than one that doesn't exist."_

**Comparison:** Candidate 1 is both the cheapest and the only one that can
enforce the fixed-beat invariant §17 requires a test for. Candidate 2 costs
money and buys an editing surface the brief has already specified in detail.

---

## Category: auth

### Candidate 1: In-house (single-owner session)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — brief-specified. §9: "single-owner
  session. Email + password with a strong hash, plus rate-limited login. No
  public registration, no multi-tenancy." One row, argon2id, an httpOnly cookie.
  Every vendor in this slot is priced and shaped around MAU counts and signup
  funnels that do not exist here — there is exactly one user, seeded by hand.
- **Signup:** N/A — in-house
- **Pricing tier:** $0 forever
- **Credentials emitted after signup:** none — in-house (`SESSION_SECRET` and
  the seeded `OWNER_EMAIL` / `OWNER_PASSWORD_HASH` are project-generated, not
  vendor-issued)
- **SDK maturity:** N/A — in-house (argon2 / bcrypt bindings are stable across
  Node and Python)
- **Lock-in risk:** low
- **EU residency / GDPR:** in-house = your own infra; no third party sees the
  owner's credentials
- **Compliance:** §13's `httpOnly`/`Secure`/`SameSite=Lax` + IP-and-account
  rate limiting are all in the project's own middleware
- **Brief signal:** §9 _"auth — single-owner session… No public registration,
  no multi-tenancy."_ §13 _"the account is seeded."_

### Candidate 2: Auth.js (NextAuth) credentials provider

- **Deployment:** in-house library
- **In-house feasibility:** same rung, more surface area — Auth.js brings
  session handling and CSRF for free but also brings an adapter, a schema and a
  provider abstraction for a system with one account and no OAuth
- **Signup:** N/A — open-source library
- **Pricing tier:** $0 forever (MIT)
- **Credentials emitted after signup:** none — `AUTH_SECRET` is self-generated
- **SDK maturity:** mature for Next.js; v5 API surface has moved more than once
- **Lock-in risk:** low — swappable
- **EU residency / GDPR:** in-house = your own infra
- **Compliance:** —
- **Brief signal:** —

### Candidate 3: Clerk

- **Deployment:** vendor
- **In-house feasibility:** vendor-shaped for multi-user products; the brief has
  no SSO/SAML/social/MFA signal that would justify the rung
- **Signup:** https://clerk.com/
- **Pricing tier:** free tier up to a MAU threshold, then per-MAU
  <!-- NEEDS CLARIFICATION: Clerk 2026 MAU threshold and per-MAU rate not fetched this session. -->
- **Credentials emitted after signup:** `CLERK_PUBLISHABLE_KEY` (`pk_test_…` /
  `pk_live_…`), `CLERK_SECRET_KEY` (`sk_test_…` / `sk_live_…`)
- **SDK maturity:** mature — first-party Next.js middleware
- **Lock-in risk:** medium — the session model and UI components are Clerk's
- **EU residency / GDPR:** EU region available on paid tiers
- **Compliance:** SOC 2 Type II, GDPR DPA, HIPAA on enterprise
- **Brief signal:** —

**Comparison:** with one account, no registration and no social login, the
vendor candidates are paying (in money or in dependency surface) for a problem
the brief does not have.

---

## Category: transactional-email

### Candidate 1: Resend

- **Deployment:** vendor, behind an in-house port
- **In-house feasibility:** Rung **port+adapter** — the project owns a
  `send(to, template, data)` interface with a local capture adapter for dev and
  a mock for tests (§17 requires both providers mocked in all default-on tests).
  Delivery, IP reputation and bounce webhooks are the vendor's half; never build
  those.
- **Signup:** https://resend.com/signup
- **Pricing tier:** Free — 3,000 emails/month, **100/day**, 1 domain. Pro —
  $20/mo for 50,000 emails or $35/mo for 100,000, 10 domains, no daily cap.
  Scale from $90/mo. ([pricing](https://resend.com/pricing))
- **Credentials emitted after signup:** `RESEND_API_KEY` (starts `re_…`);
  optional `RESEND_WEBHOOK_SECRET` for bounce/complaint events
- **SDK maturity:** mature — first-party Node/TS, Python, Go, Ruby, PHP SDKs;
  stable REST API
- **Lock-in risk:** low — plain REST send + a webhook; SMTP fallback exists
- **EU residency / GDPR:** an `eu-west-1` (Ireland) **sending** region exists,
  but account data, email metadata, logs and API records are stored in the US;
  region selection does not move them. Covered by SCCs plus EU–US Data Privacy
  Framework and its UK Extension.
  ([regions](https://resend.com/docs/dashboard/domains/regions) ·
  [GDPR](https://resend.com/security/gdpr) · [DPA](https://resend.com/legal/dpa))
- **Compliance:** DPA published; subprocessor list at
  https://resend.com/legal/subprocessors; DPF-certified
  ([changelog](https://resend.com/changelog/data-privacy-framework-certification))
- **Brief signal:** §8 _"One email provider covering both lanes — Resend or
  equivalent."_

### Candidate 2: Postmark

- **Deployment:** vendor, behind the same in-house port
- **In-house feasibility:** Rung **port+adapter**, identical shape
- **Signup:** https://postmarkapp.com/sign_up
- **Pricing tier:** Free Developer — 100 emails/month, perpetual, no card.
  Basic — $15/mo from 10,000 emails, overage $1.80 per 1,000. Pro $16.50/mo,
  Platform $18/mo at the same 10,000 base.
  ([pricing](https://postmarkapp.com/pricing))
- **Credentials emitted after signup:** `POSTMARK_SERVER_TOKEN` (per-server
  UUID-shaped), `POSTMARK_ACCOUNT_TOKEN` for domain/DKIM management
- **SDK maturity:** mature and long-stable — official Node, Python, .NET, Ruby,
  PHP libraries; the oldest API in this slot
- **Lock-in risk:** low
- **EU residency / GDPR:** US-hosted (ActiveCampaign-owned); DPA and SCCs
  available <!-- NEEDS CLARIFICATION: Postmark does not offer an EU data region as far as this session verified; confirm before relying on residency. -->
- **Compliance:** SOC 2, published DPA, long-standing anti-abuse posture
  (Postmark polices transactional streams aggressively — a genuine deliverability
  asset and a genuine constraint)
- **Brief signal:** §8 "or equivalent". Note the structural fit: Postmark's
  **Message Streams** are, in its own words, _"a parallel but completely separate
  sending infrastructure for your transactional and broadcast emails"_ — the same
  separation §5 draws between a booking acknowledgement and a newsletter, but
  enforced at the vendor's infrastructure layer.

### Candidate 3: Amazon SES (eu-west-2 London)

- **Deployment:** vendor, behind the same in-house port
- **In-house feasibility:** Rung **port+adapter**; the cheapest pipe and the
  most assembly required (bounce/complaint handling is SNS topics you wire
  yourself, not a webhook you subscribe to)
- **Signup:** https://aws.amazon.com/ses/ (requires an AWS account)
- **Pricing tier:** $0.10 per 1,000 emails outbound is the long-published rate;
  new accounts start in a **sandbox** (verified recipients only, low daily cap)
  until production access is granted by support
  <!-- NEEDS CLARIFICATION: SES per-1,000 rate and current sandbox limits were not re-fetched this session; verify at aws.amazon.com/ses/pricing and confirm the production-access lead time, which is a launch-gate risk for Milestone 3. -->
- **Credentials emitted after signup:** `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=eu-west-2`, or SES SMTP credentials
- **SDK maturity:** mature — AWS SDK v3, every language
- **Lock-in risk:** low on send, medium operationally (IAM, SNS, CloudWatch)
- **EU residency / GDPR:** **strongest of the three** — `eu-west-2` is London;
  data stays in the UK. AWS GDPR DPA is incorporated into the standard customer
  agreement.
- **Compliance:** the full AWS attestation set (SOC 1/2/3, ISO 27001, etc.)
- **Brief signal:** §8 "or equivalent"

**Comparison:** on §8's "one provider covering both lanes" test, Resend and
Postmark both cover transactional _and_ broadcast in one account; SES covers
sending only and leaves list mechanics entirely to the application. On UK data
residency SES is the only one that keeps everything in-country. On cost at this
scale all three are inside £20/month.

---

## Category: media-hosting

Object storage for images **and** PDFs. §13 sets the hard constraint: PDFs
stored outside the web root, served through an application route with an
explicit `Content-Disposition` and a non-executable content type, never rendered
inline from a same-origin path. That means **every** candidate below is used as
a _private_ bucket — public-read buckets are disqualified by §13 regardless of
vendor, because a public object URL surrenders both the header and the origin.

### Candidate 1: Cloudflare R2

- **Deployment:** vendor, behind an in-house storage port
- **In-house feasibility:** Rung **port+adapter** — the project owns a
  `put/get/signUrl` interface with a local-filesystem adapter for dev and test
  (keeps §17's default-on tests off the network); R2 is the deploy-time adapter.
  Do not build blob storage.
- **Signup:** https://dash.cloudflare.com/sign-up
- **Pricing tier:** Free tier 10 GB-month storage, 1M Class A (write) ops, 10M
  Class B (read) ops. Then $0.015/GB-month standard, $4.50/M Class A, $0.36/M
  Class B. **Egress free.**
  ([pricing](https://developers.cloudflare.com/r2/pricing/))
- **Credentials emitted after signup:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- **SDK maturity:** mature — S3-compatible, so the AWS SDK v3 S3 client works
  unmodified; that compatibility is itself the lock-in hedge
- **Lock-in risk:** low — S3 API means the adapter swaps without a rewrite
- **EU residency / GDPR:** R2 supports jurisdictional restriction at bucket
  creation <!-- NEEDS CLARIFICATION: the fetched R2 pricing page carries no jurisdiction detail; confirm the `eu` jurisdiction flag and its pricing implications in Cloudflare's R2 buckets docs before relying on it for UK GDPR posture. -->
- **Compliance:** Cloudflare DPA, SOC 2 Type II, ISO 27001
- **Brief signal:** §8 _"Object storage for uploaded images and PDFs."_

### Candidate 2: Supabase Storage

- **Deployment:** vendor, behind the same in-house port
- **In-house feasibility:** Rung **port+adapter**; the distinguishing argument is
  **one vendor fewer** if Supabase also wins `managed-postgres` — one dashboard,
  one bill, one support surface for a non-technical owner
- **Signup:** https://supabase.com/dashboard/sign-up
- **Pricing tier:** Free — 1 GB file storage, 5 GB egress, **50 MB max upload**,
  project pauses after 1 week of inactivity. Pro $25/mo — 100 GB storage
  included then $0.0213/GB, 250 GB egress then $0.09/GB.
  ([pricing](https://supabase.com/pricing))
- **Credentials emitted after signup:** `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` (server-only — §13 forbids it reaching the public
  bundle), `SUPABASE_ANON_KEY`
- **SDK maturity:** mature — first-party JS/Python clients; also S3-compatible
- **Lock-in risk:** medium — RLS policies and signed-URL semantics are
  Supabase's; the S3-compatible endpoint reduces but does not remove it
- **EU residency / GDPR:** region chosen per project; London (`eu-west-2`)
  available <!-- NEEDS CLARIFICATION: London region availability for Supabase was not re-verified this session; confirm in the project-creation region list. -->
- **Compliance:** SOC 2 Type II, HIPAA on paid tiers, published DPA
- **Brief signal:** §8 names Supabase in the database slot; storage is adjacent

### Candidate 3: Amazon S3 (eu-west-2 London)

- **Deployment:** vendor, behind the same in-house port
- **In-house feasibility:** Rung **port+adapter**; the reference implementation
  the other two emulate
- **Signup:** https://aws.amazon.com/s3/
- **Pricing tier:** ~$0.023/GB-month standard storage plus per-request and
  **per-GB egress** charges — the egress line is the structural difference from
  R2 <!-- NEEDS CLARIFICATION: S3 storage/egress rates not re-fetched this session; verify at aws.amazon.com/s3/pricing for eu-west-2. -->
- **Credentials emitted after signup:** `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=eu-west-2`, `S3_BUCKET`
- **SDK maturity:** mature — the canonical S3 SDK
- **Lock-in risk:** low
- **EU residency / GDPR:** London region; data stays in the UK
- **Compliance:** full AWS attestation set; AWS GDPR DPA
- **Brief signal:** —

**Comparison:** at this project's volume (six supplied plates plus occasional
owner uploads and a handful of PDFs) all three sit inside their free tiers or
under £1/month, so the decision is not cost — it is egress model (R2 free,
S3 metered), vendor count (Supabase collapses two slots into one), and
residency (S3 London is unambiguous UK). Vercel Blob is a fourth option worth
pricing if the host is Vercel; it was not researched here.
<!-- NEEDS CLARIFICATION: Vercel Blob pricing not fetched; include it in the architect's comparison if Vercel wins hosting. -->

---

## Category: monitoring

§8: "platform error reporting plus uptime checks. No custom dashboards."
Two distinct needs — error reporting is in-process, uptime needs an **external**
vantage point (a service cannot credibly monitor its own availability), and the
hold-expiry job needs a **heartbeat** check, because a cron that silently stops
firing is invisible to both of the other two.

### Candidate 1: Sentry (errors) + a heartbeat/uptime service

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor** for uptime (external vantage point is
  the whole point) and **port+adapter** for errors (a thin `captureError`
  wrapper keeps tests and dev off the network)
- **Signup:** https://sentry.io/signup/
- **Pricing tier:** free Developer plan — 5,000 errors/month, 1 user, 30-day
  retention; Team from ~$26/mo (50k errors); Business from ~$80/mo
  <!-- NEEDS CLARIFICATION: Sentry 2026 figures above are third-party-sourced (last9.io, sentrypricing.com), not from sentry.io/pricing. Re-verify before quoting. -->
- **Credentials emitted after signup:** `SENTRY_DSN` (a URL,
  `https://<key>@o<org>.ingest.sentry.io/<project>`), `SENTRY_AUTH_TOKEN` for
  sourcemap upload
- **SDK maturity:** mature — first-party Next.js and Python integrations
- **Lock-in risk:** low — the SDK is a wrapper around an ingest endpoint
- **EU residency / GDPR:** Sentry offers an EU data region selected at
  organisation creation and not changeable afterwards
  <!-- NEEDS CLARIFICATION: EU-region availability on the free Developer plan specifically was not verified this session; if UK/EU residency matters, confirm before creating the org — the choice is irreversible. -->
- **Compliance:** SOC 2 Type II, published DPA
- **Brief signal:** §8 _"platform error reporting plus uptime checks"_

### Candidate 2: Platform-native (Vercel/host runtime logs) + UptimeRobot

- **Deployment:** vendor
- **In-house feasibility:** Rung **decline-then-buy-cheap** — take error
  visibility from whatever the host already gives (Vercel Runtime Logs: 1 hour
  retention on Hobby, 1 day on Pro) and add only an external uptime probe
- **Signup:** https://uptimerobot.com/signUp
- **Pricing tier:** free plan — 50 monitors at 5-minute checks; paid from ~$7/mo
  <!-- NEEDS CLARIFICATION: UptimeRobot 2026 figures are third-party-sourced (uptimerobot knowledge hub, saaspricepulse); verify at uptimerobot.com/pricing. -->
- **Credentials emitted after signup:** `UPTIMEROBOT_API_KEY` (only if monitors
  are managed programmatically; the common path is dashboard-only, no env var)
- **SDK maturity:** N/A — configured in a dashboard
- **Lock-in risk:** low — monitors are trivially recreated elsewhere
- **EU residency / GDPR:** monitoring metadata only; no personal data leaves the
  system <!-- NEEDS CLARIFICATION: UptimeRobot data-location posture not verified. -->
- **Compliance:** —
- **Brief signal:** §8 _"No custom dashboards."_ This is the smallest thing that
  satisfies the sentence.

### Candidate 3: Healthchecks.io (cron heartbeat) alongside either of the above

- **Deployment:** vendor, or self-hosted (BSD-3, Django/Postgres)
- **In-house feasibility:** Rung **vendor** hosted or **self-hosted** — a
  dead-man's-switch is ~200 lines to build and worthless if it runs on the same
  box as the thing it watches
- **Signup:** https://healthchecks.io/accounts/signup/
- **Pricing tier:** free tier ~20 checks; self-hosting is $0 forever
  <!-- NEEDS CLARIFICATION: Healthchecks.io free-tier check count is third-party-sourced (hyperping comparison); verify at healthchecks.io/pricing. -->
- **Credentials emitted after signup:** a per-check ping URL (a secret in
  effect); optional `HEALTHCHECKS_PING_KEY`
- **SDK maturity:** N/A — the integration is one HTTP GET at the end of the job
- **Lock-in risk:** low
- **EU residency / GDPR:** self-hostable, so residency is fully controllable
- **Compliance:** —
- **Brief signal:** §13 _"expired by a scheduled job rather than only on read"_ —
  the requirement is that the job actually runs; nothing else in §8's
  observability line detects a cron that stopped firing.

**Comparison:** Candidate 2 is the cheapest complete answer to §8 as written and
gives up stack traces and release tracking. Candidate 3 is not an alternative to
1 or 2 — it covers a failure mode neither of them sees, and Better Stack (free
tier ~10 monitors) is a single-vendor way to get uptime and heartbeat together.

---

## Category: bulk-broadcast-email

### Candidate 1: Resend Broadcasts (list owned in-project)

- **Deployment:** vendor, behind an in-house broadcast port
- **In-house feasibility:** Rung **port+adapter**, and the port here is unusually
  thick by requirement. §9 says the project "owns the suppression list
  absolutely: an unsubscribed or bounced address is never sent to again by any
  code path" — so the `Subscriber` table is the source of truth, the send layer
  filters `status = confirmed` immediately before dispatch, and §17 asserts that
  filter at the send layer rather than the UI. The vendor never holds the
  authoritative list.
- **Signup:** https://resend.com/signup (same account as transactional)
- **Pricing tier:** as transactional — Free 3,000/month and **100/day**; Pro
  $20/mo for 50,000. The 100/day free cap is the binding constraint: a single
  issue to 150 confirmed subscribers exceeds it.
  ([pricing](https://resend.com/pricing))
- **Credentials emitted after signup:** `RESEND_API_KEY` (`re_…`);
  `RESEND_AUDIENCE_ID` only if the Broadcasts UI path is used
- **SDK maturity:** mature; batch send accepts multiple messages per call
- **Lock-in risk:** low if sends go through the batch/send API from the
  project's own list; **medium** if issues are composed in Resend's Broadcasts
  UI, because Resend's own note is that _"Broadcasts can only be sent to
  existing contacts"_ (i.e. contacts synced into a Resend Audience) — which
  duplicates the list outside the system that §9 says owns it
- **EU residency / GDPR:** as transactional — EU sending region, US metadata,
  DPF + SCCs
- **Compliance:** **open and click tracking are disabled by default for all
  domains** and are enabled only by explicitly adding a tracking subdomain
  ([docs](https://resend.com/docs/dashboard/domains/tracking)) — this is the
  §14-critical property. Unsubscribe headers (`List-Unsubscribe`) supported.
- **Brief signal:** §8 _"…and in broadcast mode for newsletter issues."_

### Candidate 2: Postmark Broadcast Message Stream

- **Deployment:** vendor, behind the same in-house port
- **In-house feasibility:** Rung **port+adapter**, identical posture
- **Signup:** https://postmarkapp.com/sign_up
- **Pricing tier:** Basic $15/mo from 10,000 emails/month; broadcast and
  transactional volume share the plan ([pricing](https://postmarkapp.com/pricing))
- **Credentials emitted after signup:** a **second** `POSTMARK_SERVER_TOKEN`
  scoped to the broadcast stream — the separation is credential-level, which
  makes §5's "the two systems never share a recipient list" mechanically
  visible in the env file
- **SDK maturity:** mature
- **Lock-in risk:** low
- **EU residency / GDPR:** US-hosted; DPA and SCCs
- **Compliance:** requires `List-Unsubscribe` on broadcast streams and enforces
  suppression at the stream level; open tracking is a per-message/per-server
  setting rather than mandatory
  <!-- NEEDS CLARIFICATION: confirm Postmark's default open-tracking state on a new broadcast stream — §14 needs it OFF, and this session did not verify the default. -->
- **Brief signal:** §5 _"A newsletter is not a transactional email"_ — Postmark
  is the only candidate whose product architecture draws the same line

### Candidate 3: Listmonk (self-hosted)

- **Deployment:** self-hosted (AGPL-3.0, single Go binary + Postgres)
- **In-house feasibility:** Rung **self-hosted vendor-equivalent** — and it
  collides with a brief requirement rather than a preference. §12 says "her
  branding is the template, not an option" and §11 puts issue composition in
  `admin-newsletter-edit`, inside the admin she already knows. Listmonk brings
  its own admin, its own template system and its own login. It still needs an
  SMTP relay (SES/Resend/Postmark) underneath, so it adds a service rather than
  removing one.
- **Signup:** N/A — self-hosted (https://listmonk.app/)
- **Pricing tier:** $0 forever for the software; hosting is whatever a small
  always-on container costs (~£5–10/mo) plus the SMTP relay
- **Credentials emitted after signup:** `LISTMONK_ADMIN_USER`,
  `LISTMONK_ADMIN_PASSWORD`, `LISTMONK_API_TOKEN`, plus the relay's SMTP
  credentials
- **SDK maturity:** REST API, no official client SDKs
- **Lock-in risk:** low — subscribers live in a Postgres table you own
- **EU residency / GDPR:** strongest available — subscribers never leave your
  own database or your own region
- **Compliance:** double opt-in built in, bounce processing via webhooks, and
  tracking is configurable rather than mandatory
- **Brief signal:** — (§9's suppression-ownership requirement is satisfied by
  Listmonk's model, but §12's single-admin requirement argues against it)

**Comparison:** the three differ mainly in where the list lives and how much
admin surface the owner must learn. Candidates 1 and 2 keep one admin (hers) and
one vendor relationship; Candidate 3 keeps the data closest and costs her a
second system to operate — which §1 principle 2 weighs heavily. On the §14
tracking filter, Resend's off-by-default is verified; Postmark's default is
unverified; Listmonk's is operator-controlled. Mailchimp, Substack and Kit are
excluded from this menu rather than ranked in it: each holds the authoritative
list, which §9 forbids.

---

## Category: sending-domain-authentication

Not a purchase — a setup gate. §8 makes it a launch blocker for Milestone 3:
"Sending domain authenticated with SPF, DKIM and DMARC before the first issue
goes out." The variable is what each provider needs in DNS.

### Candidate 1: Provider-issued DKIM + SPF include + self-authored DMARC (Resend / Postmark / SES)

- **Deployment:** in-house DNS configuration at the domain registrar
- **In-house feasibility:** Rung **in-house** — three DNS records. There is
  nothing to buy. Resend and Postmark both generate the DKIM keypair and display
  the exact records; SES does the same via Easy DKIM. Typical shape: a `TXT`
  SPF record including the provider (`v=spf1 include:… ~all`), one or more
  `CNAME`/`TXT` DKIM records the provider supplies, and a `_dmarc` `TXT` record
  you author (`v=DMARC1; p=none; rua=mailto:…` to start, tightened to
  `p=quarantine` once reports are clean).
- **Signup:** N/A — DNS at the registrar (record values come from the provider's
  domain page)
- **Pricing tier:** $0
- **Credentials emitted after signup:** none — DNS records, not secrets. The
  provider marks the domain `verified` before sending is permitted.
- **SDK maturity:** N/A
- **Lock-in risk:** low, with one caveat: SPF has a **10-DNS-lookup limit**, so
  running transactional and broadcast through two different providers consumes
  two includes and should be checked, not assumed
- **EU residency / GDPR:** N/A — public DNS
- **Compliance:** §14 requires every issue to carry sender identity and a
  working one-click unsubscribe; DMARC alignment is what makes the "from"
  identity trustworthy rather than merely stated. Gmail and Yahoo's bulk-sender
  rules (2024 onward) also require DMARC and `List-Unsubscribe` for bulk mail.
  <!-- NEEDS CLARIFICATION: the current bulk-sender thresholds (the 5,000-messages-per-day figure) were not re-verified this session; the practice will be well under any threshold at launch, but the DMARC record is required regardless. -->
- **Brief signal:** §8 _"without it a newsletter from a new domain lands in spam
  and the feature is worthless however well built."_

### Candidate 2: A dedicated sending subdomain

- **Deployment:** in-house DNS configuration
- **In-house feasibility:** Rung **in-house** — same three records, published on
  e.g. `mail.thefieldwork.co.uk` (or separate `send.` / `news.` subdomains for
  the two lanes) rather than the apex. Isolates newsletter reputation from the
  apex domain the owner also uses for personal correspondence, which matters
  precisely because §5 requires the two lanes to never share a list.
- **Signup:** N/A
- **Pricing tier:** $0
- **Credentials emitted after signup:** none — DNS records
- **SDK maturity:** N/A
- **Lock-in risk:** low
- **EU residency / GDPR:** N/A
- **Compliance:** DMARC on the organisational domain covers subdomains by
  default unless `sp=` overrides it — worth setting explicitly
- **Brief signal:** §5's two-lane separation; §20 open question 10 (the postal
  address) is the other legally-required footer element and is unresolved
- **Open question raised:** which domain sends. If §8's "one email provider" is
  chosen, one subdomain suffices; two providers means two authenticated
  subdomains and two SPF includes.

### Candidate 3: Managed DMARC reporting (Postmark DMARC Digests / dmarcian / Valimail)

- **Deployment:** vendor
- **In-house feasibility:** Rung **buy, or decline** — `rua=` aggregate reports
  arrive as gzipped XML that nobody reads by hand. A free digest service turns
  them into a weekly email. Declining is defensible at this scale; the record
  still works without a reader.
- **Signup:** https://dmarc.postmarkapp.com/
- **Pricing tier:** free for weekly digests of one domain (Postmark's offering
  is free and does not require using Postmark for sending)
  <!-- NEEDS CLARIFICATION: Postmark's DMARC Digests free-tier terms were not fetched this session; verify before relying on it. -->
- **Credentials emitted after signup:** none — the `rua=` address in the DMARC
  record is the integration
- **SDK maturity:** N/A
- **Lock-in risk:** low — change one DNS field to leave
- **EU residency / GDPR:** aggregate reports contain sending IPs, not recipient
  personal data
- **Compliance:** —
- **Brief signal:** — (implied by §8's "before the first issue goes out": you
  cannot know authentication is working without reading the reports)

**Comparison:** Candidates 1 and 2 are the same work at different DNS names;
Candidate 3 is optional and free. The only real decision is apex vs subdomain,
and it should be made before the first send because moving it later resets
domain reputation.

---

## Category: email-template-rendering

§12: "Her branding is not authored here — it is the template: logo, palette,
type and footer are applied automatically to every issue, so there is no way to
send something off-brand." That makes the template a build artefact, not a
vendor feature — and §17 requires asserting on the **rendered HTML** that every
issue carries the unsubscribe link and sender identity.

### Candidate 1: In-repo (React Email)

- **Deployment:** in-repo
- **In-house feasibility:** Rung **in-repo** — the template is committed code
  the owner cannot edit, which is exactly §12's requirement stated as an
  architecture rather than a policy. React Email components render to a string
  server-side, so §17's "asserted on the rendered HTML" test is a plain string
  assertion with no vendor in the loop. Table-based layout and inline styles are
  handled by the library.
- **Signup:** N/A — in-repo (https://react.email/)
- **Pricing tier:** $0 forever (MIT)
- **Credentials emitted after signup:** none — in-repo
- **SDK maturity:** mature for React/Next projects; maintained by Resend, which
  is a coupling to note even though the renderer is provider-agnostic
- **Lock-in risk:** low — output is plain HTML
- **EU residency / GDPR:** in-house = your own infra; **no tracking pixel is
  ever emitted unless one is written into the template**, which is the §14
  property
- **Compliance:** the unsubscribe link, sender identity and postal address live
  in one shared footer component that every issue composes — §14's "cannot be
  edited out" becomes a structural fact
- **Brief signal:** §12 _"Her branding is the template, not an option."_

### Candidate 2: In-repo (MJML)

- **Deployment:** in-repo
- **In-house feasibility:** Rung **in-repo**, same argument, different syntax —
  MJML is a purpose-built email markup language compiled to table HTML, and is
  the stack-agnostic option if the backend is not React (§8 leaves the backend
  language open)
- **Signup:** N/A — in-repo (https://mjml.io/)
- **Pricing tier:** $0 forever (MIT)
- **Credentials emitted after signup:** none — in-repo
- **SDK maturity:** mature and stable; official Node compiler, community Python
  bindings
- **Lock-in risk:** low — output is plain HTML
- **EU residency / GDPR:** in-house = your own infra
- **Compliance:** as Candidate 1
- **Brief signal:** §12, as above

### Candidate 3: Vendor template builder (Resend Broadcasts editor / Mailchimp templates)

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor**, and it inverts the brief. A
  drag-and-drop builder makes the branding editable by definition; §12 exists to
  remove that capability. Listed so the rejection is explicit.
- **Signup:** as the broadcast provider
- **Pricing tier:** included in the broadcast plan
- **Credentials emitted after signup:** as the broadcast provider
- **SDK maturity:** N/A — a GUI
- **Lock-in risk:** high — the template lives in the vendor's account, cannot be
  version-controlled, and cannot be asserted on in a §17 test
- **EU residency / GDPR:** as the broadcast provider
- **Compliance:** vendors do enforce an unsubscribe link, but the rest of §14's
  footer requirements become a thing the owner must not delete
- **Brief signal:** §12 rules it out

**Comparison:** 1 and 2 differ only by the host language. 3 is cheaper in
build effort and forfeits the §12 guarantee and the §17 test.

---

## Category: image-processing

§12: uploads are "cropped to the target ratio for their slot and given a palette
treatment so anything the owner adds lands inside the site's visual world."
§13: "Images are re-encoded on the server rather than stored as received."

### Candidate 1: In-house (sharp / libvips in the upload route)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — this is the rung the brief's own
  requirement forces. Crop-to-ratio is generic and every vendor does it; the
  **palette treatment** is bespoke to this brand's plum-and-gold world and no
  vendor ships "make it look like my site". sharp exposes the needed primitives
  directly (`resize` with `fit: cover` for the ratio; `modulate`, `tint`,
  `linear` and duotone via `recomb`/composite for the treatment), and doing it in
  the upload route satisfies §13's re-encode requirement in the same pass, plus
  magic-byte validation before decode.
- **Signup:** N/A — in-house (https://sharp.pixelplumbing.com/)
- **Pricing tier:** $0 forever (Apache-2.0)
- **Credentials emitted after signup:** none — in-house
- **SDK maturity:** mature — the de-facto Node image library; prebuilt libvips
  binaries; Python equivalent is Pillow/pyvips
- **Lock-in risk:** low
- **EU residency / GDPR:** in-house = your own infra; the image never leaves the
  request
- **Compliance:** re-encoding strips EXIF (including GPS) by default, which
  matters when the owner uploads phone photographs
- **Brief signal:** §12 _"This is what stops one phone snapshot destroying the
  design."_ §13 _"Images are re-encoded on the server rather than stored as
  received."_
- **Caveat to price in:** sharp's native binary is size-sensitive in serverless
  bundles and processing a 12-megapixel upload has a memory and duration cost —
  relevant to the `hosting-deploy` pick, not to whether the rung is right.

### Candidate 2: Cloudinary

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor** — buys a transformation URL API and
  a CDN; the bespoke palette treatment would be approximated with its effect
  chain (`e_tint`, `e_art`) rather than authored
- **Signup:** https://cloudinary.com/users/register_free
- **Pricing tier:** free 25 credits/month, where 1 credit = 1 GB storage **or**
  1 GB delivered bandwidth **or** 1,000 transformations; ~$0.40/credit on paid
  plans, so delivery is roughly $0.40/GB
  <!-- NEEDS CLARIFICATION: Cloudinary credit figures are third-party-sourced (theimagecdn.com, agentdeals.dev); verify at cloudinary.com/pricing. -->
- **Credentials emitted after signup:** `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (or a single
  `CLOUDINARY_URL=cloudinary://…`)
- **SDK maturity:** mature — SDKs in every major language, Next.js component
- **Lock-in risk:** **high** — transformation URLs are embedded throughout the
  markup; migrating means rewriting every image reference
- **EU residency / GDPR:** EU storage region available on paid plans
  <!-- NEEDS CLARIFICATION: which Cloudinary plan unlocks EU region was not verified. -->
- **Compliance:** SOC 2, published DPA
- **Brief signal:** —

### Candidate 3: imgproxy (self-hosted)

- **Deployment:** self-hosted (single Go binary, MIT for the OSS build)
- **In-house feasibility:** Rung **self-hosted** — signed-URL on-the-fly
  transformation in front of the object store; strong when many derivative sizes
  are needed on demand, weaker here because §12 wants processing to happen
  **once, at upload**, so the stored asset is already inside the visual world
- **Signup:** N/A — self-hosted (https://imgproxy.net/)
- **Pricing tier:** $0 for the OSS build; imgproxy Pro is a paid licence for
  advanced features
  <!-- NEEDS CLARIFICATION: imgproxy Pro licence price not fetched this session. -->
- **Credentials emitted after signup:** `IMGPROXY_KEY`, `IMGPROXY_SALT` (URL
  signing — self-generated, not vendor-issued)
- **SDK maturity:** N/A — a URL contract, not an SDK
- **Lock-in risk:** low
- **EU residency / GDPR:** self-hosted = your own infra
- **Compliance:** strips metadata by default
- **Brief signal:** —

**Comparison:** the palette treatment is the discriminator. It is the one
transformation in §12 that is specific to this brand, and Candidate 1 is the
only option where it is authored rather than approximated. Candidates 2 and 3
are stronger on CDN delivery, which this project — six plates and occasional
uploads — does not obviously need.

---

## Category: hosting-deploy

### Candidate 1: Vercel

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only** — nobody builds hosting
- **Signup:** https://vercel.com/signup
- **Pricing tier:** Hobby $0 but **non-commercial use only**, verbatim: _"the
  Hobby plan restricts users to non-commercial, personal use only"_. Pro **$20
  per developer seat/month**; viewer seats free.
  ([plans](https://vercel.com/docs/plans/hobby))
- **Credentials emitted after signup:** `VERCEL_TOKEN` (CI deploys),
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; app secrets are set as project env vars
  rather than issued
- **SDK maturity:** mature — first-class Next.js support; `vercel` CLI stable
- **Lock-in risk:** medium — ISR/revalidation semantics (§7 wants public pages
  "statically rendered or cached with revalidation") and image optimisation are
  Vercel-shaped; a Next app moves elsewhere but not for free
- **EU residency / GDPR:** functions can be pinned to a region including
  `lhr1` (London) and `fra1`; Vercel is a US company with a published DPA
  <!-- NEEDS CLARIFICATION: whether function-region pinning is Pro-and-above was not verified this session. -->
- **Compliance:** SOC 2 Type II, ISO 27001, published DPA and subprocessor list
- **Brief signal:** §8 _"Vercel for both web surfaces."_
- **Consequences to carry:** per-minute cron requires Pro (see
  `scheduled-jobs`); serverless functions have no shared in-process memory, so
  rate limiting needs an external store (see `rate-limit-store`).

### Candidate 2: Cloudflare (Workers + Pages)

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only**
- **Signup:** https://dash.cloudflare.com/sign-up
- **Pricing tier:** Workers free plan exists with daily request limits; Workers
  Paid is $5/month
  <!-- NEEDS CLARIFICATION: current Workers free-plan daily request cap and whether Cron Triggers are available on the free plan were not confirmed — the fetched Cron Triggers doc explicitly does not state free-plan availability. -->
- **Credentials emitted after signup:** `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`
- **SDK maturity:** maturing — `wrangler` is stable, Next-on-Workers support has
  improved but is a smaller-trodden path than Vercel's; sharp's native binary is
  a known friction point on the Workers runtime
- **Lock-in risk:** medium — Workers KV/D1/R2 bindings are Cloudflare-shaped
- **EU residency / GDPR:** Cloudflare offers regional services and EU
  jurisdiction options; UK/EU DPA published
- **Compliance:** SOC 2 Type II, ISO 27001, published DPA
- **Brief signal:** — (but it is the cheapest path to per-minute cron, and R2
  sits in the same account as `media-hosting` Candidate 1)

### Candidate 3: Railway / Render / Fly.io (one always-on container)

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only** for the platform; the shape
  change is that the app is one long-running process rather than functions
- **Signup:** https://railway.app/ · https://render.com/ · https://fly.io/
- **Pricing tier:** small always-on instances typically £5–15/month at this size
  <!-- NEEDS CLARIFICATION: none of the three providers' 2026 instance pricing was fetched this session; verify before comparing against Vercel Pro's $20. -->
- **Credentials emitted after signup:** provider API token plus the app's own
  env vars; no special deploy credentials in the common Git-push flow
- **SDK maturity:** N/A — container platforms; Node/Python deploy from a
  Dockerfile or buildpack
- **Lock-in risk:** **low** — a container runs anywhere
- **EU residency / GDPR:** all three offer EU/London regions
  <!-- NEEDS CLARIFICATION: per-provider London region availability not verified. -->
- **Compliance:** varies by provider; Render and Fly publish DPAs
- **Brief signal:** — but §8's "possible for one person to maintain" cuts both
  ways: one process is fewer moving parts, at the cost of losing Vercel's
  preview deployments, which §18 relies on for "E2E against a preview
  deployment"
- **Consequences to carry:** in-process `node-cron` and in-process rate limiting
  become viable, collapsing two categories below into zero extra services.

**Comparison:** Vercel is the brief's pick and costs $20/month once commercial
use is honoured; that $20 also buys the per-minute cron §13 needs, so it is not
purely overhead. Cloudflare is cheaper and less trodden for this stack.
Candidate 3 is the only option that removes services rather than adding them,
and the only one that gives up preview deployments. Netlify sits close to
Vercel on shape and was not separately researched.

---

## Category: managed-postgres

### Candidate 1: Neon

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only** — a sole operator should not
  run Postgres backups
- **Signup:** https://console.neon.tech/signup
- **Pricing tier:** Free — 0.5 GB storage per project, 100 CU-hours per project,
  5 GB egress, no card. Launch and Scale are hourly-metered with **no monthly
  minimum**: Launch compute $0.106/CU-hour, Scale $0.222/CU-hour, storage
  $0.35/GB-month, extra branches $1.50/branch-month.
  ([pricing](https://neon.com/pricing))
- **Credentials emitted after signup:** `DATABASE_URL`
  (`postgresql://<user>:<password>@<endpoint>.eu-west-2.aws.neon.tech/<db>?sslmode=require`)
- **SDK maturity:** mature — plain Postgres wire protocol, so Prisma/Drizzle/
  SQLAlchemy all work unchanged; a serverless HTTP driver exists for edge
  runtimes
- **Lock-in risk:** **low** — it is Postgres; `pg_dump` moves it
- **EU residency / GDPR:** AWS **London `eu-west-2`** is generally available, so
  data can stay in the UK ([regions](https://neon.com/docs/introduction/regions))
- **Compliance:** SOC 2 Type II, ISO 27001, published DPA
- **Brief signal:** §8 _"Managed Postgres (Neon or Supabase) for data."_
- **Property that matters here:** database branching gives §8's dev/production
  split without a second paid project, and scale-to-zero suits a site that is
  quiet at 3am.

### Candidate 2: Supabase

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only**
- **Signup:** https://supabase.com/dashboard/sign-up
- **Pricing tier:** Free $0 — 500 MB database, 1 GB file storage, 5 GB egress,
  2 active projects, and **projects pause after 1 week of inactivity** (a real
  hazard for a low-traffic site in its first weeks). Pro $25/mo — 8 GB disk then
  $0.125/GB, daily backups retained 7 days.
  ([pricing](https://supabase.com/pricing))
- **Credentials emitted after signup:** `DATABASE_URL`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **SDK maturity:** mature — Postgres wire protocol plus a first-party
  client/PostgREST layer the project may simply not use
- **Lock-in risk:** low for the database itself; medium if RLS, Storage and Auth
  are adopted together
- **EU residency / GDPR:** per-project region selection including EU/London
  <!-- NEEDS CLARIFICATION: London region availability not re-verified this session. -->
- **Compliance:** SOC 2 Type II, HIPAA on paid tiers, published DPA
- **Brief signal:** §8 names it alongside Neon
- **Property that matters here:** Pro at $25 also covers `media-hosting`, so the
  two-slot total is $25 rather than $25 + a storage bill.

### Candidate 3: Postgres bundled with the host (Railway / Render / Fly Postgres)

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor-only**; the argument is one vendor,
  one bill, one network hop
- **Signup:** as the host
- **Pricing tier:** typically a few pounds/month for a small instance
  <!-- NEEDS CLARIFICATION: per-provider Postgres pricing not fetched. -->
- **Credentials emitted after signup:** `DATABASE_URL`, usually injected
  automatically into the linked service
- **SDK maturity:** mature — standard Postgres
- **Lock-in risk:** low
- **EU residency / GDPR:** region-selectable per provider
- **Compliance:** varies; check the provider's DPA
- **Brief signal:** — (only coherent if `hosting-deploy` Candidate 3 wins)
- **Property that matters here:** backup and point-in-time-recovery guarantees
  are typically weaker than Neon's or Supabase's, which is the thing a sole
  operator is least equipped to compensate for.

**Comparison:** all three are Postgres, so migration risk is low across the
board and the decision rests on operational properties, not the query language.
Neon's free tier does not pause; Supabase's does. Supabase bundles storage;
Neon does not. Both are inside £25/month at this scale.

---

## Category: scheduled-jobs

§8: "A scheduled job runner is required — hold expiry (§13) cannot depend on
somebody loading a page. Platform cron is sufficient." What "platform cron"
means varies sharply by host, and one variant does not meet the requirement.

### Candidate 1: Vercel Cron Jobs

- **Deployment:** vendor (inherited from `hosting-deploy`)
- **In-house feasibility:** Rung **in-house logic, platform trigger** — the
  expiry routine is the project's own code in an API route; the platform only
  pulls the trigger. Do not build a scheduler.
- **Signup:** N/A — included with the Vercel project
- **Pricing tier:** included on all plans; the invocations bill as functions.
  **Hobby: 100 jobs, minimum interval once per day, ±59 min precision. Pro: 100
  jobs, minimum interval once per minute, per-minute precision.**
  ([usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing))
- **Credentials emitted after signup:** `CRON_SECRET` (self-generated; Vercel
  sends it as a bearer token so the route can reject public callers)
- **SDK maturity:** N/A — a `crons` array in `vercel.json`
- **Lock-in risk:** low — the route is ordinary HTTP; any scheduler can call it
- **EU residency / GDPR:** runs in the project's function region
- **Compliance:** the route must authenticate the caller — §13's "every mutating
  API route other than booking-create requires the session" needs an explicit
  carve-out for the cron caller, not an open endpoint
- **Brief signal:** §8 _"Platform cron is sufficient; there is no queue worth
  running at this scale."_
- **The constraint that decides it:** a 48-hour hold (§5) expiring on a
  once-daily, ±59-minute-precision trigger can sit unreleased for up to a day —
  the slot stays invisible to the next visitor for that whole window. Daily cron
  does not satisfy §13's intent. Per-minute cron requires Pro, which commercial
  use requires anyway.

### Candidate 2: Cloudflare Workers Cron Triggers

- **Deployment:** vendor
- **In-house feasibility:** Rung **in-house logic, platform trigger** — a Worker
  with a `scheduled()` handler that calls the app's expiry route; works even if
  the app itself is hosted elsewhere
- **Signup:** https://dash.cloudflare.com/sign-up
- **Pricing tier:** Workers Paid is $5/month; free-plan availability for Cron
  Triggers is not stated in the docs
  <!-- NEEDS CLARIFICATION: the fetched Cron Triggers doc says to consult the Limits page for per-Worker trigger counts and does not state free-plan availability. Verify both. -->
- **Credentials emitted after signup:** `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, plus the shared secret the Worker presents to the app
- **SDK maturity:** mature — five-field cron expressions with **minute-level
  precision**; note triggers run on **UTC** and config changes take up to 15
  minutes to propagate
  ([docs](https://developers.cloudflare.com/workers/configuration/cron-triggers/))
- **Lock-in risk:** low
- **EU residency / GDPR:** the trigger carries no personal data
- **Compliance:** as Candidate 1 — authenticate the call
- **Brief signal:** §8 "platform cron"
- **UTC note that matters:** §9 requires all computation in Europe/London stored
  as UTC. A UTC-scheduled trigger is _correct_ here and needs no DST handling —
  but any schedule expressed as a local wall-clock time (e.g. "09:00 London")
  will drift by an hour twice a year unless the job re-derives it.

### Candidate 3: GitHub Actions scheduled workflow

- **Deployment:** vendor (the repo host)
- **In-house feasibility:** Rung **in-house logic, external trigger** — a
  workflow whose only step is an authenticated `curl` to the expiry route
- **Signup:** N/A — the repository already exists
- **Pricing tier:** free for public repos; private repos draw on the account's
  included Actions minutes
  <!-- NEEDS CLARIFICATION: 2026 included-minutes figures for GitHub Free/Pro were not fetched. -->
- **Credentials emitted after signup:** none new — the shared secret goes in
  repository secrets (`CRON_SECRET`)
- **SDK maturity:** N/A — YAML
- **Lock-in risk:** low
- **EU residency / GDPR:** the trigger carries no personal data
- **Compliance:** as above
- **Brief signal:** §8 "platform cron"
- **Known weakness:** GitHub's scheduler is explicitly best-effort and
  `schedule` events are frequently delayed under load, sometimes by tens of
  minutes. Acceptable for a 48-hour hold, not for anything tighter — and it
  makes the `monitoring` heartbeat (Healthchecks.io) more valuable, not less.

**Comparison:** all three run the same in-house routine; they differ in
precision and in what they cost. The live decision is not which vendor but
whether the host's own cron clears the precision bar — on Vercel that is a plan
question, and on the always-on-container option in `hosting-deploy` the whole
category collapses into an in-process timer with no external service at all.

---

## Category: spam-guard

§13 is unusually specific: the booking endpoint must be "spam-guarded by a
method that does not depend on the visitor's eyesight or JavaScript being
enabled."

**That sentence disqualifies the entire mainstream CAPTCHA market, including the
invisible ones.** Cloudflare Turnstile "runs a series of small **non-interactive
JavaScript challenges**" — no visual puzzle, but a hard JS dependency
([Cloudflare](https://www.cloudflare.com/products/turnstile/)); documented
accessibility problems with screen readers and false positives compound it
([analysis](https://friendlycaptcha.com/insights/cloudflare-turnstile/)).
hCaptcha and reCAPTCHA are image-based and fail the eyesight clause outright.
Friendly Captcha and Altcha use invisible proof-of-work — no eyesight required,
but the proof is computed **in JavaScript**, so they fail the second clause.
There is no widely-deployed vendor CAPTCHA that clears both.

### Candidate 1: In-house (honeypot + time-trap + server-side validation, layered with rate limiting and double opt-in)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — forced by the requirement, and
  cheap. The layers: a `<input>` decoy hidden by CSS that must arrive empty
  (works with JS off, invisible to screen readers when correctly marked
  `aria-hidden` + `tabindex="-1"` + `autocomplete="off"`); a signed, timestamped
  hidden token that rejects submissions faster than a human could type or older
  than a session; strict server-side schema validation against the live Offering
  set (§13 already requires "a request must name a real, active Offering"); and
  per-IP/per-email rate limits. For `/subscribe`, §14's **double opt-in is
  itself the primary anti-abuse control** — an unconfirmed address receives
  exactly one email, ever, so a spam-cannon submission costs the attacker
  nothing and gains them nothing.
- **Signup:** N/A — in-house
- **Pricing tier:** $0 forever
- **Credentials emitted after signup:** none — in-house (`FORM_TOKEN_SECRET` is
  self-generated)
- **SDK maturity:** N/A — in-house
- **Lock-in risk:** low
- **EU residency / GDPR:** in-house = your own infra; **no visitor data is sent
  to a third party**, which keeps §14's "shared with (nobody beyond the email
  providers)" privacy-notice line honest
- **Compliance:** satisfies §13's eyesight/JS clause and WCAG 2.2 AA by
  construction — there is no challenge to fail
- **Brief signal:** §13 _"spam-guarded by a method that does not depend on the
  visitor's eyesight or JavaScript being enabled."_ §14 _"Double opt-in… is the
  control that stops the site being used to sign up third parties."_

### Candidate 2: Akismet (server-side content classification)

- **Deployment:** vendor
- **In-house feasibility:** Rung **port+adapter** — layered _behind_ Candidate 1
  rather than instead of it. Akismet is a **server-to-server API**: the
  submitted fields plus the visitor's IP and user-agent are POSTed from the
  backend and it returns spam/ham. Nothing runs in the browser, so it clears
  both clauses of §13. It is the only mainstream commercial option that does.
- **Signup:** https://akismet.com/
- **Pricing tier:** free for personal/non-commercial sites; commercial Pro from
  ~$9.95/month billed annually (1 site, ~500 checks/month); Business ~$49.95/mo
  <!-- NEEDS CLARIFICATION: Akismet figures are third-party-sourced (Capterra, G2, usebouncer) rather than akismet.com/pricing, which was not fetched. A commercial practice site is not eligible for the personal free tier — verify the tier and the monthly check allowance before relying on it. -->
- **Credentials emitted after signup:** `AKISMET_API_KEY`
- **SDK maturity:** mature and long-stable REST API; community clients in every
  language; the API itself has barely changed in fifteen years
- **Lock-in risk:** low — one call at one place in the request path
- **EU residency / GDPR:** **this is the cost.** Submission content plus the
  visitor's IP is transmitted to Automattic (US). §14's privacy notice says data
  is shared with "nobody beyond the email providers" — adopting Akismet makes
  that sentence inaccurate and adds a subprocessor that must be disclosed.
  <!-- NEEDS CLARIFICATION: whether Akismet's DPA and its UK-transfer mechanism are acceptable to the client is a decision, not a research finding. -->
- **Compliance:** Automattic publishes a DPA; the disclosure obligation above is
  the live issue
- **Brief signal:** — (compatible with §13's constraint; in tension with §14's
  privacy-notice wording)

### Candidate 3: Cloudflare Turnstile — **listed as disqualified, not as an option**

- **Deployment:** vendor
- **In-house feasibility:** N/A — the requirement excludes it
- **Signup:** https://dash.cloudflare.com/ (Turnstile is free)
- **Pricing tier:** free for the standard widget
- **Credentials emitted after signup:** `TURNSTILE_SITE_KEY`,
  `TURNSTILE_SECRET_KEY`
- **SDK maturity:** mature — widget script plus a server-side siteverify call
- **Lock-in risk:** low
- **EU residency / GDPR:** Cloudflare markets Turnstile as privacy-preserving
  and cookie-free, which is genuinely better than reCAPTCHA
- **Compliance:** **fails §13** — the challenge is JavaScript; a visitor with JS
  disabled cannot submit the form at all. Documented screen-reader and
  false-positive problems compound the §2 accessibility floor and the
  35–65 audience note.
- **Brief signal:** §13 excludes it. Recorded here so the architect does not
  re-derive Turnstile as the obvious default and quietly drop the constraint.

**Comparison:** Candidate 1 is the only one that fully satisfies §13 on its own
and is free. Candidate 2 raises the ceiling against determined abuse and costs
a subprocessor disclosure plus ~£8/month. Candidate 3 is the market default and
is ruled out by the brief; a fourth pattern — an email-confirmation step on the
booking request, mirroring the newsletter's double opt-in — is worth the
architect's consideration but conflicts with §15's "under 60 seconds and ≤3
clicks" booking-friction metric.

---

## Category: rate-limit-store

§13 requires rate limiting in four distinct places: booking by IP, subscribe
"harder than the booking form", holds by IP **and by email** with a cap on
number, and login by IP **and by account**. On serverless there is no shared
in-process memory, so the counter needs somewhere to live.

### Candidate 1: In-house (Postgres counter table)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — the database is already there,
  already in the request path, and already transactional. A small
  `rate_limit(key, window_start, count)` table with an upsert, plus a periodic
  sweep on the same cron that expires holds. §13's **per-email hold cap** in
  particular is not a generic IP counter — it is a query over the project's own
  `BookingRequest` rows, which no external rate limiter can see. Half the
  requirement is inherently in-database.
- **Signup:** N/A — in-house
- **Pricing tier:** $0 forever (uses the existing database)
- **Credentials emitted after signup:** none — in-house
- **SDK maturity:** N/A — in-house
- **Lock-in risk:** low
- **EU residency / GDPR:** in-house = your own infra; IP addresses are personal
  data and stay inside the project's own database with the same retention policy
  as everything else
- **Compliance:** §14's retention rules apply to stored IPs — a sweep that
  deletes expired windows is both a performance measure and a minimisation one
- **Brief signal:** §13's four rate-limit requirements; §8 _"there is no queue
  worth running at this scale"_ argues the same way about a second datastore
- **Cost to price in:** a database write on every public request. At this
  project's traffic that is negligible; at scale it would not be.

### Candidate 2: Upstash Redis

- **Deployment:** vendor
- **In-house feasibility:** Rung **port+adapter** — the purpose-built shape;
  `@upstash/ratelimit` implements sliding-window and token-bucket over HTTP,
  which works from serverless functions without connection pooling
- **Signup:** https://console.upstash.com/
- **Pricing tier:** free tier with a daily command allowance, then per-request
  pricing
  <!-- NEEDS CLARIFICATION: Upstash's 2026 free-tier command allowance and per-request rate were not fetched this session; verify at upstash.com/pricing. -->
- **Credentials emitted after signup:** `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`
- **SDK maturity:** mature — `@upstash/ratelimit` is the de-facto Next.js
  serverless rate limiter
- **Lock-in risk:** low — Redis semantics; swappable for any Redis
- **EU residency / GDPR:** EU regions (Frankfurt, Ireland) selectable at
  database creation
  <!-- NEEDS CLARIFICATION: London region availability not verified. -->
- **Compliance:** SOC 2, published DPA; note that IP-derived keys transit to a
  third party, so the §14 privacy notice needs the same treatment as Akismet
- **Brief signal:** — (§8 implies "no extra services" without naming this one)

### Candidate 3: Host-native edge rate limiting (Vercel WAF / Cloudflare Rate Limiting Rules)

- **Deployment:** vendor
- **In-house feasibility:** Rung **vendor** — configured, not coded; runs at the
  edge before the function is invoked, so it also protects against the cost of
  abuse, not just its effect
- **Signup:** included with the host account
- **Pricing tier:** Vercel WAF custom rules — up to 3 on Hobby, up to 40 on Pro
  ([plans](https://vercel.com/docs/plans/hobby)); Cloudflare rate-limiting rules
  are available from the free plan with limits
  <!-- NEEDS CLARIFICATION: Cloudflare's free-plan rate-limiting rule allowance was not verified. -->
- **Credentials emitted after signup:** none — dashboard/`vercel.json`
  configuration, no env var
- **SDK maturity:** N/A — declarative rules
- **Lock-in risk:** medium — rules are host-specific and do not travel
- **EU residency / GDPR:** handled by the host, which is already a processor
- **Compliance:** cannot express §13's **per-email** or **per-account** limits —
  the edge sees IPs and paths, not the request body's semantics. It is a
  complement to Candidate 1, never a replacement.
- **Brief signal:** §13's per-IP requirements only

**Comparison:** Candidate 1 covers all four of §13's rate-limit requirements
with no new service; Candidate 2 is faster and adds a vendor and a disclosure;
Candidate 3 covers only the IP-shaped half but does it before the request costs
anything. They are stackable, and the always-on-container host option makes an
in-memory limiter viable for the IP-shaped half at zero cost.

---

## Category: rich-text-block-editor

§11: the newsletter body is "built from a small **fixed** set of blocks
(paragraph, heading, image, button, and an upcoming-offerings block that pulls
live dates in)". §5 and §12 apply the same fixed-structure logic to the seven
landing beats: eyebrow, heading, body, image — no styling controls.

### Candidate 1: In-house (fixed block list + plain fields)

- **Deployment:** in-house
- **In-house feasibility:** Rung **in-house** — the brief specifies a closed set
  of five block types, one of which (`upcoming-offerings`) is a **live data
  reference**, not text, and cannot exist in any general-purpose rich-text
  document model without a custom node anyway. A block is a row with a `type`, an
  `order` and a small typed payload; the editor is an add/reorder/remove list of
  typed field groups. The landing beats need even less: four plain fields per
  beat with no formatting at all, because §5 forbids styling control. Adding a
  rich-text framework buys formatting the brief has deliberately removed.
- **Signup:** N/A — in-house
- **Pricing tier:** $0 forever
- **Credentials emitted after signup:** none — in-house
- **SDK maturity:** N/A — in-house
- **Lock-in risk:** low — blocks are JSON in the project's own database
- **EU residency / GDPR:** in-house = your own infra
- **Compliance:** rendering a closed block set to email HTML means §17's "every
  rendered issue contains an unsubscribe link and the sender identity" assertion
  runs against fully predictable markup; arbitrary rich text would also demand
  sanitisation on the way into the email template
- **Brief signal:** §11 _"a small fixed set of blocks"_; §12 _"Her branding is
  not authored here — it is the template."_
- **Sizing note:** if the paragraph block needs bold/italic/link inline, that
  is a contained sub-problem — a constrained inline toolbar over a
  `contenteditable`, or Candidate 2 configured down to three marks — not a
  reason to adopt a document model for the whole editor.

### Candidate 2: Tiptap

- **Deployment:** in-repo library (with an optional paid cloud platform this
  project does not need)
- **In-house feasibility:** Rung **in-repo library** — headless, so it can be
  configured down to exactly the permitted marks and custom nodes; the
  `upcoming-offerings` block would be a custom node. The honest tradeoff is that
  a ProseMirror document model is a large dependency for five block types, and
  its natural gravity is toward _more_ formatting freedom, which §5 spends its
  whole argument removing.
- **Signup:** N/A for the editor — https://tiptap.dev/ for the optional platform
- **Pricing tier:** editor is **MIT and free**; ten formerly-Pro extensions were
  open-sourced in June 2025. The paid Platform (Starter $49/mo, Team $149/mo) is
  for cloud-stored collaborative documents and is **not required** for
  self-hosted local editing.
  ([pricing](https://tiptap.dev/pricing) ·
  [release notes](https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap))
- **Credentials emitted after signup:** none for the MIT editor; a Platform
  token only if cloud features are adopted
- **SDK maturity:** mature — large ecosystem, React/Vue bindings, well-documented
  extension API
- **Lock-in risk:** low — output is JSON or HTML the project owns
- **EU residency / GDPR:** in-repo = your own infra (unless the cloud Platform
  is adopted)
- **Compliance:** rich-text output requires sanitisation before it reaches the
  email template
- **Brief signal:** —

### Candidate 3: Lexical

- **Deployment:** in-repo library
- **In-house feasibility:** Rung **in-repo library** — Meta's editor framework;
  strong accessibility posture out of the box, which is relevant to §2's WCAG
  2.2 AA floor since the owner uses this editor too
- **Signup:** N/A — in-repo (https://lexical.dev/)
- **Pricing tier:** $0 forever (MIT)
- **Credentials emitted after signup:** none — in-repo
- **SDK maturity:** maturing — stable and actively developed, smaller ecosystem
  than Tiptap and a steeper custom-node API
- **Lock-in risk:** low — serialises to JSON the project owns
- **EU residency / GDPR:** in-repo = your own infra
- **Compliance:** as Candidate 2
- **Brief signal:** —

**Comparison:** the discriminator is how much formatting freedom the brief
permits, and the answer is almost none — §5 removes styling control on purpose,
and §15 measures whether the owner can send an issue in under fifteen minutes,
which argues for fewer choices in front of her rather than more. Candidates 2
and 3 are both free and both capable; they are relevant if the paragraph block
turns out to need real inline formatting, and over-scoped if it does not.

---

## Open Questions

<!-- NEEDS CLARIFICATION: Vercel Hobby is non-commercial-only. Does the client accept the $20/month Pro floor, or should the architect price Cloudflare/Railway alternatives before Gate 5? The same $20 is what makes §13's hold-expiry cron precise enough to meet its own intent, so it is not separable from the feature. -->

<!-- NEEDS CLARIFICATION: §8 asks for "one email provider covering both lanes". Resend and Postmark can both do it; SES cannot without the application supplying all list mechanics. If two providers are chosen instead, SPF's 10-lookup limit and two authenticated subdomains need planning before the first send. -->

<!-- NEEDS CLARIFICATION: if Resend wins the broadcast slot, does the send path use Resend Audiences (vendor holds a synced copy of the list) or the batch send API driven from the project's own Subscriber table? §9's "owns the suppression list absolutely" points at the latter; the former is what Resend's Broadcasts UI assumes. This is an architect decision with a §17 test consequence. -->

<!-- NEEDS CLARIFICATION: adopting Akismet (spam-guard Candidate 2) or Upstash (rate-limit-store Candidate 2) adds a subprocessor that receives visitor IPs. §14's privacy notice currently promises data is shared with "nobody beyond the email providers". Either the vendor is declined or the notice is amended — the client should decide which. -->

<!-- NEEDS CLARIFICATION: brief §20 open question 10 (a postal or contactable business address for the newsletter footer) is a real recurring cost — a PO box or registered-office service — and is a hard §14 requirement before Milestone 3 ships. No vendor in this menu removes it. -->

<!-- NEEDS CLARIFICATION: Sentry's EU data region is selected at organisation creation and is not changeable afterwards. If UK/EU residency for error payloads matters, the decision must be made before the account exists, not at Gate 5. -->

**On the explicitly-excluded categories.** None of `payments`, visitor `auth`,
`analytics` or external calendar sync is unavoidable in v1. Payments in
particular are load-bearing for §19's Milestone 4 (capacity enforcement only
becomes meaningful once money reserves a place) but genuinely absent from
Milestones 1–3, because §5's BookingRequest deliberately promises nothing and
takes nothing. The one thing worth noting now rather than at Milestone 4: any
provider chosen for `bulk-broadcast-email` or `media-hosting` should not be one
whose pricing model changes character once a payment flow exists.

<!-- integrationsResearched: 15 -->
