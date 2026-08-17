/**
 * The long body of a workshop, both ways.
 *
 * The approved form (docs/screens/workshopflow/admin-workshop-detail.html)
 * promises Marianne "structure only — the type and colours are already set".
 * That rules out a rich-text editor: a toolbar that can set a colour is a
 * toolbar that can break the design, and §12 says her branding is the template
 * and not an option.
 *
 * So she writes in a plain textarea with three marks —
 *
 *     ## a heading
 *     ### a sub-heading
 *     - a bullet
 *
 * — and everything else is a paragraph. `toHtml` produces the markup the page
 * renders; `toSource` turns it back into what she typed so she can edit it
 * again.
 *
 * WHY THIS IS SAFE. Every character of her text is escaped before any tag is
 * added, and the only tags that can ever appear are the five this file writes.
 * Pasting `<script>` into the textarea produces the *words* `<script>` on the
 * page. That is why the public page can render `bodyHtml` directly without a
 * sanitiser standing between it and the browser.
 *
 * THE ROUND TRIP. `toSource` only has to read what `toHtml` writes — this file
 * is the sole producer of that column. Markup arriving from anywhere else
 * (someone editing the row by hand in psql) degrades to its text, which is
 * ugly but cannot lose a paragraph or smuggle a tag through.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(html: string): string {
  // In this order. Unescaping &amp; first would turn "&amp;lt;" into "<".
  return html
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/** What she typed → the markup the page renders. */
export function toHtml(source: string): string {
  const blocks = source
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());

      if (lines.length === 1 && lines[0].startsWith("### ")) {
        return `<h3>${escapeHtml(lines[0].slice(4).trim())}</h3>`;
      }
      if (lines.length === 1 && lines[0].startsWith("## ")) {
        return `<h2>${escapeHtml(lines[0].slice(3).trim())}</h2>`;
      }
      if (lines.every((line) => line.startsWith("- "))) {
        const items = lines
          .map((line) => `<li>${escapeHtml(line.slice(2).trim())}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      // A single newline inside a paragraph is where her line happened to
      // wrap, not a line break she asked for.
      return `<p>${escapeHtml(lines.join(" "))}</p>`;
    })
    .join("\n");
}

/** The markup → what she typed, so the textarea reopens on her own words. */
export function toSource(html: string): string {
  if (!html.trim()) return "";

  const blocks = html.match(/<(?:h2|h3|ul|p)\b[\s\S]*?<\/(?:h2|h3|ul|p)>/g);
  if (!blocks) return unescapeHtml(html.replace(/<[^>]*>/g, "")).trim();

  return blocks
    .map((block) => {
      const heading = block.match(/^<h([23])>([\s\S]*)<\/h\1>$/);
      if (heading) {
        return `${heading[1] === "2" ? "##" : "###"} ${unescapeHtml(heading[2])}`;
      }
      if (block.startsWith("<ul>")) {
        const items = block.match(/<li>[\s\S]*?<\/li>/g) ?? [];
        return items
          .map((item) => `- ${unescapeHtml(item.slice(4, -5))}`)
          .join("\n");
      }
      return unescapeHtml(block.slice(3, -4));
    })
    .join("\n\n");
}
