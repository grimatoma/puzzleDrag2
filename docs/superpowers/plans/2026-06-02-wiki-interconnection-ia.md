# Wiki Interconnection & IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/b/` Dev Panel wiki more interconnected and better organized — a two-level primary→secondary nav tree, explicit page-kind badges, a definition lead on concept pages, and bidirectional tile↔category / tile↔discovery-method cross-links (which also surface member-tile lists on category and discovery-method pages).

**Architecture:** Pure data/logic lives in small testable modules (`wikiNav.ts`, `relations.ts`, a new `pageKind.ts`, a new `memberTiles.ts`); React components (`WikiShell`, `CategoryPage`, `WikiArticle`, `TileUnlock`, new `PageKindBadge`, new `MemberTiles`) are thin renderers over those helpers. Cross-links are declared once as forward edges in `relations.ts`; `backlinks.ts` already inverts every forward edge, so adding tile→category and tile→discovery-method edges automatically yields "Tiles" backlink groups on category and discovery-method pages. No routing changes — every concept keeps its own tab id and hash route.

**Tech Stack:** TypeScript, React (React Compiler on — no manual `useMemo`/`useCallback`), Vitest + `@testing-library/react` (jsdom), Tailwind utility classes + `COLORS` from `../shared.jsx`.

**Spec:** `docs/superpowers/specs/2026-06-02-wiki-interconnection-ia-design.html`

---

## File Structure

| File | Responsibility | New? |
|---|---|---|
| `src/balanceManager/wiki/pageKind.ts` | Pure: map a concept id → page-kind of its instance pages (`"instance" | "category"`) | **new** |
| `src/balanceManager/wiki/PageKindBadge.jsx` | Small badge component (Concept / Category / Instance) | **new** |
| `src/balanceManager/wiki/memberTiles.ts` | Pure: list member tiles for a category key or a discovery-method id | **new** |
| `src/balanceManager/wiki/sections/MemberTiles.jsx` | Renders the member-tile grid for category / discovery-method instance pages | **new** |
| `src/balanceManager/wiki/concepts.ts` | Add `pageKind` field to descriptors | modify |
| `src/balanceManager/wiki/wikiNav.ts` | Two-level nav model (primary + `children`) | modify |
| `src/balanceManager/wiki/wikiNav.test.ts` | Coverage test updated for nested children | modify |
| `src/balanceManager/wiki/WikiShell.tsx` | Render collapsible primary→child tree, auto-expand active | modify |
| `src/balanceManager/wiki/relations.ts` | tile→category + tile→discovery-method forward edges | modify |
| `src/balanceManager/wiki/CategoryPage.tsx` | Definition lead section + Concept badge | modify |
| `src/balanceManager/wiki/WikiArticle.tsx` | Page-kind badge, clickable breadcrumb, MemberTiles section | modify |
| `src/balanceManager/wiki/sections/TileUnlock.tsx` | Make discovery-method name a navigable link | modify |
| `src/balanceManager/wiki/infoboxFacts.ts` | Category fact for tiles | modify |

Each task is independently committable. Tasks 1–7 are bottom-up (pure helpers and leaf components first); tasks 8–10 wire them into the page templates.

---

## Task 1: Page-kind model (`pageKind.ts` + concept field)

**Files:**
- Create: `src/balanceManager/wiki/pageKind.ts`
- Create: `src/balanceManager/wiki/pageKind.test.ts`
- Modify: `src/balanceManager/wiki/concepts.ts` (add `pageKind` to `categories` + `tileDiscoveryMethods` descriptors)

**Context:** Most concepts' instance pages are a single game entity ("Instance"). Two concepts — `categories` and `tileDiscoveryMethods` — have instance pages that are *groupings* of tiles ("Category"). The concept landing page itself is always a "Concept". This task adds the pure mapping; later tasks render the badge.

- [ ] **Step 1: Write the failing test**

Create `src/balanceManager/wiki/pageKind.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pageKindFor, PAGE_KIND_META } from "./pageKind.js";
import { CONCEPTS } from "./concepts.js";

describe("pageKindFor", () => {
  it("returns 'category' for the grouping concepts", () => {
    expect(pageKindFor("categories")).toBe("category");
    expect(pageKindFor("tileDiscoveryMethods")).toBe("category");
  });

  it("returns 'instance' for ordinary entity concepts", () => {
    expect(pageKindFor("tiles")).toBe("instance");
    expect(pageKindFor("recipes")).toBe("instance");
    expect(pageKindFor("npcs")).toBe("instance");
  });

  it("defaults unknown concept ids to 'instance'", () => {
    expect(pageKindFor("does_not_exist")).toBe("instance");
  });

  it("every concept resolves to a kind that has badge metadata", () => {
    for (const c of CONCEPTS) {
      const kind = pageKindFor(c.id);
      expect(PAGE_KIND_META[kind]).toBeDefined();
    }
  });

  it("exposes a 'concept' badge for landing pages", () => {
    expect(PAGE_KIND_META.concept.label).toBe("Concept");
    expect(PAGE_KIND_META.category.label).toBe("Category");
    expect(PAGE_KIND_META.instance.label).toBe("Instance");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/pageKind.test.ts`
Expected: FAIL — `Cannot find module './pageKind.js'`.

- [ ] **Step 3: Add the `pageKind` field to the two grouping descriptors in `concepts.ts`**

In `src/balanceManager/wiki/concepts.ts`, find the `categories` descriptor (around line 280) and add a `pageKind` field:

```ts
  {
    id: "categories",
    label: "Categories",
    blurb: "Tile/zone category names for spawn pools, thresholds, and upgrade maps.",
    pageKind: "category",
    getEntries: categoryEntries,
  },
```

Find the `tileDiscoveryMethods` descriptor (around line 347) and add the same field:

```ts
  {
    id: "tileDiscoveryMethods",
    label: "Tile discovery",
    blurb: "How tiles unlock: default, chain, research, buy, daily reward.",
    pageKind: "category",
    getEntries: tileDiscoveryMethodEntries,
  },
```

(Leave every other descriptor unchanged — they default to `"instance"`.)

- [ ] **Step 4: Create `pageKind.ts`**

Create `src/balanceManager/wiki/pageKind.ts`:

```ts
/**
 * pageKind.ts — Classifies wiki pages into three kinds for the page-kind badge.
 *
 *   - "concept"  — a concept LANDING page (the Tiles page; rendered by CategoryPage).
 *   - "category" — an instance page that is a GROUPING of tiles (a tile category,
 *                  or a discovery method); lists members.
 *   - "instance" — an instance page for a single game entity (the Wheat tile).
 *
 * `pageKindFor(conceptId)` returns the kind of a concept's INSTANCE pages.
 * The concept landing page is always "concept" (CategoryPage hardcodes it).
 *
 * Pure module — no React, no DOM.
 */

import { CONCEPTS } from "./concepts.js";

export type PageKind = "concept" | "category" | "instance";

export interface PageKindMeta {
  label: string;
  /** StatusChip tone — see src/ui/primitives/StatusChip. */
  tone: "info" | "warn" | "neutral";
}

export const PAGE_KIND_META: Record<PageKind, PageKindMeta> = {
  concept: { label: "Concept", tone: "info" },
  category: { label: "Category", tone: "warn" },
  instance: { label: "Instance", tone: "neutral" },
};

/** The kind of a concept's INSTANCE pages. Defaults to "instance". */
export function pageKindFor(conceptId: string): Exclude<PageKind, "concept"> {
  const concept = CONCEPTS.find((c) => c.id === conceptId) as
    | { pageKind?: "instance" | "category" }
    | undefined;
  return concept?.pageKind === "category" ? "category" : "instance";
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/pageKind.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Verify the `tone` values are valid StatusChip tones**

Run: `grep -n "tone" src/ui/primitives/StatusChip.jsx | head`
Expected: confirms `info`, `warn`, and a neutral/default tone exist. If the neutral tone has a different name (e.g. `"muted"` or `"default"`), update `PAGE_KIND_META.instance.tone` and `PageKindMeta` to match, then re-run Step 5.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/balanceManager/wiki/pageKind.ts src/balanceManager/wiki/pageKind.test.ts src/balanceManager/wiki/concepts.ts
git commit -m "wiki: add pageKind model classifying concept/category/instance pages"
```

---

## Task 2: Page-kind badge component, wired into both page templates

**Files:**
- Create: `src/balanceManager/wiki/PageKindBadge.jsx`
- Create: `src/balanceManager/wiki/PageKindBadge.test.tsx`
- Modify: `src/balanceManager/wiki/CategoryPage.tsx:64-82` (header)
- Modify: `src/balanceManager/wiki/WikiArticle.tsx:222-258` (header)

**Context:** The badge reads `PAGE_KIND_META` from Task 1 and renders a `StatusChip`. CategoryPage always passes `kind="concept"`. WikiArticle passes `pageKindFor(conceptId)`.

- [ ] **Step 1: Write the failing test**

Create `src/balanceManager/wiki/PageKindBadge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import PageKindBadge from "./PageKindBadge.jsx";

afterEach(() => cleanup());

describe("PageKindBadge", () => {
  it("renders the Concept label", () => {
    render(<PageKindBadge kind="concept" />);
    expect(document.body.textContent).toContain("Concept");
  });

  it("renders the Category label", () => {
    render(<PageKindBadge kind="category" />);
    expect(document.body.textContent).toContain("Category");
  });

  it("renders the Instance label", () => {
    render(<PageKindBadge kind="instance" />);
    expect(document.body.textContent).toContain("Instance");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/PageKindBadge.test.tsx`
Expected: FAIL — `Cannot find module './PageKindBadge.jsx'`.

- [ ] **Step 3: Create the component**

Create `src/balanceManager/wiki/PageKindBadge.jsx`:

```jsx
/**
 * PageKindBadge.jsx — Small labelled badge that names the kind of wiki page
 * the reader is on: Concept (a definition/landing page), Category (a grouping
 * that lists members), or Instance (a single game entity).
 *
 * Driven by PAGE_KIND_META in pageKind.ts — never hand-set per page.
 */

import React from "react";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { PAGE_KIND_META } from "./pageKind.js";

/**
 * @param {{ kind: "concept" | "category" | "instance" }} props
 */
export default function PageKindBadge({ kind }) {
  const meta = PAGE_KIND_META[kind] ?? PAGE_KIND_META.instance;
  return (
    <StatusChip
      tone={meta.tone}
      size="xs"
      uppercase
      title={`Page kind: ${meta.label}`}
      aria-label={`Page kind: ${meta.label}`}
    >
      {meta.label}
    </StatusChip>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/PageKindBadge.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the badge into the CategoryPage header**

In `src/balanceManager/wiki/CategoryPage.tsx`, add the import near the other imports (after line 21's `StatusChip` import):

```tsx
import PageKindBadge from "./PageKindBadge.jsx";
```

Then in the header (inside the `flex items-center gap-2 flex-wrap` div, immediately before the existing `<StatusChip ...>{statusMeta.label}</StatusChip>` block at line 72) add:

```tsx
          <PageKindBadge kind="concept" />
```

- [ ] **Step 6: Wire the badge into the WikiArticle header**

In `src/balanceManager/wiki/WikiArticle.tsx`, add the imports near line 35–36:

```tsx
import PageKindBadge from "./PageKindBadge.jsx";
import { pageKindFor } from "./pageKind.js";
```

Then in the header, immediately before the existing status `<StatusChip ...>` block at line 248, add:

```tsx
          <PageKindBadge kind={pageKindFor(conceptId)} />
```

- [ ] **Step 7: Run the broader wiki suite + typecheck**

Run: `npx vitest run src/balanceManager/wiki/ && npm run typecheck`
Expected: PASS. (Existing `CategoryPage.test.tsx` / `WikiArticle.test.tsx` should still pass — the badge only adds text.)

- [ ] **Step 8: Commit**

```bash
git add src/balanceManager/wiki/PageKindBadge.jsx src/balanceManager/wiki/PageKindBadge.test.tsx src/balanceManager/wiki/CategoryPage.tsx src/balanceManager/wiki/WikiArticle.tsx
git commit -m "wiki: render page-kind badge on concept and instance pages"
```

---

## Task 3: Two-level navigation model (`wikiNav.ts`)

**Files:**
- Modify: `src/balanceManager/wiki/wikiNav.ts:8-21`
- Modify: `src/balanceManager/wiki/wikiNav.test.ts`

**Context:** `WIKI_SECTIONS` is currently a flat `conceptIds: string[]` per section. We replace it with a list of *nodes*, each a primary concept id with an optional `children` array of secondary concept ids. The existing coverage test (every concept appears exactly once) must now flatten primaries + children.

- [ ] **Step 1: Rewrite the coverage test to expect the nested shape**

Replace the body of `src/balanceManager/wiki/wikiNav.test.ts` (keep the `NARRATIVE_PAGES` and `UTILITIES` describe blocks unchanged) so the first describe block reads:

```ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, UTILITIES, allNavConceptIds } from "./wikiNav.js";

describe("WIKI_SECTIONS concept coverage", () => {
  const allIds = allNavConceptIds();

  it("has no duplicate concept ids across sections, primaries, or children", () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("covers every concept exactly once", () => {
    const conceptSet = new Set(CONCEPTS.map((c) => c.id));
    for (const id of allIds) {
      expect(conceptSet.has(id), `"${id}" in WIKI_SECTIONS is not a real concept id`).toBe(true);
    }
    for (const c of CONCEPTS) {
      expect(allIds.includes(c.id), `concept "${c.id}" is missing from WIKI_SECTIONS`).toBe(true);
    }
  });

  it("every child concept names a real concept", () => {
    const conceptSet = new Set(CONCEPTS.map((c) => c.id));
    for (const sec of WIKI_SECTIONS) {
      for (const node of sec.nodes) {
        for (const child of node.children ?? []) {
          expect(conceptSet.has(child), `child "${child}" is not a real concept id`).toBe(true);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/wikiNav.test.ts`
Expected: FAIL — `allNavConceptIds` / `sec.nodes` not defined.

- [ ] **Step 3: Rewrite `wikiNav.ts` with the nested model**

Replace lines 8–21 of `src/balanceManager/wiki/wikiNav.ts` with:

```ts
export interface WikiNavNode {
  /** Primary concept id (always a real concept). */
  conceptId: string;
  /** Secondary concept ids nested under this primary (collapsible in the sidebar). */
  children?: string[];
}

export interface WikiSection {
  id: string;
  label: string;
  nodes: WikiNavNode[];
}

export const WIKI_SECTIONS: WikiSection[] = [
  {
    id: "board",
    label: "Board",
    nodes: [
      { conceptId: "tiles", children: ["categories", "tileDiscoveryMethods"] },
      { conceptId: "zones", children: ["settlementBiomes", "keepers"] },
      { conceptId: "seasons" },
    ],
  },
  {
    id: "economy",
    label: "Economy",
    nodes: [
      { conceptId: "resources" },
      { conceptId: "recipes" },
      { conceptId: "buildings" },
      { conceptId: "tools", children: ["toolPowers"] },
    ],
  },
  {
    id: "world",
    label: "World",
    nodes: [
      { conceptId: "npcs" },
      { conceptId: "workers" },
      { conceptId: "bosses" },
      { conceptId: "hazards" },
      { conceptId: "abilities" },
    ],
  },
  {
    id: "progression",
    label: "Progression",
    nodes: [
      { conceptId: "boons" },
      { conceptId: "dailyRewards" },
      { conceptId: "achievements" },
    ],
  },
  {
    id: "screens",
    label: "Screens",
    nodes: [{ conceptId: "views" }, { conceptId: "modals" }],
  },
];

/** Flatten every concept id referenced anywhere in the nav (primaries + children). */
export function allNavConceptIds(): string[] {
  const out: string[] = [];
  for (const sec of WIKI_SECTIONS) {
    for (const node of sec.nodes) {
      out.push(node.conceptId);
      for (const child of node.children ?? []) out.push(child);
    }
  }
  return out;
}

/** The parent primary concept id for a given concept id, or null if it is a primary (or absent). */
export function parentConceptId(conceptId: string): string | null {
  for (const sec of WIKI_SECTIONS) {
    for (const node of sec.nodes) {
      if ((node.children ?? []).includes(conceptId)) return node.conceptId;
    }
  }
  return null;
}
```

> Note: `seasons` moved into Board and `settlementBiomes` nests under Zones (it's a Board grouping in the old layout); `keepers` nests under Zones (biome guardians). This keeps all 22 concept ids covered exactly once — the coverage test enforces it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/wikiNav.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (this WILL surface the WikiShell break)**

Run: `npm run typecheck`
Expected: errors in `WikiShell.tsx` referencing `sec.conceptIds` (now removed). That is expected — Task 4 fixes it. Do **not** fix WikiShell here; commit the model first.

- [ ] **Step 6: Commit**

```bash
git add src/balanceManager/wiki/wikiNav.ts src/balanceManager/wiki/wikiNav.test.ts
git commit -m "wiki: model nav as a two-level primary->secondary tree"
```

---

## Task 4: Render the collapsible nav tree in `WikiShell.tsx`

**Files:**
- Modify: `src/balanceManager/wiki/WikiShell.tsx:308-335` (the `WIKI_SECTIONS.map(...)` block) + add a small expand-state hook.

**Context:** The sidebar currently iterates `sec.conceptIds` flat. We now iterate `sec.nodes`, render each primary, and render its `children` indented inside a collapsible region. A primary with children shows a caret; clicking the caret toggles expansion; clicking the label still navigates. The parent of the active concept auto-expands.

- [ ] **Step 1: Read the current nav render block**

Run: `sed -n '300,340p' src/balanceManager/wiki/WikiShell.tsx`
Expected: confirms the `WIKI_SECTIONS.map((sec) => ...)` block and the `navigate`, `tab`, `effectiveCollapsed`, `CONCEPT_LABELS`, `Icon` symbols in scope.

- [ ] **Step 2: Add expand state + auto-expand near the top of the component**

In `WikiShell.tsx`, find where component state is declared (near the other `useState` calls) and add an expanded-set state plus the import. Add to the imports block:

```tsx
import { WIKI_SECTIONS, parentConceptId } from "./wikiNav.js";
```

(If `WIKI_SECTIONS` is already imported, replace that import line with the one above so `parentConceptId` comes along.)

Add this state + effect with the other hooks (replace `tab` with the actual active-tab variable name confirmed in Step 1 if different):

```tsx
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  // Auto-expand the parent of the active concept so the user always sees where they are.
  React.useEffect(() => {
    const parent = parentConceptId(tab);
    if (parent) {
      setExpanded((prev) => (prev.has(parent) ? prev : new Set(prev).add(parent)));
    }
  }, [tab]);
```

- [ ] **Step 3: Replace the nav render block**

Replace the `{WIKI_SECTIONS.map((sec) => ( ... ))}` block (lines ~308–335) with:

```tsx
{WIKI_SECTIONS.map((sec) => (
  <div key={sec.id} className="flex flex-col gap-1">
    {!effectiveCollapsed ? (
      <div className="wiki-sidebar-label px-2 pt-2 pb-1">{sec.label}</div>
    ) : (
      <div className="mx-2 my-1 h-px" style={{ background: COLORS.border, opacity: 0.4 }} />
    )}

    {sec.nodes.map((node) => {
      const cid = node.conceptId;
      const label = CONCEPT_LABELS[cid] ?? cid;
      const active = tab === cid;
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const isOpen = expanded.has(cid);

      return (
        <div key={cid} className="flex flex-col">
          <div className="flex items-stretch">
            {/* Caret toggle (only when there are children and the rail is expanded) */}
            {hasChildren && !effectiveCollapsed && (
              <button
                type="button"
                aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
                aria-expanded={isOpen}
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(cid)) next.delete(cid);
                    else next.add(cid);
                    return next;
                  })
                }
                className="px-1 flex items-center"
                style={{ color: COLORS.inkSubtle, cursor: "pointer" }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 10,
                    fontSize: 9,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 150ms ease",
                  }}
                >
                  ▶
                </span>
              </button>
            )}

            <button
              onClick={() => navigate({ tab: cid })}
              className={`wiki-nav-link flex-1${active ? " wiki-nav-link--active" : ""}`}
              title={effectiveCollapsed ? label : undefined}
              aria-label={label}
            >
              <Icon iconKey="ui_star" size={16} title="" />
              {!effectiveCollapsed && <span className="flex-1">{label}</span>}
            </button>
          </div>

          {/* Nested secondary concepts */}
          {hasChildren && !effectiveCollapsed && isOpen && (
            <div className="flex flex-col gap-1" style={{ paddingLeft: 18 }}>
              {children.map((childId) => {
                const childLabel = CONCEPT_LABELS[childId] ?? childId;
                const childActive = tab === childId;
                return (
                  <button
                    key={childId}
                    onClick={() => navigate({ tab: childId })}
                    className={`wiki-nav-link${childActive ? " wiki-nav-link--active" : ""}`}
                    aria-label={childLabel}
                  >
                    <Icon iconKey="ui_star" size={13} title="" />
                    <span className="flex-1">{childLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </div>
))}
```

> If `CONCEPT_LABELS` is not already a symbol in this file, derive labels inline with `CONCEPTS.find((c) => c.id === cid)?.label ?? cid` (import `CONCEPTS` from `./concepts.js`). Confirm in Step 1.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors (the Task 3 break is now resolved).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors. (The React Compiler plugin is happy — we used `useState`/`useEffect`, no manual memoization.)

- [ ] **Step 6: Visual smoke (manual, optional but recommended)**

Run: `npm run dev`, open `http://localhost:5173/puzzleDrag2/b/`, confirm: Tiles shows a caret; expanding reveals Categories + Tile discovery indented; clicking a child navigates; landing on a child page auto-expands its parent.

- [ ] **Step 7: Commit**

```bash
git add src/balanceManager/wiki/WikiShell.tsx
git commit -m "wiki: render collapsible primary->secondary nav tree with active auto-expand"
```

---

## Task 5: tile→category & tile→discovery-method forward edges (`relations.ts`)

**Files:**
- Modify: `src/balanceManager/wiki/relations.ts:153-170` (`relationsForTiles`) + imports
- Modify: `src/balanceManager/wiki/relations.test.ts` (add assertions)

**Context:** Adding these two forward edges does double duty: it shows "Category" and "Discovered via" on a tile's page, AND — because `backlinks.ts` inverts every forward edge — it makes category and discovery-method pages list their member tiles under "What links here". The tile→category/discovery mapping lives on `TILE_TYPES_MAP` (keyed by tile id, which equals the `ITEMS` tile key).

- [ ] **Step 1: Add failing assertions to `relations.test.ts`**

Append to `src/balanceManager/wiki/relations.test.ts`:

```ts
import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";
import { backlinksFor, __resetBacklinkIndex } from "./backlinks.js";

describe("relationsForTiles — category + discovery edges", () => {
  // tile_grain_wheat: category "grain", discovery method "chain"
  it("emits a Category group linking to the tile's category", () => {
    const entity = getEntity("tiles", "tile_grain_wheat") as Record<string, unknown>;
    const groups = relationsFor("tiles", "tile_grain_wheat", entity);
    const cat = groups.find((g) => g.title === "Category");
    expect(cat).toBeDefined();
    expect(cat!.links[0]).toMatchObject({ conceptId: "categories", key: "grain" });
  });

  it("emits a Discovered via group linking to the discovery method", () => {
    const entity = getEntity("tiles", "tile_grain_wheat") as Record<string, unknown>;
    const groups = relationsFor("tiles", "tile_grain_wheat", entity);
    const disc = groups.find((g) => g.title === "Discovered via");
    expect(disc).toBeDefined();
    expect(disc!.links[0]).toMatchObject({
      conceptId: "tileDiscoveryMethods",
      key: TILE_TYPES_MAP["tile_grain_wheat"].discovery!.method,
    });
  });

  it("backlinks: the category page lists its member tiles", () => {
    __resetBacklinkIndex();
    const back = backlinksFor("categories", "grain");
    const tilesGroup = back.find((g) => g.title === "Tiles");
    expect(tilesGroup).toBeDefined();
    expect(tilesGroup!.links.some((l) => l.key === "tile_grain_wheat")).toBe(true);
  });

  it("backlinks: the discovery-method page lists tiles discovered that way", () => {
    __resetBacklinkIndex();
    const back = backlinksFor("tileDiscoveryMethods", "chain");
    const tilesGroup = back.find((g) => g.title === "Tiles");
    expect(tilesGroup).toBeDefined();
    expect(tilesGroup!.links.length).toBeGreaterThan(0);
  });
});

describe("relation/backlink consistency invariant", () => {
  // Every forward edge from every entity must round-trip as a backlink on its
  // target. backlinks.ts builds by inverting relationsFor, so this guards
  // against any future forward-edge source that the index forgets to walk.
  it("every forward edge appears in its target's backlinks", () => {
    __resetBacklinkIndex();
    for (const concept of CONCEPTS) {
      for (const entry of concept.getEntries()) {
        const srcKey = (entry as { key: string }).key;
        const srcEntity = getEntity(concept.id, srcKey) as Record<string, unknown> | null;
        for (const group of relationsFor(concept.id, srcKey, srcEntity)) {
          for (const link of group.links) {
            const back = backlinksFor(link.conceptId, link.key);
            const present = back.some((g) =>
              g.links.some((l) => l.conceptId === concept.id && l.key === srcKey),
            );
            expect(
              present,
              `${concept.id}:${srcKey} → ${link.conceptId}:${link.key} missing from backlinks`,
            ).toBe(true);
          }
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/relations.test.ts`
Expected: FAIL — no "Category" / "Discovered via" groups; backlink "Tiles" group absent.

- [ ] **Step 3: Add the edges to `relationsForTiles`**

In `src/balanceManager/wiki/relations.ts`, add the import near line 11:

```ts
import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";
```

Replace the body of `relationsForTiles` (lines 153–170) with:

```ts
function relationsForTiles(
  entityKey: string,
  entity: Record<string, unknown>,
): RelationGroup[] {
  const groups: RelationGroup[] = [];

  // "Produces": entity.next is a resource key (may be null)
  const next = typeof entity.next === "string" ? entity.next : null;
  if (next) {
    const producesGroup = makeGroup("Produces", [resolveLink(conceptForKey(next), next)]);
    if (producesGroup) groups.push(producesGroup);
  }

  // "Category" + "Discovered via": read from the tile-collection catalog
  // (TILE_TYPES_MAP is keyed by tile id, which equals the ITEMS tile key).
  const tileType = (TILE_TYPES_MAP as Record<string, unknown>)[entityKey];
  if (tileType != null && typeof tileType === "object") {
    const tt = tileType as { category?: string; discovery?: { method?: string } };

    if (typeof tt.category === "string") {
      const catGroup = makeGroup("Category", [resolveLink("categories", tt.category)]);
      if (catGroup) groups.push(catGroup);
    }

    const method = tt.discovery?.method ?? "default";
    const discGroup = makeGroup("Discovered via", [resolveLink("tileDiscoveryMethods", method)]);
    if (discGroup) groups.push(discGroup);
  }

  // Item cross-references (Crafted by / Used in recipes) also apply to tiles
  groups.push(...relationsForItem(entityKey));

  return groups;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/relations.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the backlinks suite too (ensure no regression in the cached index)**

Run: `npx vitest run src/balanceManager/wiki/backlinks.test.ts src/balanceManager/wiki/relations.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/balanceManager/wiki/relations.ts src/balanceManager/wiki/relations.test.ts
git commit -m "wiki: add tile->category and tile->discovery-method relation edges"
```

---

## Task 6: Make the discovery-method name a navigable link (`TileUnlock.tsx`)

**Files:**
- Modify: `src/balanceManager/wiki/sections/TileUnlock.tsx:232-236`
- Modify: `src/balanceManager/wiki/sections/TileUnlock.test.tsx` (add assertion)

**Context:** The "Method" stat currently renders the method name as a plain `StatusChip`. We wrap it in a button that navigates to the discovery-method's wiki page via `wikiNavTarget("tileDiscoveryMethods", method)`. `useBalanceNav` and `wikiNavTarget` are already imported in this file.

- [ ] **Step 1: Add a failing test**

Append to `src/balanceManager/wiki/sections/TileUnlock.test.tsx`:

```tsx
describe("TileUnlock — method links to its discovery-method page", () => {
  it("navigates to tileDiscoveryMethods on clicking the method", () => {
    const navigate = vi.fn();
    render(
      <BalanceNavProvider focus={null} navigate={navigate}>
        <TileUnlock tileId="tile_grain_wheat" />
      </BalanceNavProvider>,
    );
    // The method button carries a title of "tileDiscoveryMethods:<id>"
    const methodBtn = screen
      .getAllByRole("button")
      .find((b) => (b.getAttribute("title") ?? "").startsWith("tileDiscoveryMethods:"));
    expect(methodBtn).toBeTruthy();
    fireEvent.click(methodBtn!);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toMatchObject({ tab: "tileDiscoveryMethods" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/sections/TileUnlock.test.tsx`
Expected: FAIL — no button whose title starts with `tileDiscoveryMethods:`.

- [ ] **Step 3: Make the method chip a navigable button**

In `TileUnlock.tsx`, change the component to pull `navigate` from the hook and wrap the method chip. First, inside the `TileUnlock` function body (after `const tile = tileType(tileId); if (tile == null) return null;`, around line 207), add:

```tsx
  const { navigate } = useBalanceNav();
```

Then replace the `<Stat label="Method">...</Stat>` block (lines 232–236) with:

```tsx
        <Stat label="Method">
          <button
            type="button"
            title={`tileDiscoveryMethods:${method}`}
            onClick={() => navigate(wikiNavTarget("tileDiscoveryMethods", method))}
            style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
            className="hover:opacity-80"
          >
            <StatusChip tone="info" size="sm" uppercase title={methodDesc}>
              {methodName}
            </StatusChip>
          </button>
        </Stat>
```

> `method`, `methodName`, `methodDesc` are already computed above (lines 210–213). `useBalanceNav` and `wikiNavTarget` are already imported (lines 28–29).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/sections/TileUnlock.test.tsx`
Expected: PASS (all prior tests + the new one).

- [ ] **Step 5: Lint + typecheck + commit**

Run: `npm run lint && npm run typecheck`
Expected: no errors.

```bash
git add src/balanceManager/wiki/sections/TileUnlock.tsx src/balanceManager/wiki/sections/TileUnlock.test.tsx
git commit -m "wiki: link tile discovery-method name to its wiki page"
```

---

## Task 7: Category fact in the tile infobox (`infoboxFacts.ts`)

**Files:**
- Modify: `src/balanceManager/wiki/infoboxFacts.ts:44-65`
- Modify: `src/balanceManager/wiki/infoboxFacts.test.ts` (add assertion)

**Context:** The infobox shows plain-text facts (the clickable category link is the Task 5 relation). We add a "Category" fact for tiles, read from `TILE_TYPES_MAP[key].category`. This uses the `key` argument (currently `_key`).

- [ ] **Step 1: Add a failing test**

Append to `src/balanceManager/wiki/infoboxFacts.test.ts` (mirror the file's existing import style; `getEntity` is the standard way to fetch the entity there — check the top of the file and reuse its imports):

```ts
import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";

describe("infoboxFacts — tile category", () => {
  it("includes the tile's category as a fact", () => {
    const e = getEntity("tiles", "tile_grain_wheat") as Record<string, unknown>;
    const facts = infoboxFacts("tiles", "tile_grain_wheat", e);
    const cat = facts.find((f) => f.label === "Category");
    expect(cat).toBeDefined();
    expect(cat!.value).toBe(TILE_TYPES_MAP["tile_grain_wheat"].category);
  });
});
```

> If `getEntity` / `infoboxFacts` aren't yet imported in this test file, add them: `import { infoboxFacts } from "./infoboxFacts.js";` and `import { getEntity } from "./conceptEntities.js";`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/infoboxFacts.test.ts`
Expected: FAIL — no "Category" fact.

- [ ] **Step 3: Add the category fact**

In `infoboxFacts.ts`, add the import at the top (after line 22's comment block, before `type Rec`):

```ts
import { TILE_TYPES_MAP } from "../../features/tileCollection/data.js";
```

Change the signature so the key is used — replace `_key: string` with `key: string` in the `infoboxFacts` declaration (line 44):

```ts
export function infoboxFacts(conceptId: string, key: string, e: Rec): Fact[] {
```

Then in the `case "tiles":` block (lines 56–65), add the category fact after `add("Biome", e["biome"]);`:

```ts
    case "tiles": {
      // Fields: kind, biome, value (tile weight), next (resource produced)
      add("Kind", e["kind"]);
      add("Biome", e["biome"]);
      const tt = (TILE_TYPES_MAP as Record<string, { category?: string }>)[key];
      if (tt?.category) add("Category", tt.category);
      if (e["next"] != null) {
        add("Produces", e["next"]);
      }
      add("Value", e["value"]);
      break;
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/infoboxFacts.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors (the renamed `key` param is now used; no unused-var error).

```bash
git add src/balanceManager/wiki/infoboxFacts.ts src/balanceManager/wiki/infoboxFacts.test.ts
git commit -m "wiki: surface tile category in the infobox facts"
```

---

## Task 8: Definition lead section on concept pages (`CategoryPage.tsx`)

**Files:**
- Modify: `src/balanceManager/wiki/CategoryPage.tsx` (insert a "Definition" section between the header and `ConceptFields`)
- Modify: `src/balanceManager/wiki/CategoryPage.test.tsx` (add assertion)

**Context:** "Label, don't split" — the concept page stays one page but leads with an explicit, titled definition. We render the concept blurb prominently under a "Definition" heading plus an auto sentence about how many attributes the concept defines (from the schema). The authored `_index` HTML hook (already loaded as `intro`) stays as the richer-prose slot.

- [ ] **Step 1: Add a failing test**

Open `src/balanceManager/wiki/CategoryPage.test.tsx` to confirm the render harness (it already renders `CategoryPage` inside a `BalanceNavProvider`). Append a test mirroring that harness:

```tsx
describe("CategoryPage — definition lead", () => {
  it("renders a Definition heading with the concept blurb", () => {
    renderPage("tiles"); // use the file's existing render helper name
    const body = document.body.textContent ?? "";
    expect(body).toContain("Definition");
    expect(body).toMatch(/Board pieces/i); // tiles blurb
  });
});
```

> Confirm the helper name (`renderPage` vs inline `render(...)`) at the top of `CategoryPage.test.tsx` and match it. If there's no helper, render inline:
> ```tsx
> render(<BalanceNavProvider focus={null} navigate={vi.fn()}><CategoryPage conceptId="tiles" /></BalanceNavProvider>);
> ```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/CategoryPage.test.tsx`
Expected: FAIL — no "Definition" text.

- [ ] **Step 3: Add the definition section**

In `CategoryPage.tsx`, add the import near line 22:

```tsx
import { schemaForConcept } from "./conceptSchemas.js";
import { describeSchema } from "../schemaDoc.js";
```

Compute an attribute count just after `const entries = concept.getEntries();` (line 52):

```tsx
  // Attribute count for the definition sentence (from the concept's Zod schema).
  const cs = schemaForConcept(conceptId);
  let attrCount = 0;
  if (cs != null) {
    try {
      attrCount = describeSchema(cs.schema).fields.length;
    } catch {
      attrCount = 0;
    }
  }
```

Then insert this section between the header `</div>` (line 91) and the authored-intro block (line 93–98), i.e. immediately after the closing `</div>` of the header `flex flex-col gap-1` group:

```tsx
      {/* ── 1b. Definition lead ───────────────────────────────────────────── */}
      <section id="definition" className="flex flex-col gap-1">
        <div className="wiki-section-heading mb-1">Definition</div>
        <p className="text-[13px] leading-relaxed m-0" style={{ color: COLORS.ink }}>
          {concept.blurb}
          {attrCount > 0 && (
            <>
              {" "}Every <span className="wiki-mono">{concept.label.toLowerCase()}</span> entry
              shares {attrCount} defined {attrCount === 1 ? "attribute" : "attributes"},
              listed in the field reference below.
            </>
          )}
        </p>
      </section>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/CategoryPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

```bash
git add src/balanceManager/wiki/CategoryPage.tsx src/balanceManager/wiki/CategoryPage.test.tsx
git commit -m "wiki: lead concept pages with an explicit Definition section"
```

---

## Task 9: Clickable breadcrumb → concept page (`WikiArticle.tsx`)

**Files:**
- Modify: `src/balanceManager/wiki/WikiArticle.tsx:225-230` (breadcrumb)
- Modify: `src/balanceManager/wiki/WikiArticle.test.tsx` (add assertion)

**Context:** The breadcrumb currently renders `{conceptId}` as plain text. Making it a button that navigates to the concept landing page gives every instance — including a category like *Vegetables* — an up-link to its concept page (the user's "a specific category should have a link to the category page"). `navigate` and `CONCEPTS` (for the label) are available; use the concept label rather than the raw id for display.

- [ ] **Step 1: Add a failing test**

Open `src/balanceManager/wiki/WikiArticle.test.tsx` to confirm its render harness, then append:

```tsx
describe("WikiArticle — breadcrumb links to the concept page", () => {
  it("navigates to the concept landing on clicking the breadcrumb", () => {
    const navigate = vi.fn();
    render(
      <BalanceNavProvider focus={null} navigate={navigate}>
        <WikiArticle conceptId="categories" entityKey="vegetables" onBack={() => {}} />
      </BalanceNavProvider>,
    );
    const crumb = screen
      .getAllByRole("button")
      .find((b) => (b.getAttribute("title") ?? "") === "Go to Categories");
    expect(crumb).toBeTruthy();
    fireEvent.click(crumb!);
    expect(navigate).toHaveBeenCalledWith({ tab: "categories" });
  });
});
```

> Match the file's existing imports (`render`, `screen`, `fireEvent`, `vi`, `BalanceNavProvider`, `WikiArticle`). Add any missing ones.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/WikiArticle.test.tsx`
Expected: FAIL — breadcrumb is a `<span>`, no matching button.

- [ ] **Step 3: Make the breadcrumb a navigable button**

In `WikiArticle.tsx`, add the import near line 23:

```tsx
import { CONCEPTS } from "./concepts.js";
```

Compute the concept label near the other derived values (after line 119's `const entity = ...`):

```tsx
  const conceptLabel = CONCEPTS.find((c) => c.id === conceptId)?.label ?? conceptId;
```

Replace the breadcrumb span (lines 225–230):

```tsx
          {/* Breadcrumb */}
          <span
            className="wiki-breadcrumb"
          >
            {conceptId}
          </span>
```

with:

```tsx
          {/* Breadcrumb — links up to the concept landing page */}
          <button
            type="button"
            title={`Go to ${conceptLabel}`}
            onClick={() => navigate({ tab: conceptId })}
            className="wiki-breadcrumb hover:opacity-80"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            {conceptLabel}
          </button>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/WikiArticle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

```bash
git add src/balanceManager/wiki/WikiArticle.tsx src/balanceManager/wiki/WikiArticle.test.tsx
git commit -m "wiki: make the article breadcrumb link to its concept page"
```

---

## Task 10: Prominent member-tile list on category & discovery-method pages

**Files:**
- Create: `src/balanceManager/wiki/memberTiles.ts`
- Create: `src/balanceManager/wiki/memberTiles.test.ts`
- Create: `src/balanceManager/wiki/sections/MemberTiles.jsx`
- Modify: `src/balanceManager/wiki/WikiArticle.tsx` (render `MemberTiles` for the two grouping concepts + TOC entry)

**Context:** Backlinks already list member tiles at the bottom of the page. This task adds a *prominent, card-grid* member list near the top of category and discovery-method instance pages — the headline "go to a category, see its tiles" experience — using the same `EntryGrid` cards as the Tiles concept page. The pure `memberTiles.ts` resolver is unit-tested; the component is a thin renderer.

- [ ] **Step 1: Write the failing test for the resolver**

Create `src/balanceManager/wiki/memberTiles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { memberTilesFor } from "./memberTiles.js";

describe("memberTilesFor", () => {
  it("lists tiles in a tile category", () => {
    const tiles = memberTilesFor("categories", "grain");
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((t) => typeof t.key === "string" && typeof t.name === "string")).toBe(true);
    expect(tiles.some((t) => t.key === "tile_grain_wheat")).toBe(true);
  });

  it("lists tiles discovered via a given method", () => {
    const tiles = memberTilesFor("tileDiscoveryMethods", "chain");
    expect(tiles.length).toBeGreaterThan(0);
    // tile_grain_wheat uses chain discovery
    expect(tiles.some((t) => t.key === "tile_grain_wheat")).toBe(true);
  });

  it("returns [] for a zone-only category (no tile members)", () => {
    // A zone category that isn't a tile category yields no tile members.
    expect(memberTilesFor("categories", "definitely_not_a_tile_category")).toEqual([]);
  });

  it("returns [] for concepts that don't group tiles", () => {
    expect(memberTilesFor("recipes", "rec_bread")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/memberTiles.test.ts`
Expected: FAIL — `Cannot find module './memberTiles.js'`.

- [ ] **Step 3: Create the resolver**

Create `src/balanceManager/wiki/memberTiles.ts`:

```ts
/**
 * memberTiles.ts — Resolve the tiles that belong to a grouping page.
 *
 *   - categories(<cat>)            → tiles whose tile-type category === <cat>
 *   - tileDiscoveryMethods(<id>)   → tiles whose discovery.method === <id>
 *
 * Returns lightweight entries ({ key, name, iconKey }) suitable for EntryGrid.
 * Pure module — no React, no DOM.
 */

import { ITEMS } from "../../constants.js";
import { TILE_TYPES, TILE_TYPES_BY_CATEGORY } from "../../features/tileCollection/data.js";

export interface MemberTile {
  key: string;
  name: string;
  iconKey: string;
}

function toMember(tileId: string): MemberTile {
  const item = (ITEMS as Record<string, { label?: string } | undefined>)[tileId];
  return { key: tileId, name: item?.label ?? tileId, iconKey: tileId };
}

export function memberTilesFor(conceptId: string, key: string): MemberTile[] {
  if (conceptId === "categories") {
    const byCat = (TILE_TYPES_BY_CATEGORY as Record<string, Array<{ id: string }>>)[key];
    if (!Array.isArray(byCat)) return [];
    return byCat.map((t) => toMember(t.id));
  }

  if (conceptId === "tileDiscoveryMethods") {
    return (TILE_TYPES as Array<{ id: string; discovery?: { method?: string } }>)
      .filter((t) => (t.discovery?.method ?? "default") === key)
      .map((t) => toMember(t.id));
  }

  return [];
}
```

- [ ] **Step 4: Run to verify the resolver test passes**

Run: `npx vitest run src/balanceManager/wiki/memberTiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the `MemberTiles` section component**

Create `src/balanceManager/wiki/sections/MemberTiles.jsx`:

```jsx
/**
 * MemberTiles.jsx — Prominent member-tile grid for grouping pages (a tile
 * category, or a discovery method). Renders the same EntryGrid cards as the
 * Tiles concept page so the browse experience matches.
 *
 * Returns null when the page groups no tiles (e.g. a zone-only category).
 */

import React from "react";
import EntryGrid from "../EntryGrid.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { memberTilesFor } from "../memberTiles.js";

/**
 * @param {{ conceptId: string, entityKey: string }} props
 */
export default function MemberTiles({ conceptId, entityKey }) {
  const { navigate } = useBalanceNav();
  const tiles = memberTilesFor(conceptId, entityKey);
  if (tiles.length === 0) return null;

  return (
    <section id="member-tiles" className="flex flex-col gap-2">
      <div className="wiki-section-heading">Tiles ({tiles.length})</div>
      <EntryGrid
        entries={tiles}
        onSelect={(key) => navigate(wikiNavTarget("tiles", key))}
      />
    </section>
  );
}

/** Cheap precheck for TOC gating. */
export function hasMemberTiles(conceptId, entityKey) {
  return memberTilesFor(conceptId, entityKey).length > 0;
}
```

> Verify `EntryGrid`'s `entries` prop shape accepts `{ key, name, iconKey }` — check `src/balanceManager/wiki/EntryGrid.jsx` `WikiEntry` type. The `itemsOfKind` factory in `concepts.ts` produces exactly this shape, so it matches.

- [ ] **Step 6: Render `MemberTiles` in `WikiArticle.tsx`**

Add the import near line 44:

```tsx
import MemberTiles, { hasMemberTiles } from "./sections/MemberTiles.jsx";
```

Add a show-flag near the other `show*` flags (after line 195):

```tsx
  const showMemberTiles =
    (conceptId === "categories" || conceptId === "tileDiscoveryMethods") &&
    hasMemberTiles(conceptId, entityKey);
```

Add a TOC entry — insert into the `tocItems` array (after the `overview` entry, line 199):

```tsx
    ...(showMemberTiles ? [{ id: "member-tiles", label: "Tiles" }] : []),
```

Render the section just after the lede paragraph (after the `</p>` closing the lede at line 275):

```tsx
          {/* Member tiles (category / discovery-method pages) */}
          {showMemberTiles && <MemberTiles conceptId={conceptId} entityKey={entityKey} />}
```

- [ ] **Step 7: Add a render test for the section in a category article**

Append to `src/balanceManager/wiki/WikiArticle.test.tsx`:

```tsx
describe("WikiArticle — member tiles on a category page", () => {
  it("lists member tiles for a tile category", () => {
    render(
      <BalanceNavProvider focus={null} navigate={vi.fn()}>
        <WikiArticle conceptId="categories" entityKey="grain" onBack={() => {}} />
      </BalanceNavProvider>,
    );
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Tiles \(\d+\)/);
    expect(body).toMatch(/wheat/i);
  });
});
```

- [ ] **Step 8: Run the WikiArticle + memberTiles suites**

Run: `npx vitest run src/balanceManager/wiki/WikiArticle.test.tsx src/balanceManager/wiki/memberTiles.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

```bash
git add src/balanceManager/wiki/memberTiles.ts src/balanceManager/wiki/memberTiles.test.ts src/balanceManager/wiki/sections/MemberTiles.jsx src/balanceManager/wiki/WikiArticle.tsx src/balanceManager/wiki/WikiArticle.test.tsx
git commit -m "wiki: show prominent member-tile grid on category and discovery-method pages"
```

---

## Task 11: Full verification + visual goldens

**Files:** none (verification + golden refresh only)

**Context:** All UI surfaces in `/b/` changed, so the visual suite must run. This task gates the whole feature.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: PASS (all suites, including the new pageKind / memberTiles / relations / wikiNav tests).

- [ ] **Step 2: Lint + typecheck + action types**

Run: `npm run lint && npm run typecheck && npm run typecheck:test-files`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds (the `/b/` bundle compiles).

- [ ] **Step 4: Run the visual suite**

Run: `npm run test:visual`
Expected: Either PASS, or diffs limited to the Dev Panel wiki surfaces this feature changed (nav tree, badges, definition section, member tiles). Inspect every diff.

- [ ] **Step 5: Refresh goldens IF (and only if) diffs are intentional**

If the only diffs are the intended `/b/` wiki changes:

Run: `npm run test:visual:update`
Then re-run `npm run test:visual` to confirm clean.

If any diff is in the game (`/`) or unrelated, STOP — that's a regression to fix before continuing.

- [ ] **Step 6: Commit goldens (if refreshed)**

```bash
git add tests/ src/visualTesting/ 2>/dev/null; git add -A
git commit -m "wiki: refresh visual goldens for nav tree, page-kind badges, member tiles"
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin claude/determined-mccarthy-Y97zm
```

Then open a **non-draft** PR (per CLAUDE.md workflow) against `main`. Use the `pre-pr-check` skill to generate the PR body. After it exists, merge with a **merge commit** (not squash) once approved.

---

## Self-Review notes (resolved during planning)

- **Member lists "in addition to What links here":** The spec mentioned both. Backlinks already provide the reverse index for free (Task 5); Task 10 adds the *prominent, card-grid* version near the top. Both are intentional and serve different surfaces (browse vs. reference index) — not duplication to remove.
- **Up-link "category → category page":** Resolved via the clickable breadcrumb (Task 9), which generalizes to every instance, rather than a bespoke per-concept link.
- **`settlementBiomes` / `seasons` / `keepers` placement:** The old flat layout had `settlementBiomes` + `categories` under Board and `keepers` under Progression. The new tree nests `settlementBiomes` + `keepers` under Zones and `categories` + `tileDiscoveryMethods` under Tiles, and moves `seasons` to Board. The `wikiNav.test.ts` coverage test guarantees all 22 concept ids still appear exactly once.
- **Badge tone names:** Task 1 Step 6 verifies the `StatusChip` tone strings before relying on them.
