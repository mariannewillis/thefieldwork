/**
 * Courses page content — the editable surface.
 *
 * Same rule as `src/content/workshops.ts` (D-3): every string that is not a
 * fact about a particular course is a CONTENT VALUE with a seeded default. The
 * per-course words — the name, the sentence underneath, the body, the address,
 * every date and its description — come from the database and are written in
 * Offerings. What lives here is the frame: the index's own heading, the empty
 * state, the labels on the facts row, and the words in the panel that are the
 * same on every course.
 *
 * Taken from docs/screens/courses flow/courses-index.html and course-detail.html,
 * which are where this wording was approved.
 */
import { openingPlate } from "@/content/home";

export const coursesIndex = {
  eyebrow: "Courses",
  title: "One place, every date in the run",
  lede: "A course is booked once, for the whole series — the same chair, the same hour, on every date in it. Small groups, clothed and seated throughout, and nothing asked of your beliefs.",

  comingUp: "Coming up",
  /** The one thing about a course a workshop never has to say. */
  comingUpNote:
    "One price covers the whole run. There is no single-date ticket, and the group that starts together finishes together.",
  alreadyRun: "Already run",
  finished: "Finished",

  /** The ground photograph — the whole circle of chairs, as on the workshops index. */
  plate: { src: openingPlate.src, alt: "" },

  /**
   * It matters more here than on the workshops page: a course runs two or
   * three times a year, so the months with nothing in them are the normal
   * state rather than the exception, and a page that simply ends is
   * indistinguishable from one that is broken.
   *
   * The approved screen offers to take an email address here. Nothing stores
   * one and nothing would send the message, so what stands in its place is the
   * true thing — when the dates go up, and what there is in the meantime (D-9).
   */
  empty: {
    title: "No course running just now",
    body: "A course runs two or three times a year, and the dates usually go up about two months ahead. This page is where they appear, so it is worth looking again around then.",
    insteadBefore: "In the meantime there are",
    insteadLink: "one-day workshops",
    insteadHref: "/workshops",
    insteadAfter:
      ", which ask for a Saturday rather than a month of Wednesdays.",
  },
} as const;

export const courseDetail = {
  /**
   * The ground photograph. An abstract rather than a portrait, for the reason
   * the workshop detail page gives: there is nobody in it to compete with the
   * type.
   */
  plate: { src: openingPlate.src, alt: "" },

  eyebrow: "A course",
  when: "When",
  place: "Where",
  price: "Price",
  where: "Where it is",
  address: "The address",
  gettingThere: "Getting there",
  openInMap: "Open this in a map",
  theRoom: "The room, and Marianne",
  stills: "The room, in photographs",

  /** The line the masthead photograph ends on, after the count of places. */
  onePlaceCovers: "a place is a place on every date in the run",

  dates: {
    /** Whatever else it is, it opens to reveal prose and nothing else. */
    lede: "In order, earliest first. Open one to read what happens on it.",
    /** Where a date falls in the run: "1 of 3". */
    position: (position: number, count: number) => `${position} of ${count}`,
  },

  panel: {
    title: "What it costs",
    forTheRun: "for the whole run",
    ifYouCannotCome: "If you cannot come",

    /** The approved screen's own words, now that there is something behind them. */
    quantityLabel: "How many places",
    fewer: "One fewer place",
    more: "One more place",
    onTheWay: "Taking you to pay…",
    cardDetails:
      "Payment is taken by Stripe. Your card details are typed on their page and never reach this site.",

    /**
     * Where the button is when this server cannot take money at all — no Stripe
     * keys, or only half of them (see src/lib/stripe.ts). It says what it is
     * instead of pretending, which is the same move the workshop panel makes.
     */
    notLiveEyebrow: "Not open yet",
    notLiveTitle: "You cannot book a course online yet.",
    notLiveBody:
      "This site cannot take a payment at the moment. Everything else on this page is real — the dates, the room, the price, the deposit and the date you could cancel by. Write to Marianne if you would like a place held.",

    fullTitle: "This run is full.",
    fullBody:
      "Every place has gone. A course runs two or three times a year, and the next dates go up about two months ahead.",
    fullLink: "See the other courses",

    pastTitle: "This run has finished.",
    pastBody:
      "The last of these dates has been. The next run goes up about two months before it starts.",

    depositLabel: "Deposit",
    /** What the deposit arrangement actually is, said where it is decided. */
    depositNote: "the rest by",
    balanceNote:
      "The link to pay the rest is in your confirmation email, and it works from the day you book. If the balance is not paid by that date the place is released.",
    /** A course with no deposit. One payment, and it says so. */
    paidInFullNote: "The whole price is taken when you book.",
  },
} as const;

/**
 * The page a balance link opens — /pay/<token>.
 *
 * The sibling of `cancelPage` in `src/content/workshops.ts`, and shaped the
 * same way, because it is the same kind of page: something reached only from a
 * link in an email, that has to be right in four or five different states and
 * say the same sentence for every way a link can be dead.
 */
export const payPage = {
  /** The ground photograph. The same settled plate the confirmation uses. */
  plate: { src: openingPlate.src, alt: "" },

  title: "The rest of your place",
  overdueTitle: "This was due — and the place is still here",
  doneTitle: "This one is already paid in full",
  releasedTitle: "This place has been released",
  cancelledTitle: "This place was cancelled",

  // THE ONE SENTENCE FOR ANY TOKEN THAT MATCHES NOTHING, whichever kind it was
  // — a course balance or a session Marianne approved (D-25). The page cannot
  // know which, because a token that matches nothing matches nothing, so this
  // wording deliberately names neither: "the run it belonged to" used to be
  // here, and it reached somebody whose session had never been a run.
  deadTitle: "This link no longer works.",
  deadBody:
    "It may have been replaced by a newer one, or what it was for may already have happened. If you think that is wrong,",
  deadBodyLink: "write to Marianne",
  deadBodyAfter: "and she will sort it out.",

  contact: "marianne@thefieldwork.co.uk",

  doneBody:
    "There is nothing left to pay. The link to cancel is in your first email, and its terms have not changed.",
  releasedBody:
    "The balance was not paid by the date it was due, so the place went back into the room and somebody else has taken it. Nothing further has been charged.",
  cancelledBody:
    "This place was given up, so there is nothing left to pay. Anything that was owed back to you is dealt with separately.",

  writeToHer: "If you would still like a place,",
  writeToHerLink: "write to Marianne",
  writeToHerAfter: "and she will tell you what there is.",

  seeCourses: "See the courses",
} as const;
