import { describe, it, expect } from "vitest";
import { createInitialState } from "../state.js";
import { DEFAULT_HOME_BIOME } from "../constants.js";
import {
  getPuzzleBoardKind,
  getSpawnableHazardIds,
  isToolVisibleOnPuzzleBoard,
} from "../ui/puzzleToolFilter.js";

function farmBoard(overrides: Record<string, unknown> = {}) {
  return {
    ...createInitialState(),
    view: "board",
    biome: "farm",
    biomeKey: "farm",
    activeZone: "home",
    mapCurrent: "home",
    ...overrides,
  };
}

function mineBoard(overrides: Record<string, unknown> = {}) {
  return farmBoard({
    biome: "mine",
    biomeKey: "mine",
    activeZone: "quarry",
    mapCurrent: "quarry",
    settlements: {
      home: { founded: true, biome: DEFAULT_HOME_BIOME, keeperPath: "coexist" },
      quarry: { founded: true, biome: "volcanic" },
    },
    ...overrides,
  });
}

describe("getPuzzleBoardKind", () => {
  it("reads biome from state", () => {
    expect(getPuzzleBoardKind(farmBoard())).toBe("farm");
    expect(getPuzzleBoardKind(mineBoard())).toBe("mine");
  });
});

describe("isToolVisibleOnPuzzleBoard — board kind", () => {
  it("shows farm tools on farm, hides mine tools", () => {
    const s = farmBoard();
    expect(isToolVisibleOnPuzzleBoard(s, "rake")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "water_pump")).toBe(false);
  });

  it("shows mine tools on mine, hides farm-only tools", () => {
    const s = mineBoard();
    expect(isToolVisibleOnPuzzleBoard(s, "water_pump")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "rake")).toBe(false);
  });

  it("shows board-agnostic tools on every biome", () => {
    expect(isToolVisibleOnPuzzleBoard(farmBoard(), "bomb")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(mineBoard(), "bomb")).toBe(true);
  });
});

describe("isToolVisibleOnPuzzleBoard — hazard counters", () => {
  it("hides wolf tools on default prairie (no wolves in settlement hazards)", () => {
    const s = farmBoard();
    expect(getSpawnableHazardIds(s).has("wolves")).toBe(false);
    expect(isToolVisibleOnPuzzleBoard(s, "rifle")).toBe(false);
    expect(isToolVisibleOnPuzzleBoard(s, "hound")).toBe(false);
  });

  it("shows wolf tools when the settlement biome lists wolves", () => {
    const s = farmBoard({
      settlements: {
        home: { founded: true, biome: "forest", keeperPath: "coexist" },
      },
    });
    expect(getSpawnableHazardIds(s).has("wolves")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "rifle")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "hound")).toBe(true);
  });

  it("always allows rat counters on farm (rats spawn outside settlement picks)", () => {
    const s = farmBoard();
    expect(getSpawnableHazardIds(s).has("rats")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "cat")).toBe(true);
    expect(isToolVisibleOnPuzzleBoard(s, "terrier")).toBe(true);
  });

  it("shows water_pump only when lava can spawn", () => {
    expect(isToolVisibleOnPuzzleBoard(mineBoard(), "water_pump")).toBe(true);
    const mountain = mineBoard({
      settlements: {
        home: { founded: true, biome: DEFAULT_HOME_BIOME, keeperPath: "coexist" },
        quarry: { founded: true, biome: "mountain" },
      },
    });
    expect(isToolVisibleOnPuzzleBoard(mountain, "water_pump")).toBe(false);
  });

  it("shows explosives when cave_in or mole can spawn", () => {
    const mountain = mineBoard({
      settlements: {
        home: { founded: true, biome: DEFAULT_HOME_BIOME, keeperPath: "coexist" },
        quarry: { founded: true, biome: "mountain" },
      },
    });
    expect(isToolVisibleOnPuzzleBoard(mountain, "explosives")).toBe(true);

    const volcanicOnly = mineBoard({
      settlements: {
        home: { founded: true, biome: DEFAULT_HOME_BIOME, keeperPath: "coexist" },
        quarry: { founded: true, biome: "volcanic" },
      },
    });
    expect(isToolVisibleOnPuzzleBoard(volcanicOnly, "explosives")).toBe(false);
  });
});
