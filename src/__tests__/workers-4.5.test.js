import { describe, it, expect } from "vitest";
import { rootReducer, initialState } from "../state.js";
import { WORKER_MAP, workerSlotLabel, totalHired, housingCapacity } from "../features/apprentices/data.js";

describe("Phase 4.5 — Housing requirement gates hire count", () => {
  const base = initialState();

  // A: 0 housing → cap 1
  it("A: no housing → capacity 1, first hire OK, second blocked", () => {
    // Provide enough goods for any worker hireCost (spec §12: object hireCost)
    const a0 = { ...base, coins: 9999,
      built: { ...base.built, granary: true, inn: true },
      inventory: { ...base.inventory, hay: 20, berry: 20, jam: 20, bread: 20, ingot: 20, stone: 20 },
      workers: { hired: { ...base.workers.hired }, debt: 0, pool: 10 } };
    expect(housingCapacity(a0)).toBe(1);

    const a1 = rootReducer(a0, { type: "APP/HIRE", payload: { id: "hilda" } });
    expect(a1.workers.hired.hilda).toBe(1);
    expect(totalHired(a1)).toBe(1);

    // Second hire over cap — same state ref
    const a2 = rootReducer(a1, { type: "APP/HIRE", payload: { id: "pip" } });
    expect(a2).toBe(a1);
  });

  // B: 1 housing → cap 2
  it("B: 1 housing → capacity 2, two hires OK, third blocked", () => {
    // Provide enough goods for any worker hireCost (spec §12: object hireCost)
    const b0 = { ...base, coins: 9999,
      built: { ...base.built, granary: true, inn: true, housing: true },
      inventory: { ...base.inventory, hay: 20, berry: 20, jam: 20, bread: 20, ingot: 20, stone: 20 },
      workers: { hired: { ...base.workers.hired }, debt: 0, pool: 10 } };
    expect(housingCapacity(b0)).toBe(2);

    let b1 = rootReducer(b0, { type: "APP/HIRE", payload: { id: "hilda" } });
    b1      = rootReducer(b1, { type: "APP/HIRE", payload: { id: "pip" } });
    expect(totalHired(b1)).toBe(2);

    const b2 = rootReducer(b1, { type: "APP/HIRE", payload: { id: "tuck" } });
    expect(b2).toBe(b1);
  });

  // C: maxCount cap — cannot exceed per-worker limit
  it("C: maxCount cap respected", () => {
    const c0 = { ...base, coins: 9999,
      built: { ...base.built, granary: true, housing: true, inn: true },
      workers: { hired: { ...base.workers.hired, hilda: 3 }, debt: 0, pool: 10 } };
    const c1 = rootReducer(c0, { type: "APP/HIRE", payload: { id: "hilda" } });
    expect(c1.workers.hired.hilda).toBe(3);
  });

  // D: FIRE decrements; no refund
  it("D: FIRE decrements hired count, no coin refund", () => {
    const d0 = { ...base, coins: 9999,
      built: { ...base.built, granary: true, housing: true, inn: true },
      workers: { hired: { ...base.workers.hired, hilda: 3 }, debt: 0, pool: 10 } };
    const d1 = rootReducer(d0, { type: "APP/FIRE", payload: { id: "hilda" } });
    expect(d1.workers.hired.hilda).toBe(2);
    expect(d1.coins).toBe(d0.coins); // no refund
    expect(d1.workers.debt ?? 0).toBe(0);
  });

  // E: Display rule — slot count is a plain number
  it("E: workerSlotLabel returns plain number string", () => {
    expect(workerSlotLabel(WORKER_MAP.hilda)).toBe("3");
    expect(workerSlotLabel(WORKER_MAP.tuck)).toBe("1");
  });

  // F: housing building is in BUILDINGS
  it("F: housing building exists in BUILDINGS", async () => {
    const { BUILDINGS } = await import("../constants.js");
    const h = BUILDINGS.find((b) => b.id === "housing");
    expect(h).toBeTruthy();
    expect(h.cost.coins).toBe(300);
    expect(h.cost.plank).toBe(25);
  });

  // G: hire deducts pool (4.6 pre-check — pool must be ≥ 1)
  it("G: hire requires pool ≥ 1", () => {
    // Use tutorial.seen=true so no cross-slice mutation happens on this action
    const g0 = { ...base, coins: 9999,
      built: { ...base.built, granary: true },
      workers: { hired: { ...base.workers.hired }, debt: 0, pool: 0 },
      tutorial: { ...base.tutorial, seen: true, active: false } };
    const g1 = rootReducer(g0, { type: "APP/HIRE", payload: { id: "hilda" } });
    expect(g1).toBe(g0); // blocked — no pool
  });
});
