// Strategy-driven playthrough simulator. Walks the story tree from a given
// beat by picking a choice at each fork according to a strategy, until the
// branch ends (no choice has a queueBeat, depth-cap, or revisiting a beat).
//
// Strategies model "what does the typical X player experience?":
//
//   first    — always pick the leftmost choice (index 0)
//   kindest  — prefer choices that raise NPC bond; tiebreaks on index
//   cruelest — prefer choices that lower NPC bond
//   richest  — prefer choices with the largest currency reward
//   bargain  — prefer choices that flip the most flags
//
// Returns a stepwise trace + the final accumulated state, both easy to
// render as a table or a stacked comparison view.
//
// Pure module; no React.

import { effectiveBeat, effectiveChoices } from "./shared.jsx";
import type { PlaythroughFinalState, PlaythroughResult, PlaythroughStep, StoryBeat, StoryChoice, StoryDraft, TerminalReason } from "./types.js";

interface StrategyEntry {
  label: string;
  score: (choice: StoryChoice) => number;
}

const STRATEGIES: Record<string, StrategyEntry> = Object.freeze({
  first: {
    label: "First choice",
    score: () => 0,                 // ties; tiebreaker (lower index) is automatic
  },
  kindest: {
    label: "Kindest path",
    score: (choice) => {
      const d = choice?.outcome?.bondDelta?.amount;
      return Number.isFinite(d) ? (d as number) : 0;
    },
  },
  cruelest: {
    label: "Cruelest path",
    score: (choice) => {
      const d = choice?.outcome?.bondDelta?.amount;
      return Number.isFinite(d) ? -(d as number) : 0;
    },
  },
  richest: {
    label: "Richest path",
    score: (choice) => {
      const o = choice?.outcome || {};
      return (Number(o.embers) || 0) * 5 + (Number(o.coreIngots) || 0) * 3 + (Number(o.gems) || 0) * 4 + (Number(o.coins) || 0);
    },
  },
  bargain: {
    label: "Most flags",
    score: (choice) => {
      const o = choice?.outcome || {};
      const sf = Array.isArray(o.setFlag) ? o.setFlag.length : (o.setFlag ? 1 : 0);
      const cf = Array.isArray(o.clearFlag) ? o.clearFlag.length : (o.clearFlag ? 1 : 0);
      return sf + cf;
    },
  },
});

export const PLAYTHROUGH_STRATEGIES = Object.keys(STRATEGIES);

function pickChoice(choices: StoryChoice[], strategy: string): StoryChoice {
  const fn = STRATEGIES[strategy]?.score;
  if (!fn || choices.length <= 1) return choices[0];
  let best: StoryChoice | null = null;
  let bestScore = -Infinity;
  choices.forEach((c) => {
    const score = fn(c);
    if (score > bestScore || (score === bestScore && best === null)) {
      bestScore = score;
      best = c;
    }
  });
  return best || choices[0];
}

const asArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : (typeof v === "string" && v ? [v] : []);

interface MutableState {
  coins: number;
  embers: number;
  coreIngots: number;
  gems: number;
  bonds: Record<string, number>;
  flagsSet: Set<string>;
  flagsCleared: Set<string>;
}

function applyChoiceState(state: MutableState, choice: StoryChoice | null, beat: StoryBeat | null): MutableState {
  const next: MutableState = {
    coins: state.coins, embers: state.embers, coreIngots: state.coreIngots, gems: state.gems,
    bonds: { ...state.bonds },
    flagsSet: new Set(state.flagsSet),
    flagsCleared: new Set(state.flagsCleared),
  };
  for (const f of asArr(beat?.onComplete?.setFlag)) next.flagsSet.add(f);
  const o = choice?.outcome || {};
  if (Number.isFinite(o.coins)) next.coins += o.coins as number;
  if (Number.isFinite(o.embers)) next.embers += o.embers as number;
  if (Number.isFinite(o.coreIngots)) next.coreIngots += o.coreIngots as number;
  if (Number.isFinite(o.gems)) next.gems += o.gems as number;
  if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
    next.bonds[o.bondDelta.npc] = (next.bonds[o.bondDelta.npc] || 0) + o.bondDelta.amount;
  }
  for (const f of asArr(o.setFlag)) next.flagsSet.add(f);
  for (const f of asArr(o.clearFlag)) { next.flagsCleared.add(f); next.flagsSet.delete(f); }
  return next;
}

function freezeState(state: MutableState): PlaythroughFinalState {
  return {
    coins: state.coins, embers: state.embers, coreIngots: state.coreIngots, gems: state.gems,
    bonds: { ...state.bonds },
    flagsSet: [...state.flagsSet].sort(),
    flagsCleared: [...state.flagsCleared].sort(),
  };
}

const initialState = (): MutableState => ({
  coins: 0, embers: 0, coreIngots: 0, gems: 0,
  bonds: {},
  flagsSet: new Set(),
  flagsCleared: new Set(),
});

/**
 * Walk from `startBeatId` using the named strategy. Returns
 *   { strategy, steps: [{ beatId, beatTitle, chosen: { id, label } }],
 *     finalState, terminalReason }
 * Stops when a beat has no choices ('ends-here'), the chosen choice has
 * no queueBeat ('no-target'), the next beat is missing ('missing-target'),
 * the path would revisit a beat ('loop'), or maxDepth is hit ('depth-cap').
 */
export function simulatePlaythrough(startBeatId: string, draft: StoryDraft | null | undefined, strategy: string = "first", { maxDepth = 32 }: { maxDepth?: number } = {}): PlaythroughResult {
  if (!STRATEGIES[strategy]) throw new Error(`unknown strategy: ${strategy}`);
  let beatId: string | undefined = startBeatId;
  const steps: PlaythroughStep[] = [];
  let state = initialState();
  let terminalReason: TerminalReason = "ends-here";
  while (beatId) {
    const beat = effectiveBeat(beatId, draft);
    if (!beat) { terminalReason = "missing-target"; break; }
    if (steps.find((s) => s.beatId === beatId)) { terminalReason = "loop"; break; }
    const choices = effectiveChoices(beatId, draft);
    if (steps.length >= maxDepth) { terminalReason = "depth-cap"; break; }
    if (choices.length === 0) {
      // Beat is terminal — apply onComplete flags then stop.
      state = applyChoiceState(state, null, beat);
      steps.push({ beatId, beatTitle: beat.title || beatId, chosen: null });
      terminalReason = "ends-here";
      break;
    }
    const choice = pickChoice(choices, strategy);
    state = applyChoiceState(state, choice, beat);
    steps.push({ beatId, beatTitle: beat.title || beatId, chosen: { id: choice.id, label: choice.label } });
    const target = choice?.outcome?.queueBeat;
    if (!target) { terminalReason = "no-target"; break; }
    beatId = target;
  }
  return { strategy, steps, finalState: freezeState(state), terminalReason };
}

/** Convenience: simulate every strategy from a starting beat. */
export function simulateAllPlaythroughs(startBeatId: string, draft: StoryDraft | null | undefined, opts: { maxDepth?: number } = {}): PlaythroughResult[] {
  return PLAYTHROUGH_STRATEGIES.map((s) => ({
    ...simulatePlaythrough(startBeatId, draft, s, opts),
    label: STRATEGIES[s].label,
  }));
}

export function strategyLabel(strategy: string): string {
  return STRATEGIES[strategy]?.label || strategy;
}
