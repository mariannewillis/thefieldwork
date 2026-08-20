import type { Attendee } from "@/lib/attending";

/**
 * WHO IS COMING TO THIS ONE, and where each of them stands.
 *
 * The same shape as the two ledgers — a line a person, the money on it — but
 * WITHOUT their controls: cancelling, refunding and deleting are the Bookings
 * page's job, and this is the offering's own view of who is on it. Two screens
 * that can both cancel a booking are two places for the rule to drift.
 *
 * THE COLUMNS DIFFER BY KIND because the two things are different. A workshop
 * row is a place and what it cost; a service row is where her answer got to,
 * which is the whole of a one-to-one before any money moves.
 */
export default function AttendingTable({
  attendees,
  kind,
}: {
  attendees: Attendee[];
  kind: "workshop" | "course" | "service";
}) {
  const service = kind === "service";

  if (attendees.length === 0) {
    return (
      <div className="pool on-pool mt-7 max-w-[62ch] px-7 py-7">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
          Nobody yet
        </p>
        <p className="mt-2 font-display text-[26px] leading-tight text-ink">
          {service
            ? "No one has asked for this session."
            : "No one has booked a place."}
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          {service
            ? "Requests arrive from the form at the foot of this session’s page, and land in Requests as well as here."
            : "The first booking appears here the minute somebody pays, and in Bookings at the same time."}
        </p>
      </div>
    );
  }

  const HEAD =
    "pb-3 pr-5 text-left align-bottom fig font-mono text-[15px] font-medium uppercase tracking-[0.14em] text-ink-soft";
  const CELL = "py-4 pr-5 align-middle";

  return (
    <div className="pool on-pool mt-7 px-6 py-2 sm:px-8">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">
            {service
              ? "Everybody who has asked for this session, newest first, with where your answer got to and what they have paid."
              : "Everybody who has booked a place on this one, in the order they paid, with what they have paid and what is still owed."}
          </caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className={HEAD}>
                Who
              </th>
              <th scope="col" className={HEAD}>
                {service ? "When it is" : "Places"}
              </th>
              <th scope="col" className={HEAD}>
                Where it stands
              </th>
              <th scope="col" className={HEAD}>
                Paid
              </th>
              <th scope="col" className={`${HEAD} pr-0`}>
                {service ? "To pay" : "Still owed"}
              </th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((person) => (
              <tr key={person.key} className="border-t border-pool-rule">
                <th
                  scope="row"
                  className="py-4 pr-5 text-left align-middle font-normal"
                >
                  <span className="block text-[17px] font-semibold text-ink">
                    {person.name}
                  </span>
                  {/* THE ADDRESS IS A LINK, because the one thing she wants
                      from a name in this table that the Email tab cannot give
                      her is a reply in her own hand. */}
                  <a
                    href={`mailto:${person.email}`}
                    className="t block break-all fig font-mono text-[15px] text-action underline decoration-action underline-offset-4 hover:text-ink hover:decoration-ink"
                  >
                    {person.email}
                  </a>
                  <span className="block fig font-mono text-[15px] text-ink-soft">
                    {person.when}
                  </span>
                </th>

                <td className={`${CELL} text-[17px] text-ink`}>
                  {person.detail}
                </td>

                <td className={CELL}>
                  <span
                    className={
                      person.coming
                        ? "text-[16px] text-ink-soft"
                        : "text-[16px] text-pool-error"
                    }
                  >
                    {person.standing}
                  </span>
                </td>

                <td
                  className={`${CELL} whitespace-nowrap fig font-mono text-[17px] tabular-nums text-ink`}
                >
                  {person.paid}
                </td>

                <td className="py-4 align-middle whitespace-nowrap fig font-mono text-[17px] tabular-nums text-ink-soft">
                  {person.owed ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-[70ch] border-t border-pool-rule py-6 text-[17px] leading-relaxed text-ink-soft">
        {service
          ? "Approving, declining and refunding a session are done in Requests and Bookings, where the money is. This is who has asked, and what you said."
          : "Cancelling, refunding and deleting a place are done in Bookings, where the money is. This is who is on this one."}
      </p>
    </div>
  );
}
