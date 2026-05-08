# REFERENCE_CATALOG implementation — remaining work

Snapshot of what's still outstanding from `REFERENCE_CATALOG.md` (now canonical
for HV expansions). Treat this as a living checklist; cross things off in PRs
that ship the work.

> **Last updated:** Post-quota PR sweep (PRs #226–#265). Fish biome shipped
> end-to-end, every catalog §9 worker is now in the roster, slice coverage
> across the codebase is broadly above 90%, and a sizeable content batch
> landed (recipes, achievements, decorations, buildings).

---

## ✅ Shipped

| PR(s)        | Slice                                                                       |
|--------------|-----------------------------------------------------------------------------|
| #188         | Catalog content expansion (verbose §7 species tables, missing entries).     |
| #189         | Vegetables → Soup chain end-to-end + Castle Needs system + Brenna worker.   |
| #191         | Full design-bundle icon import (16 modules, ~6 000 lines) + 47 placeholder tile-types/resources. Net test health: 19/86 → 86/86 files. |
| #192         | Fruits → Pie / Flowers → Honey / Herd → Meat / Cattle → Milk / Mounts → Horseshoe chains; 5 new chain-reducer workers. |
| #193         | Birds → Eggs (split tile vs. product) / Trees → Log (feeds existing wood chain) / Coal in Castle Needs UI. |
| #194         | Grain → Bread (flour → bread terminal). Category-prefix rename for the 14 farm-side legacy keys. |
| #201         | Mine-side prefix rename. Cross-chain workers via new `chain_redirect_category` effect type. |
| #226         | Save migrations dropped. Tutorial back button + larger touch targets. Sheep / alpaca / ram tile redraws. Touch-drag pointer fallback + tile hit-area. |
| #227         | **Fish biome MVP** (Saltspray Harbor): `BIOMES.fish`, `FISH_TILE_POOL`, fish thresholds, cartography wiring, biome-entry portrait. |
| #228         | Fish biome **tide cycle** — 3-turn flip + bottom-row mutation, HUD `TideChip`. |
| #229         | Fish biome **recipes** — chowder + bottled fish oil + market prices. |
| #230         | **Reaper** apprentice (grain_flour 6 → 4 at max). |
| #231–#232,#234,#239,#248,#250–#257 | **Coverage rounds 1–9 + misc** — market / mood / settings / castle / story / tutorial / utils / aggregate / portal / mine hazards / tile collection / a11y keyboard / story.js / pricing / bosses / farm pool. |
| #233         | **Poultryman** apprentice (`threshold_reduce_category` on bird, 6 → 4). |
| #235         | Fish biome **Pearl rune-capture** mechanic (mirror of mysterious-ore). |
| #236         | **Harbor entry tiers** (`HARBOR/ENTER`, mirror of `MINE_ENTRY_TIERS`). |
| #237         | **Storm boss** (fish biome; `min_chain: 4`). |
| #238         | Sea workers round 1 — **Fisherman**, **Trawlerman**. |
| #240         | **Three fish-biome achievements** + `fish_chained` counter. |
| #241         | Sea workers round 2 — **Boatwoman**, **Harpooner**, **Oilman**. |
| #242         | **Fish-biome quest templates** (4 collect + 2 craft). |
| #243         | Sea workers round 3 — **Cook**, **Chef**, **Captain**. |
| #244         | Sea workers round 4 — **Explorer**, **Navigator**, **Confectioner**, **Deckhand**. |
| #245         | Mine workers round 1 — **Stone Miner**, **Coal Miner**, **Jeweler**, **Digger**, **Excavator**. |
| #246         | Mine workers round 2 — **Iron Miner**, **Silver Miner**, **Engineer**, **Alchemist**, **Sculptor**. |
| #247         | Catalog §9 farm leftovers — **Peasant**, **Lumberjack**. |
| #249         | Hazard-counter workers — **Ratcatcher** (new `hazardCoinMultiplier`), **Sapper** (cave_in spawn reduce). |
| #258         | **Mine-biome quest templates** (5 collect + 3 craft). |
| #259         | Five new decorations (driftwood_arch, pearl_fountain, fishing_dock, cobble_well, smelter_brazier). |
| #261         | **Three mine-biome achievements** + `mine_chained` counter. |
| #262         | Per-category achievements (veg / fruit / flower / herd). |
| #263         | Five workshop tools — Hoe, Stone Hammer, Iron Pick, Bird Feed, Sapling. |
| #264         | Three new buildings — Harbor Dock, Fishmonger, Smokehouse. |
| #265         | Per-category achievements round 2 (cattle / mount / tree / bird). |

---

## ❎ Outstanding chains

### Sea biome — partial

The MVP fish biome (Saltspray Harbor) shipped in #227, with tide cycle (#228),
recipes (#229), pearl mechanic (#235), entry tiers (#236), Storm boss (#237),
and the full sea-worker slate (#238/#241/#243/#244). What's still **not** in
the catalog spec:

- **Voyage supplies counter** — the catalog frames the Sea biome with its own
  per-trip "supplies" resource. Today the harbor uses the standard
  10-turn season; voyage-supplies is unmodelled.
- **Ship navigation puzzle** — the catalog suggests a chart-based travel
  metagame distinct from chain harvesting. Not implemented.
- **Distinct hazards** (sharks, icebergs, storms, whirlpools) — only the
  Storm boss exists; per-turn hazard pipeline for fish hasn't been built.
- **Chest mechanics** — catalog references treasure-chest pulls; not
  implemented.
- **Catalog tile coverage** — our fish biome ships 5 board tiles
  (sardine / mackerel / clam / oyster / kelp) plus `fish_pearl`. The
  catalog lists a richer Sea board: Shallow Water → Salt, Deep Water →
  Water bucket, Spice / Cocoa / Squid / Silk / Sea Serpent / Jade. Those
  are not yet on the harbor pool.

### Bird → Eggs model cleanup (deferred)

Same situation as before; flagged for a balance pass.

### Grain → Bread short-circuit (deferred)

Same situation as before; flagged for a balance pass.

---

## ✅ Outstanding workers (catalog §9) — all shipped

| Worker          | Status |
|-----------------|--------|
| Peasant / Reaper / Lumberjack            | ✅ #247 / #230 / #247 |
| Grain Trader / Gardener / Orchardist     | ✅ #201 |
| Poultryman / Farmer                      | ✅ #233 / #201 |
| Ratcatcher / Sapper                      | ✅ #249 |
| Mine roster (Digger / Excavator / Stone Miner / Iron Miner / Coal Miner / Silver Miner / Jeweler / Engineer / Alchemist / Sculptor) | ✅ #245 + #246 (plus pre-existing Canary + Geologist) |
| Sea roster (Deckhand, Fisherman, Boatwoman, Trawlerman, Harpooner, Oilman, Cook, Chef, Navigator, Confectioner, Captain, Explorer) | ✅ #238 / #241 / #243 / #244. Antiquarian / Artisan / Buccaneer / Pirate need a new "treasure" effect type — not yet shipped. |

---

## ❎ Hazards & traits (still unwired)

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

Wiring needs:
- A `tags: ["resistant_swamp", "avoids_rats", ...]` field on each `TILE_TYPES`
  entry (probably a parallel data export).
- Hazard-spawn modifier integrating with `state.hazards` and weather.
- Chain-resolution interceptor for "long chain gives X" / "auto-collect" /
  "copies last bonus".

Estimated effort: 1 week per cluster (hazard tags, chain-bonus tags,
free-move tags). Free-moves are already wired (PR #189).

---

## ❎ Castle Needs full hookup

| Need  | Target | Status                                                               |
|-------|--------|----------------------------------------------------------------------|
| Soup  | 53     | ✅ wired (PR #189) — chain produces it                              |
| Meat  | 47     | ✅ wired (PR #192) — chain produces it                              |
| Coal  | 43     | ✅ wired (PR #193 UI; chain has existed since Mine launch)          |
| Cocoa | 33     | ⚠️ scaffolded only — re-pointed to `berry_jam` until a real cocoa  |
|       |        | resource lands (would need a fish-biome / sea-biome resource).      |
| Ink   | 12     | ⚠️ scaffolded only — re-pointed to `bird_egg`. Could be re-pointed |
|       |        | to a fish-biome `fish_oil_bottled` once the Sea-biome squid → ink   |
|       |        | chain ships.                                                         |

---

## ❎ Economic balance

PRs #189–#194 + the fish-biome PRs (#227, #229, #236) carry placeholder
values for many fields:

- Worker hire costs — picked tier-appropriate amounts from the catalog
  where possible, but not playtested.
- Chain thresholds for placeholder tile types (default 6 for many imported
  species).
- `value` fields in `BIOMES.farm.resources` — many new tiles have
  `value: 1`, meaning no chain-feedback float-text bonus.
- Spawn pool weights — most new categories have one slot in
  `FARM_TILE_POOL`; balance may need more (or fewer) per category.
- Market prices for *raw* new tiles (vegetables, fruits, flowers, herd,
  cattle, mounts, etc.) — only the products have prices; the raw tiles
  aren't sellable. May be intentional, but worth documenting as a
  deliberate choice.

A focused **balance pass** PR is the right place to tune all of these
together once the Sea biome's deeper content (voyage supplies, treasure
mechanics) lands.

---

## ❎ Other catalog content not yet built

- **§8 Tools — most of the catalog tool list is wired** (PR #263 added
  Hoe / Stone Hammer / Iron Pick / Bird Feed / Sapling on top of the
  earlier rake / axe / fertilizer / cat / scythe / bird_cage / rifle /
  hound / cobblepath / lantern / etc.). Still missing:
  Plough, Trimmer, Wheelbarrow, Drill, Magnet, Silver Pick, Coal
  Transmuter, Diamond Hammer, Gold Pick, Iron Ration, plus all sea tools
  beyond fish_oil_bottled, and most portal/magic tools (only `magic_wand`,
  `hourglass`, `magic_seed`, `magic_fertilizer` are wired today).
- **§10 Building system — many missing buildings.** Catalog enumerates
  Architect, Archaeologist, Sorceress's Hut, Fishing Net, Spice Guild, etc.
  PR #264 added Harbor Dock, Fishmonger, Smokehouse for ~19 total against
  the catalog's ~40+.
- **§11 Castle — passive rune generation.** ~1 rune per 23 h timer with
  Beach property reducing it. Not implemented.
- **§12 Zones — 6 zones + 1 Castle node.** ⚠️ partial. The 9-node
  cartography slice has shipped (with an added Saltspray Harbor coast
  node in #227), so the foundation exists. The catalog's literal
  "Zone One … Zone Six" framing isn't realized — our world map uses 10
  named nodes, not 6 zones + Castle.
- **§13 Quests — Royal quests, Exploration blockers** beyond the basic
  daily quest templates. Daily rewards shipped (`DAILY_REWARDS` table).
  Mine + Fish quest templates landed in #258 / #242.
- **§14 Monetization** — IAP bundles, watch-ads via Sorceress's Hut, etc.
  Out of scope for any near-term PR.

---

## How to keep this doc honest

- Update the **Shipped** table when a PR merges that moves a checklist item.
- When a section becomes ✅ in full, fold it into the Shipped table and
  delete the outstanding entry.
- New catalog gaps discovered during implementation go in the appropriate
  outstanding section with a 1–2 sentence pointer.
