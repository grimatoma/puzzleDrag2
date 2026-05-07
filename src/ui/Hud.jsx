import { SEASONS, MAX_TURNS } from "../constants.js";
import { hex } from "../utils.js";
import { xpForLevel } from "../state.js";
import { WEATHER_META } from "../features/boss/slice.js";

// Mechanical effect active each calendar season (seasonsCycled % 4)
export const SEASON_EFFECTS = [
  "🌱 +20% harvest",  // Spring
  "☀️ 2× order pay",  // Summer
  "🍂 2× upgrades",   // Autumn
  "❄️ 4+ chain min",  // Winter
];

function Pill({ children, className = "" }) {
  return (
    <div className={`bg-[#f6efe0] border-2 border-[#b28b62] rounded-full px-3 py-1 flex items-center gap-1.5 text-[#6a4b31] ${className}`}>{children}</div>
  );
}

function WeatherChip({ weather }) {
  if (!weather) return null;
  const key = weather?.key ?? weather ?? null;
  if (!key || key === "none") return null;
  const meta = WEATHER_META[key];
  if (!meta) return null;
  return (
    <div
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-white flex-shrink-0"
      style={{ background: meta.color || "#3a6b8a", fontSize: 10, fontWeight: "bold" }}
      title={meta.description || meta.desc || ""}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </div>
  );
}

function SeasonBar({ season, turnsUsed, turnsLeft, calendarSeason }) {
  return (
    <div className="bg-[#faf0dd] border-2 border-[#b28b62] rounded-full pl-3 pr-2 py-0.5 flex items-center gap-2 min-w-0 flex-1 max-w-[540px]">
      <div className="flex flex-col items-start">
        <div className="text-[#6a4b31] font-bold text-[12px] landscape:max-[1024px]:text-[10px] whitespace-nowrap leading-tight">{season.name}</div>
        <div className="text-[10px] landscape:max-[1024px]:text-[8px] text-[#d6612a] font-bold whitespace-nowrap leading-tight">{SEASON_EFFECTS[calendarSeason ?? 0]}</div>
      </div>
      <div className="flex gap-1 flex-1 justify-center min-w-0">
        {Array.from({ length: MAX_TURNS }).map((_, i) => {
          const filled = i < turnsUsed;
          const current = i === turnsUsed;
          return (
            <div
              key={i}
              className={`w-2.5 h-2.5 landscape:max-[1024px]:w-2 landscape:max-[1024px]:h-2 rounded-full border flex-shrink-0 ${filled ? "border-transparent" : "border-[#8a6a3a]"} transition-all`}
              style={{
                backgroundColor: filled ? hex(season.fill) : "#fff",
                boxShadow: current ? "0 0 0 2px rgba(255,122,0,.55)" : "none",
                transform: filled ? "scale(1.05)" : "none",
              }}
            />
          );
        })}
      </div>
      <div className="text-[#6a4b31] font-bold text-[12px] landscape:max-[1024px]:text-[10px] whitespace-nowrap pl-1 border-l border-[#b28b62] ml-1" data-testid="turns-left">{turnsLeft} left</div>
    </div>
  );
}

// ─── Larder progress widget (task 2.5) ───────────────────────────────────────
// Visible once flags.festival_announced is true. Shows 5 progress bars
// (hay, wheat, grain, berry, log) toward the 50-each win threshold.

const LARDER_RESOURCES = [
  { key: "hay",   icon: "🌾", label: "Hay" },
  { key: "wheat", icon: "𓂃", label: "Wheat" },
  { key: "grain", icon: "✿", label: "Grain" },
  { key: "berry", icon: "◉", label: "Berry" },
  { key: "log",   icon: "🪵", label: "Log" },
];

function LarderWidget({ inventory }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LARDER_RESOURCES.map(({ key, icon }) => {
        const amt = Math.min(50, inventory[key] ?? 0);
        const pct = (amt / 50) * 100;
        const done = amt >= 50;
        return (
          <div key={key} className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] leading-none">{icon}</span>
            <div className="w-10 h-2 rounded-full bg-[#3a2715] border border-[#b28b62] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  background: done ? "#ffd34c" : "#a8431a",
                }}
              />
            </div>
            <span className="text-[9px] font-bold text-[#f8e7c6] leading-none">{amt}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Hud({ state, dispatch }) {
  const { coins, level, xp, turnsUsed, built, view, seasonsCycled } = state;
  const onBoard = view === "board";
  const calendarSeason = (seasonsCycled || 0) % 4;
  const season = SEASONS[calendarSeason];
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const turnsLeft = MAX_TURNS - turnsUsed;
  const buildingCount = Object.keys(built || {}).length;
  const festivalAnnounced = !!state.story?.flags?.festival_announced;
  const isWon = !!state.story?.flags?.isWon;
  const sandbox = !!state.story?.sandbox;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#5b3b20] border-b-2 border-[#2a1d0f] text-[#6a4b31] flex-wrap" data-testid="hud">
      <button
        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "menu" })}
        className="w-8 h-8 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[18px] flex-shrink-0"
        data-testid="menu-btn"
        aria-label="Menu"
      >≡</button>
      {/* Sandbox banner — shown after winning */}
      {(isWon || sandbox) && (
        <div className="bg-[#ffd34c] border-2 border-[#b28b62] rounded-full px-3 py-0.5 text-[#3a2a0e] font-bold text-[11px] flex-shrink-0">
          Sandbox Mode
        </div>
      )}
      {!onBoard && (
        <Pill>
          <span className="w-5 h-5 rounded-full bg-[#ffc239] grid place-items-center text-[#7a5638] text-[12px] font-bold leading-none">$</span>
          <span className="font-bold text-[15px]" data-testid="coins">{coins.toLocaleString()}</span>
        </Pill>
      )}
      {!onBoard && (
        <Pill>
          <span className="font-bold text-[14px]">⌂</span>
          <span className="font-bold text-[14px]" data-testid="buildings">{buildingCount}</span>
        </Pill>
      )}
      {onBoard && <SeasonBar season={season} turnsUsed={turnsUsed} turnsLeft={turnsLeft} calendarSeason={calendarSeason} />}
      {/* Weather chip — visible on board view when weather is active and no boss overlay covering it */}
      {onBoard && !state.boss && <WeatherChip weather={state.weather} />}
      {/* Larder progress bars — visible when festival announced, on board view */}
      {onBoard && festivalAnnounced && !isWon && (
        <div className="flex-shrink-0">
          <LarderWidget inventory={state.inventory || {}} />
        </div>
      )}
      {!onBoard && (
        <div className="ml-auto flex items-center gap-1.5">
          <div className="bg-[#f6efe0] border-2 border-[#b28b62] rounded-full h-[26px] w-[110px] landscape:max-[1024px]:h-[20px] landscape:max-[1024px]:w-[80px] relative overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ff8b25] to-[#ffb347] transition-[width] duration-300" style={{ width: `${xpPct}%` }} />
            <div className="absolute inset-0 grid place-items-center text-[11px] landscape:max-[1024px]:text-[9px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
              {xp} / {xpNeed}
            </div>
          </div>
          <div className="w-9 h-9 landscape:max-[1024px]:w-7 landscape:max-[1024px]:h-7 rounded-full bg-[#bb3b2f] border-[3px] border-[#ffe2a3] grid place-items-center text-white font-bold text-[16px] landscape:max-[1024px]:text-[12px]">
            {level}
          </div>
        </div>
      )}
    </div>
  );
}
