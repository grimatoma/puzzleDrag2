// Choice-outcome heatmap — pure aggregation of every choice's reward
// across the story tree, bucketed by Act / Side / Drafts so designers can
// spot uneven economy distribution (e.g. "every coin reward is in Act II").
//
// The blob it returns is small and trivial to render: see StatsPanel for
// the existing per-NPC bar style; the heatmap reuses the same idiom.

import { effectiveBeat, allBeatIds } from "./shared.jsx";

const BUCKETS = Object.freeze(["act1", "act2", "act3", "side", "draft"]);

function bucketFor(beat, isDraft) {
  if (isDraft) return "draft";
  if (Number.isFinite(beat?.act)) return `act${beat.act}`;
  return "side";
}

function emptyBuckets() {
  const out = {};
  for (const b of BUCKETS) out[b] = 0;
  return out;
}

const asArr = (v) => Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []);

/**
 * Walk the draft and return a heatmap of choice outcomes, broken down by
 * Act/Side/Drafts bucket:
 *
 *   {
 *     buckets: ['act1', 'act2', 'act3', 'side', 'draft'],
 *     counts:  { coins: { act1: 12, act2: 25, ... }, ... },
 *     totals:  { coins: 37, embers: 8, ... },
 *     bondPerNpc: { wren: { act1: 4, ... }, mira: { ... } },
 *     choiceCounts: { act1: 18, act2: 22, ... },
 *   }
 *
 * `counts` covers coins / embers / coreIngots / gems / setFlags / clearFlags.
 * Per-NPC bond bookkeeping lives in `bondPerNpc` keyed by speaker.
 */
export function computeOutcomeHeatmap(draft) {
  const counts = {
    coins:      emptyBuckets(),
    embers:     emptyBuckets(),
    coreIngots: emptyBuckets(),
    gems:       emptyBuckets(),
    setFlags:   emptyBuckets(),
    clearFlags: emptyBuckets(),
  };
  const choiceCounts = emptyBuckets();
  const totals = { coins: 0, embers: 0, coreIngots: 0, gems: 0, setFlags: 0, clearFlags: 0 };
  const bondPerNpc = {};

  const ids = allBeatIds(draft);
  for (const id of ids) {
    const beat = effectiveBeat(id, draft);
    if (!beat) continue;
    const choices = Array.isArray(beat.choices) ? beat.choices : [];
    if (choices.length === 0) continue;
    const isDraft = !beat.act && !beat.side && id.startsWith("branch_");
    const bucket = bucketFor(beat, isDraft);
    for (const c of choices) {
      choiceCounts[bucket] += 1;
      const o = c?.outcome || {};
      for (const key of ["coins", "embers", "coreIngots", "gems"]) {
        if (!Number.isFinite(o[key]) || o[key] === 0) continue;
        counts[key][bucket] += o[key];
        totals[key] += o[key];
      }
      const sFlags = asArr(o.setFlag).filter(Boolean);
      if (sFlags.length > 0) { counts.setFlags[bucket] += sFlags.length; totals.setFlags += sFlags.length; }
      const cFlags = asArr(o.clearFlag).filter(Boolean);
      if (cFlags.length > 0) { counts.clearFlags[bucket] += cFlags.length; totals.clearFlags += cFlags.length; }
      if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount) && o.bondDelta.amount !== 0) {
        if (!bondPerNpc[o.bondDelta.npc]) bondPerNpc[o.bondDelta.npc] = emptyBuckets();
        bondPerNpc[o.bondDelta.npc][bucket] += o.bondDelta.amount;
      }
    }
  }
  return { buckets: [...BUCKETS], counts, totals, bondPerNpc, choiceCounts };
}

export const OUTCOME_BUCKETS = BUCKETS;
