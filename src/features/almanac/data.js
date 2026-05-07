/**
 * Phase 7.2 — Almanac XP track and tier rewards.
 * §17 locked: linear curve, 150 XP per level. Do not redesign.
 */

// §17 locked: 150 XP per level, linear. Do not redesign.
export const XP_PER_LEVEL = 150;

/**
 * Phase 7 ships tiers 1–5. §16 calls for 10 tiers total.
 * TODO: phase 11+ extends to tier 10 per GAME_SPEC §16
 *       (crafting blueprints + cosmetic unlocks at tiers 6–10).
 */
export const ALMANAC_TIERS = [
  { tier: 1, level: 1, reward: { coins: 50 } },
  { tier: 2, level: 2, reward: { tools: { seedpack: 1 } } },
  { tier: 3, level: 3, reward: { coins: 75, tools: { lockbox: 1 } } },
  { tier: 4, level: 4, reward: { tools: { reshuffle: 1 } } },
  { tier: 5, level: 5, reward: { structural: "startingExtraScythe" } },
];

/**
 * Pure: award XP to state.almanac.
 * Returns { newState, leveledTo } where leveledTo is the new level if
 * this gain crossed a threshold, else null.
 */
export function awardXp(state, amount) {
  const xp = (state.almanac?.xp ?? 0) + amount;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const prev = state.almanac?.level ?? 1;
  return {
    leveledTo: level > prev ? level : null,
    newState: {
      ...state,
      almanac: { ...state.almanac, xp, level },
    },
  };
}

/**
 * Pure: claim an almanac tier reward.
 * Returns { ok, newState }.
 * ok = false if tier doesn't exist, already claimed, or level < tier.level.
 */
export function claimAlmanacTier(state, tier) {
  const def = ALMANAC_TIERS.find((t) => t.tier === tier);
  if (!def) return { ok: false, newState: state };
  if (state.almanac.claimed[tier]) return { ok: false, newState: state };
  if (state.almanac.level < def.level) return { ok: false, newState: state };

  let next = {
    ...state,
    almanac: {
      ...state.almanac,
      claimed: { ...state.almanac.claimed, [tier]: true },
    },
  };

  if (def.reward.coins) {
    next = { ...next, coins: (next.coins ?? 0) + def.reward.coins };
  }
  if (def.reward.tools) {
    next = { ...next, tools: { ...next.tools } };
    for (const [k, v] of Object.entries(def.reward.tools)) {
      next.tools[k] = (next.tools[k] ?? 0) + v;
    }
  }
  if (def.reward.structural === "startingExtraScythe") {
    next = { ...next, tools: { ...next.tools, startingExtraScythe: true } };
  }

  return { ok: true, newState: next };
}
