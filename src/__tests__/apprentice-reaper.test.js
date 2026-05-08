import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { APPRENTICES } from "../features/apprentices/data.js";
import { computeWorkerEffects } from "../features/apprentices/aggregate.js";

describe("Reaper apprentice (grain → bread)", () => {
  it("is registered with the expected shape", () => {
    const reaper = APPRENTICES.find((w) => w.id === "reaper");
    expect(reaper).toBeDefined();
    expect(reaper.maxCount).toBe(2);
    expect(reaper.effect).toEqual({
      type: "threshold_reduce",
      key: "grain_flour",
      from: 6,
      to: 4,
    });
    expect(reaper.requirement?.building).toBe("bakery");
  });

  it("0 hires: no threshold reduction", () => {
    const s = createInitialState();
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce?.grain_flour ?? 0).toBe(0);
  });

  it("1 hire: grain_flour threshold reduced by 1 (6 → 5)", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { reaper: 1 }, debt: 0, pool: 1 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce?.grain_flour).toBe(1);
  });

  it("2 hires (max): grain_flour threshold reduced by 2 (6 → 4)", () => {
    const s = {
      ...createInitialState(),
      townsfolk: { hired: { reaper: 2 }, debt: 0, pool: 2 },
    };
    const eff = computeWorkerEffects(s);
    expect(eff.thresholdReduce?.grain_flour).toBe(2);
  });

  it("hiring honours maxCount — third hire is rejected", () => {
    let s = {
      ...createInitialState(),
      coins: 100000,
      built: { bakery: true },
      townsfolk: { hired: { reaper: 2 }, debt: 0, pool: 5 },
      inventory: { grass_hay: 50, bread: 50, mine_stone: 50 },
    };
    s = rootReducer(s, { type: "APP/HIRE", payload: { id: "reaper" } });
    expect(s.townsfolk.hired.reaper).toBe(2);
  });
});
