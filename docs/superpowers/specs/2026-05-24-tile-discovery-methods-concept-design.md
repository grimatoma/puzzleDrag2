# Tile Discovery Methods — first-class concept

**Status:** Approved · 2026-05-24
**Scope:** Balance Manager (`/b/`). No game-runtime behavior changes.

## Problem

A tile's *discovery method* (how it becomes available to the player) is already a runtime concept — `src/features/tileCollection/data.js` tags every tile with a `discovery: { method, …params }` object, and `src/features/tileCollection/effects.js` switches on `method` to decide unlock behavior. The five real methods today are `default`, `chain`, `research`, `buy`, `daily`.

But "discovery method" isn't a first-class entity anywhere in the codebase:

- `src/balanceManager/tabs/PowersTab.jsx` hardcodes a local `DISCOVERY_METHODS` array of **4** methods (missing `daily`) and renders a per-method `if (method === "chain") …` block of conditional fields.
- The Concepts Wiki (`src/balanceManager/wiki/concepts.js`) has no entry for discovery methods, so designers can't scan the list.
- There's no reference tab for browsing them (contrast with Attributes → `AbilitiesReferenceTab`, Tool Powers → `ToolPowersReferenceTab`).

This is a divergence trap: adding a new method requires edits in three unrelated places, and the editor and runtime can silently disagree.

## Goal

Treat tile discovery methods the way attributes and tool powers are treated today: one catalog file as source of truth, a Wiki concept entry, a reference tab, and a schema-driven editor in the Tiles tab.

No runtime behavior change. No new methods added. No save-shape change.

## Design

### 1. Catalog file

New file `src/config/tileDiscoveryMethods.js`, modeled directly on `src/config/toolPowers.js`.

```js
export const TILE_DISCOVERY_PARAM_TYPES = Object.freeze({
  INT: "int",
  RESOURCE_KEY: "resourceKey", // accepts tile or resource keys, matching today's PowersTab behavior
});

export const TILE_DISCOVERY_METHODS = Object.freeze([
  { id: "default", name: "Default", desc: "Always available. No unlock condition.",
    params: [] },
  { id: "chain", name: "Chain", desc: "Unlocks when the player completes a chain of N of the source resource.",
    params: [
      { key: "chainLengthOf", label: "Source resource", type: "resourceKey" },
      { key: "chainLength",   label: "Required chain length", type: "int", default: 6, min: 1, max: 50 },
    ] },
  { id: "research", name: "Research", desc: "Unlocks once cumulative chain progress of the source resource reaches N.",
    params: [
      { key: "researchOf",     label: "Source resource", type: "resourceKey" },
      { key: "researchAmount", label: "Cumulative chain target", type: "int", default: 30, min: 1, max: 500 },
    ] },
  { id: "buy", name: "Buy", desc: "Unlocks by spending coins.",
    params: [
      { key: "coinCost", label: "Coin cost", type: "int", default: 100, min: 0, max: 99999 },
    ] },
  { id: "daily", name: "Daily Reward", desc: "Granted as a daily login reward on a specific day of the 30-day track.",
    params: [
      { key: "day", label: "Day", type: "int", default: 1, min: 1, max: 30 },
    ] },
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

The five entries are extracted verbatim from existing usage (verified against `src/features/tileCollection/data.js` and `src/features/tileCollection/effects.js`).

### 2. Wiki concept entry

Edit `src/balanceManager/wiki/concepts.js`:

```js
import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";

function tileDiscoveryMethodEntries() {
  return TILE_DISCOVERY_METHODS.map((m) => ({
    key: m.id,
    name: m.name,
  })).sort(byName);
}

// Append to the CONCEPTS array, placed near abilities / toolPowers:
{
  id: "tileDiscoveryMethods",
  label: "Tile Discovery Methods",
  blurb: "How a tile becomes available to the player — default, chain-unlock, research, buy, daily reward.",
  getEntries: tileDiscoveryMethodEntries,
},
```

`WikiTab.jsx` reads `CONCEPTS` directly, so the new sub-tab appears with no further wiring.

### 3. Reference tab

New file `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx`, modeled on `ToolPowersReferenceTab.jsx`.

For each method, render a Card with:

- Name (large, ember-colored)
- `id` (mono, subtle)
- Description (italic)
- **Config options** section: bullet list of params (`key (type) — label`), or "No params." for `default`.
- **Tiles using this method** section: count + comma-separated list of tile `id`s pulled live from `TILE_TYPES`. Empty case prints "No tiles currently use this method."

Register in `src/balanceManager/index.jsx`:

```js
const TileDiscoveryReferenceTab = lazy(() => import("./tabs/TileDiscoveryReferenceTab.jsx"));

// In the TABS array, in the "other" section:
{ id: "tileDiscovery", label: "Tile Discovery", iconKey: "ui_star", Component: TileDiscoveryReferenceTab,
  section: "other",
  blurb: "Reference list of every tile-discovery method: default, chain, research, buy, daily reward. Shows each method's params and which tiles currently use it." },
```

### 4. Drive PowersTab from the catalog

Edit `src/balanceManager/tabs/PowersTab.jsx`:

- **Delete** the local `const DISCOVERY_METHODS = […]` (4-element) array.
- Import `TILE_DISCOVERY_METHODS`, `getTileDiscoveryMethod`, `defaultsForTileDiscoveryMethod` from the catalog.
- Build the method dropdown options from `TILE_DISCOVERY_METHODS.map((m) => ({ value: m.id, label: `${m.name} — ${m.desc}` }))`.
- **Delete** the three hardcoded conditional blocks for `chain`, `research`, `buy`.
- Replace with one generic loop over `getTileDiscoveryMethod(effDiscovery.method)?.params`:
  - `type: "int"` → existing `NumberField` (using param's `min`/`max`/`default`).
  - `type: "resourceKey"` → existing `Select` with `sourceOptions` (unchanged from today).
- `setUnlockMethod(tileId, method)` becomes:
  ```js
  function setUnlockMethod(tileId, method) {
    updateDraft((d) => {
      d.tileUnlocks[tileId] = { method, ...defaultsForTileDiscoveryMethod(method) };
    });
  }
  ```
  This preserves the existing "switching methods resets old params" behavior while seeding defaults from the catalog.

The visible behavior for the existing 4 methods is identical; the only user-facing change is that `daily` now appears in the dropdown (previously only reachable by hand-editing tile data).

### 5. Tests

New file `src/__tests__/tile-discovery-catalog.test.js` with three assertions:

1. **Method coverage:** For every `TILE_TYPES[i].discovery.method`, `TILE_DISCOVERY_METHOD_BY_ID[method]` is defined. Catches catalog/data drift.
2. **Param key coverage:** For every tile, every key on `t.discovery` other than `method` appears in that method's `params` schema. Catches typos like `chainLenghtOf` or stale params left after a method swap.
3. **Defaults shape:** `defaultsForTileDiscoveryMethod("chain")` returns an object with both `chainLengthOf` and `chainLength` keys; `defaultsForTileDiscoveryMethod("default")` returns `{}`; `defaultsForTileDiscoveryMethod("nope")` returns `{}`.

## Non-goals

- **No runtime behavior change.** `effects.js` continues to switch on the string `method` values. Refactoring its switch onto the catalog is a separate cleanup.
- **No new methods.** The catalog enumerates exactly the 5 methods that already exist at runtime.
- **No catalog editing UI.** Like `abilities.js` and `toolPowers.js`, the catalog is code-owned.
- **No save-schema change.** `tileUnlocks` shape in the draft is unchanged.
- **No type field consolidation.** Today the `resourceKey` picker in PowersTab actually allows both tile and resource keys (it iterates `BIOMES[*].resources`, which includes both kinds — a known conflation tracked separately in `CLAUDE.md`). The catalog uses `type: "resourceKey"` to match this existing behavior; no separate `tileKey` type is introduced.

## Files touched

| File | Change |
|---|---|
| `src/config/tileDiscoveryMethods.js` | NEW — catalog + helpers |
| `src/balanceManager/wiki/concepts.js` | ADD — one descriptor entry |
| `src/balanceManager/tabs/TileDiscoveryReferenceTab.jsx` | NEW — reference tab |
| `src/balanceManager/index.jsx` | ADD — lazy import + TABS entry |
| `src/balanceManager/tabs/PowersTab.jsx` | EDIT — replace hardcoded array + conditionals with catalog-driven loop |
| `src/__tests__/tile-discovery-catalog.test.js` | NEW — drift / typo / defaults tests |

## Verification

- `npm test` — new catalog test passes; existing balance-manager tests still pass.
- `npm run lint` — clean.
- Manual: open `/b/#/tiles`, select a tile with each of the 5 methods, confirm fields render correctly; switch a tile from `chain` → `research` → `buy` → `daily` → `default` and back, confirm defaults seed.
- Manual: open `/b/#/wiki`, switch to "Tile Discovery Methods" sub-tab, see 5 cards.
- Manual: open `/b/#/tileDiscovery`, see 5 method cards each listing the tiles that use them.
- `npm run test:visual` — discovery panel layout is unchanged for the 4 existing methods; if `daily` rendering introduces a visual diff on any matrix scenario, refresh goldens with `npm run test:visual:update`.
