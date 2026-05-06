import { NPC_FAVORITES, moodForBond } from './data.js';
import { clamp } from '../../utils.js';

export const initial = {
  npcBond: { mira: 1, tomas: 1, bram: 1, liss: 1, wren: 1 },
  npcGiftsToday: {},
};

const BOND_DELTA_NEUTRAL = 0.2;
const BOND_DELTA_FAVORITE = 0.5;
const BOND_DELTA_DISLIKE = -0.5;
const BOND_DELTA_ORDER = 0.3;

/** Return new npcBond object with bond for npc adjusted by delta. */
function adjustBond(npcBond, npc, delta) {
  const current = npcBond[npc] ?? 1;
  return { ...npcBond, [npc]: clamp(current + delta, 0, 10) };
}

export function reduce(state, action) {
  switch (action.type) {
    case 'MOOD/GIFT': {
      const { npc, resource } = action;
      const inv = state.inventory || {};
      if ((inv[resource] || 0) < 1) return state;

      const fav = NPC_FAVORITES[npc];
      let delta = BOND_DELTA_NEUTRAL;
      if (fav) {
        if (resource === fav.favorite) delta = BOND_DELTA_FAVORITE;
        else if (resource === fav.dislike) delta = BOND_DELTA_DISLIKE;
      }

      const newBond = adjustBond(state.npcBond || initial.npcBond, npc, delta);
      const newInv = { ...inv, [resource]: inv[resource] - 1 };

      const mood = moodForBond(newBond[npc]);
      let reactionText;
      if (delta >= 0.5) reactionText = `${mood.icon} I love ${resource}! Thank you!`;
      else if (delta < 0) reactionText = `${mood.icon} Hmm… not my favourite.`;
      else reactionText = `${mood.icon} How thoughtful, thank you.`;

      return {
        ...state,
        inventory: newInv,
        npcBond: newBond,
        bubble: { id: Date.now(), npc, text: reactionText, ms: 2000 },
      };
    }

    case 'TURN_IN_ORDER': {
      // Use order data from the action (core has already replaced the order in state by now)
      const { npc, reward } = action;
      if (!npc) return state;

      const newBond = adjustBond(state.npcBond || initial.npcBond, npc, BOND_DELTA_ORDER);

      // Add extra coins from mood modifier on top of what core already paid.
      // Modifier > 1 → bonus; modifier < 1 → penalty (e.g. Sour NPC gives 70% of reward).
      const moodState = moodForBond(newBond[npc]);
      const extraCoins = Math.floor(reward * (moodState.modifier - 1));

      return {
        ...state,
        npcBond: newBond,
        coins: (state.coins || 0) + extraCoins,
      };
    }

    case 'CLOSE_SEASON': {
      // Clear daily gift tracking.
      // Apply mild bond decay for NPCs with bond > 5.
      const bond = state.npcBond || initial.npcBond;
      const decayed = Object.fromEntries(
        Object.entries(bond).map(([npc, b]) => [npc, b > 5 ? clamp(b - 0.1, 0, 10) : b])
      );
      return {
        ...state,
        npcBond: decayed,
        npcGiftsToday: {},
      };
    }

    default:
      return state;
  }
}
