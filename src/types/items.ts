/**
 * Canonical type declarations for game concepts. These live in `.ts` (no
 * runtime exports) so they can be imported by name from any `.ts`/`.tsx`
 * caller. Runtime predicates live in `./guards.ts`.
 *
 * Branded string types use the "phantom brand" pattern so plain string
 * literals stay assignable in JS callers (no runtime cost) while `.ts`
 * callers and `tsc --noEmit` surface type mismatches at the call site.
 */

// ── Branded key types ─────────────────────────────────────────────────────

/**
 * A key for a tile entry. All tile keys start with `tile_`.
 */
export type TileKey = `tile_${string}` & { readonly __brand: "Tile" };

/**
 * A key for a resource entry. Resource keys never start with `tile_`.
 */
export type ResourceKey = string & { readonly __brand: "Resource" };

/**
 * A key for a tool entry. Tool keys never start with `tile_`.
 */
export type ToolKey = string & { readonly __brand: "Tool" };

// ── Sway sub-object ───────────────────────────────────────────────────────

export interface SwayParams {
  amp: number;
  freq: number;
  gust: number;
}

// ── Item kinds ────────────────────────────────────────────────────────────

/**
 * A tile lives on the board. Chained tiles credit progress toward the
 * tile-family's produced resource (see TILE_FAMILY_RESOURCE in constants).
 * The legacy `next` field is kept optional during the migration; new code
 * should use the producedResource helper instead.
 */
export interface Tile {
  kind: "tile";
  biome: string;
  label: string;
  color: number;
  dark: number;
  value: number;
  /** @deprecated Will be removed in Phase 6 — read produced resource via tileFamilyResource */
  next?: ResourceKey | string | null;
  sway?: SwayParams;
  desc?: string;
  effects?: Record<string, unknown>;
}

/**
 * A terminal resource lives in the player's inventory after chain collection.
 */
export interface Resource {
  kind: "resource";
  biome?: string;
  label: string;
  color: number;
  dark: number;
  value: number;
  /** @deprecated For schema parity with Tile during migration; resources never produce another resource */
  next?: null;
  desc?: string;
}

/**
 * A consumable tool — crafted and spent to trigger a tool power.
 * `effect` is the tool-power id from TOOL_POWERS.
 */
export interface Tool {
  kind: "tool";
  label: string;
  color?: number;
  dark?: number;
  value?: number;
  desc?: string;
  effect?: string;
  target?: string;
  anim?: string;
  ms?: number;
}

/**
 * Legacy alias kept for callers still using the union shape.
 * @deprecated Phase 6 will remove this. Use `Tile | Resource | Tool` directly,
 * or — better — the specific kind your function actually accepts.
 */
export type Item = Tile | Resource | Tool;

/** @deprecated Phase 6 will remove. Use `Tile`. */
export type TileItem = Tile;
/** @deprecated Phase 6 will remove. Use `Resource`. */
export type ResourceItem = Resource;
/** @deprecated Phase 6 will remove. Use `Tool`. */
export type ToolItem = Tool;

// ── Ability ───────────────────────────────────────────────────────────────

export interface AbilityParam {
  key: string;
  label: string;
  type: string;
  default?: string | number;
  min?: number;
  max?: number;
}

export interface Ability {
  id: string;
  name: string;
  desc: string;
  iconKey: string;
  scope: string[];
  trigger: string;
  channel: string;
  params: AbilityParam[];
}

// ── ToolPower ─────────────────────────────────────────────────────────────

export interface ToolPowerParam {
  key: string;
  label: string;
  type: string;
  default?: string | number;
}

export interface ToolPower {
  id: string;
  name: string;
  desc: string;
  iconKey?: string | null;
  params: ToolPowerParam[];
}

// ── Recipe ────────────────────────────────────────────────────────────────

export interface Recipe {
  item: string;
  station: string;
  tier?: number;
  inputs: Record<string, number>;
  craftMs: number;
}

export type RecipeKey = string;

// ── Building ──────────────────────────────────────────────────────────────

export interface BuildingAbilityRef {
  id: string;
  params: Record<string, unknown>;
  trigger: string;
}

export interface Building {
  id: string;
  name: string;
  desc: string;
  cost: Record<string, number>;
  lv: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  built?: boolean;
  biome?: string;
  requires?: string;
  abilities?: BuildingAbilityRef[];
}

// ── NPC ───────────────────────────────────────────────────────────────────

export interface NPC {
  name: string;
  role: string;
  color: string;
  lines: string[];
}

// ── Hazard ────────────────────────────────────────────────────────────────

export type HazardId = "cave_in" | "gas_vent" | "lava" | "mole";

export interface Hazard {
  id: HazardId;
  name: string;
  description: string;
  clearInstruction: string;
  weight: number;
  spawn: (grid: unknown[][], rng: () => number) => Record<string, unknown>;
  durationTurns?: number;
}

// ── SettlementBiome ───────────────────────────────────────────────────────

export interface SettlementBiome {
  id: string;
  name: string;
  icon: string;
  hazards: [string, string];
  bonus: string;
}

// ── ZoneCategory ─────────────────────────────────────────────────────────

export type ZoneCategory =
  | "grass"
  | "grain"
  | "trees"
  | "birds"
  | "vegetables"
  | "fruits"
  | "flowers"
  | "herd_animals"
  | "cattle"
  | "mounts";
