# Progression Feed (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the *schema foundation* + the *wiki "Progression" feed* from `docs/progression-trigger-redesign.html`, **without touching the live reducer/engine**. Phase 2 (migrating `StoryTriggerType` onto this schema, behind parity tests) is explicitly out of scope.

**Architecture:** A new pure, framework-free module `src/config/progression/` defines configurable triggers — a composable `when` predicate (`all`/`any`/`not` + leaf `{fact,op,value}`) evaluated against a flat **fact snapshot**, plus a unified **effect** vocabulary and the authored/derived **trigger config**. A new wiki section `ProgressionFeed.tsx` reads that config and renders it as a two-tier, milestone-spine live feed (zones as non-linear tags), reusing the existing `#/page/progression` route. A validation test keeps the config honest (refs resolve, facts known, `requires` is acyclic).

**Tech stack:** TypeScript, React 19 (React Compiler on — no manual `useMemo`), Vitest (+ @testing-library/react / jsdom), Vite. No new deps.

**Key decisions (locked from the spec's "Decisions to confirm"):** flags = *demote* (we touch nothing flag-related in Phase 1); facts read from a flat snapshot (`evaluate(cond, snapshot)`) so Phase 1 is fully decoupled from `GameState`; spine order via `requires`; config home `src/config/progression/`; feed is player-visible. **Effect *applier* is deliberately Phase 2** (it only matters once wired to the reducer) — Phase 1 ships effect *types* only, which the config and view consume.

---

## File structure

| File | Responsibility | New/Mod |
|---|---|---|
| `src/config/progression/types.ts` | `Op`, `Leaf`, `Cond`, `Effect`, `ConsequenceKind`, `ProgTrigger`, `FactSnapshot`, `JsonValue` | Create |
| `src/config/progression/conditions.ts` | `evaluate(cond, snapshot)`, `describeCond(cond)`, `factIdsIn(cond)` | Create |
| `src/config/progression/facts.ts` | `FACT_FAMILIES`, `isKnownFact(id)` | Create |
| `src/config/progression/triggers.ts` | `PROGRESSION_TRIGGERS: ProgTrigger[]` (authored + derived config) | Create |
| `src/config/progression/derive.ts` | `zoneBuildingIds(zoneId)` etc. — enrich effects from live maps | Create |
| `src/config/progression/index.ts` | barrel re-export | Create |
| `src/balanceManager/wiki/sections/ProgressionFeed.tsx` | the feed view (spine + two-tier + zone filter + status chips + deep links) | Create |
| `src/balanceManager/wiki/WikiShell.tsx` | lazy import + `pageSlug === "progression"` branch | Modify (`:33-44`, `:389-396`) |
| `src/__tests__/progression-engine.test.ts` | unit tests for `evaluate`/`describeCond`/`factIdsIn`/`isKnownFact` | Create |
| `src/__tests__/progression-config.test.ts` | anti-drift: refs resolve, facts known, DAG acyclic, zone tags valid | Create |
| `src/__tests__/progression-feed.test.tsx` | render smoke test for `ProgressionFeedContent` | Create |

---

### Task 1: Core types

**Files:**
- Create: `src/config/progression/types.ts`
- Test: (covered by Task 2's import — no standalone test)

- [ ] **Step 1: Write `types.ts`**

```ts
// src/config/progression/types.ts
// Pure, framework-free schema types for the configurable-trigger engine.
// No imports from the reducer — Phase 1 is decoupled from GameState.

import type { WikiStatus } from "../../balanceManager/wiki/status.js";

export type JsonValue = string | number | boolean | null;

/** A flat snapshot of facts the engine reads. Phase 2 builds this from GameState. */
export type FactSnapshot = Record<string, JsonValue | undefined>;

export type Op = "eq" | "ne" | "gte" | "lte" | "gt" | "lt" | "truthy";

/** A leaf reads one fact and compares. `op` defaults to "truthy" (fact is set/non-false). */
export interface Leaf {
  fact: string;
  op?: Op;
  value?: JsonValue;
}

export type Cond =
  | Leaf
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

/** Category of an unlock, for the feed's grouped "➜ Unlocked" rows. */
export type ConsequenceKind =
  | "zone" | "tile" | "resource" | "building"
  | "tool" | "recipe" | "worker" | "effect" | "story" | "hazard" | "system";

/** What a trigger does when it fires. Phase 1 consumes these as DATA (no applier yet). */
export type Effect =
  | { kind: "setFlag"; flag: string | string[] }
  | { kind: "clearFlag"; flag: string | string[] }
  | { kind: "unlockZone"; zone: string }
  | { kind: "unlockBuilding"; building: string }
  | { kind: "discoverTile"; tile: string }
  | { kind: "unlockRecipe"; recipe: string }
  | { kind: "unlockTool"; tool: string }
  | { kind: "unlockWorker"; worker: string }
  | { kind: "grant"; resources?: Record<string, number>; coins?: number }
  | { kind: "advanceAct"; to: number }
  | { kind: "spawnNpc"; npc: string }
  | { kind: "spawnBoss"; boss: string }
  | { kind: "bondDelta"; npc: string; amount: number }
  | { kind: "showBeat"; beat: string }
  | { kind: "note"; consequence: ConsequenceKind; label: string };

export interface ProgTrigger {
  id: string;
  label: string;
  /** The configurable logical check. */
  when: Cond;
  effects: Effect[];
  /** Fires once when `when` first holds. Default true (informational in Phase 1). */
  once?: boolean;

  // ── classification the view reads ──
  /** Part of the ordered spine (a full "event" card). */
  milestone?: boolean;
  /** Prior trigger ids — encodes spine order as data. */
  requires?: string[];
  /** Non-linear parallel-track tag. */
  zone?: string;
  /** Reporter-flavour line / future story hook. */
  blurb?: string;
  /** Honest implementation status; PLANNED entries are exempt from ref-resolution. */
  status: WikiStatus;
}
```

- [ ] **Step 2: Typecheck the new file compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "progression/types" || echo "types.ts OK"`
Expected: `types.ts OK`

- [ ] **Step 3: Commit**

```bash
git add src/config/progression/types.ts
git commit -m "feat(progression): core configurable-trigger schema types"
```

---

### Task 2: Condition evaluator + helpers (TDD)

**Files:**
- Create: `src/config/progression/conditions.ts`
- Test: `src/__tests__/progression-engine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/progression-engine.test.ts
import { describe, it, expect } from "vitest";
import { evaluate, describeCond, factIdsIn } from "../config/progression/conditions.js";
import type { Cond, FactSnapshot } from "../config/progression/types.js";

const snap: FactSnapshot = {
  "level": 2,
  "flag.mine_unlocked": true,
  "resource.supplies.total": 3,
  "building.pit_props.built": false,
};

describe("evaluate", () => {
  it("truthy leaf (default op) reads fact set-ness", () => {
    expect(evaluate({ fact: "flag.mine_unlocked" }, snap)).toBe(true);
    expect(evaluate({ fact: "building.pit_props.built" }, snap)).toBe(false);
    expect(evaluate({ fact: "flag.absent" }, snap)).toBe(false);
  });
  it("comparison ops", () => {
    expect(evaluate({ fact: "level", op: "gte", value: 2 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "gt", value: 2 }, snap)).toBe(false);
    expect(evaluate({ fact: "resource.supplies.total", op: "lt", value: 5 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "eq", value: 2 }, snap)).toBe(true);
    expect(evaluate({ fact: "level", op: "ne", value: 3 }, snap)).toBe(true);
  });
  it("all / any / not", () => {
    const when: Cond = { all: [
      { fact: "resource.supplies.total", op: "gte", value: 3 },
      { any: [ { fact: "building.pit_props.built" }, { fact: "level", op: "gte", value: 2 } ] },
    ]};
    expect(evaluate(when, snap)).toBe(true);
    expect(evaluate({ not: { fact: "flag.mine_unlocked" } }, snap)).toBe(false);
  });
  it("missing fact compares as not-satisfied (no throw)", () => {
    expect(evaluate({ fact: "resource.ghost.total", op: "gte", value: 1 }, snap)).toBe(false);
  });
});

describe("factIdsIn", () => {
  it("collects every fact id referenced in a tree", () => {
    const when: Cond = { all: [ { fact: "a" }, { any: [ { fact: "b" }, { not: { fact: "c" } } ] } ] };
    expect(factIdsIn(when).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("describeCond", () => {
  it("renders a human-readable summary", () => {
    expect(describeCond({ fact: "level", op: "gte", value: 2 })).toBe("level ≥ 2");
    expect(describeCond({ all: [ { fact: "a" }, { fact: "b" } ] })).toBe("(a AND b)");
    expect(describeCond({ not: { fact: "x" } })).toBe("NOT x");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/__tests__/progression-engine.test.ts`
Expected: FAIL — cannot resolve `../config/progression/conditions.js`.

- [ ] **Step 3: Implement `conditions.ts`**

```ts
// src/config/progression/conditions.ts
import type { Cond, Leaf, Op, FactSnapshot, JsonValue } from "./types.js";

function isLeaf(c: Cond): c is Leaf {
  return typeof (c as Leaf).fact === "string";
}

function compare(actual: JsonValue | undefined, op: Op, expected: JsonValue | undefined): boolean {
  switch (op) {
    case "truthy": return actual !== undefined && actual !== null && actual !== false;
    case "eq": return actual === expected;
    case "ne": return actual !== expected;
    case "gte": case "lte": case "gt": case "lt": {
      const a = Number(actual), b = Number(expected);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return op === "gte" ? a >= b : op === "lte" ? a <= b : op === "gt" ? a > b : a < b;
    }
    default: return false;
  }
}

/** Evaluate a condition against a flat fact snapshot. Pure; never throws on missing facts. */
export function evaluate(cond: Cond, snapshot: FactSnapshot): boolean {
  if (isLeaf(cond)) {
    return compare(snapshot[cond.fact], cond.op ?? "truthy", cond.value);
  }
  if ("all" in cond) return cond.all.every((c) => evaluate(c, snapshot));
  if ("any" in cond) return cond.any.some((c) => evaluate(c, snapshot));
  if ("not" in cond) return !evaluate(cond.not, snapshot);
  return false;
}

/** Every fact id referenced anywhere in the tree (for validation). */
export function factIdsIn(cond: Cond): string[] {
  if (isLeaf(cond)) return [cond.fact];
  if ("all" in cond) return cond.all.flatMap(factIdsIn);
  if ("any" in cond) return cond.any.flatMap(factIdsIn);
  if ("not" in cond) return factIdsIn(cond.not);
  return [];
}

const OP_SYM: Record<Op, string> = {
  eq: "=", ne: "≠", gte: "≥", lte: "≤", gt: ">", lt: "<", truthy: "",
};

/** Human-readable one-line summary of a condition, for the feed UI. */
export function describeCond(cond: Cond): string {
  if (isLeaf(cond)) {
    if ((cond.op ?? "truthy") === "truthy") return cond.fact;
    return `${cond.fact} ${OP_SYM[cond.op as Op]} ${String(cond.value)}`;
  }
  if ("all" in cond) return `(${cond.all.map(describeCond).join(" AND ")})`;
  if ("any" in cond) return `(${cond.any.map(describeCond).join(" OR ")})`;
  if ("not" in cond) return `NOT ${describeCond(cond.not)}`;
  return "?";
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/__tests__/progression-engine.test.ts`
Expected: PASS (all `evaluate`/`factIdsIn`/`describeCond` cases green).

- [ ] **Step 5: Commit**

```bash
git add src/config/progression/conditions.ts src/__tests__/progression-engine.test.ts
git commit -m "feat(progression): pure condition evaluator + describe/factIds helpers"
```

---

### Task 3: Fact registry (known-fact validation) (TDD)

**Files:**
- Create: `src/config/progression/facts.ts`
- Test: extend `src/__tests__/progression-engine.test.ts`

- [ ] **Step 1: Add the failing test (append to the existing file)**

```ts
import { isKnownFact, FACT_FAMILIES } from "../config/progression/facts.js";

describe("isKnownFact", () => {
  it("accepts parameterised families", () => {
    expect(isKnownFact("resource.bread.total")).toBe(true);
    expect(isKnownFact("building.granary.built")).toBe(true);
    expect(isKnownFact("flag.met_keeper")).toBe(true);
    expect(isKnownFact("zone.quarry.founded")).toBe(true);
    expect(isKnownFact("level")).toBe(true);
    expect(isKnownFact("npc.bram.bond")).toBe(true);
  });
  it("rejects unknown facts", () => {
    expect(isKnownFact("totally.made.up")).toBe(false);
    expect(isKnownFact("resource.bread")).toBe(false); // missing .total
  });
  it("FACT_FAMILIES is non-empty", () => {
    expect(FACT_FAMILIES.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/__tests__/progression-engine.test.ts`
Expected: FAIL — cannot resolve `facts.js`.

- [ ] **Step 3: Implement `facts.ts`**

```ts
// src/config/progression/facts.ts
// The vocabulary of "things that happen", as fact-id patterns. Used by the
// config-validation test (every `when` leaf must reference a known fact) and,
// in Phase 2, by the GameState→FactSnapshot builder.

export interface FactFamily {
  /** Matches a concrete fact id, e.g. /^resource\.[a-z0-9_]+\.total$/. */
  pattern: RegExp;
  /** Human description for docs. */
  desc: string;
}

const KEY = "[a-z0-9_]+";

export const FACT_FAMILIES: FactFamily[] = [
  { pattern: new RegExp(`^resource\\.${KEY}\\.total$`), desc: "inventory total of a resource" },
  { pattern: new RegExp(`^craft\\.${KEY}\\.count$`), desc: "cumulative crafts of an item" },
  { pattern: new RegExp(`^building\\.${KEY}\\.built$`), desc: "a building has been built" },
  { pattern: new RegExp(`^zone\\.${KEY}\\.founded$`), desc: "a zone has been founded" },
  { pattern: new RegExp(`^tile\\.${KEY}\\.discovered$`), desc: "a tile type is discovered" },
  { pattern: new RegExp(`^chain\\.${KEY}\\.max$`), desc: "longest chain of a tile/resource" },
  { pattern: new RegExp(`^flag\\.${KEY}$`), desc: "a story flag is set" },
  { pattern: new RegExp(`^npc\\.${KEY}\\.bond$`), desc: "bond level with an NPC" },
  { pattern: new RegExp(`^boss\\.${KEY}\\.defeated$`), desc: "a boss has been defeated" },
  { pattern: /^order\.fulfilled$/, desc: "cumulative orders fulfilled" },
  { pattern: /^buildings\.allBuilt$/, desc: "all buildings at the location built" },
  { pattern: /^level$/, desc: "player level" },
  { pattern: /^act$/, desc: "current story act" },
  { pattern: /^season$/, desc: "current season index" },
  { pattern: /^turn$/, desc: "current turn" },
  { pattern: /^event\.[a-zA-Z]+$/, desc: "current-tick event context" },
];

export function isKnownFact(id: string): boolean {
  return FACT_FAMILIES.some((f) => f.pattern.test(id));
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/__tests__/progression-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/progression/facts.ts src/__tests__/progression-engine.test.ts
git commit -m "feat(progression): fact-family registry + isKnownFact validation"
```

---

### Task 4: Derive helpers (TDD)

**Files:**
- Create: `src/config/progression/derive.ts`
- Test: `src/__tests__/progression-config.test.ts` (created here; extended in Task 6)

**Note:** verify exact field names against `src/features/zones/data.ts` (`Zone.buildings: BuildingId[]`, `Zone.boards`) and `src/constants.ts` (`BUILDINGS[].id/.name`). The test below will fail loudly if a name is wrong.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/progression-config.test.ts
import { describe, it, expect } from "vitest";
import { zoneBuildingIds, zoneBoardKinds } from "../config/progression/derive.js";
import { ZONES } from "../features/zones/data.js";

describe("derive helpers", () => {
  it("zoneBuildingIds returns the zone's buildable ids", () => {
    const home = zoneBuildingIds("home");
    expect(Array.isArray(home)).toBe(true);
    // 'home' (the farm) must exist as a zone
    expect(ZONES["home"]).toBeTruthy();
  });
  it("zoneBoardKinds lists enabled board kinds", () => {
    expect(zoneBoardKinds("home")).toContain("farm");
  });
  it("unknown zone yields empty, not a throw", () => {
    expect(zoneBuildingIds("nope_zone")).toEqual([]);
    expect(zoneBoardKinds("nope_zone")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/__tests__/progression-config.test.ts`
Expected: FAIL — cannot resolve `derive.js`.

- [ ] **Step 3: Implement `derive.ts`**

```ts
// src/config/progression/derive.ts
// Enrich terse trigger effects with detail read from the live config maps,
// so the feed doesn't hand-maintain (and can't drift from) what a zone brings.

import { ZONES } from "../../features/zones/data.js";
import type { BoardKind } from "../../features/cartography/data.js";

/** Building ids buildable at a zone (empty for unknown zones). */
export function zoneBuildingIds(zoneId: string): string[] {
  const z = ZONES[zoneId];
  return z ? [...z.buildings] : [];
}

/** Board kinds a zone enables, e.g. ["farm"] or ["mine"] (empty for unknown). */
export function zoneBoardKinds(zoneId: string): BoardKind[] {
  const z = ZONES[zoneId];
  if (!z?.boards) return [];
  return Object.keys(z.boards) as BoardKind[];
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/__tests__/progression-config.test.ts`
Expected: PASS. If `zoneBuildingIds("home")`/`zoneBoardKinds("home")` are empty, the real farm zone id differs — grep `ZONES` keys and fix the test's zone id AND note the correct home id for Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/config/progression/derive.ts src/__tests__/progression-config.test.ts
git commit -m "feat(progression): derive helpers (zone → buildings/boards) from live config"
```

---

### Task 5: The trigger config + barrel

**Files:**
- Create: `src/config/progression/triggers.ts`
- Create: `src/config/progression/index.ts`

**Content to author** (the early-to-mid slice + spine from the spec; mirrors the live-feed mockup). Use **real keys**; the Task 6 validation test will flag any that don't resolve — fix the key (grep `BUILDINGS`/`ITEMS`/`RECIPES`/`ZONES`) or mark the entry `PLANNED`. Confirm the farm zone id from Task 4 (assumed `"home"`) and the mine zone id (assumed `"quarry"`).

- [ ] **Step 1: Write `triggers.ts`**

```ts
// src/config/progression/triggers.ts
import type { ProgTrigger } from "./types.js";

// Status is honest: WIRED = the unlock is enforced somewhere today;
// PARTIAL = half-wired; PLANNED = not in code yet (exempt from ref checks).
export const PROGRESSION_TRIGGERS: ProgTrigger[] = [
  // ── Spine: arrival ──
  {
    id: "arrive_home", label: "Arrive at Hearthwood Vale", milestone: true, zone: "home",
    status: "WIRED", blurb: "The hearth is cold and the fields untended — but the soil is good.",
    when: { fact: "event.type", op: "eq", value: "session_start" },
    effects: [
      { kind: "unlockZone", zone: "home" },
      { kind: "note", consequence: "tile", label: "Grass, grain & oak tiles" },
      { kind: "note", consequence: "system", label: "Orders & the Almanac" },
    ],
  },
  // ── Farm economy ──
  {
    id: "build_granary", label: "Build the Granary", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.granary.built" },
    effects: [{ kind: "unlockBuilding", building: "granary" }, { kind: "note", consequence: "effect", label: "+1 turn / season, +cap" }],
  },
  {
    id: "build_mill", label: "Build the Mill", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.mill.built" },
    effects: [{ kind: "unlockBuilding", building: "mill" }],
  },
  {
    id: "build_kitchen", label: "Build the Kitchen", zone: "home", requires: ["arrive_home"],
    status: "WIRED",
    when: { fact: "building.kitchen.built" },
    effects: [
      { kind: "unlockBuilding", building: "kitchen" },
      { kind: "unlockRecipe", recipe: "supplies" },
      { kind: "note", consequence: "effect", label: "Supplies pay for Mine trips" },
    ],
  },
  {
    id: "build_coop", label: "Build the Chicken Coop", zone: "home", requires: ["arrive_home"],
    status: "PLANNED", blurb: "Reporters confirm: the valley has chickens. Feathers everywhere.",
    when: { fact: "building.coop.built" },
    effects: [
      { kind: "unlockBuilding", building: "coop" },
      { kind: "discoverTile", tile: "tile_chicken" },
      { kind: "note", consequence: "resource", label: "Eggs (chain chickens)" },
    ],
  },
  // ── Spine: the Mine opens ──
  {
    id: "open_mine", label: "Open the way to the Mine", milestone: true, zone: "quarry",
    requires: ["build_kitchen"], status: "PARTIAL",
    blurb: "Scouts return from the eastern crossroads — the old quarry road is passable.",
    when: { all: [
      { fact: "resource.supplies.total", op: "gte", value: 3 },
      { any: [ { fact: "building.pit_props.built" }, { fact: "level", op: "gte", value: 2 } ] },
    ]},
    effects: [{ kind: "note", consequence: "effect", label: "TODAY: reach Lv2 · PLANNED: supplies / Pit Props" }],
  },
  {
    id: "found_quarry", label: "Found the Cracked Quarry (Zone 2)", milestone: true, zone: "quarry",
    requires: ["open_mine"], status: "WIRED",
    blurb: "A second settlement takes root in the stone. The mine yawns open.",
    when: { fact: "zone.quarry.founded" },
    effects: [
      { kind: "unlockZone", zone: "quarry" },
      { kind: "note", consequence: "tile", label: "Stone, coal, iron & gold ore, gems" },
      { kind: "note", consequence: "resource", label: "Block, coke, iron bar, gold bar" },
      { kind: "unlockWorker", worker: "miner" },
    ],
  },
  // ── Mine production tier ──
  {
    id: "build_workshop", label: "Build the Workshop", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED",
    when: { fact: "building.workshop.built" },
    effects: [{ kind: "unlockBuilding", building: "workshop" }, { kind: "note", consequence: "tool", label: "All tools (Iron Pick, Drill, …)" }],
  },
  {
    id: "build_forge", label: "Build the Forge", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED",
    when: { fact: "building.forge.built" },
    effects: [{ kind: "unlockBuilding", building: "forge" }, { kind: "note", consequence: "recipe", label: "Iron Hinge, Lantern, Gold Ring…" }],
  },
  {
    id: "build_bakery", label: "Build the Bakery", zone: "quarry", requires: ["found_quarry"],
    status: "WIRED", blurb: "Needs block from the Mine — baking waits on stone.",
    when: { fact: "building.bakery.built" },
    effects: [{ kind: "unlockBuilding", building: "bakery" }, { kind: "unlockRecipe", recipe: "bread" }],
  },
  // ── Spine: reach the sea (PLANNED zone) ──
  {
    id: "found_harbor", label: "Found Saltspray Harbor (Zone 3)", milestone: true, zone: "harbor",
    requires: ["found_quarry"], status: "PLANNED",
    blurb: "Salt on the wind, nets out at dawn.",
    when: { fact: "zone.harbor.founded" },
    effects: [
      { kind: "unlockZone", zone: "harbor" },
      { kind: "note", consequence: "tile", label: "Fish shoals, kelp, pearls" },
      { kind: "note", consequence: "building", label: "Fishmonger, Harbor Dock, Lighthouse" },
    ],
  },
];
```

- [ ] **Step 2: Write `index.ts`**

```ts
// src/config/progression/index.ts
export * from "./types.js";
export * from "./conditions.js";
export * from "./facts.js";
export * from "./derive.js";
export { PROGRESSION_TRIGGERS } from "./triggers.js";
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | grep -i "config/progression" || echo "progression OK"`
Expected: `progression OK`

- [ ] **Step 4: Commit**

```bash
git add src/config/progression/triggers.ts src/config/progression/index.ts
git commit -m "feat(progression): authored+derived trigger config (spine + early game)"
```

---

### Task 6: Anti-drift validation test (TDD — the honesty guarantee)

**Files:**
- Modify: `src/__tests__/progression-config.test.ts`

This test asserts the config can't lie. It will likely FAIL first on real key mismatches — that's the point: fix each flagged key in `triggers.ts` to the real one (grep the live maps) or set the entry's `status` to `"PLANNED"`.

- [ ] **Step 1: Append the validation suite**

```ts
import { PROGRESSION_TRIGGERS } from "../config/progression/triggers.js";
import { factIdsIn } from "../config/progression/conditions.js";
import { isKnownFact } from "../config/progression/facts.js";
import { BUILDINGS, ITEMS, RECIPES } from "../constants.js";
import { TYPE_WORKERS } from "../features/workers/data.js";

const BUILDING_IDS = new Set(BUILDINGS.map((b: { id: string }) => b.id));
const ITEM_KEYS = new Set(Object.keys(ITEMS));
const RECIPE_KEYS = new Set(Object.keys(RECIPES));
const ZONE_IDS = new Set(Object.keys(ZONES));
const WORKER_IDS = new Set(TYPE_WORKERS.map((w: { id: string }) => w.id));

function refResolves(effect: any): boolean {
  switch (effect.kind) {
    case "unlockBuilding": return BUILDING_IDS.has(effect.building);
    case "unlockZone": return ZONE_IDS.has(effect.zone);
    case "unlockRecipe": return RECIPE_KEYS.has(effect.recipe);
    case "discoverTile": return ITEM_KEYS.has(effect.tile);
    case "unlockTool": return ITEM_KEYS.has(effect.tool);
    case "unlockWorker": return WORKER_IDS.has(effect.worker);
    case "grant": return Object.keys(effect.resources ?? {}).every((k) => ITEM_KEYS.has(k));
    default: return true; // note/setFlag/advanceAct/etc. carry no live-map ref
  }
}

describe("progression config integrity", () => {
  it("trigger ids are unique", () => {
    const ids = PROGRESSION_TRIGGERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every effect ref resolves in a live map (unless PLANNED)", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS) {
      if (t.status === "PLANNED" || t.status === "DOC-ONLY") continue;
      for (const e of t.effects) if (!refResolves(e)) bad.push(`${t.id}: ${JSON.stringify(e)}`);
    }
    expect(bad).toEqual([]);
  });

  it("every `when` leaf references a known fact family", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS)
      for (const f of factIdsIn(t.when)) if (!isKnownFact(f)) bad.push(`${t.id}: ${f}`);
    expect(bad).toEqual([]);
  });

  it("zone tags are real ZoneIds (unless PLANNED)", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS) {
      if (!t.zone || t.status === "PLANNED") continue;
      if (!ZONE_IDS.has(t.zone)) bad.push(`${t.id}: ${t.zone}`);
    }
    expect(bad).toEqual([]);
  });

  it("requires references existing triggers and forms an acyclic graph", () => {
    const ids = new Set(PROGRESSION_TRIGGERS.map((t) => t.id));
    for (const t of PROGRESSION_TRIGGERS)
      for (const r of t.requires ?? []) expect(ids.has(r), `${t.id} requires ${r}`).toBe(true);

    // DAG check via DFS
    const byId = new Map(PROGRESSION_TRIGGERS.map((t) => [t.id, t]));
    const state = new Map<string, 0 | 1 | 2>(); // 0=unseen,1=on-stack,2=done
    const hasCycle = (id: string): boolean => {
      const s = state.get(id) ?? 0;
      if (s === 1) return true;
      if (s === 2) return false;
      state.set(id, 1);
      for (const r of byId.get(id)?.requires ?? []) if (hasCycle(r)) return true;
      state.set(id, 2);
      return false;
    };
    expect(PROGRESSION_TRIGGERS.some((t) => hasCycle(t.id))).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failures on any wrong keys**

Run: `npx vitest run src/__tests__/progression-config.test.ts`
Expected: Initially may FAIL listing bad refs (e.g. a building id that's really `chicken_coop` not `coop`, or a recipe key mismatch).

- [ ] **Step 3: Fix the config until green**

For each failure: grep the live map for the correct key and update `triggers.ts`, OR mark the entry `status: "PLANNED"` if it genuinely doesn't exist yet. Examples:
```bash
grep -nE "id:\s*\"(granary|mill|kitchen|bakery|workshop|forge)" src/constants.ts   # building ids
node -e "import('./src/constants.ts')" 2>/dev/null || true                          # (use grep; constants is large)
grep -nE "\"(supplies|bread)\"\s*:" src/constants.ts                                 # recipe keys near RECIPES
```
Re-run until the suite is green.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/progression-config.test.ts src/config/progression/triggers.ts
git commit -m "test(progression): anti-drift config validation (refs/facts/zones/DAG)"
```

---

### Task 7: The feed view component

**Files:**
- Create: `src/balanceManager/wiki/sections/ProgressionFeed.tsx`
- Test: `src/__tests__/progression-feed.test.tsx`

Mirror `ProgressionTimeline.tsx`: import `COLORS` from `"../../shared.jsx"`, `ConceptRefForKey` from `"../refs.js"`, `StatusBadge` from `"../StatusBadge.jsx"` (verify the export/prop names by reading those files — `StatusBadge` takes `{ status, compact }`). Build a milestone-spine list; under each milestone show grouped `note`/`unlock*` effects as rows. Effects that carry a live key (`unlockBuilding`→`buildings`, `unlockRecipe`→`recipes`, `discoverTile`→`tiles`, `unlockWorker`→`workers`, `unlockZone`→`zones`) render via `ConceptRefForKey`; `note` effects render as plain chips. Provide a zone filter and a category legend. Export `ProgressionFeedContent` separately for testing (as ProgressionTimeline does).

- [ ] **Step 1: Write the failing render test**

```tsx
// src/__tests__/progression-feed.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressionFeedContent } from "../balanceManager/wiki/sections/ProgressionFeed.js";

describe("ProgressionFeedContent", () => {
  it("renders milestone headlines and an unlocked row", () => {
    render(<ProgressionFeedContent />);
    expect(screen.getByText(/Arrive at Hearthwood Vale/i)).toBeTruthy();
    expect(screen.getByText(/Found the Cracked Quarry/i)).toBeTruthy();
  });
  it("shows a status chip for a PLANNED milestone", () => {
    render(<ProgressionFeedContent />);
    // 'Found Saltspray Harbor' is PLANNED
    expect(screen.getAllByText(/PLANNED/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/__tests__/progression-feed.test.tsx`
Expected: FAIL — cannot resolve `ProgressionFeed.js`.

- [ ] **Step 3: Implement `ProgressionFeed.tsx`**

Implement per the contract above. Key structure (fill styling by mirroring ProgressionTimeline; React Compiler on, so no `useMemo`):

```tsx
// src/balanceManager/wiki/sections/ProgressionFeed.tsx
import React from "react";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import { StatusBadge } from "../StatusBadge.jsx";
import { PROGRESSION_TRIGGERS } from "../../../config/progression/index.js";
import type { ProgTrigger, Effect } from "../../../config/progression/index.js";

// Map an unlock effect to (conceptId, key) for ConceptRefForKey; null = render as plain chip.
function effectRef(e: Effect): { conceptId: string; key: string; label?: string } | null {
  switch (e.kind) {
    case "unlockBuilding": return { conceptId: "buildings", key: e.building };
    case "unlockRecipe": return { conceptId: "recipes", key: e.recipe };
    case "unlockTool": return { conceptId: "tools", key: e.tool };
    case "unlockWorker": return { conceptId: "workers", key: e.worker };
    case "unlockZone": return { conceptId: "zones", key: e.zone };
    case "discoverTile": return { conceptId: "tiles", key: e.tile };
    default: return null;
  }
}

function noteLabel(e: Effect): string | null {
  if (e.kind === "note") return e.label;
  if (e.kind === "setFlag") return null;
  if (e.kind === "grant") return e.coins ? `+${e.coins} coins` : "resources";
  if (e.kind === "advanceAct") return `Act ${e.to}`;
  if (e.kind === "showBeat") return `Story beat`;
  return null;
}

const SPINE = () => PROGRESSION_TRIGGERS.filter((t) => t.milestone);
const childrenOf = (id: string) =>
  PROGRESSION_TRIGGERS.filter((t) => !t.milestone && (t.requires ?? []).includes(id));

export function ProgressionFeedContent() {
  const milestones = SPINE();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {milestones.map((m) => (
        <MilestoneCard key={m.id} trigger={m} />
      ))}
    </div>
  );
}

function EffectRow({ effect }: { effect: Effect }) {
  const ref = effectRef(effect);
  if (ref) return <ConceptRefForKey entityKey={ref.key} conceptId={ref.conceptId} variant="inline" />;
  const label = noteLabel(effect);
  if (!label) return null;
  return (
    <span style={{ padding: "2px 9px", borderRadius: 7, background: COLORS.parchment, border: `1px solid ${COLORS.border}`, color: COLORS.ink, fontSize: 12 }}>
      {label}
    </span>
  );
}

function MilestoneCard({ trigger }: { trigger: ProgTrigger }) {
  const kids = childrenOf(trigger.id);
  return (
    <section style={{ borderLeft: `3px solid ${COLORS.ember}`, paddingLeft: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="wiki-concept-title" style={{ fontSize: 18 }}>{trigger.label}</span>
        {trigger.zone && <span className="wiki-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>{trigger.zone}</span>}
        <StatusBadge status={trigger.status} compact />
      </div>
      {trigger.blurb && <p style={{ fontStyle: "italic", color: COLORS.inkSubtle, margin: "4px 0" }}>{trigger.blurb}</p>}
      <UnlockRows trigger={trigger} />
      {kids.map((k) => (
        <div key={k.id} style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</span>
            <StatusBadge status={k.status} compact />
          </div>
          <UnlockRows trigger={k} />
        </div>
      ))}
    </section>
  );
}

function UnlockRows({ trigger }: { trigger: ProgTrigger }) {
  if (trigger.effects.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0" }}>
      <span style={{ color: COLORS.inkSubtle, fontSize: 12 }}>➜ unlocked:</span>
      {trigger.effects.map((e, i) => <EffectRow key={i} effect={e} />)}
    </div>
  );
}

export default function ProgressionFeed() {
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 className="wiki-concept-title" style={{ fontSize: 26 }}>Progression</h1>
      <p style={{ color: COLORS.inkSubtle }}>Every milestone and what it unlocks — read from the trigger config.</p>
      <ProgressionFeedContent />
    </div>
  );
}
```

- [ ] **Step 4: Run the render test**

Run: `npx vitest run src/__tests__/progression-feed.test.tsx`
Expected: PASS. If `StatusBadge`/`ConceptRefForKey` import or props differ, read `src/balanceManager/wiki/StatusBadge.tsx` and `src/balanceManager/wiki/refs.tsx` and adjust.

- [ ] **Step 5: Commit**

```bash
git add src/balanceManager/wiki/sections/ProgressionFeed.tsx src/__tests__/progression-feed.test.tsx
git commit -m "feat(progression): wiki ProgressionFeed view (milestone spine + unlocks)"
```

---

### Task 8: Wire the feed into the wiki shell

**Files:**
- Modify: `src/balanceManager/wiki/WikiShell.tsx`

Reuse the existing player-visible `#/page/progression` sidebar entry (already in `NARRATIVE_PAGES`) by swapping its renderer — exactly mirroring the existing `pageSlug === "overview"` → `WikiHome` special-case.

- [ ] **Step 1: Add the lazy import** (after line 42, beside `WikiHomeLazy`)

```tsx
const ProgressionFeedLazy = lazy(() =>
  import("./sections/ProgressionFeed.jsx").then((m) => ({ default: m.default })),
);
```

- [ ] **Step 2: Add the branch** inside the `tab === "page"` block (after the `pageSlug === "overview"` case, before the `else`)

Change:
```tsx
    if (pageSlug === "overview") {
      mainContent = <WikiHomeLazy navigate={navigate} />;
    } else {
      mainContent = <NarrativePageLazy slug={pageSlug!} />;
    }
```
to:
```tsx
    if (pageSlug === "overview") {
      mainContent = <WikiHomeLazy navigate={navigate} />;
    } else if (pageSlug === "progression") {
      mainContent = <ProgressionFeedLazy />;
    } else {
      mainContent = <NarrativePageLazy slug={pageSlug!} />;
    }
```

- [ ] **Step 3: Typecheck + lint the changed file**

Run: `npm run typecheck && npx eslint src/balanceManager/wiki/WikiShell.tsx src/balanceManager/wiki/sections/ProgressionFeed.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/balanceManager/wiki/WikiShell.tsx
git commit -m "feat(progression): route #/page/progression to the generated feed"
```

---

### Task 9: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS (no new errors).

- [ ] **Step 2: Typecheck (app + test files)**

Run: `npm run typecheck && npm run typecheck:test-files`
Expected: PASS.

- [ ] **Step 3: Full unit test run**

Run: `npm test`
Expected: PASS, including the three new `progression-*` suites.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Visual goldens (a new wiki page renders)**

Run: `npm run test:visual`
Expected: PASS, or only intended diffs for the new `#/page/progression`. If goldens are missing/changed for the wiki, run `npm run test:visual:update` and commit the snapshots. Pure-logic diffs elsewhere are regressions — investigate, don't blanket-update.

- [ ] **Step 6: Final commit (if goldens updated)**

```bash
git add -A
git commit -m "test(progression): refresh visual goldens for the Progression page"
```

---

## Self-review checklist (run before handing off)

1. **Spec coverage** — engine schema (types/conditions/facts ✓ Tasks 1-3), config read from live maps (derive ✓ Task 4, config ✓ Task 5), feed view (✓ Tasks 7-8), anti-drift validation (✓ Task 6), status flags reused (✓ Task 7), deep links reused (✓ Task 7). Effect *applier* + engine migration intentionally deferred to Phase 2 (stated in header).
2. **Placeholder scan** — none; every code step is complete. Config keys are best-effort and self-correct via Task 6's test.
3. **Type consistency** — `Cond`/`Effect`/`ProgTrigger`/`FactSnapshot` defined in Task 1 and used unchanged in Tasks 2-7; `evaluate`/`factIdsIn`/`describeCond`/`isKnownFact`/`zoneBuildingIds`/`zoneBoardKinds` signatures stable across tasks.
