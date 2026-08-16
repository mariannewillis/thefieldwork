import type { Metadata } from "next";
import Link from "next/link";
import { customisedKeys } from "@/lib/email/templates";
import { EMAIL_TEMPLATE_LIST } from "@/lib/email/wording";

/**
 * The nine messages a person receives, and which of them she has reworded.
 *
 * NINE, NOT FIFTEEN. The six notices that go to her own inbox — a booking, a
 * balance, a cancellation, two "refund by hand" alarms and a request — are not
 * on this screen and are not editable. They are read on a phone in a hurry;
 * plain text is the right shape for them, and branding an alarm is decoration.
 *
 * WHAT SHE OWNS AND WHAT SHE DOES NOT is said on this page rather than only on
 * the nine underneath it, because it is the thing somebody arriving here needs
 * to know before they open anything: three parts of each message are hers, and
 * the amount, the date, the deadline, the reference and the links are not.
 */

export const metadata: Metadata = {
  title: "Email templates — The Field Work",
};

export const dynamic = "force-dynamic";

const EYEBROW =
  "fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold";

export default async function Page() {
  const customised = await customisedKeys();

  return (
    <section className="pt-8" aria-labelledby="templates-h">
      <p className={EYEBROW}>What people receive</p>

      <h1
        id="templates-h"
        className="mt-3 max-w-[24ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        Nine messages,
        <br />
        <span className="text-gold">
          {customised.size === 0
            ? "all in the app's own words."
            : customised.size === 1
              ? "one of them in yours."
              : `${customised.size} of them in yours.`}
        </span>
      </h1>

      <p className="mt-6 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
        On each of these you can change three things &mdash; the subject line,
        the opening, and the sign-off. Everything else is written by the app and
        stays that way: the amount, the day, the room, the deadline, the booking
        reference, and the links that cancel a place or pay for one. Nothing you
        type can move them, break them or take them out.
      </p>

      <p className="mt-4 max-w-[68ch] text-[17px] leading-relaxed text-plate-soft">
        Leave a field empty and that message goes out in the app&rsquo;s own
        words, which change to fit &mdash; a workshop, a course and a session
        each get the sentence that is true for them.
      </p>

      <ul className="mt-9 grid list-none gap-px border border-plate-rule/40 bg-plate-rule/40 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {EMAIL_TEMPLATE_LIST.map((template) => (
          <li key={template.key} className="pool on-pool p-6">
            <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-action">
              {customised.has(template.key)
                ? "Your words"
                : "As the app writes it"}
            </p>

            <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">
              <Link
                href={`/admin/email-templates/${template.key}`}
                className="t underline decoration-pool-rule/60 underline-offset-[6px] hover:decoration-ink"
              >
                {template.label}
              </Link>
            </h2>

            <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
              {template.sentWhen}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-[68ch] text-[17px] leading-relaxed text-plate-soft">
        The messages that come to <em>you</em> &mdash; somebody has booked,
        somebody has paid a balance, a refund would not go through &mdash; are
        not here. They are plain text on purpose: you read them on a phone,
        usually in a hurry, and they are the same six sentences every time.
      </p>
    </section>
  );
}
