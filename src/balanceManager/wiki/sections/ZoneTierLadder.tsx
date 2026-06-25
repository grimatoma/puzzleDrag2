/**
 * ZoneTierLadder.tsx — "Settlement tiers & upgrade costs" section for zone articles.
 *
 * Each settlement zone grows through its OWN tier ladder, and each rung costs a
 * specific bundle of resources to reach (`ZONES[zone].tiers[].upgradeCost`).
 * That per-zone cost data previously surfaced ONLY on the global Balance /
 * Direction pages and the zones index (home + quarry). This section brings it
 * onto each zone's own detail page, so every zone "details" its own upgrade
 * costs rather than the reader having to cross-reference a global page.
 *
 *   - Tiered zones (home, quarry, mirefen) → the live `TierLadderTable`: rung,
 *     name, plots, newly-unlocked buildings, and the upgrade cost per rung.
 *   - Flat settlement zones (meadow, orchard, caves, forge, harbor) → an
 *     explicit note that the zone is a single fixed layout with no per-tier
 *     upgrade costs (so the page still details its — absent — per-tier costs).
 *   - Non-settlement nodes with no board (crossroads, fairground, pit,
 *     oldcapital) → nothing (`hasZoneTierLadder` returns false).
 *
 * Reads `ZONES` live (via `tiersForZone` and the zone's boards) — never drifts.
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { TierLadderTable } from "../derivedFacts.jsx";
import { tiersForZone } from "../../../features/zones/data.js";

// ─── Shapes ─────────────────────────────────────────────────────────────────

interface ZoneLike {
  id?: string;
  name?: string;
  boards?: { farm?: unknown; mine?: unknown; fish?: unknown } | null;
}

/**
 * A zone shows the settlement-tier section when it's a buildable settlement —
 * i.e. it has a farm / mine / fish board you actually grow. Pure event / boss /
 * capital nodes (crossroads, fairground, pit, oldcapital) have no board and are
 * skipped so the section never adds noise to a place you don't settle.
 */
export function hasZoneTierLadder(zone: ZoneLike | null | undefined): boolean {
  const boards = zone?.boards;
  if (!boards) return false;
  return Boolean(boards.farm || boards.mine || boards.fish);
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ZoneTierLadderProps {
  zoneId: string;
  zone: ZoneLike;
}

/**
 * Render the settlement-tier ladder + per-rung upgrade costs for `zone`, or null
 * for non-settlement nodes. A flat settlement renders an explicit "single fixed
 * layout" note so the page still details its (absent) per-tier costs.
 */
export function ZoneTierLadder({ zoneId, zone }: ZoneTierLadderProps) {
  if (!hasZoneTierLadder(zone)) return null;

  const isTiered = tiersForZone(zoneId).length > 0;
  const name = zone.name ?? zoneId;

  return (
    <section id="zone-tier-ladder">
      <h2 className="wiki-section-heading mb-2">Settlement tiers &amp; upgrade costs</h2>

      {isTiered ? (
        <>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: COLORS.ink, margin: "0 0 10px" }}
          >
            {name} grows through a settlement-tier ladder. Each rung adds building plots
            and unlocks new structures, and costs the resources shown to reach — spent
            from the zone's own inventory.
          </p>
          <TierLadderTable zoneId={zoneId} />
        </>
      ) : (
        <p
          className="text-[13px] leading-relaxed"
          style={{
            color: COLORS.inkSubtle,
            margin: 0,
            padding: "10px 14px",
            borderRadius: 10,
            background: COLORS.parchmentDeep,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {name} is a single-tier settlement — one fixed layout, with no per-tier
          upgrade costs. (Multi-rung settlements like the Cracked Quarry climb a tier
          ladder whose per-rung costs appear here; this zone does not.)
        </p>
      )}
    </section>
  );
}

export default ZoneTierLadder;
