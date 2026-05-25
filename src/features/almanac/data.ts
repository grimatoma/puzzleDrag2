/**
 * Phase 7.2 — Almanac XP track and tier rewards.
 * §17 locked: linear curve, 150 XP per level. Do not redesign.
 */

// §17 locked: 150 XP per level, linear. Do not redesign.
export const XP_PER_LEVEL = 150;

/**
 * Phase 7 ships tiers 1–5. Phase 11+ extends to tier 10 per GAME_SPEC §16.
 */
export const ALMANAC_TIERS = [
  {
    tier: 1, level: 1,
    name: "Seedling",
    description: "Your first entry in the Almanac — you've started keeping records of the vale.",
    reward: { coins: 50 },
  },
  {
    tier: 2, level: 2,
    name: "Apprentice Keeper",
    description: "A seed pack from Mira to help you broaden your harvest.",
    reward: { tools: { basic: 1 } },
  },
  {
    tier: 3, level: 3,
    name: "Field Scholar",
    description: "A lockbox of coin and a sturdy lock to keep your stores safe.",
    reward: { coins: 75, tools: { rare: 1 } },
  },
  {
    tier: 4, level: 4,
    name: "Chronicler",
    description: "A reshuffle token — handy when the board needs a fresh deal.",
    reward: { tools: { shuffle: 1 } },
  },
  {
    tier: 5, level: 5,
    name: "Master Harvester",
    description: "A legendary scythe that stays in your toolkit at the start of every new season.",
    reward: { structural: "startingExtraScythe" },
  },
  {
    tier: 6, level: 6,
    name: "Village Architect",
    description: "Plans for expanding the village. Unlocks an extra blueprint slot for crafting.",
    reward: { coins: 150, structural: "extraBlueprintSlot" },
  },
  {
    tier: 7, level: 7,
    name: "Merchant Prince",
    description: "A golden seal for trade. Increases the value of all delivered orders by 10%.",
    reward: { structural: "goldSeal", coins: 250 },
  },
  {
    tier: 8, level: 8,
    name: "Timekeeper",
    description: "An ancient hourglass that grants an extra turn in every farm and mine session.",
    reward: { structural: "extraTurn", tools: { rare: 2 } },
  },
  {
    tier: 9, level: 9,
    name: "Vale Guardian",
    description: "A significant grant from the Capital to honor your stewardship.",
    reward: { coins: 500, tools: { shuffle: 2, rare: 1 } },
  },
  {
    tier: 10, level: 10,
    name: "Keeper of the Hearth",
    description: "The highest honor. You have mastered the ways of the vale.",
    reward: { coins: 1000, runes: 1, tools: { basic: 5, rare: 3, shuffle: 1 } },
  },
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
  if (def.reward.runes) {
    next = { ...next, runes: (next.runes ?? 0) + def.reward.runes };
  }
  if (def.reward.structural) {
    // Structural flags are latched in state.tools for now, or state directly.
    // extraTurn and goldSeal are flags the game logic can check.
    next = { ...next, tools: { ...next.tools, [def.reward.structural]: true } };
  }

  return { ok: true, newState: next };
}
