import type { Metadata } from "next";
import {
  Azeret_Mono,
  Cormorant_Garamond,
  Source_Sans_3,
} from "next/font/google";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { unseenCounts } from "@/lib/unseen";
import { getSession } from "@/lib/auth/server";
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // THE authoritative check. Middleware already refused forged and expired
  // tokens, but only this can see the credential file — so only this knows
  // whether a validly-signed session was revoked by a password change.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const unseen = await unseenCounts();

  // The temporary password opens the sign-in form and nothing else. Enforced
  // here rather than only after login, so it cannot be stepped around by
  // navigating straight to a section.
  if (session.mustChangePassword) redirect("/admin/change-password");

  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
      {/* THE RAIL CARRIES WHAT SHE HAS NOT LOOKED AT. Read here rather than on
          each screen, because the point of a badge is that she sees it without
          opening the screen it belongs to. */}
      <AdminShell username={session.username} unseen={unseen}>
        {children}
      </AdminShell>
    </div>
  );
}
