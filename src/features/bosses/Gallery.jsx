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
      <p className="text-[11px] text-[#7a6248] italic">
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
              className="rounded-xl p-3 flex gap-3"
              style={{
                background: defeated ? "rgba(58,40,20,0.6)" : "rgba(28,12,4,0.65)",
                border: `2px solid ${active ? "#ff7a00" : accent}`,
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
                  <span className="text-[14px] font-bold" style={{ color: "#f8e7c6" }}>
                    {boss.name}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ background: accent, color: "#fff" }}
                  >
                    {boss.season}
                  </span>
                  {defeated && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#5a8a26] text-white">
                      ✓ Defeated
                    </span>
                  )}
                  {active && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#ff7a00] text-white animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[10px] mt-1 leading-snug" style={{ color: "#e2c19b" }}>
                  {boss.description}
                </div>
                <div className="text-[10px] mt-2 flex flex-wrap gap-2">
                  <span
                    className="px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: "rgba(255,122,0,0.18)", color: "#ffae6a", border: "1px solid rgba(255,122,0,0.4)" }}
                  >
                    Tribute: {boss.target.amount} {boss.target.resource}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-md italic"
                    style={{ background: "rgba(168,67,26,0.18)", color: "#f8c894" }}
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
