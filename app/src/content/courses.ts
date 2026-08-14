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
  plate: {
    src: "work-wide-the-room",
    alt: "",
  },

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
  plate: {
    src: "aura-field-abstract",
    alt: "",
  },

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

    /**
     * Where the button is on the approved screen, which draws "Pay the deposit
     * · £80". There is no checkout for a run of dates — no payment, no deposit
     * charged, no course bookings anywhere — so the button is not drawn and
     * this stands in its place. The panel stays, because the price, the deposit
     * she has set, what the room holds and the date a place could be cancelled
     * by are all real and are what somebody deciding needs to see (D-9, and the
     * same shape the workshop panel used before Stripe landed).
     */
    notLiveEyebrow: "Not open yet",
    notLiveTitle: "You cannot book a course online yet.",
    notLiveBody:
      "Booking a run of dates is not built. Everything else on this page is real — the dates, the room, the price, the deposit and the date you could cancel by. Write to Marianne if you would like a place held.",

    /**
     * Said ONCE on the page, beside the figure it qualifies. A workshop counts
     * places left from paid bookings; a course has no bookings to count, so the
     * page prints what the room holds and says where the other figure will come
     * from rather than inventing a number of places sold.
     */
    placesNote:
      "That is what the room holds. How many are left will be counted from bookings, as it is on a workshop, once a course can be booked.",

    depositLabel: "Deposit",
    /** Stored by the form, charged by nothing. Saying so is the whole point. */
    depositNote: "Nothing charges it yet.",
  },
} as const;
