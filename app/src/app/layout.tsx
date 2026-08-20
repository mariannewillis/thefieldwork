import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { SITE_URL } from "@/content/site";

/**
 * The mockup loaded these from the Google Fonts CDN with a <link>. next/font
 * self-hosts them instead: same faces, no third-party request on page load,
 * and no layout shift. It also means no font request leaves the visitor's
 * browser to a US server, which matters for the privacy posture (§14).
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  // Makes every relative URL in metadata resolve against the real domain —
  // canonical tags and share previews included. Without it Next resolves them
  // against whatever host served the request, so a link shared from the
  // Replit preview URL would point people at the preview forever.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "The Field Work — aura healing, hands-off, one hour",
  description:
    "You keep your clothes on. Nobody touches you. Nothing is asked of your beliefs. Aura healing with Marianne — one hour, seated and clothed throughout.",

  /**
   * WHAT A LINK TO THIS SITE LOOKS LIKE WHEN SOMEBODY PASTES IT.
   *
   * There was nothing here, so every share of every page — a workshop sent to a
   * friend, a link in a WhatsApp group, a post — arrived as a bare blue URL. A
   * practice whose whole argument is "this is a real room with a real person in
   * it" was showing a string.
   *
   * ON THE ROOT LAYOUT so it covers every page, and every page's own
   * `generateMetadata` overrides the title and description without having to
   * restate the image. `metadataBase` above is what makes the relative path
   * resolve against the real domain rather than against whatever host served
   * the request.
   *
   * THE ALTAR AND NOT THE ROOM: it is the one photograph on this site that
   * reads at 1200×630 with the plum still in it. A wide crop of a room becomes
   * a strip of floor.
   */
  openGraph: {
    type: "website",
    siteName: "The Field Work",
    locale: "en_GB",
    url: "/",
    title: "The Field Work — aura healing, hands-off, one hour",
    description:
      "You keep your clothes on. Nobody touches you. Nothing is asked of your beliefs. Aura healing with Marianne, in one room in Frome.",
    images: [
      {
        url: "/media/marianne-altar-light-1200.jpg",
        width: 1200,
        height: 805,
        alt: "Candlelight on the altar in her room: a candle in a glass, crystals and cards under fairy lights.",
      },
    ],
  },

  // `summary_large_image` and not `summary`: the small card crops to a square
  // thumbnail, which of this photograph is a bright blur.
  twitter: {
    card: "summary_large_image",
    title: "The Field Work — aura healing, hands-off, one hour",
    description:
      "One hour, seated and clothed throughout, in one room in Frome.",
    images: ["/media/marianne-altar-light-1200.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#160712",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
