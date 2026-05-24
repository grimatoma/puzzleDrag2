# Tile Discovery Methods — first-class concept · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the 5 existing runtime tile-discovery methods (`default`, `chain`, `research`, `buy`, `daily`) into a code-owned catalog file mirroring the abilities/toolPowers pattern, with a Wiki concept entry, a dedicated reference tab, and a schema-driven editor in the Tiles tab.

**Architecture:** New `src/config/tileDiscoveryMethods.js` is the single source of truth (id, name, desc, params schema). `src/balanceManager/wiki/concepts.js` adds a descriptor that pulls from it (auto-appears in the Wiki tab). `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx` is a new catalog/reference tab registered in `src/balanceManager/index.jsx`. `src/balanceManager/tabs/PowersTab.jsx` is refactored to render the Discovery section's param fields from the catalog schema instead of hardcoded conditionals. No runtime behavior change, no save-shape change, no game-side edits.

**Tech Stack:** React + Vite + Tailwind, Vitest. Pure JS (JSDoc only). Existing primitives from `src/balanceManager/shared.jsx` (`Card`, `NumberField`, `Select`, `COLORS`).

**Spec:** `docs/superpowers/specs/2026-05-24-tile-discovery-methods-concept-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/config/tileDiscoveryMethods.js` | NEW | Catalog of 5 discovery methods + lookup/defaults helpers |
| `src/__tests__/tile-discovery-catalog.test.js` | NEW | Unit tests: helpers + drift check against `TILE_TYPES` |
| `src/balanceManager/wiki/concepts.js` | MODIFY | Add `tileDiscoveryMethods` descriptor entry |
| `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx` | NEW | Reference tab listing each method with params + tiles using it |
| `src/balanceManager/index.jsx` | MODIFY | Lazy-import + register `tileDiscovery` tab |
| `src/balanceManager/tabs/PowersTab.jsx` | MODIFY | Drive method dropdown + param fields from catalog |

Each file has one clear responsibility. Tasks below produce self-contained commits in this order.

---

## Task 1: Create the discovery methods catalog (TDD)

**Files:**
- Create: `src/config/tileDiscoveryMethods.js`
- Create: `src/__tests__/tile-discovery-catalog.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/tile-discovery-catalog.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  TILE_DISCOVERY_METHODS,
  TILE_DISCOVERY_METHOD_BY_ID,
  getTileDiscoveryMethod,
  defaultsForTileDiscoveryMethod,
} from "../config/tileDiscoveryMethods.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";

describe("tileDiscoveryMethods catalog", () => {
  it("exposes the 5 expected methods", () => {
    const ids = TILE_DISCOVERY_METHODS.map((m) => m.id).sort();
    expect(ids).toEqual(["buy", "chain", "daily", "default", "research"]);
  });

  it("every entry has id, name, desc, params array", () => {
    for (const m of TILE_DISCOVERY_METHODS) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.desc).toBe("string");
      expect(Array.isArray(m.params)).toBe(true);
    }
  });

  it("TILE_DISCOVERY_METHOD_BY_ID is keyed by id", () => {
    for (const m of TILE_DISCOVERY_METHODS) {
      expect(TILE_DISCOVERY_METHOD_BY_ID[m.id]).toBe(m);
    }
  });

  it("getTileDiscoveryMethod returns entry or null", () => {
    expect(getTileDiscoveryMethod("chain")?.id).toBe("chain");
    expect(getTileDiscoveryMethod("nope")).toBeNull();
  });

  it("defaultsForTileDiscoveryMethod returns object with all param keys", () => {
    const d = defaultsForTileDiscoveryMethod("chain");
    expect(d).toEqual({ chainLengthOf: "", chainLength: 6 });
    expect(defaultsForTileDiscoveryMethod("default")).toEqual({});
    expect(defaultsForTileDiscoveryMethod("nope")).toEqual({});
  });
});

describe("tileDiscoveryMethods drift vs TILE_TYPES", () => {
  it("every tile's discovery.method exists in the catalog", () => {
    const bad = [];
    for (const t of TILE_TYPES) {
      const method = t.discovery?.method;
      if (!method) continue;
      if (!TILE_DISCOVERY_METHOD_BY_ID[method]) {
        bad.push(`${t.id} uses unknown method "${method}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every tile's discovery param keys appear in that method's schema", () => {
    const bad = [];
    for (const t of TILE_TYPES) {
      const d = t.discovery;
      if (!d?.method) continue;
      const schema = TILE_DISCOVERY_METHOD_BY_ID[d.method];
      if (!schema) continue;
      const allowed = new Set(["method", ...schema.params.map((p) => p.key)]);
      for (const key of Object.keys(d)) {
        if (!allowed.has(key)) {
          bad.push(`${t.id} has stray "${key}" not in method "${d.method}" schema`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/tile-discovery-catalog.test.js`
Expected: FAIL — `Cannot find module '../config/tileDiscoveryMethods.js'`.

- [ ] **Step 3: Create the catalog file**

Create `src/config/tileDiscoveryMethods.js`:

```js
// Tile Discovery Methods catalog — the single source of truth for every
// way a tile can become "discovered" / available to the player.
//
// Each entry declares:
//   - id     — stable string used by tile data (`discovery.method`)
//   - name   — human-readable name shown in the Dev Panel
//   - desc   — short description of the discovery condition
//   - params — schema for the editor + per-tile arguments (may be empty)
//
// Mirrors src/config/toolPowers.js / src/config/abilities.js. To add a new
// discovery method:
//   1. Add an entry below.
//   2. Add a branch to the switch in src/features/tileCollection/effects.js
//      (and any reducer that reads `discovery.method`).
//   3. The Wiki, Tile Discovery reference tab, and Tiles editor pick it up
//      automatically.

export const TILE_DISCOVERY_PARAM_TYPES = Object.freeze({
  INT: "int",
  // Accepts both tile and resource keys today — PowersTab's source picker
  // iterates BIOMES[*].resources, which contains both kinds. Matches existing
  // behavior; do not introduce a separate "tileKey" type here.
  RESOURCE_KEY: "resourceKey",
});

export const TILE_DISCOVERY_METHODS = Object.freeze([
  {
    id: "default",
    name: "Default",
    desc: "Always available. No unlock condition.",
    params: [],
  },
  {
    id: "chain",
    name: "Chain",
    desc: "Unlocks when the player completes a chain of N of the source resource.",
    params: [
      { key: "chainLengthOf", label: "Source resource", type: "resourceKey" },
      { key: "chainLength",   label: "Required chain length", type: "int", default: 6, min: 1, max: 50 },
    ],
  },
  {
    id: "research",
    name: "Research",
    desc: "Unlocks once cumulative chain progress of the source resource reaches N.",
    params: [
      { key: "researchOf",     label: "Source resource", type: "resourceKey" },
      { key: "researchAmount", label: "Cumulative chain target", type: "int", default: 30, min: 1, max: 500 },
    ],
  },
  {
    id: "buy",
    name: "Buy",
    desc: "Unlocks by spending coins.",
    params: [
      { key: "coinCost", label: "Coin cost", type: "int", default: 100, min: 0, max: 99999 },
    ],
  },
  {
    id: "daily",
    name: "Daily Reward",
    desc: "Granted as a daily login reward on a specific day of the 30-day track.",
    params: [
      { key: "day", label: "Day", type: "int", default: 1, min: 1, max: 30 },
    ],
  },
]);

export const TILE_DISCOVERY_METHOD_BY_ID = Object.freeze(
  Object.fromEntries(TILE_DISCOVERY_METHODS.map((m) => [m.id, m])),
);

export function getTileDiscoveryMethod(id) {
  return TILE_DISCOVERY_METHOD_BY_ID[id] ?? null;
}

export function defaultsForTileDiscoveryMethod(id) {
  const m = TILE_DISCOVERY_METHOD_BY_ID[id];
  if (!m) return {};
  const out = {};
  for (const p of m.params) out[p.key] = p.default ?? "";
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/tile-discovery-catalog.test.js`
Expected: PASS — all tests green. If the drift test fails, a tile in `src/features/tileCollection/data.js` uses a method or param key not in the catalog — investigate that tile, do not loosen the test.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean (no new warnings).

- [ ] **Step 6: Commit**

```bash
git add src/config/tileDiscoveryMethods.js src/__tests__/tile-discovery-catalog.test.js
git commit -m "feat(balance): add tile discovery methods catalog

Single source of truth for the 5 discovery methods (default, chain,
research, buy, daily) with params schema. Drift tests assert every
TILE_TYPES discovery.method + param key matches the catalog."
```

---

## Task 2: Add Wiki concept entry

**Files:**
- Modify: `src/balanceManager/wiki/concepts.js`

- [ ] **Step 1: Add the import at the top of the imports block**

Open `src/balanceManager/wiki/concepts.js`. After the existing imports (around line 20), add:

```js
import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";
```

- [ ] **Step 2: Add the entries helper**

After the existing `toolPowerEntries` function (around line 161), add:

```js
function tileDiscoveryMethodEntries() {
  return TILE_DISCOVERY_METHODS.map((m) => ({
    key: m.id,
    name: m.name,
  })).sort(byName);
}
```

- [ ] **Step 3: Add the CONCEPTS descriptor**

In the `CONCEPTS` array, immediately after the `toolPowers` entry (it ends `getEntries: toolPowerEntries,` then `},`), insert:

```js
  {
    id: "tileDiscoveryMethods",
    label: "Tile Discovery Methods",
    blurb: "How a tile becomes available to the player — default, chain-unlock, research, buy, daily reward.",
    getEntries: tileDiscoveryMethodEntries,
  },
```

- [ ] **Step 4: Smoke-check by running the existing balance-manager tests**

Run: `npx vitest run src/__tests__/balance-manager.test.js`
Expected: PASS (unchanged behavior; we only added one CONCEPT entry that any iterating test should accept).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/balanceManager/wiki/concepts.js
git commit -m "feat(balance): wiki concept entry for tile discovery methods

Appears automatically as a new sub-tab in /b/#/wiki, pulling its
5 entries live from src/config/tileDiscoveryMethods.js."
```

---

## Task 3: Create the Tile Discovery reference tab

**Files:**
- Create: `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx`

- [ ] **Step 1: Create the file**

Create `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx`:

```jsx
// Tile Discovery Methods — reference catalog of every way a tile can be
// unlocked. Mirrors ToolPowersReferenceTab / AbilitiesReferenceTab.
//
// For each method: name, id, description, param schema, and the live list
// of tiles currently using it (pulled from TILE_TYPES). Read-only — the
// catalog is code-owned (src/config/tileDiscoveryMethods.js).

import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";
import { TILE_TYPES } from "../../features/tileCollection/data.js";
import { COLORS, Card } from "../shared.jsx";

function tilesUsing(methodId) {
  return TILE_TYPES
    .filter((t) => t.discovery?.method === methodId)
    .map((t) => t.id)
    .sort();
}

function defaultLabel(p) {
  if (p.default === undefined) return "—";
  return String(p.default);
}

export default function TileDiscoveryReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog of all tile discovery methods from <code>src/config/tileDiscoveryMethods.js</code>.
          A tile's <code>discovery.method</code> field picks one of these; the params on the same
          object configure it. Used by the Tiles editor's Discovery section and consumed at
          runtime in <code>src/features/tileCollection/effects.js</code>.
        </div>
      </Card>

      {TILE_DISCOVERY_METHODS.map((method) => {
        const using = tilesUsing(method.id);
        return (
          <Card key={method.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <div className="text-[14px] font-bold" style={{ color: COLORS.ember }}>
                  {method.name}
                </div>
                <div className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
                  {method.id}
                </div>
              </div>
              <div className="text-[10px] px-2 py-1 rounded border" style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}>
                {using.length} {using.length === 1 ? "tile" : "tiles"}
              </div>
            </div>

            <div className="text-[12px] italic mb-2" style={{ color: COLORS.inkSubtle }}>{method.desc}</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Config options</div>
                {(method.params?.length ?? 0) === 0 ? (
                  <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
                ) : (
                  <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                    {method.params.map((p) => (
                      <li key={p.key}>
                        <span className="font-mono" style={{ color: COLORS.ink }}>{p.key}</span>
                        {" "}({p.type}) — {p.label}; default: <span className="font-mono">{defaultLabel(p)}</span>
                        {p.type === "int" && (p.min !== undefined || p.max !== undefined) && (
                          <span> · range {p.min ?? 0}–{p.max ?? "∞"}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Tiles using this method</div>
                {using.length === 0 ? (
                  <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                    No tiles currently use this method.
                  </div>
                ) : (
                  <div className="text-[11px] font-mono leading-relaxed" style={{ color: COLORS.ink }}>
                    {using.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx
git commit -m "feat(balance): TileDiscoveryReferenceTab

Reference catalog tab. One card per method showing name, id,
description, param schema (with defaults and ranges), and the live
list of tiles currently using that method."
```

---

## Task 4: Register the Tile Discovery tab in the Dev Panel

**Files:**
- Modify: `src/balanceManager/index.jsx`

- [ ] **Step 1: Add the lazy import**

In `src/balanceManager/index.jsx`, find the block of `lazy(() => import("./tabs/…"))` declarations (around lines 23–45). After the `ToolPowersReferenceTab` lazy import (around line 43), add:

```js
const TileDiscoveryReferenceTab = lazy(() => import("./tabs/TileDiscoveryReferenceTab.jsx"));
```

- [ ] **Step 2: Register the tab in TABS**

In the same file, find the `TABS` array (starts around line 52). Locate the `toolPowers` entry (id `"toolPowers"`, in the `"other"` section). Immediately after that entry (after its closing `},`), insert:

```js
  { id: "tileDiscovery", label: "Tile Discovery",  iconKey: "ui_star", Component: TileDiscoveryReferenceTab,
    section: "other",
    blurb: "Reference list of every tile-discovery method: default, chain, research, buy, daily reward. Shows each method's params and which tiles currently use it." },
```

- [ ] **Step 3: Manual smoke check via dev server**

Run: `npm run dev` (in background; stop when done with this step).
Open: `http://localhost:5173/puzzleDrag2/b/#/tileDiscovery`
Expected: page loads, 5 method cards visible, each showing the right tiles. Visit `/b/#/wiki` and select the "Tile Discovery Methods" sub-tab — 5 entries should appear.

- [ ] **Step 4: Lint and run balance-manager tests**

Run: `npm run lint && npx vitest run src/__tests__/balance-manager.test.js`
Expected: clean lint, tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/balanceManager/index.jsx
git commit -m "feat(balance): register Tile Discovery reference tab

New entry in the 'Other' section, hash-routed at /b/#/tileDiscovery."
```

---

## Task 5: Refactor PowersTab to drive Discovery from the catalog

**Files:**
- Modify: `src/balanceManager/tabs/PowersTab.jsx`

This is the only behaviorally meaningful change: PowersTab stops hardcoding the method list and per-method conditional fields, and instead loops over the catalog's param schema. The 4 currently-supported methods (`default`, `chain`, `research`, `buy`) keep working identically; `daily` now appears in the dropdown as a 5th option.

- [ ] **Step 1: Replace the imports / constant block at the top**

In `src/balanceManager/tabs/PowersTab.jsx`, find the import block (around lines 13–22) and the `DISCOVERY_METHODS` constant (around lines 23–28).

Find:
```js
import { useState, useMemo } from "react";
import { TILE_TYPES, TILE_TYPES_MAP, CATEGORIES } from "../../features/tileCollection/data.js";
import { BIOMES, ITEMS, tileFamilyResource } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
  SegmentedFilter,
} from "../shared.jsx";
import AbilitiesEditor from "../AbilitiesEditor.jsx";

const DISCOVERY_METHODS = [
  { value: "default",  label: "Default — always available" },
  { value: "chain",    label: "Chain — long enough chain of source resource" },
  { value: "research", label: "Research — cumulative chain progress" },
  { value: "buy",      label: "Buy — purchase with coins" },
];
```

Replace with:
```js
import { useState, useMemo } from "react";
import { TILE_TYPES, TILE_TYPES_MAP, CATEGORIES } from "../../features/tileCollection/data.js";
import { BIOMES, ITEMS, tileFamilyResource } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
  SegmentedFilter,
} from "../shared.jsx";
import AbilitiesEditor from "../AbilitiesEditor.jsx";
import {
  TILE_DISCOVERY_METHODS,
  getTileDiscoveryMethod,
  defaultsForTileDiscoveryMethod,
} from "../../config/tileDiscoveryMethods.js";

const DISCOVERY_METHOD_OPTIONS = TILE_DISCOVERY_METHODS.map((m) => ({
  value: m.id,
  label: `${m.name} — ${m.desc}`,
}));
```

- [ ] **Step 2: Update setUnlockMethod to seed defaults from the catalog**

In the same file, find the existing `setUnlockMethod` function (around lines 172–176):

```js
  function setUnlockMethod(tileId, method) {
    updateDraft((d) => {
      d.tileUnlocks[tileId] = { method };
    });
  }
```

Replace with:
```js
  function setUnlockMethod(tileId, method) {
    updateDraft((d) => {
      d.tileUnlocks[tileId] = { method, ...defaultsForTileDiscoveryMethod(method) };
    });
  }
```

- [ ] **Step 3: Replace the Discovery section JSX**

Find the Discovery `<Card>` block in the render (around lines 355–435). It starts with `{/* Discovery / Unlock */}` and ends with the closing `</Card>` of that section.

The current block contains:
- A `<Select>` with `options={DISCOVERY_METHODS}`
- Three `{effDiscovery.method === "chain" && (…)}` / `"research"` / `"buy"` conditional blocks with hand-rolled fields
- A `{unlockDirty && …}` revert button

Replace the entire block (from `{/* Discovery / Unlock */}` through the matching `</div>` that closes the wrapper `<div>` of the Discovery section) with:

```jsx
            {/* Discovery / Unlock — schema-driven from src/config/tileDiscoveryMethods.js */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                Discovery {unlockDirty && <span style={{ color: COLORS.ember }}>· edited</span>}
              </div>
              <Card>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2">
                    <Label>Discovery method</Label>
                    <Select
                      value={effDiscovery.method}
                      options={DISCOVERY_METHOD_OPTIONS}
                      onChange={(v) => setUnlockMethod(selected.id, v)}
                    />
                  </div>
                  {(getTileDiscoveryMethod(effDiscovery.method)?.params ?? []).map((p) => {
                    if (p.type === "resourceKey") {
                      return (
                        <div key={p.key}>
                          <Label>{p.label}</Label>
                          <Select
                            value={effDiscovery[p.key] ?? ""}
                            options={sourceOptions}
                            onChange={(v) => patchUnlock(selected.id, { [p.key]: v })}
                          />
                        </div>
                      );
                    }
                    if (p.type === "int") {
                      return (
                        <div key={p.key}>
                          <Label>{p.label}</Label>
                          <NumberField
                            value={effDiscovery[p.key] ?? p.default ?? 0}
                            min={p.min ?? 0}
                            max={p.max ?? 9999}
                            width={90}
                            onChange={(v) => patchUnlock(selected.id, { [p.key]: v })}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                  {unlockDirty && (
                    <div className="col-span-2">
                      <SmallButton variant="ghost" onClick={() => revertUnlock(selected.id)}>
                        revert discovery
                      </SmallButton>
                    </div>
                  )}
                </div>
              </Card>
            </div>
```

- [ ] **Step 4: Run lint and tests**

Run: `npm run lint && npx vitest run src/__tests__/balance-manager.test.js src/__tests__/tile-discovery-catalog.test.js`
Expected: clean lint, all tests pass.

- [ ] **Step 5: Manual smoke check via dev server**

Run: `npm run dev` (background).
Open: `http://localhost:5173/puzzleDrag2/b/#/tiles`

Verify in the browser:
1. Select a tile whose default discovery is `chain` (e.g. one of the tiles whose `discovery.method` is `chain` in `src/features/tileCollection/data.js`). The Discovery section shows "Source resource" + "Required chain length" fields with the right values.
2. Select a tile with `research` — shows "Source resource" + "Cumulative chain target".
3. Select a tile with `buy` — shows "Coin cost".
4. Select a tile with `default` — shows no param fields.
5. Switch a tile's method dropdown to "Daily Reward" — shows a "Day" field defaulting to 1.
6. Switch from `chain` → `research`: chain's params are wiped; research's defaults are seeded.
7. Click "revert discovery" — returns to the source-of-truth value from `data.js`.

If any of these don't behave correctly, stop and diagnose before continuing.

- [ ] **Step 6: Run visual goldens (any UI change in `src/` touches this)**

Run: `npm run test:visual`

Expected: if any matrix scenario renders the Tiles tab Discovery section, the dropdown text changes from short labels (e.g. `"Chain — long enough chain of source resource"`) to the new catalog-derived labels (`name — desc`), and a new `daily` option appears in any open dropdown. Treat any other diff as a regression and fix before committing.

If the diffs are intentional (just the label / option list change above), refresh with:
```bash
npm run test:visual:update
```

- [ ] **Step 7: Commit**

```bash
git add src/balanceManager/tabs/PowersTab.jsx tests/visual/__screenshots__/
git commit -m "refactor(balance): drive Tiles editor Discovery from catalog

Replaces the hardcoded DISCOVERY_METHODS array and per-method
conditional field blocks with a schema-driven loop over
src/config/tileDiscoveryMethods.js. The 4 existing methods behave
identically; the 5th (daily) is now reachable from the dropdown
instead of requiring hand-edits to tile data."
```

Note: only stage `tests/visual/__screenshots__/` if Step 6 produced intentional golden updates. If `npm run test:visual` was clean, omit that path from the `git add`.

---

## Task 6: Final verification

**Files:** none

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds. The Dev Panel bundle (`/b/`) should include the new tab as its own chunk (lazy-loaded).

- [ ] **Step 4: Confirm no stray edits**

Run: `git status` and `git log --oneline -8`
Expected: working tree clean, exactly 5 new commits on top of the spec commit (one per implementation task), no edits to game-runtime files (`src/features/tileCollection/effects.js`, `src/state.js`, etc.).

---

## Self-Review Notes

- **Spec coverage:** Catalog (Task 1) ✓, Wiki entry (Task 2) ✓, Reference tab + registration (Tasks 3–4) ✓, PowersTab refactor (Task 5) ✓, tests (Task 1's test file covers all 3 spec'd assertions) ✓. No spec section uncovered.
- **No placeholders:** every step has either a runnable command + expected output, or a complete code block. No "TBD", no "similar to Task N".
- **Type consistency:** Catalog export names (`TILE_DISCOVERY_METHODS`, `TILE_DISCOVERY_METHOD_BY_ID`, `getTileDiscoveryMethod`, `defaultsForTileDiscoveryMethod`, `TILE_DISCOVERY_PARAM_TYPES`) are used consistently in Tasks 1–5. Param shape (`{ key, label, type, default?, min?, max? }`) is the same in catalog (Task 1), reference tab (Task 3), and PowersTab loop (Task 5). Tab id `"tileDiscovery"` is consistent between the manual-check URL in Task 4 and the TABS entry.
- **Test for catalog↔editor sync:** the drift tests in Task 1 catch the only realistic regression — a tile data entry using a method or param key that the catalog doesn't know about. The PowersTab refactor in Task 5 is exercised by manual smoke + visual goldens; no automated coverage added because the existing `src/__tests__/balance-manager.test.js` covers the surrounding draft / overrides plumbing already.
