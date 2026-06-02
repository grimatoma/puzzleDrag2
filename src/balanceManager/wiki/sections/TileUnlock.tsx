/**
 * TileUnlock.tsx — "How to unlock" section for the Game Wiki.
 *
 * For a tile article, surfaces the tile's discovery condition in friendly
 * prose plus the concrete params rendered visually:
 *   - default   → "Available from the start"
 *   - chain     → "Chain N× <tile>" with a navigable icon for the prerequisite
 *   - research  → "Research N <resource>" with a navigable icon
 *   - buy       → "Buy for N coins"
 *   - building  → "Build the <building>" with a navigable building link
 *   - daily     → "Day N login reward"
 * Also shows the tile's tier band.
 *
 * COMPUTE is reused from the static catalogs:
 *   - TILE_TYPES_MAP  (features/tileCollection/data.js) — id → tile def
 *   - TILE_DISCOVERY_METHOD_BY_ID (config/tileDiscoveryMethods.js) — friendly
 *     names + descriptions per method.
 *
 * Returns null when the tile id is not in TILE_TYPES_MAP.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { iconLabel } from "../../../textures/iconRegistry.js";
import { COLORS } from "../../shared.jsx";
import { useBalanceNav } from "../../balanceNav.jsx";
import { wikiNavTarget } from "../WikiLinkButton.jsx";
import { conceptForKey } from "../conceptEntities.js";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { TILE_TYPES_MAP } from "../../../features/tileCollection/data.js";
import { TILE_DISCOVERY_METHOD_BY_ID } from "../../../config/tileDiscoveryMethods.js";

/** Shape of the `discovery` object stored on a tile type. */
interface TileDiscovery {
  method?: string;
  chainLengthOf?: string;
  chainLength?: number;
  researchOf?: string;
  researchAmount?: number;
  coinCost?: number;
  buildingId?: string;
  day?: number;
}

interface TileType {
  tier?: number;
  discovery?: TileDiscovery;
}

/** Read the live tile type record, or null when the id is unknown. */
function tileType(tileId: string): TileType | null {
  const t = (TILE_TYPES_MAP as Record<string, unknown>)[tileId];
  return t != null && typeof t === "object" ? (t as TileType) : null;
}

/** Cheap precheck for TOC gating — true when the tile id is in the catalog. */
export function hasTileUnlock(tileId: string): boolean {
  return tileType(tileId) != null;
}

/** A navigable item/building chip: icon + label linking to its wiki article. */
function LinkChip({ navKey, label }: { navKey: string; label?: string }) {
  const { navigate } = useBalanceNav();
  const display = label ?? iconLabel(navKey) ?? navKey;
  const conceptId = conceptForKey(navKey);

  const inner = (
    <>
      <Icon iconKey={navKey} size={18} style={{ marginRight: 4, verticalAlign: "middle" }} />
      <span style={{ fontWeight: 600 }}>{display}</span>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 8,
    fontSize: 11,
    background: COLORS.parchmentDeep,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.ink,
  };

  if (conceptId == null) {
    return <span style={baseStyle}>{inner}</span>;
  }

  return (
    <button
      type="button"
      title={`${conceptId}:${navKey}`}
      onClick={() => navigate(wikiNavTarget(conceptId, navKey))}
      style={{ ...baseStyle, cursor: "pointer", transition: "opacity 120ms ease" }}
      className="hover:opacity-80"
    >
      {inner}
    </button>
  );
}

/** Mono numeric emphasis for inline counts/costs. */
function Amount({ children }: { children: React.ReactNode }) {
  return (
    <span className="wiki-mono" style={{ fontWeight: 700, color: COLORS.ink }}>
      {children}
    </span>
  );
}

/**
 * Render the concrete "how to unlock" detail for a tile's discovery object.
 * Returns a node describing the requirement, with prerequisite tile / building
 * references rendered as navigable chips.
 */
function unlockDetail(discovery: TileDiscovery): React.ReactNode {
  const method = discovery.method ?? "default";

  switch (method) {
    case "chain": {
      const prereq = discovery.chainLengthOf;
      const n = discovery.chainLength ?? 0;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span>Chain</span>
          <Amount>{n}×</Amount>
          {prereq != null && <LinkChip navKey={prereq} />}
        </span>
      );
    }
    case "research": {
      const prereq = discovery.researchOf;
      const n = discovery.researchAmount ?? 0;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span>Research</span>
          <Amount>{n}</Amount>
          {prereq != null && <LinkChip navKey={prereq} />}
        </span>
      );
    }
    case "buy": {
      const cost = discovery.coinCost ?? 0;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span>Buy for</span>
          <Amount>{cost}</Amount>
          <Icon iconKey="coins" size={18} style={{ verticalAlign: "middle" }} />
          <span>coins</span>
        </span>
      );
    }
    case "building": {
      const buildingId = discovery.buildingId;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span>Build the</span>
          {buildingId != null ? <LinkChip navKey={buildingId} /> : <span>building</span>}
        </span>
      );
    }
    case "daily": {
      const day = discovery.day ?? 1;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span>Day</span>
          <Amount>{day}</Amount>
          <span>login reward</span>
        </span>
      );
    }
    case "default":
    default:
      return <span>Available from the start.</span>;
  }
}

/** A small labelled stat block, matching BossDifficulty's row idiom. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.ink }}>
        {children}
      </div>
    </div>
  );
}

export interface TileUnlockProps {
  tileId: string;
}

/**
 * Render the "How to unlock" detail for `tileId`, or null when the tile id is
 * not in the tile catalog.
 */
export function TileUnlock({ tileId }: TileUnlockProps) {
  const { navigate } = useBalanceNav();
  const tile = tileType(tileId);
  if (tile == null) return null;

  const discovery: TileDiscovery = tile.discovery ?? { method: "default" };
  const method = discovery.method ?? "default";
  const methodDef = TILE_DISCOVERY_METHOD_BY_ID[method];
  const methodName = methodDef?.name ?? method;
  const methodDesc = methodDef?.desc ?? "";
  const tier = typeof tile.tier === "number" ? tile.tier : null;

  return (
    <section id="tile-unlock">
      <div className="wiki-section-heading mb-2">How to unlock</div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 18,
          padding: "12px 14px",
          borderRadius: 10,
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <Stat label="Method">
          <button
            type="button"
            title={`tileDiscoveryMethods:${method}`}
            onClick={() => navigate(wikiNavTarget("tileDiscoveryMethods", method))}
            style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
            className="hover:opacity-80"
          >
            <StatusChip tone="info" size="sm" uppercase title={methodDesc}>
              {methodName}
            </StatusChip>
          </button>
        </Stat>

        <Stat label="Requirement">{unlockDetail(discovery)}</Stat>

        {tier != null && (
          <Stat label="Tier">
            <span className="wiki-mono" style={{ fontWeight: 700 }}>
              {tier}
            </span>
          </Stat>
        )}
      </div>
    </section>
  );
}

export default TileUnlock;
