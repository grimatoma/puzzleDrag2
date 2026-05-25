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
  amount: number;
  reward: number;
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

export interface Tools {
  clear: number;
  basic: number;
  rare: number;
  shuffle: number;
  bomb: number;
  startingExtraScythe?: boolean;
  extraBlueprintSlot?: boolean;
  goldSeal?: boolean;
  extraTurn?: boolean;
  // Many other tool counters; allow arbitrary numeric / boolean entries.
  [tool: string]: number | boolean | undefined;
}

export interface Hazards {
  caveIn: unknown;
  gasVent: unknown;
  lava: unknown;
  mole: unknown;
  rats: unknown[];
  fire: unknown;
  wolves: unknown;
  [extra: string]: unknown;
}

export interface SeasonStats {
  harvests: number;
  upgrades: number;
  ordersFilled: number;
  coins: number;
  capFloaters?: unknown[];
  [extra: string]: unknown;
}

export interface NpcsState {
  roster: string[];
  bonds: Record<string, number>;
  giftCooldown: Record<string, number>;
  [extra: string]: unknown;
}

export interface MarketState {
  seed: number;
  season: number;
  prices: Record<string, number>;
  prevPrices: Record<string, number> | null;
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
  // Boss-related extras (set when an encounter is active)
  boss?: { minChain?: number; key?: string; [k: string]: unknown } | null;
  // Anything else that feature slices spread in via `...slice.initial`.
  [extra: string]: unknown;
}

// ── Action ────────────────────────────────────────────────────────────────

/**
 * Generic action shape. Each action has a `type` discriminator (86 distinct
 * types across the codebase, e.g. "CHAIN_COLLECTED", "BOSS/TRIGGER",
 * "CARTO/TRAVEL"). Per-action payload fields are accessed by narrowing on
 * `type` or via property access; `unknown` keeps call sites honest.
 */
export interface Action {
  type: string;
  readonly [key: string]: unknown;
}

// ── Reducer + dispatch ────────────────────────────────────────────────────

export type Reducer<S = GameState> = (state: S, action: Action) => S;

export type Dispatch = (action: Action) => void;

/** A feature slice reducer; same signature as the root reducer. */
export type SliceReducer = Reducer<GameState>;
