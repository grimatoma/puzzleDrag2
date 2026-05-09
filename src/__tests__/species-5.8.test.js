import { describe, it, expect } from "vitest";
import { initialState, rootReducer } from "../state.js";
import { getCategoryViewModel } from "../features/tileCollection/effects.js";

describe("Phase 5.8 — Tile Collection panel UI (getCategoryViewModel)", () => {
  const rawBase = initialState();
  // Mark tutorial as seen so it doesn't auto-start on the first dispatch
  // and break strict same-reference assertions.
  const base = { ...rawBase, tutorial: { ...(rawBase.tutorial ?? {}), seen: true, active: false } };

  it("A: fresh save — hay is default-active, others locked with correct status strings", () => {
    const grassRows = getCategoryViewModel(base, "grass");
    const hayRow = grassRows.find((r) => r.id === "grass_hay");
    const meadowRow = grassRows.find((r) => r.id === "grass_meadow");
    const spikyRow = grassRows.find((r) => r.id === "grass_spiky");

    expect(hayRow.active).toBe(true);
    expect(hayRow.locked).toBe(false);
    expect(hayRow.status).toBe("Default — always available");

    expect(meadowRow.active).toBe(false);
    expect(meadowRow.locked).toBe(true);
    expect(meadowRow.status).toBe("Locked — chain 20 hay to discover");

    // Display strips the catalog category prefix → user sees "hay" not "grass_hay".
    expect(spikyRow.status).toBe("Researching hay: 0 / 50");
  });

  it("B: chain-discovered tile type shows discovered status", () => {
    const b0 = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, grass_meadow: true } },
    };
    const bRows = getCategoryViewModel(b0, "grass");
    const meadowB = bRows.find((r) => r.id === "grass_meadow");
    expect(meadowB.locked).toBe(false);
    expect(meadowB.active).toBe(false);
    expect(/Discovered — chain 20 hay/.test(meadowB.status)).toBe(true);
  });

  it("C: in-progress research surfaces the live counter", () => {
    const c0 = {
      ...base,
      tileCollection: {
        ...base.tileCollection,
        researchProgress: { ...base.tileCollection.researchProgress, grass_spiky: 12 },
      },
    };
    const grassRows = getCategoryViewModel(c0, "grass");
    const spikyRow = grassRows.find((r) => r.id === "grass_spiky");
    expect(spikyRow.status).toBe("Researching hay: 12 / 50");
  });

  it("D: dispatch SET_ACTIVE_TILE with discovered tile type toggles active", () => {
    const d0 = {
      ...base,
      tileCollection: { ...base.tileCollection, discovered: { ...base.tileCollection.discovered, grass_meadow: true } },
    };
    const d1 = rootReducer(d0, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "grass_meadow" },
    });
    expect(d1.tileCollection.activeByCategory.grass).toBe("grass_meadow");
  });

  it("E: LOCKED — SET_ACTIVE_TILE on a locked tile type is a strict no-op (same ref)", () => {
    const e1 = rootReducer(base, {
      type: "SET_ACTIVE_TILE",
      payload: { category: "grass", tileId: "grass_meadow" },
    });
    expect(e1).toBe(base);
  });

  it("F: buy-only row has action: 'buy', correct status, and BUY_TILE does not auto-activate", () => {
    // Clover was reclassified from `bird` to `flowers` — same buy-cost contract.
    const fRows = getCategoryViewModel(base, "flowers");
    const cloverRow = fRows.find((r) => r.id === "bird_clover");
    expect(cloverRow.action).toBe("buy");
    expect(cloverRow.status).toBe("Buy 200◉");

    const f0 = { ...base, coins: 500 };
    const f1 = rootReducer(f0, { type: "BUY_TILE", payload: { id: "bird_clover" } });
    expect(f1.tileCollection.discovered.bird_clover).toBe(true);
    expect(f1.tileCollection.activeByCategory.flowers).not.toBe("bird_clover");
    expect(f1.coins).toBe(300);
  });
});
