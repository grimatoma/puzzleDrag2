# Catalog enums (compile-time ids)

Hand-maintained string enums under `src/types/catalog/` define **what exists** in the game. Config maps (`ITEMS`, `RECIPES`, `ZONES`, …) hold **attributes** keyed by those ids. The Dev Panel and `balance.json` may patch attributes only; unknown keys are skipped at load.

## Zod schema layer (`src/config/schemas/`)

**Attributes** are documented and validated with Zod:

- **Catalog ids** stay in `src/types/catalog/` (enums) — membership SSOT.
- **Item shapes** use a `discriminatedUnion` on `kind` (`tile` | `resource` | `tool`), not a single id enum.
- **`balance.json`** is validated at game load (`parseBalanceOverrides`); canonical `ITEMS` / `RECIPES` conformance is checked in CI via `src/__tests__/configSchemas.test.ts` (not on every page load).

See [`src/config/balance.schema.md`](../../src/config/balance.schema.md) for override keys.

## Workflow: add a new item

1. Add enum member(s) in `src/types/catalog/itemKeys.ts` (`TileKey`, `ResourceKey`, `ToolKey`, or `ItemAliasKey`).
2. Add the row in `constants.ts` `ITEMS` (use `[ResourceKey.Flour]: { … }` or string key matching the enum value).
3. Restart Vite / hard-refresh. No codegen step.

## Parity

`src/__tests__/catalog-keys-invariants.test.ts` asserts enum values ↔ `Object.keys(ITEMS)` (plus aliases). Run with `npm test -- src/__tests__/catalog-keys-invariants.test.ts`.

`src/__tests__/configSchemas.test.ts` asserts each `ITEMS` / `RECIPES` / catalog row matches the Zod canonical schema. Run with `npm run config:validate` or `npm test -- src/__tests__/configSchemas.test.ts`.

## Inventory typing

`Inventory = Partial<Record<InventoryKey, number>>` — sparse counts; missing key means 0 at read time. `Partial` is about optional **slots**, not open-ended keys.

Helpers: `inventoryQty`, `inventoryPut`, `parseInventory` (save boundary) in `src/types/inventory.ts`.

## Dev Panel / Wiki concept map

The **canonical concept list and player-facing attributes** are owned by the live Game Wiki at `/b/` (generated from config + Zod). This table is the *contributor* counterpart: it maps each wiki concept to the **TypeScript enum** that defines its membership and the **source map/array** that holds its attributes — the one thing the wiki doesn't surface. Edit ids in the enum, attributes in the source.

| Wiki / Dev tab | Enum(s) | Attribute source |
|----------------|---------|------------------|
| Tiles | `TileKey` | `ITEMS` (`kind: "tile"`) |
| Resources | `ResourceKey` | `ITEMS` (`kind: "resource"`) |
| Tools | `ToolKey` | `ITEMS` (`kind: "tool"`) |
| Aliases | `ItemAliasKey` | `ITEMS` (`iron_frame`, …) |
| All ITEMS keys | `ItemKey` | `ITEMS` |
| Categories | `TileCategoryId`, `ZoneCategoryId` | tile collection / zones data |
| Zones | `ZoneId` | cartography `MAP_NODES` |
| Settlement biomes | `SettlementBiomeId` | `SETTLEMENT_BIOMES` |
| Recipes | `RecipeKey` | `RECIPES` |
| Buildings | `BuildingId` | `BUILDINGS` |
| Hazards | `MineHazardId` | mine `HAZARDS` |
| Bosses | `BossId` | bosses data |
| Workers | `WorkerTypeId` | workers data |
| NPCs | `NpcId` | `NPCS` |
| Attributes | `AbilityId` | `config/abilities.ts` |
| Tool powers | `ToolPowerId` | `config/toolPowers.ts` |
| Tile discovery | `TileDiscoveryMethodId` | `config/tileDiscoveryMethods.ts` |
| Seasons | `SeasonId` | `SEASONS` |
| Views | `ViewId` | `router.js` `KNOWN_VIEWS` |
| Modals | `ModalId` | `KNOWN_MODALS` |
| Board animations | `BoardAnimationId` | `config/boardAnimations.ts` |
| Playable biomes | `BiomeId` | `BIOMES` / zones |
| **Story beats** | `StoryBeatId` | `story.ts` `STORY_BEATS` + `SIDE_BEATS` |
| **Story flags** | `StoryFlagId` | `flags.ts` `STORY_FLAGS` |
| **Flag categories** | `StoryFlagCategoryId` | `flags.ts` `FLAG_CATEGORIES` |
| **Story / flag triggers** | `StoryTriggerType` | `conditionMatches` / `sanitizeTrigger` |
| **Dev tuning keys** | `TuningKey` | `sanitizeTuning` (`balance.json` → `tuning`) |
| **Feature flags (concept ids)** | `FeatureFlagId` | `featureFlags.ts` exports + tuning mirrors |

Related: `InventoryKey` (resources + capped tiles), `RecipeInputKey` (= `ItemKey`), `ActionType` in `types/actions.ts`.

**Story / flags note:** Beats and flags can receive **presentation-only** patches from `balance.json` / Dev Panel. Author-created **new** beat or flag ids from drafts are still validated at runtime by sanitizers; promote any durable id to the matching enum + source array when it ships.

## Board-only keys (not in ITEMS)

Runtime board cells may use ids that are not `ITEMS` rows: `rat`, `mysterious_ore`, `lava`. These are not catalog enums; board `Tile.key` stays `string` until those are promoted to first-class catalog entries.

## Runtime guards

Use `isItemKey` / `isInventoryKey` / `parseInventory` at saves, JSON, and balance drafts. Game logic should prefer enum members (`ResourceKey.Flour`) and `getItem()` over raw `ITEMS[key]` indexing.

## Imports

- Barrel: `src/types/catalog/index.ts`
- Re-exports: `src/types/catalogKeys.ts` (`ALL_ITEM_KEYS`, `RESOURCE_KEYS`, `TILE_KEYS`, …)
- Item types: `src/types/items.ts`
