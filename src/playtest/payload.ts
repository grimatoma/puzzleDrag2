// Synthesize the exact CHAIN_COLLECTED payload the scene emits.
//
// The contract is GameScene.ts:1896:
//   { key, gained, upgrades, chainLength, value, chain, resourceKey, crossCollected }
// Field fidelity matters: a wrong `value` skews every coin number, and a missing
// `resourceKey` yields ZERO resource income (the `if (resourceKey)` guard at
// state.ts:353). We mirror it field-by-field and deliberately omit
// `crossCollected` for v1 (the reducer guards `if (crossCollected)`, so omitting
// it is equivalent to "no cross-collect" — a documented v1 simplification).

import { UPGRADE_THRESHOLDS } from "../constants.js";
import { producedResource } from "../game/producedResource.js";
import { upgradeCountForChain } from "../utils.js";
import type { Chain } from "./board.js";

export interface ChainCollectedPayload {
  key: string;
  /** = path.length (no bonus yields in v1, so totalGained === chain length). */
  gained: number;
  upgrades: number;
  chainLength: number;
  /** The board TILE's value — NOT the produced resource's value. */
  value: number;
  chain: { key: string; row: number; col: number }[];
  /** Produced resource key. `producedResource` returns `string | null`; we
   *  normalize null → undefined so this matches the reducer's payload type
   *  exactly (the reducer's `if (resourceKey)` guard treats both as "none"). */
  resourceKey?: string;
}

/** Build the scene-faithful CHAIN_COLLECTED payload for a chosen chain. */
export function buildChainCollectedPayload(chain: Chain): ChainCollectedPayload {
  const key = chain.key;
  const gained = chain.length;
  // Mirrors GameScene: upgrades = upgradeCountForChain(len, key, effThresholds).
  // The harness sets no registry threshold overrides, so UPGRADE_THRESHOLDS is
  // the effective map. `upgrades` feeds only seasonStats.upgrades / hint bubbles
  // in the reducer — it does NOT affect coins or resource income.
  const upgrades = upgradeCountForChain(gained, key, UPGRADE_THRESHOLDS as Record<string, number>);
  return {
    key,
    gained,
    upgrades,
    chainLength: gained,
    value: chain.tileValue,
    chain: chain.cells.map((c) => ({ key, row: c.row, col: c.col })),
    resourceKey: producedResource({ key }) ?? undefined,
  };
}
