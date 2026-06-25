import { describe, it, expect } from "vitest";
import { inv } from "../testUtils/inventory.js";
import { BOSSES } from "../features/bosses/data.js";
import {
  applyModifierToFreshGrid,
  tickModifier,
  tileIsChainable,
  clearModifier,
} from "../features/bosses/modifiers.js";
import { mergeTestState } from "../testUtils/testState.js";

type ModTile = {
  row: number;
  col: number;
  frozen?: boolean;
  rubble?: boolean;
  hidden?: boolean;
  [k: string]: unknown;
};

function requireBoss(id: string) {
  const boss = BOSSES.find((b) => b.id === id);
  if (!boss) throw new Error(`missing boss ${id}`);
  return boss;
}

type BossModifierBag = {
  modifierState?: { heat?: Array<{ row: number; col: number; age: number }> };
};

function bossBag(state: { boss?: unknown | null }): BossModifierBag | null {
  return state.boss as BossModifierBag | null;
}

function makeTestGrid(rows: number, cols: number): ModTile[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ row: r, col: c })),
  );
}

describe("8.1 — Boss board modifiers", () => {
  it("exports at least 4 bosses", () => {
    expect(BOSSES.length).toBeGreaterThanOrEqual(4);
  });

  it("has all 4 canonical boss ids", () => {
    const ids = BOSSES.map((b) => b.id);
    expect(["frostmaw", "quagmire", "ember_drake", "old_stoneface"].every((i) =>
      ids.includes(i)
    )).toBe(true);
  });

  it("frostmaw: 30 logs + freeze_columns n=2", () => {
    const fm = requireBoss("frostmaw");
    expect(fm.target.resource).toBe("tile_tree_oak");
    expect(fm.target.amount).toBe(30);
    expect(fm.modifier.type).toBe("freeze_columns");
    expect(fm.modifier.params.n).toBe(2);
  });

  it("ember_drake: 3 ingots + heat_tiles", () => {
    const ed = requireBoss("ember_drake");
    expect(ed.target.amount).toBe(3);
    expect(ed.modifier.type).toBe("heat_tiles");
  });

  it("old_stoneface: 20 stone + rubble_blocks", () => {
    const os = requireBoss("old_stoneface");
    expect(os.target.amount).toBe(20);
    expect(os.modifier.type).toBe("rubble_blocks");
  });

  it("quagmire: 50 hay", () => {
    const qm = requireBoss("quagmire");
    expect(qm.target.amount).toBe(50);
    expect(qm.target.resource).toBe("tile_grass_grass");
  });

  it("freeze_columns: 2 distinct columns flagged, frozen tiles not chainable", () => {
    const fm = requireBoss("frostmaw");
    const grid = makeTestGrid(6, 7);
    let i = 0;
    const rng = () => [0.0, 0.99, 0.5, 0.1][i++ % 4];
    const mState = applyModifierToFreshGrid(grid, fm.modifier, rng);
    expect(mState.frozenColumns).toHaveLength(2);
    expect(mState.frozenColumns?.[0]).not.toBe(mState.frozenColumns?.[1]);
    expect(tileIsChainable(grid[0][mState.frozenColumns![0]])).toBe(false);
    expect(tileIsChainable({ frozen: false })).toBe(true);
  });

  it("heat_tiles: seeds spawnPerTurn tiles on a fresh grid", () => {
    const ed = requireBoss("ember_drake"); // params: { spawnPerTurn: 1, burnAfter: 2 }
    const grid = makeTestGrid(6, 6);
    const r = applyModifierToFreshGrid(grid, ed.modifier, () => 0.5);
    expect(r.heat).toHaveLength(1);
    const seeded = r.heat![0];
    expect(seeded.age).toBe(0);
    expect(grid[seeded.row][seeded.col].heat).toBe(true);
  });

  it("heat_tiles: ages each turn, burns a stored resource past burnAfter, then the tile burns out", () => {
    const ed = requireBoss("ember_drake"); // burnAfter: 2, spawnPerTurn: 1
    let s = mergeTestState({
      grid: makeTestGrid(6, 6),
      inventory: { home: { tile_grass_grass: 5, tile_tree_oak: 3 } },
      boss: {
        id: "ember_drake",
        target: { resource: "iron_bar", amount: 3 },
        progress: 0,
        turnsRemaining: 10,
        modifierState: { heat: [{ row: 2, col: 3, age: 1 }] },
      },
    });
    s = tickModifier(s, ed.modifier).newState;
    // The original tile aged 1 → 2 (survives) and one fresh tile ignited.
    const heat1 = bossBag(s)?.modifierState?.heat ?? [];
    expect(heat1.find((h) => h.row === 2 && h.col === 3)?.age).toBe(2);
    expect(heat1).toHaveLength(2);
    s = tickModifier(s, ed.modifier).newState;
    // The original is now age 3 (> burnAfter): it scorches exactly one stored
    // unit and is removed. No surviving tile is ever older than burnAfter.
    expect(inv(s).tile_grass_grass + inv(s).tile_tree_oak).toBe(7);
    const heat2 = bossBag(s)?.modifierState?.heat ?? [];
    expect(heat2.some((h) => h.age > (ed.modifier.params.burnAfter as number))).toBe(false);
  });

  it("heat_tiles: spreads spawnPerTurn fresh tiles each turn", () => {
    const ed = requireBoss("ember_drake"); // spawnPerTurn: 1
    let s = mergeTestState({
      grid: makeTestGrid(6, 6),
      inventory: { home: {} },
      boss: {
        id: "ember_drake",
        target: { resource: "iron_bar", amount: 3 },
        progress: 0,
        turnsRemaining: 10,
        modifierState: { heat: [] },
      },
    });
    s = tickModifier(s, ed.modifier).newState;
    expect(bossBag(s)?.modifierState?.heat).toHaveLength(1);
    s = tickModifier(s, ed.modifier).newState;
    expect(bossBag(s)?.modifierState?.heat).toHaveLength(2); // both still cool (age ≤ burnAfter)
  });

  it("rubble_blocks: 4 rubble cells, not chainable", () => {
    const os = requireBoss("old_stoneface");
    const r2 = applyModifierToFreshGrid(makeTestGrid(6, 7), os.modifier, () => 0.5);
    expect(r2.rubble).toHaveLength(4);
    expect(tileIsChainable({ rubble: true })).toBe(false);
  });

  it("hide_resources: 4 hidden cells, not chainable", () => {
    const mb = requireBoss("mossback");
    const r3 = applyModifierToFreshGrid(makeTestGrid(6, 7), mb.modifier, () => 0.3);
    expect(r3.hidden).toHaveLength(4);
    expect(tileIsChainable({ hidden: true })).toBe(false);
  });

  it("clearModifier strips every overlay flag", () => {
    const grid = makeTestGrid(6, 7);
    const post = clearModifier(grid);
    expect(post?.every((row) => row.every((t) => !t.frozen))).toBe(true);
  });

  it("modifierState round-trips losslessly via JSON", () => {
    const s = mergeTestState({
      boss: {
        modifierState: { heat: [{ row: 2, col: 3, age: 1 }] },
      },
    });
    const saved = JSON.stringify(bossBag(s)?.modifierState);
    expect(JSON.stringify(JSON.parse(saved))).toBe(saved);
  });
});
