/**
 * derivedFacts.tsx — Live, code-derived facts for authored wiki prose.
 *
 * THE PROBLEM THIS SOLVES. The wiki's generated catalog cannot drift, but the
 * hand-authored HTML prose under `src/balanceManager/content/**` historically
 * hard-typed *structured* facts — tier-ladder rung names, plot counts, upgrade
 * costs, turn budgets, gating — that go stale the instant the underlying code
 * changes (the PC2 cost port, for one, left the Direction/Balance pages claiming
 * a 3-rung home ladder while the code shipped a 6-rung Camp→Manor ladder; the
 * home zone has since been re-laddered again to the 4-rung Outpost→City layout).
 *
 * THE FIX. Authored prose injects those facts live instead of typing them:
 *
 *   <div  data-wiki-tier-ladder="home"></div>          → generated ladder table
 *   <span data-wiki-fact="zone.home.rungCount"></span> → "4"
 *
 * `HtmlBody.tsx` swaps each placeholder for the component below, which reads the
 * value from ZONES / cartography at render time. A number rendered this way can
 * never disagree with the game. Everything here reads ONLY the live
 * source-of-truth maps (ZONES, MAP_NODES, BUILDINGS) — no duplicated constants.
 *
 * Adding a fact key: extend `resolveFact`. Adding a zone to a ladder embed: it
 * just works as long as `ZONES[id].tiers` exists. `derivedFacts.test.ts` fails
 * if any content file references a key that does not resolve, so dangling keys
 * cannot ship.
 */

import React from "react";
import { BUILDINGS } from "../../constants.js";
import {
  ZONES,
  tiersForZone,
  maxTier,
  plotsForTier,
} from "../../features/zones/data.js";
import { type ZoneTier } from "../../features/cartography/data.js";
import { AmountChips } from "./EntityVisual.jsx";
import { WikiLinkButton } from "./WikiLinkButton.jsx";
import { COLORS } from "../shared.jsx";

// ── Static lookups (built once) ──────────────────────────────────────────────

const BUILDING_NAME = new Map<string, string>(
  (BUILDINGS as Array<{ id: string; name?: string }>).map((b) => [b.id, b.name ?? b.id]),
);

/** Title-case a board kind for prose ("farm" → "Farm"). */
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The base turn budget for a zone, read from whichever board it enables. */
function zoneBaseTurns(zoneId: string): number | null {
  const boards = ZONES[zoneId]?.boards as
    | Record<string, { baseTurns?: number } | undefined>
    | undefined;
  if (!boards) return null;
  for (const kind of ["farm", "mine", "fish"] as const) {
    const b = boards[kind];
    if (b && typeof b.baseTurns === "number") return b.baseTurns;
  }
  return null;
}

/** Which board kind a zone enables, if any ("farm" | "mine" | "fish"). */
function zoneBoardKind(zoneId: string): string | null {
  const boards = ZONES[zoneId]?.boards as Record<string, unknown> | undefined;
  if (!boards) return null;
  for (const kind of ["farm", "mine", "fish"] as const) {
    if (boards[kind]) return kind;
  }
  return null;
}

// ── resolveFact — pure scalar resolver (also used by the guard test) ──────────

/**
 * Resolve a `data-wiki-fact` key to a display string read live from code, or
 * `null` when the key is not recognised (the guard test treats null as a
 * dangling reference and fails).
 *
 * Supported keys, all `zone.<id>.<field>`:
 *   name          — the zone's display name
 *   boardKind     — "Farm" | "Mine" | "Fish"
 *   baseTurns     — the board's base turn budget (e.g. "10")
 *   entryCoins    — coins to start one session (e.g. "50"); "free" when 0
 *   rungCount     — number of settlement-tier rungs (0 when un-tiered)
 *   plotsTop      — total building plots at the top rung
 *   plotsByTier   — "3 → 6 → 12 → 20"
 *   firstTierName — first rung name (e.g. "Outpost")
 *   topTierName   — top rung name (e.g. "City")
 *   ladderSpan    — "Outpost → City" (first → top rung)
 *   tierNames     — "Outpost → Hamlet → Village → City"
 *   gate          — founding gate ("Greenmeadow at City"), or "none"
 *   dangerCount   — number of hazards on this zone's board
 */
export function resolveFact(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3 || parts[0] !== "zone") return null;
  const zoneId = parts[1];
  const field = parts[2];
  const zone = ZONES[zoneId];
  if (!zone) return null;

  switch (field) {
    case "name":
      return zone.name ?? zoneId;
    case "boardKind": {
      const k = zoneBoardKind(zoneId);
      return k ? titleCase(k) : null;
    }
    case "baseTurns": {
      const t = zoneBaseTurns(zoneId);
      return t == null ? null : String(t);
    }
    case "entryCoins": {
      const coins = (zone.entryCost as { coins?: number } | undefined)?.coins ?? 0;
      return coins > 0 ? String(coins) : "free";
    }
    case "rungCount":
      return String(tiersForZone(zoneId).length);
    case "plotsTop":
      return String(plotsForTier(zoneId, Math.max(0, maxTier(zoneId))));
    case "plotsByTier": {
      const tiers = tiersForZone(zoneId);
      if (tiers.length === 0) return null;
      return tiers.map((t) => t.plots).join(" → ");
    }
    case "firstTierName": {
      const tiers = tiersForZone(zoneId);
      return tiers.length > 0 ? tiers[0].name : null;
    }
    case "topTierName": {
      const tiers = tiersForZone(zoneId);
      return tiers.length > 0 ? tiers[tiers.length - 1].name : null;
    }
    case "ladderSpan": {
      const tiers = tiersForZone(zoneId);
      if (tiers.length === 0) return null;
      return `${tiers[0].name} → ${tiers[tiers.length - 1].name}`;
    }
    case "tierNames": {
      const tiers = tiersForZone(zoneId);
      if (tiers.length === 0) return null;
      return tiers.map((t) => t.name).join(" → ");
    }
    case "gate": {
      const gate = zone.requiresZoneTier as { zone: string; tier: number } | undefined;
      if (!gate) return "none";
      const gateZone = ZONES[gate.zone]?.name ?? gate.zone;
      const tierName = tiersForZone(gate.zone)[gate.tier]?.name ?? `tier ${gate.tier}`;
      return `${gateZone} at ${tierName}`;
    }
    case "dangerCount":
      return String((zone.dangers as unknown[] | undefined)?.length ?? 0);
    default:
      return null;
  }
}

// ── WikiFact — inline scalar ──────────────────────────────────────────────────

/**
 * Render a single code-derived scalar inline. Falls back to a visible muted
 * marker if the key cannot be resolved (the guard test prevents this shipping).
 */
export function WikiFact({ factKey }: { factKey: string }) {
  const value = resolveFact(factKey);
  if (value == null) {
    return (
      <span
        style={{ color: COLORS.inkSubtle, fontStyle: "italic" }}
        title={`Unresolved wiki fact: ${factKey}`}
      >
        ?{factKey}?
      </span>
    );
  }
  return <span style={{ fontWeight: 700, color: COLORS.ink }}>{value}</span>;
}

// ── Tier-ladder table ─────────────────────────────────────────────────────────

export interface TierLadderRow {
  tier: number;
  id: string;
  name: string;
  plots: number;
  unlocks: string[];
  cost: Record<string, number> | null;
}

/**
 * Pure projection of a zone's tier ladder into renderable rows. Exported for the
 * guard test, which asserts the rows track `ZONES[zoneId].tiers` exactly.
 */
export function tierLadderRows(zoneId: string): TierLadderRow[] {
  const tiers = tiersForZone(zoneId);
  return tiers.map((t: ZoneTier, i: number) => {
    const uc = t.upgradeCost ?? null;
    const cost: Record<string, number> | null = uc
      ? { ...(uc.resources ?? {}), ...(uc.coins ? { coins: uc.coins } : {}) }
      : null;
    return {
      tier: i,
      id: t.id,
      name: t.name,
      plots: t.plots,
      unlocks: [...t.unlocks],
      cost: cost && Object.keys(cost).length > 0 ? cost : null,
    };
  });
}

const CELL: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: `1px solid ${COLORS.border}`,
  verticalAlign: "top",
  textAlign: "left",
};
const HEAD: React.CSSProperties = {
  ...CELL,
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.inkSubtle,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

/**
 * Render a zone's settlement-tier ladder as a live table: rung #, name, total
 * plots, the buildings *newly* unlocked at that rung (as clickable refs), and
 * the upgrade cost to reach it. Reads `ZONES[zoneId].tiers` — never drifts.
 *
 * Renders a graceful note for an unknown or un-tiered zone rather than nothing,
 * so an authoring typo is visible instead of silent.
 */
export function TierLadderTable({ zoneId }: { zoneId: string }) {
  const rows = tierLadderRows(zoneId);
  const zone = ZONES[zoneId];

  if (!zone) {
    return (
      <div className="text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
        Unknown zone “{zoneId}” — check the data-wiki-tier-ladder id.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
        {zone.name} has no settlement-tier ladder (single fixed layout).
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={HEAD}>Rung</th>
            <th style={HEAD}>Name</th>
            <th style={HEAD}>Plots</th>
            <th style={HEAD}>Newly unlocked</th>
            <th style={HEAD}>Upgrade cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...CELL, fontWeight: 700, color: COLORS.inkSubtle }}>{r.tier}</td>
              <td style={{ ...CELL, fontWeight: 700, color: COLORS.ink }}>{r.name}</td>
              <td style={CELL}>{r.plots}</td>
              <td style={CELL}>
                <span style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                  {r.unlocks.map((id) => (
                    <WikiLinkButton
                      key={id}
                      raw={`buildings:${id}`}
                      display={BUILDING_NAME.get(id) ?? id}
                    />
                  ))}
                </span>
              </td>
              <td style={CELL}>
                {r.cost ? (
                  <AmountChips amounts={r.cost} />
                ) : (
                  <span style={{ color: COLORS.inkSubtle }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
