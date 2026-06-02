# Board Kinds Wiki Concept — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `boardKinds` Game Wiki concept (Farm · Mine · Harbor) whose articles document each board kind's tile roster, dangers, seasons & turns, and the map zones that use it — and fold the structured farm hazards (Fire/Wolves/Rats) into the existing `hazards` concept so every Dangers link resolves.

**Architecture:** The wiki is a live, schema-driven, read-only docs system under `src/balanceManager/wiki/`. A concept is registered across a handful of small modules (`concepts.ts`, `wikiNav.ts`, `conceptEntities.ts`, `conceptSchemas.ts`, `lede.ts`, `status.ts`, `infoboxFacts.ts`, `relations.ts`) and rendered by the unified `WikiArticle.tsx` template. We add `boardKinds` sourced from `BIOMES` (live-config-only, no Zod schema) plus one new section component `BoardKindDetail.tsx` (modeled on `ZoneDetail.tsx`) and three authored HTML bodies. Backlinks are derived automatically from forward relations — no edit needed.

**Tech Stack:** TypeScript + React (Dev Panel `/b/`, Phaser-free), Vitest, Vite `import.meta.glob`, ESLint, Playwright (visual).

**Spec:** `docs/superpowers/specs/2026-06-02-board-kinds-wiki-design.html`

**Conventions for every task:**
- Run from repo root `/home/user/puzzleDrag2`.
- Tests: Vitest. Run a single file with `npx vitest run <path>`.
- Final gates before PR: `npm run lint`, `npm run typecheck`, `npm test`.
- These wiki modules are `.ts`/`.tsx` and strict-typed. Mirror the existing style (no `any`; use `Record<string, unknown>` casts as the surrounding code does).

---

### Task 1: Surface farm hazards in the `hazards` concept

Farm hazards (`fire`, `wolf`, `rats`) live in `src/features/farm/hazards.ts` as `FARM_HAZARD_META` but are not wiki entities. Add them so the Dangers section (Task 6) can link to real hazard pages. Textures `hazard_fire`, `hazard_wolf`, `hazard_rats` already exist.

**Files:**
- Modify: `src/balanceManager/wiki/concepts.ts` (the `hazardEntries()` function, ~lines 66–72)
- Modify: `src/balanceManager/wiki/conceptEntities.ts` (the `case "hazards"`, ~lines 127–129)
- Modify: `src/balanceManager/wiki/status.ts` (`ENTITY_STATUS.hazards`, ~lines 90–96; and the `hazards` rationale comment)
- Test: `src/balanceManager/wiki/__tests__/farmHazards.test.ts` (create; if `__tests__` dir absent, place beside other wiki tests — confirm location with `ls src/balanceManager/wiki/*.test.* src/balanceManager/wiki/__tests__/ 2>/dev/null`)

- [ ] **Step 1: Write the failing test**

Create the test file:

```ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "../concepts.js";
import { getEntity } from "../conceptEntities.js";
import { statusForEntity } from "../status.js";

const hazardEntries = () =>
  CONCEPTS.find((c) => c.id === "hazards")!.getEntries() as Array<{ key: string }>;

describe("farm hazards as wiki entities", () => {
  it("hazardEntries includes fire, wolf, rats alongside mine hazards", () => {
    const keys = hazardEntries().map((e) => e.key);
    expect(keys).toEqual(expect.arrayContaining(["cave_in", "gas_vent", "lava", "mole", "fire", "wolf", "rats"]));
  });

  it("getEntity resolves a farm hazard with its meta fields", () => {
    const fire = getEntity("hazards", "fire");
    expect(fire).not.toBeNull();
    expect(fire!.name).toBe("Fire");
    expect(typeof fire!.clearInstruction).toBe("string");
  });

  it("fire is flag-gated PARTIAL; wolves/rats are WIRED", () => {
    expect(statusForEntity("hazards", "fire")).toBe("PARTIAL");
    expect(statusForEntity("hazards", "wolf")).toBe("WIRED");
    expect(statusForEntity("hazards", "rats")).toBe("WIRED");
    expect(statusForEntity("hazards", "cave_in")).toBe("WIRED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/__tests__/farmHazards.test.ts`
Expected: FAIL — farm keys missing from entries, `getEntity("hazards","fire")` is null.

- [ ] **Step 3: Extend `hazardEntries()` in `concepts.ts`**

Add the import near the other feature-data imports (top of file, after line 14):

```ts
import { FARM_HAZARD_META } from "../../features/farm/hazards.js";
```

Replace the `hazardEntries` function (currently mine-only) with one that appends farm hazards:

```ts
function hazardEntries() {
  const mine = HAZARDS.map((h) => ({
    key: h.id,
    name: h.name,
    iconKey: `hazard_${h.id}`,
  }));
  const farm = Object.entries(FARM_HAZARD_META).map(([key, meta]) => ({
    key,
    name: meta.name,
    iconKey: `hazard_${key}`,
  }));
  return [...mine, ...farm].sort(byName);
}
```

Update the concept blurb (`id: "hazards"`, ~line 311) from "Board threats that spawn in the Mine biome." to:

```ts
    blurb: "Board threats — mine cave-ins and gas, farm fire/wolves/rats.",
```

- [ ] **Step 4: Extend the `hazards` resolver in `conceptEntities.ts`**

Add the import (after the `HAZARDS` import, ~line 18):

```ts
import { FARM_HAZARD_META } from "../../features/farm/hazards.js";
```

Replace the `case "hazards"` block:

```ts
    case "hazards": {
      const mine = findById(HAZARDS, key);
      if (mine != null) return mine;
      const farm = FARM_HAZARD_META[key];
      return farm != null ? { id: key, ...farm } : null;
    }
```

- [ ] **Step 5: Update status overrides in `status.ts`**

Replace the `ENTITY_STATUS.hazards` object so farm hazards carry explicit statuses:

```ts
  hazards: {
    // Mine hazards (cave_in/gas_vent/lava/mole) are fully wired.
    cave_in: "WIRED",
    gas_vent: "WIRED",
    lava: "WIRED",
    mole: "WIRED",
    // Farm hazards: wolves & rats run in normal play; fire is gated off behind
    // FIRE_HAZARD_ENABLED = false in src/featureFlags.ts.
    wolf: "WIRED",
    rats: "WIRED",
    fire: "PARTIAL",
  },
```

The concept-level `hazards: "PARTIAL"` in `CONCEPT_STATUS` can stay (per-entity overrides win for the catalogued ones). Update its rationale comment to note farm hazards are now catalogued.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/__tests__/farmHazards.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/balanceManager/wiki/concepts.ts src/balanceManager/wiki/conceptEntities.ts src/balanceManager/wiki/status.ts src/balanceManager/wiki/__tests__/farmHazards.test.ts
git commit -m "feat(wiki): catalog farm hazards (fire/wolves/rats) as hazard entities"
```

---

### Task 2: Register the `boardKinds` concept

Add the concept, its entries, nav placement, entity resolver, and a null schema mapping.

**Files:**
- Modify: `src/balanceManager/wiki/concepts.ts` (add generator + descriptor)
- Modify: `src/balanceManager/wiki/wikiNav.ts` (add to `board` section)
- Modify: `src/balanceManager/wiki/conceptEntities.ts` (add `case "boardKinds"`)
- Modify: `src/balanceManager/wiki/conceptSchemas.ts` (add `case "boardKinds": return null`)
- Test: `src/balanceManager/wiki/__tests__/boardKinds.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "../concepts.js";
import { getEntity } from "../conceptEntities.js";
import { WIKI_SECTIONS } from "../wikiNav.js";
import { schemaForConcept } from "../conceptSchemas.js";

const concept = () => CONCEPTS.find((c) => c.id === "boardKinds");

describe("boardKinds concept registration", () => {
  it("is a registered concept", () => {
    expect(concept()).toBeDefined();
  });

  it("has exactly three entries: farm, mine, fish", () => {
    const keys = concept()!.getEntries().map((e) => (e as { key: string }).key).sort();
    expect(keys).toEqual(["farm", "fish", "mine"]);
  });

  it("entry display names match BIOMES (Harbor for fish)", () => {
    const byKey = Object.fromEntries(
      concept()!.getEntries().map((e) => [(e as { key: string }).key, (e as { name: string }).name]),
    );
    expect(byKey.farm).toBe("Farm");
    expect(byKey.mine).toBe("Mine");
    expect(byKey.fish).toBe("Harbor");
  });

  it("getEntity resolves a board kind from BIOMES", () => {
    const mine = getEntity("boardKinds", "mine");
    expect(mine).not.toBeNull();
    expect(mine!.name).toBe("Mine");
    expect(Array.isArray(mine!.tiles)).toBe(true);
  });

  it("appears in exactly one nav section (board)", () => {
    const sections = WIKI_SECTIONS.filter((s) => s.conceptIds.includes("boardKinds"));
    expect(sections.map((s) => s.id)).toEqual(["board"]);
  });

  it("has no Zod schema (live-config-only)", () => {
    expect(schemaForConcept("boardKinds")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: FAIL — concept undefined.

- [ ] **Step 3: Add the entries generator + descriptor in `concepts.ts`**

`BIOMES` is already imported? Confirm — `concepts.ts` imports from `../../constants.js`. Add `BIOMES` to that import list (line 13).

Add this generator near the other entry functions (e.g. after `settlementBiomeEntries`):

```ts
// Display order: Farm, Mine, Harbor (not alphabetical — matches game progression).
const BOARD_KIND_ORDER = ["farm", "mine", "fish"] as const;

function boardKindEntries() {
  return BOARD_KIND_ORDER.filter((k) => (BIOMES as Record<string, unknown>)[k] != null).map(
    (k) => ({
      key: k,
      name: String((BIOMES as Record<string, { name?: string }>)[k].name ?? k),
    }),
  );
}
```

Add the descriptor to the `CONCEPTS` array. Place it right after the `settlementBiomes` descriptor (so it sits in the Board group):

```ts
  {
    id: "boardKinds",
    label: "Board kinds",
    blurb: "Farm, Mine, Harbor — the three board types and their rules.",
    getEntries: boardKindEntries,
  },
```

> Note: `boardKindEntries` is NOT sorted by name (intentional progression order). That's fine — `byName` is only a helper, not required.

- [ ] **Step 4: Add to the `board` nav section in `wikiNav.ts`**

Change line 15 from:

```ts
  { id: "board",   label: "Board",   conceptIds: ["tiles", "zones", "settlementBiomes", "categories"] },
```

to:

```ts
  { id: "board",   label: "Board",   conceptIds: ["tiles", "boardKinds", "zones", "settlementBiomes", "categories"] },
```

- [ ] **Step 5: Add the resolver in `conceptEntities.ts`**

Add `BIOMES` to the `../../constants.js` import (line 12). Add a case (e.g. after `case "zones"`):

```ts
    case "boardKinds": {
      return toRecord((BIOMES as Record<string, unknown>)[key]);
    }
```

- [ ] **Step 6: Add the null schema in `conceptSchemas.ts`**

In the `switch`, under the live-config-only group (with `categories`, `hazards`, …):

```ts
    case "boardKinds":
```

(add the bare `case` label above the existing `return null;` for that group).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: PASS (6 tests).

Also run the nav invariant test to confirm exactly-once coverage still holds:

Run: `npx vitest run src/balanceManager/wiki/wikiNav.test.ts` (path: confirm with `ls src/balanceManager/wiki/wikiNav.test.*`)
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/balanceManager/wiki/concepts.ts src/balanceManager/wiki/wikiNav.ts src/balanceManager/wiki/conceptEntities.ts src/balanceManager/wiki/conceptSchemas.ts src/balanceManager/wiki/__tests__/boardKinds.test.ts
git commit -m "feat(wiki): register boardKinds concept (Farm/Mine/Harbor) over BIOMES"
```

---

### Task 3: Lede + facts for board kinds

Give board-kind articles a one-sentence lede and 2–4 infobox facts.

**Files:**
- Modify: `src/balanceManager/wiki/lede.ts` (add `case "boardKinds"`)
- Modify: `src/balanceManager/wiki/infoboxFacts.ts` (add `case "boardKinds"`)
- Test: extend `src/balanceManager/wiki/__tests__/boardKinds.test.ts`

- [ ] **Step 1: Write the failing test (append to boardKinds.test.ts)**

```ts
import { ledeFor } from "../lede.js";
import { infoboxFacts } from "../infoboxFacts.js";

describe("boardKinds lede + facts", () => {
  it("lede names the board kind and mentions tiles", () => {
    const mine = getEntity("boardKinds", "mine");
    const s = ledeFor("boardKinds", "mine", mine);
    expect(s).toMatch(/Mine/);
    expect(s).toMatch(/board kind/i);
    expect(s.endsWith(".")).toBe(true);
  });

  it("facts include a tile-species count", () => {
    const mine = getEntity("boardKinds", "mine");
    const facts = infoboxFacts("boardKinds", "mine", mine);
    const labels = facts.map((f) => f.label);
    expect(labels).toContain("Tile species");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: FAIL — lede falls to default `"Mine."`, no "Tile species" fact.

- [ ] **Step 3: Add the lede case in `lede.ts`**

Add before the `default:` case in the `switch`:

```ts
    case "boardKinds": {
      const tiles = Array.isArray(entity?.tiles) ? (entity!.tiles as unknown[]).length : 0;
      s = `${name} is one of the game's board kinds`;
      if (tiles > 0) s += `, drawing from ${plural(tiles, "tile species")}`;
      s += ".";
      break;
    }
```

> `plural(2, "tile species")` → "2 tile speciess" is wrong. Use a literal instead:

```ts
    case "boardKinds": {
      const tiles = Array.isArray(entity?.tiles) ? (entity!.tiles as unknown[]).length : 0;
      s = `${name} is one of the game's board kinds`;
      if (tiles > 0) s += `, drawing from ${tiles} tile species`;
      s += ".";
      break;
    }
```

- [ ] **Step 4: Add the facts case in `infoboxFacts.ts`**

Add before the `default:` case:

```ts
    case "boardKinds": {
      const tiles = e["tiles"];
      if (Array.isArray(tiles)) add("Tile species", tiles.length);
      const resources = e["resources"];
      if (Array.isArray(resources)) add("Resources", resources.length);
      break;
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/balanceManager/wiki/lede.ts src/balanceManager/wiki/infoboxFacts.ts src/balanceManager/wiki/__tests__/boardKinds.test.ts
git commit -m "feat(wiki): board-kind lede + infobox facts"
```

---

### Task 4: Forward relations for board kinds

Emit forward links from a board kind to its tiles, dangers (hazards), and zones. Backlinks (tile/zone/hazard → board kind) are derived automatically by `backlinks.ts` once these forward relations exist — no backlinks edit needed.

**Files:**
- Modify: `src/balanceManager/wiki/relations.ts` (add a `relationsForBoardKinds` computer + a `case "boardKinds"` in the `relationsFor` dispatcher)
- Test: extend `src/balanceManager/wiki/__tests__/boardKinds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { relationsFor } from "../relations.js";
import { backlinksFor, __resetBacklinkIndex } from "../backlinks.js";

describe("boardKinds relations", () => {
  it("links to its tiles and its dangers", () => {
    const mine = getEntity("boardKinds", "mine");
    const groups = relationsFor("boardKinds", "mine", mine);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain("Tiles");
    expect(titles).toContain("Dangers");
    // mine dangers include cave_in
    const dangers = groups.find((g) => g.title === "Dangers")!.links.map((l) => l.key);
    expect(dangers).toContain("cave_in");
  });

  it("links to the zones that use it", () => {
    const mine = getEntity("boardKinds", "mine");
    const groups = relationsFor("boardKinds", "mine", mine);
    expect(groups.map((g) => g.title)).toContain("Zones");
  });

  it("a board-kind tile back-links to its board kind", () => {
    __resetBacklinkIndex();
    const mine = getEntity("boardKinds", "mine");
    const firstTileKey = (mine!.tiles as Array<{ key: string }>)[0].key;
    const back = backlinksFor("tiles", firstTileKey);
    const hasBoardKind = back.some((g) => g.links.some((l) => l.conceptId === "boardKinds" && l.key === "mine"));
    expect(hasBoardKind).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: FAIL — no relation groups for boardKinds.

- [ ] **Step 3: Add the relations computer in `relations.ts`**

Add imports near the top (after existing imports):

```ts
import { ZONES } from "../../features/zones/data.js";
```

Add a danger-mapping helper + the computer (place beside the other per-concept computers, e.g. after `relationsForZones`):

```ts
/**
 * Hazard ids that threaten a given board kind. Mine hazards live in the mine
 * HAZARDS array; farm hazards in FARM_HAZARD_META; Harbor has none (tides are a
 * mechanic, documented in the authored body). Validated via resolveLink so any
 * stale id is dropped.
 */
const BOARD_KIND_DANGERS: Record<string, string[]> = {
  mine: ["cave_in", "gas_vent", "lava", "mole"],
  farm: ["fire", "wolf", "rats"],
  fish: [],
};

function relationsForBoardKinds(key: string, entity: Record<string, unknown>): RelationGroup[] {
  const tiles = Array.isArray(entity.tiles) ? (entity.tiles as Array<{ key?: unknown }>) : [];
  const tileGroup = makeGroup(
    "Tiles",
    tiles.map((t) => resolveLink("tiles", String(t.key ?? ""))),
  );

  const dangerGroup = makeGroup(
    "Dangers",
    (BOARD_KIND_DANGERS[key] ?? []).map((h) => resolveLink("hazards", h)),
  );

  // Zones that enable this board kind, via hasFarm / hasMine / hasWater.
  const flag = key === "farm" ? "hasFarm" : key === "mine" ? "hasMine" : "hasWater";
  const zoneLinks = Object.values(ZONES as Record<string, Record<string, unknown>>)
    .filter((z) => z[flag] === true)
    .map((z) => resolveLink("zones", String(z.id)));
  const zoneGroup = makeGroup("Zones", zoneLinks);

  return [tileGroup, dangerGroup, zoneGroup].filter((g): g is RelationGroup => g !== null);
}
```

- [ ] **Step 4: Wire it into the `relationsFor` dispatcher**

In the `relationsFor` switch (~line 256), add:

```ts
    case "boardKinds":
      return entity ? relationsForBoardKinds(key, entity) : [];
```

(Confirm the dispatcher's parameter names — it is `relationsFor(conceptId, key, entity)`. Match the existing cases' call style; some pass `entity` typed as `Record<string, unknown>`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKinds.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/balanceManager/wiki/relations.ts src/balanceManager/wiki/__tests__/boardKinds.test.ts
git commit -m "feat(wiki): board-kind relations (tiles/dangers/zones) + auto backlinks"
```

---

### Task 5: `BoardKindDetail` section component

The single new rendering unit: four blocks (tile roster, dangers, seasons & turns, zones using it). Modeled on `ZoneDetail.tsx`. React Compiler is on — no manual `useMemo`/`useCallback`.

**Files:**
- Create: `src/balanceManager/wiki/sections/BoardKindDetail.tsx`
- Test: `src/balanceManager/wiki/sections/__tests__/BoardKindDetail.test.tsx` (create; confirm sibling test dir with `ls src/balanceManager/wiki/sections/`)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getEntity } from "../../conceptEntities.js";
import { BoardKindDetail, hasBoardKindDetail } from "../BoardKindDetail.jsx";

describe("BoardKindDetail", () => {
  it("hasBoardKindDetail is true for a board kind with tiles", () => {
    expect(hasBoardKindDetail(getEntity("boardKinds", "mine") as never)).toBe(true);
  });

  it("renders the four block headings for mine", () => {
    render(<BoardKindDetail boardKindKey="mine" boardKind={getEntity("boardKinds", "mine") as never} />);
    expect(screen.getByText(/Tile roster/i)).toBeTruthy();
    expect(screen.getByText(/Dangers/i)).toBeTruthy();
    expect(screen.getByText(/Seasons/i)).toBeTruthy();
    expect(screen.getByText(/Zones/i)).toBeTruthy();
  });

  it("shows mine hazards for mine, not farm hazards", () => {
    render(<BoardKindDetail boardKindKey="mine" boardKind={getEntity("boardKinds", "mine") as never} />);
    expect(screen.getByText(/Cave-In/i)).toBeTruthy();
    expect(screen.queryByText(/Wolves/i)).toBeNull();
  });

  it("harbor renders a graceful no-hazards note", () => {
    render(<BoardKindDetail boardKindKey="fish" boardKind={getEntity("boardKinds", "fish") as never} />);
    expect(screen.getByText(/no board hazards/i)).toBeTruthy();
  });
});
```

> Confirm the test renderer in use: check an existing section test (e.g. `ls src/balanceManager/wiki/sections/*.test.* src/balanceManager/wiki/*.test.*` and open one) to match the exact `render`/`screen` import path and any jsdom setup. Mirror that existing test's imports rather than the above if they differ.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/sections/__tests__/BoardKindDetail.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `BoardKindDetail.tsx`**

```tsx
/**
 * BoardKindDetail.tsx — "Tiles, dangers & seasons" section for board-kind articles.
 *
 * Four blocks rendered from live config (BIOMES + HAZARDS/FARM_HAZARD_META +
 * SEASONS + ZONES):
 *   1. Tile roster   — icon chips, each tile linking to its tile article
 *   2. Dangers       — hazard chips linking to hazard articles (none for Harbor)
 *   3. Seasons & turns — the four SEASONS + the per-session turn-budget model
 *   4. Zones using it — map zones whose hasFarm/hasMine/hasWater is set
 *
 * Read-only. React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { SEASONS } from "../../../constants.js";
import { HAZARDS } from "../../../features/mine/hazards.js";
import { FARM_HAZARD_META } from "../../../features/farm/hazards.js";
import { ZONES } from "../../../features/zones/data.js";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";

interface BoardKindLike {
  name?: string;
  tiles?: Array<{ key: string; label?: string; next?: string | null }>;
}

const DANGER_KEYS: Record<string, string[]> = {
  mine: ["cave_in", "gas_vent", "lava", "mole"],
  farm: ["fire", "wolf", "rats"],
  fish: [],
};

function hazardName(key: string): string {
  const mine = HAZARDS.find((h) => h.id === key);
  if (mine) return mine.name;
  return FARM_HAZARD_META[key]?.name ?? key;
}

/** True when this entity is a board kind worth rendering a detail section for. */
export function hasBoardKindDetail(entity: BoardKindLike | null | undefined): boolean {
  return !!entity && Array.isArray(entity.tiles) && entity.tiles.length > 0;
}

const heading = (text: string) => (
  <div className="wiki-section-heading mb-2" style={{ color: COLORS.ink }}>{text}</div>
);

export function BoardKindDetail({
  boardKindKey,
  boardKind,
}: {
  boardKindKey: string;
  boardKind: BoardKindLike;
}) {
  const { navigate } = useBalanceNav();
  const tiles = Array.isArray(boardKind.tiles) ? boardKind.tiles : [];
  const dangers = DANGER_KEYS[boardKindKey] ?? [];
  const zoneFlag = boardKindKey === "farm" ? "hasFarm" : boardKindKey === "mine" ? "hasMine" : "hasWater";
  const zones = Object.values(ZONES as Record<string, Record<string, unknown>>).filter(
    (z) => z[zoneFlag] === true,
  );

  const chip = (onClick: () => void, iconKey: string | null, label: string, key: string) => (
    <button
      key={key}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px",
        background: COLORS.parchment, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, cursor: "pointer", fontSize: 12, color: COLORS.ink,
      }}
    >
      {iconKey != null && <Icon iconKey={iconKey} size={16} style={{ verticalAlign: "middle" }} />}
      <span>{label}</span>
    </button>
  );

  return (
    <section id="board-kind-detail" className="flex flex-col gap-4">
      {/* 1. Tile roster */}
      <div>
        {heading("Tile roster")}
        <div className="flex flex-wrap gap-1.5">
          {tiles.map((t) =>
            chip(
              () => navigate(wikiNavTarget("tiles", t.key)),
              t.key,
              t.next ? `${t.label ?? t.key} → ${t.next}` : (t.label ?? t.key),
              t.key,
            ),
          )}
        </div>
      </div>

      {/* 2. Dangers */}
      <div>
        {heading("Dangers")}
        {dangers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dangers.map((h) =>
              chip(() => navigate(wikiNavTarget("hazards", h)), `hazard_${h}`, hazardName(h), h),
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
            This board has no board hazards — see the notes below for its tides and pearls.
          </p>
        )}
      </div>

      {/* 3. Seasons & turns */}
      <div>
        {heading("Seasons & turns")}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SEASONS.map((s) => (
            <span
              key={s.name}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px",
                background: COLORS.parchment, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12,
              }}
            >
              <Icon iconKey={s.look.iconKey} size={16} style={{ verticalAlign: "middle" }} />
              <span>{s.name}</span>
            </span>
          ))}
        </div>
        <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
          A run plays through all four seasons. Each session's turn budget (the zone's <code>baseTurns</code>)
          is split evenly across the seasons, so the active season advances as turns are spent.
        </p>
      </div>

      {/* 4. Zones using it */}
      <div>
        {heading("Zones using this board")}
        {zones.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z) =>
              chip(
                () => navigate(wikiNavTarget("zones", String(z.id))),
                null,
                String(z.name ?? z.id),
                String(z.id),
              ),
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: COLORS.inkSubtle, margin: 0 }}>
            No map zones currently enable this board.
          </p>
        )}
      </div>
    </section>
  );
}
```

> Verify these import paths against the repo before finalizing: `wikiNavTarget` from `../WikiLinkButton.jsx`, `useBalanceNav` from `../../balanceNav.jsx`, `COLORS` from `../../shared.jsx`, `Icon` from `../../../ui/Icon.jsx`. `ZoneDetail.tsx` uses the same `Icon`/`COLORS` paths; `WikiArticle.tsx` imports `useBalanceNav` and `wikiNavTarget` — copy those exact specifiers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/sections/__tests__/BoardKindDetail.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/balanceManager/wiki/sections/BoardKindDetail.tsx src/balanceManager/wiki/sections/__tests__/BoardKindDetail.test.tsx
git commit -m "feat(wiki): BoardKindDetail section (tiles/dangers/seasons/zones)"
```

---

### Task 6: Wire `BoardKindDetail` into `WikiArticle.tsx`

Mirror the `showZoneDetail` pattern: import, compute a flag, add a TOC entry, render the section.

**Files:**
- Modify: `src/balanceManager/wiki/WikiArticle.tsx`
- Test: extend `src/balanceManager/wiki/WikiArticle.test.tsx` (confirm path: `ls src/balanceManager/wiki/WikiArticle.test.*`)

- [ ] **Step 1: Write the failing test (append to WikiArticle.test.tsx)**

Mirror the existing zone-article render test in that file. Add:

```tsx
it("renders BoardKindDetail for a board-kind article", () => {
  renderArticle({ conceptId: "boardKinds", entityKey: "mine" }); // use the file's existing render helper
  expect(screen.getByText(/Tile roster/i)).toBeTruthy();
  expect(screen.getByText(/Seasons & turns/i)).toBeTruthy();
});
```

> Open `WikiArticle.test.tsx` first and reuse its established render helper / wrapper (it already renders other concepts). Match its imports and helper name exactly instead of `renderArticle` if different.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/WikiArticle.test.tsx`
Expected: FAIL — "Tile roster" not found.

- [ ] **Step 3: Import + flag + TOC + render slot in `WikiArticle.tsx`**

Add the import beside the other section imports (after the `ZoneDetail` import, ~line 45):

```ts
import { BoardKindDetail, hasBoardKindDetail } from "./sections/BoardKindDetail.jsx";
```

Add the flag beside `showZoneDetail` (~line 180):

```ts
  const showBoardKindDetail =
    conceptId === "boardKinds" &&
    hasBoardKindDetail(entity as Parameters<typeof hasBoardKindDetail>[0]);
```

Add the TOC entry beside the zone-detail one (~line 209):

```ts
    ...(showBoardKindDetail ? [{ id: "board-kind-detail", label: "Tiles, dangers & seasons" }] : []),
```

Add the render slot beside the `ZoneDetail` render (~line 321), after the `showZoneDetail` block:

```tsx
          {/* Board-kind detail: tile roster, dangers, seasons & zones */}
          {showBoardKindDetail && entity != null && (
            <BoardKindDetail
              boardKindKey={entityKey}
              boardKind={entity as React.ComponentProps<typeof BoardKindDetail>["boardKind"]}
            />
          )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/WikiArticle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/balanceManager/wiki/WikiArticle.tsx src/balanceManager/wiki/WikiArticle.test.tsx
git commit -m "feat(wiki): render BoardKindDetail in board-kind articles"
```

---

### Task 7: Authored narrative bodies

Three HTML fragments rendered in the article's **About** section. `htmlContent.ts` already globs `../content/**/*.html` — no loader change.

**Files:**
- Create: `src/balanceManager/content/boardKinds/farm.html`
- Create: `src/balanceManager/content/boardKinds/mine.html`
- Create: `src/balanceManager/content/boardKinds/fish.html`
- Test: `src/balanceManager/wiki/__tests__/boardKindBodies.test.ts` (create)

> Inspect an existing fragment first to match the authored-body conventions (allowed tags, `[[wikilinks]]`, `<div data-game-visual>`): `ls src/balanceManager/content/**/*.html` and open one (e.g. a `content/resources/*.html`). Keep the fragments to plain semantic HTML (`<p>`, `<ul>`, `<strong>`) unless that inspection shows richer conventions are safe.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { bodyFor } from "../htmlContent.js";

describe("board-kind authored bodies", () => {
  it.each(["farm", "mine", "fish"])("has an authored body for %s", (k) => {
    const body = bodyFor("boardKinds", k);
    expect(typeof body).toBe("string");
    expect((body as string).length).toBeGreaterThan(0);
  });

  it("mine body mentions the Mysterious Ore countdown", () => {
    expect(bodyFor("boardKinds", "mine")).toMatch(/Mysterious Ore/i);
  });

  it("fish body mentions tides", () => {
    expect(bodyFor("boardKinds", "fish")).toMatch(/tide/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKindBodies.test.ts`
Expected: FAIL — `bodyFor` returns null.

- [ ] **Step 3: Author `farm.html`**

```html
<p>The <strong>Farm</strong> is the starting board. Its tiles are crops, livestock, and
orchard species; chaining matching tiles credits resources and spawns upgrade tiles per the
zone's upgrade map. Farms are unlocked from the very first run.</p>
<h3>Seasons</h3>
<p>A run cycles through Spring, Summer, Autumn, and Winter. Seasonal pool modifiers shift which
tiles favour the board, and Winter raises the minimum chain length.</p>
<h3>Hazards</h3>
<ul>
  <li><strong>Rats</strong> invade the granary and eat plant tiles each turn — chain 3+ rat tiles to clear them.</li>
  <li><strong>Wolves</strong> hunt your bird tiles; drive them off with a Rifle or scatter them with a Hound.</li>
  <li><strong>Fire</strong> (currently behind a feature flag) spreads to adjacent tiles each turn — chain fire tiles to extinguish them.</li>
</ul>
```

- [ ] **Step 4: Author `mine.html`**

```html
<p>The <strong>Mine</strong> unlocks at level 2. Its tiles are stone, ore, and gems; the board
plays the same drag-to-chain mechanic but with mine-specific hazards and a unique ore event.</p>
<h3>Mysterious Ore</h3>
<p>Surfacing <strong>Mysterious Ore</strong> opens a 5-turn countdown: chain it together with at
least two dirt tiles before the timer expires to be rewarded a <strong>Rune</strong>.</p>
<h3>Hazards</h3>
<ul>
  <li><strong>Cave-In</strong> buries a whole row in rubble — chain stone adjacent to the row to clear it.</li>
  <li><strong>Gas Vent</strong> and <strong>Mole</strong> occupy cells for a limited number of turns.</li>
  <li><strong>Lava</strong> spreads across cells until contained.</li>
</ul>
<p>Hazards spawn at a small chance per board fill, never while a boss is active, and never two at once.</p>
```

- [ ] **Step 5: Author `fish.html`**

```html
<p>The <strong>Harbor</strong> is the fishing board. Beyond the standard chain mechanic it adds
two signature systems driven by the sea.</p>
<h3>Tides</h3>
<p>The <strong>tide</strong> rises and falls over the course of a run, changing which fish are
available and how the board fills. Read the tide to time your most valuable chains.</p>
<h3>Pearls</h3>
<p>Capturing a <strong>pearl</strong> is a special payout opportunity unique to the Harbor; see
the fish feature for the exact capture rules.</p>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/balanceManager/wiki/__tests__/boardKindBodies.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/balanceManager/content/boardKinds/ src/balanceManager/wiki/__tests__/boardKindBodies.test.ts
git commit -m "feat(wiki): authored bodies for Farm/Mine/Harbor board kinds"
```

---

### Task 8: Visual scenario + full verification

Add a visual scenario for a board-kind article and run the full gate set.

**Files:**
- Modify: `src/visualTesting/matrix.js` (add a `boardKinds` article scenario — open the file and mirror an existing Dev Panel/wiki scenario entry; if no wiki scenarios exist, skip this file edit and note it)
- No test file; this task is verification.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: PASS — including the new `boardKinds`, `farmHazards`, `BoardKindDetail`, and `boardKindBodies` tests.

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: clean. Fix any issues (common: unused imports, `Record<string, unknown>` casts).

- [ ] **Step 3: Add a visual scenario (if wiki scenarios are supported)**

Inspect `src/visualTesting/matrix.js` for an existing Dev Panel / wiki scenario. If the matrix supports landing on a wiki article (via `?b/#/...` focus or a balance route), add an entry that opens `boardKinds:mine`. If the matrix has no precedent for wiki routes, skip and record this in the PR's Deferred section.

- [ ] **Step 4: Run visual regression**

Run: `npm run test:visual`
Expected: Either clean, or diffs limited to the new board-kind page / nav. Inspect each diff. If the only diffs are the intended new pages and the extra nav entry, refresh goldens:

Run: `npm run test:visual:update`

Then stage the updated goldens. If any diff is an unexpected regression elsewhere, stop and fix it before continuing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(wiki): board-kind visual scenario + refreshed goldens"
```

---

### Task 9: Open the PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin claude/confident-cannon-jQM4Z
```

- [ ] **Step 2: Create a non-draft PR** (per CLAUDE.md workflow — maintainer reviews non-draft only) summarizing: new `boardKinds` concept, `BoardKindDetail` section, farm hazards catalogued, authored bodies. Use the `pre-pr-check` skill to generate the body in house style. Include a Test plan (unit + visual) and a Deferred section (e.g. visual scenario if skipped).

- [ ] **Step 3: Merge with a merge commit** (NOT squash) once the PR exists and checks pass, per CLAUDE.md.

---

## Self-Review

**Spec coverage:**
- New `boardKinds` concept (3 entries from BIOMES) → Tasks 2, 3.
- Four BoardKindDetail blocks (tile roster, dangers, seasons & turns, zones) → Task 5, wired in Task 6.
- Config + authored HTML body → Task 7.
- Farm hazards folded into `hazards` concept → Task 1.
- Fire status nuance (flag-off) → Task 1 (status override PARTIAL).
- Relations + auto backlinks → Task 4.
- Infobox facts + lede → Task 3.
- No Zod schema (live-config-only) → Task 2 (`conceptSchemas` null).
- Testing (unit + article render + nav invariant + visual) → Tasks 1–8.
- Harbor no-hazards graceful render → Task 5 (test + component branch).

**Placeholder scan:** No "TBD"/"TODO". The lede `plural` pitfall is called out and corrected inline. Paths flagged "confirm with `ls`" are verification steps, not placeholders — the engineer confirms the exact existing test location/helper before writing.

**Type consistency:** `hasBoardKindDetail(entity)` / `BoardKindDetail({ boardKindKey, boardKind })` are consistent across Tasks 5 and 6. `getEntity("boardKinds", key)` returns the `BIOMES[key]` record (has `.tiles`, `.name`, `.resources`) used consistently in Tasks 2–6. `DANGER_KEYS`/`BOARD_KIND_DANGERS` map the same three kinds in both relations.ts (Task 4) and the component (Task 5) — intentional duplication kept local to each module to avoid a new shared dependency; both derive the same mine/farm/fish→hazard mapping.
