"use client";

import { useEffect, useState } from "react";

/**
 * "Monday morning" — the real one, in London.
 *
 * The approved screen has this hardcoded to "Thursday morning", which is
 * charming until the portal is open on a Tuesday and the greeting argues with
 * the clock four inches above it. Small contradictions like that are how an
 * owner learns to stop reading the interface.
 *
 * Empty until mounted, for the same reason the header clock is: the server
 * renders in UTC on a machine that may be anywhere, and a greeting that
 * changes on hydration is a mismatch React will complain about.
 */
export default function DayGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Europe/London",
    }).format(now);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        hour12: false,
        timeZone: "Europe/London",
      }).format(now),
    );
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    setGreeting(`${weekday} ${part}`);
  }, []);

  // A non-breaking space holds the line's height before it fills, so the
  // heading below doesn't jump.
  return <>{greeting ?? " "}</>;
}
