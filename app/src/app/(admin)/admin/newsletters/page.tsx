import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="What you send"
      title="Newsletter"
      lede="Write a letter to the people on your list, see it as they will see it, and send it when you are ready."
      next={[
        "Write a letter and save it as a draft for as long as you like",
        "Send yourself a test copy first",
        "Look back at everything you have sent before"
      ]}
    />
  );
}
