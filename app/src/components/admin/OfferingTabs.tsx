import Link from "next/link";

/**
 * THE FOUR FACES OF ONE OFFERING — the form, who is coming, writing to them,
 * and the flyer for it.
 *
 * A workshop's page was the editor and nothing else, so "who has booked this?"
 * meant going to Bookings and filtering, and "tell them the room has moved"
 * meant her own mail client and copying addresses out of a table (operator,
 * 2026-08-19). All three questions are about the same thing and now live on it.
 *
 * LINKS, LIKE EVERY OTHER TAB IN THIS PORTAL: the choice survives a reload, it
 * can be bookmarked, and the page needs no client state to hold it. The editor
 * is the default because it is what the page was.
 *
 * THE COUNT IS ON ATTENDING ONLY. "Editor 1" means nothing, and a number beside
 * Email would be a number of what — recipients she has not chosen yet.
 *
 * THE FLYER IS LAST because it is the only one that leaves the screen: the
 * other three are things she does to the offering, and this one is a piece of
 * paper she takes away and pins up (operator, 2026-08-20).
 */

export type OfferingTab = "editor" | "attending" | "email" | "flyer";

export function offeringTab(value: string | undefined): OfferingTab {
  return value === "attending" || value === "email" || value === "flyer"
    ? value
    : "editor";
}

export default function OfferingTabs({
  base,
  current,
  attending,
  /** "Sessions" reads wrong on a one-to-one; it is one person at a time. */
  kind,
}: {
  /** The offering's own address, without a query. */
  base: string;
  current: OfferingTab;
  attending: number;
  kind: "workshop" | "course" | "service";
}) {
  const tabs: { key: OfferingTab; label: string; count?: number }[] = [
    { key: "editor", label: "Editor" },
    {
      key: "attending",
      // A service is a sequence of individuals rather than a cohort, so the
      // word is different and the difference is the point.
      label: kind === "service" ? "Who has asked" : "Attending",
      count: attending,
    },
    { key: "email", label: "Email" },
    { key: "flyer", label: "Flyer" },
  ];

  return (
    <nav
      aria-label="This offering"
      className="mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-plate-rule/40"
    >
      {tabs.map((tab) => {
        const href = tab.key === "editor" ? base : `${base}?tab=${tab.key}`;
        const on = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={
              on
                ? "t border-b-2 border-gold pb-2 text-[19px] font-semibold text-plate-text"
                : "t border-b-2 border-transparent pb-2 text-[19px] text-plate-soft hover:text-plate-text"
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <>
                {" "}
                <span className="fig font-mono text-[16px] tabular-nums">
                  {tab.count}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
