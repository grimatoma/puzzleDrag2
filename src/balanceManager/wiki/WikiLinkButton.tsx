/**
 * WikiLinkButton.tsx — Renders a [[wikilink]] or data-wiki reference as a
 * navigable button within the Dev Panel wiki.
 *
 * Also exports `wikiNavTarget`, a shared helper that encodes the interim
 * (Phase 4) navigation contract: wiki is still one "wiki" tab; Phase 5 will
 * switch `tab` to the conceptId — change only this helper then.
 */

import React from "react";
import { RefButton } from "../relational.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { resolveWikiLink } from "./wikilink.js";
import { COLORS } from "../shared.jsx";

// ---------------------------------------------------------------------------
// wikiNavTarget — Phase 4 interim: everything goes to the "wiki" tab.
// Phase 5: change `tab` from "wiki" to `conceptId`.
// ---------------------------------------------------------------------------

/**
 * Build a navigation target for a resolved wiki entity.
 *
 * INTERIM (Phase 4): the wiki is still a single "wiki" tab. The focus string
 * encodes both conceptId and key as `"conceptId:key"` so the tab can resolve
 * it. When Phase 5 promotes each concept to its own tab, change ONLY this
 * helper.
 */
export function wikiNavTarget(
  conceptId: string,
  key: string,
): { tab: string; focus: string } {
  return { tab: "wiki", focus: `${conceptId}:${key}` };
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
