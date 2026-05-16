// Bond decay projection — applies the canonical `decayBond` step
// (in src/features/npcs/bond.js) N times and returns the bond trajectory.
//
// Phase 6.1 of the rules: bonds above 5 decay by 0.1 per inactivity tick
// (Spring/Autumn season-roll), floor at 5. Designers occasionally need to
// see "if a player ignores Mira for 3 months, where does the bond land?"
// This helper answers that for arbitrary starting bonds + tick counts.

import { decayBond } from "../features/npcs/bond.js";

/**
 * Apply `decayBond` `ticks` times to `startBond`. Returns
 * `{ trajectory: [n0, n1, …], end }`.
 */
export function projectBondDecay(startBond, ticks = 12) {
  let value = Number.isFinite(startBond) ? startBond : 5;
  const t = Math.max(0, Math.trunc(ticks));
  const trajectory = [Number(value.toFixed(2))];
  for (let i = 0; i < t; i += 1) {
    value = decayBond(value);
    trajectory.push(Number(value.toFixed(2)));
  }
  return { trajectory, end: trajectory[trajectory.length - 1] };
}

/** Time-to-floor (number of ticks until bond touches 5), or 0 if already at/below floor. */
export function ticksUntilFloor(startBond) {
  if (!Number.isFinite(startBond) || startBond <= 5) return 0;
  let value = startBond;
  let n = 0;
  // Float-noise tolerance: 5.0000001 rounds to 5, so we stop before that
  // counts as another tick.
  while (Math.round(value * 100) / 100 > 5) {
    value = decayBond(value);
    n += 1;
    if (n > 10_000) return Infinity;   // belt-and-braces; can't happen with .1 step
  }
  return n;
}

/** Convenience: project several starting bonds at once for side-by-side comparison. */
export function projectBondLadder({ bonds = [10, 8, 6, 5], ticks = 12 } = {}) {
  return bonds.map((b) => ({
    start: b,
    ...projectBondDecay(b, ticks),
    ticksToFloor: ticksUntilFloor(b),
  }));
}
