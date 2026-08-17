import Link from "next/link";
import { inspectResetToken } from "@/lib/auth/reset";
import ResetForm from "./ResetForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const check = await inspectResetToken(token ?? "");

  // A dead link gets one message whatever killed it. Distinguishing "expired"
  // from "already used" from "never existed" would tell someone holding a
  // stolen link which of those it is.
  if (!check.ok) {
    return (
      <div className="pool on-pool px-8 py-10 sm:px-10">
        <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
          That link has expired
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          Reset links work once and last an hour. Ask for a new one and it will
          arrive in a moment.
        </p>
        <p className="mt-8 text-[17px]">
          <Link href="/admin/forgot-password" className="text-action underline">
            Send me a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="pool on-pool px-8 py-10 sm:px-10">
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        Choose a new password
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        This also signs out anywhere else the account is signed in.
      </p>
      <ResetForm token={token ?? ""} />
    </div>
  );
}
