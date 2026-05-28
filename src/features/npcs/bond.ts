import { BOND_BANDS, NPC_DATA } from "./data.js";
import { boonEffectMult } from "../boons/data.js";
import type { GameState } from "../../types/state.js";

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

// Phase 2 — per-tier bond gain for a gift.
export const GIFT_DELTAS: Readonly<Record<"loves" | "likes" | "neutral", number>> = Object.freeze({ loves: 0.5, likes: 0.3, neutral: 0.15 });

export type GiftTier = "loves" | "likes" | "neutral";

interface NpcDef {
  loves?: string[];
  likes?: string[];
}

interface BondBand {
  lo: number;
  hi: number;
  modifier: number;
  name?: string;
}

interface OrderRef { baseReward: number }

/** Which preference tier `itemKey` falls in for `npcId` ("loves" | "likes" | "neutral"). */
export function giftTier(npcId: string, itemKey: string): GiftTier {
  const d: NpcDef | undefined = (NPC_DATA as Record<string, NpcDef | undefined>)[npcId];
  if (!d) return "neutral";
  if ((d.loves ?? []).includes(itemKey)) return "loves";
  if ((d.likes ?? []).includes(itemKey)) return "likes";
  return "neutral";
}

export function bondBand(bond: number): BondBand {
  const b = clamp(Math.floor(bond), 1, 10);
  const bands = BOND_BANDS as BondBand[];
  return bands.find((band) => b >= band.lo && b <= band.hi) ?? bands[0];
}

export function bondModifier(bond: number): number {
  return bondBand(bond).modifier;
}

export function gainBond(bond: number, delta: number): number {
  return clamp(bond + delta, 0, 10);
}

export function decayBond(bond: number): number {
  if (bond <= 5) return bond; // Below/at 5: no decay (§14 floor is Warm)
  return Math.max(5, bond - 0.1);
}

export function payOrder(order: OrderRef, bond: number): number {
  return Math.round(order.baseReward * bondModifier(bond));
}

export interface ApplyGiftResult {
  ok: boolean;
  newState?: GameState;
  delta?: number;
  tier?: GiftTier;
  isFavorite?: boolean;
}

export function applyGift(state: GameState, npcId: string, itemKey: string): ApplyGiftResult {
  // Inventory is `Partial<Record<InventoryKey, number>>`; gifts can be any
  // catalog key the player carries, so widen indexing at the read boundary.
  const inventory = state.inventory as Record<string, number> | undefined;
  if ((inventory?.[itemKey] ?? 0) <= 0) return { ok: false };
  if (!state.npcs) return { ok: false };
  if (state.npcs.giftCooldown[npcId] === state.season) return { ok: false };
  const tier = giftTier(npcId, itemKey);
  const delta = GIFT_DELTAS[tier] * boonEffectMult(state, "bond_gain_mult");
  const newState: GameState = {
    ...state,
    inventory: { ...state.inventory, [itemKey]: (inventory?.[itemKey] ?? 0) - 1 },
    npcs: {
      ...state.npcs,
      bonds: {
        ...state.npcs.bonds,
        [npcId]: gainBond(state.npcs.bonds[npcId], delta),
      },
      giftCooldown: { ...state.npcs.giftCooldown, [npcId]: state.season ?? 0 },
    },
  } as GameState;
  // `isFavorite` retained for callers/tests predating the tiered prefs.
  return { ok: true, newState, delta, tier, isFavorite: tier === "loves" };
}
