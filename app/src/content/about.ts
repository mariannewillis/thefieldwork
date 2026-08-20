/**
 * The about page's words and pictures — the editable surface.
 *
 * Same shape and same reason as `content/home.ts`: every string and every
 * photograph on /about is a CONTENT VALUE with a seeded default rather than a
 * literal inside the component, so the day the portal reaches this page
 * (D-2/D-3) these become rows and the page component does not change.
 *
 * WHAT IS NOT EDITABLE, and is fixed by the approved screen
 * (docs/screens/webapp/about.html): the three beats, their order, the
 * alternating left/right anchor, the type scale and the shape law.
 *
 * ═══ THE ONE RULE THIS FILE HAS ═══════════════════════════════════════════
 * MARIANNE IS A REAL PERSON AND THIS IS HER PROFESSIONAL BIOGRAPHY. Nothing
 * here may claim a qualification, a training body, a number of years, an
 * accreditation, a client story or a testimonial. brief §20.1 records that even
 * her NAME and the figures "fifteen years practising, twelve teaching" are
 * UNVERIFIED — used during brief authoring and never confirmed with her. So the
 * page is written to work WITHOUT those facts rather than around a gap: it says
 * what is verifiable (trained before she taught, teaches practitioners now,
 * one person at a time, hands-off) and says nothing else about her history.
 *
 * The approved screen carried a bracketed "[Placeholder — years training and
 * teaching…]" note that RENDERED TO VISITORS. It is not reproduced here, and a
 * visible placeholder must never be reinstated — see the same note in
 * about.html and in `content/home.ts::throat.credential`.
 * ═════════════════════════════════════════════════════════════════════════
 */

import { opening, type Plate } from "@/content/home";

export const about = {
  meta: {
    title: "About — The Field Work",
    description:
      "Marianne, who runs The Field Work alone from one room. What the practice is, what she does, and how to ask a question before you book.",
  },

  /** ═══ BEAT 1 — the practice. Small pool, anchored left, on the hero. ═══ */
  practice: {
    plate: opening(0.5) satisfies Plate,
    eyebrow: "Before the hour, the person",
    heading: "One practitioner. One room. No clinic front.",
    body: "The Field Work is Marianne, working alone. No reception, no other therapists on a rota, no name badge — the person who reads your message is the person you sit with.",
    /**
     * The four verbs are the practice's own description of what it does to a
     * field (brief §20 glossary), and they are already the third beat of the
     * home page. Restated here because this pool is where somebody asks what
     * the practice IS, and four verbs answer that faster than a paragraph.
     */
    verbs:
      "The work has four verbs: clearing, charging, repairing, restructuring. All four happen in the field around you rather than on your body.",
  },

  /** ═══ BEAT 2 — Marianne. The diptych: her portrait, then her pool. ═══ */
  person: {
    /** Human-free by design: her face is never covered by a pool edge. */
    plate: {
      src: "marianne-room-aglow",
      // The same photograph the home page's Sacral beat uses, described in the
      // same words — one picture, one description, wherever it appears.
      alt: "Her attic practice room at dusk: a warm pool of lamplight lying across the kilim, no one in the frame.",
      b: 0.42,
      ox: "58%",
      oy: "54%",
    } satisfies Plate,
    portrait: {
      src: "marianne-portrait-in-the-light",
      alt: "Marianne, lit from behind by a soft ring of gold light falling to plum.",
    },
    eyebrow: "The person whose hands these are",
    lead: "She has sat where you are sitting.",
    /** Verbatim from the home page's Throat beat, which is approved copy. */
    body: [
      "On the other side of the same question, in somebody else's quiet room, deciding whether to book and not wanting to ask what it involved. She was not asked to believe anything then, and she does not ask it of you now.",
      "She works alone and hands-off, one appointment at a time. Nothing is a package: an hour is an hour, and whether there is another one is decided afterwards, by you.",
    ],
    credentialLabel: "What she does",
    /**
     * THREE STATEMENTS, NO NUMBERS. Each is either in the brief or already on
     * the home page. Adding a year, a school or a certificate to this list
     * needs her to say it first — see the rule at the top of this file.
     */
    credentials: [
      "Trained in aura healing before she taught it.",
      "Teaches the same work to other practitioners now.",
      "Sees one person at a time, by appointment, hands-off throughout.",
    ],
    /**
     * The way to ask, at the foot of her own box (operator, 2026-08-20). It was
     * a beat of its own beneath this one — a whole section between reading
     * about her and being able to say anything to her.
     */
    askLabel: "Ask a question first",
    askHref: "/contact",
  },

} as const;
