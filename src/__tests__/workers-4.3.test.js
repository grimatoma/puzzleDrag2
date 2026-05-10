import { describe, it, expect } from "vitest";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";
import { upgradeCountForChain } from "../utils.js";
import { UPGRADE_THRESHOLDS } from "../constants.js";

// Helper that mirrors _syncWorkerEffects threshold computation
function effThresholds(agg) {
  const out = {};
  for (const k of Object.keys(UPGRADE_THRESHOLDS)) {
    out[k] = Math.max(1, UPGRADE_THRESHOLDS[k] - (agg.thresholdReduce[k] ?? 0));
  }
  return out;
}

function buildPool(base, agg) {
  const pool = [...base];
  for (const [k, n] of Object.entries(agg.poolWeight)) {
    for (let i = 0; i < Math.round(n); i++) pool.push(k);
  }
  return pool;
}

describe("Phase 4.3 — effective thresholds and pool weights", () => {
  const empty = { townsfolk: { hired: { hilda:0, pip:0, wila:0, tuck:0, osric:0, dren:0 }, debt: 0 } };

  it("no Hilda → hay threshold 6, 3-chain = 0 upgrades", () => {
    const t0 = effThresholds(computeWorkerEffects(empty));
    expect(t0.grass_hay).toBe(6);
    expect(upgradeCountForChain(3, "grass_hay", t0)).toBe(0);
  });

  it("3 Hilda → hay threshold 3, 3-chain = 1 upgrade", () => {
    const fullH = { townsfolk: { hired: { ...empty.townsfolk.hired, hilda: 3 }, debt: 0 } };
    const t1 = effThresholds(computeWorkerEffects(fullH));
    expect(t1.grass_hay).toBe(3);
    expect(upgradeCountForChain(3, "grass_hay", t1)).toBe(1);
    expect(upgradeCountForChain(6, "grass_hay", t1)).toBe(2);
  });

  it("threshold floors at 1 with massive reduce", () => {
    const synth = { thresholdReduce: { grass_hay: 99 }, poolWeight:{}, bonusYield:{}, seasonBonus:{} };
    expect(effThresholds(synth).grass_hay).toBe(1);
  });

  it("full Pip adds 2 berry copies to pool", () => {
    const farmBase = ["grass_hay","grass_hay","grass_hay","wood_log","wood_log","grain_wheat","berry","berry","bird_egg"];
    const fullPip = { townsfolk: { hired: { ...empty.townsfolk.hired, pip: 2 }, debt: 0 } };
    const pool = buildPool(farmBase, computeWorkerEffects(fullPip));
    expect(pool.filter(k => k === "berry").length).toBe(4);
  });

  it("full Wila → +2 jam/chain bonus yield", () => {
    const fullW = { townsfolk: { hired: { ...empty.townsfolk.hired, wila: 2 }, debt: 0 } };
    expect(computeWorkerEffects(fullW).bonusYield.berry_jam).toBe(2);
  });

  it("upgradeCountForChain falls back to base UPGRADE_THRESHOLDS when no map passed", () => {
    expect(upgradeCountForChain(6, "grass_hay")).toBe(1);
  });
});
