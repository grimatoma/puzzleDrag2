# Port the docs/zones Atlas to Playable Zones (one end-to-end)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

`docs/zones/` holds a fully-designed, collision-verified atlas of 10 themed settlement zones (Mirefen Hollow, Cinderhold, Hoarfrost Hold, Sunspire Oasis, Gullcliff, Thornwild Canopy, Glimmerdeep, Aetherreach, Gravemoor, plus the grand-boulevard Goldgrass) — each with a unique environment, growth topology, tier ladder, hazards, boss, and a **top-down 40×30 Grow layout** that's already in the game's pixel coordinate space. **None of it is reachable in the game.** The shipped world is the 11-node Hearthwood cartography map (`home`, `meadow`, `orchard`, `crossroads`, `quarry`, `caves`, `fairground`, `forge`, `pit`, `harbor`, `oldcapital`), and only `home` + `quarry` have authored tier ladders + town maps. The two name sets are completely disjoint.

This project ports **exactly one** docs/zones zone into the playable cartography so a player can travel to it, watch it grow rung-by-rung via `TIER_UP`, and build on its themed layout. Doing one end-to-end proves the data-driven pipeline (atlas layout → `resolveLots()` → `townMaps.ts` → tier ladder → `TownScene` render) and the test-enforced invariants, so the remaining nine become a repeatable, mechanical port rather than a research problem. Art is arriving incrementally (the seasonal pixel-art transition is mid-flight), so the zone ships on the existing Tuxemon ground tileset + placeholder building art — engineering does not wait on art.

**Recommended target zone: Mirefen Hollow (`mirefen`).** It is the lowest-level design (`level: 3`), its layout `resolveLots()` runs clean today (verified: 15 lots, tiers 3/6/10/15), and its theme (a fishing stilt-town) maps naturally onto an existing **harbor/fish** settlement type. Pick a different zone only if you have a reason; the recipe below is zone-agnostic.

## Background & current state (VERIFIED)

I opened every file below and ran `resolveLots` headlessly. Corrections to the seed brief are flagged **[CORRECTION]**.

### The shipped cartography (SHIPPED)
- `src/features/cartography/data.ts` — `MAP_NODES: MapNode[]` (11 nodes, lines 229–454). Each node carries `boards`, `entryCost`, `dangers`, `buildings: BuildingId[]`, `plotCount`, and optionally `tiers?: ZoneTier[]` and `requiresZoneTier?: {zone,tier}`.
- Only **`home`** (lines 252–285, 6 rungs Camp→Manor, plots `3/6/9/12/16/20`) and **`quarry`** (lines 346–376, 6 rungs Dig Site→Foundry City, plots `2/4/6/8/10/12`) have `tiers[]`. All other nodes are single-layout (`tiers` absent → `tiersForZone` returns `[]`, `maxTier` returns `-1`).
- `ZoneTier` shape (`data.ts:54–60`): `{ id, name, plots, unlocks: BuildingId[], upgradeCost?: { coins?, resources?: Record<string,number> } }`. **Position in the array IS the tier number (0-based).** Rung 0 has no `upgradeCost` (founding is free).
- `MAP_EDGES` (`data.ts:456–471`) defines map connectivity; a new node must be wired in here to be reachable.
- `ZONES` (`src/features/zones/data.ts:339–356`) is **derived** from `MAP_NODES` keyed by node id — add a node or tiers there and `ZONES`/all the tier helpers pick it up automatically. The helpers live in the same file: `tiersForZone` (415), `maxTier` (420), `settlementTier` (425), `currentTierDef` (433), `plotsForTier` (451), `unlockedBuildings` (461). These already work for any tiered node.

### The authored town maps (SHIPPED, only 2 zones)
- `src/ui/town/townMaps.ts` — `TOWN_MAPS: Record<string, AuthoredTownMap[]>` (line 224) keyed by zoneId, indexed by tier. Today: `{ home: HOME_MAPS, quarry: QUARRY_MAPS }`.
- `AuthoredTownMap` (`townMaps.ts:78–85`): `{ groundTiles: number[][] /* 30 rows × 40 cols */, lots: AuthoredLot[], boards?, props?, plaza?, well? }`. `AuthoredLot` = `{ index, cx, cy, w, h }` in **px** within a 1280×960 design space (`TILE=32, COLS=40, ROWS=30`).
- The proven generator pattern is `homeRung(plots)` (`townMaps.ts:150–159`) / `quarryRung(plots)` (210–219): a fixed list of `[col,row]` lot positions (`HOME_LOT_POS`), partitioned into stable-additive stages so `slice(0, plots)` yields each rung. Ground is painted by `homeGround(seed)` (128–142) using the **autotiler** in `roadAutotile.ts` (`blankMask`, `maskDisc`, `maskBandH/V`, `maskRect`, `paintSandPaths`). Clean fills only: `GRASS=125`, sand = autotiler blob centre — **never** 26/35/50/51 etc (each carries a baked smudge; see the `T` table in `TownScene.ts:46–56`).
- `getTownMap(zoneId, tier)` (`townMaps.ts:258`) converts an `AuthoredTownMap` → `TownPlan` via `toPlan` (230). `authoredLotCount(zoneId, tier)` (267) is what the invariant test reads.

### How a tier becomes pixels (SHIPPED wiring)
- `src/ui/Town.tsx:236–244`: `tier = settlementTier(state, mapCurrent)`; `townPlan = getTownMap(mapCurrent, tier) ?? buildTownPlan(...)`. **So the moment `TOWN_MAPS[zoneId][tier]` exists, the scene renders it — `TownScene` needs no change to render a new authored map.** `TownScene.ts` consumes `plan.groundTiles` and paints straight from it (`TownPlan.groundTiles`, lines 17–42).
- `Town.tsx:310` filters buildable buildings to `unlockedBuildings(mapCurrent, tier)` (cumulative union). `Town.tsx:141–144` shows the tier-up CTA banner for any tiered, non-top-rung zone.
- **[CORRECTION] The seed brief says "wire TownScene to render it."** TownScene already renders any authored map generically. The only "wiring" is adding the `TOWN_MAPS` entry + the node's `tiers[]`; no `TownScene.ts` edit is required for rendering. (A `TownScene.ts` edit is only needed if you add *new themed prop kinds* — e.g. a stilt platform — beyond the existing `signpost`/`lamppost`/trees/rocks; that is optional polish, out of scope.)

### TIER_UP & the slice footgun (VERIFIED — IMPORTANT CORRECTION)
- **[CORRECTION] The seed brief implies this project must "add an action" and therefore "depends on the slice footgun."** It does **not**. `TIER_UP` already exists as a **core reducer case** in `src/state.ts:749–779` (not a feature slice). It validates coins + zone-inventory resources against `currentTierDef(zone, cur+1).upgradeCost`, deducts, and bumps `settlements[zoneId].tier`. Because it's handled in `coreReducer` (which returns a *new* state reference on success), it never touches `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` (`state.ts:1590` / `1639`).
- **Net: porting a zone by re-skinning an existing node OR adding a new node introduces NO new action, so the slice footgun does not apply to this project.** Keep the footgun on your radar **only** if you decide to add a brand-new action type (e.g. a zone-specific hazard or signature-mechanic action) — then it must be registered in `SLICE_PRIMARY_ACTIONS` or it silently no-ops, and the `check-slice-action` skill applies. This project does not require that.

### Persistence (VERIFIED — narrower than the seed implies)
- `SAVE_SCHEMA_VERSION = 45` (`src/constants.ts:207`). `src/state/persistence.ts:23` discards any save whose `version !== 45` — **no migration ladder exists**; a bump WIPES every save.
- `persistStateNow` (`persistence.ts:34–45`) serializes the **entire** `GameState` minus `VOLATILE` keys. `state.settlements` is **already persisted today** (FOUND_SETTLEMENT/TIER_UP write `settlements[zoneId] = { founded, biome?, tier }`).
- **[CORRECTION] The seed says this project "touches saved shape → depends on doc 08 (migration)." Re-skinning `home`/`quarry` or adding tiers to an existing untiered node does NOT change the persisted *shape*** — `settlements[zoneId].tier` is the exact shape already saved. Adding a *new* MAP_NODE also doesn't change the shape (`settlements`, `built`, `inventory` are all keyed dynamically by zoneId). **A `SAVE_SCHEMA_VERSION` bump is required only if your port REPOSITIONS lots on an *already-tiered, already-shipped* zone** (i.e. you re-skin `home` or `quarry`), because a persisted `built[zone]._plots` map stores buildingId→lotIndex and moving a lot index would orphan a built building. Per the `growing-settlement-layout` skill ("Bump `SAVE_SCHEMA_VERSION` … old saves are discarded, which frees you to reposition"), bump in that case. **The recommended Mirefen path (a NEW node) needs no bump** because no save can already reference `mirefen`. If you bump, depend on doc 08 (`docs/projects/08-*` save-migration ladder) if it exists; otherwise the bump simply discards old saves (acceptable pre-launch, but call it out in the PR).

### The docs/zones design system (DESIGN-ONLY — the source content)
- `docs/zones/data/zones.mjs` — the 10+1 zone specs (`ZONES[]`): env/palette, `topology`, `tiers[]` (`{id,name,plots,change,unlocks,cost}`), `buildings[]`, `hazards`, `boss`, `signature`, `newResources`, `tiles`. **Verified tier ladders are 4–5 rungs, NOT 6:** `mirefen 3/6/10/15`, `cinderhold 3/6/10/14`, `hoarfrost 3/6/10/15`, `sunspire 3/6/10/14/20`, `gullcliff 3/6/10/15`, `thornwild 3/6/10/15`, `glimmerdeep 3/6/10/14/20`, `aetherreach 3/6/10/14/18`, `gravemoor 3/6/10/15`, `goldgrass 4/8/14/20/26`. (Home/quarry use a 6-rung shape — **the ported zone keeps its own ladder length; do not force it to 6.**)
- `docs/zones/data/layouts/<id>.mjs` — the top-down layout per zone: `roads[]`, `foot{}` (per-lot footprint), `spec[]` (each `{ i, road, side, along, t, sb }` where `t` = the tier the lot first appears at), `landmark`, `plaza?`, `features[]`. **Already in 1280×960 px** — the same space as `townMaps.ts`.
- `docs/zones/lib/geometry.mjs` — `resolveLots(Z)` turns `spec`+`roads`+`foot`+`setback` into `{ index, cx, cy, w, h, t, side }[]` — **exactly the `AuthoredLot` shape plus a `t` tier tag.** `verifyLayout(Z, zoneSpec)` asserts the growing-settlement contract: no lot overlaps another lot / road / landmark / plaza, all in-bounds, and **per-tier cumulative reveal counts (`lots.filter(l => l.t <= tier).length`) equal the ladder's `plots`.** This is the same stable-additive contract the game test enforces.
- **VERIFIED** by running `resolveLots(mirefen)`: 15 lots; tier 0 adds indices 0–2 (cumulative 3), tier 1 adds 3–5 (6), tier 2 adds 6–9 (10), tier 3 adds 10–14 (15). `lot[0] = {index:0, cx:416, cy:398, w:120, h:100, t:0}`. **The port is mechanical: run `resolveLots`, group by `t`, emit per-rung maps.**
- Cost-shape mismatch to bridge: docs/zones uses `cost: { coins, res: {...} }`; the game's `ZoneTier.upgradeCost` uses `{ coins?, resources: {...} }` (rename `res`→`resources`). Tier 0's `cost` is `null` in docs/zones → omit `upgradeCost` on rung 0 in the game.
- **No-softlock rule** (enforced by `docs/zones/build.mjs:22–52`): every gating resource must be a base/board resource the zone can produce early, or a documented `newResource`. Some docs/zones gates use new resources (`fenmead`, `obsidian`, `spice`, etc.) that **may not exist in the game's `ITEMS`/recipes yet.** When porting costs you must map each `res` key to a real game resource id (see `src/constants.ts` `ITEMS`) — substitute a real producible resource for any unported design-only resource. This is the one place the port needs judgment, not mechanics.

## Scope

**In scope**
- Port **one** docs/zones zone (recommend `mirefen`) into the playable game, end-to-end:
  - Add it to the cartography: either (A) a **new `MAP_NODE`** (recommended for `mirefen` — a fishing zone with `kind:"fish"`), wired into `MAP_EDGES`, with `boards`, `entryCost`, `dangers`, `buildings`, `plotCount`, `requiresZoneTier?`; or (B) re-skin an existing node (then mind the SAVE_SCHEMA bump).
  - Author its `tiers[]` ladder on the node (rung names/plots/`unlocks` from `docs/zones/data/zones.mjs`, with building ids mapped to real `BuildingId`s and `upgradeCost` resources mapped to real producible game resources).
  - Author its per-rung `AuthoredTownMap[]` in `townMaps.ts` by porting `docs/zones/data/layouts/<id>.mjs` through `resolveLots()` (lots) + the `roadAutotile` mask helpers (ground), following the `homeRung`/`quarryRung` pattern. Register it in `TOWN_MAPS`.
  - Satisfy the three test-enforced invariants (see Validation): `authoredLotCount === plotsForTier` per rung; lot indices stable across rungs; `union(tiers.unlocks) === node.buildings`.
- Add a small unit test asserting the new zone ports cleanly (mirrors the existing `zone-tier-ladder.test.ts` patterns, generalized to the new zone).
- Use existing ground tiles + placeholder building art (no new art required to ship).
- Run `graphify update .` after code changes.

**Out of scope / non-goals**
- Porting the other nine zones (this proves the path; the rest are follow-ups).
- New game **mechanics**: the zone's signature mechanic, hazards, boss reflavours, and `newResources` from the design are **not** implemented — the zone uses the existing board kind, existing hazards, and resource-only tier costs mapped to existing resources. (Adding any of those would introduce new actions → the slice footgun, and balance/resource pipeline work — explicitly deferred.)
- New themed `TownScene` prop kinds (stilt platforms, boardwalk autotile pieces, lava channels). Ground uses the existing Tuxemon tileset + grass/sand autotiler; themed terrain is a later art pass.
- New PixelLab tiles/seasonal art.
- A `SAVE_SCHEMA_VERSION` bump — **unless** you choose path (B) re-skin and reposition lots on `home`/`quarry`. The recommended new-node path needs none.
- Touching the docs/zones generator/data (it's the source of truth; we read from it, we don't rewrite it).

## Implementation plan

Concrete steps for the recommended **`mirefen` as a new fish node**. (For a re-skin or a different zone, the shape is identical; only the node id/kind/edge wiring and the SAVE_SCHEMA note differ.)

### 1. Confirm the source layout resolves cleanly
```bash
node docs/zones/layoutVerify.mjs mirefen
# expect: ✓ mirefen — 15 lots, collision-free, 4 tiers match ladder
```
If it fails, fix the layout first (it passes today). This guarantees the lots you're about to port satisfy the growing-settlement contract.

### 2. Generate the AuthoredLot positions from the design (one-off helper)
Run `resolveLots` and capture the per-tier lot lists. Use this throwaway script (do **not** commit it):
```js
// scratch: node this from docs/zones/
import { resolveLots } from "./lib/geometry.mjs";
const Z = (await import("./data/layouts/mirefen.mjs")).default;
const lots = resolveLots(Z); // [{index,cx,cy,w,h,t,side}]
const PLOTS = [...new Set(Z.spec.map(s => s.t))].sort()
  .map(t => lots.filter(l => l.t <= t).length); // cumulative -> [3,6,10,15]
console.log(JSON.stringify({ PLOTS, lots: lots.map(l => [l.index,l.cx,l.cy,l.w,l.h]) }, null, 0));
```
You now have the exact `{index,cx,cy,w,h}` for all 15 lots and the cumulative plot ladder `[3,6,10,15]`.

### 3. Author the node + tiers in `src/features/cartography/data.ts`
Add a `MapNode` to `MAP_NODES` (place it logically; e.g. near `harbor`). Map design names → real `BuildingId`s (only ids in the `BuildingId` enum, `src/types/catalog/buildings.ts`) and design `res` costs → real producible resources (`src/constants.ts` `ITEMS`). Sketch:
```ts
{
  id: "mirefen", name: "Mirefen Hollow", kind: "fish", icon: "🪷",
  x: 30, y: 90, level: 3, region: "coast",
  description: "A stilt-town strung across black water on golden boardwalks.",
  activities: ["Harvest fish tiles", "Grow the stilt-town"],
  boards: { fish: cloneFishBoard(FISH_BOARD_HARBOR) },   // reuse existing fish board template
  entryCost: { coins: 100 },
  dangers: [],                                            // reuse-only; design hazards deferred
  buildings: [/* the UNION of every tier's unlocks below, deduped */],
  plotCount: 15,                                          // top rung
  // requiresZoneTier: { zone: "home", tier: 4 },         // OPTIONAL gate (quarry uses this)
  tiers: [
    { id: "stilt",   name: "Fishing Stilt",  plots: 3,
      unlocks: [BuildingId.Hearth, BuildingId.Housing, BuildingId.Fishmonger] },              // rung 0: no upgradeCost
    { id: "bogwalk", name: "Bogwalk Hamlet", plots: 6,
      unlocks: [BuildingId.Larder, BuildingId.HarborDock, BuildingId.Watchtower],
      upgradeCost: { resources: { plank: 16, fish_fillet: 8 } } },                            // res: from design (real ids)
    { id: "village", name: "Mire Village",   plots: 10,
      unlocks: [BuildingId.Apiary, BuildingId.Brewery, BuildingId.Apothecary, BuildingId.Smokehouse],
      upgradeCost: { resources: { plank: 22, fish_fillet: 14 } } },
    { id: "town",    name: "Fen Town",       plots: 15,
      unlocks: [BuildingId.Inn, BuildingId.Chapel, BuildingId.CaravanPost, BuildingId.Granary, BuildingId.Observatory],
      upgradeCost: { resources: { plank: 30, /* design "fenmead" → substitute a real producible end-good, e.g. */ fish_oil: 10 } } },
  ],
}
```
- **CRITICAL invariant**: `buildings[]` MUST equal the deduped union of all `tiers[].unlocks` (test `superset invariant`). Build `buildings[]` *from* the unlocks to avoid drift.
- **CRITICAL**: every resource key in `upgradeCost.resources` must be a real, early-producible game resource (no design-only `fenmead`/`obsidian`/etc. unless you actually port them — deferred). Verify against `src/constants.ts` `ITEMS`.
- Add `["home","mirefen"]` (or the appropriate connection) to `MAP_EDGES` so the node is reachable. Add the node to `REGIONS`'s coast cluster only if you want it grouped (cosmetic).
- No change needed in `src/features/zones/data.ts` — `ZONES` derives from `MAP_NODES` automatically.

### 4. Author the town maps in `src/ui/town/townMaps.ts`
Follow the `homeRung`/`quarryRung` pattern. Paste the lot data from step 2 and write a ground painter using the mask helpers. Sketch:
```ts
// ── Mirefen (fish) ladder · 4 rungs (3/6/10/15) ──
const MIREFEN_PLOTS = [3, 6, 10, 15];
// index → [cx,cy,w,h] straight from resolveLots(mirefen) (step 2 output).
const MIREFEN_LOTS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 416, 398, 120, 100], [1, 696, 398, 120, 100], /* … all 15, index first … */
];
const mlot = (i: number): AuthoredLot => {
  const [index, cx, cy, w, h] = MIREFEN_LOTS[i]; return { index, cx, cy, w, h };
};
const MIREFEN_FISH_BOARD: AuthoredBoard = { kind: "fish", cx: 1140, cy: 470, w: 220, h: 520 };
function mirefenGround(seed: number): Grid {
  const g = blankGrid(GRASS);
  const m = blankMask(ROWS, COLS);
  // describe boardwalks/platform yard as a sand MASK in TILE units (px/32), then autotile:
  maskBandH(m, /* col a */, /* col b */, /* row */, /* width≥2 */);  // spine boardwalk
  // …mirror the design's roads[] (convert px→tiles: floor(px/32))…
  paintSandPaths(g, m);
  decorateGrass(g, seed);
  return g;
}
function mirefenRung(plots: number): AuthoredTownMap {
  return {
    groundTiles: mirefenGround(plots),
    plaza: { cx: 570, cy: 392, rx: px(4), ry: px(2) },   // ≈ design landmark
    well:  { cx: 570, cy: 392, r: 20 },
    boards: [MIREFEN_FISH_BOARD],
    props: [{ kind: "signpost", x: 470, y: 135 }],
    lots: MIREFEN_LOTS.slice(0, plots).map(([index]) => mlot(index)),
  };
}
const MIREFEN_MAPS: AuthoredTownMap[] = MIREFEN_PLOTS.map(mirefenRung);
// register:
export const TOWN_MAPS: Record<string, AuthoredTownMap[]> = { home: HOME_MAPS, quarry: QUARRY_MAPS, mirefen: MIREFEN_MAPS };
```
- Ground is a **placeholder** of grass + autotiled sand "boardwalk" strips — it does not need to look like a real stilt-town; correct lot counts/positions on a navigable ground is the bar (the existing home/quarry maps are explicitly "functional placeholders", `townMaps.ts:16`).
- **Stable-additive lots are free**: `MIREFEN_LOTS` is ordered by index and `slice(0, plots)` yields each rung, exactly like `HOME_LOT_POS`. Because `resolveLots` already orders by `spec` and the design's `t` is cumulative, index `i` is at the same `cx,cy,w,h` in every rung.

### 5. Add the unit test
Generalize the patterns from `src/__tests__/zone-tier-ladder.test.ts` to cover `mirefen` (the existing `for (const node of MAP_NODES)` superset loop and the `for (const [zoneId, maps] of Object.entries(TOWN_MAPS))` lot-count loop will **already** include `mirefen` once it's added — so much of this is automatic). Add a focused test (see Validation) for the new zone's ladder shape + reachability.

### 6. Validate, verify in-game, update graph
Run the gating commands (Validation), do the in-game check, then `graphify update .`.

## Success criteria

- [ ] `node docs/zones/layoutVerify.mjs mirefen` passes (source layout is contract-clean).
- [ ] `mirefen` (or chosen zone) exists in `MAP_NODES` with a `tiers[]` ladder whose `plots` match the design (`3/6/10/15` for mirefen) and is reachable via a `MAP_EDGES` entry.
- [ ] `TOWN_MAPS["mirefen"]` has one `AuthoredTownMap` per rung, each with `lots.length === tiers[tier].plots`.
- [ ] `node.buildings[]` equals the deduped union of all `tiers[].unlocks` (no extras, no missing).
- [ ] Every `upgradeCost.resources` key is a real game resource id present in `src/constants.ts` `ITEMS` (no design-only resource leaks in).
- [ ] Lot index `i` has identical `{cx,cy,w,h}` across every rung that contains it (stable-additive).
- [ ] `npm test` green (existing `zone-tier-ladder.test.ts` invariants now also cover the new zone), plus the new focused test.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` all green.
- [ ] In-game: travel to the zone, the themed town renders from the authored map (not the procedural fallback), the tier-up CTA appears, and `TIER_UP` grows the settlement rung-by-rung with the plot count increasing and new buildings unlocking.
- [ ] No `SAVE_SCHEMA_VERSION` bump for the new-node path (or, if you re-skinned an already-tiered node, a documented bump + PR call-out).
- [ ] `graphify update .` run after code changes.

## Validation — how to verify

**Gating (must pass before PR):**
```bash
node docs/zones/layoutVerify.mjs mirefen   # source layout contract (informational but must pass)
npm run lint
npm run typecheck
npm test                                    # vitest; node env, fake localStorage, NO canvas
npm run build
```
- `npm test` runs `src/__tests__/zone-tier-ladder.test.ts`. Its `superset invariant` block loops **every** `MAP_NODES` entry with `tiers`, and its `authored town maps` block loops **every** `TOWN_MAPS` entry — so adding `mirefen` automatically subjects it to: `authoredLotCount(zoneId,tier) === plotsForTier(zoneId,tier)`, `getTownMap(...).lots.length === plotsForTier(...)`, lot-index stability across rungs, and `union(tiers.unlocks) === buildings`. A wrong plot count, a moved lot, or a buildings/unlocks mismatch fails here — these are your primary safety net.

**New tests to add** (in a new file e.g. `src/__tests__/zone-mirefen-port.test.ts`, or extend the existing file):
- `it("mirefen is reachable on the cartography graph")` — assert `MAP_EDGES` contains an edge touching `"mirefen"` and `MAP_NODES.find(n => n.id === "mirefen")` is defined.
- `it("mirefen ladder matches the design plot ramp")` — assert `tiersForZone("mirefen").map(t => t.plots)` `.toEqual([3,6,10,15])` and `maxTier("mirefen") === 3`.
- `it("mirefen tier costs reference real resources")` — for each `tier.upgradeCost?.resources`, assert every key is in the game's resource set (import `ITEMS` from `src/constants.ts` and check membership). This catches a leaked design-only resource that the broad invariant tests do NOT.
- `it("TIER_UP grows mirefen")` — seed a state at `mirefen` tier 0 with the rung-1 resources in the zone inventory (mirror the `TIER_UP reducer` test's `patchInventory(s, patch, "mirefen")` pattern), dispatch `{ type:"TIER_UP", payload:{ zoneId:"mirefen" } }`, assert `settlementTier(s,"mirefen") === 1`.

**Manual in-game check** (canvas has zero unit coverage; this is the only way to see the render). On this Windows host, `preview_screenshot` HANGS and `:5173` serves `main` — spin a worktree Vite on a spare port:
```bash
node ../../../node_modules/vite/bin/vite.js --port 5199 --base /puzzleDrag2/
```
Then in the browser console (DOM/`window` asserts, not screenshots):
```js
// travel to the new zone and confirm the authored map is rendering
window.__hearthVisual.dispatch({ type: "CARTO/TRAVEL", payload: { zoneId: "mirefen" } });
window.__phaserScene.plan.lots.length            // === plotsForTier at current tier (3 at rung 0)
window.__phaserScene.plan.groundTiles.length     // === 30 (authored map present, not procedural)
// grow a rung (after granting resources), then confirm the plot count climbs:
window.__hearthVisual.dispatch({ type: "TIER_UP", payload: { zoneId: "mirefen" } });
window.__hearthVisual.state().settlements.mirefen.tier   // increments
```
Assert the tier-up CTA banner via DOM + `getComputedStyle` (it's a React element in `Town.tsx`, not canvas).

**Visual goldens** (`npm run test:visual`): **informational only.** Goldens are NOT regenerable on this Windows host (DOM drifts 3–5%, Phaser canvas ~38% from GPU/fonts) and are NOT in CI. A new town scenario may need a golden re-baseline on a canonical host — note it in the PR; do not trust or commit a local regen.

## Double-check / adversarial review

- **Prove the authored map actually rendered (not the procedural fallback).** `Town.tsx:239` falls back silently to `buildTownPlan` when `getTownMap` returns null. Confirm `getTownMap("mirefen", 0)` is non-null *and* that `window.__phaserScene.plan.groundTiles` exists in-game (the procedural plan has no `groundTiles`). If you see a generic green grid with scattered lots, the fallback fired — your `TOWN_MAPS` key is wrong or the tier index is out of range.
- **Prove a dormant path now fires.** Before this change, traveling to any node other than `home`/`quarry` always produced a procedural plan (no node had both `tiers[]` and a `TOWN_MAPS` entry). After: traveling to `mirefen` must produce the authored plan AND a working tier-up CTA. That CTA path (`Town.tsx:141`) previously only ever lit for `home`/`quarry`.
- **The buildings/unlocks union is the easiest thing to get subtly wrong.** A building listed in `buildings[]` but in no tier's `unlocks` (or vice-versa) fails the superset test. Generate `buildings[]` *from* the unlocks; don't hand-type both.
- **Resource leak check.** The broad invariant tests do NOT validate that `upgradeCost` resources exist — a typo'd or design-only resource (`fenmead`) will pass `npm test` but make the rung un-upgradeable forever (silent softlock). The new "tier costs reference real resources" test is the guard; run it and read `src/constants.ts` `ITEMS` yourself.
- **Lot stability under a real build.** Build a building at rung 0 lot 0, grow to rung 1, confirm the building didn't jump lots. (`built[zone]._plots` maps buildingId→index; if a lot moved, the building renders at the wrong place or detaches.) This is exactly why a re-skin of an *already-shipped* tiered zone needs the SAVE_SCHEMA bump and a new node does not.
- **Edge wiring.** A node not in `MAP_EDGES` is unreachable on the map even though all data is correct — verify travel works in-game, not just that the node object exists.
- **Rollback safety.** New-node path: revert the three edits (`cartography/data.ts`, `townMaps.ts`, the test) and the zone vanishes; no saved data references it, so existing saves are unaffected. Re-skin path: rolling back after a SAVE_SCHEMA bump means players who loaded post-bump already lost their pre-bump save — prefer the new-node path to keep rollback clean.
- **Skeptic's attack: "you only proved one zone."** Correct — that's the goal. Capture the exact `resolveLots → group by t → townMaps` recipe in the PR so zones 2–10 are a checklist, and confirm the recipe is zone-agnostic by spot-checking that `resolveLots(cinderhold)` also yields a clean cumulative ladder (it does: 14 lots, 3/6/10/14).

## Risks & gotchas

- **Design-only resources are the trap.** docs/zones gates rungs on `fenmead`, `obsidian`, `spice`, `crystal`, `aether`, `herbs`, etc. that have NO game `ITEMS` entry/recipe yet. Porting a cost literally creates an unwinnable rung. Map every cost to a real, early-producible resource; defer the new-resource economy work entirely.
- **Tileset smudge tiles.** Use only `GRASS=125` and the autotiler's sand blob; never 26/35/50/51/76/77/98/99 as flat fills (each carries a baked fleck → grid of smudges). See `TownScene.ts:46–56` and the `townMaps.ts:33–41` comment.
- **px vs tile units.** `townMaps` lots are in **px** (1280×960); the `roadAutotile` mask helpers (`maskBandH/V`, `maskRect`, `maskDisc`) take **tile** coords (40×30). docs/zones `roads[]` are in px — divide by `TILE` (32) when converting roads to a mask. Road widths must be ≥2 tiles or the autotiler can't carry a two-sided border (`townMaps.ts:127`).
- **Ladder length is NOT 6.** home/quarry are 6 rungs; docs/zones zones are 4–5. Don't pad the ported ladder to 6 — keep the design's shape. `maxTier` and all helpers are length-driven, so 4 rungs is fine.
- **Cost field rename.** docs/zones `cost.res` → game `upgradeCost.resources`; tier-0 `cost:null` → omit `upgradeCost`.
- **SAVE_SCHEMA only if you re-skin + reposition.** New node: no bump. Re-skinning `home`/`quarry` and moving lots: bump (wipes saves, no migration) and call it out. Don't bump reflexively — it's a save-wipe.
- **Slice footgun is a non-issue here** unless you add a new action (you shouldn't). If you ever do, register it in `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` (`state.ts:1590/1639`) and run the `check-slice-action` skill — otherwise it silently no-ops.
- **Canvas is untested.** No vitest covers `TownScene`; the authored-map *data* is tested but the *render* is only verifiable in-browser. Budget the manual check.

## References

- `src/features/cartography/data.ts` — `MAP_NODES`, `ZoneTier`, `MAP_EDGES`, `home`/`quarry` tier ladders (the templates to copy).
- `src/features/zones/data.ts` — `ZONES` (derived), `tiersForZone`/`maxTier`/`settlementTier`/`currentTierDef`/`plotsForTier`/`unlockedBuildings` (all already generic over any tiered node).
- `src/ui/town/townMaps.ts` — `AuthoredTownMap`, `homeRung`/`quarryRung`, `getTownMap`, `authoredLotCount`, `TOWN_MAPS` (where the new maps register).
- `src/ui/town/roadAutotile.ts` — `blankMask`, `maskDisc/BandH/BandV/Rect`, `paintSandPaths` (ground painter).
- `src/ui/town/TownScene.ts` — `TownPlan` shape, `T` tileset-index table, ground render from `groundTiles` (renders any authored map generically; no edit needed to render).
- `src/ui/Town.tsx:236–244, 310, 141–144` — tier → plan selection, building unlock filter, tier-up CTA.
- `src/state.ts:749–779` — the `TIER_UP` core reducer (already wired); `1590`/`1639` — slice-registration sets (footgun reference).
- `src/state/persistence.ts` + `src/constants.ts:207` — `SAVE_SCHEMA_VERSION = 45`, no-migration save gate.
- `src/__tests__/zone-tier-ladder.test.ts` — the invariants your new zone must satisfy + test patterns to copy.
- `docs/zones/data/zones.mjs` — the zone specs (ladders, unlocks, costs, themes).
- `docs/zones/data/layouts/mirefen.mjs` (+ siblings) — the top-down layouts to port.
- `docs/zones/lib/geometry.mjs` — `resolveLots()` (lot generation) + `verifyLayout()` (contract).
- `docs/zones/layoutVerify.mjs` — headless layout checker (`node docs/zones/layoutVerify.mjs <id>`).
- `docs/zone-tier-ladder.html` — the shipped tier-ladder spec + tileset-index appendix.
- `docs/town-layout/index.html` — the growing-settlement mockup and deferred-build-out notes.
- `.claude/skills/growing-settlement-layout/` — the authored-map contract + the "bump SAVE_SCHEMA when repositioning" note.
- `.claude/skills/zone-design/` — the zone-atlas system, the ten growth topologies, the no-softlock resource rule, `resolveLots`/`layoutVerify` loop.
- `.claude/skills/check-slice-action/` — only if you add a new action.
- Memory: `Zone Atlas 2026-06-17`, `Zone tier ladder 2026-06-13`, `Town layout redesign 2026-06-16`, `Live game preview verify`.
