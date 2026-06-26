/**
 * Puzzle-board tool visibility — only tools usable on the active biome, and
 * hazard counters only when that hazard can spawn on this board/zone.
 */
import { getItem } from "../constants.js";
import { normalizeHazardId } from "../config/hazardIds.js";
import { isFireHazardEnabled, RATS_HAZARD_ENABLED } from "../featureFlags.js";
import { settlementHazards } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";
import { TOOL_CATALOG, TOOL_BY_KEY, type ToolBoardKind, type ToolEntry } from "./toolRegistry.js";
import { isToolReachable } from "../game/reachability.js";

/** Spawn-roll ids used by farm/mine hazard systems (after normalization). */
const IMPLEMENTED_SPAWN_IDS = new Set([
  "fire",
  "wolves",
  "rats",
  "cave_in",
  "gas_vent",
  "lava",
  "mole",
]);

/**
 * Settlement / zone hazard labels → runtime spawn ids.
 * Unmapped flavor hazards (locusts, ash_cloud, …) contribute nothing.
 */
const SETTLEMENT_HAZARD_TO_SPAWN: Record<string, string[]> = {
  fire: ["fire"],
  wolf: ["wolves"],
  wolves: ["wolves"],
  rats: ["rats"],
  cave_in: ["cave_in"],
  gas_vent: ["gas_vent"],
  gas_pocket: ["gas_vent"],
  lava: ["lava"],
  mole: ["mole"],
};

export function getPuzzleBoardKind(state: GameState): ToolBoardKind {
  const biome = state.biome ?? state.biomeKey ?? "farm";
  if (biome === "mine" || biome === "fish" || biome === "farm") return biome;
  return "farm";
}

/** Hazard runtime ids that can spawn on the current puzzle board. */
export function getSpawnableHazardIds(state: GameState): Set<string> {
  const boardKind = getPuzzleBoardKind(state);
  const zoneId =
    (state.activeZone as string | undefined) ??
    (state.mapCurrent as string | undefined) ??
    "home";
  const allowed = settlementHazards(state, zoneId);
  const spawnable = new Set<string>();

  for (const raw of allowed) {
    const mapped = SETTLEMENT_HAZARD_TO_SPAWN[raw] ?? [];
    for (const id of mapped) {
      if (IMPLEMENTED_SPAWN_IDS.has(id)) spawnable.add(id);
    }
  }

  if (boardKind === "farm" && RATS_HAZARD_ENABLED) {
    // Rats roll independently of settlement hazard picks (see rollRatSpawn).
    spawnable.add("rats");
  }

  if (!isFireHazardEnabled()) {
    spawnable.delete("fire");
  }

  return spawnable;
}

/** Hazard ids a tool counters, or null when not hazard-specific. */
export function toolCounterHazardTargets(toolKey: string): string[] | null {
  const power = getItem(toolKey)?.power;
  if (!power?.id) return null;

  switch (power.id) {
    case "clear_hazard":
    case "scatter_hazard": {
      const raw = (power.params?.target ?? power.params?.hazard) as string | undefined;
      const target = normalizeHazardId(raw);
      return target ? [target] : null;
    }
    case "water_pump":
      return ["lava"];
    case "explosives":
      return ["cave_in", "mole"];
    default:
      return null;
  }
}

export function isToolVisibleOnPuzzleBoard(state: GameState, toolKey: string): boolean {
  const entry = TOOL_BY_KEY[toolKey];
  if (!entry) return false;

  const boardKind = getPuzzleBoardKind(state);
  if (entry.boardKind !== "all" && entry.boardKind !== boardKind) return false;

  const hazardTargets = toolCounterHazardTargets(toolKey);
  if (!hazardTargets) return true;

  const spawnable = getSpawnableHazardIds(state);
  return hazardTargets.some((t) => spawnable.has(t));
}

/** Tools shown on the puzzle board — filtered by reachability, active biome, and spawnable hazards. */
export function visiblePuzzleTools(state: GameState): ToolEntry[] {
  const toolsState = (state.tools ?? {}) as Record<string, number>;
  return TOOL_CATALOG.filter(
    (t) =>
      (isToolReachable(t.key) || (toolsState[t.key] || 0) > 0) &&
      isToolVisibleOnPuzzleBoard(state, t.key),
  ).map((t) => ({
    ...t,
    count: toolsState[t.key] || 0,
  }));
}
