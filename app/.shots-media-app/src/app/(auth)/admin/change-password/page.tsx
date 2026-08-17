import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const forced = session.mustChangePassword;

  return (
    <div className="pool on-pool px-8 py-10 sm:px-10">
      <p className="fig font-mono text-[15px] uppercase tracking-[0.18em] text-ink-soft">
        {forced ? "One thing first" : "Your account"}
      </p>
      <h1 className="mt-3 font-display text-[38px] font-normal leading-[1.05] text-ink">
        {forced ? "Choose your password" : "Change your password"}
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        {forced
          ? "You signed in with the temporary password we set up for you. Everyone who has ever seen the handover notes knows it, so please replace it before you go any further."
          : "Changing this signs out every other device you are signed in on."}
      </p>

      <ChangePasswordForm />
    </div>
  );
}
