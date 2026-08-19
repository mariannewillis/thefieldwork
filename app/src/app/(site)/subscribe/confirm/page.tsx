import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import Link from "next/link";
import { SiteBrand, SiteFooter } from "@/components/site/SiteChrome";
import { confirmSubscriber } from "@/lib/newsletter/subscribers";

/**
 * The page the link in the confirmation email opens.
 *
 * IT CONFIRMS ON THE GET, which is the one place in this app that deliberately
 * writes on a GET, so the reasoning belongs here rather than in a rule
 * somewhere. Every alternative is worse:
 *
 *  - A page with a "yes, confirm" button asks somebody to press a second thing
 *    to finish an act they have already performed, and the measurable result of
 *    that second press is that a fifth of people never make it.
 *  - A link scanner prefetching the URL — Outlook Safe Links, a corporate
 *    gateway — would confirm on their behalf. But what it would be confirming
 *    is that a message SENT TO THAT ADDRESS was received at that address, which
 *    is exactly the fact the confirmation exists to establish. The scanner is
 *    inside the mailbox. It cannot manufacture consent for anybody else.
 *
 * The unsubscribe link is the other way round — it does NOT act on the GET —
 * because there the prefetch would remove somebody who never asked to leave.
 * The asymmetry is the point: the failure modes are not mirror images.
 *
 * NOTHING IS SAID ABOUT A BAD TOKEN except that it did not work. A page that
 * distinguished "no such person" from "wrong signature" would answer a question
 * about somebody else's address to whoever asked it.
 */

export const metadata: Metadata = {
  title: "Confirmed — The Field Work",
  // Only ever reached from a link in an email, and the link is the credential.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageField src="marianne-altar-light" />
      <main className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
        <SiteBrand />
        <section className="mt-14 max-w-[620px]">
          <div className="pool on-pool mt-5 px-8 py-9 sm:px-10">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  const outcome = await confirmSubscriber(Number(id), token ?? "");

  if (!outcome.ok) {
    return (
      <Shell>
        <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
          That link did not work.
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
          It may have been broken across two lines by whatever you read it in,
          which happens to long links in some mail programs. Asking again takes
          a moment and sends a fresh one.
        </p>
        <Link
          href="/subscribe"
          className="mt-7 inline-block bg-action px-8 py-4 text-[19px] font-semibold text-pool hover:bg-ink"
        >
          Ask for the letter again
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        {outcome.already
          ? "You were already on it."
          : "That is you on the list."}
      </h1>
      <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
        {outcome.already ? (
          <>
            Nothing has changed &mdash; <strong>{outcome.email}</strong> was
            already confirmed, so the next letter will reach you as it would
            have done.
          </>
        ) : (
          <>
            The letter will come to <strong>{outcome.email}</strong> about once
            a month. Every one of them carries a link at the bottom that takes
            you off again in one press, with nothing to fill in.
          </>
        )}
      </p>
      <Link
        href="/"
        className="mt-7 inline-block text-[19px] text-action underline underline-offset-4 hover:text-ink"
      >
        Back to The Field Work
      </Link>
    </Shell>
  );
}
