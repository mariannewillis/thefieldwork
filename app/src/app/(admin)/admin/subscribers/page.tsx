import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Your list"
      title="Subscribers"
      lede="The people who have asked to hear from you, and the people who have asked to stop."
      next={[
        "See who has joined and when",
        "Remove someone who has asked to be taken off",
        "Export the list, so it is yours and not locked in here"
      ]}
    />
  );
}
