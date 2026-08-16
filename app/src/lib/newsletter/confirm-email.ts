import "server-only";
import { copy, renderLetter, type Block } from "@/lib/email/render";
import type { Mail } from "@/lib/email";

/**
 * The one message the newsletter sends that is not a newsletter.
 *
 * WHY IT EXISTS AT ALL. Anyone can type anyone's address into a form. Without
 * this, a stranger — or a bot walking the site — could put a person on
 * Marianne's list and that person would start receiving mail they never asked
 * for. The industry name for the fix is double opt-in; the plain version is
 * that the only proof an address wants the letter is that somebody holding it
 * pressed a link.
 *
 * NOT ONE OF THE NINE. It is not on the templates screen and Marianne cannot
 * reword it, for the same reason she cannot reword the reset email's middle:
 * the sentence explaining that pressing the link is what puts them on the list
 * IS the consent record, and a version of it she had edited would be a consent
 * record whose wording nobody could vouch for. The letter it leads to is
 * entirely hers.
 *
 * NO UNSUBSCRIBE LINE, and that is not an oversight. There is nothing yet to
 * unsubscribe from — the whole message is an offer to join that expires by
 * being ignored. Ignoring it is the unsubscribe.
 */
export function confirmEmail(
  link: string,
  name: string | null,
): Omit<Mail, "to"> {
  const hello = name ? `${name}, ` : "";

  return {
    subject: "One press, and the letter is yours — The Field Work",
    text: [
      `${hello}somebody asked for The Field Work's monthly letter at this address.`,
      "",
      "If that was you, press this once and it starts arriving:",
      link,
      "",
      "It is one page, once a month — what is open, and whatever the room has been like. Every issue carries a link that takes you off the list again in one press.",
      "",
      "If it was not you, do nothing at all. Nothing has been added and nothing will arrive.",
    ].join("\n"),
    html: renderLetter({
      subject: "One press, and the letter is yours — The Field Work",
      preheader:
        "Press the link to start receiving the monthly letter. If it was not you, do nothing.",
      mastheadLabel: "The monthly letter",
      sections: [
        {
          ground: "pool",
          blocks: [
            {
              kind: "headline",
              text: copy(
                `${hello}somebody asked for the monthly letter at this address.`,
              ),
              size: 30,
            } satisfies Block,
            {
              kind: "paragraph",
              text: copy(
                "If that was you, one press starts it. It is one page, once a month — what is open, and whatever the room has been like.",
              ),
            },
          ],
        },
        {
          ground: "pool",
          blocks: [
            { kind: "eyebrow", text: copy("If that was you") },
            { kind: "button", label: "Yes, send me the letter", href: link },
            { kind: "rule" },
            {
              kind: "note",
              text: copy(
                "If it was not you, do nothing at all. Nothing has been added to any list and nothing will arrive.",
              ),
            },
          ],
        },
      ],
      why: "You are getting this because this address was typed into the subscribe form on thefieldwork.co.uk. Nothing is sent to it until the link above is pressed.",
      // Nothing to leave yet. See the module note.
      unsubscribe: null,
    }),
  };
}
