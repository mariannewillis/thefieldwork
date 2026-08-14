import Link from "next/link";
import WorkshopForm from "@/components/admin/WorkshopForm";
import { canFindAddresses } from "@/lib/addresses";
import { listMediaBasenames } from "@/lib/media";
import { listVenues } from "@/lib/venues";

/**
 * A workshop that does not exist yet.
 *
 * The same form as the edit page, opened empty — one component, so a field
 * cannot exist on one and not the other. What differs is only what is said
 * above it, because "nothing is saved yet" is true here and is not true there.
 */
export default async function Page() {
  const [media, venues] = await Promise.all([
    listMediaBasenames(),
    listVenues(),
  ]);

  return (
    <>
      <section className="pt-8 pb-1" aria-labelledby="form-h">
        <Link
          href="/admin/offerings"
          className="t fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-soft underline decoration-plate-rule underline-offset-4 hover:text-plate-text"
        >
          &larr; Offerings
        </Link>
        <p className="mt-5 fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
          New workshop
        </p>
        <h1
          id="form-h"
          className="mt-3 font-display text-[34px] font-normal leading-tight text-plate-text sm:text-[40px]"
        >
          Nothing is saved yet.
          <br />
          <span className="text-gold">
            What follows is the workshop&rsquo;s own page, in the order people
            read it.
          </span>
        </h1>
        <p className="mt-4 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
          The ones marked <span className="italic">Needed</span> are what stop
          it going live. Everything else already has an answer, or can wait.
        </p>

        <p className="mt-5 flex items-center gap-2.5 fig font-mono text-[15px] uppercase tracking-[0.14em] text-plate-error">
          <span aria-hidden="true" className="h-1.5 w-1.5 bg-plate-error" />
          Not saved &middot; nothing here has left this page yet
        </p>
      </section>

      <WorkshopForm
        media={media}
        venues={venues}
        canFindAddress={canFindAddresses()}
      />
    </>
  );
}
