/**
 * Tool power runtime — reducer-side handlers for ITEMS[key].power dispatch.
 */
import { getItem } from "../constants.js";
import { clearTilesOfKey } from "../features/farm/tools.js";
import { isTapTargetPower } from "../config/toolPowers.js";
import { selectTilesForPower, type TileSelectorCell } from "../config/tileSelectors.js";
import { tilesInCategory } from "../utils.js";
import {
  sweepAtCoords,
  applyTransformAll,
  applyTransformAdjacent,
  applyRevealTiles,
} from "./boardMutations.js";
import { normalizeHazardId } from "../config/hazardIds.js";
import { inventoryZone, zoneInventory } from "./zoneInventory.js";
import type { GameState } from "../types/state.js";

/**
 * Power descriptor as stored on ITEMS[key].power or armed on state.toolPendingPower.
 * The `id` discriminates the runtime branch; `params` carries id-specific args.
 */
export interface ToolPower {
  id: string;
  params?: Record<string, unknown>;
  bubble?: string;
  [extra: string]: unknown;
}

/** Per-hazard handler result patch. */
interface HazardClearPatch {
  grid?: GameState["grid"];
  hazards: GameState["hazards"];
}

function _spendToolCharge(state: GameState, key: string | null | undefined): GameState | null {
  if (!key) return state;
  const tools = state.tools ?? ({} as GameState["tools"]);
  const cur = tools[key];
  const curNum = typeof cur === "number" ? cur : 0;
  if (curNum <= 0) return null;
  return { ...state, tools: { ...tools, [key]: curNum - 1 } };
}

function _creditCollected(inventory: Record<string, number>, collected: Record<string, number>): Record<string, number> {
  const inv: Record<string, number> = { ...inventory };
  for (const [tileKey, count] of Object.entries(collected)) {
    inv[tileKey] = (inv[tileKey] ?? 0) + count;
  }
  return inv;
}

/** Rat coordinate stored inside `state.hazards.rats`. */
interface RatCoord { row: number; col: number; [k: string]: unknown }

/** Per-hazard handler — returns a partial state patch, or null when nothing to clear. */
type HazardClearHandler = (state: GameState) => HazardClearPatch | null;

const HAZARD_CLEAR_HANDLERS: Record<string, HazardClearHandler> = {
  rats(state) {
    const hazards = state.hazards ?? ({} as GameState["hazards"]);
    const ratsRaw = (hazards.rats as RatCoord[] | undefined) ?? [];
    if (ratsRaw.length === 0) return null;
    let grid = state.grid;
    if (grid) {
      const ratSet = new Set(ratsRaw.map((r) => `${r.row},${r.col}`));
      grid = grid.map((row, ri) =>
        row.map((t, ci) =>
          ratSet.has(`${ri},${ci}`)
            ? { ...t, key: null as unknown as string, _emptied: true }
            : t,
        ),
      );
    }
    return { grid, hazards: { ...hazards, rats: [] } };
  },
  wolves(state) {
    if (!state.hazards?.wolves) return null;
    return { hazards: { ...state.hazards, wolves: null } };
  },
  mole(state) {
    if (!state.hazards?.mole) return null;
    return { hazards: { ...state.hazards, mole: null } };
  },
  caveIn(state) {
    if (!state.hazards?.caveIn) return null;
    return { hazards: { ...state.hazards, caveIn: null } };
  },
  lava(state) {
    if (!state.hazards?.lava) return null;
    return { hazards: { ...state.hazards, lava: null } };
  },
  fire(state) {
    if (!state.hazards?.fire) return null;
    return { hazards: { ...state.hazards, fire: null } };
  },
  gasVent(state) {
    if (!state.hazards?.gasVent) return null;
    return { hazards: { ...state.hazards, gasVent: null } };
  },
};

function _clearHazardTarget(state: GameState, target: string | null | undefined): { grid: GameState["grid"]; hazards: GameState["hazards"]; didClear: boolean } {
  const runtimeKey = normalizeHazardId(target);
  const handler = runtimeKey ? HAZARD_CLEAR_HANDLERS[runtimeKey] : null;
  if (!handler) return { grid: state.grid, hazards: state.hazards ?? ({} as GameState["hazards"]), didClear: false };
  const patch = handler(state);
  if (!patch) return { grid: state.grid, hazards: state.hazards ?? ({} as GameState["hazards"]), didClear: false };
  return { grid: patch.grid ?? state.grid, hazards: patch.hazards, didClear: true };
}

/** Lava cell coordinate stored on `state.hazards.lava.cells`. */
interface LavaCellCoord { row: number; col: number; [k: string]: unknown }

function _applyWaterPump(state: GameState): GameState {
  const lava = state.hazards?.lava as { cells?: LavaCellCoord[] } | null | undefined;
  const lavaCells = lava?.cells ?? [];
  let grid = state.grid;
  if (lavaCells.length > 0 && grid) {
    const lavaSet = new Set(lavaCells.map((c) => `${c.row},${c.col}`));
    grid = grid.map((row, ri) =>
      row.map((t, ci) =>
        lavaSet.has(`${ri},${ci}`)
          ? { ...t, key: "tile_mine_stone", rubble: true, lava: false }
          : t,
      ),
    );
  }
  return {
    ...state,
    grid,
    hazards: { ...state.hazards, lava: null },
  };
}

function _applyExplosives(state: GameState): GameState {
  return {
    ...state,
    hazards: { ...state.hazards, mole: null, caveIn: null },
  };
}

/** A single wolf in the wolves hazard list. */
interface WolfEntry { scared?: boolean; [k: string]: unknown }

function _applyScatterHazard(state: GameState, params: Record<string, unknown>): GameState {
  const target = (params.target ?? params.hazard) as string | undefined;
  if (target !== "wolves") return state;
  const wolvesState = state.hazards?.wolves as { list?: WolfEntry[]; [k: string]: unknown } | null | undefined;
  if (!wolvesState) return state;
  const turns = (params.turns as number | undefined) ?? (params.scaredTurns as number | undefined) ?? 5;
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

function _applyFillBias(state: GameState, key: string | null | undefined, params: Record<string, unknown>): GameState {
  const spent = _spendToolCharge(state, key);
  if (spent === null) return state;
  const turns = (params.turns as number | undefined) ?? 1;
  const target = (params.target as { key?: string; [k: string]: unknown } | null | undefined) ?? null;
  if (key === "magic_fertilizer") {
    return { ...spent, magicFertilizerCharges: turns, fillBiasTarget: target };
  }
  return { ...spent, fillBiasTarget: target };
}

function _sweepSelected(state: GameState, cells: TileSelectorCell[]): GameState {
  if (!cells.length) return state;
  const { grid, collected } = sweepAtCoords(state.grid, cells);
  const total = Object.values(collected).reduce((s, n) => s + n, 0);
  if (total === 0) return state;
  const zone = inventoryZone(state);
  return {
    ...state,
    grid,
    inventory: { ...state.inventory, [zone]: _creditCollected(zoneInventory(state, zone), collected) },
  };
}

function _bubble(state: GameState, text: string, ms = 1500): GameState {
  return {
    ...state,
    bubble: { id: Date.now(), npc: "bram", text, ms },
  };
}

export function applyToolPower(state: GameState, key: string | null | undefined, power: ToolPower): GameState {
  const id = power.id;
  const params = power.params ?? {};

  if (isTapTargetPower(id)) {
    const tools = state.tools;
    const cur = key ? tools?.[key] : undefined;
    if (key && typeof cur === "number" && cur <= 0) return state;
    const itemPower = key ? getItem(key)?.power : undefined;
    const bubbleText = (power.bubble ?? itemPower?.bubble) as string | null | undefined ?? null;
    let next: GameState = {
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
      const targetKey = (params.target as string | undefined) ?? (key ? getItem(key)?.target : undefined);
      if (!targetKey) return spent;
      const { state: cleared, collected } = clearTilesOfKey(spent, targetKey);
      if (collected === 0) {
        const targetItem = getItem(targetKey);
        const label =
          targetKey === "*"
            ? "matching tiles"
            : (targetItem?.label?.toLowerCase() ?? targetKey);
        const curCharges = key && typeof cleared.tools?.[key] === "number" ? (cleared.tools[key] as number) : 0;
        return {
          ...cleared,
          tools: key ? { ...cleared.tools, [key]: curCharges + 1 } : cleared.tools,
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
      const cells = selectTilesForPower(id, spent.grid, params, undefined);
      if (cells.length === 0) return spent;
      return { ..._sweepSelected(spent, cells), tools: spent.tools };
    }
    case "clear_random_n": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next: GameState = { ...spent, toolPending: key ?? "clear" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "transform_random_n": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next: GameState = { ...spent, toolPending: key ?? "basic" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "reshuffle_board": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      let next: GameState = { ...spent, toolPending: key ?? "shuffle" };
      if (power.bubble) next = _bubble(next, power.bubble);
      return next;
    }
    case "fill_bias":
      return _applyFillBias(state, key, params);
    case "transform_tiles": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const fromCategory = tilesInCategory(params.from as string | string[]);
      const fromKeys = fromCategory.length > 0
        ? fromCategory
        : (typeof params.from === "string" ? [params.from] : []);
      const toKey = params.to as string | undefined;
      if (fromKeys.length === 0 || !toKey) return spent;
      const { grid } = applyTransformAll(spent.grid, fromKeys, toKey);
      return { ...spent, grid };
    }
    case "undo_move": {
      const snap = state.lastChainSnapshot as {
        grid?: GameState["grid"];
        inventory?: GameState["inventory"];
        turnsUsed?: number;
        farmRun?: GameState["farmRun"];
        [k: string]: unknown;
      } | null;
      if (!snap) return state;
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const snapZone = (snap.zoneId as string | undefined) ?? inventoryZone(state);
      const snapInv = (snap.inventory as Record<string, number> | undefined) ?? zoneInventory(spent, snapZone);
      return {
        ...spent,
        grid: snap.grid ?? spent.grid,
        inventory: { ...spent.inventory, [snapZone]: snapInv },
        turnsUsed: snap.turnsUsed ?? spent.turnsUsed,
        farmRun: snap.farmRun ?? spent.farmRun,
        lastChainSnapshot: null,
      };
    }
    case "restore_turns": {
      if (!state.farmRun) return state;
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const amount = (params.amount as number | undefined) ?? 5;
      const farmRun = spent.farmRun ?? state.farmRun;
      const turnBudget = (farmRun.turnBudget as number | undefined) ?? 0;
      return {
        ...spent,
        farmRun: {
          ...farmRun,
          turnBudget: turnBudget + amount,
          turnsRemaining: (farmRun.turnsRemaining ?? 0) + amount,
        },
      };
    }
    case "reveal_tiles": {
      const spent = _spendToolCharge(state, key);
      if (spent === null) return state;
      const tileKeys = tilesInCategory(params.target as string | string[]);
      if (tileKeys.length === 0) return spent;
      const { grid } = applyRevealTiles(spent.grid, tileKeys);
      return { ...spent, grid };
    }
    case "clear_hazard": {
      const target = (params.target as string | undefined) ?? (params.hazard as string | undefined);
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

export function applyTapTargetPower(state: GameState, key: string | null | undefined, power: ToolPower, row: number | null | undefined, col: number | null | undefined): GameState {
  const id = power.id;
  const params = power.params ?? {};
  const spent = _spendToolCharge(state, key);
  const base = spent ?? state;
  let next: GameState = { ...base, toolPending: null, toolPendingPower: null };
  if (typeof row !== "number" || typeof col !== "number") return next;

  const tap = { row, col };
  const ctx = { biomeKey: state.biomeKey ?? "farm" };

  if (id === "transform_adjacent") {
    const radius = (params.radius as number | undefined) ?? 1;
    const fromCategory = tilesInCategory(params.from as string | string[]);
    const fromKeys = fromCategory.length > 0
      ? fromCategory
      : (typeof params.from === "string" ? [params.from] : []);
    const toKey = params.to as string | undefined;
    if (fromKeys.length === 0 || !toKey) return next;
    const { grid } = applyTransformAdjacent(next.grid, row, col, radius, fromKeys, toKey);
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

export function mergePowerConfig(itemPower: ToolPower | null | undefined): ToolPower | null {
  if (!itemPower?.id) return null;
  return { ...itemPower };
}
