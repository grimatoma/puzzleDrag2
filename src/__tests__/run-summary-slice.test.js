import { describe, it, expect, beforeEach } from "vitest";
import { reduce, initial } from "../features/runSummary/slice.js";

beforeEach(() => global.localStorage.clear());

function baseState(over = {}) {
  return {
    ...initial,
    biomeKey: "farm",
    biome: "farm",
    activeZone: "home",
    farmRun: { zoneId: "home", turnBudget: 10, turnsRemaining: 10, mode: "normal" },
    npcs: { bonds: { mira: 5, wren: 5, tomas: 5, bram: 5, liss: 5 } },
    modal: null,
    session: {},
    ...over,
  };
}

describe("runSummary slice — chain accumulation", () => {
  it("starts a fresh run on FARM/ENTER and snapshots bonds", () => {
    const s0 = baseState();
    const s1 = reduce(s0, { type: "FARM/ENTER" });
    expect(s1.runSummary.biome).toBe("farm");
    expect(s1.runSummary.zoneId).toBe("home");
    expect(s1.runSummary.turnsAtStart).toBe(10);
    expect(s1.runSummary.bondsAtStart.mira).toBe(5);
  });

  it("accumulates chains, picks biggest, totals coins/upgrades", () => {
    let s = reduce(baseState(), { type: "FARM/ENTER" });
    s = reduce(s, { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 4, upgrades: 0, chainLength: 4, value: 2 } });
    s = reduce(s, { type: "CHAIN_COLLECTED", payload: { key: "wood_log", gained: 9, upgrades: 1, chainLength: 9, value: 3 } });
    expect(s.runSummary.chainsPlayed).toBe(2);
    expect(s.runSummary.biggestChain.count).toBe(9);
    expect(s.runSummary.biggestChain.key).toBe("wood_log");
    expect(s.runSummary.totalUpgrades).toBe(1);
    expect(s.runSummary.totalCoinGain).toBeGreaterThan(0);
    expect(s.runSummary.resourcesGained.grass_hay).toBe(4);
    expect(s.runSummary.resourcesGained.wood_log).toBe(9);
  });

  it("auto-opens when modal transitions to season and diffs bonds", () => {
    let s = reduce(baseState(), { type: "FARM/ENTER" });
    s = { ...s, npcs: { bonds: { ...s.npcs.bonds, mira: 6 } } };
    s = { ...s, modal: "season" };
    s = reduce(s, { type: "END_TURN" });
    expect(s.runSummary.open).toBe(true);
    expect(s.runSummary.bondDeltas.mira).toBe(1);
  });

  it("CLOSE empties the accumulator", () => {
    let s = reduce(baseState(), { type: "FARM/ENTER" });
    s = reduce(s, { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 3, upgrades: 0, chainLength: 3, value: 2 } });
    s = reduce(s, { type: "RUN_SUMMARY/CLOSE" });
    expect(s.runSummary.open).toBe(false);
    expect(s.runSummary.chainsPlayed).toBe(0);
    expect(s.runSummary.biggestChain).toBe(null);
  });

  it("ignores tool-only (noTurn) chain emissions", () => {
    let s = reduce(baseState(), { type: "FARM/ENTER" });
    s = reduce(s, { type: "CHAIN_COLLECTED", payload: { key: "grass_hay", gained: 5, upgrades: 0, chainLength: 5, value: 2, noTurn: true } });
    expect(s.runSummary.chainsPlayed).toBe(0);
  });

  it("records story beats triggered during the run", () => {
    let s = reduce(baseState(), { type: "FARM/ENTER" });
    s = reduce(s, { type: "STORY/BEAT_FIRED", payload: { firedBeat: { id: "mira_intro", title: "Mira speaks" } } });
    s = reduce(s, { type: "STORY/BEAT_FIRED", payload: { firedBeat: { id: "mira_intro", title: "Mira speaks" } } });
    expect(s.runSummary.beatsTriggered).toHaveLength(1);
  });

  it("captures expedition supplies on EXPEDITION/DEPART", () => {
    const s0 = baseState({
      farmRun: { zoneId: "the_hollow", turnBudget: 6, turnsRemaining: 6, mode: "expedition" },
      session: { expedition: { zoneId: "the_hollow", supply: { grain_loaf: 3 }, turns: 6 } },
      biomeKey: "mine",
    });
    const s1 = reduce(s0, { type: "EXPEDITION/DEPART" });
    expect(s1.runSummary.suppliesConsumed.grain_loaf).toBe(3);
    expect(s1.runSummary.mode).toBe("expedition");
  });
});
