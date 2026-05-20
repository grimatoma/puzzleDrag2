import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VISUAL_DESKTOP_SMOKE_SCENARIO_IDS, VISUAL_SCENARIOS } from "../visualTesting/matrix.js";
import { buildVisualState, validateVisualState } from "../visualTesting/stateBuilders.js";
import { KNOWN_VIEWS, parseHash } from "../router.js";
import { CATEGORIES, SUB_CATEGORIES, TILE_TYPES } from "../features/tileCollection/data.js";

const INTERNAL_VISUAL_VIEWS = new Set(["boons", "charter"]);

function findChain(grid, key, length) {
  const rows = grid?.length ?? 0;
  const cols = grid?.[0]?.length ?? 0;
  const seen = new Set();
  const pathArr = [];

  function visit(row, col) {
    if (pathArr.length >= length) return true;
    const id = `${row}:${col}`;
    if (seen.has(id)) return false;
    const cell = grid[row]?.[col];
    if (cell?.key !== key || cell.frozen || cell.rubble) return false;
    seen.add(id);
    pathArr.push(cell);
    if (pathArr.length >= length) return true;
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (visit(nr, nc)) return true;
      }
    }
    pathArr.pop();
    seen.delete(id);
    return false;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      seen.clear();
      pathArr.length = 0;
      if (visit(row, col)) return true;
    }
  }
  return false;
}

describe("visual golden scenario matrix", () => {
  it("has unique, non-empty scenario ids", () => {
    const ids = VISUAL_SCENARIOS.map((scenario) => scenario.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses valid hash routes or explicit internal views", () => {
    for (const scenario of VISUAL_SCENARIOS) {
      if (scenario.hash) {
        const route = parseHash(scenario.hash);
        expect(KNOWN_VIEWS.has(route.view), scenario.id).toBe(true);
        if (scenario.hash.startsWith("#/tiles/")) {
          expect(SUB_CATEGORIES.includes(route.viewParams.sub), scenario.id).toBe(true);
          if (route.viewParams.cat) expect(CATEGORIES.includes(route.viewParams.cat), scenario.id).toBe(true);
        }
      } else {
        expect(INTERNAL_VISUAL_VIEWS.has(scenario.view), scenario.id).toBe(true);
      }
    }
  });

  it("builds deterministic valid state for every scenario", () => {
    for (const scenario of VISUAL_SCENARIOS) {
      const first = buildVisualState(scenario);
      const second = buildVisualState(scenario);
      expect(validateVisualState(first), scenario.id).toEqual([]);
      expect(first, scenario.id).toEqual(second);
    }
  });

  it("keeps holdChain fixtures reachable on their fixed grids", () => {
    for (const scenario of VISUAL_SCENARIOS) {
      const chainActions = (scenario.actions ?? []).filter((action) => action.type === "api" && action.method === "holdChain");
      if (!chainActions.length) continue;
      const state = buildVisualState(scenario);
      for (const action of chainActions) {
        expect(findChain(state.grid, action.args.key, action.args.length), scenario.id).toBe(true);
      }
    }
  });

  it("references known tile ids in tile-detail actions", () => {
    const tileNames = new Map(TILE_TYPES.map((tile) => [tile.displayName, tile.id]));
    for (const scenario of VISUAL_SCENARIOS) {
      for (const action of scenario.actions ?? []) {
        if (action.type !== "clickText") continue;
        if (!["Spiky Grass", "Clover"].includes(action.text)) continue;
        expect(tileNames.has(action.text), scenario.id).toBe(true);
      }
    }
  });

  it("keeps desktop smoke coverage pointed at real scenarios", () => {
    const ids = new Set(VISUAL_SCENARIOS.map((scenario) => scenario.id));
    expect(VISUAL_DESKTOP_SMOKE_SCENARIO_IDS.length).toBeGreaterThan(8);
    expect(new Set(VISUAL_DESKTOP_SMOKE_SCENARIO_IDS).size).toBe(VISUAL_DESKTOP_SMOKE_SCENARIO_IDS.length);
    for (const id of VISUAL_DESKTOP_SMOKE_SCENARIO_IDS) {
      expect(ids.has(id), id).toBe(true);
    }
  });
});

describe("visual golden snapshots integrity", () => {
  it("verifies all golden files correspond to active scenarios with no dead or missing files", () => {
    const HERE = path.dirname(fileURLToPath(import.meta.url));
    const GOLDENS_DIR = path.resolve(HERE, "..", "..", "tests", "visual", "__goldens__");

    const getExpected = (projectName, allScenarios, smokeIds) => {
      if (projectName === "desktop") {
        return new Set(smokeIds.map((id) => `${id}.png`));
      }
      return new Set(
        allScenarios
          .filter((s) => !s.skipProjects?.includes(projectName))
          .map((s) => `${s.id}.png`)
      );
    };

    const projects = ["desktop", "iphone-landscape", "iphone-portrait"];
    for (const project of projects) {
      const projDir = path.join(GOLDENS_DIR, project);
      if (!fs.existsSync(projDir)) {
        continue;
      }

      const files = fs.readdirSync(projDir).filter((f) => f.endsWith(".png"));
      const expected = getExpected(project, VISUAL_SCENARIOS, VISUAL_DESKTOP_SMOKE_SCENARIO_IDS);

      const missing = [];
      const extra = [];

      for (const f of expected) {
        if (!files.includes(f)) missing.push(f);
      }
      for (const f of files) {
        if (!expected.has(f)) extra.push(f);
      }

      expect(missing, `Missing snapshots for project ${project}`).toEqual([]);
      expect(extra, `Extraneous (dead) snapshots for project ${project}`).toEqual([]);
    }
  });
});
