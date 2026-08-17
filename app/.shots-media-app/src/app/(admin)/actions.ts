"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth/server";

/**
 * Sign out. A POST, not a link — a GET that destroys state can be triggered by
 * anything that prefetches or embeds a URL, which is how people find
 * themselves mysteriously signed out.
 */
export async function signOut(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
