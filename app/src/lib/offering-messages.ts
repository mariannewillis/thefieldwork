import "server-only";
import type { DraftBlock } from "@/components/admin/OfferingMessage";
import { prisma } from "@/lib/db";
import { formatInstant } from "@/lib/format";

/**
 * WHAT SHE HAS WRITTEN ABOUT ONE OFFERING — the draft, and what has gone.
 *
 * ONE DRAFT AT A TIME, and it is the unsent one. She is writing "the room has
 * moved" rather than keeping a folder of drafts about one Saturday; a second
 * unsent message would only ever be one she had forgotten about.
 *
 * THE SENT ONES ARE A LIST AND NOT EDITABLE. The people they went to are
 * holding a copy of what they said, so they are shown as a record — what it
 * was called, when it went, how many got it — beside the thing she is writing
 * now.
 */

export type OfferingMail = {
  draft: { subject: string; blocks: DraftBlock[] };
  sent: { id: number; subject: string; when: string; count: number }[];
};

export async function offeringMessages(
  kind: "workshop" | "course" | "service",
  id: number,
): Promise<OfferingMail> {
  const where =
    kind === "workshop"
      ? { workshopId: id }
      : kind === "course"
        ? { courseId: id }
        : { serviceId: id };

  const [draft, sent] = await Promise.all([
    prisma.offeringMessage.findFirst({
      where: { ...where, sentAt: null },
      include: { blocks: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
    }),
    prisma.offeringMessage.findMany({
      where: { ...where, sentAt: { not: null } },
      orderBy: [{ sentAt: "desc" }],
      select: { id: true, subject: true, sentAt: true, recipientCount: true },
    }),
  ]);

  return {
    draft: {
      subject: draft?.subject ?? "",
      // The empty strings rather than nulls are what the form wants: a
      // controlled input given null warns and then silently becomes
      // uncontrolled the first time she types into it.
      blocks: (draft?.blocks ?? []).map((block) => ({
        kind: block.kind,
        text: block.text ?? "",
        imageBasename: block.imageBasename ?? "",
        alt: block.alt ?? "",
        href: block.href ?? "",
      })),
    },
    sent: sent.map((message) => ({
      id: message.id,
      subject: message.subject,
      when: message.sentAt ? formatInstant(message.sentAt) : "",
      count: message.recipientCount,
    })),
  };
}
