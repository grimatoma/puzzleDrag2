// Boon-tree screen. Reached from the cartography side panel when the player
// has faced at least one keeper. Shows the catalogs for both keeper paths
// (Coexist + Drive Out); each catalog is gated on the player having set a
// `keeper_<zone>_<path>` flag of that path *somewhere* in their run.

import { useState } from "react";
import {
  BOONS,
  boonIsUnlocked,
  canAffordBoon,
  boonOwned,
  type BoonDef,
  type BoonCost,
  type BoonCatalogKey,
} from "./data.js";
import type { GameState, Dispatch } from "../../types/state.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import ActionCard from "../../ui/primitives/ActionCard.jsx";
import { RewardChip } from "../../ui/primitives/Chip.jsx";

export const viewKey = "boons";

// Tabbing by zone-type keeps the catalog reasonable on small screens.
const TYPE_LABELS: Record<string, string> = { farm: "Farm", mine: "Mine", harbor: "Harbor" };
const PATH_LABELS: Record<string, string> = { coexist: "Coexist", driveout: "Drive Out" };

interface PathColor { bg: string; border: string; text: string }
const PATH_COLOR: Record<string, PathColor> = {
  coexist: { bg: "#dfeecd", border: "#6a9a3a", text: "#1f3a10" },
  driveout: { bg: "#e4ddd0", border: "#9a8a6a", text: "#2b2218" },
};

function CheckGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CostBadge({ cost }: { cost: BoonCost }) {
  return (
    <RewardChip className="text-[11px]">
      {(cost.embers ?? 0) > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <DesignIcon iconKey="design.currency.ember" size={12} />
          {cost.embers}
        </span>
      )}
      {(cost.coreIngots ?? 0) > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <DesignIcon iconKey="design.currency.ingot" size={12} />
          {cost.coreIngots}
        </span>
      )}
    </RewardChip>
  );
}

interface BoonCardProps {
  state: GameState;
  dispatch: Dispatch;
  boon: BoonDef;
}

function BoonCard({ state, dispatch, boon }: BoonCardProps) {
  const owned = boonOwned(state, boon.id);
  const unlocked = boonIsUnlocked(state, boon);
  const canBuy = !owned && unlocked && canAffordBoon(state, boon);
  const pathPart = boon.catalogKey?.split("_")[1] ?? "coexist";
  const color: PathColor = PATH_COLOR[pathPart] ?? PATH_COLOR.coexist;
  return (
    <ActionCard
      className="gap-1"
      style={{
        background: owned ? "#cbe0b8" : color.bg,
        borderColor: owned ? "#3a7a1a" : color.border,
        color: color.text,
        opacity: !unlocked ? 0.55 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-[14px]">{boon.name}</div>
        {owned ? (
          <RewardChip className="text-[10px] bg-[#a8d4a0] border-[#3a7a1a] text-[#1f3a10]">
            <CheckGlyph size={10} />
            Owned
          </RewardChip>
        ) : (
          <CostBadge cost={boon.cost} />
        )}
      </div>
      <div className="text-[12px] leading-snug">{boon.desc}</div>
      {!owned && (
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => canBuy && dispatch({ type: "BOON/PURCHASE", payload: { id: boon.id } })}
          className="self-end mt-1 rounded-lg px-3 py-1 font-bold text-[12px] transition-colors disabled:cursor-not-allowed"
          style={{
            background: canBuy ? "linear-gradient(to bottom, #c8923a, #a06a1a)" : "#a09078",
            color: "white",
            border: canBuy ? "2px solid #7a4f10" : "2px solid #6a5a3a",
            opacity: canBuy ? 1 : 0.85,
          }}
          title={!unlocked ? "Face this path's keeper first" : !canAffordBoon(state, boon) ? "Not enough currency" : `Claim ${boon.name}`}
        >
          {!unlocked ? "Path not chosen yet" : !canAffordBoon(state, boon) ? "Insufficient" : "Claim"}
        </button>
      )}
    </ActionCard>
  );
}

interface BoonScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function BoonScreen({ state, dispatch }: BoonScreenProps) {
  const [type, setType] = useState<string>("farm");
  const s = state as GameState & { embers?: number; coreIngots?: number };
  const coexistList: BoonDef[] = BOONS[`${type}_coexist` as BoonCatalogKey] ?? [];
  const driveoutList: BoonDef[] = BOONS[`${type}_driveout` as BoonCatalogKey] ?? [];
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: "linear-gradient(180deg, #f4ecd8 0%, #e2cfa6 100%)" }}>
      <div className="max-w-[760px] mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="hl-title flex items-center gap-2">
              <Icon iconKey="ui_star" size={22} /> Boons
            </div>
            <div className="hl-text-dim text-caption">Spend Embers (Coexist) or Core Ingots (Drive Out) on per-path perks earned from facing keepers.</div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
            className="rounded-lg px-3 py-1.5 font-bold text-[12px] text-white"
            style={{ background: "#9a724d", border: "2px solid #e6c49a" }}
          >
            ← Back to Town
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3 text-body font-bold text-on-panel">
          <span>You hold:</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border" style={{ background: "#f2d98a", borderColor: "#b09a50" }}>
            <DesignIcon iconKey="design.currency.ember" size={14} />
            {s.embers ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border" style={{ background: "#cdd1d4", borderColor: "#8a8f95" }}>
            <DesignIcon iconKey="design.currency.ingot" size={14} />
            {s.coreIngots ?? 0}
          </span>
        </div>
        <div className="flex gap-1 mb-3">
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className="flex-1 rounded-lg px-2 py-1.5 font-bold text-[13px] transition-colors"
              style={{
                background: type === k ? "#c8923a" : "#efe4cc",
                color: type === k ? "white" : "#2b2218",
                border: type === k ? "2px solid #7a4f10" : "2px solid #c5a87a",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="hl-heading">{PATH_LABELS.coexist}</div>
            {coexistList.map((b: BoonDef) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_coexist` }} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="hl-heading">{PATH_LABELS.driveout}</div>
            {driveoutList.map((b: BoonDef) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_driveout` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
