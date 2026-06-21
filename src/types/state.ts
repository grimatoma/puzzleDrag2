/**
 * Canonical state + action types. Every reducer, slice, dispatcher and UI
 * prop in the codebase imports these so the shape stays consistent.
 *
 * GameState is an interface (not derived from ReturnType) so individual
 * fields can be typed precisely. Slice-owned root fields are listed explicitly
 * (see {@link SliceRootFields} in `./gameStateFields.ts`) so reducers do not
 * need `as unknown as HostState` bridges.
 */

import type { ResourceKey } from "./catalogKeys.js";
import type {
  BossState,
  CastleState,
  FishBiomeState,
  GameSettings,
  Quest,
  QuestDailyLegacy,
  RunSummary,
  TutorialState,
} from "./gameStateFields.js";
import type { ZoneInventoryMap, ZoneResourceProgressMap } from "./inventory.js";

export type {
  BossState,
  CastleState,
  FishBiomeState,
  GameSettings,
  Quest,
  QuestDailyLegacy,
  RunSummary,
  SliceRootFields,
  TutorialState,
} from "./gameStateFields.js";

// ── Sub-types ─────────────────────────────────────────────────────────────

/** Board cell id — catalog {@link TileKey} plus runtime spawns (`rat`, `mysterious_ore`, `lava`). */
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
  key: ResourceKey;
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
  turnBudget?: number;
  mode?: string;
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
  expedition?: { supply?: Record<string, number>; zoneId?: string | null; turns?: number };
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
 * The canonical game state shape. Slice-owned root keys match `...slice.initial`
 * spreads in `src/state/init.ts`.
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
  /** Resource counts keyed by settlement id (zone). Coins/tools stay global. */
  inventory: ZoneInventoryMap;
  /** Fractional chain progress toward the next whole unit, per settlement. */
  resourceProgress: ZoneResourceProgressMap;
  orders: Order[];
  quests: Quest[];
  tools: Tools;
  /** The currently-armed tool key (e.g. "axe", "bomb"), or null. */
  toolPending: string | null;
  /** Armed typed-power descriptor, or null. */
  toolPendingPower: { id: string; key?: string | null; [k: string]: unknown } | null;
  fillBiasTarget: { key?: string | null; [k: string]: unknown } | null;
  mysteriousOre: { turnsRemaining?: number; [k: string]: unknown } | null;
  fishPearl: { turnsRemaining?: number; [k: string]: unknown } | null;
  hazards: Hazards;
  grid: Grid;
  _biomeRestored: boolean;
  lastChainSnapshot: Record<string, unknown> | null;
  magicFertilizerCharges: number;
  built: Record<string, Record<string, unknown>>;
  zoneNames: Record<string, string>;
  settlements: Record<string, { founded: boolean; tier?: number; [k: string]: unknown }>;
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
  /**
   * Villager currency — settlement housing capacity used to hire townsfolk.
   * Built Housing Blocks grant Villagers (via the `worker_pool_step` ability at
   * season end); each WORKERS/HIRE spends 1, and WORKERS/FIRE refunds 1.
   */
  villagers: number;
  heirlooms: HeirloomsState;
  session: SessionState;
  keeperTrials: Record<string, unknown>;
  activeTrial: Record<string, unknown> | null;
  dailyStreak: { lastClaimedDate: string | null; currentDay: number; [k: string]: unknown };
  /** Town Hall "Tithes & Provisions" economy — see features/civicEconomy. */
  civicEconomy: { lastClaimedAt: number | null; pendingProvisions: Record<string, number> };
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
  fish: FishBiomeState;
  // Floaters layer rendered above the board after a chain commit.
  floaters?: unknown[];
  boons: Record<string, boolean>;
  runSummary: RunSummary;
  mapCurrent: string;
  mapVisited: string[];
  mapDiscovered: string[];
  activeZone: string;
  craftedTotals: Record<string, number>;
  boss: BossState | null;
  bossPending: boolean;
  bossMinimized: boolean;
  bossesDefeated: number;
  _bossSeasonCount: number;
  _bossResolvedThisSeason: boolean;
  lastAuditBossAt: number;
  auditBossSeq: number;
  dailies: QuestDailyLegacy[];
  dailyDay: number;
  almanacXp: number;
  almanacTier: number;
  almanacClaimed: number[];
  trophies: Record<string, unknown>;
  collected: Record<string, number>;
  totalHarvested: number;
  totalChains: number;
  longestChain: number;
  chainsThisSeason: number;
  totalOrders: number;
  totalCrafted: number;
  settings: GameSettings;
  settingsTab: string;
  tutorial: TutorialState;
  castle: CastleState;
  year?: number;
  /** Dev Panel / settings flows (not persisted on every save). */
  pendingReload?: boolean;
  /** Crafting screen sub-tab (`src/features/crafting/index.tsx`). */
  craftingTab?: string | null;
  /** Fish slice: free-move consumption flag for the last board action. */
  lastBoardActionConsumedFreeMove?: boolean;
  /** Length of the last committed chain — read by `useAudio` for chain SFX. */
  lastChainLength?: number;
  /** Visual testing bridge: id of the currently loaded scenario, when set. */
  _visualScenarioId?: string;
  /** Extra payload for the current modal (e.g. daily-streak day/reward). */
  modalParams?: Record<string, unknown>;
  /** Story beat side-effect: biomes unlocked outside the `story.flags` channel. */
  unlockedBiomes?: Record<string, boolean>;
  /** Transient hand-off between `applyBeatResult` and the boss trigger; cleared by `evaluateAndApplyStoryBeat`. */
  pendingBossKey?: string;
  /**
   * Monotonic counter bumped whenever a brand-new (non-restored) puzzle board
   * should be generated — FARM/ENTER and SWITCH_BIOME without a saved field.
   * Mirrored to the Phaser registry as `newBoardNonce`; the scene regenerates
   * its tiles when the value changes. Lets a same-biome re-entry (farm → farm)
   * trigger a fresh board even though `biomeKey` is unchanged.
   */
  _boardNonce?: number;
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
