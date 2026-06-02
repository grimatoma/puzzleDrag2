/**
 * WikiLinkButton.tsx — Renders a [[wikilink]] or data-wiki reference as a
 * navigable rich inline ref within the Dev Panel wiki.
 *
 * Also exports `wikiNavTarget`, the shared helper that encodes the wiki
 * navigation contract. All cross-link call sites route through it.
 */

import React from "react";
import { resolveWikiLink } from "./wikilink.js";
import { COLORS } from "../shared.jsx";
import { ConceptRefCard } from "./ConceptRefCard.jsx";

/**
 * Build a navigation target for a resolved wiki entity.
 *
 * Each concept owns a tab keyed by its conceptId; the focus string encodes
 * `"conceptId:key"` so the shell can resolve the specific entity article.
 */
export function wikiNavTarget(
  conceptId: string,
  key: string,
): { tab: string; focus: string } {
  return { tab: conceptId, focus: `${conceptId}:${key}` };
}

export interface WikiLinkButtonProps {
  /** The raw wikilink target: `"conceptId:key"` or a bare `"key"`. */
  raw: string;
  /** Display text — already extracted by the caller. */
  display: string;
}

/**
 * Renders a wikilink as a rich inline concept ref. Unresolvable targets render
 * as inert muted text.
 */
export function WikiLinkButton({ raw, display }: WikiLinkButtonProps) {
  const resolved = resolveWikiLink(raw);

  if (!resolved) {
    return (
      <span style={{ color: COLORS.inkSubtle }}>{display}</span>
    );
  }

  return (
    <ConceptRefCard
      conceptId={resolved.conceptId}
      entityKey={resolved.entityKey}
      label={display}
      variant="inline"
    />
  );
}
