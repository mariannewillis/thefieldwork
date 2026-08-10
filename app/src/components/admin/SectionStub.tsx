/**
 * A section that exists in the rail but hasn't been built yet.
 *
 * This says so plainly rather than showing an empty table or a spinner that
 * never resolves. A half-built portal that admits what it is can be handed to
 * the client and clicked through; one that fakes readiness can't.
 *
 * Each stub is replaced wholesale as its section lands — there is no shared
 * behaviour here worth keeping, only an honest holding page.
 */
import type { ReactNode } from "react";

export default function SectionStub({
  eyebrow,
  title,
  lede,
  next,
}: {
  eyebrow: ReactNode;
  title: string;
  lede: string;
  /** What this section will do, in Marianne's terms, not the build's. */
  next: string[];
}) {
  return (
    <section className="pt-8" aria-labelledby="section-title">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
        {eyebrow}
      </p>
      <h1
        id="section-title"
        className="font-display font-normal text-[34px] sm:text-[40px] text-plate-text mt-3 leading-[1.08]"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-[62ch] text-[19px] leading-relaxed text-plate-soft">
        {lede}
      </p>

      <div className="pool on-pool mt-9 max-w-[62ch] px-7 py-7">
        <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-ink-soft">
          Not built yet
        </p>
        <p className="mt-3 text-[19px] leading-relaxed text-ink">
          When this section is ready you will be able to:
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {next.map((line) => (
            <li
              key={line}
              className="flex gap-3 text-[17px] leading-relaxed text-ink"
            >
              <span
                aria-hidden="true"
                className="mt-[10px] h-px w-4 shrink-0 bg-action"
              />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
