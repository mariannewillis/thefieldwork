# Navigation Schema — webapp

Six sections across the seventeen public screens. Derived from brief §10's route
table (public half only); the header/footer shapes are inferred — see the
clarification at the foot of this file and in `flows.md`.

**Two reading notes before the YAML:**

1. **`footer.variant: hidden` does not mean "there is no footer".** In this
   schema `footer` describes a mobile-style tab bar, and a public marketing
   site has none. Every screen here carries a **site footer** — a real,
   designed component listing contact, social links, the newsletter route, and
   the privacy notice §14 requires. It is modelled as the `site-footer`
   component in `screens.json`, not as a `footer` navigation variant.
2. **`sidemenu.visible: false` everywhere.** There is no persistent side
   navigation on this surface. The small-width collapse of the header into a
   drawer is responsive behaviour of the header itself, carried as the
   `nav-drawer` component and the `menu` icon — not a sidemenu.

```yaml
sections:
  - id: landing
    header:
      variant: transparent
      actions:
        [
          nav-services,
          nav-workshops,
          nav-courses,
          nav-about,
          nav-contact,
          cta-request-a-place,
        ]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - home

  - id: offerings
    header:
      variant: standard
      actions:
        [
          nav-services,
          nav-workshops,
          nav-courses,
          nav-about,
          nav-contact,
          cta-request-a-place,
        ]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - services-index
      - service-detail
      - workshops-index
      - workshop-detail
      - courses-index
      - course-detail

  - id: practice
    header:
      variant: standard
      actions:
        [
          nav-services,
          nav-workshops,
          nav-courses,
          nav-about,
          nav-contact,
          cta-request-a-place,
        ]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - about
      - contact
      - privacy-notice

  - id: booking
    header:
      variant: minimal
      actions: [back-to-offering]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - booking-request
      - booking-confirmation

  - id: newsletter
    header:
      variant: minimal
      actions: [nav-home]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - subscribe
      - subscribe-pending
      - subscribe-confirmed
      - unsubscribe

  - id: documents
    header:
      variant: minimal
      actions: [nav-home]
    footer:
      variant: hidden
    sidemenu:
      visible: false
    screens:
      - document-download
```

## Per-screen overrides

Three screens override their section default. Each override is a decision, not
a drift:

| Screen                 | Section    | Override                                                   | Why                                                                                                                                                                                                                 |
| ---------------------- | ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscribe`            | newsletter | `header.variant: standard`, full nav + CTA                 | It is a **public marketing page** reachable from the home Crown beat, the footer, and every index empty state — not a token-landing page like its three siblings. A visitor arriving here has somewhere else to go. |
| `booking-confirmation` | booking    | `header.actions: [nav-home]` instead of `back-to-offering` | There is nothing to go back to. The request is submitted; "back to the offering" would invite a duplicate submit, which §11 names as a state to design against.                                                     |
| `home`                 | landing    | `header.variant: transparent`                              | §11 puts the whole proposition in one scroll and §20 anchors Beat 1 on `aura-two-people`. A transparent header lets the Root beat's image carry the first viewport. Gate 2 may overrule this per direction.         |

## Navigation rules that are not header/footer state

These bind the builders and are not expressible in the YAML above:

- **The header CTA (`cta-request-a-place`) needs a target when no Offering is
  in context.** From `home`, `about`, `contact` and the index screens there is
  no single Offering to book. It routes to the products block on `home` when
  one exists, and to `contact` when the catalogue is empty. It must never route
  to a bare `/book/` with no kind and no slug — §13 requires every request to
  name a real, active Offering.
- **`back-to-offering` on `booking-request` is a real route, not
  `history.back()`.** The visitor may have arrived from a shared link and have
  no history. It resolves from the `[kind]` and `[slug]` params.
- **Six states across the site route to `contact`** — empty index, no free
  slots, offering withdrawn, spam-guard rejection, document link expired,
  unsubscribe failure. `contact` is a load-bearing destination on this surface,
  not a courtesy page.
- **The site footer carries the privacy-notice link on every screen** (§14),
  routing to `privacy-notice` at `/privacy`. `booking-request` and `subscribe`
  link to it a second time from inside the form itself, which is what §14
  requires — the notice must be reachable at the moment of collection, not only
  from the footer.
- **Token-landing screens (`subscribe-confirmed`, `unsubscribe`,
  `document-download`) must be navigable with no session and no account**, from
  a mail client, in a browser that has never seen the site. Nothing in their
  chrome may assume prior state.

<!-- NEEDS CLARIFICATION: the public header and footer composition is inferred, not specified. Brief §10 supplies routes only and §11 describes screens without describing chrome. Inferred as a persistent top header carrying the five public destinations plus one request-a-place CTA, collapsing to a drawer at small widths, over a site footer carrying contact details, social links, the newsletter route and the privacy notice. Source for the pattern: the common shape across the researched practitioner set — see competitors.md "UX Patterns in This Category" (Blossom Reiki, Omnes Healing, Re:Mind Studio all run a variant of it). -->

## Two screens serve two routes each

`screens.json` carries one `routePattern` string per screen. Two screens on this
surface legitimately answer on two routes, and the second route is recorded in
the screen's `description` rather than being modelled as a separate screen:

| Screen                 | `routePattern`      | Also serves            | Why one screen                                                                                                                                                                      |
| ---------------------- | ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscribe`            | `/subscribe`        | `/subscribe/:formSlug` | §10: the named forms of §12 are the same screen with different framing copy and, optionally, an attached Document. Bare `/subscribe` is the default form. **One screen, not many.** |
| `booking-confirmation` | `/book/thanks/:ref` | —                      | Route changed from the parameterless `/book/thanks`; `ref` is unguessable and non-sequential, and the page is `noindex` + no-store.                                                 |

Both token-and-reference routes must fail closed on an unknown, stale or guessed
value. `booking-confirmation` in particular shows the visitor their own
submission and nothing else — an enumerable confirmation page would expose other
people's names and held times.
