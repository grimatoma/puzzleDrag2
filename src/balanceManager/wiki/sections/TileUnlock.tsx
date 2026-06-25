/**
 * TileUnlock.tsx — "How to unlock" section for the Game Wiki.
 */

import React from "react";
import Icon from "../../../ui/Icon.jsx";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey, wikiNavTarget } from "../refs.js";
import { useBalanceNav } from "../../balanceNav.jsx";
import StatusChip from "../../../ui/primitives/StatusChip.jsx";
import { TILE_TYPES_MAP } from "../../../features/tileCollection/data.js";
import { TILE_DISCOVERY_METHOD_BY_ID } from "../../../config/tileDiscoveryMethods.js";

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

function tileType(tileId: string): TileType | null {
  const t = (TILE_TYPES_MAP as Record<string, unknown>)[tileId];
  return t != null && typeof t === "object" ? (t as TileType) : null;
}

export function hasTileUnlock(tileId: string): boolean {
  return tileType(tileId) != null;
}

function Amount({ children }: { children: React.ReactNode }) {
  return (
    <span className="wiki-mono" style={{ fontWeight: 700, color: COLORS.ink }}>
      {children}
    </span>
  );
}

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
          {prereq != null && (
            <ConceptRefForKey entityKey={prereq} fieldName="chainLengthOf" conceptId="tiles" variant="inline" />
          )}
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
          {prereq != null && (
            <ConceptRefForKey entityKey={prereq} fieldName="researchOf" conceptId="resources" variant="inline" />
          )}
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
          {buildingId != null ? (
            <ConceptRefForKey
              entityKey={buildingId}
              fieldName="buildingId"
              conceptId="buildings"
              variant="card"
            />
          ) : (
            <span>building</span>
          )}
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: COLORS.inkSubtle }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.ink, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

export interface TileUnlockProps {
  tileId: string;
}

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
      <h2 className="wiki-section-heading mb-2">How to unlock</h2>

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
            aria-label={`Go to ${methodName}`}
            title={`Go to ${methodName}`}
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
