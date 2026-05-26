/**
 * Phase 7.2 — Almanac XP track and tier rewards.
 * §17 locked: linear curve, 150 XP per level. Do not redesign.
 */

import type { GameState } from "../../types/state.js";

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

interface AwardXpResult {
  leveledTo: number | null;
  newState: GameState;
}

/**
 * Pure: award XP to state.almanac.
 * Returns { newState, leveledTo } where leveledTo is the new level if
 * this gain crossed a threshold, else null.
 */
export function awardXp(state: GameState, amount: number): AwardXpResult {
  const almanac = (state.almanac ?? {}) as { xp?: number; level?: number; [k: string]: unknown };
  const xp = (almanac.xp ?? 0) + amount;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const prev = almanac.level ?? 1;
  return {
    leveledTo: level > prev ? level : null,
    newState: {
      ...state,
      almanac: { ...almanac, xp, level },
    } as GameState,
  };
}

interface ClaimTierResult {
  ok: boolean;
  newState: GameState;
}

/**
 * Pure: claim an almanac tier reward.
 * Returns { ok, newState }.
 * ok = false if tier doesn't exist, already claimed, or level < tier.level.
 */
export function claimAlmanacTier(state: GameState, tier: number): ClaimTierResult {
  const def = ALMANAC_TIERS.find((t) => t.tier === tier);
  if (!def) return { ok: false, newState: state };
  const almanac = state.almanac as {
    claimed: Record<string | number, boolean>;
    level: number;
    [k: string]: unknown;
  };
  if (almanac.claimed[tier]) return { ok: false, newState: state };
  if (almanac.level < def.level) return { ok: false, newState: state };

  let next: GameState = {
    ...state,
    almanac: {
      ...almanac,
      claimed: { ...almanac.claimed, [tier]: true },
    },
  } as GameState;

  const reward = def.reward as {
    coins?: number;
    tools?: Record<string, number>;
    runes?: number;
    structural?: string;
  };

  if (reward.coins) {
    next = { ...next, coins: (next.coins ?? 0) + reward.coins };
  }
  if (reward.tools) {
    const nextTools = { ...(next.tools as Record<string, number | boolean | undefined>) };
    for (const [k, v] of Object.entries(reward.tools)) {
      nextTools[k] = ((nextTools[k] as number | undefined) ?? 0) + v;
    }
    next = { ...next, tools: nextTools } as GameState;
  }
  if (reward.runes) {
    next = { ...next, runes: (next.runes ?? 0) + reward.runes };
  }
  if (reward.structural) {
    // Structural flags are latched in state.tools for now, or state directly.
    // extraTurn and goldSeal are flags the game logic can check.
    next = {
      ...next,
      tools: { ...(next.tools as Record<string, number | boolean | undefined>), [reward.structural]: true },
    } as GameState;
  }

  return { ok: true, newState: next };
}
