import { CASTLE_NEEDS } from "./data.js";
import Icon from "../../ui/Icon.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import type { Dispatch, GameState } from "../../types/state.js";
import { zoneInventory } from "../../state/zoneInventory.js";
import { inventoryQty } from "../../types/inventory.js";

export const viewKey = "castle";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-[#2b2218]/25 overflow-hidden border border-[#b28b62]/50">
      <div
        className="h-full bg-gradient-to-r from-[#c8923a] to-[#f0c068]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface CastleNeedsListProps {
  state: GameState;
  dispatch: Dispatch;
}

function CastleNeedsList({ state, dispatch }: CastleNeedsListProps) {
  const contributed = (state?.castle as { contributed?: Record<string, number> } | undefined)?.contributed ?? {};
  const inventory = zoneInventory(state ?? { inventory: {}, farmRun: null, activeZone: "home", mapCurrent: "home" } as GameState);

  return (
    <div className="hl-well">
      {Object.entries(CASTLE_NEEDS).map(([key, need]) => {
        const value = contributed[key] ?? 0;
        const have = inventoryQty(inventory, need.resource);
        const remaining = Math.max(0, need.target - value);
        // Wired contribute targets — all three needs point at real
        // farm/mine resources: soup (vegetables), meat (herd animals),
        // and coal (mine).
        const wired = true;
        const complete = value >= need.target;
        const canContribute1 = wired && have >= 1 && !complete;
        const canContributeAll = wired && have >= 1 && remaining > 0;
        const allAmount = Math.min(have, remaining);
        return (
          <div key={key} className="hl-card gap-1.5">
            <div className="flex items-center justify-between">
              <span className="hl-card-title flex items-center gap-1">
                <Icon iconKey={need.resource} size={14} title="" />
                {need.label}
              </span>
              <span className="hl-card-meta tabular-nums">{value} / {need.target}</span>
            </div>
            {(need as { flavor?: string }).flavor && (
              <div className="text-[10px] italic leading-snug text-on-panel-dim">{(need as { flavor?: string }).flavor}</div>
            )}
            <ProgressBar value={value} max={need.target} />
            {wired && (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="hl-card-meta">Have: {have}</span>
                <div className="flex gap-1">
                  <button
                    disabled={!canContribute1}
                    onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: 1 } })}
                    className="hl-btn hl-btn--sm hl-btn--go"
                  >
                    Contribute 1
                  </button>
                  {have >= 1 && (
                    <button
                      disabled={!canContributeAll}
                      onClick={() => dispatch({ type: "CASTLE/CONTRIBUTE", payload: { key, amount: allAmount } })}
                      className="hl-btn hl-btn--sm hl-btn--primary"
                    >
                      All ({allAmount})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CastleScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function CastleScreen({ state, dispatch }: CastleScreenProps) {
  const contributed = (state?.castle as { contributed?: Record<string, number> } | undefined)?.contributed ?? {};
  const entries = Object.entries(CASTLE_NEEDS);
  const needsMet = entries.filter(([k, n]) => (contributed[k] ?? 0) >= n.target).length;

  return (
    <FeaturePanel>
      <FeaturePanel.Body className="flex flex-col gap-2">
        <div className="hl-board-head">
          <span className="text-[26px] leading-none flex-shrink-0" aria-hidden>🏰</span>
          <div className="flex-1 min-w-0">
            <div className="hl-board-head__kicker">The Capital</div>
            <div className="hl-board-head__title">The Capital's Call</div>
            <div className="hl-board-head__sub">The old capital asks for its due. Give freely, and be long remembered.</div>
          </div>
          <span className="hl-board-pill">{needsMet}/{entries.length} met</span>
        </div>
        <CastleNeedsList state={state} dispatch={dispatch} />
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
