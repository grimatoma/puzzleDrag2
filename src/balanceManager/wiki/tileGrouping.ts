/**
 * tileGrouping.ts — pure helper that buckets a flat list of wiki tile entries
 * into ordered sub-category → category groups for display on the Tiles wiki
 * page.
 *
 * Reuses the tile-collection grouping data (`src/features/tileCollection/data.ts`)
 * so the wiki organisation stays in sync with the collection screen:
 *   - SUB_CATEGORIES order drives the band order (Farm → Mining → Water → …).
 *   - categoriesForSubCategory() drives category order within a band.
 *   - TILE_TYPES_MAP / CATEGORY_OF resolve each entry's category.
 *
 * Anything that doesn't resolve to a known sub-category falls into the
 * "uncategorized" band so nothing silently disappears from the wiki.
 */

import {
  SUB_CATEGORIES,
  SUB_CATEGORY_LABELS,
  SUB_CATEGORY_ICONS,
  CATEGORY_TO_SUBCATEGORY,
  categoriesForSubCategory,
  TILE_TYPES_MAP,
  CATEGORY_OF,
} from "../../features/tileCollection/data.js";
import type { WikiEntry } from "./EntryGrid.jsx";

export interface TileCategoryGroup {
  /** Category key (e.g. "vegetables", "mine_iron_ore") or "uncategorized". */
  category: string;
  /** Humanized display label (e.g. "Vegetables", "Iron Ore"). */
  label: string;
  entries: WikiEntry[];
}

export interface TileSubCategoryGroup {
  /** Sub-category key (e.g. "farm", "mining", "water", "uncategorized"). */
  sub: string;
  label: string;
  icon: string;
  categories: TileCategoryGroup[];
}

/** Catch-all category key for entries that resolve to no known category. */
const UNCATEGORIZED_CATEGORY = "uncategorized";

/**
 * Humanize a category key for display:
 *   "herd_animals"   → "Herd Animals"
 *   "mine_iron_ore"  → "Iron Ore"  (the "mine_" prefix is stripped — the
 *                                   Mining band already supplies that context)
 *   "uncategorized"  → "Uncategorized"
 */
function humanizeCategory(category: string): string {
  const stripped = category.startsWith("mine_") ? category.slice("mine_".length) : category;
  return stripped
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve a wiki entry's tile category, or null if it isn't in the catalog. */
function categoryForEntry(entry: WikiEntry): string | null {
  return TILE_TYPES_MAP[entry.key]?.category ?? CATEGORY_OF[entry.key] ?? null;
}

/**
 * Bucket a flat (already name-sorted) list of wiki tile entries into ordered
 * sub-category bands, each holding ordered category groups.
 *
 * Empty categories and empty/hazard sub-categories are skipped. Entry order is
 * preserved within each category. Entries whose category is unknown (or maps to
 * no sub-category) land under the "uncategorized" band.
 */
export function groupTileEntries(entries: WikiEntry[]): TileSubCategoryGroup[] {
  // Bucket entries by category key (preserving input order within each).
  const byCategory = new Map<string, WikiEntry[]>();
  for (const entry of entries) {
    const category = categoryForEntry(entry) ?? UNCATEGORIZED_CATEGORY;
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(entry);
    else byCategory.set(category, [entry]);
  }

  // Which sub-category does each category belong to? Known categories use the
  // explicit map; anything else (including the synthetic UNCATEGORIZED_CATEGORY
  // and any future unmapped category) falls under "uncategorized".
  const catToSub = CATEGORY_TO_SUBCATEGORY as Record<string, string | undefined>;

  const result: TileSubCategoryGroup[] = [];

  for (const sub of SUB_CATEGORIES) {
    // "hazards" carries no tile categories — skip it entirely.
    if (sub === "hazards") continue;

    const categoryGroups: TileCategoryGroup[] = [];

    if (sub === UNCATEGORIZED_CATEGORY) {
      // Known-but-unmapped categories (from categoriesForSubCategory), then any
      // bucketed category that resolves to no sub-category at all — including
      // the synthetic UNCATEGORIZED_CATEGORY catch-all. De-dupe via a Set.
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const c of categoriesForSubCategory(sub)) {
        if (!seen.has(c)) { seen.add(c); ordered.push(c); }
      }
      for (const c of byCategory.keys()) {
        const mapped = c === UNCATEGORIZED_CATEGORY ? undefined : catToSub[c];
        if (!mapped && !seen.has(c)) { seen.add(c); ordered.push(c); }
      }
      for (const category of ordered) {
        const catEntries = byCategory.get(category);
        if (!catEntries || catEntries.length === 0) continue;
        categoryGroups.push({
          category,
          label: humanizeCategory(category),
          entries: catEntries,
        });
      }
    } else {
      for (const category of categoriesForSubCategory(sub)) {
        const catEntries = byCategory.get(category);
        if (!catEntries || catEntries.length === 0) continue;
        categoryGroups.push({
          category,
          label: humanizeCategory(category),
          entries: catEntries,
        });
      }
    }

    if (categoryGroups.length === 0) continue;

    result.push({
      sub,
      label: SUB_CATEGORY_LABELS[sub as keyof typeof SUB_CATEGORY_LABELS] ?? humanizeCategory(sub),
      icon: SUB_CATEGORY_ICONS[sub as keyof typeof SUB_CATEGORY_ICONS] ?? "",
      categories: categoryGroups,
    });
  }

  return result;
}
