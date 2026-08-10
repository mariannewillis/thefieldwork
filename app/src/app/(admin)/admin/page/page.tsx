import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Your words"
      title="Home page"
      lede="Your home page, editable in place. You change the words on the page itself — click the sentence you want to change and type over it — rather than filling in a form of named boxes somewhere else."
      next={[
        "Rewrite any heading or paragraph by clicking it on the page",
        "Swap a photograph for another from your pictures",
        "See exactly how it will look before anyone else does, then publish"
      ]}
    />
  );
}
