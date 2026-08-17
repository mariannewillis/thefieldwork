import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailTemplateForm } from "@/components/admin/EmailTemplateForm";
import { loadSlots } from "@/lib/email/templates";
import { EMAIL_TEMPLATES, isTemplateKey } from "@/lib/email/wording";

/**
 * One message: the three parts she owns, what the app owns, and the letter.
 *
 * SIDE BY SIDE ON PURPOSE. What she is deciding is how a sentence reads inside
 * a message somebody has just paid money into, and a form on one screen with a
 * preview on another is a decision taken without the thing it is about. On a
 * narrow screen the letter falls under the form rather than beside it, which is
 * the same reading in a different order.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  if (!isTemplateKey(key)) return { title: "Not found — The Field Work" };
  return { title: `${EMAIL_TEMPLATES[key].label} — The Field Work` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isTemplateKey(key)) notFound();

  const template = EMAIL_TEMPLATES[key];
  const saved = await loadSlots(key);

  return (
    <section className="pt-8" aria-labelledby="template-h">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.14em] text-gold">
        <Link
          href="/admin/email-templates"
          className="t underline decoration-gold underline-offset-4 hover:text-plate-text hover:decoration-plate-text"
        >
          Email templates
        </Link>
      </p>

      <h1
        id="template-h"
        className="mt-3 max-w-[24ch] font-display text-[34px] font-normal leading-[1.08] text-plate-text sm:text-[40px]"
      >
        {template.label}
      </h1>

      <p className="mt-5 max-w-[68ch] text-[19px] leading-relaxed text-plate-soft">
        {template.sentWhen}
      </p>

      <div className="mt-9">
        <EmailTemplateForm
          templateKey={template.key}
          label={template.label}
          seed={{
            subject: template.seed.subject ?? "",
            opening: template.seed.opening ?? "",
            signOff: template.seed.signOff ?? "",
          }}
          saved={saved}
          placeholders={template.placeholders}
          locked={template.locked}
          previewUrl={`/admin/email-templates/${template.key}/preview`}
        />
      </div>
    </section>
  );
}
