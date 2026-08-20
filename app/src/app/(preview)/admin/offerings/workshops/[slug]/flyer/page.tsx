import type { Metadata } from "next";
import FlyerPrint from "@/components/admin/FlyerPrint";

/**
 * The workshop's flyer, on its own, at A5. See `FlyerPrint` for why this is a
 * page to print rather than a file to download.
 */

export const metadata: Metadata = {
  title: "Flyer — The Field Work",
  // Never indexed. It is behind the session anyway, but a printable sheet is
  // exactly the shape of thing a crawler would happily list.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FlyerPrint kind="workshop" slug={slug} />;
}
