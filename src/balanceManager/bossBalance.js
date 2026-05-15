// Boss difficulty estimator. Given each boss's target resource + amount
// and the locked-by-§18 BOSS_WINDOW_TURNS = 10, derive:
//
//   - perTurnTarget: amount / windowTurns — the tile-resource per turn the
//     player needs on average to clear the boss
//   - difficultyTier: a coarse band (gentle / steady / hard / brutal)
//     based on the per-turn target vs typical chain yields
//   - modifierFlag: a friendly badge derived from boss.modifier.type
//     (freezes board / boosts respawn / heats tiles / etc.)
//
// Pure module. The bands and yield assumptions live as constants here so
// designers can tune them without touching app code.

import { BOSSES, BOSS_WINDOW_TURNS } from "../features/bosses/data.js";

/**
 * Approximate "easy" yield-per-turn for a typical chain. Values larger
 * than this tier suggest the boss needs aggressive play (longer chains,
 * board-clearing tools, lucky drops).
 */
const YIELD_TIERS = [
  { id: "gentle",   max: 3,    label: "Gentle",  hint: "≤3/turn — comfortable chain pace." },
  { id: "steady",   max: 6,    label: "Steady",  hint: "4–6/turn — sustained chains, mind the pool." },
  { id: "hard",     max: 12,   label: "Hard",    hint: "7–12/turn — long chains and tool support." },
  { id: "brutal",   max: 9999, label: "Brutal",  hint: "13+/turn — only with major board manipulation." },
];

const MODIFIER_LABEL = {
  freeze_columns:  { label: "Freezes columns",  hint: "Locks N columns until thawed (chain disruption)." },
  respawn_boost:   { label: "Boosted respawn",  hint: "Specific tiles respawn faster — favours the target res." },
  heat_tiles:      { label: "Heat tiles",       hint: "Some board cells burn the resource after N turns." },
  rubble_blocks:   { label: "Rubble blocks",    hint: "N tiles are blocked and must be cleared by stone chains." },
  hide_resources:  { label: "Hidden tiles",     hint: "N tiles face-down — chains reveal them." },
  min_chain:       { label: "Min chain length", hint: "Chains shorter than N produce nothing." },
};

function bandFor(perTurn) {
  for (const tier of YIELD_TIERS) if (perTurn <= tier.max) return tier;
  return YIELD_TIERS[YIELD_TIERS.length - 1];
}

/**
 * Assess one boss. Returns `{ boss, perTurnTarget, tier, modifier, marginBands }`.
 *   - marginBands: a quick-glance triplet of "how much extra over target
 *     yields the +50% scaling bonus" — useful for tuning the reward curve.
 */
export function assessBoss(boss, { windowTurns = BOSS_WINDOW_TURNS } = {}) {
  const amount = Number(boss?.target?.amount) || 0;
  const perTurnTarget = windowTurns > 0 ? amount / windowTurns : amount;
  const tier = bandFor(perTurnTarget);
  const modifierType = boss?.modifier?.type;
  const modifier = MODIFIER_LABEL[modifierType] || { label: modifierType || "—", hint: "" };
  return {
    boss,
    perTurnTarget: Number(perTurnTarget.toFixed(2)),
    tier,
    modifier,
    marginBands: {
      defeat: amount,
      bonusMargin50: Math.ceil(amount * 1.5),
      bonusMargin100: Math.ceil(amount * 2),
    },
  };
}

/** Assess every boss in the catalog. */
export function assessAllBosses({ bosses = BOSSES, windowTurns = BOSS_WINDOW_TURNS } = {}) {
  return (Array.isArray(bosses) ? bosses : []).map((b) => assessBoss(b, { windowTurns }));
}

export const BOSS_DIFFICULTY_TIERS = YIELD_TIERS.map((t) => t.id);
export const BOSS_TIER_LABEL = Object.fromEntries(YIELD_TIERS.map((t) => [t.id, t.label]));
