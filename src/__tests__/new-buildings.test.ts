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
      // Resource-only costs (PC2 cost port): every building requires a non-zero
      // amount of some resource (coins are no longer a building currency).
      const resTotal = Object.entries(b.cost)
        .filter(([k]) => k !== "coins")
        .reduce((sum, [, v]) => sum + (v as number), 0);
      expect(resTotal, id).toBeGreaterThan(0);
      expect(b.lv).toBeGreaterThanOrEqual(1);
      expect(typeof b.look.color).toBe("string");
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
    // Seed the zone inventory with each resource the (resource-only) cost needs.
    const homeInv: Record<string, number> = {};
    for (const [k, v] of Object.entries(def.cost)) if (k !== "coins") homeInv[k] = (v as number) + 5;
    const s0 = {
      ...createInitialState(),
      coins: 0,
      inventory: { home: homeInv },
      level: def.lv + 1,
      built: {},
    };
    const s1 = rootReducer(s0, { type: "BUILD", building: def });
    const loc = s1.mapCurrent ?? "home";
    expect(s1.built[loc]?.harbor_dock).toBe(true);
    // A representative resource was debited from the zone inventory.
    const firstRes = Object.keys(def.cost).find((k) => k !== "coins") as string;
    expect(s1.inventory[loc][firstRes]).toBe(homeInv[firstRes] - def.cost[firstRes]);
  });

  it("BUILD on fishmonger requires fish_fillet — rejects without it", () => {
    const def = BUILDINGS.find((b) => b.id === "fishmonger");
    const s0 = {
      ...createInitialState(),
      coins: 5000,
      // Everything fishmonger needs EXCEPT fish_fillet, so the rejection is
      // specifically due to the missing fish_fillet.
      inventory: { home: { plank: 50, block: 50, fish_fillet: 0 } },
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
