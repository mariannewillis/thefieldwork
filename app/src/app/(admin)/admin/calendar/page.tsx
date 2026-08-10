import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Your diary"
      title="Calendar"
      lede="Your month, your week, your day. What is booked, what is held, and what is still free for someone to take."
      next={[
        "Look ahead a month and see where the gaps are",
        "Open a day to see every session on it",
        "Block out time you are not available"
      ]}
    />
  );
}
