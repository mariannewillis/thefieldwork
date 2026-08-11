import type { Metadata } from "next";
import { Azeret_Mono, Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "../(admin)/admin.css";

/**
 * The chrome-less half of the portal: sign-in and the forced password change.
 *
 * These pages share the portal's stylesheet and type, but deliberately NOT its
 * shell. A navigation rail on a sign-in page offers eleven doors to someone who
 * has not yet proved they may open any of them.
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--admin-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--admin-body",
  display: "swap",
});

const mono = Azeret_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--admin-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sign in — The Field Work",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} bg-ground text-plate-text font-body`}
    >
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        {/* The converted derivatives only — the 7.8MB source PNG in assets/
            is never served. AVIF first at 32KB, WebP at 59KB for anything
            that cannot read it, and the smaller pair for narrow screens. */}
        <picture>
          {/* A portrait phone crops a landscape interior to a narrow column and
              loses the lamp entirely, which is the only thing in the frame that
              means anything. So narrow screens get a genuinely different crop —
              art direction, not a resize. */}
          <source
            media="(max-width: 900px)"
            type="image/avif"
            srcSet="/media/auth-window-portrait.avif"
          />
          <source
            media="(max-width: 900px)"
            type="image/webp"
            srcSet="/media/auth-window-portrait.webp"
          />
          <source
            type="image/avif"
            srcSet="/media/auth-window-1100.avif 1100w, /media/auth-window-2000.avif 2000w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/media/auth-window-1100.webp 1100w, /media/auth-window-2000.webp 2000w"
            sizes="100vw"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/auth-window-2000.webp"
            alt=""
            aria-hidden="true"
            className="auth-field"
          />
        </picture>
        <div className="auth-scrim" aria-hidden="true" />

        <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
          {/* The same mark the public homepage wears in its header, and the
              same file — so arriving at the private side still reads as her
              site rather than a generic admin login. */}
          <a href="/" aria-label="The Field Work — home" className="mb-10 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-horizontal.svg"
              alt="The Field Work"
              className="auth-logo"
            />
          </a>
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
