import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="When you work"
      title="Availability"
      lede="The hours you are open to be booked. What you set here is what the site offers people."
      next={[
        "Set your usual working hours, day by day",
        "Close a date or a stretch of dates entirely",
        "Change how much notice you need before someone can book",
      ]}
    />
  );
}
