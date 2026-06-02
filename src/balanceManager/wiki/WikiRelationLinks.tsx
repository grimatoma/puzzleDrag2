/**
 * WikiRelationLinks.tsx — Plain text nav links for Related / What links here footers.
 *
 * Footer sections are quick cross-reference tags; enriched concept widgets live
 * in dedicated body sections above (BuildingRecipes, BuildingAbilities, …).
 */

import React from "react";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import type { WikiLink } from "./relations.js";

export interface WikiRelationLinksProps {
  links: WikiLink[];
  className?: string;
}

/** Compact label-only links — no icons, no concept cards. */
export function WikiRelationLinks({ links, className = "" }: WikiRelationLinksProps) {
  const { navigate } = useBalanceNav();
  if (links.length === 0) return null;

  return (
    <div className={`wiki-relation-links ${className}`.trim()}>
      {links.map((link, index) => (
        <React.Fragment key={`${link.conceptId}:${link.key}`}>
          {index > 0 && (
            <span className="wiki-relation-links__sep" aria-hidden="true">
              ·
            </span>
          )}
          <button
            type="button"
            className="wiki-relation-link"
            title={`${link.conceptId}:${link.key}`}
            onClick={() => navigate(wikiNavTarget(link.conceptId, link.key))}
          >
            {link.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default WikiRelationLinks;
