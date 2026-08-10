import type { Metadata } from "next";
import {
  Azeret_Mono,
  Cormorant_Garamond,
  Source_Sans_3,
} from "next/font/google";
import AdminShell from "@/components/admin/AdminShell";
import "./admin.css";

/**
 * The admin's own font instances. They carry `--admin-*` variable names rather
 * than reusing the site's `--font-display` / `--font-body`, so the two type
 * systems can never shadow one another. next/font de-duplicates the underlying
 * files, so declaring Cormorant twice costs nothing on the wire.
 *
 * Azeret Mono is the figures face — every number that can sit above another
 * number in a column (times, counts, prices) is set in it. The site's homepage
 * has no numbers, which is why it doesn't load this.
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
  title: "Admin — The Field Work",
  // The portal must never appear in a search result, whatever else happens.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
