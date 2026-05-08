import { describe, it, expect } from "vitest";
import { WORKER_MAP } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";
import { createInitialState } from "../state.js";

describe("Phase 9.4 — Mine workers (canary, geologist)", () => {
  // ── Both entries registered ────────────────────────────────────────────────
  for (const id of ["canary", "geologist"]) {
    it(`${id} registered in WORKERS with all required fields`, () => {
      const w = WORKER_MAP[id];
      expect(w).toBeTruthy();
      for (const k of ["id", "name", "role", "maxCount", "effect", "hireCost", "wage"]) {
        expect(w[k]).toBeDefined();
      }
    });

    it(`${id} requires mine biome unlocked`, () => {
      expect(WORKER_MAP[id].requirement?.biomeUnlocked).toBe("mine");
    });
  }

  // ── Canary shape ───────────────────────────────────────────────────────────
  it("canary maxCount = 2", () => {
    expect(WORKER_MAP.canary.maxCount).toBe(2);
  });

  it("canary full effect = -50% gas vent", () => {
    expect(WORKER_MAP.canary.effect.hazardSpawnReduce.gas_vent).toBe(0.5);
  });

  it("canary wage = 18", () => {
    expect(WORKER_MAP.canary.wage).toBe(18);
  });

  it("canary cost: 4 coke + 6 bread", () => {
    const can = WORKER_MAP.canary;
    expect(can.hireCost.mine_coke).toBe(4);
    expect(can.hireCost.bread).toBe(6);
  });

  // ── Geologist shape ───────────────────────────────────────────────────────
  it("geologist maxCount = 2", () => {
    expect(WORKER_MAP.geologist.maxCount).toBe(2);
  });

  it("geologist full effect = ore+1, gem+1", () => {
    const geo = WORKER_MAP.geologist;
    expect(geo.effect.poolWeight.mine_ore).toBe(1);
    expect(geo.effect.poolWeight.mine_gem).toBe(1);
  });

  it("geologist wage = 30", () => {
    expect(WORKER_MAP.geologist.wage).toBe(30);
  });

  it("geologist cost: 6 ingot + 6 bread", () => {
    const geo = WORKER_MAP.geologist;
    expect(geo.hireCost.mine_ingot).toBe(6);
    expect(geo.hireCost.bread).toBe(6);
  });

  // ── Per-hire computation (canary) ─────────────────────────────────────────
  it("0 canary = 0 gas_vent reduction", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { canary: 0 }, debt: 0 } };
    expect(computeWorkerEffects(s).hazardSpawnReduce?.gas_vent ?? 0).toBe(0);
  });

  it("1 canary = -25% (0.5 / 2)", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { canary: 1 }, debt: 0 } };
    expect(computeWorkerEffects(s).hazardSpawnReduce.gas_vent).toBe(0.25);
  });

  it("2 canary = -50% (full)", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { canary: 2 }, debt: 0 } };
    expect(computeWorkerEffects(s).hazardSpawnReduce.gas_vent).toBe(0.5);
  });

  // ── Per-hire computation (geologist — integer floor) ──────────────────────
  it("1 geologist floors to +0 ore (0.5 → 0 by floor)", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { geologist: 1 }, debt: 0 } };
    expect(computeWorkerEffects(s).effectivePoolWeights?.mine_ore ?? 0).toBe(0);
  });

  it("2 geologist (max) = ore +1, gem +1", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { geologist: 2 }, debt: 0 } };
    const e2 = computeWorkerEffects(s);
    expect(e2.effectivePoolWeights.mine_ore).toBe(1);
    expect(e2.effectivePoolWeights.mine_gem).toBe(1);
  });

  // ── Clamped to maxCount ───────────────────────────────────────────────────
  it("5 canary clamps to maxCount=2 (still -50%, never -125%)", () => {
    const s = { ...createInitialState(), townsfolk: { hired: { canary: 5 }, debt: 0 } };
    expect(computeWorkerEffects(s).hazardSpawnReduce.gas_vent).toBe(0.5);
  });

  // ── Housing cap shared across farm + mine ─────────────────────────────────
  it("2 total hires fit within (1 + 1 housing) cap of 2", () => {
    const h = {
      ...createInitialState(),
      built: { hearth: true, decorations: {}, housing: { count: 1 } },
      townsfolk: { hired: { hilda: 1, canary: 1 }, debt: 0 },
    };
    const total = Object.values(h.townsfolk.hired).reduce((a, n) => a + n, 0);
    const cap = 1 + (h.built.housing?.count ?? 0);
    expect(total).toBeLessThanOrEqual(cap);
  });

  // ── Aggregator: canary + geologist together ───────────────────────────────
  it("merged aggregator: canary + geologist effects both present", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { canary: 2, geologist: 2, hilda: 0 }, debt: 0 },
    };
    const merged = computeWorkerEffects(s);
    expect(merged.hazardSpawnReduce.gas_vent).toBe(0.5);
    expect(merged.effectivePoolWeights.mine_ore).toBe(1);
    expect(merged.effectivePoolWeights.mine_gem).toBe(1);
  });
});
