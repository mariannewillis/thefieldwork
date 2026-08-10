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
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
