import { SiteBrand } from "@/components/site/SiteChrome";
import SubscribeForm from "@/components/site/SubscribeForm";
import "./coming-soon.css";

/**
 * WHAT SOMEBODY SEES WHILE THE SITE IS STILL HERS.
 *
 * She needs the site built, reachable and hers to work on for weeks before
 * anybody else should be reading it (operator, 2026-08-20). So this is not an
 * error page and it is not a holding image: it is a real page, in the site's own
 * clothes, saying the true thing — the work is here, it is not open yet.
 *
 * IT ASKS FOR AN ADDRESS, because somebody who arrives before the site is open
 * is the most interested visitor it will ever get, and turning them away with
 * nothing is the waste. The form is the one `/subscribe` uses, so an address
 * given here is confirmed the same way and lands on the same list — there is no
 * second, weaker way onto her list that exists only while this page is up.
 *
 * NO NAVIGATION, because every other page is behind this one and a nav bar
 * leading to pages that all answer with this page is a corridor of identical
 * doors.
 *
 * ITS OWN STYLESHEET, forced rather than chosen — see the note at the top of
 * `coming-soon.css`. It is rendered from a layout that wraps both families of
 * page on this site, and those two stylesheets must never load together.
 */
export default function ComingSoon() {
  return (
    <div className="soon">
      {/* The same six derivatives every other photograph on the site uses,
          AVIF first — a bare 2400 JPEG stretched over a page is what made the
          detail pages look low quality (D-6). */}
      <picture>
        <source
          type="image/avif"
          srcSet="/media/marianne-altar-light-1200.avif 1200w, /media/marianne-altar-light-2400.avif 2400w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/media/marianne-altar-light-1200.webp 1200w, /media/marianne-altar-light-2400.webp 2400w"
          sizes="100vw"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="soon__field"
          src="/media/marianne-altar-light-2400.jpg"
          alt=""
        />
      </picture>
      <div className="soon__scrim" />

      <SiteBrand className="soon__brand" />

      <main className="soon__inner">
        <div className="soon__pool">
          <p className="soon__eyebrow">Not open yet</p>

          <h1 className="soon__head">The room is being got ready.</h1>

          <p className="soon__body">
            The Field Work is one practitioner in one room in Frome, working
            alone and hands-off, an hour at a time. The site that says what that
            is like is nearly finished and is not open yet.
          </p>

          <p className="soon__body">
            If you leave an address, you will hear once &mdash; when it opens.
            Nothing else is sent to you in the meantime, and nothing is passed
            to anybody else.
          </p>

          <div className="soon__form">
            <SubscribeForm
              centred
              note="You will be sent one message to confirm the address is yours. Until you press the link in it, nothing is sent to you at all."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
