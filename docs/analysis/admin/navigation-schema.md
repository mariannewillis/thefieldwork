# Navigation Schema — admin

```yaml
platform: admin
layoutSkill: desktop

# NEEDS CLARIFICATION: navigation pattern inferred from the tooling half of
# competitors.md — Acuity Scheduling's practitioner console and Mailchimp's
# campaign builder (persistent left rail, thin top bar, no tab bar). brief.md
# §10 specifies routes and §11 specifies screens, but specifies NO admin chrome.
# STATUS: reviewed and ACCEPTED at the analyze gate as inferred-and-cited.
# The two structural departures from those incumbents are deliberate and
# brief-grounded, not inherited:
#   1. an ALWAYS-VISIBLE unpublished-changes indicator in the top bar on every
#      gated screen (§6: "losing work because she didn't know she had to save";
#      §11 admin-landing-sections: "must show clearly whether there are
#      unpublished changes") — the incumbents put publish state on one screen;
#   2. the rail is GROUPED into four plain-language groups rather than one flat
#      list of eleven, with the rarely-touched setup group visually quietest
#      (§11 admin-availability: "set rarely and changing it by accident would be
#      expensive"; interface-craft I-4 progressive disclosure).

defaultNavigation:
  header:
    variant: admin
    actions: [view-site, unpublished-changes, account-menu]
  footer:
    variant: hidden
  sidemenu:
    visible: true
    items:
      [
        today,
        calendar,
        requests,
        home-page,
        offerings,
        pictures,
        newsletter,
        subscribers,
        documents,
        availability,
        settings,
      ]
    activeSection: today

# The rail carries eleven items in four groups. Group labels are the rail's
# progressive-disclosure lever; the schema's items[] is flat, so the grouping
# is declared here for the layout primitive to consume.
sidemenuGroups:
  - label: Every day
    items: [today, calendar, requests]
  - label: Your site
    items: [home-page, offerings, pictures]
  - label: Your list
    items: [newsletter, subscribers, documents]
  - label: Setup
    items: [availability, settings]
    emphasis: quiet # set rarely; changing it by accident is expensive (§11)

# Rail item labels are HER words, not the data model's. She is non-technical
# (§6) and must never have to translate a noun before she can do a task.
sidemenuLabels:
  today: Today
  calendar: Calendar
  requests: Requests # BookingRequest queue — "asked for a place", never "booked"
  home-page: Home page # the seven LandingSections
  offerings: What you offer # Services, Workshops and Courses at equal billing
  pictures: Pictures # MediaAssets
  newsletter: Newsletter
  subscribers: Subscribers
  documents: Documents # PDFs
  availability: When you work # AvailabilityRules + buffer / lead time / horizon
  settings: Settings # identity, background, hold duration ONLY

# Badges are counts with a deadline, and nothing else. A badge on a surface she
# cannot act on today would train her to ignore all of them.
sidemenuBadges:
  requests: pending-request-count # §11 dashboard: "new booking requests first"

headerActions:
  view-site:
    intent: open the live public site in a new tab
    rationale: §12 draft → preview → publish — she must be able to see the real thing
  unpublished-changes:
    intent: >
      global indicator; present on every gated screen; opens the ONE publish
      confirmation. Counts pending landing-beat changes AND pending SiteSettings
      changes together, because they share a single draft/published pair.
    rationale: §6 + §11 — the stated failure mode is not knowing whether work is live
    states: [in-sync, unpublished-changes, publishing]
  save-state:
    intent: per-editor indicator; on editor screens only
    rationale: §6 — "losing work because she didn't know she had to save"
    states: [saved, saving, unsaved, save-failed]
  account-menu:
    intent: sign out
    rationale: >
      single owner account (§13); no profile, no team, no roles.
      SIGN-OUT IS A SHELL ACTION, NOT A ROUTE — there is no /admin/logout screen
      and none should be created. Signing out clears the session and lands on
      the auth section.

sections:
  - id: auth
    header:
      variant: minimal
      actions: []
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - admin-login
      - admin-forgot-password
      - admin-reset-password
    notes: >
      The ONLY ungated section. All three screens are necessarily
      unauthenticated: she cannot sign in to ask for a password reset. They
      share one chrome — brand lockup, one card, no rail, no top bar — so that
      the recovery pair reads as part of signing in rather than as an error
      surface she has been thrown out to. Every route is rate-limited (§13).
      admin-forgot-password returns the SAME acknowledgement whether or not the
      address matches an account, so the pair cannot be used to confirm the
      owner's email; that is a deliberate designed state, not an error state.

  - id: today
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: today
    screens:
      - admin-dashboard

  - id: calendar
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: calendar
    screens:
      - admin-calendar
    notes: >
      The operational heart. Month and week views live on ONE screen as a view
      switch, not as two routes — §10 gives a single /admin/calendar. Blocking
      personal time happens in place; no sub-route, no full-screen modal.

  - id: requests
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: requests
    screens:
      - admin-bookings

  - id: home-page
    header:
      variant: admin
      actions: [view-site, save-state, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: home-page
    screens:
      - admin-landing-sections
    notes: >
      Seven fixed beats on one route (§10 gives a single /admin/page). No
      per-beat route, because a beat is not a page and must never feel like one.
      No add / delete / reorder controls exist — not disabled ones, none (§5).
      Preview opens /preview/[token] in a new tab (see previewRoute below).
      Publish here is the SINGLE content publish and covers pending SiteSettings
      changes too; the confirmation itemises both.

  - id: offerings
    header:
      variant: admin
      actions: [view-site, save-state, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: offerings
    screens:
      - admin-offerings
      - admin-offering-edit
    notes: >
      One list, one editor. A Course's Sessions are edited INLINE inside
      admin-offering-edit — a Session is not separately bookable (§5) and so
      never gets a route of its own. The editor carries a back-to-list
      affordance because it is a child route (/admin/offerings/:id).

  - id: pictures
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: pictures
    screens:
      - admin-media
    notes: >
      Reached both as a rail destination and as a picker from
      admin-landing-sections / admin-offering-edit. In picker mode the rail
      stays visible but the screen returns to where she came from on choose —
      she must never be stranded in the library holding an unsaved edit.

  - id: newsletter
    header:
      variant: admin
      actions: [view-site, save-state, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: newsletter
    screens:
      - admin-newsletters
      - admin-newsletter-edit
    notes: >
      The editor is a child route (/admin/newsletters/:id). A SENT issue opens
      in the same route read-only — sent copy cannot be edited, so the screen
      offers no controls rather than disabled ones.

  - id: subscribers
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: subscribers
    screens:
      - admin-subscribers

  - id: documents
    header:
      variant: admin
      actions: [view-site, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: documents
    screens:
      - admin-documents

  - id: availability
    header:
      variant: admin
      actions: [view-site, save-state, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: availability
    screens:
      - admin-availability
    notes: >
      Owns the weekly pattern AND buffer, minimum lead time and booking horizon
      outright (brief amended): they are scheduling inputs and belong beside the
      pattern they modify — two screens owning one value is how two disagreeing
      values happen. The ONLY screen in the admin that does not autosave (§11:
      set rarely, expensive to change by accident). save-state therefore carries
      an "unsaved" state that leaving the screen warns about — deliberately, and
      uniquely here.

  - id: settings
    header:
      variant: admin
      actions: [view-site, save-state, unpublished-changes, account-menu]
    footer:
      variant: hidden
    sidemenu:
      visible: true
      items:
        [
          today,
          calendar,
          requests,
          home-page,
          offerings,
          pictures,
          newsletter,
          subscribers,
          documents,
          availability,
          settings,
        ]
      activeSection: settings
    screens:
      - admin-settings
    notes: >
      Identity, contact, bio, credentials, socials, background selection and
      HOLD DURATION ONLY. Buffer / minimum lead time / booking horizon live on
      admin-availability. SiteSettings shares the seven beats' single
      draft/published pair, so this screen shows the same global
      unpublished-changes indicator and its pending changes are itemised in the
      one publish confirmation raised from admin-landing-sections.

# Every route under /admin is gated by the owner session, enforced SERVER-SIDE
# per route, never by hiding UI (§13) — EXCEPT the three auth routes, which are
# necessarily ungated because she cannot sign in to ask for a reset.
authGate:
  gatedSections:
    [
      today,
      calendar,
      requests,
      home-page,
      offerings,
      pictures,
      newsletter,
      subscribers,
      documents,
      availability,
      settings,
    ]
  ungatedSections: [auth]
  ungatedRoutes:
    [/admin/login, /admin/forgot-password, "/admin/reset-password/:token"]
  onUnauthenticated: redirect-to-auth
  onExpiredSession: redirect-to-auth-with-expired-notice # says the session expired; never implies a wrong password
  signOut: shell-action # header account-menu; NOT a route

# Preview is a real route and belongs to the PUBLIC renderer, not the admin.
# Named here because admin-landing-sections navigates to it and must not be
# given a second, admin-side implementation of the home page.
previewRoute:
  path: "/preview/:token"
  rendersScreen: home # the webapp platform slice's screen, from DRAFT content
  token: signed · short-lived · issued by the owner session
  robots: noindex
  rationale: a preview that is not the real page is not a preview

# Icon glyphs for the rail come from assets.md §Key Icons (Lucide vocabulary).
# Two glyphs are needed beyond that file's "Admin — shell (7)" list:
#   settings      — site settings, distinct from sliders-horizontal (availability)
#   users-round   — subscribers (already present in "Admin — newsletter (4)")
railIcons:
  today: layout-dashboard
  calendar: calendar-days
  requests: inbox
  home-page: file-pen
  offerings: package
  pictures: image
  newsletter: mail-open
  subscribers: users-round
  documents: file-text
  availability: sliders-horizontal
  settings: settings
  sign-out: log-out
```
