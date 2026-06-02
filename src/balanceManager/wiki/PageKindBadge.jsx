/**
 * PageKindBadge.jsx — Small labelled badge that names the kind of wiki page
 * the reader is on: Concept (a definition/landing page), Category (a grouping
 * that lists members), or Instance (a single game entity).
 *
 * Driven by PAGE_KIND_META in pageKind.ts — never hand-set per page.
 */

import React from "react";
import StatusChip from "../../ui/primitives/StatusChip.jsx";
import { PAGE_KIND_META } from "./pageKind.js";

/**
 * @param {{ kind: "concept" | "category" | "instance" }} props
 */
export default function PageKindBadge({ kind }) {
  const meta = PAGE_KIND_META[kind] ?? PAGE_KIND_META.instance;
  return (
    <StatusChip
      tone={meta.tone}
      size="xs"
      uppercase
      title={`Page kind: ${meta.label}`}
      aria-label={`Page kind: ${meta.label}`}
    >
      {meta.label}
    </StatusChip>
  );
}
