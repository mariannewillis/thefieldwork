"use client";

import { useState } from "react";
import { markSubscriberSeen } from "@/app/(admin)/admin/subscribers/actions";
import SubscriberActions from "@/components/admin/SubscriberActions";
import { formatDayShort } from "@/lib/format";

/**
 * ONE PERSON ON THE LIST — one line, and pressing it says she has read it.
 *
 * ONE LINE, ALL OF IT (operator, 2026-08-20). The name and address already
 * shared a line; the date sat under them, which made a list of forty people
 * eighty lines and the page a scroll rather than a list. A subscriber is three
 * facts and they fit beside each other.
 *
 * PRESSING IT OPENS NOTHING, on purpose. A booking and a request each have a
 * sheet full of things she needs — a message, an amount, a refund period — so
 * opening one is a real act. Everything there is to know about a subscriber is
 * already on this line, so a sheet would be a modal that repeats the row back
 * to her. What the press is FOR is the mark: it records that she has read it,
 * and the dot goes.
 *
 * THE DOT CLEARS BEFORE THE SERVER ANSWERS, and that is honest rather than
 * optimistic — she is looking at it. The same reasoning as `BookingLine`.
 *
 * THE ACTIONS ARE NOT PART OF THE PRESS. Removing somebody and resending a
 * confirmation are their own decisions, so their corner of the line stops the
 * click rather than letting it fall through to "seen" — pressing Remove should
 * not also be a way of saying "read".
 */
export default function SubscriberLine({
  person,
  pending,
  first,
}: {
  person: {
    id: number;
    email: string;
    name: string | null;
    joinedAt: Date;
    confirmedAt: Date | null;
    unsubscribedAt: Date | null;
    seenAt: Date | null;
  };
  /** True while they have asked and not confirmed — the resend is for them. */
  pending: boolean;
  /** The first line carries no rule above it. */
  first: boolean;
}) {
  const [seen, setSeen] = useState(person.seenAt !== null);

  function look() {
    if (seen) return;
    setSeen(true);
    void markSubscriberSeen(person.id);
  }

  const who = person.name ?? person.email;
  const state = person.unsubscribedAt
    ? `left ${formatDayShort(person.unsubscribedAt)}`
    : person.confirmedAt
      ? `confirmed ${formatDayShort(person.confirmedAt)}`
      : `asked ${formatDayShort(person.joinedAt)}, not confirmed`;

  return (
    <li
      className={`flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-7 ${
        first ? "" : "border-t border-pool-rule/30"
      }`}
    >
      <span
        role={seen ? undefined : "button"}
        tabIndex={seen ? undefined : 0}
        aria-label={seen ? undefined : `New — ${who}. Press to mark as read.`}
        onClick={look}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            look();
          }
        }}
        className={`-mx-3 flex min-w-[16rem] flex-1 flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-5 ${
          seen
            ? ""
            : "cursor-pointer hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none"
        }`}
      >
        {!seen && (
          <span
            aria-hidden="true"
            title="New — you have not looked at this one"
            className="h-2 w-2 shrink-0 self-center rounded-full bg-action"
          />
        )}
        <span className="font-display text-[21px] leading-tight text-ink">
          {who}
        </span>
        {person.name && (
          <span className="fig font-mono text-[15px] text-ink-soft">
            {person.email}
          </span>
        )}
        <span className="fig font-mono text-[15px] text-ink-soft">{state}</span>
      </span>

      {/* Its own decisions, so its own clicks. */}
      <span
        onClick={(event) => event.stopPropagation()}
        className="py-5"
      >
        <SubscriberActions id={person.id} who={who} pending={pending} />
      </span>
    </li>
  );
}
