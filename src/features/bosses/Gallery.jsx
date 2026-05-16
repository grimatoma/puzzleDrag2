import { BOSSES } from "./data.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";

const SEASON_ACCENT = {
  spring: "#5daa35",
  summer: "#e3a92f",
  autumn: "#d9792d",
  winter: "#3a82c4",
};

export default function BossGallery({ state }) {
  const flags = state?.story?.flags ?? {};
  return (
    <div className="flex flex-col gap-3">
      <p className="hl-empty !py-1 !text-left">
        Five seasonal foes test the vale across the year. Each demands a tribute and warps the board while present.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {BOSSES.map((boss) => {
          const portraitKey = `boss_${boss.id}`;
          const defeated = flags[`${boss.id}_defeated`];
          const active = flags[`${boss.id}_active`];
          const accent = SEASON_ACCENT[boss.season] || "#a8431a";
          return (
            <div
              key={boss.id}
              className="hl-card !flex-row gap-3"
              style={{
                borderColor: active ? "#ff7a00" : accent,
                opacity: defeated ? 0.85 : 1,
                boxShadow: active ? "0 0 14px rgba(255,122,0,0.4)" : "none",
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${accent}`,
                  background: "rgba(0,0,0,0.45)",
                  flexShrink: 0,
                  filter: defeated ? "grayscale(0.4) opacity(0.85)" : "none",
                }}
              >
                {hasIcon(portraitKey) ? (
                  <IconCanvas iconKey={portraitKey} size={76} />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[36px]">?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="hl-card-title">
                    {boss.name}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ background: accent, color: "#fff" }}
                  >
                    {boss.season}
                  </span>
                  {defeated && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#5a8a26] text-white">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Defeated
                    </span>
                  )}
                  {active && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#ff7a00] text-white animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <div className="hl-card-meta mt-1 leading-snug">
                  {boss.description}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className="hl-cost-tag"
                    style={{ background: "rgba(214,97,42,0.16)", color: "#8a4a26", borderColor: "rgba(214,97,42,0.45)" }}
                  >
                    Tribute: {boss.target.amount} {boss.target.resource}
                  </span>
                  <span
                    className="hl-cost-tag italic"
                    style={{ background: "rgba(168,67,26,0.14)", color: "#7a3a1a", borderColor: "rgba(168,67,26,0.35)" }}
                  >
                    {boss.modifierDescription}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
