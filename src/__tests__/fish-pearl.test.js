import { describe, it, expect } from "vitest";
import {
  spawnPearl,
  tickPearl,
  isPearlChainValid,
  PEARL_KEY,
  PEARL_TURNS,
  REQUIRED_FISH_IN_CHAIN,
} from "../features/fish/pearl.js";
import { rootReducer, createInitialState } from "../state.js";

const makeFishGrid = (rows = 3, cols = 4, fillKey = "fish_kelp") =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ key: fillKey })),
  );

describe("fish/pearl helpers", () => {
  it("spawnPearl is a no-op off the fish biome", () => {
    const s0 = { biome: "farm", grid: makeFishGrid() };
    expect(spawnPearl(s0)).toBe(s0);
  });

  it("spawnPearl is a no-op when one is already active", () => {
    const s0 = {
      biome: "fish",
      grid: makeFishGrid(),
      fishPearl: { row: 0, col: 0, turnsRemaining: PEARL_TURNS },
    };
    expect(spawnPearl(s0)).toBe(s0);
  });

  it("spawnPearl is a no-op on an empty grid", () => {
    const s0 = { biome: "fish", grid: [] };
    expect(spawnPearl(s0)).toBe(s0);
    const s1 = { biome: "fish", grid: [[]] };
    expect(spawnPearl(s1)).toBe(s1);
  });

  it("spawnPearl seeds a single pearl tile and the slot", () => {
    const s0 = { biome: "fish", grid: makeFishGrid(3, 4) };
    const s1 = spawnPearl(s0, () => 0); // deterministic — top-left cell
    expect(s1.fishPearl).toEqual({ row: 0, col: 0, turnsRemaining: PEARL_TURNS });
    expect(s1.grid[0][0].key).toBe(PEARL_KEY);
    // Other tiles untouched
    expect(s1.grid[0][1].key).toBe("fish_kelp");
  });

  it("spawnPearl avoids blocked tiles (frozen/rubble)", () => {
    const grid = makeFishGrid(2, 2);
    grid[0][0] = { ...grid[0][0], frozen: true };
    const s0 = { biome: "fish", grid };
    // Force first pick at (0,0) which is blocked; second pick (0,1) is open.
    let calls = 0;
    const rng = () => (calls++ === 0 ? 0 : 0.4);
    const s1 = spawnPearl(s0, rng);
    // Should not have placed pearl on a blocked tile
    expect(s1.grid[0][0].key).not.toBe(PEARL_KEY);
    expect(s1.fishPearl).not.toBeNull();
  });

  it("tickPearl decrements turnsRemaining", () => {
    const s0 = { fishPearl: { row: 1, col: 1, turnsRemaining: 5 }, grid: makeFishGrid() };
    const s1 = tickPearl(s0);
    expect(s1.fishPearl.turnsRemaining).toBe(4);
  });

  it("tickPearl at 1 → 0 expires the pearl and degrades the tile to kelp", () => {
    const grid = makeFishGrid();
    grid[0][1] = { key: PEARL_KEY };
    const s0 = { fishPearl: { row: 0, col: 1, turnsRemaining: 1 }, grid };
    const s1 = tickPearl(s0);
    expect(s1.fishPearl).toBeNull();
    expect(s1.grid[0][1].key).toBe("fish_kelp");
  });

  it("isPearlChainValid: pearl + 2 fish tiles → true", () => {
    const chain = [
      { key: PEARL_KEY },
      { key: "fish_sardine" },
      { key: "fish_clam" },
    ];
    expect(isPearlChainValid(chain)).toBe(true);
  });

  it("isPearlChainValid: pearl + 1 fish tile → false", () => {
    const chain = [{ key: PEARL_KEY }, { key: "fish_sardine" }];
    expect(isPearlChainValid(chain)).toBe(false);
  });

  it("isPearlChainValid: no pearl → false", () => {
    const chain = [{ key: "fish_sardine" }, { key: "fish_clam" }, { key: "fish_kelp" }];
    expect(isPearlChainValid(chain)).toBe(false);
  });

  it("isPearlChainValid: pearl + non-fish bystanders → false", () => {
    const chain = [{ key: PEARL_KEY }, { key: "grass_hay" }, { key: "wood_log" }];
    expect(isPearlChainValid(chain)).toBe(false);
  });

  it("REQUIRED_FISH_IN_CHAIN is exposed and matches helper logic", () => {
    expect(REQUIRED_FISH_IN_CHAIN).toBe(2);
  });
});

describe("rootReducer: pearl integration on fish biome", () => {
  const fishStateOnBoard = (over = {}) => ({
    ...createInitialState(),
    biome: "fish",
    biomeKey: "fish",
    grid: makeFishGrid(),
    ...over,
  });

  it("SET_BIOME to fish spawns a pearl", () => {
    const s0 = { ...createInitialState(), grid: makeFishGrid() };
    const s1 = rootReducer(s0, { type: "SET_BIOME", id: "fish" });
    expect(s1.biomeKey).toBe("fish");
    expect(s1.fishPearl).toBeTruthy();
    expect(s1.fishPearl.turnsRemaining).toBe(PEARL_TURNS);
  });

  it("SET_BIOME away from fish clears the pearl", () => {
    const s0 = fishStateOnBoard({
      fishPearl: { row: 0, col: 0, turnsRemaining: 3 },
    });
    const s1 = rootReducer(s0, { type: "SET_BIOME", id: "farm" });
    expect(s1.fishPearl).toBeNull();
  });

  it("CHAIN_COLLECTED with pearl + ≥2 fish tiles credits a rune and clears pearl", () => {
    const s0 = fishStateOnBoard({
      runes: 0,
      fishPearl: { row: 0, col: 0, turnsRemaining: 3 },
    });
    const chain = [
      { key: PEARL_KEY },
      { key: "fish_sardine" },
      { key: "fish_clam" },
    ];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: PEARL_KEY, gained: 0, upgrades: 0, chainLength: chain.length, value: 0 },
    });
    expect(s1.runes).toBe(1);
    expect(s1.fishPearl).toBeNull();
    expect(s1.bubble?.text).toMatch(/Pearl/i);
  });

  it("CHAIN_COLLECTED with pearl but only 1 fish does NOT grant a rune", () => {
    const s0 = fishStateOnBoard({
      runes: 0,
      fishPearl: { row: 0, col: 0, turnsRemaining: 3 },
    });
    const chain = [{ key: PEARL_KEY }, { key: "fish_sardine" }];
    const s1 = rootReducer(s0, {
      type: "CHAIN_COLLECTED",
      payload: { chain, key: PEARL_KEY, gained: 0, upgrades: 0, chainLength: chain.length, value: 0 },
    });
    expect(s1.runes).toBe(0);
  });
});
