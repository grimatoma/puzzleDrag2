import { describe, it, expect } from "vitest";
import { gameReducer, createInitialState } from "../state.js";
import { BIOMES, FISH_TILE_POOL, UPGRADE_THRESHOLDS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { MAP_NODES, NODE_COLORS, KIND_LABELS } from "../features/cartography/data.js";

describe("fish biome (MVP)", () => {
  it("BIOMES.fish exists with the expected resources", () => {
    expect(BIOMES.fish).toBeDefined();
    const keys = BIOMES.fish.resources.map((r) => r.key);
    expect(keys).toEqual([
      "fish_sardine", "fish_mackerel", "fish_clam", "fish_oyster",
      "fish_kelp", "fish_raw", "fish_fillet", "fish_oil",
    ]);
  });

  it("FISH_TILE_POOL only references fish biome resources", () => {
    const fishKeys = new Set(BIOMES.fish.resources.map((r) => r.key));
    for (const k of FISH_TILE_POOL) expect(fishKeys.has(k)).toBe(true);
  });

  it("every spawnable fish tile + chain product has a registered icon and threshold", () => {
    for (const r of BIOMES.fish.resources) {
      expect(ICON_REGISTRY[r.key], `icon for ${r.key}`).toBeDefined();
      // Terminal products (next: null) don't need a threshold.
      if (r.next != null) {
        expect(UPGRADE_THRESHOLDS[r.key], `threshold for ${r.key}`).toBeGreaterThan(0);
      }
    }
  });

  it("every fish chain points at a key that exists in fish or farm biome", () => {
    const knownKeys = new Set([
      ...BIOMES.farm.resources.map((r) => r.key),
      ...BIOMES.mine.resources.map((r) => r.key),
      ...BIOMES.fish.resources.map((r) => r.key),
    ]);
    for (const r of BIOMES.fish.resources) {
      if (r.next != null) {
        expect(knownKeys.has(r.next), `${r.key}.next=${r.next}`).toBe(true);
      }
    }
  });

  it("SET_BIOME to 'fish' switches biome at season boundary", () => {
    const s0 = createInitialState();
    expect(s0.turnsUsed).toBe(0);
    const s1 = gameReducer(s0, { type: "SET_BIOME", id: "fish" });
    expect(s1.biome).toBe("fish");
    expect(s1.biomeKey).toBe("fish");
    expect(s1._needsRefill).toBe(true);
  });

  it("SET_BIOME to 'fish' does NOT spawn mysterious ore (mine-only mechanic)", () => {
    const s0 = { ...createInitialState(), grid: [[null, null], [null, null]] };
    const s1 = gameReducer(s0, { type: "SET_BIOME", id: "fish" });
    expect(s1.mysteriousOre).toBeNull();
  });

  it("SET_BIOME from mine to farm clears any active mysterious ore", () => {
    // Simulate the player having mysterious ore from being in mine, then
    // travelling somewhere else (farm or fish). The ore should clear.
    const s0 = {
      ...createInitialState(),
      biome: "mine", biomeKey: "mine",
      mysteriousOre: { row: 0, col: 0, turnsRemaining: 5 },
    };
    const s1 = gameReducer(s0, { type: "SET_BIOME", id: "farm" });
    expect(s1.mysteriousOre).toBeNull();
    const s2 = gameReducer(s0, { type: "SET_BIOME", id: "fish" });
    expect(s2.mysteriousOre).toBeNull();
  });

  it("SET_BIOME is rejected mid-season (turnsUsed > 0)", () => {
    const s0 = { ...createInitialState(), turnsUsed: 3 };
    const s1 = gameReducer(s0, { type: "SET_BIOME", id: "fish" });
    expect(s1.biome).toBe(s0.biome);
  });

  it("cartography map exposes a fish-kind harbor node", () => {
    const harbor = MAP_NODES.find((n) => n.kind === "fish");
    expect(harbor).toBeDefined();
    expect(harbor.id).toBe("harbor");
    expect(NODE_COLORS.fish).toBeDefined();
    expect(KIND_LABELS.fish).toBeDefined();
  });

  it("CARTO/TRAVEL to harbor (after visiting it manually) sets biomeKey to fish", () => {
    // Pre-seed the visited list so the level/adjacency gates don't matter
    // for this test; we're verifying the kind→biomeKey mapping in the slice.
    const s0 = {
      ...createInitialState(),
      mapVisited: ["home", "harbor"],
      mapCurrent: "home",
    };
    const s1 = gameReducer(s0, { type: "CARTO/TRAVEL", payload: { nodeId: "harbor" } });
    expect(s1.biomeKey).toBe("fish");
    expect(s1.view).toBe("town");
  });
});
