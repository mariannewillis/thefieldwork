import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="What you offer"
      title="Offerings"
      lede="Your sessions, courses and workshops — what each one is, what it costs, and whether it is currently open for people to book."
      next={[
        "Write and edit each offering in your own words",
        "Set the price, and whether it is paid in full or by deposit",
        "Take something off the site without deleting it"
      ]}
    />
  );
}
