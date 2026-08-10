import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Your details"
      title="Settings"
      lede="Your name, your contact details, and how the site behaves. Everything here is yours to change."
      next={[
        "Change the name shown across the site and in emails",
        "Update the address people reply to",
        "Change your password"
      ]}
    />
  );
}
