// Verifies that power hooks attached to a tile's `effects` actually take
// effect during chain resolution: free moves, conditional free turns,
// flat and per-tile coin bonuses.
//
// The achievements slice grants +25 coins on the very first chain
// ("first_steps"), so each test runs a warm-up chain (no hooks) first,
// then patches the tile and fires the test chain. We compare the coin
// delta of just the second chain — that isolates the hook's contribution
// from incidental rewards.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";
import { applyTileOverrides } from "../config/applyOverrides.js";

function snapshotEffects(id) {
  return JSON.parse(JSON.stringify(TILE_TYPES_MAP[id]?.effects ?? {}));
}
function restoreEffects(id, snap) {
  const tile = TILE_TYPES.find((t) => t.id === id);
  if (tile) tile.effects = snap;
}

function warmupAndGetState() {
  // Run one chain with no hooks so the first-chain achievement fires and
  // its +25 reward is already applied. Subsequent chains then yield only
  // the deterministic base coinsGain plus any hook contribution.
  const s0 = createInitialState();
  return rootReducer(s0, {
    type: "CHAIN_COLLECTED",
    payload: { key: "grass_hay", gained: 4, upgrades: 0, value: 1, chainLength: 4 },
  });
}

describe("Power hooks at runtime", () => {
  let snap;
  beforeEach(() => { snap = snapshotEffects("grass_hay"); });
  afterEach(() => { restoreEffects("grass_hay", snap); });

  it("coin_bonus_flat adds a flat amount on CHAIN_COLLECTED", () => {
    const sWarm = warmupAndGetState();
    const before = sWarm.coins;

    applyTileOverrides(TILE_TYPES, {
      tilePowers: { grass_hay: { hooks: [{ id: "coin_bonus_flat", params: { amount: 50 } }] } },
    });

    const sAfter = rootReducer(sWarm, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 4, upgrades: 0, value: 1, chainLength: 4 },
    });
    // Base coinsGain = max(1, floor(5*1/2)) = 2 (Spring +1 harvest bonus on 4),
    // plus hook flat = 50. Total delta = 52.
    expect(sAfter.coins - before).toBe(52);
  });

  it("coin_bonus_per_tile scales with chain length", () => {
    const sWarm = warmupAndGetState();
    const before = sWarm.coins;

    applyTileOverrides(TILE_TYPES, {
      tilePowers: { grass_hay: { hooks: [{ id: "coin_bonus_per_tile", params: { amount: 3 } }] } },
    });

    const sAfter = rootReducer(sWarm, {
      type: "CHAIN_COLLECTED",
      payload: { key: "grass_hay", gained: 5, upgrades: 0, value: 1, chainLength: 5 },
    });
    // Phase 7 — calendar Spring +20% removed. gained 5 → coinsGain
    // max(1, floor(5/2)) = 2. Per-tile hook: 3 × chainLength(5) = 15.
    // Total delta = 17.
    expect(sAfter.coins - before).toBe(17);
  });

  it("free_turn_after_n grants 1 free move only when chain meets threshold", () => {
    applyTileOverrides(TILE_TYPES, {
      tilePowers: { grass_hay: { hooks: [{ id: "free_turn_after_n", params: { minChain: 6 } }] } },
    });
    const s0 = createInitialState();
    const sShort = rootReducer(s0, {
      type: "CHAIN_COMMIT",
      payload: { key: "grass_hay", length: 4 },
    });
    expect(sShort.tileCollection?.freeMoves ?? 0).toBe(0);

    const sLong = rootReducer(s0, {
      type: "CHAIN_COMMIT",
      payload: { key: "grass_hay", length: 6 },
    });
    expect(sLong.tileCollection?.freeMoves ?? 0).toBe(1);
  });
});
