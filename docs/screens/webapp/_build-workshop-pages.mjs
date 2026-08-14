/**
 * Public workshop-detail page builder.
 *
 * BASE = `docs/screens/workshopflow/workshop-detail-purchase.html`, at the
 * operator's instruction: "the page should have looked like
 * workshop-detail-purchase.html". An earlier pass built this page in
 * `webapp/workshop-detail.html`'s dialect instead — wrong base, rebuilt.
 *
 * The base page's <head> (its Tailwind config + the whole ~200-line <style>
 * layer: .pool, .field, .fig, .card, the plum/gold token set) is lifted
 * VERBATIM as bytes, so the page can't drift into a third dialect. Only the
 * body is authored.
 *
 *   node _build-workshop-pages.mjs            # build
 *
 * Authored by agent:
 *   _shell/extra.css      styles for the regions the base page lacks
 *                         (long body, gallery carousel, location map)
 *   _frag/<slug>.html     the body — everything between <body> and </body>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, "..", "workshopflow", "workshop-detail-purchase.html");
const SHELL = join(HERE, "_shell");
const FRAG = join(HERE, "_frag");

const src = readFileSync(BASE, "utf8").replace(/\r\n/g, "\n");

const styleEnd = src.lastIndexOf("</style>");
if (styleEnd < 0) throw new Error("base page shape changed — no </style>");
const headTop = src.slice(0, styleEnd + "</style>".length);

/* ── ONE page · facts are home.html's, which is canonical ─────────────────────
   The operator's call: a single default detail page is enough. Future workshops
   are created in admin, and this seeded default is edited or deleted there like
   any other record — so `outFile` is the canonical screen name. The other slugs
   home.html links to resolve to this same template. */
const WORKSHOPS = [
  {
    slug: "reading-the-field",
    outFile: "workshop-detail.html",
    name: "Reading the Field",
    title: "Reading the Field — a one-day workshop · The Field Work",
    description:
      "A full day of learning to notice what you already notice. Sat 24 October, 10:00–16:00, the garden room in Frome. £95, ten places.",
    date: "Sat 24 Oct",
    time: "10:00–16:00",
    price: "£95",
    places: 10,
  },
];

function compose(w) {
  const fragPath = join(FRAG, `${w.slug}.html`);
  if (!existsSync(fragPath)) return { slug: w.slug, skipped: true };
  const body = readFileSync(fragPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const extraPath = join(SHELL, "extra.css");
  const extra = existsSync(extraPath)
    ? readFileSync(extraPath, "utf8").trimEnd()
    : "";

  const head = headTop
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${w.title}</title>`)
    .replace(
      /(<meta\s*\n?\s*name="description"\s*\n?\s*content=")[\s\S]*?("\s*\/>)/,
      `$1${w.description}$2`,
    );

  const doc = `${head}
${
  extra
    ? `    <!-- regions the base purchase page does not carry: the long body,\n         the gallery carousel, the location map. -->\n    <style id="workshop-page-extra">\n${extra}\n    </style>\n`
    : ""
}  </head>

${body}
</html>
`;
  const out = join(HERE, w.outFile ?? `workshop-detail-${w.slug}.html`);
  writeFileSync(out, doc, "utf8");
  return { slug: w.slug, bytes: Buffer.byteLength(doc, "utf8") };
}

mkdirSync(FRAG, { recursive: true });
mkdirSync(SHELL, { recursive: true });
for (const w of WORKSHOPS) {
  const r = compose(w);
  console.log(
    r.skipped
      ? `-- ${r.slug} (no fragment yet)`
      : `ok ${r.slug}  ${r.bytes} bytes`,
  );
}
