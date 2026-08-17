"use server";

import { headers } from "next/headers";
import {
  hoursOf,
  lockTheDiary,
  offeredFor,
  stillOffered,
} from "@/lib/availability";
import { prisma } from "@/lib/db";
import {
  requestAcknowledgementEmail,
  requestNoticeEmail,
  sendRequestMail,
} from "@/lib/email/service-requests";
import { loadWording } from "@/lib/email/templates";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";
import { allowRequest, callerKey, looksAutomated } from "@/lib/request-guard";
import { getPublishedServiceBySlug } from "@/lib/services";
import { offeredView, slotEnd, type OfferedDayView } from "@/lib/slots";

/**
 * Asking for a session.
 *
 * Co-located with the panel it is submitted from, the way the checkout actions
 * sit beside the booking panels. It is the ONLY public write in the app that
 * is not a payment, which is why it carries the guard: everything else the
 * outside world can POST to either has Stripe's signature on it or a token
 * behind it, and this has neither.
 *
 * IT NOW HOLDS A TIME, which is the one sentence D-24 said it did not (D-26).
 * A visitor picks from times the server worked out against her whole diary, and
 * writing the request RESERVES that slot — derived, not stamped: from the moment
 * this row exists, `lib/availability.ts` counts it as taken, so the next person
 * is not offered it. Approving keeps it. Declining or lapsing gives it back,
 * with nothing running.
 *
 * SO THE SLOT IS CHECKED TWICE, and the second time is what makes it true. The
 * list the browser is holding was computed when the page was drawn, and filling
 * in a form takes a minute or two — in which somebody else can ask for the same
 * ten o'clock. The re-check happens inside the transaction that writes, under a
 * lock on the whole diary, using the same `slotVerdict` that made the offer. Of
 * two people racing one Thursday, exactly one gets it and the other is told so
 * and shown what is left.
 *
 * IT STILL TAKES WORDS when there is nothing to pick from — a service with no
 * days set, or one whose next two months are full. That is not a fallback bolted
 * on; it is the same conversation the site had before there was a calendar, and
 * it is the honest answer when the calendar has nothing to say.
 *
 * NOTHING FROM THE BROWSER IS TRUSTED except what somebody typed. Which
 * service is a slug looked up here; the duration, the price, the hours and the
 * address are read off that row. A slot that arrives from a browser is checked
 * against the diary before it is believed, and a slot nobody was offered is
 * refused whatever it says.
 */

export type RequestState = {
  /** Per-field, keyed by the input's name — the shape the panel draws. */
  errors: Record<string, string>;
  /** Set when nothing more specific can be said. */
  error: string | null;
  /** True once it is written down and the two emails are away. */
  sent: boolean;
  /**
   * The times as they are NOW, sent back when the chosen one went while they
   * were typing. The panel draws these over the list it was given, so the
   * refusal and the fresh choice arrive together — being told "that one has
   * gone" beside a list that still shows it is worse than not being told.
   *
   * Absent on every other outcome, and the panel then keeps what it has.
   */
  days?: OfferedDayView[];
};

/**
 * Not exported, and it cannot be: a "use server" module may only export async
 * functions, and a const exported from one arrives at the importing component
 * as `undefined` with nothing failing until the first render reads a field off
 * it. The panel carries its own copy of this shape — see the note there.
 */
const EMPTY: RequestState = { errors: {}, error: null, sent: false };

/** Long enough for anything anybody means, short enough to bound a column. */
const LIMITS = {
  name: 120,
  email: 200,
  phone: 60,
  preferredTime: 500,
  message: 4000,
} as const;

/**
 * An address that could be one, checked no harder than that.
 *
 * There is no confirmation link on this side and no list to protect, so the
 * only cost of a typo is that her reply bounces — and the only thing a
 * stricter pattern reliably achieves is turning away the real addresses it has
 * never heard of. One @, something either side, no spaces.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function requestService(
  _previous: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const slug = field(formData, "slug");
  const service = await getPublishedServiceBySlug(slug);

  if (!service) {
    return {
      ...EMPTY,
      error:
        "That session is no longer on the site. Nothing has been sent — have a look at what is there now.",
    };
  }

  const caller = callerKey(await headers());
  if (!allowRequest(caller)) {
    return {
      ...EMPTY,
      error:
        "That is a lot of requests from one place in an hour. Nothing has been sent. Wait a little and try again, or email Marianne directly.",
    };
  }

  const name = field(formData, "name");
  const email = field(formData, "email");
  const phone = field(formData, "phone");
  const preferredTime = field(formData, "preferredTime");
  const message = field(formData, "message");

  const errors: Record<string, string> = {};

  if (!name) errors.name = "She needs a name to write back to.";
  else if (name.length > LIMITS.name) {
    errors.name = "That is longer than a name — put the rest in the message.";
  }

  if (!email) errors.email = "Without an email address there is no reply.";
  else if (email.length > LIMITS.email || !looksLikeEmail(email)) {
    errors.email =
      "That does not look like a complete email address — “sarah@” is missing its second half.";
  }

  if (phone.length > LIMITS.phone) {
    errors.phone = "That is longer than a phone number.";
  }

  // ── the time ──────────────────────────────────────────────────────────────
  //
  // Two paths, and which one is live is decided HERE from the service's own
  // row rather than from what the browser posted. A form that could choose its
  // own path is a form that could send a sentence to a service with a calendar
  // and quietly skip every check on this page.
  const picking = service.availableDays.length > 0;
  const chosen = field(formData, "slot");
  let slotStart: Date | null = null;

  if (picking) {
    if (!chosen) {
      errors.slot = "Pick a time from the list before you send this.";
    } else {
      const parsed = new Date(chosen);
      if (Number.isNaN(parsed.getTime())) {
        // Not something a picker ever produces. Answered with the same sentence
        // as a slot that has gone, because to the person at the other end the
        // two are the same event and the difference is only interesting to us.
        errors.slot =
          "That time is not one of the ones on offer. Pick another.";
      } else {
        slotStart = parsed;
      }
    }
  } else if (!preferredTime) {
    // The field that stands where the picker would be when there is nothing to
    // pick from. Without it she has nothing to answer with.
    errors.preferredTime =
      "Say roughly when would suit you — a day, or a part of the week. It is what she answers with.";
  } else if (preferredTime.length > LIMITS.preferredTime) {
    errors.preferredTime =
      "Keep this to when you are free; anything else belongs in the message below.";
  }

  if (message.length > LIMITS.message) {
    errors.message =
      "That is longer than this form can take. Send the short version and she will ask for the rest.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, error: null, sent: false };
  }

  // ── the spam guard ────────────────────────────────────────────────────────
  // Answered EXACTLY as a real one is: a robot that learns which field is the
  // trap gets past the trap next time. Nothing is written and nothing is sent,
  // and the log line is the only place it shows.
  if (
    looksAutomated(
      field(formData, HONEYPOT_FIELD),
      field(formData, DRAWN_AT_FIELD),
    )
  ) {
    console.info(
      `[service-requests] discarded an automated-looking submission for ${service.slug} from ${caller}`,
    );
    return { errors: {}, error: null, sent: true };
  }

  const hours = hoursOf(service);
  const submitted = {
    name,
    email,
    phone: phone || null,
    // Exactly one of the two is written. A slot AND a sentence saying the same
    // thing in worse words is two facts to keep in step, and the one nobody is
    // looking at is the one that goes wrong.
    preferredTime: slotStart ? null : preferredTime,
    slotStart,
    slotEnd: slotStart ? slotEnd(slotStart, service.durationMinutes) : null,
    message: message || null,
  };

  /**
   * The whole decision, in one transaction, under one lock.
   *
   * THE LOCK IS WHY "only one of them gets it" IS TRUE. Without it, two people
   * asking for the same Thursday both read a free diary, both are told yes, and
   * both rows exist — and the first anybody knows is when she opens the queue.
   * With it, the second one waits for the first to commit, reads the diary
   * again, and finds the hour gone.
   *
   * THE DOUBLE-PRESS CHECK MOVED IN HERE with it, and had to: the same person
   * pressing twice would otherwise race themselves, and the second press would
   * be refused as "somebody took that time" — which would be us, a second ago,
   * on their behalf. Inside the lock it reads its own first row and answers the
   * way it always did, silently and as though it had worked, because it did.
   */
  const outcome = await prisma.$transaction(async (tx) => {
    await lockTheDiary(tx);

    // The same person, about the same session, inside a couple of minutes. That
    // is a second click or a browser retry rather than a second question, and
    // writing it twice would put the same message in front of her twice and
    // send them two acknowledgements.
    const recent = await tx.serviceRequest.findFirst({
      where: {
        serviceId: service.id,
        email,
        createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });
    if (recent) return { kind: "duplicate" as const };

    if (slotStart) {
      const verdict = await stillOffered(tx, { startsAt: slotStart, hours });
      if (!verdict.ok) return { kind: "gone" as const, why: verdict.why };
    }

    await tx.serviceRequest.create({
      data: { serviceId: service.id, ...submitted },
    });
    return { kind: "written" as const };
  });

  if (outcome.kind === "duplicate") {
    return { errors: {}, error: null, sent: true };
  }

  if (outcome.kind === "gone") {
    // The fresh list travels back WITH the refusal, so the sentence and the
    // choice arrive together. Read after the transaction committed, so it
    // already reflects whoever won.
    return {
      errors: {},
      error:
        outcome.why === "taken"
          ? "That time went while you were filling this in — somebody else asked for it first. Nothing has been sent. The times below are up to date; pick another."
          : "That time is no longer being offered. Nothing has been sent. The times below are up to date; pick another.",
      sent: false,
      days: offeredView(await offeredFor(service)),
    };
  }

  // Written down FIRST, then told. Both messages are awaited so a failure is
  // in the log beside the request it belongs to, and neither can undo the row
  // — the request is the thing that matters and it is already safe.
  await sendRequestMail(
    requestNoticeEmail(service, submitted),
    `request for ${service.slug}`,
  );
  await sendRequestMail(
    requestAcknowledgementEmail(service, submitted, await loadWording()),
    `acknowledgement for ${service.slug}`,
  );

  return { errors: {}, error: null, sent: true };
}
