// Story Path Walker — given a starting beat, depth-first walks every choice
// cascade and returns the set of paths to a terminal state (a beat with no
// outgoing choice, or a beat that loops back to the start). For each path
// the walker also computes aggregated outcome effects: total coins / embers
// / core ingots / gems / bond deltas, plus the set of flags that get set
// or cleared along the way.
//
// Useful for QA: "given the player opens with act2_first_hinge, what are
// all the possible bond outcomes for Bram by the time the branch resolves?"
//
// Pure module — no React. Walks the effective draft (so unsaved edits are
// respected, the same as the visual preview).

import { effectiveBeat, effectiveChoices } from "./shared.jsx";

const DEFAULT_OPTS = Object.freeze({
  maxDepth: 12,    // upper bound on path length (root counted)
  maxPaths: 64,    // cap on the number of full paths returned
});

const asArr = (v) => Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []);

function emptyEffects() {
  return {
    coins: 0, embers: 0, coreIngots: 0, gems: 0,
    bondDeltas: {},         // npcKey → integer delta
    flagsSet: new Set(),
    flagsCleared: new Set(),
    resourceDeltas: {},     // resourceKey → integer
    heirloomDeltas: {},     // heirloomKey → integer
  };
}

function applyChoiceEffects(target, choice) {
  const o = choice?.outcome || {};
  if (Number.isFinite(o.coins)) target.coins += o.coins;
  if (Number.isFinite(o.embers)) target.embers += o.embers;
  if (Number.isFinite(o.coreIngots)) target.coreIngots += o.coreIngots;
  if (Number.isFinite(o.gems)) target.gems += o.gems;
  if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
    target.bondDeltas[o.bondDelta.npc] = (target.bondDeltas[o.bondDelta.npc] || 0) + o.bondDelta.amount;
  }
  for (const f of asArr(o.setFlag)) target.flagsSet.add(f);
  for (const f of asArr(o.clearFlag)) target.flagsCleared.add(f);
  for (const [k, n] of Object.entries(o.resources || {})) {
    if (!Number.isFinite(n)) continue;
    target.resourceDeltas[k] = (target.resourceDeltas[k] || 0) + n;
  }
  for (const [k, n] of Object.entries(o.heirlooms || {})) {
    if (!Number.isFinite(n)) continue;
    target.heirloomDeltas[k] = (target.heirloomDeltas[k] || 0) + n;
  }
}

function applyOnComplete(target, beat) {
  for (const f of asArr(beat?.onComplete?.setFlag)) target.flagsSet.add(f);
}

function cloneEffects(e) {
  return {
    coins: e.coins, embers: e.embers, coreIngots: e.coreIngots, gems: e.gems,
    bondDeltas: { ...e.bondDeltas },
    flagsSet: new Set(e.flagsSet),
    flagsCleared: new Set(e.flagsCleared),
    resourceDeltas: { ...e.resourceDeltas },
    heirloomDeltas: { ...e.heirloomDeltas },
  };
}

function finalisePath(path, effects, terminalBeat, terminalReason) {
  return {
    beats: [...path.beats],
    choices: [...path.choices],
    terminalBeat,
    terminalReason,
    effects: {
      coins: effects.coins, embers: effects.embers, coreIngots: effects.coreIngots, gems: effects.gems,
      bondDeltas: { ...effects.bondDeltas },
      flagsSet: [...effects.flagsSet].sort(),
      flagsCleared: [...effects.flagsCleared].sort(),
      resourceDeltas: { ...effects.resourceDeltas },
      heirloomDeltas: { ...effects.heirloomDeltas },
    },
  };
}

/**
 * Walk every reachable path from `startBeatId` through the draft's choice
 * tree. Returns `{ paths, truncated }`.
 *
 * - A path ends when: the current beat has no choices, the choice has no
 *   queueBeat, the choice queues a beat that doesn't exist, the next beat
 *   would re-visit a beat already on this path (cycle), or depth/path-count
 *   caps are exceeded.
 * - Each path carries the sequence of `beats[]` visited and the
 *   `choices[]` taken between them, plus a per-path `effects` aggregate.
 */
export function enumerateStoryPaths(startBeatId, draft, options = DEFAULT_OPTS) {
  const opts = { ...DEFAULT_OPTS, ...(options || {}) };
  const startBeat = effectiveBeat(startBeatId, draft);
  if (!startBeat) return { paths: [], truncated: false };

  const out = [];
  let truncated = false;

  const walk = (beatId, path, effects, depth) => {
    if (out.length >= opts.maxPaths) { truncated = true; return; }
    const beat = effectiveBeat(beatId, draft);
    if (!beat) {
      out.push(finalisePath(path, effects, beatId, "missing-target"));
      return;
    }
    applyOnComplete(effects, beat);
    const choices = effectiveChoices(beatId, draft);
    if (choices.length === 0) {
      out.push(finalisePath(path, effects, beatId, "ends-here"));
      return;
    }
    if (depth >= opts.maxDepth) {
      out.push(finalisePath(path, effects, beatId, "depth-cap"));
      truncated = true;
      return;
    }
    for (const choice of choices) {
      if (out.length >= opts.maxPaths) { truncated = true; return; }
      const branchEffects = cloneEffects(effects);
      applyChoiceEffects(branchEffects, choice);
      const target = choice?.outcome?.queueBeat;
      if (!target) {
        out.push(finalisePath(
          { beats: path.beats, choices: [...path.choices, { beatId, choiceId: choice.id, label: choice.label }] },
          branchEffects, beatId, "no-target",
        ));
        continue;
      }
      if (path.beats.includes(target)) {
        out.push(finalisePath(
          { beats: path.beats, choices: [...path.choices, { beatId, choiceId: choice.id, label: choice.label }] },
          branchEffects, target, "loop",
        ));
        continue;
      }
      walk(target, {
        beats: [...path.beats, target],
        choices: [...path.choices, { beatId, choiceId: choice.id, label: choice.label }],
      }, branchEffects, depth + 1);
    }
  };

  walk(startBeatId, { beats: [startBeatId], choices: [] }, emptyEffects(), 1);
  return { paths: out, truncated };
}

/** Summary line for a list of paths — useful for UI labels. */
export function summarisePaths(walkResult) {
  if (!walkResult || !Array.isArray(walkResult.paths)) return "no paths";
  const n = walkResult.paths.length;
  const truncated = walkResult.truncated;
  return `${n} path${n === 1 ? "" : "s"}${truncated ? " (truncated)" : ""}`;
}
