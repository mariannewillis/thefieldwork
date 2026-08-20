/**
 * WHY THE PICTURE WILL ARRIVE AS A HOLE, said before she sends rather than
 * after (operator, 2026-08-20 — "the image didn't display in the email").
 *
 * A photograph in a letter is a LINK, not bytes in the envelope, and the link
 * is fetched by GMAIL'S servers rather than by the reader's browser. So the
 * address in it has to be reachable from the public internet and has to be
 * serving this app's `/media/`. Sending from a laptop, it says
 * `http://localhost:3000/media/…`, which is reachable from exactly one machine
 * on earth and not the one doing the fetching. Every picture, every recipient,
 * every time.
 *
 * `compose.ts` explains at length why the address is the site's own rather than
 * the canonical domain, and why the picture is not attached the way the mark is
 * (a 13 kB mark rides; a 400 kB photograph times two hundred people does not).
 * Both of those decisions are right and neither can make the picture appear.
 * The only thing that can is the deployment — so the honest move is to SAY so
 * at the moment she is choosing a picture, instead of letting her find out from
 * somebody who got the letter.
 *
 * IT DISAPPEARS BY ITSELF the day `NEXT_PUBLIC_SITE_URL` is a public address:
 * there is nothing to remember to take out.
 */
export default function PictureReachWarning() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const unreachable =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(site);
  if (!unreachable) return null;

  return (
    <p
      role="note"
      className="mt-3 max-w-[60ch] border-l-2 border-pool-error pl-4 text-[16px] leading-relaxed text-ink-soft"
    >
      <strong className="font-semibold text-ink">
        Pictures will not show in what arrives.
      </strong>{" "}
      A picture in an email is fetched by the recipient&rsquo;s mail provider,
      not by them — and from here it is addressed to{" "}
      <span className="fig font-mono text-[15px]">{site}</span>, which only this
      machine can reach. The words, the buttons and the mark all arrive
      normally; the photograph arrives as an empty box. It fixes itself the day
      the site is live at its own address, and nothing here needs changing then.
    </p>
  );
}
