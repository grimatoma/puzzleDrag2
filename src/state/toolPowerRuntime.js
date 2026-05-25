// @ts-check
/**
 * Tool power runtime — reducer-side handlers for ITEMS[key].power dispatch.
 */
import { ITEMS } from "../constants.js";
import { clearTilesOfKey } from "../features/farm/tools.js";
import { isTapTargetPower } from "../config/toolPowers.js";
import { selectTilesForPower } from "../config/tileSelectors.js";
import { tilesInCategory } from "../utils.js";
import {
  sweepAtCoords,
  applyTransformAll,
  applyTransformAdjacent,
  applyRevealTiles,
} from "./boardMutations.js";

function _spendToolCharge(state, key) {
  if (!key) return state;
  if ((state.tools?.[key] ?? 0) <= 0) return null;
  return { ...state, tools: { ...state.tools, [key]: state.tools[key] - 1 } };
}

function _creditCollected(inventory, collected) {
  let inv = { ...inventory };
  for (const [tileKey, count] of Object.entries(collected)) {
    inv[tileKey] = (inv[tileKey] ?? 0) + count;
  }
  return inv;
}

function _clearHazardTarget(state, target) {
  const hazards = state.hazards ?? {};
  let nextHazards = hazards;
  let grid = state.grid;
  let didClear = false;
  if (target === "rats") {
    const rats = hazards.rats ?? [];
    if (rats.length > 0) {
      const ratSet = new Set(rats.map((r) => `${r.row},${r.col}`));
      if (grid) {
        grid = grid.map((row, ri) =>
          row.map((t, ci) =>
            ratSet.has(`${ri},${ci}`) ? { ...t, key: null, _emptied: true } : t,
          ),
        );
      }
      nextHazards = { ...hazards, rats: [] };
      didClear = true;
    }
  } else if (target === "wolves") {
    if (hazards.wolves) { nextHazards = { ...hazards, wolves: null }; didClear = true; }
  } else if (target === "mole") {
    if (hazards.mole) { nextHazards = { ...hazards, mole: null }; didClear = true; }
  } else if (target === "caveIn") {
    if (hazards.caveIn) { nextHazards = { ...hazards, caveIn: null }; didClear = true; }
  } else if (target === "lava") {
    if (hazards.lava) { nextHazards = { ...hazards, lava: null }; didClear = true; }
  } else if (target === "fire") {
    if (hazards.fire) { nextHazards = { ...hazards, fire: null }; didClear = true; }
  } else if (target === "gasVent" || target === "gas") {
    if (hazards.gasVent) { nextHazards = { ...hazards, gasVent: null }; didClear = true; }
  }
  return { grid, hazards: nextHazards, didClear };
}

function _applyWaterPump(state) {
  const lavaCells = state.hazards?.lava?.cells ?? [];
  let grid = state.grid;
  if (lavaCells.length > 0 && grid) {
    const lavaSet = new Set(lavaCells.map((c) => `${c.row},${c.col}`));
    grid = grid.map((row, ri) =>
      row.map((t, ci) =>
        lavaSet.has(`${ri},${ci}`) ? { ...t, key: "tile_mine_stone", rubble: true, lava: false } : t,
      ),
    );
  }
  return {
    ...state,
    grid,
    hazards: { ...state.hazards, lava: null },
  };
}

function _applyExplosives(state) {
  return {
    ...state,
    hazards: { ...state.hazards, mole: null, caveIn: null },
  };
}

function _applyScatterHazard(state, params) {
  const target = params.target ?? params.hazard;
  if (target !== "wolves") return state;
  const wolvesState = state.hazards?.wolves;
  if (!wolvesState) return state;
  const turns = params.turns ?? params.scaredTurns ?? 5;
  return {
    ...state,
    hazards: {
      ...state.hazards,
      wolves: {
        ...wolvesState,
        list: (wolvesState.list ?? []).map((w) => ({ ...w, scared: true })),
        scaredTurnsRemaining: turns,
      },
    },
  };
}

function _applyFillBias(state, key, params) {
  const spent = _spendToolCharge(state, key);
  if (spent === null) return state;
  const turns = params.turns ?? 1;
  if (key === "magic_fertilizer") {
    return { ...spent, magicFertilizerCharges: turns, fertilizerActive: true };
  }
  return { ...spent, fertilizerActive: true, fillBiasTarget: params.target ?? null };
}

function _applyArmFillBias(state, key, params) {
  const spent = _spendToolCharge(state, key);
  if (spent === null) return state;
  const turns = params.turns ?? 1;
  if (key === "magic_fertilizer") {
    return { ...spent, magicFertilizerCharges: turns, fertilizerActive: true };
  }
  return { ...spent, fertilizerActive: true, fillBiasTarget: params.target ?? null };
}

function _sweepSelected(state, cells) {
  if (!cells.length) return state;
  const { grid, collected } = sweepAtCoords(state.grid, cells);
  const total = Object.values(collected).reduce((s, n) => s + n, 0);
  if (total === 0) return state;
  return {
    ...state,
    grid,
    inventory: _creditCollected(state.inventory ?? {}, collected),
  };
}

function _bubble(state, text, ms = 1500) {
  return {
    ...state,
    bubble: { id: Date.now(), npc: "bram", text, ms },
  };
}

export function applyToolPower(state, key, power) {
  const id = power.id;
  const params = power.params ?? {};

  if (isTapTargetPower(id)) {
    if (key && (state.tools?.[key] ?? 0) <= 0) return state;
    const bubbleText = power.bubble ?? ITEMS[key]?.power?.bubble ?? null;
    let next = {
      ...state,
      toolPending: key ?? null,
      toolPendingPower: { ...power },
    };
    if (bubbleText) next = _bubble(next, bubbleText);
    return next;
  }

  switch (id) {
    case "clear_all": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const targetKey = params.target ?? ITEMS[key]?.target;
      if (!targetKey) return spent;
      const { state: cleared, collected } = clearTilesOfKey(spent, targetKey);
      if (collected === 0) {
        const label =
          targetKey === "*"
            ? "matching tiles"
            : (ITEMS[targetKey]?.label?.toLowerCase() ?? targetKey);
        return {
          ...cleared,
          tools: { ...cleared.tools, [key]: (cleared.tools[key] ?? 0) + 1 },
          bubble: {
            id: Date.now(),
            npc: "bram",
            text: `No ${label} on the board.`,
            ms: 1200,
          },
        };
      }
      return { ...cleared, tools: spent.tools };
    }
    case "clear_category": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const cells = selectTilesForPower(id, spent.grid, params);
      if (cells.length === 0) return spent;
      return { ..._sweepSelected(spent, cells), tools: spent.tools };
    }
    case "clear_random_n": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next = { ...spent, toolPending: key ?? "clear" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "transform_random_n": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next = { ...spent, toolPending: key ?? "basic" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "reshuffle_board": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next = { ...spent, toolPending: key ?? "shuffle" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "arm_fill_bias":
      return _applyArmFillBias(state, key, params);
    case "fill_bias":
      return _applyFillBias(state, key, params);
    case "transform_tiles": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const fromCategory = tilesInCategory(params.from);
      const fromKeys = fromCategory.length > 0
        ? fromCategory
        : (typeof params.from === "string" ? [params.from] : []);
      if (fromKeys.length === 0 || !params.to) return spent;
      const { grid } = applyTransformAll(spent.grid, fromKeys, params.to);
      return { ...spent, grid };
    }
    case "undo_move": {
      const snap = state.lastChainSnapshot;
      if (!snap) return state;
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      return {
        ...spent,
        grid: snap.grid ?? spent.grid,
        inventory: snap.inventory ?? spent.inventory,
        turnsUsed: snap.turnsUsed ?? spent.turnsUsed,
        farmRun: snap.farmRun ?? spent.farmRun,
        lastChainSnapshot: null,
      };
    }
    case "restore_turns": {
      if (!state.farmRun) return state;
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const amount = params.amount ?? 5;
      return {
        ...spent,
        farmRun: {
          ...spent.farmRun,
          turnBudget: (spent.farmRun.turnBudget ?? 0) + amount,
          turnsRemaining: (spent.farmRun.turnsRemaining ?? 0) + amount,
        },
      };
    }
    case "reveal_tiles": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const tileKeys = tilesInCategory(params.target);
      if (tileKeys.length === 0) return spent;
      const { grid } = applyRevealTiles(spent.grid, tileKeys);
      return { ...spent, grid };
    }
    case "clear_hazard": {
      const target = params.target ?? params.hazard;
      if (!target) return state;
      const { grid, hazards, didClear } = _clearHazardTarget(state, target);
      if (!didClear) {
        if (target === "rats") {
          return _bubble(state, "No rats to chase.", 1200);
        }
        return state;
      }
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      return { ...spent, grid, hazards };
    }
    case "scatter_hazard": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      return _applyScatterHazard(spent, params);
    }
    case "water_pump": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      return _applyWaterPump(spent);
    }
    case "explosives": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      return _applyExplosives(spent);
    }
    default:
      return state;
  }
}

export function applyTapTargetPower(state, key, power, row, col) {
  const id = power.id;
  const params = power.params ?? {};
  const spent = _spendToolCharge(state, key);
  const base = spent ?? state;
  let next = { ...base, toolPending: null, toolPendingPower: null };
  if (typeof row !== "number" || typeof col !== "number") return next;

  const tap = { row, col };
  const ctx = { biomeKey: state.biomeKey ?? "farm" };

  if (id === "transform_adjacent") {
    const radius = params.radius ?? 1;
    const fromCategory = tilesInCategory(params.from);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    if (fromKeys.length === 0 || !params.to) return next;
    const { grid } = applyTransformAdjacent(next.grid, row, col, radius, fromKeys, params.to);
    return { ...next, grid };
  }

  if (id === "tap_clear_type" || id === "clear_row" || id === "clear_column" || id === "clear_cross" || id === "clear_component" || id === "area_blast") {
    const cells = selectTilesForPower(id, next.grid, params, tap, ctx);
    if (!cells.length) return next;
    const swept = _sweepSelected(next, cells);
    return { ...swept, tools: base.tools ?? next.tools };
  }

  return next;
}

export function mergePowerConfig(itemPower) {
  if (!itemPower?.id) return null;
  return { ...itemPower };
}
