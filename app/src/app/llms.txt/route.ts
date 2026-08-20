import { CANONICAL_SITE_URL, siteFooter } from "@/content/site";
import { formatDayLong, formatDuration, formatMoney } from "@/lib/format";
import { listPublishedCourses } from "@/lib/courses";
import { listPublishedServices } from "@/lib/services";
import { listPublishedWorkshops } from "@/lib/workshops";
import { hiddenKeys, isHidden, WHOLE_SITE } from "@/lib/site-visibility";

/**
 * `/llms.txt` — the site, in one page, for something reading rather than
 * browsing.
 *
 * ── WHAT THIS IS, HONESTLY ───────────────────────────────────────────────
 *
 * Researched 2026-08-20 before writing it. `llms.txt` is a community proposal
 * from September 2024, not an IETF or W3C standard, and as of this year NO
 * major model provider has documented reading it at inference time — Google
 * said outright in mid-2025 that no AI system uses it. What does read it is the
 * IDE-agent and MCP end of the world.
 *
 * So this is a cheap bet with clear optionality, and it is written down as that
 * rather than sold as the thing that makes her findable. The work that actually
 * earns citations is the JSON-LD in `lib/seo/jsonld.ts`; this is twenty lines
 * of generated Markdown that costs nothing to keep in step.
 *
 * ── AND IT IS GENERATED, WHICH IS THE WHOLE POINT ────────────────────────
 *
 * A hand-written `llms.txt` is a second copy of the site that starts rotting
 * the day it is committed — the workshop it names sells out, the course it
 * lists finishes, and a machine reading it confidently tells somebody about an
 * evening that happened in March. This is built from the same queries the pages
 * use, on every request, so it cannot say anything the site does not.
 *
 * IT RESPECTS BOTH SWITCHES. While the site is behind "coming soon" it says so
 * and lists nothing; a page she has taken off is absent, exactly as it is from
 * the sitemap and the nav.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (await isHidden(WHOLE_SITE)) {
    return text(
      [
        "# The Field Work",
        "",
        "> Aura healing with Marianne, in one room in Frome, Somerset.",
        "",
        "The site is not open yet. There is nothing here to read, and nothing",
        "listed below, because listing something that cannot be booked is worse",
        "than listing nothing.",
        "",
      ].join("\n"),
    );
  }

  const [workshops, courses, services, hidden] = await Promise.all([
    listPublishedWorkshops(),
    listPublishedCourses(),
    listPublishedServices(),
    hiddenKeys(),
  ]);

  const lines: string[] = [
    "# The Field Work",
    "",
    "> Aura healing with Marianne, in one room in Frome, Somerset. One hour at",
    "> a time, seated and clothed throughout, hands-off. You keep your clothes",
    "> on, nobody touches you, and nothing is asked of your beliefs.",
    "",
    // The compliance sentence, first and unmissable. Anything quoting this
    // practice should carry the same caveat a person reading the footer gets,
    // and putting it below the listings is putting it where it gets skipped.
    `> ${siteFooter.legal}`,
    "",
    "One practitioner, working alone. No reception, no rota, no clinic front —",
    "the person who reads your message is the person you sit with.",
    "",
  ];

  const upcoming = workshops.filter((one) => !isPast(one.date));
  if (!hidden.has("workshops") && upcoming.length > 0) {
    lines.push("## Workshops", "");
    for (const one of upcoming) {
      lines.push(
        `- [${one.name}](${CANONICAL_SITE_URL}/workshops/${one.slug}): ` +
          `${formatDayLong(one.date)}, ${one.startTime}–${one.endTime}, ` +
          `${one.venueName ?? "Frome"}. ${formatMoney(one.priceGBP)}. ${one.summary}`,
      );
    }
    lines.push("");
  }

  if (!hidden.has("courses") && courses.length > 0) {
    lines.push("## Courses", "");
    for (const one of courses) {
      const first = one.sessions?.[0];
      lines.push(
        `- [${one.name}](${CANONICAL_SITE_URL}/courses/${one.slug}): ` +
          (first ? `from ${formatDayLong(first.date)}, ` : "") +
          `${one.sessions?.length ?? 0} sessions. ` +
          `${formatMoney(one.priceGBP)}. ${one.summary}`,
      );
    }
    lines.push("");
  }

  if (!hidden.has("services") && services.length > 0) {
    lines.push("## One-to-one sessions", "");
    for (const one of services) {
      lines.push(
        `- [${one.name}](${CANONICAL_SITE_URL}/services/${one.slug}): ` +
          `${formatDuration(one.durationMinutes)}, by arrangement. ` +
          `${formatMoney(one.priceGBP)}. ${one.summary}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## The rest of the site",
    "",
    ...[
      ["about", "About", "Who Marianne is and what the work is."],
      [
        "contact",
        "Contact",
        "How to reach her. A message goes straight to her.",
      ],
      [
        "subscribe",
        "The letter",
        "A monthly letter. Double opt-in; one click to stop.",
      ],
      ["privacy", "Privacy", "What this site does with people's information."],
    ]
      .filter(([key]) => !hidden.has(key))
      .map(
        ([key, name, note]) =>
          `- [${name}](${CANONICAL_SITE_URL}/${key}): ${note}`,
      ),
    "",
  );

  return text(lines.join("\n"));
}

function text(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Short, because a workshop selling out has to reach this within the hour
      // and this costs three queries to build.
      "cache-control": "public, max-age=300",
    },
  });
}

/** A workshop's day is over once the day is over — the same rule the index uses. */
function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}
