import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Paperwork"
      title="Documents"
      lede="Intake forms, consent notes and anything else a person sends you before a session."
      next={[
        "Read what someone sent with their booking",
        "Keep your own notes against a person's file",
        "Delete a record entirely when someone asks you to"
      ]}
    />
  );
}
