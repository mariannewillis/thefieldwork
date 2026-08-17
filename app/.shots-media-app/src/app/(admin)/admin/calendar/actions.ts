"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { londonDayEnd, londonMoment } from "@/lib/london";

/**
 * The two things she can do to her own diary, and one she can do to its address.
 *
 * A BLOCK IS THE ONLY WRITE ON THIS SCREEN. Everything else the calendar draws
 * belongs to something with its own page — a workshop is edited where workshops
 * are edited, a request is answered in Requests — and drawing an edit control
 * for them here would be a second way to change something, which is a second
 * place for the rules to be applied slightly differently.
 *
 * Co-located with the screen they are pressed from, as every other action in
 * this app is, and with the same four steps: refuse anyone not signed in, read
 * what was posted and check it here, do the thing, and say what happened in
 * words she can read.
 */

export type BlockState = {
  /** Drawn under the form. Null when it worked. */
  error: string | null;
  /** Stamped on success, so the form knows to clear itself. */
  done: number;
};

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  // The admin layout already turned away anyone without a session, but a server
  // action is a POST endpoint of its own: it can be called directly, and it does
  // not inherit the layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

function refresh() {
  revalidatePath("/admin/calendar");
  // Blocking an afternoon changes what every service's page offers.
  revalidatePath("/services", "layout");
}

// ── taking time out ──────────────────────────────────────────────────────────

/**
 * Block a stretch of a day, or the whole of it.
 *
 * INSTANTS ARE MADE HERE, from her day and her clock, by `londonMoment`. The
 * form posts "2026-10-25" and "14:00" — a day and a reading, with no timezone in
 * either — and what goes into the database is the moment those two name in
 * Frome. Doing it any other way puts the clock change into the data: two o'clock
 * on the Sunday the clocks go back is not thirteen hours after one in the
 * morning, and only a conversion that knows the date can say so.
 *
 * THE WHOLE DAY IS MIDNIGHT TO MIDNIGHT IN LONDON, which on 25 October is
 * twenty-five hours. `londonDayEnd` counts in days rather than adding
 * 86,400,000, so the whole of that Sunday means the whole of it.
 */
export async function addBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  await requireSession();

  const day = String(formData.get("day") ?? "").trim();
  const allDay = formData.get("allDay") === "on";
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  // The last day it covers, and usually the same one. Blank means a single day,
  // which is what almost every block is — so the field is offered rather than
  // asked for, and a fortnight in Wales is still one row rather than fourteen.
  const untilDay = String(formData.get("until") ?? "").trim() || day;

  if (!reason) {
    return {
      error:
        "Put a word to it first — “Dentist”, “Wales”. A grey stripe with nothing on it is one you will not recognise in three months and will not dare to delete.",
      done: 0,
    };
  }

  const opens = londonMoment(day, "00:00");
  const closes = londonMoment(untilDay, "00:00");
  if (!opens || !closes) {
    return { error: "Pick a day for this first.", done: 0 };
  }

  const startsAt = allDay ? opens : londonMoment(day, from);
  const endsAt = allDay ? londonDayEnd(closes) : londonMoment(untilDay, to);

  if (!startsAt || !endsAt) {
    return {
      error:
        "Put both times in, as 09:00 and 12:30 — or tick “the whole day” and leave them.",
      done: 0,
    };
  }

  if (endsAt.getTime() <= startsAt.getTime()) {
    return {
      error:
        "This ends before it starts. Check the times, and the last day if you have set one.",
      done: 0,
    };
  }

  await prisma.personalBlock.create({ data: { startsAt, endsAt, reason } });

  refresh();
  return { error: null, done: Date.now() };
}

/**
 * Give the time back.
 *
 * No confirmation and no undo, deliberately, and this is the one destructive
 * control in the portal that gets neither. Everything the bookings page guards
 * with a modal is somebody else's money or somebody else's place; this is her
 * own note to herself, and re-making one she deleted by accident is three
 * fields. A dialog in front of it would be ceremony around nothing.
 */
export async function removeBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { error: "That one is no longer there.", done: 0 };
  }

  // Gone already is the outcome she wanted, so it is not an error — two tabs on
  // this screen is ordinary and the second press should not tell her off.
  await prisma.personalBlock.deleteMany({ where: { id } });

  refresh();
  return { error: null, done: Date.now() };
}

// ── the address her own calendar subscribes to ───────────────────────────────

/**
 * Mint her subscription address, or replace it.
 *
 * THE ONE TOKEN IN THIS APP STORED IN THE CLEAR, and it has to be: Outlook and
 * Google want an address she can look up and paste again in six months, and a
 * SHA-256 cannot produce one. Every other token here — the reset link, the
 * cancellation link, the pay link — exists in an email and is never shown twice,
 * which is what makes hashing them free.
 *
 * What it can do is the whole of why that is acceptable: a GET that renders her
 * diary as text. It writes nothing, it reaches no part of the portal, it sees no
 * card details, and it can be replaced from this screen at any moment.
 *
 * REPLACING IT KILLS EVERY SUBSCRIPTION MADE FROM THE OLD ONE, which is exactly
 * what it is for — a laptop lost, a phone passed on, an address forwarded to
 * somebody it should not have been. The screen says so before she presses it.
 */
export async function issueCalendarFeed(): Promise<void> {
  const session = await requireSession();

  // 32 random bytes, as every other bearer token in this app is. Base64url so
  // it survives being pasted into a subscription field, an email and an address
  // bar without anything helpfully re-encoding it.
  await prisma.adminUser.update({
    where: { username: session.username },
    data: { calendarFeedToken: randomBytes(32).toString("base64url") },
  });

  revalidatePath("/admin/calendar");
}
