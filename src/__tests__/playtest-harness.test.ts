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
  runCampaign,
  buildProgressionSpine,
  diffSpines,
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
    expect(sp.byResource.pearls.realizedValuePerTile).toBeCloseTo(800 / 6, 6); // 800 / 6: oyster tier-1 scaling raised divisor 5→6
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

describe("campaign harness — determinism", () => {
  it("same seed → identical campaign metrics", () => {
    const a = runCampaign({ zoneId: "home", runs: 8, seed: 1 });
    const b = runCampaign({ zoneId: "home", runs: 8, seed: 1 });
    expect(a.metrics).toEqual(b.metrics);
  });

  it("different seeds → different per-run chain coins", () => {
    const a = runCampaign({ zoneId: "home", runs: 8, seed: 1 });
    const c = runCampaign({ zoneId: "home", runs: 8, seed: 2 });
    expect(a.metrics.runs.map((r) => r.chainCoins)).not.toEqual(c.metrics.runs.map((r) => r.chainCoins));
  });
});

describe("campaign harness — progression contract", () => {
  it("home farm-only campaign stalls before tier 1, blocked on crafted bread", () => {
    const r = runCampaign({ zoneId: "home", runs: 30, seed: 1 });
    // The home TIER ladder needs crafted/cross-zone goods; a farm-only campaign
    // earns every Hamlet input EXCEPT bread, so it legitimately stalls at tier 0.
    expect(r.metrics.finalTier).toBe(0);
    expect(r.metrics.tierStall?.toName).toBe("Hamlet");
    const bread = r.metrics.tierStall?.missing.find((x) => x.key === "bread");
    expect(bread).toBeDefined();
    expect(bread?.source).toBe("crafted");
    // Every off-farm blocker must be classified as crafted or another zone —
    // never silently "farm" (that would hide the gate the report is meant to find).
    for (const mi of r.metrics.tierStall?.missing ?? []) {
      if (mi.source === "farm") throw new Error(`farm-sourced input ${mi.key} should not block a farm campaign`);
    }
  });

  it("coin economy paces sanely: founding #2 (300c) is reached within its band", () => {
    const r = runCampaign({ zoneId: "home", runs: 30, seed: 1 });
    const first = r.metrics.coinMilestones[0];
    expect(first.runIndex).toBeGreaterThan(0);
    expect(first.verdict).toBe("within");
    // Bankroll grows monotonically across a farm loop (nothing spends coins).
    const balances = r.metrics.runs.map((x) => x.balanceAfter);
    for (let i = 1; i < balances.length; i++) expect(balances[i]).toBeGreaterThanOrEqual(balances[i - 1]);
  });
});

describe("progression spine — code-derived oracle", () => {
  it("is pure: two derivations are deep-equal", () => {
    expect(buildProgressionSpine()).toEqual(buildProgressionSpine());
  });

  it("fresh-save reachability is the farm cluster only (mine/fish gated behind the quarry)", () => {
    const o = buildProgressionSpine().oracle;
    expect(o.freshSaveReachable).toEqual(["crossroads", "home", "meadow", "orchard"]);
    // Every playable board reachable on a fresh save is a farm board.
    expect(o.freshSavePlayableBoards).toEqual(["home", "meadow", "orchard"]);
  });

  it("detects the home Outpost→Hamlet softlock and explains the bread→block chain", () => {
    const spine = buildProgressionSpine();
    const o = spine.oracle;
    expect(o.softlock).not.toBeNull();
    expect(o.softlock?.stuckZone).toBe("home");
    expect(o.softlock?.stuckTier).toBe(0);
    expect(o.softlock?.stuckTierName).toBe("Outpost");
    expect(o.softlock?.blockedRung).toBe("Hamlet");
    expect(o.softlock?.primaryMissing).toContain("bread");
    // The wall explainer must surface WHY bread is unobtainable: the Bakery's own
    // build cost needs `block`, a mine good unreachable from a fresh save.
    const home = spine.zones.find((z) => z.id === "home")!;
    const breadMiss = home.wall?.missing.find((m) => m.key === "bread");
    expect(breadMiss?.reason).toContain("block");
    // home can never stock a mine good on its own farm board.
    expect(o.homeProducible).not.toContain("block");
  });

  it("structural invariants: gates resolve, self-tiers are in range", () => {
    const spine = buildProgressionSpine();
    const ids = new Set(spine.zones.map((z) => z.id));
    for (const z of spine.zones) {
      if (z.gate) expect(ids.has(z.gate.zone)).toBe(true);
      const maxRung = z.tiers.length ? z.tiers.length - 1 : 0;
      expect(z.maxSelfTier).toBeGreaterThanOrEqual(0);
      expect(z.maxSelfTier).toBeLessThanOrEqual(maxRung);
      // A wall exists iff the zone can't climb its own full ladder.
      if (z.tiers.length > 1) expect(!!z.wall).toBe(z.maxSelfTier < maxRung);
    }
  });

  it("progression-shape snapshot (a reachability/gate/lock change must break this)", () => {
    const spine = buildProgressionSpine();
    // Curated, host-independent subset (pure derivation, no RNG): the whole
    // progression shape. A constant edit that re-opens the softlock, re-gates a
    // zone, or changes a tier cost moves this — the CI guard for the regression
    // class that produced the current lock.
    const snapshot = {
      zones: spine.zones.map((z) => ({
        id: z.id,
        gate: z.gate,
        reachableFromFreshSave: z.reachableFromFreshSave,
        maxSelfTier: z.maxSelfTier,
        wall: z.wall ? { toName: z.wall.toName, missing: z.wall.missing.map((m) => m.key) } : null,
      })),
      oracle: spine.oracle,
    };
    expect(snapshot).toMatchSnapshot();
  });
});

describe("progression spine — cross-run diff", () => {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

  it("no baseline → establishing (not a change)", () => {
    const d = diffSpines(null, buildProgressionSpine());
    expect(d.hasBaseline).toBe(false);
    expect(d.unchanged).toBe(true);
    expect(d.changes).toHaveLength(0);
  });

  it("identical spines → no changes", () => {
    const spine = buildProgressionSpine();
    const d = diffSpines(clone(spine), spine);
    expect(d.unchanged).toBe(true);
    expect(d.changes).toHaveLength(0);
  });

  it("classifies a cleared softlock as critical and a tier-cost edit as minor", () => {
    const current = buildProgressionSpine();
    const baseline = clone(current);
    // Baseline = a prior state with no softlock and a cheaper Hamlet rung; current
    // = the real locked spine. The diff is current-vs-baseline.
    baseline.oracle.softlock = null;
    const ham = baseline.zones.find((z) => z.id === "home")!.tiers.find((t) => t.id === "hamlet")!;
    delete ham.upgradeCost.bread;

    const d = diffSpines(baseline, current);
    expect(d.unchanged).toBe(false);
    const softlock = d.changes.find((c) => c.path === "oracle.softlock");
    expect(softlock?.severity).toBe("critical");
    expect(softlock?.before).toBe("none");
    expect(softlock?.after).toContain("bread");
    const tierCost = d.changes.find((c) => c.path === "zone:home.tier:hamlet.cost");
    expect(tierCost?.severity).toBe("minor");
    expect(tierCost?.after).toContain("bread:10");
    // Severity counts are tallied for the dashboard banner.
    expect(d.counts.critical).toBeGreaterThanOrEqual(1);
    // Sorted critical-first.
    expect(d.changes[0].severity).toBe("critical");
  });

  it("a newly reachable zone is a critical change (the fix-opened-the-spine signal)", () => {
    const current = buildProgressionSpine();
    const baseline = clone(current);
    // Pretend the quarry was unreachable in the baseline; now it's reachable.
    const q = baseline.zones.find((z) => z.id === "quarry")!;
    q.reachableFromFreshSave = !current.zones.find((z) => z.id === "quarry")!.reachableFromFreshSave;
    const d = diffSpines(baseline, current);
    const reach = d.changes.find((c) => c.path === "zone:quarry.reachable");
    expect(reach?.severity).toBe("critical");
  });
});

describe("campaign harness — drift guard", () => {
  it("campaign metrics snapshot (a pacing change must break this)", () => {
    const r = runCampaign({ zoneId: "home", runs: 8, seed: 1 });
    const m = r.metrics;
    const snapshot = {
      runsPlayed: m.runsPlayed,
      startCoins: m.startCoins,
      finalBalance: m.finalBalance,
      finalTier: m.finalTier,
      netCoinsPerRun: m.netCoinsPerRun,
      chainCoinsPerRun: m.chainCoinsPerRun,
      incomeTrendCorrelation: m.incomeTrendCorrelation,
      coinMilestones: m.coinMilestones,
      tierStall: m.tierStall,
      runs: m.runs,
    };
    expect(snapshot).toMatchSnapshot();
  });
});
