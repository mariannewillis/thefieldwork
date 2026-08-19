/**
 * The contact page's words — the editable surface, same rule as
 * `content/about.ts` and `content/home.ts`.
 *
 * ═══ WHAT IS DELIBERATELY NOT HERE ════════════════════════════════════════
 * The approved screen (docs/screens/webapp/contact.html) carried three direct
 * contact details, and two of them are not this practice's:
 *
 *  · A MOBILE NUMBER — 07817 664 925, with "text before you call". It appears
 *    nowhere else in the brief, the app or the database. brief §4 gives
 *    SiteSettings a contact phone field; nobody has filled it in. Publishing a
 *    sole practitioner's mobile number on a guess is not a design decision.
 *  · AN INSTAGRAM ACCOUNT — @thefieldwork.ldn. Same: unattested anywhere else,
 *    and the handle says London.
 *  · "A five-minute walk from the Overground, in north London." The practice is
 *    in FROME, SOMERSET — `siteFooter.place`, both email sign-offs, the
 *    newsletter footer and the seeded Garden Room all say so. The screen's
 *    location is left over from somewhere else and would have put the wrong
 *    county on the one page whose whole job is telling somebody where she is.
 *
 * So the page ships with the one address that IS attested — her mailbox, which
 * `lib/email/index.ts` already defaults EMAIL_REPLY_TO to — plus the form. When
 * she supplies a number or a social account, add them to `direct` below and
 * they appear in the list; nothing else changes.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * NO TIMESCALE IS PROMISED ANYWHERE ON THIS PAGE. The screen said "usually the
 * same evening, always within a day". Nothing in this app can keep that: there
 * is no rota, no queue, no escalation, and one person who may be in the room
 * with somebody. A promise the software cannot honour is the one kind of
 * sentence brief §1.3 rules out — "prefer honesty over persuasion where they
 * diverge". What replaces it says what IS true: it reaches her own mailbox and
 * she answers it herself.
 */

import { opening, type Plate } from "@/content/home";

/**
 * Her mailbox, as the public page prints it.
 *
 * The same address `lib/email/index.ts` falls back to for EMAIL_REPLY_TO and
 * `lib/email/service-requests.ts` for EMAIL_TO_OWNER — but stated here rather
 * than imported from either, because those two are SERVER config that a
 * deployment may point at a sink, and this is the address on the page. A
 * preview pointing its mail at a test inbox must not silently reprint that
 * inbox as her public contact address.
 */
export const CONTACT_EMAIL = "marianne@thefieldwork.co.uk";

export const contact = {
  meta: {
    title: "Contact — The Field Work",
    description:
      "Write to Marianne. A message goes to her own mailbox and she answers it herself — or use the address directly if you would rather not fill in a form.",
  },

  /** ═══ BEAT 1 — direct contact. Small pool, anchored left, on the hero. ═══ */
  direct: {
    plate: opening(0.5) satisfies Plate,
    eyebrow: "Ask a question",
    heading: "Write to her directly.",
    body: "No booking system stands between you and Marianne. A message goes straight to her, and she is the one who reads it.",
    /** The no-form path, for the people brief §11 says this page is for. */
    emailLabel: CONTACT_EMAIL,
    emailHref: `mailto:${CONTACT_EMAIL}`,
    place: "The Field Work · Frome, Somerset",
    formLinkLabel: "Or write to her here",
  },

  /** ═══ BEAT 2 — what to know, then the form. The widest pool. ═══ */
  before: {
    plate: {
      src: "aura-field-abstract",
      alt: "An abstract field of gold and magenta light, no figure in it.",
      b: 0.44,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "Before you write",
    heading: "Three things worth knowing first.",
    facts: [
      {
        label: "Where the work happens",
        body: "Frome, in Somerset — the garden room on Fromefield, step-free from the pavement, with parking two minutes' walk away. Every workshop, course and session names its own address on its own page.",
      },
      {
        label: "What happens after you send it",
        body: "It arrives in her own mailbox rather than in a queue, and she answers it herself. There is nobody else here to pass it to.",
      },
      {
        label: "Asking is not booking",
        body: "Writing here does not hold a place, a time or a price, and it starts no charge. If something suits you both, she sends the booking separately.",
      },
    ],
  },

  /** ═══ The form. Its own words, so the panel holds none of its own. ═══ */
  form: {
    title: "Write to her",
    lede: "Three fields. She reads every one of these herself.",

    nameLabel: "Your name",
    emailLabel: "Your email address",
    emailNote:
      "It is where her answer goes, and the only thing it is used for.",
    messageLabel: "What you wanted to ask",
    messageNote:
      "As short as you like. A question you are embarrassed to ask is the one worth asking here.",

    submit: "Send this to Marianne",
    sending: "Sending…",

    /**
     * §14 in one sentence, and now with the link it was always going to get.
     *
     * The sentence stood alone for the fortnight in which /privacy did not
     * exist — the note here said it would get a link the day the page was
     * built and that nothing else would change, and that is what happened
     * (2026-08-17). THE SENTENCE ITSELF IS UNCHANGED and stays on the page
     * rather than being replaced by the link: somebody about to press Send
     * should not have to open a second page to find out where their message
     * goes. The link is for the rest of it.
     */
    foot: "Your message and your address go to Marianne's own mailbox so that she can answer. They are not added to the letter, and they are not passed to anybody else.",
    footLinkLabel: "What is kept, and why",
    footLinkHref: "/privacy",

    sentTitle: "Sent.",
    sentBody:
      "It has gone to her mailbox, and a copy of what you wrote is on its way to you. She answers these herself.",
    sentCheck:
      "If the copy has not arrived in a few minutes, look in junk — it may be the first thing this address has sent you.",
    sentAgain: "Back to what is on",
    sentAgainHref: "/services",
  },
} as const;
