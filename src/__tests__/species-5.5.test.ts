import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { TILE_TYPES, TILE_TYPES_MAP } from "../features/tileCollection/data.js";

// Research is deliberate: progress only advances for the tile the player has selected
// as the research focus for its category. Unselected research tiles stay paused.
const focusGrassSpiky = (s: ReturnType<typeof initialState>) =>
  rootReducer(s, { type: "SET_RESEARCH_TILE", payload: { category: "grass", tileId: "tile_grass_spiky" } });

describe("Phase 5.5 — Research timer (focused, per-category)", () => {
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

  it("A2: with no research focus selected, chaining a prerequisite makes no progress", () => {
    // Fresh game: researchByCategory is all-null, so research is dormant.
    expect(base.tileCollection.researchByCategory.grass).toBe(null);
    const a1 = rootReducer(base, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 8, chainLength: 8, upgrades: 0, value: 1 } });
    expect(a1.tileCollection.researchProgress.tile_grass_spiky).toBe(0);
    expect(a1.tileCollection.discovered.tile_grass_spiky).toBeFalsy();
  });

  it("B: with focus set, a chain of the prerequisite increments progress and accumulates", () => {
    const f0 = focusGrassSpiky(base);
    expect(f0.tileCollection.researchByCategory.grass).toBe("tile_grass_spiky");
    const a1 = rootReducer(f0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 8, chainLength: 8, upgrades: 0, value: 1 } });
    expect(a1.tileCollection.researchProgress.tile_grass_spiky).toBe(8);
    const a2 = rootReducer(a1, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    expect(a2.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });

  it("C: focusing one tile leaves unfocused research tiles paused", () => {
    const f0 = focusGrassSpiky(base);
    const a1 = rootReducer(f0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 8, chainLength: 8, upgrades: 0, value: 1 } });
    // tile_bird_turkey (researchOf "eggs") is NOT focused — chaining its prerequisite is a no-op for it.
    const before = a1.tileCollection.researchProgress.tile_bird_turkey;
    const c1 = rootReducer(a1, { type: "CHAIN_COLLECTED", payload: { key: "eggs", gained: 12, chainLength: 12, upgrades: 0, value: 1 } });
    expect(c1.tileCollection.researchProgress.tile_bird_turkey).toBe(before);
    expect(c1.tileCollection.researchProgress.tile_bird_turkey).toBe(0);
    // And the focused grass counter is unaffected by the unrelated chain.
    expect(c1.tileCollection.researchProgress.tile_grass_spiky).toBe(8);
  });

  it("D: reaching threshold flips discovered, queues bubble, and frees the category slot", () => {
    const thresh = TILE_TYPES_MAP.tile_grass_spiky.discovery.researchAmount;
    const f0 = focusGrassSpiky(base);
    const d0 = {
      ...f0,
      tileCollection: {
        ...f0.tileCollection,
        researchProgress: { ...f0.tileCollection.researchProgress, tile_grass_spiky: thresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    expect(d1.tileCollection.discovered.tile_grass_spiky).toBe(true);
    expect(d1.bubble).toBeTruthy();
    expect(/New tile type: Spiky Grass/i.test(d1.bubble.text)).toBe(true);
    // Slot cleared so the player can pick the next target.
    expect(d1.tileCollection.researchByCategory.grass).toBe(null);
  });

  it("E: already-discovered tile type is a no-op (no progress drift, no re-fire)", () => {
    const thresh = TILE_TYPES_MAP.tile_grass_spiky.discovery.researchAmount;
    const f0 = focusGrassSpiky(base);
    const d0 = {
      ...f0,
      tileCollection: {
        ...f0.tileCollection,
        researchProgress: { ...f0.tileCollection.researchProgress, tile_grass_spiky: thresh - 1 },
      },
    };
    const d1 = rootReducer(d0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 5, chainLength: 5, upgrades: 0, value: 1 } });
    // Clear the stale discovery bubble from d1 before testing no-re-fire
    const d1Clean = { ...d1, bubble: null };
    const e1 = rootReducer(d1Clean, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 9, chainLength: 9, upgrades: 0, value: 1 } });
    expect(e1.tileCollection.researchProgress.tile_grass_spiky).toBe(d1.tileCollection.researchProgress.tile_grass_spiky);
    const noDoubleDisc = !e1.bubble || !/New tile type: Spiky Grass/i.test(e1.bubble?.text ?? "");
    expect(noDoubleDisc).toBe(true);
  });

  it("F: LOCKED — save/reload preserves cumulative research progress", () => {
    const f0 = focusGrassSpiky(base);
    const a2 = rootReducer(
      rootReducer(f0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 8, chainLength: 8, upgrades: 0, value: 1 } }),
      { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 5, chainLength: 5, upgrades: 0, value: 1 } }
    );
    const saved = JSON.stringify(a2);
    const rehydrated = JSON.parse(saved);
    expect(rehydrated.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });

  it("G: SESSION_START never zeroes research progress", () => {
    const f0 = focusGrassSpiky(base);
    const a2 = rootReducer(
      rootReducer(f0, { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 8, chainLength: 8, upgrades: 0, value: 1 } }),
      { type: "CHAIN_COLLECTED", payload: { key: "tile_grass_grass", gained: 5, chainLength: 5, upgrades: 0, value: 1 } }
    );
    const g1 = rootReducer(a2, { type: "SESSION_START" });
    expect(g1.tileCollection.researchProgress.tile_grass_spiky).toBe(13);
  });
});
