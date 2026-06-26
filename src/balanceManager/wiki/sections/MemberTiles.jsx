/**
 * MemberTiles.jsx — Prominent member-tile grid for grouping pages (a tile
 * category, or a discovery method). Renders the same EntryGrid cards as the
 * Tiles concept page so the browse experience matches.
 *
 * Returns null when the page groups no tiles (e.g. a zone-only category).
 */

import EntryGrid from "../EntryGrid.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { memberTilesFor } from "../memberTiles.js";

/**
 * @param {{ conceptId: string, entityKey: string }} props
 */
export default function MemberTiles({ conceptId, entityKey }) {
  const { navigate } = useBalanceNav();
  const tiles = memberTilesFor(conceptId, entityKey);
  if (tiles.length === 0) return null;

  return (
    <section id="member-tiles" className="flex flex-col gap-2">
      <h2 className="wiki-section-heading">Tiles ({tiles.length})</h2>
      <EntryGrid
        entries={tiles}
        onSelect={(key) => navigate(wikiNavTarget("tiles", key))}
        conceptId="tiles"
      />
    </section>
  );
}

/** Cheap precheck for TOC gating. */
export function hasMemberTiles(conceptId, entityKey) {
  return memberTilesFor(conceptId, entityKey).length > 0;
}
