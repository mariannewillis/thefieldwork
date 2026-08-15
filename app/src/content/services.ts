/**
 * Services page content — the editable surface.
 *
 * Same rule as `src/content/courses.ts` (D-3): every string that is not a fact
 * about a particular service is a CONTENT VALUE with a seeded default. The
 * per-service words — the name, the sentence underneath, the body, the address
 * or the distance she travels — come from the database and are written in
 * Offerings. What lives here is the frame: the index's own heading, the empty
 * state, the labels on the facts row, and every word in the request panel,
 * which is the same on every service.
 *
 * Taken from docs/screens/webapp/services-index.html and service-detail.html,
 * which are where this wording was approved — with the sentences about a HELD
 * time rewritten, because there is no hold and the approved screens assume one.
 * See D-24.
 */

export const servicesIndex = {
  eyebrow: "One-to-one · not a group setting",
  title: "The price is already on this page.",
  lede: "One room, one hour at different lengths, and the fee for each one printed below. You keep your clothes on, nobody touches you, and nothing is asked of your beliefs.",

  listHeading: "One-to-one sessions",
  listNote:
    "Pick by how long you want, or by what you need before the hour starts. There is no online checkout on these — you ask, and Marianne writes back.",

  /** The ground photograph — her hands at the edge, the page's whole promise. */
  plate: {
    src: "work-close-hands",
    alt: "",
  },

  /**
   * Drawn deliberately rather than left to chance, for the reason the courses
   * index gives on its own: a page that simply ends is indistinguishable from
   * one that is broken. She may genuinely have none of these listed while she
   * is deciding what to offer.
   */
  empty: {
    title: "No sessions listed just now",
    body: "The one-to-one hours are not on the site at the moment. That is not the same as being fully booked — it usually means Marianne is rewriting what she offers.",
    insteadBefore: "In the meantime there are",
    insteadLink: "workshops",
    insteadHref: "/workshops",
    insteadAfter: ", which are the same work in a room with other people.",
  },

  /** The closing note the approved screen ends on. */
  closing: {
    title: "Not sure which length is right.",
    body: "Ask on any of the pages above — a short answer, not a sales call. Say what you are wondering about and Marianne will tell you which hour fits.",
  },
} as const;

export const serviceDetail = {
  /**
   * The ground photograph. An abstract rather than a portrait, for the reason
   * the workshop and course detail pages give: there is nobody in it to
   * compete with the type.
   */
  plate: {
    src: "aura-field-abstract",
    alt: "",
  },

  eyebrow: "One to one",
  howLong: "How long",
  price: "Price",
  place: "Where",

  /** At a venue — the same three headings the other two detail pages use. */
  where: "Where it is",
  address: "The address",
  gettingThere: "Getting there",
  openInMap: "Open this in a map",

  /** She travels — a different question, so different words. */
  whereTravel: "Where it happens",
  travelHeading: "She comes to you",
  travelFrom: "Setting out from",
  travelCost: "What travelling costs",
  travelNoNote:
    "Ask in the form below if you are not sure whether you are inside that, and she will tell you.",

  theRoom: "The room, and Marianne",
  stills: "The room, in photographs",

  /** The one blush pool on the page — the whole action of it. */
  panel: {
    title: "Ask for this session",
    /**
     * THE PROMISE, AND THE WHOLE OF IT. It says what happens next and what has
     * not happened, in that order, because the second is the sentence somebody
     * is going to assume the wrong way round.
     *
     * TWO OF THEM NOW (D-26), and which one is shown is decided by whether the
     * service has any times to offer rather than by a setting. The picker
     * version may say the time is held, because it is; the words version may
     * not, because for that path nothing has changed. Both stop at the same
     * place: it is not booked, and nothing is charged.
     */
    lede: "Send this and Marianne reads it herself. Nothing is booked, no time is held and nothing is charged — you settle a time between you when she writes back.",
    ledePicking:
      "Choose a time and Marianne reads your message herself. The time is held for you while she does — it is not booked and nothing is charged, but nobody else is offered it in the meantime.",

    nameLabel: "Your name",
    emailLabel: "Email",
    emailNote: "So she can reply.",
    phoneLabel: "Phone",
    optional: "optional",

    /**
     * The picker. Only the times she can actually do are here — worked out
     * against her whole diary when this page was drawn, and checked again the
     * moment you send it.
     */
    pickLabel: "Choose a time",
    pickNote:
      "These are the times she has left for this one. All times are UK time.",
    pickLater: "Later dates",
    /** Above the list, when there is nothing in it. Not an error — an answer. */
    pickNoneTitle: "Nothing free in the next two months",
    pickNoneBody:
      "Every time for this one is taken, or Marianne has not set days for it yet. Say when would suit you below and she will write back herself.",

    /**
     * The field that stands where the picker stands when there is nothing to
     * pick from. The label asks for words rather than a time, so nobody types
     * "14:00" and believes they have taken it.
     */
    whenLabel: "When would suit you",
    whenNote:
      "In your own words — a day, a part of the week, or whatever you can manage. Nothing here is taken; she answers it herself.",
    whenPlaceholder: "Weekday mornings, ideally not Tuesdays",
    messageLabel: "Anything else",
    messageNote:
      "What you are hoping for, or anything you would rather she knew first.",

    submit: "Send this request",
    sending: "Sending…",

    /** Under the button, where it is read last and remembered. */
    foot: "Marianne replies herself, usually within a day. There is no booking system behind this form — the answer comes from her.",

    /** Where the form goes once it has been sent. */
    sentTitle: "That has gone to her.",
    sentBody:
      "Nothing is booked and nothing has been charged. Marianne reads these herself and writes back, usually within a day — and the two of you agree a time in that reply.",
    sentBodyPicking:
      "That time is held for you while she reads this. It is not booked and nothing has been charged — she writes back herself, usually within a day, and if she can do it she will send you a link to pay.",
    sentCheck:
      "A copy is on its way to your email. If it does not arrive, check the address you typed and send it again.",
    sentAgain: "Ask about another session",
  },
} as const;

/**
 * The page an approval's pay link opens, and the one it lands on afterwards.
 *
 * The sibling of `payPage` in `src/content/courses.ts` and deliberately its own
 * set of words rather than a shared one: a course balance is the second half of
 * something already bought, and this is the whole of something Marianne has
 * just said yes to. "The rest of your place" would be wrong in every sentence.
 *
 * FOUR STATES here as against that page's five, because a session is paid at
 * once: there to pay, already paid, run out, and a link that no longer works.
 */
export const sessionPayPage = {
  /** The ground photograph. The same settled plate the other pay page uses. */
  plate: { src: "work-wide-the-room", alt: "" },

  title: "Marianne has said yes.",
  doneTitle: "This one is already paid for.",
  lapsedTitle: "This ran out before it was paid.",

  // THERE IS NO DEAD-LINK WORDING HERE, deliberately. A token that matches
  // nothing matches nothing — the page cannot tell whether it was a session's
  // or a course balance's — so both fall through to the one sentence in
  // `payPage`, which is written to name neither.

  contact: "marianne@thefieldwork.co.uk",

  doneBody:
    "Nothing else is owed and nothing has been charged twice. The details are in the email you were sent when it went through.",
  lapsedBody:
    "The time Marianne agreed was held until the date below and then went back to her. Nothing has been charged, and nothing else happens on its own.",

  writeToHer: "If you would still like the session,",
  writeToHerLink: "write to Marianne",
  writeToHerAfter: "and she will find another time.",

  seeServices: "See the sessions",

  /** Where a completed payment lands. */
  bookedTitle: "That is booked.",
  bookedBody:
    "Marianne has been told, and a confirmation is on its way to your email — keep it, because the link to say you cannot come is in it and there is no other copy.",
  settlingTitle: "Just a moment.",
  settlingBody:
    "Your payment has gone through and we are waiting for the confirmation from Stripe. This page will refresh itself — it is usually a second or two.",
  unknownTitle: "There is nothing to show here.",
  unknownBody:
    "This address is where a payment lands. If you have just paid and reached this by hand, the confirmation email is the thing to trust.",
} as const;
