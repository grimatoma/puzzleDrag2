---
name: html-docs
description: Use when saving a design doc, spec, plan, report, audit, research write-up, runbook, or any standalone document/deliverable into a repo (anything under docs/ or a *.md you'd otherwise create) — author it as a self-contained, good-looking HTML page instead of a wall of Markdown. Also use when converting an existing Markdown doc to HTML, or when asked to make a doc "look nice", navigable, or interactive.
---

# HTML Docs

## Overview

**Documentation is a deliverable — treat its visual design like front-end work.** A long spec stays useful when it is *navigable* (table of contents, sticky nav, collapsible sections, filters) and *legible* (real type hierarchy, tables, color-coded status, SVG diagrams), not a flat wall of Markdown text.

Author repo docs as **single-file, self-contained `.html`** with inline CSS (and a little JS where it earns its keep). No build step, no dependencies, no external image assets — webfonts pulled from a CDN are fine. One file you can open in any browser, commit, and diff.

Rationale and a gallery of worked examples:
- https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html
- https://github.com/anthropics/html-effectiveness (20+ standalone examples: status report, incident report, design system, flowchart, concept explainer, implementation plan, PR write-up, …)

## When to use

Use HTML for documents that are **read and navigated**: design docs, specs, implementation plans (once checked in), architecture overviews, audits, status/incident reports, research and concept explainers, runbooks, post-mortems, PR write-ups, wikis.

**Do NOT use HTML for:**
- **`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`** and other files GitHub/npm render as Markdown by convention — keep them Markdown.
- **Plan-mode plans under review.** The Claude Code plan reviewer renders Markdown, not HTML. Keep the in-review plan `.md`; once approved and checked into the repo, migrate it to a styled `.html`.
- **Chat answers and short notes.** Don't generate a file when prose in the reply is the right medium.
- **Machine-read docs** (`AGENTS.md`, `CLAUDE.md`, anything a tool parses).

## Workflow

1. **Copy `template.html`** in this skill folder to your destination (e.g. `docs/<name>.html`). It is pre-wired with the sticky-TOC layout, callouts, tables, an SVG diagram slot, collapsible `<details>`, a filter/tab demo, scroll-spy nav highlighting, and print / mobile / `prefers-reduced-motion` media queries.
2. **Retheme to the subject.** Edit the CSS variables in `:root` (palette + fonts) — see `design-principles.md`. Don't ship the default slate/amber if the subject suggests another mood. **Match the palette to the content.**
3. **Fill in real content.** Replace every placeholder. Use the HTML strengths below instead of paragraph-stacking.
4. **Verify it renders** — open the file (or `python3 -m http.server`) and check the TOC scrolls, nav highlights, details toggle, and the print/mobile layouts hold. Confirm there are zero external asset references besides CDN fonts.

## Leverage HTML's strengths (don't just paste Markdown into a `<div>`)

| Instead of… | Use… |
|---|---|
| A 2000-word scroll | Sticky **table-of-contents** sidebar + `scroll-margin` anchors + scroll-spy active highlighting |
| Repeated "Status: done / todo" prose | **Color-coded chips / pills / badges** and a status legend |
| ASCII art or "see the attached diagram" | Inline **SVG** flowcharts, timelines, architecture maps (crisp, themeable, no asset files) |
| Comparison written as paragraphs | **Tables** (zebra striping, sticky headers) |
| One giant page with everything expanded | Collapsible **`<details>`** for appendices, raw data, long lists |
| "Filter mentally for X" | A few lines of **JS** for tabs / filter buttons / live search over the content |
| Callout buried in a sentence | **Callout boxes** (note / warning / tip) with a left accent border |

## Design principles (the page must look intentional, not auto-generated)

Full detail in `design-principles.md`. The essentials:

- **Type with character.** Don't default to Inter/Roboto/Arial. Pair a distinctive display/serif for headings with a clean body sans and a real monospace (e.g. Fraunces/Newsreader + IBM Plex Sans + JetBrains Mono). Use **bold hierarchy** — big jumps in weight (300 vs 800) and size (3×+) between h1/h2/body, not timid 400-vs-600 steps.
- **Commit to a cohesive palette via CSS variables.** One dominant color + one or two sharp accents beats an even rainbow. **Avoid the generic-AI look** — no purple-gradient-on-white. Ship a dark theme when it suits.
- **Add depth, not flat fills.** Layered CSS gradients, a subtle texture/geometric background, soft shadows, rounded cards.
- **Polish with restraint.** A staggered page-load reveal (`animation-delay`) and tasteful hover states earn their keep; scatter-shot micro-animations don't. Keep motion CSS-only and respect `prefers-reduced-motion`.
- **Always keep the page working** in print and on mobile — the template's media queries are not optional decoration.

## Common mistakes

- **Markdown dressed as HTML** — `<p>` after `<p>` with no TOC, tables, diagrams, or color. If it reads like a `.md`, you skipped the point.
- **Default fonts / purple-on-white gradient** — the generic-AI look. Retheme.
- **External assets** — linking local images or a CSS file breaks the single-file portability. Draw diagrams as inline SVG; inline the CSS.
- **Forgetting the negative space cases** — no print styles, no mobile breakpoint, no reduced-motion fallback.
- **Leaving placeholders** — shipping the template's lorem/demo content.
- **Wrong format** — converting a README or an under-review plan to HTML. See "When to use".

## Portability

This skill is self-contained and project-agnostic — copy the `html-docs/` folder into any repo's `.claude/skills/` to get the same convention there. The template carries no project-specific content.
