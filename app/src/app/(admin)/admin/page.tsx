import DayGreeting from "@/components/admin/DayGreeting";
import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow={<DayGreeting />}
      title="What needs you today"
      lede="Everything waiting on a decision from you, in one place, so you can start the day here and know nothing has been missed."
      next={[
        "See who is booked in today, at a glance",
        "Answer the requests that are waiting on your yes or no",
        "Pick up anything that came in overnight",
      ]}
    />
  );
}
