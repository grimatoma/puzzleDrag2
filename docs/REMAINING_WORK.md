# REFERENCE_CATALOG implementation — remaining work

Snapshot of what's still outstanding from `REFERENCE_CATALOG.md` (now canonical
for HV expansions). Treat this as a living checklist; cross things off in PRs
that ship the work.

> **Last updated:** PR #194 — Grain → Bread + farm category-prefix rename + this doc.

---

## ✅ Shipped

| PR    | Slice                                                                       |
|-------|-----------------------------------------------------------------------------|
| #188  | Catalog content expansion (verbose §7 species tables, missing entries).     |
| #189  | Vegetables → Soup chain end-to-end + Castle Needs system + Brenna worker.   |
| #191  | Full design-bundle icon import (16 modules, ~6 000 lines) + 47 placeholder tile-types/resources. Net test health: 19/86 → 86/86 files. |
| #192  | Fruits → Pie / Flowers → Honey / Herd → Meat / Cattle → Milk / Mounts → Horseshoe chains; 5 new chain-reducer workers. |
| #193  | Birds → Eggs (split tile vs. product) / Trees → Log (feeds existing wood chain) / Coal in Castle Needs UI. |
| #194  | Grain → Bread (flour → bread terminal). Category-prefix rename for the 14 farm-side legacy keys (`hay → grass_hay`, `egg → bird_egg`, etc.) with v13 → v14 save migration. Display-layer prefix-strip helpers in `a11y.js` and `tileCollection/effects.js`. |

---

## ❎ Outstanding chains

### Sea biome (full new biome)

The catalog devotes §6 to a Sea biome with its own counter (voyage supplies),
ship-navigation puzzle, distinct hazard set (sharks, icebergs, storms,
whirlpools), and chest mechanics that differ from Farm/Mine. Resources from
the catalog:

| Tile             | Chain | Product       | Sell  | Buy    | Castle |
|------------------|-------|---------------|-------|--------|--------|
| Shallow Water    | 5     | Salt          | 11◉   | 80◉    | —      |
| Deep Water       | 4     | Water bucket  | 11◉   | 80◉    | —      |
| Spice Island     | 2     | Spice         | 40◉   | 320◉   | —      |
| Cocoa Island     | 2     | Cocoa         | 160◉  | 1280◉  | 33     |
| Squid            | 3     | Ink           | 160◉  | 1280◉  | 12     |
| Silk Island      | 3     | Silk          | 600◉  | 2000◉  | —      |
| Sea Serpent      | 4     | Oil           | 600◉  | 2000◉  | —      |
| Jade Island      | 4     | Jade          | 800◉  | 4000◉  | —      |
| Oyster/Clam      | 4     | Pearl         | 800◉  | 4000◉  | —      |

Sea workers (catalog §9): Deckhand, Fisherman, Boatwoman, Trawlerman,
Harpooner, Oilman, Artisan, Buccaneer, Cook, Chef, Navigator, Confectioner,
Captain, Explorer, Antiquarian, Pirate (16 in total).

Estimated effort: 1–2 weeks. New Phaser scene, new state slice, new
hazard pipeline, ~16 procedural icons (already imported via `toolsSea.js`),
~30 chain-product wiring, market prices, save migration.

### Mine-side category prefix rename

This PR (#194) only renamed the **farm-side** legacy keys. Mine resources
still use unprefixed names: `stone`, `cobble`, `block`, `ore`, `ingot`,
`coal`, `coke`, `gem`, `cutgem`, `gold`, `dirt`. To finish the rename:

- Pick a prefix scheme. Suggested mapping:
    - `stone → stone_raw` (or keep `stone` since it's both a category and the canonical resource — same wart as `grain`)
    - `cobble → stone_cobble`
    - `block → stone_block`
    - `ore → iron_ore`
    - `ingot → iron_ingot`
    - `coal → coal_raw` (or keep)
    - `coke → coal_coke`
    - `gem → gem_rough`
    - `cutgem → gem_cut`
    - `gold → gold_nugget`
    - `dirt → dirt_pile`
- Add the v14 → v15 save migration with the rename map.
- Run the same Python sweep used in #194 across `src/` and `tests/`. **Watch
  for false positives** — `block`, `ore`, and `coal` are short generic words
  that may collide with non-resource uses; review each substitution.
- Ensure mine display-layer (Phaser scene HUD, almanac, etc.) strips the prefix
  same as `displayKey()` already does for farm.

### Bird → Eggs model cleanup

`egg` (the bird tile) and `bird_egg` (post-rename) currently produces `eggs`
on a chain ≥ 6, but the design conflates the singular `egg` tile with the
"eggs" product. PR #193 split them by adding `eggs` as a distinct product;
PR #194's rename made the tile `bird_egg` to remove the visual pun. There's
nothing technically broken, but consider:

- Renaming the `bird_egg` tile to `bird_chicken_nest` or similar to fully
  decouple from the product noun.
- Or splitting into `bird_egg` (the *raw* bird tile that drops eggs as a
  by-product) and `bird_egg_carton` (the product). Either is a balance call.

### Grain → Bread short-circuit

Catalog §4: "Grain (6) → Bread". Our chain is 4-tier (`hay →
grain_wheat → grain → grain_flour → bread`), so reaching bread by chain
requires a *long* chain hierarchy. PR #194 makes bread reachable as the
terminal of the existing chain, but a player following the catalog spec
would expect to chain 6 grain tiles directly into bread.

Options:
- Keep the 4-tier model (current state — bread is far away).
- Insert bread between `grain` and `grain_flour` so chains of 6 grain tiles
  produce 1 bread. Flour becomes a higher-tier product or stays Workshop-only.
- Bypass: set `grain_wheat.next = "bread"` with a higher threshold. Skips
  grain/flour entirely for the bread path.

Pick once a balance pass is done.

---

## ❎ Outstanding workers (catalog §9)

Workers from the catalog not yet implemented:

| Worker          | Chain                    | Effect at max          | Status |
|-----------------|--------------------------|------------------------|--------|
| Peasant         | grass → hay              | 10 grass = 1 hay       | Not built — grass chain is implicit (hay = the tile and the product) |
| Reaper          | grain → bread            | 6 grain = 1 bread      | Not built — bread chain is now wired (PR #194), worker missing |
| Lumberjack      | tree → wood              | 1 tree = 1 wood        | Not built — chain length 1 doesn't fit the threshold model |
| Grain Trader    | grain → vegetable        | 4 grain = 1 vegetable  | Not built — grain ↔ vegetable cross-chain not modeled |
| Gardener        | vegetable → fruit        | 5 vegetable = 1 fruit  | Not built — cross-chain |
| Orchardist      | fruit → flower           | 6 fruit = 1 flower     | Not built — cross-chain |
| Poultryman      | bird → egg               | 8 bird = 1 egg         | Not built |
| Farmer          | bird → herd animal       | 7 bird = 1 herd        | Not built — cross-chain |
| Ratcatcher      | rats → coin              | 10 rats = 1 coin       | Not built — hazard-to-resource conversion not modeled |
| Sapper          | gas → coin               | 7 gas = 1 coin         | Not built — same |
| (mine workers)  | (Digger/Excavator/etc.)  | various                | Not built — see Mine-side prefix rename above |

The biggest model gap is **cross-chain workers** (grain → vegetable, vegetable → fruit, fruit → flower, bird → herd). Our `threshold_reduce_category` effect type only reduces a category's *own* chain threshold; producing a *different* category's tile would need a new effect type, e.g., `chain_redirect_category`.

---

## ❎ Hazards & traits

The §7 species descriptions mention many tags that the engine doesn't yet
enforce:

- **Resistant to swamp** — Rice, Moose, Water Lily, Mushroom, Rambutan
- **Avoided by rats** — Wheat, Coconut, Cypress, Pear, Cucumber
- **Attracts rats** — Manna, Jackfruit (long chain)
- **Avoided by wolves** — Rooster, Sheep, Alpaca, Warthog, Triceratops
- **Attracts wolves** — Wild Goose, Phoenix
- **Eaten by wolves / Eaten by rats** — Cypress / Heather
- **Deadly to pests** — Cypress, Beet, Phoenix
- **Co-collection partners** — Coconut+Palm, Corn+Grass, etc.
- **"Long chain gives X"** overchain bonuses — Buckwheat → herd, Eggplant → veg, Goose → veg, Willow → veg, Broccoli → flowers, Warthog → mounts
- **"Two times more"** yields — Jackfruit → 2× pie, Triceratops → 2× milk
- **Single-tile collect** — Melon, Mammoth
- **Auto-collect on chain made** — Dodo
- **Copies last long-chain bonus** — Pig-in-Disguise
- **Permanent on fields** — Melon

Today these tags are descriptive only. Wiring them up needs:
- A `tags: ["resistant_swamp", "avoids_rats", ...]` field on each
  `TILE_TYPES` entry (probably a parallel data export).
- Hazard-spawn modifier integrating with `state.hazards` and weather.
- Chain-resolution interceptor for "long chain gives X" / "auto-collect" /
  "copies last bonus".

Estimated effort: 1 week per cluster (hazard tags, chain-bonus tags,
free-move tags). Free-moves are already wired (PR #189).

---

## ❎ Castle Needs full hookup

`features/castle/data.js` scaffolds five targets:

| Need  | Target | Status                                                               |
|-------|--------|----------------------------------------------------------------------|
| Soup  | 53     | ✅ wired (PR #189) — UI buttons, chain produces it                  |
| Meat  | 47     | ✅ wired (PR #192) — UI buttons, chain produces it                  |
| Coal  | 43     | ✅ wired (PR #193 UI; chain has existed since Mine launch)          |
| Cocoa | 33     | ❌ scaffolded only — Sea biome chain not built                       |
| Ink   | 12     | ❌ scaffolded only — Sea biome chain not built                       |

Cocoa and Ink unblock once the Sea biome ships.

---

## ❎ Economic balance

PRs #189–#194 carry **placeholder values** for many fields:

- Worker hire costs — picked tier-appropriate amounts from the catalog where
  possible, but not playtested.
- Chain thresholds for placeholder tile types in PR #191 (default 6 — replaced
  per chain in #192/#193, but the 47 imported tile types still default to 6
  for non-chain entries).
- `value` fields in `BIOMES.farm.resources` — most new tiles have `value: 1`,
  meaning no chain-feedback float-text bonus.
- Spawn pool weights — the new categories each have one slot in
  `FARM_TILE_POOL`; balance may need more (or fewer) per category.
- Market prices for *raw* new tiles (vegetables, fruits, flowers, herd,
  cattle, mounts, etc.) — only the **products** have prices; the raw tiles
  aren't sellable. This may be intentional (catalog only lists product
  prices), but worth documenting as a deliberate choice.

A focused **balance pass** PR after Sea ships would be the right place to
tune all of these together.

---

## ❎ Other catalog content not yet built

- **§5 Mine — Mysterious Ore countdown mechanic** (rune-spawning timed tile).
  Not present in the engine.
- **§5 Mine — Three entry tiers** (free / 100◉+10 shovels / 2 runes). Not
  modeled; mine sessions are free.
- **§8 Tools — full inventory.** Many tool icons imported via
  `toolsFarm/toolsMine/toolsPortal/toolsSea.js` (PR #191) but only a subset
  have `WORKSHOP_RECIPES` entries. Missing recipes from the catalog: Sapling,
  Trimmer, Plough, Bird Feed, Hoe, Fruit Picker, Milk Churn, Bee, Wheelbarrow,
  Rifle, Terrier, Hound, Stone Hammer, Iron Pick, Explosives, Flint, Water
  Pump, Drill, Magnet, Silver Pick, Coal Transmuter, Diamond Hammer, Gold
  Pick, Iron Ration, plus all sea tools and most portal/magic tools.
- **§10 Building system — many missing buildings.** Catalog enumerates
  Architect, Archaeologist, Sorceress's Hut, Fishing Net, Spice Guild, etc.
  Current `BUILDINGS` array has the core set (~16); catalog implies ~40+.
- **§11 Castle — passive rune generation.** ~1 rune per 23 h timer with
  Beach property reducing it. Not implemented.
- **§12 Zones — 6 zones + 1 Castle node.** Currently the game has one Farm
  scene and one Mine scene; zones aren't a top-level concept.
- **§13 Quests — Royal quests, Daily rewards, Exploration blockers** beyond
  the basic quest templates.
- **§14 Monetization** — IAP bundles, watch-ads via Sorceress's Hut, etc.
  Out of scope for any near-term PR.

---

## How to keep this doc honest

- Update the **Shipped** table when a PR merges that moves a checklist item.
- When a section becomes ✅ in full, fold it into the Shipped table and
  delete the outstanding entry.
- New catalog gaps discovered during implementation go in the appropriate
  outstanding section with a 1–2 sentence pointer.
