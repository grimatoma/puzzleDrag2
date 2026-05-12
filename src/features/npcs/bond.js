import { BOND_BANDS, NPC_DATA } from "./data.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Phase 2 — per-tier bond gain for a gift.
export const GIFT_DELTAS = Object.freeze({ loves: 0.5, likes: 0.3, neutral: 0.15 });

/** Which preference tier `itemKey` falls in for `npcId` ("loves" | "likes" | "neutral"). */
export function giftTier(npcId, itemKey) {
  const d = NPC_DATA[npcId];
  if (!d) return "neutral";
  if ((d.loves ?? []).includes(itemKey)) return "loves";
  if ((d.likes ?? []).includes(itemKey)) return "likes";
  return "neutral";
}

export function bondBand(bond) {
  const b = clamp(Math.floor(bond), 1, 10);
  return BOND_BANDS.find((band) => b >= band.lo && b <= band.hi);
}

export function bondModifier(bond) {
  return bondBand(bond).modifier;
}

export function gainBond(bond, delta) {
  return clamp(bond + delta, 0, 10);
}

export function decayBond(bond) {
  if (bond <= 5) return bond; // Below/at 5: no decay (§14 floor is Warm)
  return Math.max(5, bond - 0.1);
}

export function payOrder(order, bond) {
  return Math.round(order.baseReward * bondModifier(bond));
}

export function applyGift(state, npcId, itemKey) {
  if ((state.inventory[itemKey] ?? 0) <= 0) return { ok: false };
  if (state.npcs.giftCooldown[npcId] === state.season) return { ok: false };
  const tier = giftTier(npcId, itemKey);
  const delta = GIFT_DELTAS[tier];
  const newState = {
    ...state,
    inventory: { ...state.inventory, [itemKey]: state.inventory[itemKey] - 1 },
    npcs: {
      ...state.npcs,
      bonds: {
        ...state.npcs.bonds,
        [npcId]: gainBond(state.npcs.bonds[npcId], delta),
      },
      giftCooldown: { ...state.npcs.giftCooldown, [npcId]: state.season },
    },
  };
  // `isFavorite` retained for callers/tests predating the tiered prefs.
  return { ok: true, newState, delta, tier, isFavorite: tier === "loves" };
}
