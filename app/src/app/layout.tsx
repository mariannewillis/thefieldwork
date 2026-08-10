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
