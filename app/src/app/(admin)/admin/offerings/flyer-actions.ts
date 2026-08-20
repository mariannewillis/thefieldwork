"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { flyerOwner, type FlyerKind } from "@/lib/flyers";

/**
 * WRITING A FLYER — which is writing the DIFFERENCES between it and its
 * offering, and nothing else.
 *
 * Every field arrives as a string and is stored as `null` when it matches what
 * the offering already says. That is not a tidiness: it is what keeps a flyer
 * in step. She renames a workshop and the flyer is renamed with it, because
 * the flyer never stored the old name — right up until she types something
 * different into the field, at which point it did mean to be different.
 *
 * SO "CLEARING A FIELD" IS A REAL ACT and it is spelled the same way: an empty
 * box means "go back to what the workshop says", not "print nothing here". The
 * panel says so beside every field, because the two readings are both plausible
 * and only one of them is true.
 *
 * ONE ROW, UPSERTED. There is no create-then-edit: the first thing she changes
 * makes the row, and a flyer she has never opened has no row at all.
 */

const KINDS = new Set(["workshop", "course", "service"]);

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
}

export type FlyerState = { error: string | null; done: number };

/** The three-nullable-keys shape, as `OfferingMessage` uses. */
function keyFor(kind: FlyerKind, id: number) {
  return kind === "workshop"
    ? { workshopId: id }
    : kind === "course"
      ? { courseId: id }
      : { serviceId: id };
}

export async function saveFlyer(
  _prev: FlyerState,
  form: FormData,
): Promise<FlyerState> {
  await requireSession();

  const kind = String(form.get("kind") ?? "") as FlyerKind;
  const slug = String(form.get("slug") ?? "");
  if (!KINDS.has(kind)) return { error: "That is not an offering.", done: 0 };

  const id = await flyerOwner(kind, slug);
  if (id === null)
    return { error: "That offering is no longer here.", done: 0 };

  /**
   * A field is an OVERRIDE only when it differs from the offering's own words.
   * The panel posts what the offering says alongside what is in the box, so
   * this can tell "she left it alone" from "she typed the same thing" without
   * reading the offering a second time — and either way the answer is null,
   * which is the honest storage of "no difference".
   */
  const override = (name: string) => {
    const typed = String(form.get(name) ?? "").trim();
    const own = String(form.get(`${name}-own`) ?? "").trim();
    if (!typed) return null;
    return typed === own ? null : typed;
  };

  const picture = (name: string) => {
    const chosen = String(form.get(name) ?? "").trim();
    const own = String(form.get(`${name}-own`) ?? "").trim();
    if (!chosen) return null;
    return chosen === own ? null : chosen;
  };

  const layout =
    String(form.get("layout") ?? "one") === "three" ? "three" : "one";

  const focus = Number(String(form.get("groundFocus") ?? "38"));
  const groundFocus = Number.isFinite(focus)
    ? Math.max(0, Math.min(100, Math.round(focus / 10) * 10))
    : 38;

  const data = {
    layout,
    eyebrow: override("eyebrow"),
    headline: override("headline"),
    blurb: override("blurb"),
    footnote: override("footnote"),
    groundRef: picture("groundRef"),
    detailRef: picture("detailRef"),
    placeRef: picture("placeRef"),
    groundFocus,
  } as const;

  await prisma.flyer.upsert({
    where: keyFor(kind, id),
    create: { ...keyFor(kind, id), ...data },
    update: data,
  });

  revalidatePath(`/admin/offerings/${kind}s/${slug}`);
  return { error: null, done: Date.now() };
}

/**
 * Put the whole sheet back to the offering.
 *
 * The row is DELETED rather than blanked, because "no row" is exactly what a
 * flyer she has never touched is — and leaving a row of nulls behind would make
 * two states that mean the same thing, one of which the reader has to know
 * about.
 */
export async function resetFlyer(
  _prev: FlyerState,
  form: FormData,
): Promise<FlyerState> {
  await requireSession();

  const kind = String(form.get("kind") ?? "") as FlyerKind;
  const slug = String(form.get("slug") ?? "");
  if (!KINDS.has(kind)) return { error: "That is not an offering.", done: 0 };

  const id = await flyerOwner(kind, slug);
  if (id === null)
    return { error: "That offering is no longer here.", done: 0 };

  await prisma.flyer.deleteMany({ where: keyFor(kind, id) });

  revalidatePath(`/admin/offerings/${kind}s/${slug}`);
  return { error: null, done: Date.now() };
}
