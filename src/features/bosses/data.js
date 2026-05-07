export const BOSSES = [
  {
    id: "frostmaw",
    name: "Frostmaw",
    season: "winter",
    target: { resource: "log", amount: 30 },
    modifier: { type: "freeze_columns", params: { n: 2 } },
  },
  {
    id: "quagmire",
    name: "Quagmire",
    season: "spring",
    target: { resource: "hay", amount: 50 },
    modifier: { type: "respawn_boost", params: { boost: ["log", "hay"], factor: 1.5 } },
  },
  {
    id: "ember_drake",
    name: "Ember Drake",
    season: "summer",
    target: { resource: "ingot", amount: 3 },
    modifier: { type: "heat_tiles", params: { spawnPerTurn: 1, burnAfter: 2 } },
  },
  {
    id: "old_stoneface",
    name: "Old Stoneface",
    season: "autumn",
    target: { resource: "stone", amount: 20 },
    modifier: { type: "rubble_blocks", params: { count: 4 } },
  },
  {
    id: "mossback",
    name: "Mossback",
    season: "spring",
    target: { resource: "berry", amount: 30 },
    modifier: { type: "hide_resources", params: { hidden: 4 } },
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
