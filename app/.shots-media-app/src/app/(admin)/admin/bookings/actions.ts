"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { balanceLink } from "@/lib/bookings";
import {
  approvalEmail,
  declineEmail,
  sendRequestMail,
} from "@/lib/email/service-requests";
import { loadWording } from "@/lib/email/templates";
import { parsePence } from "@/lib/offering-form";
import { approveRequest, declineRequest } from "@/lib/service-requests";

/**
 * The two answers Marianne gives a request.
 *
 * Co-located with the queue they are pressed from, and the same four steps in
 * the same order as the bookings page's controls:
 *
 *   1. Refuse anyone who is not signed in.
 *   2. Re-read the request FROM THE DATABASE, under a row lock, inside the same
 *      transaction that writes. What the browser posts is an id, an amount and
 *      a sentence — never a status, never whether approving is allowed. The row
 *      on the screen may be minutes old and two tabs on it is ordinary.
 *   3. Do the thing, in `lib/service-requests`, where the rule lives.
 *   4. Tell them, in words read off the row afterwards.
 *
 * BOTH ANSWERS SEND AN EMAIL, and that is the whole reason this screen has
 * buttons now (D-24 refused to build one that only changed a column). An
 * approval that wrote a row and sent nothing would be a payment link nobody
 * holds; a decline that wrote a row and sent nothing would be somebody left
 * waiting for an answer that had already been given.
 *
 * THE LINK EXISTS ONCE, HERE. `approveRequest` stores only the token's SHA-256
 * and hands the token back a single time, so this is the only moment in the
 * system at which the usable link exists. If the send fails, the sentence that
 * comes back says so plainly and offers the one recovery there is — approve it
 * again after it runs out, which issues a new link. Nothing can reprint the old
 * one, and that is the price of not storing it.
 */

export type RequestActionState = {
  /** Drawn inside the panel that was open. Null when it worked. */
  error: string | null;
  /** Stamped on success so the panel knows to close itself. */
  done: number;
};

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  // The admin layout already turned away anyone without a session, but a server
  // action is a POST endpoint of its own: it can be called directly, and it
  // does not inherit the layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

function revalidateEverywhere() {
  revalidatePath("/admin/bookings");
  // The dashboard counts what is waiting on her, and one fewer is.
  revalidatePath("/admin");
}

// ── approve ──────────────────────────────────────────────────────────────────

/**
 * Say yes: record what she agreed, and send them the link that pays for it.
 *
 * THE AMOUNT ARRIVES AS A FIELD because it is genuinely hers. The form is
 * pre-filled with the service's own price and she can change it before
 * approving — services carry travel and vary in length, and a fixed figure
 * would be wrong the first time she drives somewhere. What she posts is parsed
 * as POUNDS and stored as pence by the same `parsePence` both offering forms
 * use, so £82.50 means the same thing everywhere in this app.
 */
export async function approveSession(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { error: "That request is no longer here.", done: 0 };
  }

  const typed = String(formData.get("amount") ?? "").trim();
  const pence = parsePence(typed);
  if (pence === null) {
    return {
      error:
        typed === ""
          ? "Put in what you are charging for this one before you approve it."
          : `"${typed}" is not an amount. Write it in pounds, like 70 or 82.50.`,
      done: 0,
    };
  }

  const result = await approveRequest({
    id,
    pence,
    agreedTime: String(formData.get("agreedTime") ?? ""),
  });

  if (result.outcome === "refused") {
    return { error: result.reason, done: 0 };
  }

  const { request, payToken, again } = result;

  await sendRequestMail(
    approvalEmail({
      service: request.service,
      name: request.name,
      to: request.email,
      agreedTime: request.agreedTime ?? "",
      amountPence: request.approvedPence ?? pence,
      payBy: request.payBy as Date,
      // The same /pay address the balance link uses, for the same reasons — see
      // the note on `balanceLink`.
      payLink: balanceLink(payToken),
      again,
      wording: await loadWording(),
    }),
    again ? "approval (again)" : "approval",
  );

  revalidateEverywhere();
  return { error: null, done: Date.now() };
}

// ── decline ──────────────────────────────────────────────────────────────────

/**
 * Say no, in her own words.
 *
 * The note is required, and refusing an empty one is deliberate: a decline with
 * nothing in it arrives as a closed door, and this is somebody who asked her
 * for an hour. What she writes IS the message — see `declineEmail`, which puts
 * the minimum around it and nothing else.
 */
export async function declineSession(
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { error: "That request is no longer here.", done: 0 };
  }

  const result = await declineRequest({
    id,
    note: String(formData.get("note") ?? ""),
  });

  if (result.outcome === "refused") {
    return { error: result.reason, done: 0 };
  }

  await sendRequestMail(
    declineEmail({
      service: result.request.service,
      name: result.request.name,
      to: result.request.email,
      note: result.request.declineNote ?? "",
      wording: await loadWording(),
    }),
    "decline",
  );

  revalidateEverywhere();
  return { error: null, done: Date.now() };
}
