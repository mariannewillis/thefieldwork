"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  requestAcknowledgementEmail,
  requestNoticeEmail,
  sendRequestMail,
} from "@/lib/email/service-requests";
import { DRAWN_AT_FIELD, HONEYPOT_FIELD } from "@/lib/request-fields";
import { allowRequest, callerKey, looksAutomated } from "@/lib/request-guard";
import { getPublishedServiceBySlug } from "@/lib/services";

/**
 * Asking for a session.
 *
 * Co-located with the panel it is submitted from, the way the checkout actions
 * sit beside the booking panels. It is the ONLY public write in the app that
 * is not a payment, which is why it carries the guard: everything else the
 * outside world can POST to either has Stripe's signature on it or a token
 * behind it, and this has neither.
 *
 * WHAT IT DOES NOT DO IS AS DELIBERATE AS WHAT IT DOES. It does not hold a
 * time, it does not take a payment, it does not decide anything and it does
 * not tell the visitor an hour is theirs. The brief's hold rests on computed
 * availability — a recurring pattern minus workshops minus course dates minus
 * personal blocks minus other holds — and none of that exists (D-24), so the
 * preferred time is the visitor's own sentence and the answer is a person's.
 *
 * NOTHING FROM THE BROWSER IS TRUSTED except what somebody typed. Which
 * service is a slug looked up here; the duration, the price and the address in
 * both emails are read off that row. A price that arrives from a browser is a
 * price somebody can edit.
 */

export type RequestState = {
  /** Per-field, keyed by the input's name — the shape the panel draws. */
  errors: Record<string, string>;
  /** Set when nothing more specific can be said. */
  error: string | null;
  /** True once it is written down and the two emails are away. */
  sent: boolean;
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

  // The one field that stands in for the picker, so it is the one field the
  // form insists on: without it she has nothing to answer with.
  if (!preferredTime) {
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

  // ── the double-press ──────────────────────────────────────────────────────
  // The same person, about the same session, inside a couple of minutes. That
  // is a second click or a browser retry rather than a second question, and
  // writing it twice would put the same message in front of her twice and send
  // them two acknowledgements.
  const recent = await prisma.serviceRequest.findFirst({
    where: {
      serviceId: service.id,
      email,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (recent) {
    return { errors: {}, error: null, sent: true };
  }

  const submitted = {
    name,
    email,
    phone: phone || null,
    preferredTime,
    message: message || null,
  };

  await prisma.serviceRequest.create({
    data: { serviceId: service.id, ...submitted },
  });

  // Written down FIRST, then told. Both messages are awaited so a failure is
  // in the log beside the request it belongs to, and neither can undo the row
  // — the request is the thing that matters and it is already safe.
  await sendRequestMail(
    requestNoticeEmail(service, submitted),
    `request for ${service.slug}`,
  );
  await sendRequestMail(
    requestAcknowledgementEmail(service, submitted),
    `acknowledgement for ${service.slug}`,
  );

  return { errors: {}, error: null, sent: true };
}
