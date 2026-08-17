import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="pool on-pool px-8 py-10 sm:px-10">
      <h1 className="font-display text-[38px] font-normal leading-[1.05] text-ink">
        Sign in
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        This is the private side of the site. Everything you change here is
        yours.
      </p>

      {/* Sanitised again on the server — this is only for the round trip. */}
      <LoginForm next={next?.startsWith("/admin") ? next : "/admin"} />

      <p className="mt-7 text-[17px] text-ink-soft">
        <Link href="/admin/forgot-password" className="text-action underline">
          Forgotten your password?
        </Link>
      </p>
    </div>
  );
}
