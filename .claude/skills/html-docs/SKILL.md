---
name: html-docs
description: >-
  Use when writing or saving an engineering design doc, technical spec, architecture overview, RFC/ADR, or a checked-in implementation plan into a repo — author it as a single self-contained, good-looking HTML file instead of a wall of Markdown. Also use when converting an existing Markdown design/spec doc to HTML, or when asked to make a design doc or spec "look nice", navigable, or easier to read. Trigger whenever you'd otherwise create a long *.md design doc or spec under docs/.
---

# HTML Docs

Engineering design docs and specs, authored as **single-file, self-contained HTML** instead of Markdown.

## Why HTML, not Markdown

A design doc or spec is **read, not hand-edited.** Reviewers open it to understand a decision and then comment or build — nobody edits the prose in a text editor. Once editing leaves the picture, Markdown's one real advantage (diffable plain text you tweak by hand) stops paying for itself, while its ceiling stays: it can't lay out a diagram, color-code a status, put two options side by side, or stay navigable past a screen or two. A long `.md` becomes a wall people skim and abandon around ~100 lines.

The same spec as an HTML page — a sticky table of contents, an SVG architecture diagram, a comparison table, color-coded status, collapsible appendices — actually gets read end to end. So: **for a design doc or spec, write one `.html` file.** No build step, no dependencies, no external assets (CDN webfonts are fine). One file you open in any browser, commit, and diff. (Rationale: <https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html>.)

This costs more tokens than Markdown and makes noisier git diffs — worth it for a spec read many times, not for the cases below.

## When to use / when not to

**Use HTML for:** design docs, technical specs, architecture overviews, RFCs / ADRs, system-design write-ups, and implementation plans **once they're approved and checked into the repo** (anything you'd otherwise save as a long `docs/<name>.md`).

**Keep Markdown for:**
- **`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`** and other files a tool or platform renders as Markdown by convention.
- **Machine-read docs** (`AGENTS.md`, `CLAUDE.md`, anything a tool parses).
- **Plan-mode plans still under review** — the Claude Code plan reviewer renders Markdown, not HTML. Keep the in-review plan `.md`; migrate it to a styled `.html` once it's approved and checked in.
- **Short notes / chat answers** — if prose in the reply is the right medium, don't generate a file.

## Workflow

1. **Copy `assets/doc.html`** to the destination (e.g. `docs/<name>.html`). It's pre-wired with a **horizontal tab bar** (each tab is a *logical group* of sections, shown one group at a time so each view stays short and readable), callouts, tables, an SVG diagram slot, status chips, collapsible `<details>`, a filter demo, and print / mobile / `prefers-reduced-motion` media queries.
2. **Retheme to the subject.** Edit only the CSS variables in `:root` (palette + the three fonts) — see [`references/design.md`](references/design.md). Match the palette to the content; don't ship the default theme reflexively.
3. **Fill in real content.** Replace every placeholder, and use the HTML strengths below instead of stacking paragraphs.
4. **Verify it renders** — open the file (or `python3 -m http.server`) and check the section tabs switch (and deep-link via `#hash` + browser back), the table filter and `<details>` toggle work, and the print/mobile layouts hold. Confirm there are **zero external references** besides the CDN font link.

**Grouped tabs are the default** — a horizontal tab bar keeps a long spec readable by showing one *logical group* of sections at a time. **Group into a handful of tabs (~3–6); don't make one tab per heading** — 15 tabs is just a table of contents with extra clicks. Cluster sections that belong together (e.g. *Design · Balance · Plan · Reference*); each tab's panel holds several `<section>`s that scroll within it. Tabs are deep-linkable both by panel id (`#design`) and by any section id inside a panel (`#some-section` opens its tab and scrolls to it), are back/forward-aware, and degrade to a full scroll with no JS or when printing (so nothing is lost in a PDF). Cross-link freely with `<a href="#other-section">` — those links switch tabs automatically. For a doc short enough to read top-to-bottom, a single long scroll is fine — just unwrap the `.panel` divs so the sections flow, and drop the tab bar and its `<script>`.

## Leverage HTML's strengths (don't just paste Markdown into a `<div>`)

| Instead of… | Use… |
|---|---|
| A 2000-word scroll | A **horizontal tab bar** grouping sections into ~3–6 logical tabs (one group shown at a time) — or a single scroll for shorter docs |
| ASCII art or "see the attached diagram" | Inline **SVG** architecture maps, flowcharts, sequence/timeline diagrams (crisp, themeable, no asset files) |
| Options/trade-offs written as paragraphs | A **comparison table** or a side-by-side **card grid** |
| Repeated "Status: done / todo / blocked" prose | **Color-coded chips** + a status legend |
| One giant page with everything expanded | Collapsible **`<details>`** for appendices, raw data, long enumerations |
| Callout buried mid-sentence | **Callout boxes** (note / warning / tip) with a left accent border |

## Design — make it look intentional, not auto-generated

Full detail in [`references/design.md`](references/design.md). The essentials:

- **Type with character.** Don't default to Inter/Roboto/Arial (or Space Grotesk by reflex). Pair a distinctive display/serif for headings with a clean body sans and a real monospace (e.g. Fraunces + IBM Plex Sans + JetBrains Mono). Use **bold hierarchy** — big weight (300↔800) and size (3×+) jumps, not timid 400-vs-600 steps.
- **Commit to a cohesive palette via CSS variables.** One dominant color + one or two sharp accents. **Avoid the generic purple-gradient-on-white look.** A dark theme is a fine choice for a technical doc.
- **Add depth, not flat fills** — layered gradients, soft shadows, rounded cards.
- **Polish with restraint** — one staggered page-load reveal, tasteful hover; no scatter-shot micro-animations. CSS-only motion, respect `prefers-reduced-motion`.
- **Always keep print and mobile working** — docs get PDF'd and read on phones. The template's media queries are requirements, not decoration.

## Common mistakes

- **Markdown dressed as HTML** — `<p>` after `<p>` with no TOC, tables, diagrams, or color. If it reads like a `.md`, you paid the HTML cost for none of the benefit.
- **Default fonts / purple-on-white gradient** — the generic-AI look. Retheme. ([`references/design.md`](references/design.md))
- **External assets** — a linked image or stylesheet breaks single-file portability. Draw diagrams as inline SVG; inline the CSS.
- **Skipping the edge cases** — no print styles, no mobile breakpoint, no reduced-motion fallback.
- **Leaving the template's placeholder/demo content** in the shipped file.
- **Wrong format** — converting a README or an under-review plan to HTML. See "When to use / when not to."

## Portability

Self-contained and project-agnostic — copy the `html-docs/` folder into any repo's `.claude/skills/` to carry the convention forward. The template and design reference contain no project-specific content.
