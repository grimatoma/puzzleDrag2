// Build the public docs site that ships alongside the game on GitHub Pages.
//
// Run after `vite build` (see the `build` npm script). It mirrors every
// version-controlled file under `docs/` into `dist/docs/`:
//   - `.html` docs are copied as-is (they are already self-contained per CLAUDE.md).
//   - `.md` docs are rendered to a styled `.html` sibling via `marked`.
//   - an `index.html` landing page lists everything, grouped by section.
//
// Only git-tracked files are considered, so gitignored scratch content under
// `docs/references/` never leaks into the deploy. Static assets under
// `docs/assets/` (PNG/GIF/etc.) are copied alongside the HTML so relative
// `<img src="assets/...">` links resolve on GitHub Pages. No network access
// required at build time.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const docsRoot = join(repoRoot, "docs");
const outRoot = join(repoRoot, "dist", "docs");

// --- collect tracked docs ---------------------------------------------------

/** @returns {string[]} repo-relative paths of every tracked file under docs/ */
function trackedDocs() {
  const out = execFileSync("git", ["ls-files", "docs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Skip dotfiles like docs/references/.gitignore — they aren't documents.
    .filter((p) => !p.split("/").some((seg) => seg.startsWith(".")));
}

// --- title extraction -------------------------------------------------------

function titleFromHtml(html, fallback) {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) return decodeEntities(titleTag[1].trim());
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, "").trim());
  return fallback;
}

function titleFromMarkdown(md, fallback) {
  for (const line of md.split("\n")) {
    const m = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (m) return m[1].trim();
  }
  return fallback;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prettyName(fileBase) {
  return fileBase
    .replace(/\.(md|html)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- shared styling ---------------------------------------------------------

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

// Warm / earthy palette matching the farming-game subject (per CLAUDE.md).
const THEME = `:root {
  --bg: #1c1714;
  --bg-soft: #241d18;
  --card: #2c241d;
  --ink: #efe6d8;
  --muted: #b6a487;
  --line: #44382d;
  --accent: #e0913a;
  --accent-2: #8bab5a;
  --shadow: 0 12px 30px rgba(0,0,0,.45);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  color: var(--ink);
  line-height: 1.65;
  background:
    radial-gradient(1100px 600px at 12% -8%, rgba(224,145,58,.16), transparent 60%),
    radial-gradient(900px 520px at 100% 0%, rgba(139,171,90,.12), transparent 55%),
    var(--bg);
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code, pre, kbd { font-family: "JetBrains Mono", ui-monospace, monospace; }
h1, h2, h3, h4 { font-family: "Fraunces", Georgia, serif; line-height: 1.15; letter-spacing: -.01em; }
@media (prefers-reduced-motion: no-preference) {
  .reveal { animation: rise .6s cubic-bezier(.2,.7,.2,1) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
}`;

// --- index page -------------------------------------------------------------

// Friendlier labels + ordering for top-level doc sections.
const SECTION_META = {
  ".": { label: "Overview", blurb: "Top-level design & audit docs", order: 0 },
  "pixel-pipeline-viewer": { label: "Pixel Pipeline Viewer", blurb: "Live sprite-set review viewer", order: 1 },
  engineering: { label: "Engineering", blurb: "Architecture & type-system notes", order: 2 },
  superpowers: { label: "Plans & Specs", blurb: "Dated implementation plans and design specs", order: 3 },
  "iso-buildings": { label: "Iso Buildings", blurb: "Isometric asset gallery progress", order: 4 },
  references: { label: "References", blurb: "External wikis & research", order: 5 },
};

// Docs surfaced in a prominent "Featured" block at the very top, in this order.
// Keyed by docs-relative source path (forward slashes).
const FEATURED_DOCS = ["sprite-pipeline.html"];

// Old / superseded / off-focus docs, gathered into an "Archive" section at the
// very bottom regardless of their folder. Keyed by docs-relative source path
// (the .md/.html as it lives under docs/). Curated by hand — keep it current.
const ARCHIVED_DOCS = new Set([
  // Older design / redesign / concept docs, off the current focus.
  "wiki-migration-plan.html",
  "progression-trigger-redesign.html",
  "board-topology-concepts.html",
  // Iso-building progress tracker (paused).
  "iso-buildings/PROGRESS.md",
  // Shipped implementation plans + specs (today's stay current under Plans & Specs).
  "superpowers/plans/2026-06-02-appearance-look-restructure.md",
  "superpowers/plans/2026-06-02-board-kinds-wiki.md",
  "superpowers/plans/2026-06-02-wiki-interconnection-ia.md",
  "superpowers/specs/2026-06-02-board-kinds-wiki-design.html",
  "superpowers/specs/2026-06-02-wiki-interconnection-ia-design.html",
  "superpowers/plans/2026-06-03-progression-feed-phase1.md",
  "superpowers/plans/2026-06-03-progression-phase2-engine-migration.md",
  "superpowers/plans/2026-06-03-progression-phase2b-native-when.md",
  // Pixel-art concept / exploration docs (shipped art lives in the game itself).
  "birch-tree-64.html",
  "birch-32-test.html",
  "birch-tree-seasons.html",
  "farm-tile-concepts.html",
  "grass-tile-concepts.html",
  "more-tile-concepts.html",
  "seasonal-tile-animations.html",
  "icon-review.html",
  "icon-style-guide.html",
]);

function sectionKey(relPath) {
  const parts = relPath.split("/");
  // relPath is relative to docs/, e.g. "engineering/catalog-enums.html"
  return parts.length > 1 ? parts[0] : ".";
}

function docCard(e) {
  const sub = e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
  return `        <a class="doc" href="${e.href}">
          <span class="doc-title">${escapeHtml(e.title)}</span>
          <span class="doc-meta"><span class="badge badge-${e.kind}">${e.kind}</span><code>${escapeHtml(sub ? sub + "/" : "")}${escapeHtml(e.file)}</code></span>
        </a>`;
}

function renderIndex(entries) {
  // Featured docs float to a prominent block at the top (explicit order).
  const featured = FEATURED_DOCS.map((p) => entries.find((e) => e.src === p)).filter(
    Boolean,
  );
  const featuredSrc = new Set(featured.map((e) => e.src));

  // Archived docs sink to a single section at the bottom, regardless of folder.
  const archived = entries
    .filter((e) => ARCHIVED_DOCS.has(e.src) && !featuredSrc.has(e.src))
    .sort((a, b) => a.title.localeCompare(b.title));
  const archivedSrc = new Set(archived.map((e) => e.src));

  // Everything else groups by folder section as before.
  const groups = new Map();
  for (const e of entries) {
    if (featuredSrc.has(e.src) || archivedSrc.has(e.src)) continue;
    const key = sectionKey(e.rel);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => {
    const oa = SECTION_META[a]?.order ?? 99;
    const ob = SECTION_META[b]?.order ?? 99;
    return oa - ob || a.localeCompare(b);
  });

  const sections = orderedKeys
    .map((key, gi) => {
      const meta = SECTION_META[key] || { label: prettyName(key), blurb: "" };
      const items = groups
        .get(key)
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(docCard)
        .join("\n");
      return `    <section class="group reveal" style="animation-delay:${0.05 * (gi + 2)}s">
      <header class="group-head">
        <h2>${escapeHtml(meta.label)}</h2>
        ${meta.blurb ? `<p>${escapeHtml(meta.blurb)}</p>` : ""}
        <span class="count">${groups.get(key).length}</span>
      </header>
      <div class="grid">
${items}
      </div>
    </section>`;
    })
    .join("\n");

  const featuredHtml = featured.length
    ? `    <section class="featured reveal" style="animation-delay:.05s">
      <p class="featured-eyebrow">★ Featured</p>
      <div class="grid">
${featured.map(docCard).join("\n")}
      </div>
    </section>`
    : "";

  const archiveHtml = archived.length
    ? `    <section class="group archive reveal">
      <header class="group-head">
        <h2>Archive</h2>
        <p>Superseded, shipped, or off-focus — kept for reference.</p>
        <span class="count">${archived.length}</span>
      </header>
      <div class="grid">
${archived.map(docCard).join("\n")}
      </div>
    </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Long Return — Docs</title>
${FONTS}
<style>
${THEME}
.wrap { max-width: 1000px; margin: 0 auto; padding: 4rem 1.5rem 5rem; }
.hero { margin-bottom: 3rem; }
.eyebrow { font-family: "JetBrains Mono", monospace; font-size: .8rem; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin: 0 0 .75rem; }
.hero h1 { font-size: clamp(2.6rem, 6vw, 4.2rem); font-weight: 800; margin: 0 0 .6rem; }
.hero p { color: var(--muted); font-size: 1.15rem; max-width: 60ch; margin: 0; }
.toplinks { margin-top: 1.6rem; display: flex; flex-wrap: wrap; gap: .6rem; }
.toplinks a { border: 1px solid var(--line); background: var(--card); padding: .5rem .95rem; border-radius: 999px; font-size: .9rem; color: var(--ink); box-shadow: var(--shadow); transition: transform .15s ease, border-color .15s ease; }
.toplinks a:hover { text-decoration: none; transform: translateY(-2px); border-color: var(--accent); }
.toplinks a span { color: var(--accent); }
.group { margin-top: 2.6rem; }
.group-head { display: flex; align-items: baseline; gap: .85rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: .6rem; margin-bottom: 1.2rem; }
.group-head h2 { font-size: 1.6rem; font-weight: 600; margin: 0; }
.group-head p { color: var(--muted); margin: 0; font-size: .95rem; }
.group-head .count { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: .8rem; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: .1rem .6rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: .9rem; }
.doc { display: flex; flex-direction: column; gap: .5rem; padding: 1.05rem 1.15rem; background: linear-gradient(180deg, var(--card), var(--bg-soft)); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); transition: transform .15s ease, border-color .15s ease; }
.doc:hover { text-decoration: none; transform: translateY(-3px); border-color: var(--accent); }
.doc-title { font-family: "Fraunces", serif; font-weight: 600; font-size: 1.1rem; color: var(--ink); }
.doc-meta { display: flex; align-items: center; gap: .55rem; font-size: .78rem; color: var(--muted); }
.doc-meta code { font-size: .72rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { font-family: "JetBrains Mono", monospace; font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; padding: .12rem .42rem; border-radius: 5px; flex: none; }
.badge-html { background: rgba(224,145,58,.18); color: #f0b46e; }
.badge-md { background: rgba(139,171,90,.18); color: #b6cd84; }
.featured { margin-top: 0; padding: 1.4rem 1.5rem 1.5rem; background: linear-gradient(135deg, rgba(224,145,58,.16), rgba(139,171,90,.07)); border: 1px solid var(--accent); border-radius: 18px; box-shadow: var(--shadow); }
.featured-eyebrow { font-family: "JetBrains Mono", monospace; font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin: 0 0 .9rem; }
.featured .doc { border-color: rgba(224,145,58,.5); background: linear-gradient(180deg, rgba(224,145,58,.1), var(--bg-soft)); }
.featured .doc-title { font-size: 1.4rem; }
.archive { opacity: .68; transition: opacity .2s ease; }
.archive:hover { opacity: 1; }
.archive .group-head h2 { color: var(--muted); }
.archive .doc { background: var(--bg-soft); box-shadow: none; }
footer { margin-top: 4rem; color: var(--muted); font-size: .85rem; border-top: 1px solid var(--line); padding-top: 1.4rem; }
</style>
</head>
<body>
  <div class="wrap">
    <header class="hero reveal">
      <p class="eyebrow">The Long Return</p>
      <h1>Documentation</h1>
      <p>Design docs, engineering notes, plans, and references for the game — published alongside the build.</p>
      <nav class="toplinks">
        <a href="../"><span>▸</span> Play the game</a>
        <a href="../b/"><span>▸</span> Dev Panel</a>
        <a href="../story/"><span>▸</span> Story Editor</a>
        <a href="../iso/"><span>▸</span> Iso Gallery</a>
      </nav>
    </header>
${featuredHtml}
${sections}
${archiveHtml}
    <footer>
      ${entries.length} documents · generated at build time by <code>tools/build-docs.mjs</code>
    </footer>
  </div>
</body>
</html>
`;
}

// --- markdown page template -------------------------------------------------

function renderMarkdownPage(title, bodyHtml, depth) {
  const up = "../".repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Docs</title>
${FONTS}
<style>
${THEME}
.bar { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px); background: rgba(28,23,20,.82); border-bottom: 1px solid var(--line); }
.bar .inner { max-width: 860px; margin: 0 auto; padding: .8rem 1.5rem; display: flex; gap: 1rem; align-items: center; font-size: .9rem; }
.bar a { color: var(--muted); }
.bar a:hover { color: var(--accent); text-decoration: none; }
main { max-width: 860px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
main h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; margin: .2rem 0 1.4rem; }
main h2 { font-size: 1.7rem; font-weight: 600; margin: 2.4rem 0 .8rem; padding-bottom: .35rem; border-bottom: 1px solid var(--line); }
main h3 { font-size: 1.3rem; font-weight: 600; margin: 1.8rem 0 .6rem; }
main p, main li { font-size: 1.02rem; }
main a { word-break: break-word; }
main code { background: var(--bg-soft); border: 1px solid var(--line); border-radius: 5px; padding: .1rem .35rem; font-size: .88em; }
main pre { background: var(--bg-soft); border: 1px solid var(--line); border-radius: 12px; padding: 1.1rem 1.3rem; overflow: auto; box-shadow: var(--shadow); }
main pre code { background: none; border: 0; padding: 0; }
main blockquote { margin: 1.2rem 0; padding: .4rem 1.2rem; border-left: 3px solid var(--accent); background: var(--bg-soft); color: var(--muted); border-radius: 0 8px 8px 0; }
main table { border-collapse: collapse; width: 100%; margin: 1.2rem 0; font-size: .95rem; box-shadow: var(--shadow); border-radius: 10px; overflow: hidden; }
main th, main td { border: 1px solid var(--line); padding: .55rem .8rem; text-align: left; vertical-align: top; }
main th { background: var(--card); font-family: "Fraunces", serif; }
main tr:nth-child(even) td { background: rgba(255,255,255,.02); }
main img { max-width: 100%; border-radius: 10px; }
main hr { border: 0; border-top: 1px solid var(--line); margin: 2.4rem 0; }
</style>
</head>
<body>
  <div class="bar"><div class="inner">
    <a href="${up}index.html">← All docs</a>
    <a href="${up}../">Game</a>
  </div></div>
  <main class="reveal">
${bodyHtml}
  </main>
</body>
</html>
`;
}

// --- run --------------------------------------------------------------------

marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

const files = trackedDocs();
const entries = [];
let assetCount = 0;

for (const repoRel of files) {
  const abs = join(repoRoot, repoRel);
  // Normalize to forward slashes so section grouping + featured/archive
  // matching behave identically on Windows (path.relative uses "\") and CI.
  const docRel = relative(docsRoot, abs).replace(/\\/g, "/"); // path relative to docs/
  const file = docRel.split("/").pop();
  const depth = docRel.split("/").length - 1;

  if (/\.html?$/i.test(file)) {
    const html = readFileSync(abs, "utf8");
    const outPath = join(outRoot, docRel);
    mkdirSync(dirname(outPath), { recursive: true });
    copyFileSync(abs, outPath);
    entries.push({
      rel: docRel,
      href: docRel,
      src: docRel,
      file,
      kind: "html",
      title: titleFromHtml(html, prettyName(file)),
    });
  } else if (/\.md$/i.test(file)) {
    const md = readFileSync(abs, "utf8");
    const title = titleFromMarkdown(md, prettyName(file));
    const body = marked.parse(md);
    const outRel = docRel.replace(/\.md$/i, ".html");
    const outPath = join(outRoot, outRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, renderMarkdownPage(title, body, depth));
    entries.push({
      rel: outRel,
      href: outRel,
      src: docRel,
      file,
      kind: "md",
      title,
    });
  } else {
    const outPath = join(outRoot, docRel);
    mkdirSync(dirname(outPath), { recursive: true });
    copyFileSync(abs, outPath);
    assetCount += 1;
  }
}

mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, "index.html"), renderIndex(entries));

console.log(
  `[build-docs] wrote ${entries.length} docs + ${assetCount} assets + index → dist/docs/`,
);
