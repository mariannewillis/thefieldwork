import { escaped, plain, type Block, type Safe } from "./render";

/**
 * The nine messages Marianne may reword, and the three parts of each she owns.
 *
 * GUARDED EDITING, NOT FREE EDITING. She may change the SUBJECT, the OPENING
 * and the SIGN-OFF. Everything load-bearing — the amount, the date, the venue,
 * the deadline, the booking reference, the cancellation link, the pay link —
 * is emitted by code into its own block and is not reachable from this file at
 * all. That is the point of the arrangement rather than a side effect of it:
 * NO EDIT SHE MAKES CAN STOP SOMEBODY PAYING.
 *
 * There are three separate reasons that holds, and all three are mechanical:
 *
 *  1. HER TEXT IS NEVER A DOCUMENT, ONLY A SLOT. A message is a list of blocks
 *     (`render.ts`), and her three strings land in three of them as text. There
 *     is no code path on which a string from this table becomes an element, an
 *     attribute, a URL or a style.
 *  2. IT IS ESCAPED ON THE WAY IN. `slot()` below returns a `Safe`, which can
 *     only be built by escaping first. A `<script>` tag she pastes arrives in
 *     the letter as the characters `<script>`, in blush, in Palatino.
 *  3. A SUBJECT CANNOT CARRY A NEWLINE. Subjects become a mail header, and a
 *     newline in a header is how a header is injected. Every control character
 *     is stripped before the string leaves this file.
 *
 * WHAT HAPPENS WHEN SHE HAS NEVER TOUCHED ONE. The column is null, and the
 * code's own wording is used — which is branch-aware in a way one stored
 * sentence cannot be: a workshop confirmation, a course confirmation and a paid
 * session say three different true things, and `bookings.ts` picks between
 * them. So a template she has never edited sends exactly what the app sent
 * before this screen existed, and a template she has BLANKED does the same. The
 * screen still opens showing that wording, because the seed below is it.
 */

export const EMAIL_TEMPLATE_KEYS = [
  "bookingConfirmation",
  "balancePaid",
  "cancellation",
  "refundIssued",
  "cannotHonour",
  "requestAcknowledgement",
  "sessionApproved",
  "sessionDeclined",
  "passwordReset",
  "paymentReminder",
] as const;

export type TemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export function isTemplateKey(value: string): value is TemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

/** The three parts of a message she owns. Null anywhere means "as the app writes it". */
export type Slots = {
  subject: string | null;
  opening: string | null;
  signOff: string | null;
};

/** Every template's slots, as loaded from the database. */
export type Wording = Partial<Record<TemplateKey, Slots>>;

/** A fact the code can lend her sentences. Never the only place a fact appears. */
type Placeholder = {
  token: string;
  what: string;
  sample: string;
};

export type TemplateSpec = {
  key: TemplateKey;
  /** What she calls it on the screen. */
  label: string;
  /** When it goes out, in one sentence. */
  sentWhen: string;
  /** The wording the app already sends — what the screen opens showing. */
  seed: Slots;
  /**
   * What she may drop into a sentence. Every one of these ALSO appears in a
   * block the code owns, so deleting a placeholder loses a nicety and never a
   * fact: the amount is still on the plate, the date is still under "When",
   * the reference is still in mono under the figure.
   */
  placeholders: Placeholder[];
  /** Named on the screen so it is obvious what is not hers to break. */
  locked: string[];
};

/**
 * The seeds, lifted verbatim from the wording already in `bookings.ts`,
 * `service-requests.ts` and `index.ts`.
 *
 * Where a message reads differently depending on what was bought — a workshop
 * against a session, a refund that went through against one that did not — the
 * seed is the commonest case and the placeholders carry the facts. The other
 * cases keep their own wording until she saves something of her own; see the
 * module note above.
 *
 * TWO SEEDS ARE EMPTY. `cancellation` and `cannotHonour` have no closing note
 * in the code today: they end on a fact about the money and then the practice's
 * name. Inventing a sign-off for them so the screen looked tidy would put
 * words in an email nobody had written, so the field opens empty and anything
 * she types appears as the last line before the footer.
 */
export const EMAIL_TEMPLATES: Record<TemplateKey, TemplateSpec> = {
  bookingConfirmation: {
    key: "bookingConfirmation",
    label: "Booking confirmation",
    sentWhen:
      "The moment Stripe confirms a payment for a workshop, a course place or an approved session.",
    seed: {
      subject: "Your place on {{offering}} — {{when}}",
      opening: "Thank you. {{places}} on {{offering}} are booked.",
      signOff:
        "Keep this email. That link is the only one, and you do not need to ask anyone to use it.",
    },
    placeholders: [
      {
        token: "offering",
        what: "What was booked",
        sample: "Reading the Field",
      },
      {
        token: "when",
        what: "The day, or her agreed time",
        sample: "Saturday 19 September",
      },
      { token: "places", what: "How many places", sample: "2 places" },
      { token: "amount", what: "What was paid", sample: "£190" },
      { token: "reference", what: "The booking reference", sample: "TFW-4417" },
    ],
    locked: [
      "The day, the time and the venue",
      "What was paid, and anything still owed",
      "The booking reference",
      "The cancellation link, and the balance link when there is one",
      "The refund deadline and what happens after it",
    ],
  },

  balancePaid: {
    key: "balancePaid",
    label: "Balance paid",
    sentWhen:
      "When the rest of a course fee arrives and the booking is settled.",
    seed: {
      subject: "Paid in full — {{offering}}",
      opening:
        "Thank you. {{amount}} has been paid and {{offering}} is settled in full. There is nothing else to pay.",
      signOff:
        "The link in your first email still cancels the place if you cannot come. Its terms have not changed.",
    },
    placeholders: [
      {
        token: "offering",
        what: "The course",
        sample: "Aura Healing: Foundations",
      },
      {
        token: "amount",
        what: "The balance that just arrived",
        sample: "£330",
      },
      { token: "places", what: "How many places", sample: "One place" },
      { token: "reference", what: "The booking reference", sample: "TFW-4392" },
    ],
    locked: [
      "The dates and the venue",
      "The total paid",
      "The booking reference",
    ],
  },

  cancellation: {
    key: "cancellation",
    label: "Cancellation",
    sentWhen:
      "When a place is given up — by the person who booked it, or by you from the bookings page.",
    seed: {
      subject: "Cancelled — {{offering}}, {{when}}",
      opening: "{{places}} on {{offering}}, {{when}}, are cancelled.",
      signOff: "",
    },
    placeholders: [
      {
        token: "offering",
        what: "What was cancelled",
        sample: "Reading the Field",
      },
      {
        token: "when",
        what: "The day it was to be",
        sample: "Saturday 19 September",
      },
      { token: "places", what: "How many places", sample: "2 places" },
      { token: "amount", what: "What they had paid", sample: "£190" },
      { token: "reference", what: "The booking reference", sample: "TFW-4417" },
    ],
    locked: [
      "Whether the money is coming back, and how much",
      "How long Stripe takes to show it",
      "That nothing further is owed",
      "The booking reference",
    ],
  },

  refundIssued: {
    key: "refundIssued",
    label: "Refund issued",
    sentWhen:
      "When you send money back without cancelling — the place stays theirs unless it was already cancelled.",
    seed: {
      subject: "{{amount}} refunded — {{offering}}, {{when}}",
      opening: "{{amount}} has been sent back to the card you paid with.",
      signOff: "Nothing further is needed from you.",
    },
    placeholders: [
      {
        token: "offering",
        what: "What it was for",
        sample: "Reading the Field",
      },
      { token: "when", what: "The day", sample: "Saturday 19 September" },
      { token: "amount", what: "What went back", sample: "£190" },
      { token: "reference", what: "The booking reference", sample: "TFW-4417" },
    ],
    locked: [
      "Whether their place is unchanged or gone",
      "The amount refunded",
      "The day, the time and the venue",
      "The booking reference",
    ],
  },

  cannotHonour: {
    key: "cannotHonour",
    label: "Could not be honoured",
    sentWhen:
      "When somebody paid and there was nothing to give them — the last place went while they were paying, an offering came down, an approval had run out, or they were charged twice.",
    seed: {
      subject: "Your payment for {{offering}} — refunded",
      opening: "I am sorry.",
      signOff: "",
    },
    placeholders: [
      {
        token: "offering",
        what: "What they paid for",
        sample: "Reading the Field",
      },
      {
        token: "when",
        what: "The day it was to be",
        sample: "Saturday 19 September",
      },
      { token: "amount", what: "What they paid", sample: "£95" },
    ],
    locked: [
      "Which of the four things happened, said plainly",
      "Whether the money has gone back or is still owed",
      "That they are not holding a place",
    ],
  },

  requestAcknowledgement: {
    key: "requestAcknowledgement",
    label: "Request acknowledgement",
    sentWhen: "The moment somebody asks about a session.",
    seed: {
      subject: "Your request — {{service}}",
      opening:
        "Thank you. Your message about {{service}} has arrived, and Marianne will read it and write back herself.",
      signOff: "If any of that is wrong, reply to this email and say so.",
    },
    placeholders: [
      {
        token: "service",
        what: "The session they asked about",
        sample: "First session, with time to ask",
      },
      { token: "name", what: "Their name", sample: "Sarah" },
      {
        token: "when",
        what: "The time they chose, or their own words",
        sample: "Thursday 20 August, 10:00–11:30",
      },
    ],
    locked: [
      "Whether their time is held, and that it is not booked",
      "That nothing has been charged",
      "What they asked for, when, and what they wrote",
    ],
  },

  sessionApproved: {
    key: "sessionApproved",
    label: "Session approved",
    sentWhen:
      "When you say yes to a request and send the link that pays for it.",
    seed: {
      subject: "Yes — {{service}}, {{agreedTime}}",
      opening: "{{name}} — yes, let’s do this.",
      signOff:
        "If anything above is wrong, reply to this email before you pay. It reaches her.",
    },
    placeholders: [
      {
        token: "service",
        what: "The session",
        sample: "First session, with time to ask",
      },
      { token: "name", what: "Their name", sample: "Sarah" },
      {
        token: "agreedTime",
        what: "The time you agreed, in your words",
        sample: "Thursday the 20th at 10",
      },
      { token: "amount", what: "What you agreed it costs", sample: "£95" },
      {
        token: "payBy",
        what: "When the link stops working",
        sample: "Saturday 15 August at 5:12pm",
      },
    ],
    locked: [
      "The amount and the deadline",
      "The link that pays for it",
      "That the time goes back to you if it is not paid",
      "That card details never reach this site",
    ],
  },

  sessionDeclined: {
    key: "sessionDeclined",
    label: "Session declined",
    sentWhen:
      "When you turn a request down. What you type on the request is the message.",
    seed: {
      subject: "About your request — {{service}}",
      opening: "{{name}} — thank you for asking about {{service}}.",
      signOff:
        "Nothing has been charged, and there is nothing you need to do. If you would like to ask about another time, reply to this email and it reaches Marianne.",
    },
    placeholders: [
      {
        token: "service",
        what: "The session they asked about",
        sample: "First session, with time to ask",
      },
      { token: "name", what: "Their name", sample: "Sarah" },
    ],
    locked: [
      "The note you typed on the request — that is the message, whole",
      "The link back to the page they asked from",
    ],
  },

  /**
   * THE REMINDER FOR A PAYMENT IN A PLAN (operator, 2026-08-21).
   *
   * Editable like the other nine, because it is the message on this site most
   * likely to need her own voice: it is the only one that asks somebody for
   * money they have not sent, and the difference between a nudge and a demand
   * is entirely in the wording. The app's own words err toward the nudge.
   *
   * WHAT IS LOCKED is the part she must not be able to get wrong — the amount,
   * the day it was due, and the link that takes the payment. A reminder naming
   * a figure she typed is a reminder that can ask for the wrong money.
   */
  paymentReminder: {
    key: "paymentReminder",
    label: "Payment reminder",
    sentWhen:
      "When you send a reminder from Bookings, to somebody with a payment due on a plan.",
    seed: {
      subject: "A payment on {{offering}}",
      opening:
        "This is a note about {{offering}} — the next payment on it was due on {{due}}, and it has not come through yet.",
      signOff:
        "If you have already sent it, or if something has changed, just reply to this — Marianne reads these herself.",
    },
    placeholders: [
      { token: "offering", what: "What it is for", sample: "IFR course" },
      { token: "due", what: "The day it was due", sample: "12 September" },
      { token: "amount", what: "What is due", sample: "£75" },
    ],
    locked: [
      "The amount due and the day it was due",
      "The link that takes the payment",
      "That nothing is charged until they press it",
    ],
  },

  passwordReset: {
    key: "passwordReset",
    label: "Password reset",
    sentWhen: "When you ask for a reset link on the sign-in screen.",
    seed: {
      subject: "Reset your password — The Field Work",
      opening:
        "Someone asked to reset the password for {{username}} on The Field Work.",
      signOff:
        "If it wasn’t you, you can ignore this. Nothing has changed, and your current password still works.",
    },
    placeholders: [
      { token: "username", what: "The account", sample: "marianne" },
    ],
    locked: ["The reset link", "That it works once and expires in 60 minutes"],
  },
};

export const EMAIL_TEMPLATE_LIST: TemplateSpec[] = EMAIL_TEMPLATE_KEYS.map(
  (key) => EMAIL_TEMPLATES[key],
);

// ── the guard ────────────────────────────────────────────────────────────────

/** Long enough for any sentence anybody would write; short enough to bound. */
const MAX_SUBJECT = 200;
const MAX_BODY = 2000;

/**
 * Put the facts into a sentence she wrote.
 *
 * Substitution happens on the RAW string and escaping happens afterwards, in
 * `slot()`, so a value cannot smuggle markup in through a placeholder either.
 * An unknown token is removed rather than printed: `{{tot4l}}` in an email is a
 * bug somebody else has to read, and there is nothing useful to put in its
 * place.
 */
function fill(text: string, facts: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (_, token) =>
    Object.hasOwn(facts, token) ? facts[token] : "",
  );
}

/**
 * Tidy what a removed placeholder left behind.
 *
 * A course has no single day, so `{{when}}` is empty on it, and "Your place on
 * Reading the Field — " would go out with a dash hanging off the end. Collapse
 * runs of whitespace, then drop a separator that now has nothing after it.
 */
function tidy(text: string): string {
  return (
    text
      .replace(/[ \t]+/g, " ")
      // A separator with nothing left on one side of it.
      .replace(/\s*[,;:·—–]\s*(?=[,;:·—–]\s)/g, "")
      .replace(/\s*[,;:·—–]\s*$/gm, "")
      .replace(/^\s*[,;:·—–]\s*/gm, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * A subject line, safe to hand to a mail transport.
 *
 * NEWLINES AND CONTROL CHARACTERS ARE STRIPPED, not escaped. A subject becomes
 * a header, and a newline in a header value is how a second header — a second
 * `Bcc:` — gets injected. Resend would almost certainly refuse it, but "almost
 * certainly" is not a security property and this is one line of code.
 */
function subjectLine(text: string): string {
  const stripped = Array.from(text)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      // C0, DEL and C1 — every one of them, including the CR and LF that make
      // header injection possible in the first place.
      return code < 0x20 || (code >= 0x7f && code <= 0x9f) ? " " : character;
    })
    .join("");
  return tidy(stripped).slice(0, MAX_SUBJECT);
}

/** Her value if she has written one, otherwise the app's own wording. */
function chosen(stored: string | null | undefined, fallback: string): string {
  const trimmed = (stored ?? "").trim();
  return trimmed === "" ? fallback : trimmed;
}

/**
 * One resolved message's three parts, in both the shapes a message needs.
 *
 * `text` for the plain-text alternative and `html` for the branded part, from
 * one string each, so the two halves of a multipart message can never say
 * different things.
 */
export type ResolvedSlots = {
  subject: string;
  opening: { text: string; html: Safe[] };
  signOff: { text: string; html: Safe[] } | null;
};

/**
 * Resolve one template.
 *
 * `defaults` is what the composer would have written on its own — already
 * branch-correct, already carrying this booking's facts. It is used whenever
 * the stored value is null or blank, which is what makes an untouched template
 * indistinguishable from the app before this screen existed.
 */
export function resolveSlots(
  key: TemplateKey,
  wording: Wording,
  defaults: { subject: string; opening: string; signOff?: string | null },
  facts: Record<string, string>,
): ResolvedSlots {
  const stored = wording[key];

  const subject = subjectLine(
    fill(chosen(stored?.subject, defaults.subject), facts),
  );

  const opening = paragraphs(
    tidy(fill(chosen(stored?.opening, defaults.opening), facts)).slice(
      0,
      MAX_BODY,
    ),
  );

  const signOffSource = tidy(
    fill(chosen(stored?.signOff, defaults.signOff ?? ""), facts),
  ).slice(0, MAX_BODY);

  return {
    subject: subject || defaults.subject,
    opening,
    signOff: signOffSource ? paragraphs(signOffSource) : null,
  };
}

/**
 * Split on blank lines and escape each paragraph.
 *
 * A blank line is the one piece of formatting she gets, because it is the one
 * that cannot be anything else. Everything inside a paragraph is escaped — see
 * `plain()`, which is the only route from a string to a `Safe` that does not
 * require the caller to have escaped it already.
 */
function paragraphs(text: string): { text: string; html: Safe[] } {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);
  return {
    text,
    html: parts.length ? parts.map(plain) : [escaped("")],
  };
}

// ── turning resolved slots into blocks ───────────────────────────────────────

/**
 * The opening, as the letter draws it: the first paragraph at display size —
 * the type IS the hierarchy in these designs — and anything after it as body
 * prose under it.
 */
export function openingBlocks(
  opening: ResolvedSlots["opening"],
  size = 34,
): Block[] {
  return opening.html.map((text, index) =>
    index === 0
      ? ({ kind: "headline", text, size } as Block)
      : ({ kind: "paragraph", text } as Block),
  );
}

/** The sign-off, as the letter draws it: quiet body prose, last before the footer. */
export function signOffBlocks(signOff: ResolvedSlots["signOff"]): Block[] {
  if (!signOff) return [];
  return signOff.html.map((text) => ({ kind: "note", text }) as Block);
}
