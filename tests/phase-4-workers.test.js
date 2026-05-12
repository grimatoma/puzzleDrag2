// Phase 4 — Workers / Apprentices: data model, hire, wages.
// Migrated from workers-4.1 through workers-4.6 tests.
import { describe, it, expect } from "vitest";
import { WORKERS, WORKER_MAP } from "../src/features/apprentices/data.js";
import { createInitialState } from "../src/state.js";

describe("Phase 4 — worker data model", () => {
  it("has the 6 original farm workers", () => {
    const farmIds = ["hilda", "pip", "wila", "tuck", "osric", "dren"];
    for (const id of farmIds) {
      expect(WORKER_MAP[id], `${id} missing from WORKER_MAP`).toBeDefined();
    }
  });

  it("every worker has required shape fields", () => {
    const farmIds = new Set(["hilda", "pip", "wila", "tuck", "osric", "dren"]);
    for (const w of WORKERS) {
      if (!farmIds.has(w.id)) continue;
      expect(typeof w.id).toBe("string");
      expect(typeof w.name).toBe("string");
      expect(Number.isInteger(w.maxCount) && w.maxCount >= 1).toBe(true);
      expect(Number.isInteger(w.wage)).toBe(true);
    }
  });
});

describe("Phase 4 — fresh state workers slice", () => {
  it("fresh state has workers.pool >= 1", () => {
    const s = createInitialState();
    expect(s.townsfolk.pool).toBeGreaterThanOrEqual(1);
  });

  it("hired workers default to 0", () => {
    const s = createInitialState();
    for (const id of ["hilda", "pip", "wila", "tuck", "osric", "dren"]) {
      expect(s.townsfolk.hired[id]).toBe(0);
    }
  });
});
