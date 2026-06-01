/**
 * Canonical type declarations for game concepts.
 * Item shapes are inferred from Zod schemas (config/schemas/item.ts).
 * Runtime predicates live in `./guards.ts`.
 *
 * Catalog keys are hand-maintained enums in `./catalog/` (see `docs/engineering/catalog-enums.md`).
 */

export type { ItemKey, InventoryKey, RecipeInputKey } from "./catalogKeys.js";

export { ItemAliasKey, ResourceKey, TileKey, ToolKey } from "./catalogKeys.js";

export type { Inventory } from "./inventory.js";

export type {
  SwayParams,
  ToolPowerDefinition,
} from "../config/schemas/shared.js";

export type {
  TileItemEntry as Tile,
  ResourceItemEntry as Resource,
  ToolItemEntry as Tool,
  ItemEntry,
  TileItemEntry,
  ResourceItemEntry,
  ToolItemEntry,
} from "../config/schemas/item.js";

/** @deprecated Use `Tile | Resource | Tool` or kind-specific types. */
export type Item = import("../config/schemas/item.js").ItemEntry;

/** @deprecated Use `Tile`. */
export type TileItem = import("../config/schemas/item.js").TileItemEntry;
/** @deprecated Use `Resource`. */
export type ResourceItem = import("../config/schemas/item.js").ResourceItemEntry;
/** @deprecated Use `Tool`. */
export type ToolItem = import("../config/schemas/item.js").ToolItemEntry;

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
