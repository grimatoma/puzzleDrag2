// Target-seeking optimizer — sweep balance knobs toward a goal, non-destructively.
//
// This is the framework that closes the auto-balance loop: given a set of KNOBS
// (each a live get/set onto a constants value) and a LOSS to minimise, it does
// coordinate descent — for each knob, sample candidate values, keep the one that
// most reduces the loss, repeat until acceptable or converged — then emits the
// winning values as a dotted-path change-list that M1's codemod (applyPatch.ts)
// writes back to constants.ts.
//
// Two properties make it safe to run against the live catalog:
//   • NON-DESTRUCTIVE — it mutates the in-memory constants to evaluate each
//     candidate, then ALWAYS restores the originals (finally). It changes
//     nothing on disk; it only returns a proposal. Disk changes happen later,
//     reviewably, via `playtest:apply`.
//   • GOAL-DRIVEN — the loss is supplied by the caller, never invented here. The
//     bundled `spreadObjective` targets the objective family-value-spread audit
//     (no design input needed). Pacing/economy objectives plug into the same
//     `optimize()` once their target bands are set (see targets.ts).
//
// Pure given the reducer/catalog: no RNG, fixed candidate grid → deterministic.

import { ITEMS } from "../constants.js";
import { familyValueSpread } from "./metrics.js";
import { FAMILY_SPREAD_OUTLIER_FACTOR } from "./targets.js";

/** A single tunable: a live get/set onto a constants value, with bounds. */
export interface Knob {
  /** Dotted constants path for the emitted change-list (e.g. "ITEMS.pearls.value"). */
  path: string;
  min: number;
  max: number;
  integer: boolean;
  get(): number;
  set(v: number): void;
}

export interface OptimizeSpec {
  knobs: Knob[];
  /** Current loss to MINIMISE (0 = acceptable). Measures the live state internally. */
  loss(): number;
  /** Candidate values sampled per knob per pass (default 24). */
  samples?: number;
  /** Max coordinate-descent passes (default 8). */
  maxPasses?: number;
}

export interface OptimizeResult {
  /** Dotted path → new value, for knobs whose value changed. Feeds playtest:apply. */
  changeList: Record<string, number>;
  /** Loss before and after the search. */
  before: number;
  after: number;
  /** True when the final loss is 0 (the goal was met). */
  acceptable: boolean;
  passes: number;
}

/** Even grid of candidate values across [min, max] (inclusive), deduped. */
function candidates(k: Knob, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const v = k.min + ((k.max - k.min) * i) / n;
    out.push(k.integer ? Math.round(v) : v);
  }
  return [...new Set(out)];
}

/**
 * Coordinate descent to minimise `spec.loss()`. Returns the proposed change-list
 * and ALWAYS restores the live constants before returning (non-destructive).
 */
export function optimize(spec: OptimizeSpec): OptimizeResult {
  const samples = spec.samples ?? 24;
  const maxPasses = spec.maxPasses ?? 8;
  const { knobs } = spec;
  const originals = knobs.map((k) => k.get());
  const before = spec.loss();
  let passes = 0;
  try {
    for (; passes < maxPasses; passes++) {
      if (spec.loss() <= 0) break;
      let improved = false;
      for (const k of knobs) {
        const base = k.get();
        let best = base;
        let bestLoss = spec.loss();
        for (const v of candidates(k, samples)) {
          k.set(v);
          const l = spec.loss();
          // Strictly-lower loss wins; on a tie prefer the HIGHER value so we cut
          // as little as possible (least-disruptive change that still clears the goal).
          if (l < bestLoss - 1e-9 || (Math.abs(l - bestLoss) < 1e-9 && v > best)) {
            bestLoss = l;
            best = v;
          }
        }
        k.set(best);
        if (best !== base) improved = true;
      }
      if (!improved) break;
    }
    const after = spec.loss();
    const changeList: Record<string, number> = {};
    knobs.forEach((k, i) => {
      const v = k.get();
      if (v !== originals[i]) changeList[k.path] = v;
    });
    return { changeList, before, after, acceptable: after <= 1e-9, passes };
  } finally {
    knobs.forEach((k, i) => k.set(originals[i])); // restore — change nothing on disk
  }
}

// ── Objective: the family-value spread (objective, needs no design input) ──────

/** A live knob onto an ITEMS resource's sell value (only ever cut, never raised). */
function itemValueKnob(key: string, originalValue: number): Knob {
  const items = ITEMS as Record<string, { value: number }>;
  return {
    path: `ITEMS.${key}.value`,
    min: 1,
    max: originalValue,
    integer: true,
    get: () => items[key].value,
    set: (v) => { items[key].value = Math.round(v); },
  };
}

/**
 * Compress every HIGH family-value outlier under the ceiling `factor × median`,
 * so no produced resource pays more than `factor`× a typical tile-spend — the
 * same balance smell the harness audit flags, framed as a minimisation. The
 * ceiling is pinned to the ORIGINAL median so the target doesn't drift as values
 * are cut. Knobs are exactly the currently-flagged outliers' ITEMS values.
 */
export function spreadObjective(factor: number = FAMILY_SPREAD_OUTLIER_FACTOR): OptimizeSpec {
  const sp0 = familyValueSpread(factor);
  const ceiling = factor * sp0.median;
  const knobs = sp0.entries
    .filter((e) => e.flag === "high")
    .map((e) => itemValueKnob(e.resourceKey, e.resourceValue));
  const loss = () => {
    const sp = familyValueSpread(factor);
    let excess = 0;
    for (const e of sp.entries) excess += Math.max(0, e.realizedValuePerTile - ceiling);
    return excess;
  };
  return { knobs, loss };
}
