import {
  UPGRADE_THRESHOLDS,
  RESOURCE_CAP_BASE,
  RESOURCE_CAP_GRANARY,
  getItem,
  ITEMS,
  tileFamily,
} from "./constants.js";
import { locBuilt } from "./locBuilt.js";
import { computeAggregatedAbilities } from "./features/workers/aggregate.js";
import type { GameState } from "./types/state.js";

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/**
 * WCAG relative luminance for a 24-bit hex colour (e.g. 0xa8c769 or 0x00RRGGBB).
 * Only the lowest 24 bits (RGB) are used; any alpha byte is ignored.
 */
function relativeLuminance(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8)  & 0xff) / 255;
  const b = ( hex        & 0xff) / 255;
  const lin = (c: number): number => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio between two numeric hex colours.
 * Returns a value ≥ 1; 7 = maximum (black on white).
 */
export function contrastRatio(hexA: number, hexB: number): number {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ChainTile {
  key: string;
}

/**
 * Returns true if the tile can extend the current chain (same resource key,
 * not already in chain). Stub: always returns true when chain is empty.
 */
export function canExtendChain(chain: ChainTile[], tile: ChainTile): boolean {
  if (chain.length === 0) return true;
  return chain[0].key === tile.key;
}

export function upgradeCountForChain(
  chainLength: number,
  resourceKey: string,
  thresholdMap: Record<string, number> = UPGRADE_THRESHOLDS as Record<string, number>,
): number {
  const t = thresholdMap[resourceKey];
  if (!t) return 0; // terminal or unknown resource
  return Math.floor(chainLength / t);
}

// Public category names (used by tool-power configs) → tile families that live
// in TILE_FAMILY_RESOURCE. Uses the tool-power plural form (`birds`, `dirt`,
// `stone`); `bird` and `special_dirt` are also accepted because the
// tileCollection `category` field uses those exact strings.
const CATEGORY_TO_FAMILIES: Record<string, string[]> = {
  grass: ["grass"],
  grain: ["grain"],
  trees: ["tree"],
  vegetables: ["veg"],
  fruits: ["fruit"],
  flowers: ["flower"],
  birds: ["bird"],
  bird: ["bird"],
  herd_animals: ["herd"],
  cattle: ["cattle"],
  mounts: ["mount"],
  dirt: ["special_dirt"],
  special_dirt: ["special_dirt"],
  stone: ["mine_stone"],
  iron: ["mine_iron_ore"],
  coal: ["mine_coal"],
  gold: ["mine_gold"],
  gem: ["mine_gem"],
  fish: ["fish", "fish_clam", "fish_oyster", "fish_kelp"],
};

// Resolve a tile key's family — falls back to a synthetic "special_dirt" tag
// for `tile_special_dirt`, which is intentionally absent from TILE_FAMILY_RESOURCE
// because its produced resource is handled by a custom rune-trigger pipeline.
function _tileFamilyForCategory(tileKey: string): string | null {
  const fam = tileFamily(tileKey);
  if (fam) return fam;
  if (tileKey === "tile_special_dirt") return "special_dirt";
  return null;
}

/**
 * Returns every `tile_*` key whose family matches the given category (or
 * categories). Accepts a single category string OR an array of categories;
 * the returned array is the union with no duplicates. Unknown categories
 * contribute nothing — the function never throws.
 */
export function tilesInCategory(category: string | string[]): string[] {
  const requested = Array.isArray(category) ? category : [category];
  const families = new Set<string>();
  for (const c of requested) {
    const fams = CATEGORY_TO_FAMILIES[c];
    if (!fams) continue;
    for (const f of fams) families.add(f);
  }
  if (families.size === 0) return [];
  const out: string[] = [];
  for (const key of Object.keys(ITEMS)) {
    const item = getItem(key) as { kind?: string } | null | undefined;
    if (!item || item.kind !== "tile") continue;
    const fam = _tileFamilyForCategory(key);
    if (fam && families.has(fam)) out.push(key);
  }
  return out;
}

/**
 * Sample a resource key from a weighted pool (the pool uses repetition for
 * weighting — a key appearing 3× is 3× as likely).
 * @param pool - array of resource keys (with repetition for weighting)
 * @param rand - optional RNG (defaults to Math.random)
 */
export function rollResource(pool: string[], rand: () => number = Math.random): string {
  return pool[Math.floor(rand() * pool.length)];
}

export function hex(num: number): string {
  return `#${num.toString(16).padStart(6, "0")}`;
}

export function makeBubble(npc: string, text: string, ms: number = 1800): { id: number; npc: string; text: string; ms: number } {
  return { id: Date.now(), npc, text, ms };
}

/** Returns the season index (0=Spring, 1=Summer, 2=Autumn, 3=Winter) for a given turn count. */
export function seasonIndexForTurns(turns: number): number {
  if (turns <= 2) return 0; // Spring
  if (turns <= 5) return 1; // Summer
  if (turns <= 8) return 2; // Autumn
  return 3;                 // Winter
}

/** Returns the per-resource inventory cap: 500 with Granary, 200 otherwise. */
export function currentCap(state: GameState | null | undefined): number {
  if (!state) return RESOURCE_CAP_BASE;
  const agg = computeAggregatedAbilities(state) as Record<string, unknown>;
  const capBonus = (agg.inventoryCapBonus as number | undefined) ?? 0;
  if (capBonus > 0) return RESOURCE_CAP_BASE + capBonus;
  const built = locBuilt(state);
  return (built?.granary || state.built?.granary) ? RESOURCE_CAP_GRANARY : RESOURCE_CAP_BASE;
}

// runSelfTests — thin smoke shim for in-game console use (<50ms).
// The comprehensive test suite lives in tests/phase-N-*.test.js (run via npm test).
// Import is lazy to avoid circular deps at module init time.
export async function runSelfTests(): Promise<boolean> {
  const { SMOKE_INVARIANTS } = await import("./smokeTests.js");
  let passed = 0, failed = 0;
  for (const { name, check } of SMOKE_INVARIANTS) {
    try {
      if (check()) {
        passed++;
      } else {
        failed++;
        console.assert(false, name);
      }
    } catch (e) {
      failed++;
      console.error("smoke fail:", name, e);
    }
  }
  console.log(`[smoke] ${passed} passed, ${failed} failed`);
  return failed === 0;
}
