import type { Metadata } from "next";
import PageField from "@/components/site/PageField";
import { SiteBrand, SiteFooter } from "@/components/site/SiteChrome";
import UnsubscribeButton from "@/components/site/UnsubscribeButton";
import { findByUnsubscribeToken } from "@/lib/newsletter/subscribers";

/**
 * The page the unsubscribe link at the foot of every letter opens.
 *
 * THE TOKEN IS A BEARER CREDENTIAL, exactly as a cancellation token is, and it
 * is treated the same way: a token that matches nobody produces one message
 * that says nothing about whether such a person exists. Unlike a cancellation
 * token, what this one can do is stamp one date on one row and nothing else at
 * all — which is why it can be stored in the clear and printed into every
 * letter its owner ever gets (see `Subscriber.unsubscribeToken`).
 *
 * NOTHING HAPPENS ON THE GET. See `../actions.ts` for why — briefly: mail
 * scanners fetch every URL in every message, and a GET here would unsubscribe
 * people who never asked.
 */

export const metadata: Metadata = {
  title: "Stop the letter — The Field Work",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageField src="chair-with-her-coat" />
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
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const person = await findByUnsubscribeToken(token);

  if (!person) {
    return (
      <Shell>
        <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
          That link is no longer one this recognises.
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
          It may have been broken across two lines by whatever you read it in.
          If the letter is still arriving, reply to it &mdash; Marianne reads
          those, and will take you off by hand.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        {person.unsubscribedAt
          ? "You are already off the list."
          : "Stop the monthly letter?"}
      </h1>
      <UnsubscribeButton
        token={token}
        email={person.email}
        already={person.unsubscribedAt !== null}
      />
    </Shell>
  );
}
