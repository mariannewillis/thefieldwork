import "server-only";
import { outstandingPence, paidPence } from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { formatDayShort, formatInstant, formatMoney } from "@/lib/format";
import { approvalState, factsOf } from "@/lib/service-requests";

/**
 * WHO IS COMING TO ONE OFFERING, and where each of them stands.
 *
 * TWO SHAPES, BECAUSE THE TWO THINGS ARE DIFFERENT IN KIND rather than in
 * degree (operator, 2026-08-20).
 *
 * A workshop or a course has a COHORT: a fixed date, and the people who booked
 * THAT date. Somebody who came to a similar workshop is attached to that one,
 * not to this. So the list is simply this offering's bookings, and whether the
 * day has been changes what she would write to them rather than who they are.
 *
 * A service has a SEQUENCE: one person at a time, each with their own hour,
 * spread over months. The list is everybody who has ASKED for it — pending,
 * approved, lapsed, declined or paid — because on a one-to-one the asking and
 * the attending are the same thread, and half of what she needs to say is to
 * somebody who has not paid yet.
 *
 * A CANCELLED PLACE IS LISTED AND NOT COMING, and both halves matter: she may
 * still need to write to them, and a message to "everyone coming" must not
 * include somebody who is not.
 */

export type Attendee = {
  /** `booking-12` / `request-4` — unique within one offering's list. */
  key: string;
  /** The address a message would go to. */
  email: string;
  name: string;
  /** Where they stand, in her words. */
  standing: string;
  /** What they have actually paid, as money. */
  paid: string;
  /** What is still to come in, or null when nothing is. */
  owed: string | null;
  /** Their own line: places, or the hour she agreed. */
  detail: string;
  /** When they paid, or asked. */
  when: string;
  /**
   * TRUE WHEN A MESSAGE TO "EVERYONE COMING" SHOULD REACH THEM. A cancelled
   * place and a declined request are false; they stay on the list because she
   * may need to write to them, and they start unticked because she usually
   * does not.
   */
  coming: boolean;
};

/** A workshop's or a course's cohort: the people who booked THIS one. */
export async function attendingOffering(
  kind: "workshop" | "course",
  id: number,
): Promise<Attendee[]> {
  const bookings = await prisma.booking.findMany({
    where: kind === "workshop" ? { workshopId: id } : { courseId: id },
    include: { payments: true },
    orderBy: [{ paidAt: "asc" }],
  });

  return bookings.map((booking) => {
    const owed = outstandingPence(booking);
    const cancelled = booking.status !== "paid";
    return {
      key: `booking-${booking.id}`,
      email: booking.buyerEmail,
      name: booking.buyerName,
      standing: cancelled
        ? `Cancelled${booking.cancelledAt ? ` ${formatDayShort(booking.cancelledAt)}` : ""}`
        : owed > 0
          ? `${formatMoney(owed)} still to come in`
          : "Paid in full",
      paid: formatMoney(paidPence(booking)),
      owed: owed > 0 ? formatMoney(owed) : null,
      detail: `${booking.places} ${booking.places === 1 ? "place" : "places"}`,
      when: `paid ${formatInstant(booking.paidAt)}`,
      coming: !cancelled,
    };
  });
}

/**
 * A service's sequence: everybody who has asked for this one.
 *
 * REQUESTS RATHER THAN BOOKINGS, because on a one-to-one the request IS the
 * thread — she answers it, they pay against it, and the booking is what the
 * payment made. Listing bookings alone would hide the two people waiting on
 * her, who are the ones she most needs to write to.
 */
export async function askedForService(id: number): Promise<Attendee[]> {
  const requests = await prisma.serviceRequest.findMany({
    where: { serviceId: id },
    include: { booking: { include: { payments: true } } },
    orderBy: [{ createdAt: "desc" }],
  });

  const now = new Date();
  return requests.map((request) => {
    const state = approvalState(factsOf(request), now);
    const booking = request.booking;

    return {
      key: `request-${request.id}`,
      email: request.email,
      name: request.name,
      standing:
        state === "pending"
          ? "Waiting on you"
          : state === "declined"
            ? `Declined${request.declinedAt ? ` ${formatDayShort(request.declinedAt)}` : ""}`
            : state === "lapsed"
              ? "Approval ran out unpaid"
              : state === "awaitingPayment"
                ? "Approved — not paid yet"
                : "Paid",
      paid: booking ? formatMoney(paidPence(booking)) : "—",
      owed:
        state === "awaitingPayment" && request.approvedPence !== null
          ? formatMoney(request.approvedPence)
          : null,
      // Her own agreed sentence once she has answered; their wish before that.
      detail:
        request.agreedTime ??
        (request.slotStart
          ? formatInstant(request.slotStart)
          : (request.preferredTime ?? "They did not say")),
      when: `asked ${formatInstant(request.createdAt)}`,
      // ONE AT A TIME ON A SERVICE, so this only marks who she can sensibly
      // write to about their own hour — everybody except the two she has
      // already closed.
      coming: state !== "declined" && state !== "lapsed",
    };
  });
}
