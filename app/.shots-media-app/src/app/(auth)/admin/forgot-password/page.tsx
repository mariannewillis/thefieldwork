import Link from "next/link";
import ForgotForm from "./ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <div className="pool on-pool px-8 py-10 sm:px-10">
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        Forgotten your password
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        Tell us the email address on your account and we will send you a link to
        choose a new password.
      </p>

      <ForgotForm />

      <p className="mt-8 text-[17px] text-ink-soft">
        <Link href="/admin/login" className="text-action underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
