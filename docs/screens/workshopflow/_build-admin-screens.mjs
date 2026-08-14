/**
 * Admin-chrome splicer for the workshop-flow admin screens.
 *
 * The chrome (kit tokens + tailwind config + AppShell sidebar + utility bar +
 * footer) is ~35KB of bytes that already exist in docs/screens/admin/. Agents
 * must NEVER re-derive it — every re-derivation is a divergence. So this script
 * LIFTS the chrome verbatim from admin-bookings.html and splices in a per-screen
 * <main> fragment that a ui-designer agent authored.
 *
 *   node _build-admin-screens.mjs            # build all
 *   node _build-admin-screens.mjs <screen>   # build one
 *
 * Agents write ONLY:  _frag/<screen>.html          (inner content of the main column)
 *                     _frag/<screen>.dialogs.html  (optional, top-level <dialog>s)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "admin", "admin-bookings.html");
const FRAG = join(HERE, "_frag");

// Normalise to LF — the chrome source is CRLF on this machine and every
// structural regex below is written against \n.
const src = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");

/* ── 1 · the <head>, verbatim through </head> ─────────────────────────────── */
const headEnd = lines.findIndex((l) => l.trim() === "</head>");
if (headEnd < 0) throw new Error("could not find </head> in the chrome source");
const head = lines.slice(0, headEnd + 1).join("\n");

/* ── 2 · the sidebar nav, verbatim — icons and all ────────────────────────── */
const navStart = src.indexOf(
  '<nav\n            data-pattern="sidebar-nav-row"',
);
const navEnd = src.indexOf("</nav>", navStart);
if (navStart < 0 || navEnd < 0)
  throw new Error("could not find the sidebar nav");
const navBlock = src.slice(navStart, navEnd + "</nav>".length);

const ACTIVE_CLS =
  "flex min-h-[46px] items-center gap-3 bg-surface-inverted px-3.5 text-sm font-bold text-text-inverted no-underline";
const DEFAULT_CLS =
  "flex min-h-[46px] items-center gap-3 px-3.5 text-sm font-medium text-text-secondary no-underline transition-colors duration-fast hover:bg-secondary-500/[.08] hover:text-text-primary";

/** Split the lifted nav into its individual <a> NavItems. */
function navItems(block) {
  // Prettier closes some items `</a>` and others `</a\n            >`, so slice on
  // the item START marker and take everything up to the next one.
  const marker = '<a\n              data-kit-component="NavItem"';
  const starts = [];
  for (let i = block.indexOf(marker); i >= 0; i = block.indexOf(marker, i + 1))
    starts.push(i);
  const out = starts.map((s, n) =>
    block
      .slice(
        s,
        n + 1 < starts.length ? starts[n + 1] : block.lastIndexOf("</nav>"),
      )
      .trimEnd(),
  );
  if (!out.length)
    throw new Error("nav item regex matched nothing — chrome shape changed");
  return out;
}

/** Reset an item to the inactive presentation. */
function deactivate(item) {
  return item
    .replace('data-kit-variant="active"', 'data-kit-variant="default"')
    .replace(/\n              aria-current="page"/, "")
    .replace(ACTIVE_CLS, DEFAULT_CLS);
}

/** Mark the item whose href matches as the current page. */
function activate(item) {
  return item
    .replace('data-kit-variant="default"', 'data-kit-variant="active"')
    .replace(/(href="[^"]*")/, '$1\n              aria-current="page"')
    .replace(DEFAULT_CLS, ACTIVE_CLS);
}

/* The paid-workshop bookings ledger is a NEW admin surface (Milestone 4) — it is
   not the 1:1 request queue that already lives at /admin/bookings. It gets its
   own rail entry, seated directly under Requests so the two read as siblings. */
const BOOKINGS_ITEM = `<a
              data-kit-component="NavItem"
              data-kit-variant="default"
              href="/admin/workshop-bookings"
              class="${DEFAULT_CLS}"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-[18px] w-[18px] shrink-0"
                aria-hidden="true"
              >
                <path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z" />
                <path d="M13 5v2M13 11v2M13 17v2" stroke-dasharray="0.1 4" />
              </svg>
              Bookings
            </a
            >`;

function buildNav(activeHref) {
  const items = navItems(navBlock).map(deactivate);
  const requestsAt = items.findIndex((i) =>
    i.includes('href="/admin/bookings"'),
  );
  items.splice(requestsAt + 1, 0, BOOKINGS_ITEM);
  const activeAt = items.findIndex((i) => i.includes(`href="${activeHref}"`));
  if (activeAt < 0) throw new Error(`no nav item for ${activeHref}`);
  items[activeAt] = activate(items[activeAt]);
  return `<nav
            data-pattern="sidebar-nav-row"
            data-kit-component="Nav"
            aria-label="Admin"
            class="relative flex flex-col gap-0.5"
          >
            ${items.join("\n            ")}
          </nav>`;
}

/* ── 3 · the utility bar, verbatim ────────────────────────────────────────── */
const hdrStart = src.indexOf('<header\n          data-kit-component="Header"');
const hdrEnd = src.indexOf("</header>", hdrStart);
if (hdrStart < 0) throw new Error("could not find the utility bar");
const header = src.slice(hdrStart, hdrEnd + "</header>".length);

/* ── 4 · the screens ──────────────────────────────────────────────────────── */
const SCREENS = [
  {
    id: "admin-workshop-bookings",
    title: "Workshop bookings — The Field Work admin",
    description:
      "Every place sold on a workshop, filterable by date and by state, with cancelling and refunding done from the row itself — the money always stated in full before the button.",
    nav: "/admin/workshop-bookings",
    skip: { href: "#ledger-h", label: "Skip to the bookings" },
    field: "aura-field-abstract.png",
  },
  {
    id: "admin-offerings",
    title: "Offerings — The Field Work admin",
    description:
      "Every session, workshop and course Marianne sells, in one ledger — what it is, when it next runs, what it costs, how many places have gone, and whether it is live on the public site.",
    nav: "/admin/offerings",
    skip: { href: "#kinds-h", label: "Skip to the offerings" },
    field: "window-last-light.png",
  },
  // `admin-workshops-list` was dropped 2026-08-12. Once admin-offerings became a
  // tabbed index on the workshops-index composition, its Workshops tab answered
  // every question that screen did — same rows, same primary action, same rail
  // entry — so shipping both would have been the same list twice.
  {
    id: "admin-workshop-detail",
    title: "New workshop — The Field Work admin",
    description:
      "One workshop in full — name, description, date, time, venue, capacity, price and picture — with the public page it produces shown alongside as it is typed.",
    nav: "/admin/offerings",
    skip: { href: "#form-h", label: "Skip to the workshop details" },
    field: "aura-light-in-a-room.png",
  },
  {
    id: "admin-workshop-attendees",
    title: "Who is coming — The Field Work admin",
    description:
      "The room for one workshop date: who has paid, who is on the waiting list, dietary notes and access needs, and one place to write to everybody at once.",
    nav: "/admin/workshop-bookings",
    skip: { href: "#room-h", label: "Skip to the room" },
    field: "chair-with-her-coat.png",
  },
];

function compose(screen) {
  const fragPath = join(FRAG, `${screen.id}.html`);
  const dlgPath = join(FRAG, `${screen.id}.dialogs.html`);
  if (!existsSync(fragPath)) return { id: screen.id, skipped: true };
  const main = readFileSync(fragPath, "utf8").trimEnd();
  const dialogs = existsSync(dlgPath)
    ? "\n\n" + readFileSync(dlgPath, "utf8").trimEnd()
    : "";

  const doc = `${head
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${screen.title}</title>`)
    .replace(
      /<meta\n      name="description"\n      content="[\s\S]*?"\n    \/>/,
      `<meta\n      name="description"\n      content="${screen.description}"\n    />`,
    )}

  <body
    data-kit-layout="AppShell"
    data-screen-id="${screen.id}"
    class="bg-surface-base text-text-primary font-sans"
  >
    <a
      href="${screen.skip.href}"
      class="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-tooltip bg-secondary-500 px-5 py-3 text-sm font-semibold text-text-inverted"
      >${screen.skip.label}</a
    >

    <div class="flex min-h-screen">
      <!-- ================= SIDE MENU ================= -->
      <aside
        data-kit-component="SideMenu"
        class="relative hidden lg:flex w-[256px] shrink-0 flex-col gap-7 px-5 py-7 overflow-hidden"
        aria-label="Admin sections"
      >
        <div class="relative z-10 flex flex-col gap-7 h-full">
          <a
            data-pattern="wordmark"
            data-variant="rail"
            href="/admin"
            aria-label="The Field Work admin — Today"
            class="block w-full min-h-[44px]"
          >
            <img
              src="../../../assets/brand/logo-horizontal.svg"
              alt="The Field Work"
              width="440"
              height="120"
              class="h-auto w-full"
            />
          </a>
          <p
            data-pattern="eyebrow"
            class="font-mono text-xs uppercase tracking-wide text-secondary-500 -mt-4"
          >
            Admin
          </p>

          ${buildNav(screen.nav)}

          <p
            class="mt-auto font-mono text-xs leading-relaxed text-text-secondary"
          >
            Signed in as Marianne<br />Owner &middot; session ends 2 Sep
          </p>
        </div>
      </aside>

      <!-- ================= MAIN COLUMN ================= -->
      <div class="min-w-0 flex-1">
        <!-- ============ UTILITY BAR ============ -->
        ${header}

        <main id="main" class="relative px-6 lg:px-11 pb-14">
          <img
            src="../../../assets/images/new/${screen.field}"
            alt=""
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.55] [object-position:50%_42%] [filter:brightness(.42)_saturate(1.04)]"
          />
          <div class="relative z-10 max-w-[1280px] mx-auto">
${main}
          </div>
        </main>

        <footer class="px-6 lg:px-11 pb-10">
          <div
            class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border/40 pt-5"
          >
            <p class="font-mono text-xs text-text-secondary">The Field Work</p>
            <p class="font-mono text-xs text-text-secondary">
              thefieldwork.co.uk
            </p>
            <p class="font-mono text-xs text-text-secondary">
              Private admin &mdash; not visible to the public
            </p>
          </div>
        </footer>
      </div>
    </div>${dialogs}
  </body>
</html>
`;
  writeFileSync(join(HERE, `${screen.id}.html`), doc, "utf8");
  return { id: screen.id, bytes: Buffer.byteLength(doc, "utf8") };
}

mkdirSync(FRAG, { recursive: true });
const only = process.argv[2];
for (const s of SCREENS) {
  if (only && s.id !== only) continue;
  const r = compose(s);
  console.log(
    r.skipped ? `-- ${r.id} (no fragment yet)` : `ok ${r.id}  ${r.bytes} bytes`,
  );
}
