/**
 * UnreachablePage.tsx — the "Unreachable / Deferred" developer utility page.
 *
 * A LIVE, derived index of every catalog entity that has no unlock path in the
 * configured game (src/game/reachability.findUnreachable()). It is the discoverable
 * surface for content that has been UNLINKED (not deleted) while the game is scoped to
 * zones 1 & 2 — buildings no reachable zone unlocks, recipes/tools/tiles/workers that
 * depend on them, and the SCOPED_OUT manifest residue. Nothing here is hand-maintained:
 * scope a thing back in (relink its zone, restore a default tile) and it leaves this list
 * automatically. The reachability guard test pins this set so it never drifts silently.
 */

import React from "react";
import { findUnreachable } from "../../../game/reachability.js";
import { BUILDINGS, RECIPES, getItem } from "../../../constants.js";
import { TILE_TYPES } from "../../../features/tileCollection/data.js";
import { TYPE_WORKER_MAP } from "../../../features/workers/data.js";

const BUILDING_NAME = new Map(BUILDINGS.map((b) => [b.id, b.name as string]));
const TILE_NAME = new Map((TILE_TYPES as ReadonlyArray<{ id: string; displayName?: string }>).map((t) => [t.id, t.displayName]));

function labelFor(concept: string, key: string): string {
  switch (concept) {
    case "buildings": return BUILDING_NAME.get(key) ?? key;
    case "recipes": {
      const item = (RECIPES as Record<string, { item?: string } | undefined>)[key]?.item;
      return (item && getItem(item)?.label) || key;
    }
    case "tools":
    case "resources": return getItem(key)?.label ?? key;
    case "tiles": return TILE_NAME.get(key) ?? key;
    case "workers": return TYPE_WORKER_MAP[key as keyof typeof TYPE_WORKER_MAP]?.name ?? key;
    default: return key;
  }
}

const GROUPS: Array<{ concept: string; label: string; blurb: string }> = [
  { concept: "buildings", label: "Buildings", blurb: "No reachable zone's tier ladder unlocks these." },
  { concept: "recipes", label: "Recipes", blurb: "Station never reachable, an input is unreachable, or held back by the scope manifest." },
  { concept: "tools", label: "Tools", blurb: "No reachable recipe produces them and no reachable building grants them." },
  { concept: "tiles", label: "Tiles", blurb: "Unlinked off the starting deck (gated behind a deferred building or an unreachable chain)." },
  { concept: "workers", label: "Workers", blurb: "Their target tile family is unreachable, or the role is held back by the scope manifest." },
  { concept: "resources", label: "Resources", blurb: "Not board-produced by any reachable tile and not craftable from reachable inputs." },
];

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--line, #e2d6bd)", borderRadius: 12, padding: "14px 16px",
  background: "var(--paper-3, #f9f4e9)", marginBottom: 14,
};
const chipStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "baseline", gap: 6, fontSize: 12.5,
  padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(194,59,34,0.42)",
  background: "rgba(194,59,34,0.08)", color: "#9a3520", margin: "0 6px 6px 0", whiteSpace: "nowrap",
};
const keyStyle: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, opacity: 0.7 };

export function UnreachablePage() {
  const report = findUnreachable() as unknown as Record<string, string[]>;
  const total = GROUPS.reduce((n, g) => n + (report[g.concept]?.length ?? 0), 0);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 4px 80px" }}>
      <h1 style={{ fontWeight: 800, fontSize: 28, margin: "6px 0 4px" }}>Unreachable / Deferred</h1>
      <p style={{ color: "var(--ink-soft, #5c4f40)", maxWidth: "74ch" }}>
        Every catalog entity with <strong>no unlock path</strong> in the configured game — derived live, not
        hand-flagged. This is the discoverable record of what has been <em>unlinked</em> (kept in the catalog,
        but not reachable) while the game is scoped to zones 1 &amp; 2. Relink a zone or restore a default tile
        and the affected entries drop off this list automatically. <strong>{total}</strong> entities deferred.
      </p>
      {GROUPS.map((g) => {
        const items = (report[g.concept] ?? []).slice().sort();
        return (
          <div key={g.concept} style={cardStyle}>
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-deep, #8a6018)" }}>
              {g.label} · {items.length}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft, #5c4f40)", margin: "2px 0 10px" }}>{g.blurb}</div>
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--green, #5f7d3a)", fontWeight: 600 }}>None — all reachable.</div>
            ) : (
              <div>
                {items.map((key) => (
                  <span key={key} style={chipStyle} title={key}>
                    {labelFor(g.concept, key)} <span style={keyStyle}>{key}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default UnreachablePage;
