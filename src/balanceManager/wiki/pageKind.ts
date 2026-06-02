/**
 * pageKind.ts — Classifies wiki pages into three kinds for the page-kind badge.
 *
 *   - "concept"  — a concept LANDING page (the Tiles page; rendered by CategoryPage).
 *   - "category" — an instance page that is a GROUPING of tiles (a tile category,
 *                  or a discovery method); lists members.
 *   - "instance" — an instance page for a single game entity (the Wheat tile).
 *
 * `pageKindFor(conceptId)` returns the kind of a concept's INSTANCE pages.
 * The concept landing page is always "concept" (CategoryPage hardcodes it).
 *
 * Pure module — no React, no DOM.
 */

import { CONCEPTS } from "./concepts.js";

export type PageKind = "concept" | "category" | "instance";

export interface PageKindMeta {
  label: string;
  /** StatusChip tone — see src/ui/primitives/StatusChip. */
  tone: "info" | "warning" | "muted";
}

export const PAGE_KIND_META: Record<PageKind, PageKindMeta> = {
  concept: { label: "Concept", tone: "info" },
  category: { label: "Category", tone: "warning" },
  instance: { label: "Instance", tone: "muted" },
};

/** The kind of a concept's INSTANCE pages. Defaults to "instance". */
export function pageKindFor(conceptId: string): Exclude<PageKind, "concept"> {
  const concept = CONCEPTS.find((c) => c.id === conceptId) as
    | { pageKind?: "instance" | "category" }
    | undefined;
  return concept?.pageKind === "category" ? "category" : "instance";
}
