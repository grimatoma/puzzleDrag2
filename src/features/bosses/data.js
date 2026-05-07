export const BOSSES = [
  {
    id: "frostmaw",
    name: "Frostmaw",
    season: "winter",
    target: { resource: "wood_log", amount: 30 },
    modifier: { type: "freeze_columns", params: { n: 2 } },
    description: "A frozen titan stirs in the deep winter wood, its icy breath threatening to snuff out every hearth in the vale. Gather logs quickly before the cold claims the village.",
    modifierDescription: "Two columns on the board are frozen solid and cannot be chained until thawed.",
  },
  {
    id: "quagmire",
    name: "Quagmire",
    season: "spring",
    target: { resource: "grass_hay", amount: 50 },
    modifier: { type: "respawn_boost", params: { boost: ["wood_log", "grass_hay"], factor: 1.5 } },
    description: "A boggy creature has swallowed the lower fields, turning fertile soil to mud. Only a bountiful hay harvest can drain its hold on the spring meadows.",
    modifierDescription: "Log and hay tiles respawn at 1.5× their normal rate, flooding the board with resources.",
  },
  {
    id: "ember_drake",
    name: "Ember Drake",
    season: "summer",
    target: { resource: "ingot", amount: 3 },
    modifier: { type: "heat_tiles", params: { spawnPerTurn: 1, burnAfter: 2 } },
    description: "Scales of cinder and breath of smelting flame — the Ember Drake demands a tribute of forged iron before the summer heat destroys your crops. Prove your craft at the forge.",
    modifierDescription: "One heat tile spawns each turn; any resource left on a heat tile for 2 turns is burned away.",
  },
  {
    id: "old_stoneface",
    name: "Old Stoneface",
    season: "autumn",
    target: { resource: "stone", amount: 20 },
    modifier: { type: "rubble_blocks", params: { count: 4 } },
    description: "An ancient golem has sealed the mountain pass with its bulk, blocking the autumn trade caravans. Quarry enough stone to prove your worth and earn passage through.",
    modifierDescription: "Four rubble tiles block random board positions; they cannot be chained and must be cleared by adjacent stone chains.",
  },
  {
    id: "mossback",
    name: "Mossback",
    season: "spring",
    target: { resource: "berry", amount: 30 },
    modifier: { type: "hide_resources", params: { hidden: 4 } },
    description: "A mossy titan lurks in the spring glades, concealing its weakness beneath layers of overgrowth. Harvest enough berries to expose it and drive it from the vale.",
    modifierDescription: "Four resource tiles are hidden face-down on the board and only reveal themselves when included in a chain.",
  },
];

// §9 locked: base = 200◉ × year_number; +1 rune (Phase 3 flat drop).
// Margin scaling: 0% → 1.0×, +100% (cap) → 1.5×.
export function bossReward(boss, progress, year) {
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

// Default board dimensions for modifier init when no live grid is available (e.g. tests)
const DEFAULT_ROWS = 6;
const DEFAULT_COLS = 7;

function makeEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ row: r, col: c }))
  );
}

export function spawnBoss(state, id, year, rng = Math.random) {
  if (state.boss) return state;
  const def = BOSSES.find((b) => b.id === id);
  if (!def) return state;
  const grid = (state.grid && state.grid.length > 0)
    ? state.grid
    : makeEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
  const modifierState = applyModifierToFreshGrid(grid, def.modifier, rng);
  return {
    ...state,
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
      flags: { ...(state.story?.flags ?? {}), [`${id}_active`]: true },
    },
  };
}

export function tickBossTurn(state) {
  if (!state.boss) return state;
  const next = { ...state.boss, turnsRemaining: state.boss.turnsRemaining - 1 };
  const targetMet = next.progress >= next.target.amount;
  const expired = next.turnsRemaining <= 0;
  if (!targetMet && !expired) return { ...state, boss: next };
  const def = BOSSES.find((b) => b.id === state.boss.id);
  const reward = bossReward(def, next.progress, next.year ?? state.boss.year ?? 1);
  const flags = {
    ...(state.story?.flags ?? {}),
    [`${state.boss.id}_active`]: false,
    ...(reward.defeated ? { [`${state.boss.id}_defeated`]: true } : {}),
  };
  return {
    ...state,
    boss: null,
    coins: (state.coins ?? 0) + reward.coins,
    runes: (state.runes ?? 0) + reward.runes,
    story: { ...(state.story ?? {}), flags },
  };
}
