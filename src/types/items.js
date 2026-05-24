// @ts-check
/**
 * Canonical typedefs for game concepts. JSDoc only — no runtime exports.
 * Files opt in to checking with `// @ts-check` at the top (jsconfig sets
 * `checkJs:false` globally so PRs 3/4 can adopt incrementally). See
 * `src/types/guards.js` for runtime predicates.
 *
 * Branded string types use the "phantom brand" pattern so plain strings are
 * assignable in JS (no runtime cost) while VS Code and `tsc --noEmit` surface
 * type mismatches during authoring.
 */

// ── Branded key types ─────────────────────────────────────────────────────

/**
 * A key for a tile entry in ITEMS. All tile keys start with `tile_`.
 * @typedef {`tile_${string}` & { readonly __brand: "Tile" }} TileKey
 */

/**
 * A key for a resource entry in ITEMS. Resource keys never start with `tile_`.
 * @typedef {string & { readonly __brand: "Resource" }} ResourceKey
 */

/**
 * A key for a tool entry in ITEMS. Tool keys never start with `tile_`.
 * @typedef {string & { readonly __brand: "Tool" }} ToolKey
 */

// ── Sway sub-object ───────────────────────────────────────────────────────

/**
 * Animation parameters controlling the sway of a tile sprite on the board.
 * @typedef {{ amp: number, freq: number, gust: number }} SwayParams
 */

// ── Item discriminated union ──────────────────────────────────────────────

/**
 * A tile item from ITEMS (kind === "tile"). Tiles live on the board and
 * upgrade into a ResourceItem when chained. The `next` field names the
 * resource produced by a completed chain (null for special tiles that do not
 * produce a resource, e.g. tile_special_dirt, tile_special_giant_pearl).
 *
 * @typedef {{
 *   kind:   "tile",
 *   biome:  string,
 *   label:  string,
 *   color:  number,
 *   dark:   number,
 *   value:  number,
 *   next:   ResourceKey | null,
 *   sway?:  SwayParams,
 *   desc?:  string,
 *   effects?: Record<string, unknown>,
 * }} TileItem
 */

/**
 * A terminal resource item from ITEMS (kind === "resource"). Resources sit in
 * the player's inventory after chain collection; `next` is always null.
 *
 * @typedef {{
 *   kind:   "resource",
 *   biome?: string,
 *   label:  string,
 *   color:  number,
 *   dark:   number,
 *   value:  number,
 *   next:   null,
 *   desc?:  string,
 * }} ResourceItem
 */

/**
 * A consumable tool item from ITEMS (kind === "tool"). Tools do not have a
 * biome; they are crafted and spent to trigger a tool power. The `effect`
 * field stores the tool-power id from TOOL_POWERS (Dev Panel UI calls
 * this "Tool power"); `target`, `anim`, and `ms` are optional
 * runtime hints consumed by GameScene.
 *
 * @typedef {{
 *   kind:    "tool",
 *   label:   string,
 *   color?:  number,
 *   dark?:   number,
 *   value?:  number,
 *   desc?:   string,
 *   effect?: string,
 *   target?: string,
 *   anim?:   string,
 *   ms?:     number,
 * }} ToolItem
 */

/**
 * Any entry from ITEMS — a discriminated union on `kind`.
 * @typedef {TileItem | ResourceItem | ToolItem} Item
 */

// ── Ability ───────────────────────────────────────────────────────────────

/**
 * A single entry from the ABILITIES catalog in `src/config/abilities.js`.
 * Abilities are passive modifiers attached to buildings, workers, or tiles.
 *
 * `paramSchema` mirrors the `params` array on each catalog entry — an array of
 * parameter descriptors used by the editor and runtime.
 *
 * @typedef {{
 *   id:       string,
 *   name:     string,
 *   desc:     string,
 *   iconKey:  string,
 *   scope:    string[],
 *   trigger:  string,
 *   channel:  string,
 *   params:   Array<{
 *     key:     string,
 *     label:   string,
 *     type:    string,
 *     default?: string | number,
 *     min?:    number,
 *     max?:    number,
 *   }>,
 * }} Ability
 */

// ── ToolPower ─────────────────────────────────────────────────────────────

/**
 * A single entry from the TOOL_POWERS catalog in `src/config/toolPowers.js`.
 * Tool powers are active effects triggered when the player spends a tool item.
 *
 * `iconKey` is reserved for a future Task 2 addition; no current entry carries
 * it but the type accepts it so callers don't need a cast when it ships.
 *
 * @typedef {{
 *   id:       string,
 *   name:     string,
 *   desc:     string,
 *   iconKey?: string | null,
 *   params:   Array<{
 *     key:    string,
 *     label:  string,
 *     type:   string,
 *     default?: string | number,
 *   }>,
 * }} ToolPower
 */

// ── Recipe ────────────────────────────────────────────────────────────────

/**
 * A single entry from the RECIPES map in `src/constants.js`.
 * `tier` is optional — workshop tool recipes omit it; crafted-goods recipes
 * carry tier 1–3. `craftMs` is the wall-clock craft duration in milliseconds.
 *
 * @typedef {{
 *   item:     string,
 *   station:  string,
 *   tier?:    number,
 *   inputs:   Record<string, number>,
 *   craftMs:  number,
 * }} Recipe
 */

/**
 * A key into the RECIPES map. Using `string` here rather than enumerating all
 * ~35 recipe keys keeps the type stable as recipes are added without requiring
 * a typedef update on every balance pass.
 * @typedef {string} RecipeKey
 */

// ── Building ──────────────────────────────────────────────────────────────

/**
 * A single entry from the BUILDINGS array in `src/constants.js`. Represents a
 * constructable structure in the town view. `cost` is a resource-keyed map of
 * amounts; `built` is only present (and true) on the pre-built Hearth.
 * Optional `biome` restricts the building to a single biome. Optional
 * `requires` names another building id that must be built first. Optional
 * `abilities` is an array of inline ability references (id + params + trigger).
 *
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   desc:        string,
 *   cost:        Record<string, number>,
 *   lv:          number,
 *   x:           number,
 *   y:           number,
 *   w:           number,
 *   h:           number,
 *   color:       string,
 *   built?:      boolean,
 *   biome?:      string,
 *   requires?:   string,
 *   abilities?:  Array<{ id: string, params: Record<string, unknown>, trigger: string }>,
 * }} Building
 */

// ── NPC ───────────────────────────────────────────────────────────────────

/**
 * A single entry from the NPCS map in `src/constants.js`. Represents a
 * townsfolk character who issues resource orders. `lines` are template strings
 * where `{n}` and `{r}` are replaced at runtime with quantity and resource.
 *
 * @typedef {{
 *   name:  string,
 *   role:  string,
 *   color: string,
 *   lines: string[],
 * }} NPC
 */

// ── Hazard ────────────────────────────────────────────────────────────────

/**
 * The string-literal union of all hazard ids defined in
 * `src/features/mine/hazards.js`.
 * @typedef {"cave_in" | "gas_vent" | "lava" | "mole"} HazardId
 */

/**
 * A single entry from the HAZARDS array in `src/features/mine/hazards.js`.
 * `spawn` is a function that generates the initial hazard state given the
 * current grid and an rng function. `durationTurns` is only present on
 * time-limited hazards (e.g. gas_vent).
 *
 * @typedef {{
 *   id:               HazardId,
 *   name:             string,
 *   description:      string,
 *   clearInstruction: string,
 *   weight:           number,
 *   spawn:            (grid: unknown[][], rng: () => number) => Record<string, unknown>,
 *   durationTurns?:   number,
 * }} Hazard
 */

// ── SettlementBiome ───────────────────────────────────────────────────────

/**
 * A single entry inside the SETTLEMENT_BIOMES map in `src/constants.js`.
 * `hazards` is a two-element tuple of hazard id strings. `icon` is an emoji
 * string. `bonus` is a short human-readable description of the biome's bonus.
 *
 * @typedef {{
 *   id:      string,
 *   name:    string,
 *   icon:    string,
 *   hazards: [string, string],
 *   bonus:   string,
 * }} SettlementBiome
 */

// ── ZoneCategory ─────────────────────────────────────────────────────────

/**
 * The string-literal union of all zone categories defined in
 * `src/features/zones/data.js:ZONE_CATEGORIES`. These are the upgrade-map keys
 * and seasonDrops keys used by the cartography system.
 *
 * @typedef {"grass" | "grain" | "trees" | "birds" | "vegetables" | "fruits" | "flowers" | "herd_animals" | "cattle" | "mounts"} ZoneCategory
 */

