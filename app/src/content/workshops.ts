/**
 * Workshops page content — the editable surface.
 *
 * Same rule as `src/content/home.ts` (D-3): every string that is not a fact
 * about a particular workshop is a CONTENT VALUE with a seeded default, not a
 * hardcoded literal. The per-workshop words — the name, the sentence
 * underneath, the body, the address — come from the database and are edited in
 * Offerings. What lives here is the frame around them: the index's own heading,
 * the empty state, the navigation, the footer, and the words in the booking
 * panel that are the same on every workshop.
 *
 * These become rows in the page-content table when that lands, and this module
 * becomes the seeder. The components do not change.
 */

/*
 * The main navigation and the footer line used to live here. They moved to
 * src/content/site.ts on 2026-08-15, when the home page started carrying the
 * same masthead: they were never about workshops, they were about the site,
 * and a second copy of them on the home page is exactly how the two mastheads
 * drifted apart in the first place.
 */

export const workshopsIndex = {
  eyebrow: "Workshops",
  title: "A day, with nine other people",
  lede: "Small groups, in a room with the curtains open. You stay clothed and seated throughout, nobody touches you, and nothing is asked of your beliefs.",
  comingUp: "Coming up",
  alreadyHappened: "Already happened",

  /** The ground photograph — the whole circle of chairs, the page's promise. */
  plate: {
    src: "work-wide-the-room",
    alt: "",
  },

  /**
   * Drawn deliberately rather than left to chance. A practitioner running
   * three or four days a year WILL have stretches with nothing scheduled, and
   * a page that simply ends is indistinguishable from one that is broken.
   */
  empty: {
    title: "Nothing in the diary just now",
    body: "The next dates usually go up a couple of months ahead. If you would like to know when they do, leave your email and you will hear once.",
  },
} as const;

export const workshopDetail = {
  /**
   * The ground photograph. An abstract rather than a portrait on purpose —
   * there is nobody in it to compete with the type, and the warm core sits
   * low-left where the page has no content.
   */
  plate: {
    src: "aura-field-abstract",
    alt: "",
  },

  eyebrow: "A workshop",
  when: "When",
  place: "Where",
  price: "Price",
  where: "Where it is",
  address: "The address",
  gettingThere: "Getting there",
  openInMap: "Open this in a map",
  // There is deliberately no "What the day is" heading here. The long body
  // brings its own headings, and printing one above the first of hers said the
  // same words twice.
  theRoom: "The room, and Marianne",
  stills: "The room, in photographs",

  booking: {
    title: "Take a place",
    quantityLabel: "How many places",
    fewer: "One fewer place",
    more: "One more place",
    ifYouCannotCome: "If you cannot come",

    /** Under the button. The promise the whole hosted-checkout choice keeps. */
    cardDetails: "You pay through Stripe. I never see your card details.",
    /** While the browser is on its way to Stripe. */
    onTheWay: "Taking you to Stripe…",

    /**
     * When the room is full. The state that gets forgotten, and the one a
     * workshop with ten places hits every time it succeeds.
     *
     * The approved screen offers "Tell me if a place opens" here. There is no
     * waiting list behind it — nothing stores who asked and nothing would send
     * the email — so the button is not drawn, and what stands in its place is
     * the true thing: places do come back, and the other days are one press
     * away (D-9).
     */
    fullTitle: "This one is full",
    fullBody:
      "Every place has gone. Places do come back when somebody cancels, so it is worth looking again.",
    fullLink: "See the other workshops",

    /** After the day itself. The page stays up; the panel stops pretending. */
    pastTitle: "This day has been and gone",
    pastBody:
      "You can still read what it was. The dates that are still to come are on the workshops page.",

    /**
     * When this server has no Stripe keys, said plainly.
     *
     * Shown by the ABSENCE of the keys, never by NODE_ENV — and it takes BOTH
     * of them, because a checkout that can be opened but not confirmed would
     * charge a real card and hold no place (see src/lib/stripe.ts). A button
     * that looks live and does nothing is the worst of the three options
     * available here; the panel stays because the price, the places and the
     * refund date are real and are what somebody deciding needs to see.
     */
    notLiveEyebrow: "Not open yet",
    notLiveTitle: "You cannot book this online yet.",
    notLiveBody:
      "Taking payment is not switched on for this site yet. Everything else on this page is real — the day, the room, the price and the date you could cancel by.",
  },
} as const;

/**
 * The page somebody lands on coming back from Stripe.
 *
 * Ported from docs/screens/workshopflow/booking-confirmation.html. What is NOT
 * carried over: the "Put it in my calendar" button, because nothing generates
 * an .ics file, and the three "What happens now" bullets, because two of them
 * describe a note and a dietary record that do not exist. Both return when
 * something real is behind them (D-9).
 */
export const bookingConfirmation = {
  /** Warm and settled, for the moment after paying. */
  plate: {
    src: "aura-light-in-a-room",
    alt: "",
  },

  eyebrow: "Your place is booked",
  when: "When",
  place: "Where",
  reference: "Reference",
  whatYouPaid: "What you paid",
  ifYouCannotCome: "If you cannot come",
  cancelLink: "Cancel this booking",
  keepIt:
    "The same link is in your email, so you do not need to keep this page.",

  /**
   * The gap between paying and being confirmed.
   *
   * The browser comes back from Stripe the instant the card clears; the
   * webhook that actually writes the booking arrives on its own schedule,
   * usually a second later and occasionally not for a minute. This page says
   * so rather than inventing a booking it cannot read, and reloads itself
   * until the real one is there.
   */
  settlingTitle: "Your payment has gone through",
  settlingBody:
    "The booking is being written now. This page will show it in a moment — you do not need to do anything, and the confirmation email is on its way either way.",

  /** Someone who arrives here with no session at all, or a stale one. */
  unknownTitle: "There is nothing to show here",
  unknownBody:
    "This page is where paying for a place lands. If you have just paid and the confirmation has not arrived within the hour, write to Marianne and she will find it.",
} as const;

/**
 * The page a cancellation link opens.
 *
 * Ported from docs/screens/workshopflow/cancel-refund-landing.html, which draws
 * all four states this page can be in. The rule running through all of them: say
 * what will happen to the MONEY before asking anyone to confirm anything, and
 * never make somebody guess which state they are in.
 */
export const cancelPage = {
  /** An empty chair with a coat on it, where somebody says they cannot come. */
  plate: {
    src: "chair-with-her-coat",
    alt: "",
  },

  title: "Cancel your place",
  keepInstead: "Changed your mind about cancelling?",
  keepLink: "Keep your place",

  /** Past the refund date. Not punitive, and the button is not hidden. */
  noRefundBody:
    "You are welcome to cancel anyway — it frees the place for whoever is waiting, and Marianne will know not to expect you.",
  noRefundButton: "Cancel anyway, without a refund",
  writeToHer: "If something has happened and this feels wrong,",
  writeToHerLink: "write to Marianne",
  writeToHerAfter: "— she would rather hear from you than not.",

  /** Already cancelled. Reassurance, not an error — this link gets clicked twice. */
  doneTitle: "This one is already cancelled",
  doneChase:
    "If it still has not appeared on your statement, it is worth checking with your bank first — after ten working days,",
  doneChaseLink: "tell us",
  doneChaseAfter: "and we will chase it.",
  doneOther: "See the other workshops",

  /**
   * Dead link. ONE message whatever killed it — a wrong token, a token for a
   * booking that was never made, a day that has been and gone — so a guessed
   * or stolen link reveals nothing about whether a booking exists.
   */
  deadTitle: "This link has expired",
  deadBody:
    "Cancellation links stop working once the workshop has been and gone. If you need to sort something out,",
  deadBodyLink: "write to Marianne",
  deadBodyAfter: "with the date you booked and she will find it.",

  /** Where "write to Marianne" goes, as the approved screens set it. */
  contact: "hello@thefieldwork.co.uk",
} as const;
