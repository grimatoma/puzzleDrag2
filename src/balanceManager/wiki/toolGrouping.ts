/**
 * toolGrouping.ts — pure helper that buckets a flat list of wiki tool entries
 * into ordered board-kind groups for display on the Tools wiki page.
 *
 * Reuses the player-facing tool catalog (`src/ui/toolRegistry.ts`) so the wiki
 * organisation stays in sync with the on-board Tools panel:
 *   - TOOL_BY_KEY resolves each entry's board kind ("all" | "farm" | "mine" | "fish").
 *   - TOOL_BOARD_KIND_LABELS supplies the band heading text.
 *
 * Tools whose key isn't in the catalog (none expected — the wiki and the
 * registry both derive from the same `kind: "tool"` ITEMS) fall into the "all"
 * band so nothing silently disappears from the wiki.
 */

import { TOOL_BY_KEY, TOOL_BOARD_KIND_LABELS } from "../../ui/toolRegistry.js";
import type { ToolBoardKind } from "../../ui/toolRegistry.js";
import type { WikiEntry } from "./EntryGrid.jsx";

export interface ToolBoardKindGroup {
  /** Board-kind key ("all" | "farm" | "mine" | "fish"). */
  boardKind: ToolBoardKind;
  /** Humanized band heading (e.g. "Farm board"). */
  label: string;
  /** Emoji icon shown beside the band heading. */
  icon: string;
  entries: WikiEntry[];
}

/** Band order — board-agnostic tools first, then the three biomes. */
const BOARD_KIND_ORDER: ToolBoardKind[] = ["all", "farm", "mine", "fish"];

/** Band icons — mirrors the tile-collection sub-category icons where they overlap. */
const BOARD_KIND_ICONS: Record<ToolBoardKind, string> = {
  all: "🧰",
  farm: "🌾",
  mine: "⛏",
  fish: "🌊",
};

/**
 * Bucket a flat (already name-sorted) list of wiki tool entries into ordered
 * board-kind bands. Empty bands are skipped and entry order is preserved within
 * each band.
 */
export function groupToolEntries(entries: WikiEntry[]): ToolBoardKindGroup[] {
  const byKind = new Map<ToolBoardKind, WikiEntry[]>();
  for (const entry of entries) {
    const boardKind = TOOL_BY_KEY[entry.key]?.boardKind ?? "all";
    const bucket = byKind.get(boardKind);
    if (bucket) bucket.push(entry);
    else byKind.set(boardKind, [entry]);
  }

  const result: ToolBoardKindGroup[] = [];
  for (const boardKind of BOARD_KIND_ORDER) {
    const kindEntries = byKind.get(boardKind);
    if (!kindEntries || kindEntries.length === 0) continue;
    result.push({
      boardKind,
      label: TOOL_BOARD_KIND_LABELS[boardKind],
      icon: BOARD_KIND_ICONS[boardKind],
      entries: kindEntries,
    });
  }

  return result;
}
