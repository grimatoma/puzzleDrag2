/**
 * Fiber Crush — level + objective model. Hand-authored, finite levels with a
 * move-limit fail model. Pure data + a small pure evaluator (no Phaser, no
 * reducer): the level state machine is fully unit-testable on its own.
 *
 * Objective → board mechanic mapping:
 *   - "collect"   target "wool"   → every fiber tile cleared yields raw wool.
 *   - "dye_color" target <colour> → tiles cleared of that colour become dye.
 *   - "weave"     target "cloth"  → each loom woven (a 5-line / T-match) is cloth.
 */
import type { FiberColor, ColorTally, SpecialTally } from "./resolver.js";
import { FIBER_COLORS } from "./resolver.js";

export type FiberObjectiveType = "collect" | "dye_color" | "weave";

export interface FiberObjective {
  type: FiberObjectiveType;
  /** "wool" for collect, a {@link FiberColor} for dye_color, "cloth" for weave. */
  target: string;
  count: number;
  /** Human-readable goal line for the level-select / HUD. */
  label: string;
}

export interface FiberLevelReward {
  coins: number;
  /** Resource keys (wool/yarn/dye/cloth) → amount credited to zone inventory on win. */
  resources: Record<string, number>;
}

export interface FiberLevel {
  id: string;
  name: string;
  cols: number;
  rows: number;
  colors: FiberColor[];
  /** Move-limit fail model: run out before all objectives are met → lost. */
  moves: number;
  /** ALL must be met before moves run out. */
  objectives: FiberObjective[];
  reward: FiberLevelReward;
  /** Whether the scene seeds booster specials onto the starting board. */
  spawnSpecials?: boolean;
}

/** Accumulated progress over one level run. */
export interface FiberProgress {
  /** Total fiber tiles cleared (= wool). */
  cleared: number;
  /** Per-colour cleared count (= dye of that colour). */
  byColor: Partial<Record<FiberColor, number>>;
  /** Looms woven this run (= cloth). */
  weaves: number;
}

export function emptyProgress(): FiberProgress {
  return { cleared: 0, byColor: {}, weaves: 0 };
}

/**
 * Fold one {@link resolveSwap} result into accumulated progress. Pure: returns
 * a fresh object. Drives the FIBER/RESOLVE_MOVE reducer.
 */
export function applyResolveToProgress(
  prev: FiberProgress,
  result: { cleared: ColorTally; created: SpecialTally },
): FiberProgress {
  const byColor: Partial<Record<FiberColor, number>> = { ...prev.byColor };
  let clearedTotal = 0;
  for (const color of FIBER_COLORS) {
    const n = result.cleared[color] ?? 0;
    if (n > 0) {
      byColor[color] = (byColor[color] ?? 0) + n;
      clearedTotal += n;
    }
  }
  return {
    cleared: prev.cleared + clearedTotal,
    byColor,
    weaves: prev.weaves + (result.created?.loom ?? 0),
  };
}

/** Current progress toward a single objective. */
export function objectiveProgress(objective: FiberObjective, progress: FiberProgress): number {
  switch (objective.type) {
    case "collect": return progress.cleared;
    case "dye_color": return progress.byColor[objective.target as FiberColor] ?? 0;
    case "weave": return progress.weaves;
    default: return 0;
  }
}

export function objectiveMet(objective: FiberObjective, progress: FiberProgress): boolean {
  return objectiveProgress(objective, progress) >= objective.count;
}

export function allObjectivesMet(level: FiberLevel, progress: FiberProgress): boolean {
  return level.objectives.every((o) => objectiveMet(o, progress));
}

export type FiberLevelStatus = "playing" | "won" | "lost";

/**
 * Pure level state machine. Won the instant all objectives are met; lost when
 * the move budget is exhausted with any objective unmet; otherwise still
 * playing. (Won takes priority — meeting the goal on the final move still wins.)
 */
export function evaluateLevel(
  level: FiberLevel,
  progress: FiberProgress,
  movesUsed: number,
): FiberLevelStatus {
  if (allObjectivesMet(level, progress)) return "won";
  if (movesUsed >= level.moves) return "lost";
  return "playing";
}

/** 1–3 stars by move efficiency (3 = comfortably under budget). One-time per level. */
export function computeStars(level: FiberLevel, movesUsed: number): number {
  if (movesUsed <= Math.ceil(level.moves * 0.6)) return 3;
  if (movesUsed <= Math.ceil(level.moves * 0.85)) return 2;
  return 1;
}

const ALL_COLORS: FiberColor[] = ["white", "grey", "brown", "black", "cream"];

/**
 * The starter level set. Conservative one-time rewards (gated by
 * `unlockedLevel`) so Fiber is a new faucet that can't be farmed for coins.
 */
export const FIBER_LEVELS: FiberLevel[] = [
  {
    id: "L1",
    name: "First Fleece",
    cols: 7,
    rows: 7,
    colors: ALL_COLORS,
    moves: 20,
    objectives: [
      { type: "collect", target: "wool", count: 40, label: "Shear 40 wool" },
    ],
    reward: { coins: 120, resources: { wool: 20 } },
  },
  {
    id: "L2",
    name: "The Dye-Vat",
    cols: 8,
    rows: 8,
    colors: ALL_COLORS,
    moves: 18,
    objectives: [
      { type: "collect", target: "wool", count: 60, label: "Shear 60 wool" },
      { type: "dye_color", target: "brown", count: 15, label: "Dye 15 brown" },
    ],
    reward: { coins: 200, resources: { yarn: 10, dye: 6 } },
  },
  {
    id: "L3",
    name: "Weave the Pattern",
    cols: 8,
    rows: 8,
    colors: ALL_COLORS,
    moves: 16,
    objectives: [
      { type: "weave", target: "cloth", count: 3, label: "Weave 3 cloth" },
    ],
    reward: { coins: 350, resources: { cloth: 4 } },
    spawnSpecials: true,
  },
];

export function fiberLevelById(id: string): FiberLevel | undefined {
  return FIBER_LEVELS.find((l) => l.id === id);
}
