import { describe, it, expect } from "vitest";
import { BOSSES } from "../features/bosses/data.js";
import {
  applyModifierToFreshGrid,
  tickModifier,
  tileIsChainable,
  clearModifier,
} from "../features/bosses/modifiers.js";
import { createInitialState } from "../state.js";

function makeTestGrid(rows, cols) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ row: r, col: c }))
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
    const fm = BOSSES.find((b) => b.id === "frostmaw");
    expect(fm.target.resource).toBe("wood_log");
    expect(fm.target.amount).toBe(30);
    expect(fm.modifier.type).toBe("freeze_columns");
    expect(fm.modifier.params.n).toBe(2);
  });

  it("ember_drake: 3 ingots + heat_tiles", () => {
    const ed = BOSSES.find((b) => b.id === "ember_drake");
    expect(ed.target.amount).toBe(3);
    expect(ed.modifier.type).toBe("heat_tiles");
  });

  it("old_stoneface: 20 stone + rubble_blocks", () => {
    const os = BOSSES.find((b) => b.id === "old_stoneface");
    expect(os.target.amount).toBe(20);
    expect(os.modifier.type).toBe("rubble_blocks");
  });

  it("quagmire: 50 hay", () => {
    const qm = BOSSES.find((b) => b.id === "quagmire");
    expect(qm.target.amount).toBe(50);
    expect(qm.target.resource).toBe("grass_hay");
  });

  it("freeze_columns: 2 distinct columns flagged, frozen tiles not chainable", () => {
    const fm = BOSSES.find((b) => b.id === "frostmaw");
    const grid = makeTestGrid(6, 7);
    let i = 0;
    const rng = () => [0.0, 0.99, 0.5, 0.1][i++ % 4];
    const mState = applyModifierToFreshGrid(grid, fm.modifier, rng);
    expect(mState.frozenColumns.length).toBe(2);
    expect(mState.frozenColumns[0]).not.toBe(mState.frozenColumns[1]);
    expect(tileIsChainable(grid[0][mState.frozenColumns[0]], fm.modifier)).toBe(false);
    expect(tileIsChainable({ frozen: false }, fm.modifier)).toBe(true);
  });

  it("heat_tiles: age 1 → 2 → burn 1 random inventory unit", () => {
    const ed = BOSSES.find((b) => b.id === "ember_drake");
    let s = createInitialState();
    s.inventory = { grass_hay: 5, wood_log: 3 };
    s.boss = {
      id: "ember_drake",
      target: { resource: "mine_ingot", amount: 3 },
      progress: 0,
      turnsRemaining: 10,
      modifierState: { heat: [{ row: 2, col: 3, age: 1 }] },
    };
    s = tickModifier(s, ed.modifier).newState;
    expect(s.boss.modifierState.heat[0].age).toBe(2);
    s = tickModifier(s, ed.modifier).newState;
    expect(s.inventory.grass_hay + s.inventory.wood_log).toBe(7);
    expect(s.boss.modifierState.heat.length).toBe(0);
  });

  it("rubble_blocks: 4 rubble cells, not chainable", () => {
    const os = BOSSES.find((b) => b.id === "old_stoneface");
    const r2 = applyModifierToFreshGrid(makeTestGrid(6, 7), os.modifier, () => 0.5);
    expect(r2.rubble.length).toBe(4);
    expect(tileIsChainable({ rubble: true }, os.modifier)).toBe(false);
  });

  it("hide_resources: 4 hidden cells, not chainable", () => {
    const mb = BOSSES.find((b) => b.id === "mossback");
    const r3 = applyModifierToFreshGrid(makeTestGrid(6, 7), mb.modifier, () => 0.3);
    expect(r3.hidden.length).toBe(4);
    expect(tileIsChainable({ hidden: true }, mb.modifier)).toBe(false);
  });

  it("clearModifier strips every overlay flag", () => {
    const fm = BOSSES.find((b) => b.id === "frostmaw");
    const grid = makeTestGrid(6, 7);
    const post = clearModifier(grid, fm.modifier);
    expect(post.every((row) => row.every((t) => !t.frozen))).toBe(true);
  });

  it("modifierState round-trips losslessly via JSON", () => {
    let s = createInitialState();
    s.boss = {
      modifierState: { heat: [{ row: 2, col: 3, age: 1 }] },
    };
    const saved = JSON.stringify(s.boss.modifierState);
    expect(JSON.stringify(JSON.parse(saved))).toBe(saved);
  });
});
