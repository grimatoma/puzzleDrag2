// AI playtest & auto-balance harness — regression + contract tests.
//
// These pin the harness to the REAL economy: coins come from the genuine
// reducer (not harness arithmetic), the run consumes its real turn budget and
// ends via CLOSE_SEASON, the family-value spread reproduces the audit finding,
// and a committed metrics snapshot guards against silent balance drift.

import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { turnBudgetForZone } from "../features/zones/data.js";
import {
  simulateRun,
  runPlaytest,
  familyValueSpread,
  buildChainCollectedPayload,
  type Chain,
} from "../playtest/index.js";

/** Build a horizontal run of N same-key cells as a forced chain. */
function forcedChain(key: string, len: number, tileValue: number): Chain {
  const cells = Array.from({ length: len }, (_, i) => ({ row: 0, col: i }));
  return { key, cells, length: len, tileValue };
}

describe("playtest harness — determinism", () => {
  it("same seed → byte-identical run result (even with dangers active)", () => {
    // home is a farm zone, so hazard/rat spawns DO call Math.random during the
    // run. The seeded override makes the whole run reproducible anyway — a
    // stronger determinism guarantee than picking a no-danger zone.
    const a = simulateRun({ zoneId: "home", seed: 1 });
    const b = simulateRun({ zoneId: "home", seed: 1 });
    expect(a).toEqual(b);
  });

  it("different seeds → different runs (the RNG actually varies the board)", () => {
    const a = simulateRun({ zoneId: "home", seed: 1 });
    const b = simulateRun({ zoneId: "home", seed: 2 });
    // coinsEarned is extremely unlikely to collide across seeds.
    expect(a.coinsEarned).not.toBe(b.coinsEarned);
  });
});

describe("playtest harness — run drives the real loop", () => {
  it("home run consumes its full turn budget and ends via CLOSE_SEASON", () => {
    const budget = turnBudgetForZone(createInitialState(), "home");
    const r = simulateRun({ zoneId: "home", seed: 7 });
    expect(r.entered).toBe(true);
    expect(r.turnBudget).toBe(budget);
    // Full budget consumed → the run did NOT terminate on a board stall.
    expect(r.turnsPlayed).toBe(budget);
    // Every chain consumed exactly one turn (fresh state has 0 free moves).
    expect(r.chainsPlayed).toBe(budget);
    expect(r.endedViaClose).toBe(true);
    // A few free auto-shuffles are fine; a pathological count would signal a
    // broken board/enumerator. The rich home pool keeps this well-bounded.
    expect(r.reshuffles).toBeLessThan(budget);
  });

  it("core chain coins equal the reducer's floor(len × tileValue) for a forced chain", () => {
    const s0 = createInitialState();
    s0.coins = 1000;
    let s = rootReducer(s0, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } });
    // seasonStats.coins is the CORE chain-coin channel (state.coins additionally
    // picks up one-time quest/achievement rewards on the first chain — a real
    // separate subsystem the harness reports as `coinsEarned`). Reading the core
    // channel from genuine reducer state isolates the floor(len × value) contract.
    const seasonBefore = s.seasonStats.coins;
    const len = 5;
    const value = 1; // tile_grass_grass value === 1
    const payload = buildChainCollectedPayload(forcedChain("tile_grass_grass", len, value));
    s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
    expect(s.seasonStats.coins - seasonBefore).toBe(Math.max(1, Math.floor(len * value)));
  });

  it("resourceKey gates accrual: present → one unit; omitted → none (matches the guard)", () => {
    // grass: 6 tiles → 1 hay_bundle (TILES_PER_RESOURCE.tile_grass_grass === 6).
    function homeHay(coins = 1000, withKey: boolean): number {
      const s0 = createInitialState();
      s0.coins = coins;
      let s = rootReducer(s0, { type: "FARM/ENTER", payload: { selectedTiles: [], useFertilizer: false } });
      const payload = {
        key: "tile_grass_grass", gained: 6, upgrades: 0, chainLength: 6, value: 1, chain: [],
        ...(withKey ? { resourceKey: "hay_bundle" } : {}),
      };
      s = rootReducer(s, { type: "CHAIN_COLLECTED", payload });
      return (s.inventory?.home as Record<string, number> | undefined)?.hay_bundle ?? 0;
    }
    expect(homeHay(1000, true)).toBe(1);   // resourceKey present → 1 unit rolled in
    expect(homeHay(1000, false)).toBe(0);  // omitted → the `if (resourceKey)` guard skips accrual
  });
});

describe("playtest harness — family-value spread (audit metric)", () => {
  it("reproduces the pearls-vs-pie spread and flags pearls as an outlier", () => {
    const sp = familyValueSpread();
    expect(sp.byResource.pearls).toBeDefined();
    expect(sp.byResource.pie).toBeDefined();
    expect(sp.byResource.pearls.realizedValuePerTile).toBeCloseTo(160, 6);   // 800 / 5
    expect(sp.byResource.pie.realizedValuePerTile).toBeCloseTo(90 / 7, 6);   // ≈ 12.857
    expect(sp.byResource.pearls.flag).toBe("high");
    expect(sp.flagged).toBe(true);
    expect(sp.ratio).toBeGreaterThan(3);
  });
});

describe("playtest harness — drift guard", () => {
  it("metrics snapshot (changing a balance constant must break this)", () => {
    const report = runPlaytest({ zones: ["home"], runs: 5, seed: 1 });
    // Curated, host-independent subset: pure JS RNG + pure reducer + IEEE754
    // math → portable across machines (unlike the Phaser visual goldens).
    const snapshot = {
      home: report.metrics.zones[0],
      spread: report.metrics.spread,
      changeList: report.metrics.changeList,
    };
    expect(snapshot).toMatchSnapshot();
  });
});
