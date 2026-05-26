/**
 * Canonical state + action types. Every reducer, slice, dispatcher and UI
 * prop in the codebase imports these so the shape stays consistent.
 *
 * GameState is an interface (not derived from ReturnType) so individual
 * fields can be typed precisely (a literal `null` initializer must still be
 * assignable as `Bubble | null`, etc.). The interface has an index signature
 * for forward-compatibility with feature slices that spread their own
 * `initial` block into the root state.
 */

// ── Sub-types ─────────────────────────────────────────────────────────────

export interface Tile {
  key: string;
  // Optional decorations / runtime fields that the board may attach.
  variant?: string;
  golden?: boolean;
  highlight?: boolean;
  age?: number;
  [extra: string]: unknown;
}

export type GridRow = Tile[];
export type Grid = GridRow[];

export interface Order {
  id: number;
  npc: string;
  key: string;
  /**
   * Required quantity. The reducer reads `need` on the TURN_IN_ORDER path
   * and `amount` on the create path — both are accepted for compatibility.
   */
  amount: number;
  need?: number;
  reward: number;
  /**
   * Optional pre-bond reward. When present, the bond multiplier scales this
   * value; when absent, the multiplier applies to `reward` directly.
   */
  baseReward?: number;
  bond?: number;
  [extra: string]: unknown;
}

export interface Bubble {
  id: number;
  npc: string;
  text: string;
  ms: number;
  [extra: string]: unknown;
}

export interface FarmRun {
  zoneId?: string;
  turnsRemaining: number;
  turnsTotal?: number;
  [extra: string]: unknown;
}

/**
 * Per-tool counters. Numeric for tool-charge counts (clear, bomb, axe, …);
 * a few boolean upgrade flags (startingExtraScythe etc.) live alongside under
 * specific declared keys.
 *
 * The index signature returns `number | boolean | undefined` so the boolean
 * flag fields stay representable. Reducer arithmetic on dynamic keys should
 * route through the `toolCount(tools, key)` helper in src/state.ts to coerce
 * the result to a number safely.
 */
export interface Tools {
  clear?: number;
  basic?: number;
  rare?: number;
  shuffle?: number;
  bomb?: number;
  startingExtraScythe?: boolean;
  extraBlueprintSlot?: boolean;
  goldSeal?: boolean;
  extraTurn?: boolean;
  [tool: string]: number | boolean | undefined;
}

/**
 * Hazard slots on the active board. Each biome only uses a subset
 * (mine = caveIn/gasVent/lava/mole, farm = rats/fire/wolves), so the
 * fields are all optional and tolerate either a hazard payload or `null`.
 * Feature-specific narrowing happens in src/features/{farm,mine}/hazards.ts.
 */
export interface Hazards {
  caveIn?: unknown;
  gasVent?: unknown;
  lava?: unknown;
  mole?: unknown;
  rats?: unknown[];
  fire?: unknown;
  wolves?: unknown;
  [extra: string]: unknown;
}

export interface SeasonStats {
  harvests: number;
  upgrades: number;
  ordersFilled: number;
  coins: number;
  /**
   * Per-resource overflow accumulator. Resource keys map to objects tracking
   * floats not yet rendered (the reducer keeps this as a dict, not a list).
   */
  capFloaters?: Record<string, unknown> | unknown[];
  [extra: string]: unknown;
}

export interface NpcsState {
  roster: string[];
  bonds: Record<string, number>;
  giftCooldown: Record<string, number>;
  [extra: string]: unknown;
}

/**
 * A market price entry. `buy` and `sell` are integer coin amounts.
 * (Stored per-resource in MarketState.prices.)
 */
export interface MarketPriceEntry {
  buy: number;
  sell: number;
}

export interface MarketState {
  seed: number;
  season: number;
  prices: Record<string, MarketPriceEntry>;
  prevPrices: Record<string, MarketPriceEntry> | null;
  [extra: string]: unknown;
}

export interface HeirloomsState {
  heirloomSeed: number;
  pactIron: number;
  tidesingerPearl: number;
  [extra: string]: unknown;
}

export interface SessionState {
  selectedTiles: unknown[];
  fertilizerUsed: boolean;
  [extra: string]: unknown;
}

export interface AchievementsState {
  counters: Record<string, number>;
  unlocked: Record<string, boolean>;
  seenResources: Record<string, boolean>;
  seenBuildings: Record<string, boolean>;
  trophies?: Record<string, boolean>;
  collected?: Record<string, number>;
  totalHarvested?: number;
  totalChains?: number;
  longestChain?: number;
  chainsThisSeason?: number;
  totalOrders?: number;
  totalCrafted?: number;
  [extra: string]: unknown;
}

export interface AlmanacState {
  xp: number;
  level: number;
  claimed: Record<string | number, boolean>;
  [extra: string]: unknown;
}

// ── Top-level GameState ───────────────────────────────────────────────────

/**
 * The canonical game state shape. Known fields are typed precisely; an
 * index signature accommodates feature slices that spread their own
 * `initial` blocks into root state (see src/state/init.ts and the slices
 * under src/features/<name>/slice.js).
 */
export interface GameState {
  version: number;
  biomeKey: string;
  biome: string;
  saveSeed: string;
  view: string;
  viewParams: Record<string, unknown>;
  coins: number;
  level: number;
  xp: number;
  turnsUsed: number;
  farmRun: FarmRun | null;
  inventory: Record<string, number>;
  resourceProgress: Record<string, number>;
  orders: Order[];
  quests: unknown;
  tools: Tools;
  /** The currently-armed tool key (e.g. "axe", "bomb"), or null. */
  toolPending: string | null;
  /** Armed typed-power descriptor, or null. */
  toolPendingPower: { id: string; key?: string; [k: string]: unknown } | null;
  fillBiasTarget: { key?: string; [k: string]: unknown } | null;
  mysteriousOre: { turnsRemaining?: number; [k: string]: unknown } | null;
  fishPearl: { turnsRemaining?: number; [k: string]: unknown } | null;
  hazards: Hazards;
  grid: Grid;
  _biomeRestored: boolean;
  lastChainSnapshot: Record<string, unknown> | null;
  magicFertilizerCharges: number;
  built: Record<string, Record<string, unknown>>;
  zoneNames: Record<string, string>;
  settlements: Record<string, { founded: boolean; [k: string]: unknown }>;
  influence: number;
  bubble: Bubble | null;
  modal: string | null;
  pendingView: string | null;
  seasonStats: SeasonStats;
  _hintsShown: Record<string, boolean>;
  story: Record<string, unknown>;
  npcs: NpcsState;
  market: MarketState;
  season: number;
  runes: number;
  runeStash: number;
  embers: number;
  coreIngots: number;
  gems: number;
  heirlooms: HeirloomsState;
  session: SessionState;
  keeperTrials: Record<string, unknown>;
  activeTrial: Record<string, unknown> | null;
  dailyStreak: { lastClaimedDate: string | null; currentDay: number; [k: string]: unknown };
  workers: { hired: Record<string, number>; [k: string]: unknown };
  tileCollection: {
    discovered: Record<string, boolean>;
    researchProgress: Record<string, number>;
    activeByCategory: Record<string, string | null>;
    freeMoves: number;
    [k: string]: unknown;
  };
  almanac: AlmanacState;
  achievements: AchievementsState;
  farm: { savedField: unknown; [k: string]: unknown };
  mine: { savedField: unknown; [k: string]: unknown };
  // Floaters layer rendered above the board after a chain commit.
  floaters?: unknown[];
  /**
   * Boss-related extras (set when an encounter is active). The precise shape
   * lives in `BossState` in `src/features/boss/slice.ts`; runtime may attach
   * partial or transitional objects — narrow at the call site when needed.
   */
  boss?: unknown | null;
  // Anything else that feature slices spread in via `...slice.initial`.
  [extra: string]: unknown;
}

// ── Action (discriminated union in actionPayloads.ts) ─────────────────────

export type { Action, TypedAction, GenericAction, TypedActionType } from "./actionPayloads.js";
export type {
  ChainCollectedPayload,
  ChainCollectedAction,
  ToolFiredAction,
  UseToolAction,
  GridSyncAction,
  SetViewAction,
} from "./actionPayloads.js";

// ── Reducer + dispatch ────────────────────────────────────────────────────

import type { Action } from "./actionPayloads.js";

export type Reducer<S = GameState> = (state: S, action: Action) => S;

export type Dispatch = (action: Action) => void;

/** A feature slice reducer; same signature as the root reducer. */
export type SliceReducer = Reducer<GameState>;
