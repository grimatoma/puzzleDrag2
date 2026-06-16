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
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import ActionCard from "../../ui/primitives/ActionCard.jsx";
import { RewardChip } from "../../ui/primitives/Chip.jsx";

export const viewKey = "boons";

// Tabbing by zone-type keeps the catalog reasonable on small screens.
const TYPE_LABELS: Record<string, string> = { farm: "Farm", mine: "Mine", harbor: "Harbor" };
const PATH_LABELS: Record<string, string> = { coexist: "Coexist", driveout: "Drive Out" };
const PATH_FLAVOR: Record<string, string> = {
  coexist: "Make peace with what stirs in the wild — strength through understanding.",
  driveout: "Meet the threat with iron. Power claimed by force.",
};

interface PathColor { bg: string; border: string; text: string }
const PATH_COLOR: Record<string, PathColor> = {
  coexist: { bg: "var(--path-coexist-bg)", border: "var(--path-coexist-edge)", text: "var(--path-coexist-ink)" },
  driveout: { bg: "var(--path-driveout-bg)", border: "var(--path-driveout-edge)", text: "var(--ink)" },
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
    <RewardChip className="text-micro">
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
  const effectKey = boon.effect?.type === "coin_gain_mult"
    ? "boon_coin_mult"
    : boon.effect?.type === "bond_gain_mult"
      ? "boon_bond_mult"
      : null;
  return (
    <ActionCard
      className="gap-1"
      style={{
        background: owned ? "var(--path-owned-bg)" : color.bg,
        borderColor: owned ? "var(--path-owned-edge)" : color.border,
        color: color.text,
        opacity: !unlocked ? 0.55 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {effectKey && hasIcon(effectKey) && (
            <IconCanvas iconKey={effectKey} size={20} background={null} rounded={false} title={boon.effect?.type} className="flex-shrink-0" />
          )}
          <span className="font-bold text-body">{boon.name}</span>
        </div>
        {owned ? (
          <RewardChip className="text-micro bg-[var(--path-owned-chip-bg)] border-[var(--path-owned-edge)] text-[var(--path-owned-ink)]">
            <CheckGlyph size={10} />
            Owned
          </RewardChip>
        ) : (
          <CostBadge cost={boon.cost} />
        )}
      </div>
      <div className="text-caption leading-snug">{boon.desc}</div>
      {!owned && (
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => canBuy && dispatch({ type: "BOON/PURCHASE", payload: { id: boon.id } })}
          className="self-end mt-1 rounded-lg px-3 py-1 font-bold text-caption transition-colors disabled:cursor-not-allowed"
          style={{
            background: canBuy ? "linear-gradient(to bottom, var(--btn-gold-top), var(--btn-gold-bot))" : "#a09078",
            color: "white",
            border: canBuy ? "2px solid var(--btn-gold-edge)" : "2px solid #6a5a3a",
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
            className="rounded-lg px-3 py-1.5 font-bold text-caption text-white"
            style={{ background: "var(--btn-earth-bg)", border: "2px solid var(--btn-earth-edge)" }}
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
                background: type === k ? "var(--btn-gold-top)" : "#efe4cc",
                color: type === k ? "white" : "var(--ink)",
                border: type === k ? "2px solid var(--btn-gold-edge)" : "2px solid #c5a87a",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div>
              <div className="hl-heading flex items-center gap-1.5">
                {hasIcon("boon_branch_coexist") && (
                  <IconCanvas iconKey="boon_branch_coexist" size={20} background={null} rounded={false} title={PATH_LABELS.coexist} />
                )}
                {PATH_LABELS.coexist}
              </div>
              <div className="text-[11px] italic leading-snug text-on-panel-dim mt-0.5">{PATH_FLAVOR.coexist}</div>
            </div>
            {coexistList.map((b: BoonDef) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_coexist` }} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="hl-heading flex items-center gap-1.5">
                {hasIcon("boon_branch_drive_out") && (
                  <IconCanvas iconKey="boon_branch_drive_out" size={20} background={null} rounded={false} title={PATH_LABELS.driveout} />
                )}
                {PATH_LABELS.driveout}
              </div>
              <div className="text-[11px] italic leading-snug text-on-panel-dim mt-0.5">{PATH_FLAVOR.driveout}</div>
            </div>
            {driveoutList.map((b: BoonDef) => (
              <BoonCard key={b.id} state={state} dispatch={dispatch} boon={{ ...b, catalogKey: `${type}_driveout` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
