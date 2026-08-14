import SectionStub from "@/components/admin/SectionStub";

export default function Page() {
  return (
    <SectionStub
      eyebrow="Your images"
      title="Pictures"
      lede="Every photograph and image on the site. Upload from your phone or your computer, and use them anywhere."
      next={[
        "Upload a new photograph",
        "Give each one a description, so people using a screen reader know what it shows",
        "Replace a picture everywhere it appears, in one move",
      ]}
    />
  );
}
