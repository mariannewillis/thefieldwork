import type { Metadata } from "next";
import { markAllSubscribersSeen } from "@/app/(admin)/admin/subscribers/actions";
import MarkAllSeen from "@/components/admin/MarkAllSeen";
import Pager, { currentPage, pageSlice } from "@/components/admin/Pager";
import SubscriberLine from "@/components/admin/SubscriberLine";
import { allSubscribers } from "@/lib/newsletter/subscribers";

/**
 * The list, in three states, on one screen.
 *
 * CONFIRMED · PENDING · GONE, and the split is the screen's argument: only one
 * of the three is "the list". A pending address has been typed into a form by
 * somebody who may or may not own it, and nothing is ever sent to one; a gone
 * one asked to stop. Rolling all three into a table with a status column would
 * make the count at the top a number nobody could act on.
 *
 * THE COUNT IS THE CONFIRMED COUNT, and it is the same number the send modal
 * offers. Two screens disagreeing about how many people are on a mailing list
 * is the kind of thing that gets found out by sending.
 *
 * There is no "add somebody" and no "mark as confirmed" — see
 * `subscribers/actions.ts` for why that absence is the point rather than a gap.
 */

export const metadata: Metadata = {
  title: "Subscribers — The Field Work",
};

export const dynamic = "force-dynamic";

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const everyone = await allSubscribers();

  const confirmed = everyone.filter(
    (person) => person.confirmedAt && !person.unsubscribedAt,
  );
  const waiting = everyone.filter(
    (person) => !person.confirmedAt && !person.unsubscribedAt,
  );
  const gone = everyone.filter((person) => person.unsubscribedAt);
  const page = currentPage(pageParam, confirmed.length);
  // Only the confirmed ones. Somebody who asked and never came back is not
  // waiting on her, and a badge for a non-event is a badge she learns to ignore.
  const unseen = confirmed.filter((person) => person.seenAt === null).length;

  return (
    <section className="pt-8" aria-labelledby="subs-h">
      <p className={EYEBROW}>Your list</p>

      <h1
        id="subs-h"
        className="mt-3 max-w-[24ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {confirmed.length === 0 ? (
          <>
            Nobody has confirmed
            <br />
            <span className="text-gold">an address yet.</span>
          </>
        ) : (
          <>
            {confirmed.length}{" "}
            {confirmed.length === 1 ? "person gets" : "people get"}
            <br />
            <span className="text-gold">every letter.</span>
          </>
        )}
      </h1>

      {/* PAGED, AND ONLY THIS ONE. The confirmed list is the one that grows —
          the other two are the exceptions, and a page of twelve under a list of
          three unconfirmed addresses is chrome answering a question nobody
          asked (operator, 2026-08-19). */}
      {unseen > 0 && (
        <p className="mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
            {unseen === 1
              ? "1 you have not looked at"
              : `${unseen} you have not looked at`}
          </span>
          <MarkAllSeen action={markAllSubscribersSeen} count={unseen} />
        </p>
      )}

      <Group
        title="Confirmed"
        note={
          confirmed.length === 1
            ? "one person · the letter goes to them"
            : `${confirmed.length} people · newest first`
        }
        people={pageSlice(confirmed, page)}
        empty="Nobody yet. The first person to use the form on the site and press the link in the message appears here."
      >
        <Pager
          page={page}
          total={confirmed.length}
          href={(next) =>
            next > 1 ? `/admin/subscribers?page=${next}` : "/admin/subscribers"
          }
          label="people"
        />
      </Group>

      {waiting.length > 0 && (
        <Group
          title="Asked, not confirmed"
          note="nothing is sent to these"
          people={waiting}
          pending
          empty=""
        />
      )}

      {gone.length > 0 && (
        <Group
          title="Asked to be taken off"
          note="kept so they are never sent to again"
          people={gone}
          empty=""
        />
      )}
    </section>
  );
}

type Person = {
  id: number;
  email: string;
  name: string | null;
  joinedAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  seenAt: Date | null;
};

function Group({
  title,
  note,
  people,
  pending,
  empty,
  children,
}: {
  title: string;
  note: string;
  people: Person[];
  pending?: boolean;
  empty: string;
  /** The pager, on the one group long enough to need one. */
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-11">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2 className="fig font-mono text-[15px] font-semibold uppercase tracking-[0.14em] text-plate-text">
          {title}
        </h2>
        <p className="fig font-mono text-[15px] text-plate-soft">{note}</p>
      </div>

      {people.length === 0 ? (
        <p className="mt-5 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
          {empty}
        </p>
      ) : (
        <ul className="pool on-pool mt-5 flex list-none flex-col gap-0 p-0">
          {people.map((person, index) => (
            <SubscriberLine
              key={person.id}
              person={person}
              pending={Boolean(pending)}
              first={index === 0}
            />
          ))}
          {children && <li className="px-7">{children}</li>}
        </ul>
      )}
    </div>
  );
}
