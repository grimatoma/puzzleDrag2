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
} from "./data.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";

export const viewKey = "boons";

// Tabbing by zone-type keeps the catalog reasonable on small screens.
const TYPE_LABELS = { farm: "Farm", mine: "Mine", harbor: "Harbor" };
const PATH_LABELS = { coexist: "Coexist", driveout: "Drive Out" };
const PATH_COLOR = {
  coexist: { bg: "#dfeecd", border: "#6a9a3a", text: "#1f3a10" },
  driveout: { bg: "#e4ddd0", border: "#9a8a6a", text: "#3a2715" },
};

function CheckGlyph({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CostBadge({ cost }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border" style={{ background: "#f2d98a", borderColor: "#b09a50", color: "#6a4f10" }}>
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
    </span>
  );
}

function BoonCard({ state, dispatch, boon }) {
  const owned = boonOwned(state, boon.id);
  const unlocked = boonIsUnlocked(state, boon);
  const canBuy = !owned && unlocked && canAffordBoon(state, boon);
  const color = PATH_COLOR[boon.catalogKey?.split("_")[1]] ?? PATH_COLOR.coexist;
  return (
    <div
      className="rounded-xl border-2 p-3 flex flex-col gap-1"
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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border" style={{ background: "#a8d4a0", borderColor: "#3a7a1a", color: "#1f3a10" }}>
            <CheckGlyph size={10} />
            Owned
          </span>
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
    </div>
  );
}

export default function BoonScreen({ state, dispatch }) {
  const [type, setType] = useState("farm");
  const coexistList = BOONS[`${type}_coexist`] ?? [];
  const driveoutList = BOONS[`${type}_driveout`] ?? [];
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: "linear-gradient(180deg, #f4ecd8 0%, #e2cfa6 100%)" }}>
      <div className="max-w-[760px] mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-[22px] text-[#3a2715] flex items-center gap-2">
              <Icon iconKey="ui_star" size={22} /> Boons
            </div>
            <div className="text-[12px] text-[#6a4b31]">Spend Embers (Coexist) or Core Ingots (Drive Out) on per-path perks earned from facing keepers.</div>
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
        <div className="flex items-center gap-3 mb-3 text-[13px] font-bold text-[#3a2715]">
          <span>You hold:</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border" style={{ background: "#f2d98a", borderColor: "#b09a50" }}>
            <DesignIcon iconKey="design.currency.ember" size={14} />
            {state.embers ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border" style={{ background: "#cdd1d4", borderColor: "#8a8f95" }}>
            <DesignIcon iconKey="design.currency.ingot" size={14} />
            {state.coreIngots ?? 0}
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
                color: type === k ? "white" : "#3a2715",
                border: type === k ? "2px solid #7a4f10" : "2px solid #c5a87a",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="font-bold text-[14px] text-[#1f3a10]">{PATH_LABELS.coexist}</div>
            {coexistList.map((b) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_coexist` }} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="font-bold text-[14px] text-[#3a2715]">{PATH_LABELS.driveout}</div>
            {driveoutList.map((b) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_driveout` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
