// Phase 31 — Start Farming session: FARM/ENTER, fertilizer turn-doubling,
// 50-coin entry cost, selected-tiles persistence on the session.
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../src/state.js";
import { ZONES } from "../src/features/zones/data.js";

function withCoins(state, coins) {
  return { ...state, coins };
}

describe("Phase 31 — fresh state has session + farmFertilizer fields", () => {
  it("session starts empty", () => {
    const s = createInitialState();
    expect(s.session).toEqual({ selectedTiles: [], fertilizerUsed: false });
  });

  it("farmFertilizer stock starts at 0", () => {
    const s = createInitialState();
    expect(s.farmFertilizer).toBe(0);
  });
});

describe("Phase 31 — FARM/ENTER: cost gating", () => {
  it("rejects entry when coins < 50", () => {
    const s = withCoins(createInitialState(), 49);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: false },
    });
    expect(next.coins).toBe(49);
    expect(next.view).not.toBe("board");
  });

  it("deducts 50 coins and switches to board on success", () => {
    const s = withCoins(createInitialState(), 200);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: ["grass", "grain"], useFertilizer: false },
    });
    expect(next.coins).toBe(150);
    expect(next.view).toBe("board");
    expect(next.biomeKey).toBe("farm");
    expect(next.turnsUsed).toBe(0);
  });
});

describe("Phase 31 — FARM/ENTER: turn budget", () => {
  it("uses the active zone's startingTurns by default (home = 16)", () => {
    const s = withCoins(createInitialState(), 100);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: false },
    });
    expect(next.sessionMaxTurns).toBe(ZONES.home.startingTurns);
    expect(next.sessionMaxTurns).toBe(16);
  });

  it("doubles the turn budget when fertilizer is applied", () => {
    const s = withCoins({ ...createInitialState(), farmFertilizer: 1 }, 100);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: true },
    });
    expect(next.sessionMaxTurns).toBe(32);
    expect(next.farmFertilizer).toBe(0);
    expect(next.session.fertilizerUsed).toBe(true);
  });

  it("rejects fertilizer toggle when farmFertilizer === 0", () => {
    const s = withCoins(createInitialState(), 100);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: true },
    });
    expect(next.coins).toBe(100); // not deducted
    expect(next.view).not.toBe("board");
    expect(next.sessionMaxTurns).toBe(s.sessionMaxTurns);
  });
});

describe("Phase 31 — FARM/ENTER: selected-tiles persistence", () => {
  it("persists the selected categories onto state.session", () => {
    const s = withCoins(createInitialState(), 100);
    const tiles = ["grass", "grain", "trees", "birds", "vegetables", "fruits"];
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: tiles, useFertilizer: false },
    });
    expect(next.session.selectedTiles).toEqual(tiles);
    expect(next.session.fertilizerUsed).toBe(false);
  });

  it("caps selectedTiles at 8 entries (Start Farming modal contract)", () => {
    const s = withCoins(createInitialState(), 100);
    const tiles = [
      "grass", "grain", "trees", "birds",
      "vegetables", "fruits", "flowers", "herd_animals",
      "cattle", "mounts", // 10 entries
    ];
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: tiles, useFertilizer: false },
    });
    expect(next.session.selectedTiles.length).toBe(8);
    expect(next.session.selectedTiles).toEqual(tiles.slice(0, 8));
  });

  it("ignores non-array selectedTiles payloads", () => {
    const s = withCoins(createInitialState(), 100);
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: null, useFertilizer: false },
    });
    expect(next.session.selectedTiles).toEqual([]);
    expect(next.view).toBe("board");
  });
});

describe("Phase 31 — expandZoneCategories", () => {
  it("expands birds (plural) to bird (singular) tile-collection category", async () => {
    const { expandZoneCategories } = await import(
      "../src/features/zones/data.js"
    );
    expect(expandZoneCategories(["birds"]).has("bird")).toBe(true);
  });

  it("expands trees to both trees and wood", async () => {
    const { expandZoneCategories } = await import(
      "../src/features/zones/data.js"
    );
    const set = expandZoneCategories(["trees"]);
    expect(set.has("trees")).toBe(true);
    expect(set.has("wood")).toBe(true);
  });

  it("returns an empty set for an empty input", async () => {
    const { expandZoneCategories } = await import(
      "../src/features/zones/data.js"
    );
    expect(expandZoneCategories([]).size).toBe(0);
    expect(expandZoneCategories(undefined).size).toBe(0);
  });

  it("ignores unknown zone categories without throwing", async () => {
    const { expandZoneCategories } = await import(
      "../src/features/zones/data.js"
    );
    expect(expandZoneCategories(["ghost"]).size).toBe(0);
  });
});

describe("Phase 31 — FARM/ENTER: zone awareness", () => {
  it("uses quarry's 10-turn budget when activeZone is quarry", () => {
    const s = withCoins(
      { ...createInitialState(), activeZone: "quarry" },
      200,
    );
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: false },
    });
    expect(next.sessionMaxTurns).toBe(10);
  });

  it("Quarry (10 turns) + fertilizer = 20 turns", () => {
    const s = withCoins(
      {
        ...createInitialState(),
        activeZone: "quarry",
        farmFertilizer: 1,
      },
      200,
    );
    const next = rootReducer(s, {
      type: "FARM/ENTER",
      payload: { selectedTiles: [], useFertilizer: true },
    });
    expect(next.sessionMaxTurns).toBe(20);
  });
});
