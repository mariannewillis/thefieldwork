/**
 * THE PHOTOGRAPH BEHIND A WHOLE PAGE, and the scrim over it.
 *
 * Fifteen pages drew this by hand as a bare `<img>` pointed at the 2400 JPEG —
 * which is the MOST COMPRESSED derivative the pipeline emits (168KB against the
 * AVIF's 48KB at the same width) and the only one every other photograph on the
 * site has been avoiding since D-6. Stretched over a tall page it showed, and
 * the operator reported the detail pages as looking low quality. They were.
 *
 * So the browser gets the choice here, exactly as it does on the home page: one
 * basename, six files, AVIF first. That is the whole of the quality fix, and
 * doing it in one component rather than in fifteen files is what stops the
 * sixteenth page being written the old way.
 *
 * TWO GROUNDS, AND THE DIFFERENCE IS WHAT IS IN THE PICTURE:
 *
 *   photograph  Held a long way back — dimmed hard, because the picture has
 *               people in it and a face must never compete with the type.
 *   abstract    Let to show, because an abstract has nothing to compete with
 *               and at the photograph's values it reads as nothing at all.
 *
 * It is a PROP rather than a guess from the basename: the same file can be
 * either, and a component that sniffed the name would be wrong the first time
 * she uploaded a picture called something else.
 */
export default function PageField({
  src,
  ground = "photograph",
}: {
  /** The media basename. Never a path — the derivatives are built here. */
  src: string;
  ground?: "photograph" | "abstract";
}) {
  const field =
    ground === "abstract" ? "page-field page-field--abstract" : "page-field";
  const scrim =
    ground === "abstract" ? "page-scrim page-scrim--abstract" : "page-scrim";

  return (
    <>
      {/* Decorative: it carries no alt and is hidden from assistive tech. The
          page says in words whatever the picture is doing. */}
      <picture>
        <source
          type="image/avif"
          srcSet={`/media/${src}-1200.avif 1200w, /media/${src}-2400.avif 2400w`}
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet={`/media/${src}-1200.webp 1200w, /media/${src}-2400.webp 2400w`}
          sizes="100vw"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/media/${src}-2400.jpg`}
          alt=""
          aria-hidden="true"
          className={field}
        />
      </picture>
      <div className={scrim} aria-hidden="true" />
    </>
  );
}
