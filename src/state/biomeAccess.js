import { ZONES } from "../features/zones/data.js";

/**
 * Single gate for entering farm / mine / fish puzzle boards.
 */
export function canEnterBiome(state, biomeKey) {
  if (!biomeKey || biomeKey === "farm") return { ok: true };
  const level = state?.level ?? 1;
  const zoneId = state?.activeZone ?? state?.mapCurrent ?? "home";
  const zone = ZONES[zoneId] ?? null;

  if (biomeKey === "mine") {
    if (level < 2) {
      return { ok: false, reason: "Mine unlocks at Level 2." };
    }
    const storyMine =
      !!(state?.story?.flags?.mine_unlocked ||
      state?.flags?.mine_unlocked ||
      state?.unlockedBiomes?.mine);
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
export function isBiomeLocked(state, biomeKey) {
  return !canEnterBiome(state, biomeKey).ok;
}
