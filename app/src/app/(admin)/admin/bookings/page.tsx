import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Waiting on you"
      title="Requests"
      lede="Session and workshop requests that have come in through the site, and every booking already confirmed."
      next={[
        "Accept or decline a request, with the confirmation email sent for you",
        "Look back over someone's history before you answer",
        "Cancel a booking and have the person told automatically"
      ]}
    />
  );
}
