import { describe, it, expect } from "vitest";
import { rootReducer, createInitialState } from "../state.js";
import { BUILDINGS } from "../constants.js";

describe("new harbor + smokehouse buildings", () => {
  it("registers harbor_dock / fishmonger / smokehouse", () => {
    for (const id of ["harbor_dock", "fishmonger", "smokehouse"]) {
      const b = BUILDINGS.find((x) => x.id === id);
      expect(b, id).toBeDefined();
    }
  });

  it("each new building has cost, lv, color, and a description", () => {
    for (const id of ["harbor_dock", "fishmonger", "smokehouse"]) {
      const b = BUILDINGS.find((x) => x.id === id);
      expect(b.cost.coins).toBeGreaterThan(0);
      expect(b.lv).toBeGreaterThanOrEqual(1);
      expect(typeof b.color).toBe("string");
      expect(typeof b.desc).toBe("string");
      expect(b.desc.length).toBeGreaterThan(10);
    }
  });

  it("harbor_dock + fishmonger are gated on biome 'fish'", () => {
    expect(BUILDINGS.find((b) => b.id === "harbor_dock").biome).toBe("fish");
    expect(BUILDINGS.find((b) => b.id === "fishmonger").biome).toBe("fish");
  });

  it("BUILD on harbor_dock with sufficient resources succeeds", () => {
    const def = BUILDINGS.find((b) => b.id === "harbor_dock");
    const s0 = {
      ...createInitialState(),
      coins: def.cost.coins + 100,
      inventory: { wood_plank: def.cost.wood_plank + 10, mine_stone: def.cost.mine_stone + 10 },
      level: def.lv + 1,
      built: {},
    };
    const s1 = rootReducer(s0, { type: "BUILD", building: def });
    expect(s1.built.harbor_dock).toBe(true);
    expect(s1.coins).toBe(s0.coins - def.cost.coins);
  });

  it("BUILD on fishmonger requires fish_fillet — rejects without it", () => {
    const def = BUILDINGS.find((b) => b.id === "fishmonger");
    const s0 = {
      ...createInitialState(),
      coins: 5000,
      inventory: { wood_plank: 50, fish_fillet: 0 },
      level: 10,
      built: {},
    };
    const s1 = rootReducer(s0, { type: "BUILD", building: def });
    expect(s1.built?.fishmonger).toBeUndefined();
  });

  it("smokehouse has no biome gate (works for both farm + mine + fish)", () => {
    const b = BUILDINGS.find((x) => x.id === "smokehouse");
    expect(b.biome).toBeUndefined();
  });
});
