import { ZONE_CATEGORIES, ZONE_UPGRADE_TARGET_GOLD, zoneFarmBoard, zoneHasBoard, type Zone } from "./data.js";

export const ZONE_CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  grass: "Grass",
  grain: "Grain",
  trees: "Trees",
  birds: "Birds",
  vegetables: "Vegetables",
  fruits: "Fruits",
  flowers: "Flowers",
  herd_animals: "Herd Animals",
  cattle: "Cattle",
  mounts: "Mounts",
});

export const SESSION_SEASON_NAMES = Object.freeze(["Spring", "Summer", "Autumn", "Winter"] as const);

export type SessionSeasonName = (typeof SESSION_SEASON_NAMES)[number];

/** Format a seasonDrops weight (0–1 fraction) for display. */
export function formatDropWeight(weight: number | undefined | null): string {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return "—";
  return `${Math.round(w * 100)}%`;
}

/** Categories that appear in season drops or the upgrade map for this zone's farm board. */
export function zoneInfoCategories(zone: Zone | null | undefined): string[] {
  if (!zone) return [];
  const farm = zoneFarmBoard(zone);
  if (!farm) return [];
  const cats = new Set<string>();
  for (const season of SESSION_SEASON_NAMES) {
    const table = farm.seasonDrops?.[season] ?? {};
    for (const [cat, w] of Object.entries(table)) {
      if ((w ?? 0) > 0) cats.add(cat);
    }
  }
  for (const src of Object.keys(farm.upgradeMap ?? {})) cats.add(src);
  return ZONE_CATEGORIES.filter((c) => cats.has(c));
}

export function upgradeTargetLabel(target: string | undefined): string {
  if (!target) return "—";
  if (target === ZONE_UPGRADE_TARGET_GOLD) return "Gold tile (board)";
  return ZONE_CATEGORY_LABELS[target] ?? target;
}

export function boardKindLabels(zone: Zone | null | undefined): string[] {
  if (!zone) return [];
  const out: string[] = [];
  if (zoneHasBoard(zone, "farm")) out.push("Farm");
  if (zoneHasBoard(zone, "mine")) out.push("Mine");
  if (zoneHasBoard(zone, "fish")) out.push("Harbor");
  return out;
}
