/**
 * conceptAccent.ts — Per-concept accent color lookup for the Phase 3 Wiki theme.
 *
 * Maps every concept id (and the narrative/utility pages) to a CSS color.
 * The dominant brand color remains ember (#d6612a). This helper provides
 * per-section accent hues sourced from the existing UI_COLORS palette and,
 * for biome-tied concepts (boardKinds), from the live BIOMES config so the
 * accent stays config-synced.
 *
 * Section grouping (from wikiNav.ts WIKI_SECTIONS):
 *   systems    — steel blue   (#46627a — the "how it works" hub)
 *   board      — earthy green  (UI_COLORS.green: #5a9e4b)
 *   economy    — ember/amber   (brand family: #d6612a / #c97c20)
 *   world      — plum/berry    (#7e7aa6 / violet, deepened)
 *   progression— gold          (#c9980a — distinct from ember amber)
 *   screens    — slate         (UI_COLORS.slate: #5a5e66)
 *
 * For boardKinds entries (farm / mine / fish) the biome palette.bg is used
 * as a hex string so the accent reflects the actual biome colour from config.
 */

import { BIOMES } from "../../constants.js";
import { UI_COLORS } from "../../ui/primitives/palette.js";
import { WIKI_SECTIONS } from "./wikiNav.js";

// ─── Ember (default / fallback) ───────────────────────────────────────────────

/** The brand default — used as fallback for unknown concept ids. */
export const ACCENT_EMBER = "#d6612a";

// ─── Section accent palette ───────────────────────────────────────────────────
// One accent per WIKI_SECTIONS id. All sourced from UI_COLORS or a close
// palette-coherent derivative. No purple-on-white; no rainbow.

const SECTION_ACCENT: Record<string, string> = {
  systems:     "#46627a",         // steel blue — cool & structural, distinct from the rest
  board:       UI_COLORS.green,   // #5a9e4b — earthy, naturalistic
  economy:     "#c97c20",         // amber — stays in the ember/warm family, clearly distinct
  world:       "#7e6aa6",         // intentional deepening of UI_COLORS.violet (#7e7aa6)
  progression: "#c9980a",         // gold — warm but clearly separate from ember
  screens:     UI_COLORS.slate,   // #5a5e66 — cool, neutral, "UI" feel
};

// ─── Biome-derived overrides for boardKinds entries ───────────────────────────
// Read palette.bg from the live BIOMES config and convert the hex number to
// a CSS color string. Fallback to the section accent if the biome is missing.
// BIOME_IDS is derived from the live config so future biomes are picked up
// automatically without updating this file.

const BIOME_IDS = new Set(Object.keys(BIOMES));

function numToHex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

function biomeAccent(biomeId: string): string {
  const biome = (BIOMES as Record<string, { palette?: { bg?: number } }>)[biomeId];
  if (biome?.palette?.bg != null) return numToHex(biome.palette.bg);
  return SECTION_ACCENT.board; // board section fallback
}

// ─── Build the concept → section id map ──────────────────────────────────────

function buildConceptSectionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const sec of WIKI_SECTIONS) {
    for (const node of sec.nodes) {
      map.set(node.conceptId, sec.id);
      for (const child of node.children ?? []) {
        map.set(child, sec.id);
      }
    }
  }
  return map;
}

const CONCEPT_SECTION = buildConceptSectionMap();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a CSS color string for a given concept id.
 *
 * - boardKinds article pages (farm / mine / fish) → live biome palette.bg
 * - All other concepts → section accent hue from the 5-section palette
 * - Unknown / narrative pages → ember fallback (#d6612a)
 */
export function conceptAccent(conceptId: string): string {
  // Special case: boardKind entity keys are biome ids (farm/mine/fish).
  // These are passed both as conceptId for CategoryPage and as entityKey for
  // WikiArticle (concept="boardKinds"). Handle both patterns:
  // 1. conceptId IS the biome key directly (membership derived from live BIOMES config)
  if (BIOME_IDS.has(conceptId)) {
    return biomeAccent(conceptId);
  }

  // 2. Standard: look up the section for the conceptId
  const sectionId = CONCEPT_SECTION.get(conceptId);
  if (sectionId != null) {
    return SECTION_ACCENT[sectionId] ?? ACCENT_EMBER;
  }

  return ACCENT_EMBER;
}

/**
 * Returns the accent for a WikiArticle entity page.
 *
 * Most articles use the concept-level accent. For boardKinds, the entity key
 * IS the biome id (farm/mine/fish), so we return the biome's palette color.
 */
export function entityAccent(conceptId: string, entityKey: string): string {
  if (conceptId === "boardKinds") {
    return biomeAccent(entityKey);
  }
  return conceptAccent(conceptId);
}
