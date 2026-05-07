import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";
import { DECORATIONS } from "../features/decorations/data.js";

describe("8.5 — Influence currency + Decoration buildings", () => {
  it("exactly 3 decorations in catalog", () => {
    expect(Object.keys(DECORATIONS).length).toBe(3);
  });

  it("violet_bed influence = 20", () => {
    expect(DECORATIONS.violet_bed.influence).toBe(20);
  });

  it("stone_lantern influence = 35", () => {
    expect(DECORATIONS.stone_lantern.influence).toBe(35);
  });

  it("apple_sapling influence = 60", () => {
    expect(DECORATIONS.apple_sapling.influence).toBe(60);
  });

  it("fresh state: influence starts at 0", () => {
    const s0 = createInitialState();
    expect(s0.influence).toBe(0);
  });

  it("fresh state: no decorations built", () => {
    const s0 = createInitialState();
    expect(Object.keys(s0.built?.decorations ?? {}).length).toBe(0);
  });

  it("BUILD_DECORATION: deducts cost, credits influence, increments count", () => {
    const s0 = createInitialState();
    const s1 = rootReducer(
      { ...s0, coins: 200, inventory: { ...s0.inventory, grass_hay: 10 } },
      { type: "BUILD_DECORATION", payload: { id: "violet_bed" } }
    );
    expect(s1.coins).toBe(140);
    expect(s1.inventory.grass_hay).toBe(6);
    expect(s1.influence).toBe(20);
    expect(s1.built.decorations.violet_bed).toBe(1);
  });

  it("BUILD_DECORATION is repeatable — second build grants same influence again", () => {
    const s0 = createInitialState();
    const s1 = rootReducer(
      { ...s0, coins: 200, inventory: { ...s0.inventory, grass_hay: 10 } },
      { type: "BUILD_DECORATION", payload: { id: "violet_bed" } }
    );
    const s2 = rootReducer(
      { ...s1, coins: 100, inventory: { ...s1.inventory, grass_hay: 8 } },
      { type: "BUILD_DECORATION", payload: { id: "violet_bed" } }
    );
    expect(s2.influence).toBe(40);
    expect(s2.built.decorations.violet_bed).toBe(2);
  });

  it("BUILD_DECORATION: no-op when cost unmet (influence/coins/built unchanged)", () => {
    const s0 = createInitialState();
    const s3 = rootReducer(s0, {
      type: "BUILD_DECORATION",
      payload: { id: "stone_lantern" },
    });
    // Cost unmet: influence, coins, and decoration counts must not change
    expect(s3.influence).toBe(s0.influence);
    expect(s3.coins).toBe(s0.coins);
    expect(s3.built?.decorations?.stone_lantern ?? 0).toBe(0);
  });

  it("save/load round-trip preserves influence and decoration counts", () => {
    const s0 = createInitialState();
    const s1 = rootReducer(
      { ...s0, coins: 200, inventory: { ...s0.inventory, grass_hay: 10 } },
      { type: "BUILD_DECORATION", payload: { id: "violet_bed" } }
    );
    const s2 = rootReducer(
      { ...s1, coins: 100, inventory: { ...s1.inventory, grass_hay: 8 } },
      { type: "BUILD_DECORATION", payload: { id: "violet_bed" } }
    );
    const round = JSON.parse(JSON.stringify(s2));
    expect(round.influence).toBe(40);
    expect(round.built.decorations.violet_bed).toBe(2);
  });
});
