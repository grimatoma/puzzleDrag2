// Build the public docs site that ships alongside the game on GitHub Pages.
//
// Run after `vite build` (see the `build` npm script). It mirrors every
// version-controlled file under `reference/docs/` into `dist/docs/`:
//   - `.html` docs are copied as-is (they are already self-contained per CLAUDE.md).
//   - `.md` docs are rendered to a styled `.html` sibling via `marked`.
//   - an `index.html` landing page lists everything, grouped by section.
//
// Only git-tracked files are considered, so gitignored scratch content under
// `reference/docs/references/` never leaks into the deploy. Static assets under
// `reference/docs/assets/` (PNG/GIF/etc.) are copied alongside the HTML so relative
// `<img src="assets/...">` links resolve on GitHub Pages. No network access
// required at build time.

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
// This tool lives at reference/tools/build-docs.mjs, so the repo root is two
// levels up. The docs source is the isolated reference/docs/ tree; the output
// path stays dist/docs/ so the published Pages URL (/puzzleDrag2/docs/) is
// unchanged.
const repoRoot = resolve(__dirname, "..", "..");
const docsRoot = join(repoRoot, "reference", "docs");
const outRoot = join(repoRoot, "dist", "docs");

// --- collect tracked docs ---------------------------------------------------

/** @returns {string[]} repo-relative paths of every tracked file under docs/ */
function trackedDocs() {
  const out = execFileSync("git", ["ls-files", "reference/docs"], {
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

// Markdown docs cross-link each other with `.md` hrefs, but on the deployed
// site every tracked `.md` is rendered to a `.html` sibling — so those links
// would 404. Rewrite local `*.md` links to `*.html`. README targets are left
// alone: folder READMEs are copied as raw assets (not rendered), except the one
// promoted to a folder's index.html, which lives at a different path anyway.
function rewriteMdLinks(html) {
  return html.replace(
    /href="(?!https?:|\/\/|mailto:)([^"]+?)\.md(#[^"]*)?"/gi,
    (m, path, frag) => (/readme$/i.test(path) ? m : `href="${path}.html${frag || ""}"`),
  );
}

// --- summary, reading time & thumbnail extraction ---------------------------
//
// The index card used to show only a title + filename. To save a reader from
// opening every doc, we pull a short *summary* (the doc's own subtitle / first
// real paragraph), an estimated *reading time*, and — where the doc ships a
// representative raster image — a *thumbnail*. All three are derived from the
// doc's own content, so they can't drift out of sync with what was written.

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ");
}
function collapseWs(s) {
  return s.replace(/\s+/g, " ").trim();
}

// Clamp to ~n chars on a word boundary, adding an ellipsis when truncated.
function clampText(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  const base = sp > n * 0.6 ? cut.slice(0, sp) : cut;
  return base.replace(/[\s.,;:–—-]+$/, "") + "…";
}

const SUMMARY_MAX = 240;

// Drop <style>/<script>/<head> so we never scrape CSS or JS as prose.
function htmlBody(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ");
}

function summaryFromHtml(html) {
  // 1. An explicit <meta name="description"> wins.
  const meta = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  );
  if (meta) return clampText(collapseWs(decodeEntities(meta[1])), SUMMARY_MAX);

  const body = htmlBody(html);

  // 2. A hero subtitle paragraph (the convention across these self-contained docs).
  const sub = body.match(
    /<p[^>]*class=["'][^"']*\b(?:sub|lede|subtitle|subhead|tagline|intro|dek)\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  );
  if (sub) {
    const t = collapseWs(decodeEntities(stripTags(sub[1])));
    if (t.length >= 24) return clampText(t, SUMMARY_MAX);
  }

  // 3. Otherwise the first paragraph with real prose in it.
  const paras = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
  for (const p of paras) {
    const inner = p.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>\s*$/i, "");
    const t = collapseWs(decodeEntities(stripTags(inner)));
    if (t.length >= 40) return clampText(t, SUMMARY_MAX);
  }
  return "";
}

function summaryFromMarkdown(md) {
  const lines = md.split("\n");
  const para = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (para.length) break; // blank line ends the first real paragraph
      continue;
    }
    if (/^([-*_])\1{2,}\s*$/.test(line)) continue; // horizontal rule
    if (/^#{1,6}\s/.test(line) || /^>/.test(line)) {
      if (para.length) break;
      continue; // skip leading headings / blockquote notes
    }
    if (/^(\||[-*+]\s|\d+\.\s|!\[|<!--)/.test(line)) {
      if (para.length) break;
      continue; // skip tables, lists, images, comments
    }
    para.push(line);
  }
  if (!para.length) return "";
  const t = para
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1"); // bold / italic
  return clampText(collapseWs(decodeEntities(t)), SUMMARY_MAX);
}

// ~200 wpm; never reports "0 min".
function readingMinutes(text) {
  const words = (text.match(/\S+/g) || []).length;
  return words ? Math.max(1, Math.round(words / 200)) : 0;
}
function textFromHtml(html) {
  return collapseWs(stripTags(htmlBody(html)));
}
function textFromMarkdown(md) {
  return collapseWs(
    md
      .replace(/```[\s\S]*?```/g, " ") // fenced code
      .replace(/`[^`]*`/g, " ")
      .replace(/[#>*_`|-]/g, " "),
  );
}

// Resolve an image src that's relative to a doc into a path relative to the
// docs root (which is exactly its href from the generated index.html).
function resolveDocPath(docRel, src) {
  const base = docRel.includes("/")
    ? docRel.slice(0, docRel.lastIndexOf("/")).split("/")
    : [];
  for (const seg of src.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") base.pop();
    else base.push(seg);
  }
  return base.join("/");
}

// Big images make the index heavy; above this we fall back to the glyph tile.
const THUMB_MAX_BYTES = 512 * 1024;

function firstImageSrc(content) {
  const re =
    /<img[^>]+src=["']([^"']+\.(?:png|jpe?g|gif|webp|svg))["']|!\[[^\]]*\]\(([^)\s]+\.(?:png|jpe?g|gif|webp|svg))[^)]*\)/gi;
  let m;
  while ((m = re.exec(content))) {
    const src = m[1] || m[2];
    if (!src || src.includes("${") || /^(data:|https?:)/i.test(src)) continue;
    return src;
  }
  return "";
}

// Returns a docs-root-relative path to a small-enough, tracked image, or "".
function pickThumb(content, docRel) {
  const src = firstImageSrc(content);
  if (!src) return "";
  const rel = resolveDocPath(docRel, src);
  const abs = join(docsRoot, rel);
  try {
    if (!existsSync(abs)) return "";
    if (statSync(abs).size > THUMB_MAX_BYTES) return "";
  } catch {
    return "";
  }
  return rel;
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

// --- dates ------------------------------------------------------------------

// Every doc gets a creation date plus a precise sort timestamp, so the index is
// ordered by *timestamp* — not just calendar day. Same-day docs then keep their
// true chronological order instead of being shuffled alphabetically. We read the
// file's *creation* commit (`--diff-filter=A --follow`, so a later move into
// docs/archive/ doesn't reset it) and take both its UNIX timestamp (`%at`, the
// sort key) and short date (`%as`, the display string). A `YYYY-MM-DD` prefix
// baked into the filename still wins for the *displayed* date (the convention
// for dated plans/specs); git time remains the tiebreaker for ordering.
//
// NOTE: this needs full git history. The Pages deploy checks out with
// `fetch-depth: 0` for exactly this reason — a shallow clone collapses every
// file's "creation" onto the single fetched commit, dating all docs today.
// Returns { date: "", ts: 0 } when git has no history (e.g. an untracked copy).
const metaCache = new Map();
function docMeta(repoRel, file) {
  if (!metaCache.has(repoRel)) {
    let date = "";
    let ts = 0;
    try {
      const out = execFileSync(
        "git",
        ["log", "--diff-filter=A", "--follow", "--format=%at %as", "--", repoRel],
        { cwd: repoRoot, encoding: "utf8" },
      );
      const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length) {
        const oldest = lines[lines.length - 1]; // oldest add = creation
        const sp = oldest.indexOf(" ");
        ts = Number(oldest.slice(0, sp)) || 0;
        date = oldest.slice(sp + 1);
      }
    } catch {
      /* no git history available — leave blank */
    }
    metaCache.set(repoRel, { date, ts });
  }
  const git = metaCache.get(repoRel);
  // A dated filename prefix wins for display; fall back to it for the sort key
  // too when git has no history.
  const named = file.match(/(\d{4}-\d{2}-\d{2})/);
  const date = named ? named[1] : git.date;
  const ts = git.ts || (named ? Date.parse(`${named[1]}T00:00:00Z`) / 1000 || 0 : 0);
  return { date, ts };
}

// Newest first by precise creation timestamp; fall back to date then title for
// stable ordering when timestamps tie (e.g. docs added in one commit).
function byDateDesc(a, b) {
  return (
    (b.ts || 0) - (a.ts || 0) ||
    (b.date || "").localeCompare(a.date || "") ||
    a.title.localeCompare(b.title)
  );
}

// --- index page -------------------------------------------------------------

// Friendlier labels + ordering for top-level doc sections. `glyph`/`accent`
// also drive the per-card visual tile shown when a doc has no thumbnail of its
// own, so every section reads at a glance.
const SECTION_META = {
  ".": { label: "Overview", blurb: "Top-level design, audit & proposal docs", order: 0, glyph: "🗺️", accent: "#e0913a" },
  projects: { label: "Project Briefs", blurb: "Ranked roadmap + self-contained implementation briefs", order: 1, glyph: "🧭", accent: "#e0913a" },
  "seasonal-tile-system": { label: "Seasonal Tile System", blurb: "Live seasonal-tile pipeline & prompts", order: 2, glyph: "🍂", accent: "#c8743a" },
  "town-layout": { label: "Town Layout", blurb: "Settlement growth mockups", order: 3, glyph: "🏘️", accent: "#8bab5a" },
  "town-camera": { label: "Town Camera", blurb: "Map camera-view decision board + live demo", order: 4, glyph: "🎥", accent: "#8bab5a" },
  zones: { label: "Zone Atlas", blurb: "Unique growing-settlement zones & build-outs", order: 5, glyph: "🌍", accent: "#6fae8f" },
  "puzzle-prototypes": { label: "Puzzle Prototypes", blurb: "Playable browser prototypes of the drag-chain core", order: 6, glyph: "🧩", accent: "#9b8fd0" },
  "art-style-board": { label: "Art Style Board", blurb: "Candidate art directions, pitched & proven", order: 7, glyph: "🎨", accent: "#d98a8a" },
  "art-style-board-r2": { label: "Art Style Board · R2", blurb: "Round-2 drill into the chosen storybook look", order: 8, glyph: "🎨", accent: "#d98a8a" },
  "hd2d-village": { label: "HD-2D Village", blurb: "React-Three-Fiber HD-2D look test", order: 9, glyph: "🌄", accent: "#7fa8d8" },
  "hd2d-village-sim": { label: "HD-2D Village · Sim", blurb: "Procedural shadow / lighting reference", order: 10, glyph: "🌄", accent: "#7fa8d8" },
  "building-art": { label: "Building Art", blurb: "Building-art pipeline & reference", order: 11, glyph: "🏠", accent: "#c8743a" },
  "pixelart-ui-scaling": { label: "Pixel-Art UI Scaling", blurb: "Crisp dynamically-scaling pixel UI proposal", order: 12, glyph: "🔲", accent: "#9fb0bd" },
  playtest: { label: "Playtest", blurb: "Headless auto-player reports & balance audits", order: 13, glyph: "🤖", accent: "#9fb0bd" },
  references: { label: "References", blurb: "External wikis & research", order: 14, glyph: "📚", accent: "#b6a487" },
};

// Docs surfaced in a prominent "Featured" block at the very top, in this order.
// Keyed by docs-relative source path (forward slashes).
const FEATURED_DOCS = [];

// "Collection" folders are multi-page sets whose own index page is already a
// navigation hub for everything inside (e.g. the prototypes index links all ten
// prototypes; the zone atlas renders a card per zone). Listing every nested page
// on the landing page is overwhelming — so each collection is represented by a
// SINGLE hub card. The nested pages are still built and reachable through the
// hub; they just don't flood the index. Keyed by top-level folder; `hub` is the
// docs-relative page a click opens.
const COLLECTIONS = {
  "puzzle-prototypes": {
    label: "Puzzle Prototypes",
    hub: "puzzle-prototypes/index.html",
    blurb: "Ten playable expansions of the drag-to-chain core — open to play each.",
  },
  zones: {
    label: "Zone Atlas",
    hub: "zones/index.html",
    blurb: "Unique settlement zones, each with its own environment & growth topology.",
  },
  projects: {
    label: "Project Briefs",
    hub: "projects/index.html",
    blurb: "Ranked roadmap + self-contained implementation briefs for upcoming work.",
  },
};

// Anything physically under docs/archive/ is treated as archived: it sinks to a
// single collapsed "Archive" section at the very bottom, regardless of subtree.
// (See docs/archive/README.md for what lives there and why.)
const ARCHIVE_PREFIX = "archive/";
function isArchived(rel) {
  return rel === "archive" || rel.startsWith(ARCHIVE_PREFIX);
}

// Logical sub-groups inside the Archive, in display order. `test` runs against
// the archive-relative path (with the leading "archive/" stripped). Unmatched
// docs fall into the trailing "Other" bucket. Each group is ordered by date.
const ARCHIVE_GROUPS = [
  {
    label: "Design & concept docs",
    blurb: "Early design explorations, since superseded.",
    glyph: "📐",
    test: (p) =>
      /^(board-topology-concepts|progression-trigger-redesign|wiki-migration-plan)\.html$/.test(p),
  },
  {
    label: "Icon & art explorations",
    blurb: "Concept-only pixel-art studies, replaced by the seasonal-tile pipeline.",
    glyph: "🎨",
    test: (p) =>
      /^(icon-|birch|farm-tile|grass-tile|more-tile|seasonal-tile-animations|seasonal-tiles-review)/.test(
        p,
      ),
  },
  {
    label: "Plans & specs (shipped)",
    blurb: "Point-in-time plans and specs for features now implemented.",
    glyph: "📜",
    test: (p) => p.startsWith("superpowers/"),
  },
  {
    label: "Pixel Pipeline Viewer",
    blurb: "Retired live sprite-set review viewer.",
    glyph: "🎞️",
    test: (p) => p.startsWith("pixel-pipeline-viewer/"),
  },
];

// The glyph + accent tint for a doc's fallback visual tile (used when the doc
// ships no usable thumbnail). Archived docs borrow their archive sub-group's
// glyph; everything else uses its section's.
function visualMeta(rel) {
  if (isArchived(rel)) {
    const p = rel.slice(ARCHIVE_PREFIX.length);
    const g = ARCHIVE_GROUPS.find((b) => b.test(p));
    return { glyph: (g && g.glyph) || "🗃️", accent: "#8a7d66" };
  }
  const m = SECTION_META[sectionKey(rel)];
  return { glyph: (m && m.glyph) || "📄", accent: (m && m.accent) || "#b6a487" };
}

function sectionKey(relPath) {
  const parts = relPath.split("/");
  // relPath is relative to docs/, e.g. "engineering/catalog-enums.html"
  return parts.length > 1 ? parts[0] : ".";
}

function docCard(e) {
  const sub = e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
  const date = e.date
    ? `<time class="doc-date">${escapeHtml(e.date)}</time>`
    : "";
  const read = e.minutes ? `<span class="doc-read">${e.minutes} min read</span>` : "";
  const { glyph, accent } = visualMeta(e.rel);
  const visual = e.thumb
    ? `<span class="doc-visual"><img loading="lazy" decoding="async" src="${escapeHtml(e.thumb)}" alt=""></span>`
    : `<span class="doc-visual doc-glyph" style="--tile:${accent}" aria-hidden="true">${glyph}</span>`;
  const summary = e.summary
    ? `<p class="doc-summary">${escapeHtml(e.summary)}</p>`
    : "";
  return `        <a class="doc" href="${e.href}">
          ${visual}
          <span class="doc-body">
            <span class="doc-title">${escapeHtml(e.title)}</span>
            ${summary}
            <span class="doc-meta"><span class="badge badge-${e.kind}">${e.kind}</span>${date}${read}<code>${escapeHtml(sub ? sub + "/" : "")}${escapeHtml(e.file)}</code></span>
          </span>
        </a>`;
}

// The hub entry that a collection's card links to (its `index.html`); falls
// back to the first member so the card always has a destination.
function hubEntry(key, group) {
  const hub = COLLECTIONS[key].hub;
  return group.find((e) => e.href === hub || e.src === hub) || group[0];
}

// A single card standing in for a whole collection folder. `count` is the number
// of pages inside, minus the hub page itself.
function collectionCard(key, group, hub) {
  const meta = COLLECTIONS[key];
  const count = Math.max(0, group.length - 1);
  const href = hub ? hub.href : meta.hub;
  return `        <a class="doc collection" href="${href}">
          <span class="doc-title">${escapeHtml(meta.label)}</span>
          <span class="coll-blurb">${escapeHtml(meta.blurb)}</span>
          <span class="doc-meta"><span class="badge badge-collection">collection</span><span class="coll-count">Browse ${count} ${count === 1 ? "page" : "pages"} →</span></span>
        </a>`;
}

function renderIndex(entries) {
  // Featured docs float to a prominent block at the top (explicit order).
  const featured = FEATURED_DOCS.map((p) => entries.find((e) => e.src === p)).filter(
    Boolean,
  );
  const featuredSrc = new Set(featured.map((e) => e.src));

  // Archived docs sink to a single collapsed section at the bottom.
  const archived = entries.filter(
    (e) => isArchived(e.rel) && !featuredSrc.has(e.src),
  );
  const archivedSrc = new Set(archived.map((e) => e.src));

  // Collection folders collapse to a single hub card; everything else groups by
  // folder section as before.
  const collGroups = new Map(); // collection key -> its entries
  const groups = new Map(); // section key -> entries (non-collection)
  for (const e of entries) {
    if (featuredSrc.has(e.src) || archivedSrc.has(e.src)) continue;
    const key = sectionKey(e.rel);
    if (COLLECTIONS[key]) {
      if (!collGroups.has(key)) collGroups.set(key, []);
      collGroups.get(key).push(e);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  // One hub card per present collection, in registry order, in a "Collections"
  // section near the top.
  const collectionEntries = Object.keys(COLLECTIONS)
    .filter((key) => collGroups.has(key))
    .map((key) => {
      const group = collGroups.get(key);
      return { key, group, hub: hubEntry(key, group) };
    });
  const collectionsHtml = collectionEntries.length
    ? `    <section class="group reveal" style="animation-delay:.1s">
      <header class="group-head">
        <h2>Collections</h2>
        <p>Multi-page sets — open one to browse everything inside.</p>
        <span class="count">${collectionEntries.length}</span>
      </header>
      <div class="grid">
${collectionEntries.map((c) => collectionCard(c.key, c.group, c.hub)).join("\n")}
      </div>
    </section>`
    : "";

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
        .sort(byDateDesc)
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

  // Archive: collapsed by default, internally split into logical sub-groups,
  // each ordered by date (newest first).
  const archiveHtml = (() => {
    if (!archived.length) return "";
    const buckets = ARCHIVE_GROUPS.map((g) => ({ ...g, items: [] }));
    const other = { label: "Other", blurb: "", items: [] };
    for (const e of archived) {
      const p = e.rel.slice(ARCHIVE_PREFIX.length);
      const bucket = buckets.find((b) => b.test(p)) || other;
      bucket.items.push(e);
    }
    const inner = [...buckets, other]
      .filter((g) => g.items.length)
      .map((g) => {
        const items = g.items.sort(byDateDesc).map(docCard).join("\n");
        return `        <div class="arch-group">
          <header class="arch-head">
            <h3>${escapeHtml(g.label)}</h3>
            ${g.blurb ? `<p>${escapeHtml(g.blurb)}</p>` : ""}
            <span class="count">${g.items.length}</span>
          </header>
          <div class="grid">
${items}
          </div>
        </div>`;
      })
      .join("\n");
    return `    <details class="archive reveal">
      <summary>
        <span class="arch-title">Archive</span>
        <span class="arch-sub">Superseded, shipped, or off-focus — kept for reference.</span>
        <span class="count">${archived.length}</span>
      </summary>
      <div class="arch-body">
${inner}
      </div>
    </details>`;
  })();

  // "Sort by timestamp" view: two separate sections so the archive stays split
  // out from the live docs even when ordering purely by time — active docs in
  // one grid, archived docs in another, each newest-first. Toggled client-side;
  // hidden by default.
  // Collapse collection children in the by-date view too: keep each collection's
  // hub entry, drop the rest, so the timeline isn't flooded either.
  const inCollectionSrc = new Set();
  for (const c of collectionEntries) for (const e of c.group) inCollectionSrc.add(e.src);
  const collectionHubSrc = new Set(collectionEntries.map((c) => c.hub.src));
  const activeByDate = entries
    .filter((e) => !archivedSrc.has(e.src))
    .filter((e) => !inCollectionSrc.has(e.src) || collectionHubSrc.has(e.src))
    .sort(byDateDesc);
  const archivedByDate = [...archived].sort(byDateDesc);
  const byDateSection = (heading, blurb, items) =>
    `    <section class="group">
      <header class="group-head">
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(blurb)}</p>
        <span class="count">${items.length}</span>
      </header>
      <div class="grid">
${items.map(docCard).join("\n")}
      </div>
    </section>`;
  const byDateHtml = [
    byDateSection("Docs by date", "Newest first, across every section.", activeByDate),
    archivedByDate.length
      ? byDateSection(
          "Archive by date",
          "Superseded, shipped, or off-focus — newest first.",
          archivedByDate,
        )
      : "",
  ]
    .filter(Boolean)
    .join("\n");

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
.sort-toggle { margin-top: 1rem; display: inline-flex; gap: .25rem; padding: .25rem; border: 1px solid var(--line); background: var(--bg-soft); border-radius: 999px; box-shadow: var(--shadow); }
.sort-btn { font-family: "JetBrains Mono", monospace; font-size: .8rem; color: var(--muted); background: transparent; border: 0; padding: .4rem .9rem; border-radius: 999px; cursor: pointer; transition: background .15s ease, color .15s ease; }
.sort-btn:hover { color: var(--ink); }
.sort-btn.is-active { background: var(--accent); color: #1c1714; font-weight: 600; }
.group { margin-top: 2.6rem; }
.group-head { display: flex; align-items: baseline; gap: .85rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: .6rem; margin-bottom: 1.2rem; }
.group-head h2 { font-size: 1.6rem; font-weight: 600; margin: 0; }
.group-head p { color: var(--muted); margin: 0; font-size: .95rem; }
.group-head .count { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: .8rem; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: .1rem .6rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: .9rem; }
.doc { display: grid; grid-template-columns: 3.4rem 1fr; gap: .95rem; align-items: start; padding: 1.05rem 1.15rem; background: linear-gradient(180deg, var(--card), var(--bg-soft)); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); transition: transform .15s ease, border-color .15s ease; }
.doc:hover { text-decoration: none; transform: translateY(-3px); border-color: var(--accent); }
.doc-visual { width: 3.4rem; height: 3.4rem; border-radius: 11px; overflow: hidden; display: grid; place-items: center; flex: none; }
.doc-visual img { width: 100%; height: 100%; object-fit: cover; display: block; background: var(--bg); }
.doc-glyph { font-size: 1.55rem; line-height: 1; background: var(--bg-soft); background: linear-gradient(150deg, color-mix(in srgb, var(--tile) 30%, var(--card)), var(--bg-soft)); border: 1px solid var(--line); border-color: color-mix(in srgb, var(--tile) 38%, var(--line)); box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
.doc-body { display: flex; flex-direction: column; gap: .42rem; min-width: 0; }
.doc-title { font-family: "Fraunces", serif; font-weight: 600; font-size: 1.1rem; color: var(--ink); line-height: 1.25; }
.doc-summary { margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.doc-meta { display: flex; align-items: center; gap: .5rem .6rem; flex-wrap: wrap; font-size: .78rem; color: var(--muted); margin-top: .15rem; }
.doc-meta code { font-size: .72rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.badge { font-family: "JetBrains Mono", monospace; font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; padding: .12rem .42rem; border-radius: 5px; flex: none; }
.badge-html { background: rgba(224,145,58,.18); color: #f0b46e; }
.badge-md { background: rgba(139,171,90,.18); color: #b6cd84; }
.badge-collection { background: rgba(224,145,58,.2); color: #f0b46e; }
.doc.collection { background: linear-gradient(180deg, rgba(224,145,58,.1), var(--bg-soft)); border-color: rgba(224,145,58,.42); }
.doc.collection:hover { border-color: var(--accent); }
.coll-blurb { color: var(--muted); font-size: .88rem; line-height: 1.45; }
.coll-count { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: .72rem; color: var(--accent); white-space: nowrap; }
.doc-date { font-family: "JetBrains Mono", monospace; font-size: .72rem; color: var(--muted); flex: none; }
.doc-read { font-family: "JetBrains Mono", monospace; font-size: .72rem; color: var(--muted); flex: none; }
.doc-read::before { content: "·"; margin-right: .55rem; color: var(--line); }
.featured { margin-top: 0; padding: 1.4rem 1.5rem 1.5rem; background: linear-gradient(135deg, rgba(224,145,58,.16), rgba(139,171,90,.07)); border: 1px solid var(--accent); border-radius: 18px; box-shadow: var(--shadow); }
.featured-eyebrow { font-family: "JetBrains Mono", monospace; font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin: 0 0 .9rem; }
.featured .doc { border-color: rgba(224,145,58,.5); background: linear-gradient(180deg, rgba(224,145,58,.1), var(--bg-soft)); }
.featured .doc-title { font-size: 1.4rem; }
.featured .doc-visual { width: 4rem; height: 4rem; }
.archive { margin-top: 3.5rem; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-soft); overflow: hidden; }
.archive > summary { list-style: none; cursor: pointer; display: flex; align-items: baseline; gap: .85rem; flex-wrap: wrap; padding: 1.1rem 1.4rem; user-select: none; }
.archive > summary::-webkit-details-marker { display: none; }
.archive > summary::before { content: "▸"; color: var(--accent); font-size: .9rem; align-self: center; transition: transform .15s ease; }
.archive[open] > summary::before { transform: rotate(90deg); }
.archive > summary:hover .arch-title { color: var(--accent); }
.archive .arch-title { font-family: "Fraunces", serif; font-size: 1.6rem; font-weight: 600; }
.archive .arch-sub { color: var(--muted); font-size: .95rem; }
.archive > summary .count { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: .8rem; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: .1rem .6rem; align-self: center; }
.arch-body { padding: 0 1.4rem 1.6rem; }
.arch-group { margin-top: 1.8rem; }
.arch-head { display: flex; align-items: baseline; gap: .7rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: .45rem; margin-bottom: 1rem; }
.arch-head h3 { font-size: 1.2rem; font-weight: 600; margin: 0; color: var(--muted); }
.arch-head p { color: var(--muted); margin: 0; font-size: .9rem; }
.arch-head .count { margin-left: auto; font-family: "JetBrains Mono", monospace; font-size: .75rem; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: .08rem .55rem; }
.archive .doc { background: var(--card); box-shadow: none; }
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
      </nav>
      <div class="sort-toggle" role="group" aria-label="Sort documents">
        <button type="button" class="sort-btn is-active" data-view="grouped" aria-pressed="true">By section</button>
        <button type="button" class="sort-btn" data-view="bydate" aria-pressed="false">By date (newest)</button>
      </div>
    </header>
    <div id="view-grouped">
${featuredHtml}
${collectionsHtml}
${sections}
${archiveHtml}
    </div>
    <div id="view-bydate" hidden>
${byDateHtml}
    </div>
    <footer>
      ${entries.length} documents · generated at build time by <code>reference/tools/build-docs.mjs</code>
    </footer>
  </div>
  <script>
  (function () {
    var KEY = "docs-sort-view";
    var grouped = document.getElementById("view-grouped");
    var bydate = document.getElementById("view-bydate");
    var btns = Array.prototype.slice.call(document.querySelectorAll(".sort-btn"));
    function apply(view) {
      var byDate = view === "bydate";
      grouped.hidden = byDate;
      bydate.hidden = !byDate;
      btns.forEach(function (b) {
        var active = b.getAttribute("data-view") === view;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      try { localStorage.setItem(KEY, view); } catch (e) {}
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-view")); });
    });
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === "bydate") apply(saved);
  })();
  </script>
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

// Folders that already ship their own index.html — used to decide whether a
// folder's README should be promoted into that folder's hub page.
const indexFolders = new Set();
for (const repoRel of files) {
  const docRel = relative(docsRoot, join(repoRoot, repoRel)).replace(/\\/g, "/");
  if (/(^|\/)index\.html?$/i.test(docRel)) {
    indexFolders.add(docRel.replace(/\/?index\.html?$/i, ""));
  }
}

for (const repoRel of files) {
  const abs = join(repoRoot, repoRel);
  // Normalize to forward slashes so section grouping + featured/archive
  // matching behave identically on Windows (path.relative uses "\") and CI.
  const docRel = relative(docsRoot, abs).replace(/\\/g, "/"); // path relative to docs/
  const file = docRel.split("/").pop();
  const depth = docRel.split("/").length - 1;
  const dir = docRel.includes("/") ? docRel.slice(0, docRel.lastIndexOf("/")) : "";

  const isReadme = /^readme\.md$/i.test(file);
  // A folder README with no sibling index.html becomes that folder's hub page
  // (rendered to <dir>/index.html), so the folder gets a real landing page on
  // the deployed site — e.g. projects/README.md → projects/index.html, the
  // index of every brief. Archived folders keep their existing handling.
  const promoteReadme = isReadme && dir && !isArchived(docRel) && !indexFolders.has(dir);

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
      summary: summaryFromHtml(html),
      minutes: readingMinutes(textFromHtml(html)),
      thumb: pickThumb(html, docRel),
      ...docMeta(repoRel, file),
    });
  } else if (promoteReadme) {
    const md = readFileSync(abs, "utf8");
    const title = titleFromMarkdown(md, prettyName(dir.split("/").pop()));
    const body = rewriteMdLinks(marked.parse(md));
    const outRel = `${dir}/index.html`;
    const outPath = join(outRoot, outRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, renderMarkdownPage(title, body, depth));
    entries.push({
      rel: outRel,
      href: outRel,
      src: docRel,
      file: "index.html",
      kind: "md",
      title,
      summary: summaryFromMarkdown(md),
      minutes: readingMinutes(textFromMarkdown(md)),
      thumb: pickThumb(md, docRel),
      ...docMeta(repoRel, file),
    });
  } else if (/\.md$/i.test(file) && !isReadme) {
    const md = readFileSync(abs, "utf8");
    const title = titleFromMarkdown(md, prettyName(file));
    const body = rewriteMdLinks(marked.parse(md));
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
      summary: summaryFromMarkdown(md),
      minutes: readingMinutes(textFromMarkdown(md)),
      thumb: pickThumb(md, docRel),
      ...docMeta(repoRel, file),
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
