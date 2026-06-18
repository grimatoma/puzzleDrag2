// Hearthkeeping (the idle layer) — pure tables + accrual math.
//
// EVERYTHING numeric and curve-shaped lives here so it stays fully
// unit-testable in the node/vitest env (no React, no localStorage, no
// `Date.now()`) and so the AI-playtest balance harness (docs/projects/05) can
// sweep the curves without touching the reducer.
//
// Design intent: this is a deliberately SMALL "numbers go up" loop that
// AUGMENTS the puzzle board — it must never replace or trivialize active play.
// The soft caps, offline cap, and hard-capped multipliers below are what keep
// idle income a small fraction of a real board run. Tune via doc 05.

export interface GeneratorDef {
  id: string;                      // "kindling" | "kiln" | "ashgarden"
  name: string;
  blurb: string;                   // one-line flavour for the view
  baseRatePerSec: number;          // Warmth/sec contributed at level 1
  baseCost: number;                // Warmth to buy level 1
  costGrowth: number;              // geometric cost multiplier per level (>1)
  softCapLevel: number;            // level after which rate gains taper (sqrt)
  unlockAtWarmthLifetime: number;  // milestone gate (lifetime Warmth this cycle)
}

// EXAMPLE NUMBERS — a starting point, tuned via doc 05. Bounded so idle income
// stays well below active board income.
export const GENERATORS: GeneratorDef[] = [
  { id: "kindling",  name: "Kindling Pile", blurb: "Dry twigs catch the first spark.",   baseRatePerSec: 0.05, baseCost: 10,   costGrowth: 1.15, softCapLevel: 25, unlockAtWarmthLifetime: 0 },
  { id: "kiln",      name: "Charcoal Kiln", blurb: "Slow-burning embers hold their heat.", baseRatePerSec: 0.40, baseCost: 250,  costGrowth: 1.18, softCapLevel: 20, unlockAtWarmthLifetime: 500 },
  { id: "ashgarden", name: "Ash Garden",    blurb: "Warmth gardened from settled ash.",   baseRatePerSec: 3.00, baseCost: 6000, costGrowth: 1.22, softCapLevel: 15, unlockAtWarmthLifetime: 20000 },
];

export function generatorById(id: string): GeneratorDef | undefined {
  return GENERATORS.find((g) => g.id === id);
}

// Diminishing returns past the soft cap: each level above softCap counts as the
// sqrt of its linear contribution. Keeps "numbers go up" while flattening any
// runaway.
export function generatorRate(def: GeneratorDef, level: number): number {
  if (level <= 0) return 0;
  const linear = Math.min(level, def.softCapLevel);
  const over = Math.max(0, level - def.softCapLevel);
  return def.baseRatePerSec * (linear + Math.sqrt(over));
}

// Geometric cost for the NEXT level (level -> level + 1).
export function generatorCost(def: GeneratorDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}

// Total Warmth/sec across all owned generators, including the permanent
// Hearthlight (prestige) multiplier. Bounded by `hearthlightMult`.
export function totalWarmthPerSec(levels: Record<string, number>, hearthlight: number): number {
  const base = GENERATORS.reduce((sum, g) => sum + generatorRate(g, levels[g.id] ?? 0), 0);
  return base * hearthlightMult(hearthlight);
}

// Offline accrual cap: at most 8 real hours of production credited on the next
// foreground tick, no matter how long the player was away.
export const OFFLINE_CAP_SECONDS = 8 * 3600;

// Prestige ("Rekindle"): Hearthlight gained from lifetime Warmth this cycle.
// Cube-root curve → the first Rekindle is meaningful, later ones diminish.
export const REKINDLE_MIN_LIFETIME_WARMTH = 10000; // can't Rekindle before this

export function hearthlightFromLifetime(lifetimeWarmth: number): number {
  if (lifetimeWarmth < REKINDLE_MIN_LIFETIME_WARMTH) return 0;
  return Math.floor(Math.cbrt(lifetimeWarmth / 1000));
}

// Permanent prestige multiplier on idle production: +5% per Hearthlight,
// HARD CAP at +100% (x2). Keeps the idle layer from snowballing.
export function hearthlightMult(hearthlight: number): number {
  return 1 + Math.min(Math.max(hearthlight, 0) * 0.05, 1.0);
}

// The ONE board-run buff Hearthlight grants. Capped tiny so it augments, never
// trivializes the active economy: +1% chain coin payout per Hearthlight, HARD
// CAP +15%. Read by the board's chain-coin payout path (src/state.ts).
export const HEARTHLIGHT_BOARD_COIN_CAP = 0.15;

export function hearthlightBoardCoinBonus(hearthlight: number): number {
  return Math.min(Math.max(hearthlight, 0) * 0.01, HEARTHLIGHT_BOARD_COIN_CAP);
}

/** True if a generator is unlocked at the given lifetime-Warmth milestone. */
export function generatorUnlocked(def: GeneratorDef, lifetimeWarmth: number): boolean {
  return lifetimeWarmth >= def.unlockAtWarmthLifetime;
}
