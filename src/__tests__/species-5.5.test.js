import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { SPECIES, SPECIES_MAP } from "../features/species/data.js";

describe("Phase 5.5 — Research timer (cumulative, global)", () => {
  const base = initialState();

  it("A: research seeded for every research-method species at 0", () => {
    const researchIds = SPECIES.filter((s) => s.discovery?.method === "research").map((s) => s.id);
    expect(researchIds).toContain("grain");
    expect(researchIds).toContain("turkey");
    for (const id of researchIds) {
      expect(typeof base.species.researchProgress[id]).toBe("number");
      expect(base.species.researchProgress[id]).toBe(0);
    }
  });

  it("B: chain of prerequisite increments progress and accumulates", () => {
    const a1 = rootReducer(base, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 8 } });
    expect(a1.species.researchProgress.grain).toBe(8);
    const a2 = rootReducer(a1, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } });
    expect(a2.species.researchProgress.grain).toBe(13);
  });

  it("C: unrelated chain does not move unrelated counters", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 8 } }),
      { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } }
    );
    const cBefore = a2.species.researchProgress.turkey;
    const c1 = rootReducer(a2, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 12 } });
    expect(c1.species.researchProgress.turkey).toBe(cBefore);
    expect(c1.species.researchProgress.grain).toBe(13);
  });

  it("D: reaching threshold flips discovered + queues bubble", () => {
    const wheatThresh = SPECIES_MAP.grain.discovery.researchAmount; // 30
    const d0 = {
      ...base,
      species: {
        ...base.species,
        researchProgress: { ...base.species.researchProgress, grain: wheatThresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } });
    expect(d1.species.discovered.grain).toBe(true);
    expect(d1.bubble).toBeTruthy();
    expect(/New species: Grain/i.test(d1.bubble.text)).toBe(true);
  });

  it("E: already-discovered species is a no-op (no progress drift, no re-fire)", () => {
    const wheatThresh = SPECIES_MAP.grain.discovery.researchAmount;
    const d0 = {
      ...base,
      species: {
        ...base.species,
        researchProgress: { ...base.species.researchProgress, grain: wheatThresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } });
    // Clear the stale discovery bubble from d1 before testing no-re-fire
    const d1Clean = { ...d1, bubble: null };
    const e1 = rootReducer(d1Clean, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 9 } });
    expect(e1.species.researchProgress.grain).toBe(d1.species.researchProgress.grain);
    const noDoubleDisc = !e1.bubble || !/New species: Grain/i.test(e1.bubble?.text ?? "");
    expect(noDoubleDisc).toBe(true);
  });

  it("F: LOCKED — save/reload preserves cumulative research progress", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 8 } }),
      { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } }
    );
    const saved = JSON.stringify(a2);
    const rehydrated = JSON.parse(saved);
    expect(rehydrated.species.researchProgress.grain).toBe(13);
  });

  it("G: SESSION_START never zeroes research progress", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 8 } }),
      { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } }
    );
    const g1 = rootReducer(a2, { type: "SESSION_START" });
    expect(g1.species.researchProgress.grain).toBe(13);
  });
});
