import { ZONES } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";

/**
 * Single gate for entering farm / mine / fish puzzle boards.
 */
export function canEnterBiome(state: GameState | null | undefined, biomeKey: string | null | undefined): { ok: boolean; reason?: string } {
  if (!biomeKey || biomeKey === "farm") return { ok: true };
  const level = state?.level ?? 1;
  const stateRec = (state ?? {}) as Record<string, unknown>;
  const story = (stateRec.story ?? {}) as { flags?: Record<string, unknown> };
  const flags = (stateRec.flags ?? {}) as Record<string, unknown>;
  const unlockedBiomes = (stateRec.unlockedBiomes ?? {}) as Record<string, unknown>;
  const zoneIdRaw = stateRec.activeZone ?? stateRec.mapCurrent ?? "home";
  const zoneId = typeof zoneIdRaw === "string" ? zoneIdRaw : "home";
  const zone = (ZONES as Record<string, { hasMine?: boolean; hasWater?: boolean } | undefined>)[zoneId] ?? null;

  if (biomeKey === "mine") {
    if (level < 2) {
      return { ok: false, reason: "Mine unlocks at Level 2." };
    }
    const storyMine =
      !!(story.flags?.mine_unlocked ||
      flags.mine_unlocked ||
      unlockedBiomes.mine);
    if (level < 2 && !storyMine) {
      return { ok: false, reason: "Mine unlocks at Level 2." };
    }
    if (zone && !zone.hasMine) {
      return { ok: false, reason: "Travel to a mining settlement before opening the mine board." };
    }
    return { ok: true };
  }

  if (biomeKey === "fish") {
    if (level < 3) {
      return { ok: false, reason: "Harbor fishing unlocks at Level 3." };
    }
    if (zone && !zone.hasWater) {
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
