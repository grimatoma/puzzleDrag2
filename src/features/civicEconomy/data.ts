// Civic Economy — the Town Hall "Tithes & Provisions" system.
//
// Inspired by Puzzle Craft 2's kingdom economy, with two of our own twists:
//   1. A real-clock COOLDOWN gates each collection (discrete claim, not a drip).
//   2. Free tools ("provisions") are not deposited straight into the bag — they
//      are queued as a CARE-PACKAGE crate that the player matches on the board
//      to actually claim (see GameScene + civicEconomy/slice).
//
// Two derived quantities drive a claim, both computed live from the player's
// buildings (so they always reflect the current town):
//   - TAX  (coins, "income everywhere")     → summed across ALL founded settlements
//   - PROVISIONS (free tools, "most town")   → from the single MOST-PROGRESSED town
//
// Pure module: no React, no Phaser, no persistence side-effects.

import type { GameState } from "../../types/state.js";
import { settlementTier, builtCountAt, DEFAULT_ZONE } from "../zones/data.js";

/** Real-clock gate between Town Hall collections (8 hours). */
export const CIVIC_CLAIM_COOLDOWN_MS = 8 * 60 * 60 * 1000;

/** Flat tax every founded settlement pays per collection. */
export const CIVIC_TAX_BASE_PER_SETTLEMENT = 30;
/** Extra tax per real building standing in a settlement. */
export const CIVIC_TAX_PER_BUILDING = 10;

/**
 * Which buildings provision which free tool. The provisions roster for a claim
 * is the subset of these whose building stands in the most-progressed town.
 * Tunable balance data — add an entry to make a building grant a tool.
 */
export const CIVIC_PROVISIONS: Record<string, { tool: string; amount: number }> = {
  mill: { tool: "clear", amount: 1 },
  workshop: { tool: "basic", amount: 1 },
  forge: { tool: "rare", amount: 1 },
  powder_store: { tool: "bomb", amount: 1 },
  granary: { tool: "shuffle", amount: 1 },
  sawmill: { tool: "axe", amount: 1 },
};

/** True when a non-`_plots`/decoration building id is built somewhere in `built[zone]`. */
function builtBuildingIds(state: GameState, zoneId: string): string[] {
  const zone = state.built?.[zoneId];
  if (!zone || typeof zone !== "object") return [];
  return Object.keys(zone).filter(
    (id) => id !== "_plots" && id !== "decorations" && zone[id] === true,
  );
}

/**
 * The player's most-progressed settlement: highest tier, tie-broken by building
 * count. Only founded settlements are considered; falls back to {@link DEFAULT_ZONE}.
 */
export function mostProgressedZone(state: GameState): string {
  const settlements = state.settlements ?? {};
  let best = DEFAULT_ZONE;
  let bestTier = -Infinity;
  let bestCount = -Infinity;
  for (const [zoneId, entry] of Object.entries(settlements)) {
    if (!entry?.founded) continue;
    const tier = settlementTier(state, zoneId);
    const count = builtCountAt(state, zoneId);
    if (tier > bestTier || (tier === bestTier && count > bestCount)) {
      best = zoneId;
      bestTier = tier;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The free-tool bundle the most-progressed town provisions on a claim, keyed by
 * tool id → amount. Empty when that town has no provisioning buildings.
 */
export function provisionsRoster(state: GameState): Record<string, number> {
  const zone = mostProgressedZone(state);
  const roster: Record<string, number> = {};
  for (const id of builtBuildingIds(state, zone)) {
    const entry = CIVIC_PROVISIONS[id];
    if (!entry) continue;
    roster[entry.tool] = (roster[entry.tool] ?? 0) + entry.amount;
  }
  return roster;
}

/** Total coin tax owed across every founded settlement (income everywhere). */
export function taxYield(state: GameState): number {
  const settlements = state.settlements ?? {};
  let total = 0;
  for (const [zoneId, entry] of Object.entries(settlements)) {
    if (!entry?.founded) continue;
    total += CIVIC_TAX_BASE_PER_SETTLEMENT + CIVIC_TAX_PER_BUILDING * builtCountAt(state, zoneId);
  }
  return total;
}

/** Wall-clock timestamp (ms) the next collection unlocks, or null if never claimed. */
export function nextClaimAt(state: GameState): number | null {
  const last = state.civicEconomy?.lastClaimedAt ?? null;
  return last == null ? null : last + CIVIC_CLAIM_COOLDOWN_MS;
}

/** True when the cooldown has elapsed (or no claim has ever been made). */
export function civicClaimReady(state: GameState, now: number): boolean {
  const next = nextClaimAt(state);
  return next == null || now >= next;
}

/** Milliseconds remaining until the next collection (0 when ready). */
export function msUntilNextClaim(state: GameState, now: number): number {
  const next = nextClaimAt(state);
  if (next == null) return 0;
  return Math.max(0, next - now);
}
