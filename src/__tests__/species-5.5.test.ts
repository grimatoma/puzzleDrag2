import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";

describe("Phase 5.5 — Research timer (cumulative, global)", () => {
  const base = initialState();

  it("A: research seeded for every research-method tile type at 0", () => {
    const researchIds = TILE_TYPES.filter((t) => t.discovery?.method === "research").map((t) => t.id);
    expect(researchIds).toContain("tile_grass_spiky");
    expect(researchIds).toContain("tile_bird_turkey");
    for (const id of researchIds) {
      expect(typeof base.tileCollection.researchProgress[id]).toBe("number");
      expect(base.tileCollection.researchProgress[id]).toBe(0);
    }
  });

  it("B: chain of prerequisite increments progress and accumulates", () => {
    const a1 = rootReducer(base, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 8, chainLength: 8, upgrades: 0, value: 1 } });
    expect(a1.tileCollection.researchProgress.tile_grass_spiky).toBe(8);
    const a2 = rootReducer(a1, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    expect(a2.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });

  it("C: unrelated chain does not move unrelated counters", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 8, chainLength: 8, upgrades: 0, value: 1 } }),
      { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } }
    );
    const cBefore = a2.tileCollection.researchProgress.tile_grass_spiky;
    // Chain an unrelated resource (tile_veg_carrot drives tile_veg_mushroom research,
    // not tile_grass_spiky) — the tile_grass_spiky counter must stay put.
    const c1 = rootReducer(a2, { type: "CHAIN_COLLECTED", payload: { key: "tile_veg_carrot", gained: 12, chainLength: 12, upgrades: 0, value: 1 } });
    expect(c1.tileCollection.researchProgress.tile_grass_spiky).toBe(cBefore);
    expect(c1.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });

  it("D: reaching threshold flips discovered + queues bubble", () => {
    const wheatThresh = TILE_TYPES_MAP.tile_grass_spiky.discovery.researchAmount; // 30
    const d0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        researchProgress: { ...base.tileCollection.researchProgress, tile_grass_spiky: wheatThresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    expect(d1.tileCollection.discovered.tile_grass_spiky).toBe(true);
    expect(d1.bubble).toBeTruthy();
    expect(/New tile type: Spiky Grass/i.test(d1.bubble.text)).toBe(true);
  });

  it("E: already-discovered tile type is a no-op (no progress drift, no re-fire)", () => {
    const wheatThresh = TILE_TYPES_MAP.tile_grass_spiky.discovery.researchAmount;
    const d0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        researchProgress: { ...base.tileCollection.researchProgress, tile_grass_spiky: wheatThresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    // Clear the stale discovery bubble from d1 before testing no-re-fire
    const d1Clean = { ...d1, bubble: null };
    const e1 = rootReducer(d1Clean, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 9, chainLength: 9, upgrades: 0, value: 1 } });
    expect(e1.tileCollection.researchProgress.tile_grass_spiky).toBe(d1.tileCollection.researchProgress.tile_grass_spiky);
    const noDoubleDisc = !e1.bubble || !/New tile type: Spiky Grass/i.test(e1.bubble?.text ?? "");
    expect(noDoubleDisc).toBe(true);
  });

  it("F: LOCKED — save/reload preserves cumulative research progress", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 8, chainLength: 8, upgrades: 0, value: 1 } }),
      { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } }
    );
    const saved = JSON.stringify(a2);
    const rehydrated = JSON.parse(saved);
    expect(rehydrated.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });

  it("G: SESSION_START never zeroes research progress", () => {
    const a2 = rootReducer(
      rootReducer(base, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 8, chainLength: 8, upgrades: 0, value: 1 } }),
      { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_hay", gained: 5, chainLength: 5, upgrades: 0, value: 1 } }
    );
    const g1 = rootReducer(a2, { type: "SESSION_START" });
    expect(g1.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });
});
