import { describe, it, expect } from "vitest";
import { WORKERS, WORKER_MAP, APPRENTICES, APPRENTICE_MAP } from "../features/apprentices/data.js";
import { initialState } from "../state.js";

describe("Phase 4.1 — Worker data model", () => {
  it("exports exactly 6 farm workers (Phase 9 mine workers added separately)", () => {
    // Phase 9 added canary + geologist (mine workers) to the same WORKERS array.
    // Farm workers remain the original 6; total is now 8.
    const farmWorkerIds = ["hilda", "pip", "wila", "tuck", "osric", "dren"];
    const farmWorkers = WORKERS.filter((w) => farmWorkerIds.includes(w.id));
    expect(farmWorkers.length).toBe(6);
  });

  it("WORKER_MAP has all 6 farm worker ids", () => {
    for (const id of ["hilda", "pip", "wila", "tuck", "osric", "dren"]) {
      expect(WORKER_MAP[id]).toBeTruthy();
    }
  });

  it("every farm worker has required shape (mine workers use structured effect format)", () => {
    const farmWorkerIds = new Set(["hilda", "pip", "wila", "tuck", "osric", "dren"]);
    const allowedAbilityIds = new Set([
      "threshold_reduce", "pool_weight", "pool_weight_legacy",
      "bonus_yield", "season_bonus",
    ]);
    for (const w of WORKERS) {
      expect(typeof w.id).toBe("string");
      expect(typeof w.name).toBe("string");
      expect(Number.isInteger(w.maxCount) && w.maxCount >= 1).toBe(true);
      if (farmWorkerIds.has(w.id)) {
        expect(Array.isArray(w.abilities)).toBe(true);
        expect(w.abilities.length).toBeGreaterThan(0);
        for (const a of w.abilities) {
          expect(allowedAbilityIds.has(a.id)).toBe(true);
        }
        // Spec §12: hireCost is an object { worker: 1, <goods> } for all workers
        expect(w.hireCost !== null && typeof w.hireCost === "object").toBe(true);
        expect(w.hireCost.worker).toBe(1);
      }
    }
  });

  it("Hilda full-slot moves hay 6→3, maxCount=3 (LOCKED max-effect model)", () => {
    const hilda = WORKER_MAP.hilda;
    // Hilda has a single threshold_reduce ability for grass_hay; max delta = 3.
    expect(hilda.abilities).toEqual([
      { id: "threshold_reduce", params: { target: "grass_hay", amount: 3 } },
    ]);
    expect(hilda.maxCount).toBe(3);

    const fullDelta = hilda.abilities[0].params.amount; // 3
    const perHire = fullDelta / hilda.maxCount; // 1
    expect(perHire).toBe(1);
  });

  it("initial state has state.townsfolk with all hired at 0", () => {
    const s0 = initialState();
    expect(s0.townsfolk).toBeTruthy();
    const ids = ["hilda", "pip", "wila", "tuck", "osric", "dren"];
    for (const id of ids) {
      expect(s0.townsfolk.hired[id]).toBe(0);
    }
  });

  it("legacy APPRENTICES alias still works", () => {
    expect(APPRENTICES).toBe(WORKERS);
    expect(APPRENTICE_MAP).toBe(WORKER_MAP);
  });
});
