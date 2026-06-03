import type { GameState } from "../../types/state.js";

export interface BossTarget {
  resource: string;
  amount: number;
}

export interface BossModifierDef {
  type: string;
  params: Record<string, unknown>;
}

export interface BossDef {
  id: string;
  name: string;
  season: string;
  target: BossTarget;
  modifier: BossModifierDef;
  description: string;
  modifierDescription: string;
}

export const BOSSES: BossDef[] = [
  {
    id: "frostmaw",
    name: "Frostmaw",
    season: "winter",
    target: { resource: "tile_tree_oak", amount: 30 },
    modifier: { type: "freeze_columns", params: { n: 2 } },
    description: "A frozen titan stirs in the deep winter wood, its icy breath threatening to snuff out every hearth in the vale. Gather logs quickly before the cold claims the village.",
    modifierDescription: "Two columns on the board are frozen solid and cannot be chained until thawed.",
  },
  {
    id: "quagmire",
    name: "Quagmire",
    season: "spring",
    target: { resource: "tile_grass_grass", amount: 50 },
    modifier: { type: "respawn_boost", params: { boost: ["tile_tree_oak", "tile_grass_grass"], factor: 1.5 } },
    description: "A boggy creature has swallowed the lower fields, turning fertile soil to mud. Only a bountiful hay harvest can drain its hold on the spring meadows.",
    modifierDescription: "Log and hay tiles respawn at 1.5× their normal rate, flooding the board with resources.",
  },
  {
    id: "ember_drake",
    name: "Ember Drake",
    season: "summer",
    target: { resource: "iron_bar", amount: 3 },
    modifier: { type: "heat_tiles", params: { spawnPerTurn: 1, burnAfter: 2 } },
    description: "Scales of cinder and breath of smelting flame — the Ember Drake demands a tribute of forged iron before the summer heat destroys your crops. Prove your craft at the forge.",
    modifierDescription: "One heat tile spawns each turn; any resource left on a heat tile for 2 turns is burned away.",
  },
  {
    id: "old_stoneface",
    name: "Old Stoneface",
    season: "autumn",
    target: { resource: "tile_mine_stone", amount: 20 },
    modifier: { type: "rubble_blocks", params: { count: 4 } },
    description: "An ancient golem has sealed the mountain pass with its bulk, blocking the autumn trade caravans. Quarry enough stone to prove your worth and earn passage through.",
    modifierDescription: "Four rubble tiles block random board positions; they cannot be chained and must be cleared by adjacent stone chains.",
  },
  {
    id: "mossback",
    name: "Mossback",
    season: "spring",
    target: { resource: "tile_fruit_blackberry", amount: 30 },
    modifier: { type: "hide_resources", params: { hidden: 4 } },
    description: "A mossy titan lurks in the spring glades, concealing its weakness beneath layers of overgrowth. Harvest enough blackberries to expose it and drive it from the vale.",
    modifierDescription: "Four resource tiles are hidden face-down on the board and only reveal themselves when included in a chain.",
  },
  {
    id: "storm",
    name: "The Storm",
    season: "summer",
    target: { resource: "fish_fillet", amount: 6 },
    modifier: { type: "min_chain", params: { length: 4 } },
    description: "A black squall rolls in over Saltspray Harbor — every short cast tears free of the line. Only steady, deliberate pulls bring fillets through the chop.",
    modifierDescription: "Chains of fewer than 4 fish tiles slip the line: they consume a turn but yield nothing.",
  },
];

// §9 locked: base = 200◉ × year_number; +1 rune (Phase 3 flat drop).
// Margin scaling: 0% → 1.0×, +100% (cap) → 1.5×.
export interface BossRewardResult {
  coins: number;
  runes: number;
  defeated: boolean;
}

export function bossReward(boss: { target: BossTarget }, progress: number, year: number): BossRewardResult {
  const target = boss.target.amount;
  const defeated = progress >= target;
  if (!defeated) return { coins: 0, runes: 0, defeated: false };
  const baseReward = 200 * year;
  const margin = Math.min(1.0, (progress - target) / target);
  const scalingBonus = Math.floor(baseReward * margin * 0.5);
  return { coins: baseReward + scalingBonus, runes: 1, defeated: true };
}

export const BOSS_WINDOW_TURNS = 10; // §18 locked: 1 season, not 5

import { applyModifierToFreshGrid } from "./modifiers.js";

// Default board dimensions for modifier init when no live grid is available (e.g. tests).
// Mirrors COLS/ROWS in src/constants.js — the live grid is 6×6.
const DEFAULT_ROWS = 6;
const DEFAULT_COLS = 6;

interface BossesGridCell { row: number; col: number; [k: string]: unknown }

function makeEmptyGrid(rows: number, cols: number): BossesGridCell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ row: r, col: c }))
  );
}

export interface BossInstance {
  id: string;
  season: string;
  year: number;
  turnsRemaining: number;
  progress: number;
  target: BossTarget;
  modifierState: unknown;
}

export function spawnBoss(state: GameState, id: string, year: number, rng: () => number = Math.random): GameState {
  if (state.boss) return state;
  const def = BOSSES.find((b) => b.id === id);
  if (!def) return state;
  const grid = (state.grid && state.grid.length > 0)
    ? state.grid
    : makeEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
  const modifierState = applyModifierToFreshGrid(grid as Array<Array<Record<string, unknown>>>, def.modifier as { type: string; params: { boost?: string[]; factor?: number; n?: number; count?: number; hidden?: number; burnAfter?: number } }, rng);
  return {
    ...state,
    grid,
    boss: {
      id,
      season: def.season,
      year,
      turnsRemaining: BOSS_WINDOW_TURNS,
      progress: 0,
      target: { ...def.target },
      modifierState,
    },
    story: {
      ...state.story,
      flags: { ...((state.story?.flags ?? {}) as Record<string, boolean>), [`${id}_active`]: true },
    },
  } as unknown as GameState;
}

export function tickBossTurn(state: GameState): GameState {
  if (!state.boss) return state;
  // The slice carries the richer BossInstance shape (season/year/target/modifierState)
  // at runtime; BossState in types/state.ts only declares the UI-facing subset.
  const current = state.boss as unknown as BossInstance;
  const advanced: BossInstance = { ...current, turnsRemaining: current.turnsRemaining - 1 };
  const targetMet = advanced.progress >= advanced.target.amount;
  const expired = advanced.turnsRemaining <= 0;
  if (!targetMet && !expired) {
    // Cast the structurally-richer BossInstance into the slot's typed `BossState`.
    const writeBack = advanced as unknown as GameState["boss"];
    return { ...state, boss: writeBack };
  }
  const def = BOSSES.find((b) => b.id === state.boss?.id);
  if (!def) return state;
  const reward = bossReward(def, advanced.progress, advanced.year ?? current.year ?? 1);
  const flags = {
    ...((state.story?.flags ?? {}) as Record<string, boolean>),
    [`${state.boss.id}_active`]: false,
    ...(reward.defeated ? { [`${state.boss.id}_defeated`]: true } : {}),
  };
  return {
    ...state,
    boss: null,
    coins: (state.coins ?? 0) + reward.coins,
    runes: (state.runes ?? 0) + reward.runes,
    story: { ...(state.story ?? {}), flags },
  } as GameState;
}
