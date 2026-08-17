/**
 * The privacy notice's words — the editable surface, same rule as
 * `content/about.ts` and `content/contact.ts`.
 *
 * ═══ THE ONE RULE THIS FILE HAS ═══════════════════════════════════════════
 * EVERY SENTENCE HERE IS A STATEMENT OF FACT ABOUT A REAL BUSINESS, and each
 * one was read out of this codebase rather than out of a template. A notice
 * that describes a practice the software does not have is not a smaller
 * problem than having no notice — it is a written claim that is untrue, made
 * to strangers, by a sole practitioner who would be the one answering for it.
 *
 * So nothing may be added here because it "usually appears in one of these",
 * and nothing may stay here once the code stops doing it. Each block below
 * names the file it was read from. If the two ever disagree, the code is right
 * and this page is wrong.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * ═══ WHAT MARIANNE MUST SUPPLY — THE PAGE IS INCOMPLETE WITHOUT IT ════════
 * Five things a lawful notice needs that CANNOT be read out of code. None of
 * them is invented here and none is guessed at: the page is written to read
 * properly without them, exactly as content/about.ts is written to work
 * without her years and content/contact.ts without her phone number. Each
 * arrives by being added below, and nothing else changes.
 *
 *  1. THE DATA CONTROLLER'S IDENTITY — the legal name she trades under and a
 *     postal address for it. The page currently names the practice and the
 *     town, which is what `siteFooter.place` has always said and is not the
 *     same thing. PECR asks every issue of the letter to carry a contactable
 *     postal address too (brief §14), so this is one fact wanted twice.
 *  2. WHETHER SHE IS REGISTERED WITH THE ICO, and the registration number if
 *     she is. Nothing in this repo knows, so nothing here says.
 *  3. RETENTION PERIODS she is willing to commit to. THE APP HAS NONE — see
 *     `keeping` below, which says so plainly rather than printing a figure.
 *     There is no scheduled job in this codebase at all.
 *  4. A CONTACT POINT FOR DATA-PROTECTION QUESTIONS. The page sends people to
 *     /contact, which reaches her own mailbox and is true. If she wants a
 *     separate address for this, it goes here.
 *  5. THE LAWFUL BASIS she relies on for each purpose. brief §14 proposes them
 *     — taking steps prior to a contract for a request, consent for the letter
 *     — but proposing is not choosing, and a basis is hers to state.
 *
 * Left out for the same reason: WHO HOSTS HER MAILBOX. D-4 records GoDaddy for
 * the domain and the mailbox; `lib/email/index.ts` calls it a Microsoft 365
 * mailbox. Those are probably two names for one arrangement and nobody has
 * confirmed which to print, so `whoElse` names only the three processors the
 * code proves.
 *
 * A COOKIE BANNER IS NOT ON THIS LIST, and its absence is a finding rather
 * than an oversight. The public site sets NO cookie — the one `cookies().set`
 * in the app is the admin session in `lib/auth/server.ts` — runs nothing
 * analytic, and loads nothing from anybody else's server. There is no consent
 * to collect, which brief §14 anticipated and this build kept true.
 * ═════════════════════════════════════════════════════════════════════════
 *
 * ═══ WHAT THE APPROVED SCREEN CLAIMED THAT THIS APP DOES NOT DO ═══════════
 * docs/screens/webapp/privacy-notice.html is the approved composition, and its
 * five beats, their order, their alternating anchor and their photographs are
 * all kept. Four of its sentences are not, because they are false here:
 *
 *  · "Two years after your last booking, then deleted." NOTHING DELETES
 *    ANYTHING ON A TIMER. `Booking`, `ServiceRequest`, `Subscriber` and
 *    `NewsletterSend` rows stay until a person removes them; `StripeEvent`'s
 *    own comment says "nothing prunes it yet". See `keeping`.
 *  · "As long as you stay subscribed, then thirty days after you leave." The
 *    opposite is true, deliberately: unsubscribing STAMPS A DATE and keeps the
 *    row, because a deleted row cannot prove somebody was taken off the list
 *    (`Subscriber` in schema.prisma; PECR reg. 22 wants evidence).
 *  · "Requesting a place asks for your name and email." No page on this site
 *    asks for either in order to book a workshop or a course — the panel asks
 *    how many places and Stripe collects the rest on its own checkout. The
 *    name-and-email form is the SESSION REQUEST, a different purpose with a
 *    different record behind it.
 *  · "A reply comes from Marianne, usually within a few days." The same
 *    promise content/contact.ts already refused, for the same reason: one
 *    person, no rota, no queue. No timescale is named on this page either.
 *
 * The screen also drew its own masthead, its own five-tab nav with a "Request
 * a place" button, and a menu button on small screens. There is one masthead
 * for this site (2026-08-15) and no menu button anywhere in it — see the note
 * on `siteNav` in content/site.ts.
 * ═════════════════════════════════════════════════════════════════════════
 */

import type { Plate } from "@/content/home";

export const privacy = {
  meta: {
    title: "Privacy — The Field Work",
    description:
      "What is collected when you book, ask for a session, write to Marianne or subscribe; which three companies see it; and how to have it back. No analytics, and no cookie on any public page.",
  },

  /** ═══ BEAT 1 — the lede. Small pool, anchored left, on the hero. ═══════ */
  intro: {
    plate: {
      src: "window-last-light",
      alt: "The last of the daylight in a window, the room around it already dark.",
      b: 0.48,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "What is kept, and why",
    heading: "No analytics, and no cookie on any page you can read.",
    /**
     * Every clause here is checkable. No `cookies().set` outside
     * `lib/auth/server.ts`; no analytics, tag manager or third-party script
     * anywhere in src/; the three typefaces are self-hosted by next/font
     * rather than fetched from Google (`workshops/layout.tsx`).
     */
    body: "There is nothing on this site counting who visits it, nothing reporting back to anybody, and no cookie set on any page you can reach without a password. The typefaces are served from here rather than fetched from somewhere else. What gets written down is what you type into a form, and the rest of this page says what happens to each of it.",
    /**
     * The date is the day the page was written and is a fact rather than a
     * flourish: a notice with no date cannot be told from a stale one. The
     * invitation to correct it is not politeness either — it is the only
     * mechanism this page has for staying true between builds.
     */
    note: "Written on 17 August 2026 from what this site's own code does. If a sentence below is not true of it, the code is right and the page is wrong — say so and it will be changed.",
  },

  /** ═══ BEAT 2 — the three public forms. Wide pool, anchored right. ═════ */
  collected: {
    plate: {
      src: "aura-field-abstract",
      alt: "An abstract field of gold and magenta light, no figure in it.",
      b: 0.44,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "What is collected",
    heading: "Three things you can do, and what each one leaves behind.",
    lede: "The monthly letter is the fourth. It asks for consent rather than for a booking, so it is kept apart from these and has its own section below.",
    purposes: [
      {
        /** `(site)/workshops`, `(site)/courses`, `lib/stripe.ts`, `Booking`. */
        label: "Booking a workshop or a course",
        body: "The page asks how many places and nothing else. Pressing the button hands you to Stripe's own checkout, where the card, your name, your email address and a billing address are typed on Stripe's page rather than on this one. What comes back and is kept here is your name, your address, how many places, what the whole thing costs, what has been paid and when, and Stripe's reference for the payment — which is what a confirmation, a place held in a room and a refund all need. No card number has ever reached this site, and the billing address is not stored here.",
      },
      {
        /** `(site)/services/actions.ts`, `ServiceRequest`. */
        label: "Asking for a one-to-one session",
        body: "The form takes your name and your email address. A phone number and anything else you want to say are yours to give or to leave blank. If you choose a time it is kept with the request and held out of her diary while she answers, so it is still there if she says yes; if the service had no times to offer, what is kept instead is the sentence you wrote about when would suit you. Her answer is written on the same record — what she agreed, at what price, and by when it has to be paid.",
      },
      {
        /** `(site)/contact/actions.ts` — no table, and that is the point. */
        label: "Writing to her",
        body: "Nothing is written down. There is no table behind the contact form: what you type becomes two emails — one to her, one back to you so that you have a copy — and then the form is finished with it. Afterwards your message is in her mailbox and in yours, like any other letter, and in neither case is it in a database here.",
      },
    ],
  },

  /** ═══ BEAT 3 — the letter. Small pool, anchored left. ═════════════════ */
  letter: {
    plate: {
      src: "aura-light-in-a-room",
      alt: "Warm light falling across an empty room.",
      b: 0.46,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "The monthly letter",
    heading: "You have to say yes twice.",
    /** `lib/newsletter/subscribers.ts` — double opt-in, and why. */
    body: "Subscribing takes your email address, and your name if you give one. Nothing is ever sent to an address that has not been confirmed, because anybody can type anybody's address into a form: a first message goes out asking you to press a link, and until you do, that is the only thing that address is ever used for.",
    facts: [
      {
        label: "What is kept",
        body: "Your address, your name if you gave one, the day you asked and the day you confirmed. The day is kept rather than a yes — a date is evidence and a yes is only a claim.",
      },
      {
        label: "And one line per letter",
        body: "Each issue writes a row saying which address it went to and whether the provider accepted it. That row holds the address as it was on the day, and it is a record of what was sent rather than a way of reaching you again.",
      },
      {
        /** No pixel and no rewritten links — verified across lib/email/. */
        label: "What is not in a letter",
        body: "No tracking pixel and no counted links. Nothing reports back whether you opened it or what you pressed.",
      },
      {
        label: "Leaving",
        body: "Every issue carries a link, and Gmail and Apple Mail show an unsubscribe control of their own beside the sender's name. One press stops it. Nothing is asked and no reason is wanted.",
      },
      {
        label: "What leaving does not do",
        body: "It does not delete the record. The date you left is stamped on it instead, because a row that has gone cannot show that somebody was taken off the list. Ask and she will remove it altogether.",
      },
    ],
  },

  /** ═══ BEAT 4 — the processors. Wide pool, anchored right. ═════════════ */
  whoElse: {
    plate: {
      src: "work-wide-the-room",
      alt: "The practice room seen wide, lamplit, with nobody in it.",
      b: 0.44,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "Who else sees it",
    heading: "Three companies, and no advertiser.",
    lede: "A practice this size does not run its own servers or its own card machine. Three companies do parts of the job, and each of them holds something as a result. They are named here because leaving them out is the commonest way a notice like this is wrong.",
    parties: [
      {
        label: "Stripe",
        body: "Takes every payment. The card is typed on Stripe's page, not on this one, and Stripe keeps its own record of what you paid.",
      },
      {
        label: "Resend",
        body: "Sends every message this site sends — the confirmation, the copy of what you wrote, the monthly letter. Your address and the words in the message pass through them to reach you.",
      },
      {
        label: "Replit",
        body: "Hosts the site, the database behind it and the photographs on it. Everything described above as written down is written down there.",
      },
      {
        label: "Nobody else",
        body: "Nothing is sold, and nothing is handed to an advertiser or a mailing list.",
      },
      {
        /** FilmEmbed.tsx and lib/maps.ts — both press-first by design. */
        label: "Nothing loads until you ask it to",
        body: "A film contacts Vimeo or YouTube only once you press play, and the line under it says whose player is about to open. An address is a plain link to a map rather than a map built into the page.",
      },
      {
        /** lib/request-guard.ts — in memory, one hour, never persisted. */
        label: "One thing you did not type",
        body: "So that a robot cannot use the two forms as a mailing machine, the server counts recent submissions against the address your request arrived from. The count is held in memory for an hour and then gone. It is never written to the database, and the only trace it leaves is a line in the server's own log.",
      },
    ],
  },

  /** ═══ BEAT 5 — retention and rights. Small pool, anchored left. ═══════ */
  keeping: {
    plate: {
      src: "aura-seated-figure",
      alt: "A seated figure in low gold light, seen from behind.",
      b: 0.46,
      ox: "50%",
      oy: "50%",
    } satisfies Plate,
    eyebrow: "How long, and how to have it back",
    heading: "Nothing here deletes itself.",
    /**
     * The honest answer, and the one the approved screen replaced with "two
     * years". There is no scheduled job in this app; every record above stays
     * until somebody removes it. A period is Marianne's to commit to — see the
     * list at the top of this file — and this page will not invent one on her
     * behalf.
     */
    body: "There is no timer on anything. A booking, a session request and a subscription all stay until somebody takes them out. Marianne has not yet set a period after which she will clear them, and this page would rather say that than print a figure nobody has agreed to.",
    facts: [
      {
        label: "Seeing what is held",
        body: "Write and ask. She looks it up herself — there is nobody else here to pass it to.",
      },
      {
        label: "Correcting it",
        body: "The same. Say what is wrong and she changes it.",
      },
      {
        label: "Having it removed",
        body: "A subscription she can take out altogether. A booking she can remove once it has been cancelled — while a place is still held, the money still has to be accounted for. A session request has no button for it and would be taken out by hand.",
      },
      {
        label: "Stopping the letter, without asking anybody",
        body: "The link at the foot of every issue. One press, and it takes effect straight away.",
      },
    ],
    linkLabel: "Email about what is held",
    linkHref: "/contact",
    /**
     * The one Article 13 item that needs no fact from Marianne: the ICO is the
     * UK's supervisory authority whether or not she is registered with it, and
     * a complaint to it is the visitor's right rather than her arrangement.
     * It deliberately does not claim she IS registered — see the list above.
     */
    regulator:
      "If an answer does not satisfy you, the Information Commissioner's Office is the UK's regulator for this and takes complaints directly.",
  },
} as const;
