/**
 * The structured-data block, in the page it describes.
 *
 * `dangerouslySetInnerHTML` is how a `<script>` gets content in React, and the
 * string is one `JSON.stringify` produced on the server from our own rows —
 * never anything a person typed into a form and never anything from a query.
 * The one escape that matters is `</script>` appearing inside a value, which
 * would close the tag early; `JSON.stringify` does not escape it, so it is
 * escaped here.
 *
 * IT IS RENDERED IN THE BODY, not the head. Next has no supported way to put
 * arbitrary tags in `<head>` from a page, and every consumer of structured data
 * — Google, Bing and every assistant — reads it from wherever it is in the
 * document. The place it must NOT be is behind JavaScript, and it is not: this
 * is a server component and the block is in the delivered HTML.
 */
export default function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: json.replace(/<\/script/gi, "<\\/script"),
      }}
    />
  );
}
