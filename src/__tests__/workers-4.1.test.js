import { describe, it, expect } from "vitest";
import { WORKERS, WORKER_MAP, APPRENTICES, APPRENTICE_MAP } from "../features/apprentices/data.js";
import { initialState } from "../state.js";

describe("Phase 4.1 — Worker data model", () => {
  it("exports exactly 6 farm workers", () => {
    expect(WORKERS.length).toBe(6);
  });

  it("WORKER_MAP has all 6 ids", () => {
    for (const id of ["hilda", "pip", "wila", "tuck", "osric", "dren"]) {
      expect(WORKER_MAP[id]).toBeTruthy();
    }
  });

  it("every worker has required shape", () => {
    for (const w of WORKERS) {
      expect(typeof w.id).toBe("string");
      expect(typeof w.name).toBe("string");
      expect(Number.isInteger(w.maxCount) && w.maxCount >= 1).toBe(true);
      expect(["threshold_reduce", "pool_weight", "bonus_yield", "season_bonus"]
        .includes(w.effect.type)).toBe(true);
      expect(Number.isInteger(w.hireCost)).toBe(true);
      expect(Number.isInteger(w.wage)).toBe(true);
    }
  });

  it("Hilda full-slot moves hay 6→3, maxCount=3 (LOCKED max-effect model)", () => {
    const hilda = WORKER_MAP.hilda;
    expect(hilda.effect.from).toBe(6);
    expect(hilda.effect.to).toBe(3);
    expect(hilda.maxCount).toBe(3);

    const fullDelta = hilda.effect.from - hilda.effect.to; // 3
    const perHire = fullDelta / hilda.maxCount; // 1
    expect(perHire).toBe(1);
    expect(hilda.effect.from - 1 * perHire).toBe(5);
    expect(hilda.effect.from - 2 * perHire).toBe(4);
    expect(hilda.effect.from - 3 * perHire).toBe(3);
  });

  it("wages match GAME_SPEC §12", () => {
    const wages = { hilda: 15, pip: 12, wila: 20, tuck: 20, osric: 40, dren: 25 };
    for (const [id, wage] of Object.entries(wages)) {
      expect(WORKER_MAP[id].wage).toBe(wage);
    }
  });

  it("initial state has state.workers with debt=0 and all hired at 0", () => {
    const s0 = initialState();
    expect(s0.workers).toBeTruthy();
    expect(s0.workers.debt).toBe(0);
    const ids = ["hilda", "pip", "wila", "tuck", "osric", "dren"];
    for (const id of ids) {
      expect(s0.workers.hired[id]).toBe(0);
    }
  });

  it("legacy APPRENTICES alias still works", () => {
    expect(APPRENTICES).toBe(WORKERS);
    expect(APPRENTICE_MAP).toBe(WORKER_MAP);
  });
});
