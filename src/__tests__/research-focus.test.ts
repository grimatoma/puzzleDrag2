import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";

describe("SET_RESEARCH_TILE — per-category research focus", () => {
  const base = initialState();
  // Mark tutorial as seen so it doesn't auto-start and break strict same-ref assertions.
  const seeded = {
    ...base,
    tutorial: { ...(base.tutorial ?? {}), seen: true, active: false },
  };

  it("A: selecting a research-method tile sets the category's focus", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    expect(a1.tileCollection.researchByCategory.grass).toBe("tile_grass_spiky");
    // Sibling categories untouched.
    expect(a1.tileCollection.researchByCategory.bird).toBe(seeded.tileCollection.researchByCategory.bird);
  });

  it("B: null clears the category's focus", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    const b1 = rootReducer(a1, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: null },
    });
    expect(b1.tileCollection.researchByCategory.grass).toBeNull();
  });

  it("C: re-selecting the same focus → strict no-op (same ref)", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    const a2 = rootReducer(a1, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    expect(a2).toBe(a1);
  });

  it("D: a non-research tile type → strict no-op", () => {
    // tile_grass_grass is a default-method tile, not researchable.
    const d1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_grass" },
    });
    expect(d1).toBe(seeded);
  });

  it("E: cross-category mismatch → strict no-op", () => {
    const e1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "bird", tileId: "tile_grass_spiky" },
    });
    expect(e1).toBe(seeded);
  });

  it("F: unknown category → strict no-op", () => {
    const f1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "fish", tileId: "tile_grass_spiky" },
    });
    expect(f1).toBe(seeded);
  });

  it("G: already-discovered tile → strict no-op (nothing left to research)", () => {
    const discovered = {
      ...seeded,
      tileCollection: {
        ...seeded.tileCollection,
        discovered: { ...seeded.tileCollection.discovered, tile_grass_spiky: true },
      },
    };
    const g1 = rootReducer(discovered, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    expect(g1).toBe(discovered);
  });

  it("H: switching focus within a category replaces the slot, leaving others untouched", () => {
    const a1 = rootReducer(seeded, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: "tile_grass_spiky" },
    });
    const a2 = rootReducer(a1, {
      type: "SET_RESEARCH_TILE",
      payload: { category: "grass", tileId: null },
    });
    expect(a2.tileCollection.researchByCategory.grass).toBeNull();
    for (const c of ["bird", "grain", "fruits", "trees"]) {
      expect(a2.tileCollection.researchByCategory[c]).toBe(seeded.tileCollection.researchByCategory[c]);
    }
  });
});
