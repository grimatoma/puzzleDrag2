import { NPC_FAVORITES, moodForBond } from './data.js';

export const initial = {
  npcBond: { mira: 1, tomas: 1, bram: 1, liss: 1, wren: 1 },
  npcGiftsToday: {},
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

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
      let delta = 0.2;
      if (fav) {
        if (resource === fav.favorite) delta = 0.5;
        else if (resource === fav.dislike) delta = -0.5;
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
      const { id } = action;
      const orders = state.orders || [];
      const order = orders.find((o) => o.id === id);
      if (!order) return state;

      // Check that the order can actually be fulfilled (resource check mirrors state.js)
      if ((state.inventory || {})[order.key] < order.need) return state;

      const npc = order.npc;
      const newBond = adjustBond(state.npcBond || initial.npcBond, npc, 0.3);

      // The main reducer already added order.reward to state.coins.
      // Here we add only the *extra* coins from the mood modifier.
      const mood = moodForBond(newBond[npc]);
      const extraCoins = Math.floor(order.reward * (mood.modifier - 1));

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
