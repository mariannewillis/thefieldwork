/**
 * Mechanical gate for the workshop-flow admin fragments.
 *
 * Checks the things a self-report can claim but not prove: chrome contamination,
 * content gated behind JS, the POSITION-DEPENDENT palette law (gold only on the
 * plate, magenta only on the pool), and tag balance.
 *
 *   node _check-fragments.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAG = join(HERE, "_frag");

const SCREENS = [
  ["admin-workshop-bookings", "ledger-h"],
  ["admin-offerings", "kinds-h"],
  ["admin-workshop-detail", "form-h"],
  ["admin-workshop-attendees", "room-h"],
];

/**
 * Walk the fragment and track whether we are inside an `on-pool` subtree, so a
 * colour class can be judged by POSITION rather than by presence. Depth-counting
 * on a tag stack — crude, but the fragments are well-formed HTML and it is the
 * only way to answer "is this gold sitting on cream?".
 */
function paletteViolations(html) {
  const bad = [];
  const tokenRe = /<\/?([a-z0-9]+)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/gi;
  const VOID = new Set([
    "img",
    "br",
    "hr",
    "input",
    "meta",
    "link",
    "source",
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "ellipse",
    "use",
    "stop",
    "area",
    "col",
  ]);
  const stack = [];
  let poolDepth = 0;
  let m;
  while ((m = tokenRe.exec(html))) {
    const [raw, tag, attrs, selfClose] = m;
    const closing = raw.startsWith("</");
    const line = html.slice(0, m.index).split("\n").length;

    if (closing) {
      const top = stack.pop();
      if (top?.pool) poolDepth--;
      continue;
    }

    const opensPool = /\bon-pool\b|\bbg-pool-surface\b/.test(attrs);
    const isVoid = VOID.has(tag.toLowerCase()) || selfClose === "/";

    // Judge this element's own classes at its own position. An element that
    // OPENS the pool is itself on the pool.
    const onPool = poolDepth > 0 || opensPool;
    if (
      /\b(text|bg|border|decoration|from|to|via)-secondary-\d/.test(attrs) &&
      onPool
    )
      bad.push(`L${line} <${tag}>: gold on the POOL (gold is plate-only)`);
    if (
      /\b(text|bg|border|decoration|from|to|via)-accent-\d/.test(attrs) &&
      !onPool
    )
      bad.push(
        `L${line} <${tag}>: magenta on the PLATE (magenta is pool-only)`,
      );
    if (/\btext-pool-(text|danger|success)\b/.test(attrs) && !onPool)
      bad.push(`L${line} <${tag}>: pool text colour used on the plate`);

    if (!isVoid) {
      stack.push({ tag, pool: opensPool });
      if (opensPool) poolDepth++;
    }
  }
  return bad;
}

function tagBalance(html) {
  const VOID = new Set([
    "img",
    "br",
    "hr",
    "input",
    "meta",
    "link",
    "source",
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "ellipse",
    "use",
    "stop",
    "area",
    "col",
  ]);
  const re = /<(\/?)([a-z0-9]+)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/gi;
  const stack = [];
  let m;
  while ((m = re.exec(html))) {
    const [, slash, tag, attrs, self] = m;
    if (VOID.has(tag.toLowerCase()) || self === "/") continue;
    if (slash) {
      if (!stack.length) return `stray </${tag}>`;
      const top = stack.pop();
      if (top !== tag.toLowerCase()) return `</${tag}> closes <${top}>`;
    } else stack.push(tag.toLowerCase());
  }
  return stack.length ? `unclosed <${stack.join(">, <")}>` : null;
}

let failures = 0;
for (const [id, anchor] of SCREENS) {
  const main = join(FRAG, `${id}.html`);
  if (!existsSync(main)) {
    console.log(`\n-- ${id}: no fragment yet`);
    continue;
  }
  const dlg = join(FRAG, `${id}.dialogs.html`);
  const html =
    readFileSync(main, "utf8") +
    (existsSync(dlg) ? readFileSync(dlg, "utf8") : "");
  const problems = [];

  const chrome = html.match(
    /<(!doctype|html|head|body|style|script|link|aside|main|footer)\b/gi,
  );
  if (chrome)
    problems.push(`chrome leaked: ${[...new Set(chrome)].join(", ")}`);

  const gated = [];
  for (const m of html.matchAll(
    /opacity: ?0[^.\d]|IntersectionObserver|display: ?none/gi,
  ))
    gated.push(m[0]);
  // A bare `hidden` gates content. `hidden sm:block` is a responsive decoration
  // that IS visible at review width — only flag the bare form.
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    const cls = m[1];
    if (!/(^|\s)hidden(\s|$)/.test(cls)) continue;
    if (
      /(sm|md|lg|xl|2xl):(block|flex|grid|inline|inline-block|inline-flex|table)/.test(
        cls,
      )
    )
      continue;
    gated.push(`bare "hidden" in class="${cls.slice(0, 60)}…"`);
  }
  if (gated.length)
    problems.push(
      `content gated behind JS/CSS: ${[...new Set(gated)].join(", ")}`,
    );

  const hard = html.match(
    /#[0-9a-fA-F]{6}\b|\brounded-(sm|md|lg|xl|2xl)\b|\bshadow-(sm|md|lg|xl)\b/g,
  );
  if (hard)
    problems.push(
      `raw hex or non-zero radius/shadow: ${[...new Set(hard)].join(", ")}`,
    );

  if (/href="#"/.test(html)) problems.push('placeholder href="#"');
  if (!new RegExp(`id="${anchor}"`).test(html))
    problems.push(`missing skip anchor id="${anchor}"`);

  const imgs = [...html.matchAll(/assets\/images\/new\/([^"']+)/g)].map(
    (x) => x[1],
  );
  const have = new Set(
    readdirSync(join(HERE, "..", "..", "..", "assets", "images", "new")),
  );
  for (const i of new Set(imgs))
    if (!have.has(i)) problems.push(`missing image asset: ${i}`);

  const bal = tagBalance(html);
  if (bal) problems.push(`tag balance: ${bal}`);

  problems.push(...paletteViolations(html));

  if (problems.length) {
    failures++;
    console.log(`\nFAIL ${id}`);
    for (const p of problems) console.log(`   · ${p}`);
  } else {
    console.log(`\nok   ${id}`);
  }
}
console.log(
  failures ? `\n${failures} screen(s) failed` : "\nall present screens clean",
);
