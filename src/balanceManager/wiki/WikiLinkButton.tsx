/**
 * WikiLinkButton.tsx — Renders a [[wikilink]] or data-wiki reference as a
 * navigable button within the Dev Panel wiki.
 *
 * Also exports `wikiNavTarget`, the shared helper that encodes the wiki
 * navigation contract. All cross-link call sites (WikiLinkButton, WikiArticle
 * relations + backlinks, CategoryPage entry cards) route through it.
 */

import React from "react";
import { RefButton } from "../relational.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { resolveWikiLink } from "./wikilink.js";
import { COLORS } from "../shared.jsx";

// ---------------------------------------------------------------------------
// wikiNavTarget — each concept routes to its OWN tab (the conceptId), with the
// focus string `"conceptId:key"` selecting the entity article within that tab.
// ---------------------------------------------------------------------------

/**
 * Build a navigation target for a resolved wiki entity.
 *
 * Each concept owns a tab keyed by its conceptId; the focus string encodes
 * `"conceptId:key"` so the shell can resolve the specific entity article
 * (parseWikiFocus) while the tab itself drives the category landing page when
 * focus is absent.
 */
export function wikiNavTarget(
  conceptId: string,
  key: string,
): { tab: string; focus: string } {
  return { tab: conceptId, focus: `${conceptId}:${key}` };
}

// ---------------------------------------------------------------------------
// WikiLinkButton
// ---------------------------------------------------------------------------

export interface WikiLinkButtonProps {
  /** The raw wikilink target: `"conceptId:key"` or a bare `"key"`. */
  raw: string;
  /** Display text — already extracted by the caller. */
  display: string;
}

/**
 * Renders a wikilink reference as a clickable `RefButton` that navigates to
 * the entity's wiki page. If the raw target cannot be resolved, renders an
 * inert `<span>` with muted styling rather than a dead link.
 */
export function WikiLinkButton({ raw, display }: WikiLinkButtonProps) {
  const { navigate } = useBalanceNav();
  const resolved = resolveWikiLink(raw);

  if (!resolved) {
    // Unresolvable target — render inert text, never a dead/broken link.
    return (
      <span style={{ color: COLORS.inkSubtle }}>{display}</span>
    );
  }

  return (
    <RefButton
      title={`${resolved.conceptId}:${resolved.entityKey}`}
      onClick={() => navigate(wikiNavTarget(resolved.conceptId, resolved.entityKey))}
    >
      <span className="font-mono text-[11px]">{display}</span>
    </RefButton>
  );
}
