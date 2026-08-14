import Link from "next/link";
import SectionStub from "@/components/admin/SectionStub";

/**
 * Requests — somebody asking for an hour and waiting to be answered.
 *
 * NOT the ledger. Places that have been paid for live at /admin/workshop-bookings
 * (D-18): money that has already moved is a different job from a request that
 * has not been agreed to, and putting the two in one table would mean a
 * confirm/decline pair sitting in the same row as a refund.
 *
 * Still a stub, because there is no Service model to make a request against.
 */
export default function Page() {
  return (
    <>
      <SectionStub
        eyebrow="Waiting on you"
        title="Requests"
        lede="Session requests that have come in through the site, waiting for you to say yes or no. No money has moved on any of them."
        next={[
          "Accept or decline a request, with the reply sent for you",
          "Look back over someone's history before you answer",
          "Hold a time in the diary while you think about it",
        ]}
      />
      <p className="mt-6 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Places somebody has already paid for are not here — they are in{" "}
        <Link
          href="/admin/workshop-bookings"
          className="text-gold underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Bookings
        </Link>
        , with cancelling and refunding done from the row itself.
      </p>
    </>
  );
}
