import { ZONES, zoneHasBoard } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";

/**
 * Single gate for entering farm / mine / fish puzzle boards.
 */
export function canEnterBiome(state: GameState | null | undefined, biomeKey: string | null | undefined): { ok: boolean; reason?: string } {
  if (!biomeKey || biomeKey === "farm") return { ok: true };
  // Progression spine: access to a biome board is gated by having founded a
  // settlement of that kind (its zone supplies the board), NOT by player level.
  const zoneId = state?.activeZone ?? state?.mapCurrent ?? "home";
  const zone = ZONES[zoneId] ?? null;

  if (biomeKey === "mine") {
    if (zone && !zoneHasBoard(zone, "mine")) {
      return { ok: false, reason: "Travel to a mining settlement before opening the mine board." };
    }
    return { ok: true };
  }

  if (biomeKey === "fish") {
    if (zone && !zoneHasBoard(zone, "fish")) {
      return { ok: false, reason: "Travel to a harbor before opening the fishing board." };
    }
    return { ok: true };
  }

  return { ok: true };
}

/** Whether a biome board card or entry modal should show as locked. */
export function isBiomeLocked(state: GameState | null | undefined, biomeKey: string | null | undefined): boolean {
  return !canEnterBiome(state, biomeKey).ok;
}
