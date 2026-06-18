// Board policies for the playtest auto-player.
//
// A policy decides which available chain to collect each turn. v1 ships a single
// greedy policy; the signature is kept pluggable so future policies (max-coin,
// max-resource-value, target-a-family) drop in without touching the run loop.

import type { Chain } from "./board.js";

/** A policy picks one chain from the available set, or null if none playable. */
export type Policy = (chains: Chain[]) => Chain | null;

/**
 * Greedy: collect the longest available chain. Ties broken by highest tile
 * value, then by stable board order (top-left first) so the choice is fully
 * deterministic for a fixed board.
 */
export const greedyLongest: Policy = (chains) => {
  if (!chains.length) return null;
  let best = chains[0];
  for (let i = 1; i < chains.length; i++) {
    const c = chains[i];
    if (
      c.length > best.length ||
      (c.length === best.length && c.tileValue > best.tileValue)
    ) {
      best = c;
    }
  }
  return best;
};

/** Registry of named policies, for CLI `--policy <name>` selection. */
export const POLICIES: Record<string, Policy> = {
  greedy: greedyLongest,
};
