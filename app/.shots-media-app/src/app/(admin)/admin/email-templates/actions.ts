"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { resetSlots, saveSlots } from "@/lib/email/templates";
import { isTemplateKey } from "@/lib/email/wording";

/**
 * The two things she can do to a message's wording: save it, or put it back.
 *
 * NOTHING HERE VALIDATES WHAT SHE WROTE, and that is deliberate rather than
 * lax. There is no shape a sentence has to have — she is a person writing to
 * another person, and a form that refused her apostrophe would be the wrong
 * tool. What makes that safe is that the string is never treated as anything
 * but text: `email/wording.ts` escapes it on the way into the letter, strips
 * control characters out of a subject before it becomes a header, and drops it
 * into a block that carries no facts. The guard is in the renderer, where it
 * cannot be forgotten, rather than in a validator here, where the next form
 * would have to remember it again.
 *
 * The one thing that IS enforced here is the key: it comes off a URL, and only
 * the nine names in EMAIL_TEMPLATE_KEYS reach the database.
 */

export type TemplateState = {
  /** Drawn under the form. Null when it worked. */
  error: string | null;
  /** Stamped on success, so the form can say so. */
  saved: number;
};

/** The one place that decides whether the caller is allowed to be here. */
async function requireSession() {
  // The admin layout already turned away anyone without a session, but a server
  // action is a POST endpoint of its own: it can be called directly, and it does
  // not inherit the layout's check.
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function saveTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  await requireSession();

  const key = String(formData.get("key") ?? "");
  if (!isTemplateKey(key)) {
    return { error: "That is not one of the nine messages.", saved: 0 };
  }

  await saveSlots(key, {
    subject: String(formData.get("subject") ?? ""),
    opening: String(formData.get("opening") ?? ""),
    signOff: String(formData.get("signOff") ?? ""),
  });

  refresh(key);
  return { error: null, saved: Date.now() };
}

/**
 * Put a message back to the wording the app itself writes.
 *
 * All three slots at once, and no confirmation. What it undoes is her own text
 * on one message; nothing anybody has received changes, nothing about money
 * moves, and the wording it goes back to is printed on the screen beside every
 * field — she can see exactly what she is getting.
 */
export async function resetTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  await requireSession();

  const key = String(formData.get("key") ?? "");
  if (!isTemplateKey(key)) {
    return { error: "That is not one of the nine messages.", saved: 0 };
  }

  await resetSlots(key);
  refresh(key);
  return { error: null, saved: Date.now() };
}

function refresh(key: string) {
  revalidatePath("/admin/email-templates");
  revalidatePath(`/admin/email-templates/${key}`);
}
