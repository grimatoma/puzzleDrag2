import { DECORATIONS } from "./data.js";
import { locBuilt } from "../../locBuilt.js";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { CostChip } from "../../ui/primitives/Chip.jsx";
import type { Dispatch, GameState } from "../../types/state";

export const viewKey = "decorations";

interface Decoration {
  id: string;
  name: string;
  influence: number;
  cost: Record<string, number> & { coins?: number };
}

function canAfford(decor: Decoration, state: GameState): boolean {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv = state.inventory ?? {};
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < (v as number)) return false;
  }
  return true;
}

function DecorationCard({ decor, state, dispatch }: { decor: Decoration; state: GameState; dispatch: Dispatch }) {
  const affordable = canAfford(decor, state);
  const decorations = (locBuilt(state).decorations as Record<string, number> | undefined) ?? {};
  const count = decorations[decor.id] ?? 0;

  return (
    <div className="hl-card !flex-row items-center gap-2 relative" style={{ minHeight: 72 }}>
      {count > 0 && (
        <div className="absolute top-1 right-1 text-[10px] text-on-panel-faint font-bold">×{count}</div>
      )}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="hl-card-title leading-tight">{decor.name}</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(decor.cost).map(([k, v]) => (
            <CostChip key={k}>{v as number} {k === "coins" ? "◉" : k}</CostChip>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold text-[#7a3a8a]">+{decor.influence} influence</span>
        <button
          disabled={!affordable}
          onClick={() => dispatch({ type: "BUILD_DECORATION", payload: { id: decor.id } })}
          className="hl-btn hl-btn--sm hl-btn--go"
        >
          Build
        </button>
      </div>
    </div>
  );
}

export default function DecorationsScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  return (
    <FeaturePanel>
      {/* Decoration list */}
      <FeaturePanel.Body className="!px-2">
        <div className="grid grid-cols-2 portrait:grid-cols-1 gap-2">
          {(Object.values(DECORATIONS) as Decoration[]).map((decor) => (
            <DecorationCard
              key={decor.id}
              decor={decor}
              state={state}
              dispatch={dispatch}
            />
          ))}
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
