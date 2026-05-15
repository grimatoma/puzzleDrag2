import { MAGIC_TOOLS } from "./data.js";
import { locBuilt } from "../../locBuilt.js";

export const viewKey = "portal";

// Magic tools that auto-apply when used (no board tile selection needed)
const AUTO_APPLY_TOOLS = new Set(["hourglass", "magic_seed", "magic_fertilizer"]);

export default function PortalScreen({ state, dispatch }) {
  const portalBuilt = !!locBuilt(state).portal;
  const influence = state.influence ?? 0;
  const tools = state.tools ?? {};

  return (
    <div className="hl-panel hl-panel--arcane">
      {/* Header */}
      <div className="hl-panel-header">
        <span className="hl-panel-title">🔮 Magic Portal</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >
          ✕
        </button>
      </div>

      {/* Influence display */}
      {portalBuilt && (
        <div className="px-3 py-1.5 flex-shrink-0 border-b border-[#8a6aa8]/40">
          <span className="text-[12px] font-bold text-on-panel">✨ Influence: {influence}</span>
        </div>
      )}

      {!portalBuilt ? (
        <div className="flex-1 grid place-items-center px-4">
          <p className="hl-empty">
            Build the Magic Portal in town to unlock summoning.
          </p>
        </div>
      ) : (
        <div className="hl-panel-body p-2">
          <div className="flex flex-col gap-2">
            {MAGIC_TOOLS.map((tool) => {
              const count = tools[tool.id] ?? 0;
              const canSummon = influence >= tool.influenceCost;
              const canUse = count > 0;
              const isAutoApply = AUTO_APPLY_TOOLS.has(tool.id);

              return (
                <div
                  key={tool.id}
                  className="hl-card p-3 gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="hl-card-title text-[12px]">{tool.name}</span>
                      <span className="text-[10px] text-on-panel-dim leading-tight">{tool.effect}</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-panel-dim flex-shrink-0">×{count}</span>
                  </div>

                  <div className="flex gap-2">
                    {/* Summon button */}
                    <button
                      disabled={!canSummon}
                      onClick={() => dispatch({ type: "SUMMON_MAGIC_TOOL", payload: { id: tool.id } })}
                      className={`flex-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border-2 transition-colors ${
                        canSummon
                          ? "bg-[#7a4ac8] border-[#9a7ac8] text-white hover:bg-[#8a5ad8]"
                          : "bg-[#2a1a4a] border-[#5a4a7a] text-[#7a6a9a] cursor-not-allowed"
                      }`}
                    >
                      Summon ({tool.influenceCost}✨)
                    </button>

                    {/* Use button */}
                    <button
                      disabled={!canUse}
                      onClick={() => dispatch({ type: "USE_TOOL", payload: { id: tool.id } })}
                      className={`flex-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border-2 transition-colors ${
                        canUse
                          ? "bg-[#4a8a3a] border-[#6aaa5a] text-white hover:bg-[#5a9a4a]"
                          : "bg-[#2a1a4a] border-[#5a4a7a] text-[#7a6a9a] cursor-not-allowed"
                      }`}
                    >
                      {isAutoApply ? "Use" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
