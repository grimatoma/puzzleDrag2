import { describe, it, expect } from "vitest";
import { gameReducer, createInitialState } from "../state.js";
import { BIOMES, FISH_TILE_POOL, UPGRADE_THRESHOLDS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { MAP_NODES, NODE_COLORS, KIND_LABELS } from "../features/cartography/data.js";

describe("fish biome (MVP)", () => {
  it("BIOMES.fish exists with tiles and resources split correctly", () => {
    expect(BIOMES.fish).toBeDefined();
    const tileKeys = BIOMES.fish.tiles.map((r) => r.key);
    const resourceKeys = BIOMES.fish.resources.map((r) => r.key);
    // All entries in .tiles must have kind:"tile"
    for (const k of tileKeys) expect(BIOMES.fish.tiles.find(r => r.key === k)?.kind).toBe("tile");
    // All entries in .resources must have kind:"resource"
    for (const k of resourceKeys) expect(BIOMES.fish.resources.find(r => r.key === k)?.kind).toBe("resource");
    // Tile keys include the fish tile pool entries
    expect(tileKeys).toContain("tile_fish_sardine");
    expect(tileKeys).toContain("tile_fish_mackerel");
    expect(tileKeys).toContain("tile_fish_kelp");
    // Resource keys include the chain outputs
    expect(resourceKeys).toContain("fish_fillet");
    expect(resourceKeys).toContain("fish_oil");
    expect(resourceKeys).toContain("sea_shells");
    expect(resourceKeys).toContain("pearls");
  });

  it("FISH_TILE_POOL only references fish biome tiles", () => {
    const fishTileKeys = new Set(BIOMES.fish.tiles.map((r) => r.key));
    for (const k of FISH_TILE_POOL) expect(fishTileKeys.has(k)).toBe(true);
  });

  it("every spawnable fish tile + chain product has a registered icon and threshold", () => {
    for (const r of [...BIOMES.fish.tiles, ...BIOMES.fish.resources]) {
      expect(ICON_REGISTRY[r.key], `icon for ${r.key}`).toBeDefined();
      // Terminal products (next: null) don't need a threshold.
      if (r.next != null) {
        expect(UPGRADE_THRESHOLDS[r.key], `threshold for ${r.key}`).toBeGreaterThan(0);
      }
    }
  });

  it("every fish chain points at a key that exists in fish or farm biome", () => {
    const knownKeys = new Set([
      ...BIOMES.farm.tiles.map((r) => r.key),
      ...BIOMES.farm.resources.map((r) => r.key),
      ...BIOMES.mine.tiles.map((r) => r.key),
      ...BIOMES.mine.resources.map((r) => r.key),
      ...BIOMES.fish.tiles.map((r) => r.key),
      ...BIOMES.fish.resources.map((r) => r.key),
    ]);
    for (const r of [...BIOMES.fish.tiles, ...BIOMES.fish.resources]) {
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
    // CARTO/TRAVEL reads a top-level `nodeId` (see cartography/slice.ts and the
    // production dispatch in cartography/index.tsx), not `payload.nodeId`. The
    // old `payload` shape was a no-op that only "passed" via leftover save state.
    const s1 = gameReducer(s0, { type: "CARTO/TRAVEL", nodeId: "harbor" });
    expect(s1.biomeKey).toBe("fish");
    expect(s1.view).toBe("town");
  });
});
