/**
 * The ledger, before the figures arrive.
 *
 * The table keeps its columns and stays at rest. Nothing pulses — a shimmer is
 * motion saying "something is happening" when nothing is — no amount is guessed
 * at, and no action is offered until its row's state is known. A cancel button
 * that appears a beat before the row it belongs to is a cancel button that can
 * be pressed on the wrong booking.
 */
export default function Loading() {
  return (
    <section className="pt-8" aria-busy="true">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
        Bookings
      </p>
      <p className="mt-6 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        Counting what has been paid…
      </p>

      <div className="pool on-pool mt-9 px-6 py-7 sm:px-8" aria-hidden="true">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="skel h-3 w-1/5" />
            <div className="skel h-3 w-1/4" />
            <div className="skel h-3 w-1/6" />
            <div className="skel h-3 w-1/5" />
          </div>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-4 opacity-70">
              <div className="skel h-6 w-1/5" />
              <div className="skel h-6 w-1/4" />
              <div className="skel h-6 w-1/6" />
              <div className="skel h-6 w-1/5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
