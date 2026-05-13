import { SEASONS } from "../constants.js";
import { hex } from "../utils.js";
import { xpForLevel } from "../state.js";
import { seasonIndexInSession, hearthTokenCount } from "../features/zones/data.js";
import { locBuilt } from "../locBuilt.js";
import Icon from "./Icon.jsx";

// Phase 7 — calendar season effects were removed. Keeping the export as an
// empty list so any lingering imports compile to no-ops; prefer deleting the
// import entirely in future cleanup.
export const SEASON_EFFECTS = ["", "", "", ""];

function Pill({ children, className = "", title }) {
  return (
    <div title={title} className={`bg-[#f6efe0] border-2 border-[#b28b62] rounded-full px-3 py-1 flex items-center gap-1.5 text-[#6a4b31] ${className}`}>{children}</div>
  );
}

// Phase 5 — kingdom meta-currencies + Hearth-Token progress, surfaced in the
// town/map HUD (not on the board — irrelevant during a round). Each chip only
// appears once the player actually has some, so a fresh kingdom stays uncluttered.
function MetaPills({ state }) {
  const embers = state.embers ?? 0;
  const ingots = state.coreIngots ?? 0;
  const gems = state.gems ?? 0;
  const tokens = hearthTokenCount(state);
  const hasCurrency = embers > 0 || ingots > 0 || gems > 0;
  if (!hasCurrency && tokens === 0) return null;
  return (
    <>
      {hasCurrency && (
        <Pill title="Kingdom currencies — Embers (Coexist), Core Ingots (Drive Out), Gems (timer skip)">
          {embers > 0 && <span className="font-bold text-[13px]">🔥 {embers}</span>}
          {ingots > 0 && <span className="font-bold text-[13px]"><span className="inline-block w-3 h-3 rounded-[2px] bg-[#8a8f95] border border-[#5a5e62] align-[-1px] mr-0.5" />{ingots}</span>}
          {gems > 0 && <span className="font-bold text-[13px]">💎 {gems}</span>}
        </Pill>
      )}
      {tokens > 0 && (
        <Pill title="Hearth-Tokens — collect all 3 (farm + mine + harbor) to open the Old Capital">
          <span className="font-bold text-[13px]">🏛️ {tokens}/3</span>
        </Pill>
      )}
    </>
  );
}

function TideChip({ fish }) {
  if (!fish) return null;
  const tide = fish.tide ?? "high";
  const tideTurn = fish.tideTurn ?? 0;
  // 3-turn period — show how many turns until the next tide flip.
  const turnsUntilFlip = Math.max(0, 3 - tideTurn);
  const isHigh = tide === "high";
  const label = isHigh ? "High Tide" : "Low Tide";
  const iconKey = isHigh ? "ui_water" : "fish_pearl";
  const bg = isHigh ? "#2a4a6a" : "#5a4838";
  return (
    <div
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-white flex-shrink-0"
      style={{ background: bg, fontSize: 10, fontWeight: "bold" }}
      title={`Tide flips in ${turnsUntilFlip} turn${turnsUntilFlip === 1 ? "" : "s"}.`}
    >
      <Icon iconKey={iconKey} size={12} className="opacity-90" />
      <span>{label}</span>
      <span className="opacity-70">·{turnsUntilFlip}</span>
    </div>
  );
}

function SeasonBar({ season, turnsUsed, turnsLeft, turnBudget }) {
  const pipCount = Math.max(1, turnBudget | 0);
  return (
    <div className="bg-[#faf0dd] border-2 border-[#b28b62] rounded-full pl-3 pr-2 py-0.5 flex items-center gap-2 min-w-0 flex-1 max-w-[540px]">
      <div className="flex flex-col items-start">
        <div className="text-[#6a4b31] font-bold text-[12px] landscape:max-[1024px]:text-[10px] whitespace-nowrap leading-tight">{season.name}</div>
      </div>
      <div className="flex gap-1 flex-1 justify-center min-w-0">
        {Array.from({ length: pipCount }).map((_, i) => {
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
  { key: "grass_hay",   iconKey: "grass_hay", label: "Hay" },
  { key: "grain_wheat", iconKey: "grain_wheat", label: "Wheat" },
  { key: "grain", iconKey: "grain", label: "Grain" },
  { key: "berry", iconKey: "berry", label: "Berry" },
  { key: "wood_log",   iconKey: "wood_log", label: "Log" },
];

function LarderWidget({ inventory }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LARDER_RESOURCES.map(({ key, iconKey }) => {
        const amt = Math.min(50, inventory[key] ?? 0);
        const pct = (amt / 50) * 100;
        const done = amt >= 50;
        return (
          <div key={key} className="flex items-center gap-1 min-w-0">
            <Icon iconKey={iconKey} size={14} />
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

function DevButton({ title, iconKey, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-[#2b2218] border-2 border-[#5a3a20] grid place-items-center flex-shrink-0"
      title={title}
      aria-label={title}
    ><Icon iconKey={iconKey} size={14} /></button>
  );
}

export function Hud({ state, dispatch }) {
  const { coins, level, xp, turnsUsed, view } = state;
  const onBoard = view === "board";
  const turnBudget = state.farmRun?.turnBudget ?? 0;
  const turnsRemaining = state.farmRun?.turnsRemaining ?? Math.max(0, turnBudget - (turnsUsed ?? 0));
  // Phase 7.1 — visual season rotates within the session. Each run cycles
  // Spring -> Winter as turnsUsed grows; the index lands on Spring whenever
  // the player isn't on the board.
  const seasonIdx = onBoard ? seasonIndexInSession(turnsUsed ?? 0, turnBudget || 1) : 0;
  const season = SEASONS[seasonIdx];
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const builtAtLoc = locBuilt(state);
  const buildingCount = Object.keys(builtAtLoc).filter((k) => k !== "_plots").length;
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
      {!onBoard && <MetaPills state={state} />}
      {onBoard && <SeasonBar season={season} turnsUsed={turnsUsed} turnsLeft={turnsRemaining} turnBudget={turnBudget || 1} />}
      {/* Tide chip — visible only on the fish biome */}
      {onBoard && state.biomeKey === "fish" && <TideChip fish={state.fish} />}
      {/* Larder progress bars — visible when festival announced, on board view */}
      {onBoard && festivalAnnounced && !isWon && (
        <div className="flex-shrink-0">
          <LarderWidget inventory={state.inventory || {}} />
        </div>
      )}
      <div className={`${!onBoard ? "ml-auto" : ""} flex items-center gap-1.5 flex-shrink-0`}>
        <DevButton title="Debug tools" iconKey="ui_devtools" onClick={() => dispatch({ type: "SETTINGS/OPEN_DEBUG" })} />
        <DevButton title="Balance Manager" iconKey="ui_scale" onClick={() => { window.open(`${import.meta.env.BASE_URL}b/`, "_blank", "noopener,noreferrer"); }} />
        {!onBoard && (
          <>
            <div className="bg-[#f6efe0] border-2 border-[#b28b62] rounded-full h-[26px] w-[110px] landscape:max-[1024px]:h-[20px] landscape:max-[1024px]:w-[80px] relative overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff8b25] to-[#ffb347] transition-[width] duration-300" style={{ width: `${xpPct}%` }} />
              <div className="absolute inset-0 grid place-items-center text-[11px] landscape:max-[1024px]:text-[9px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
                {xp} / {xpNeed}
              </div>
            </div>
            <div className="w-9 h-9 landscape:max-[1024px]:w-7 landscape:max-[1024px]:h-7 rounded-full bg-[#bb3b2f] border-[3px] border-[#ffe2a3] grid place-items-center text-white font-bold text-[16px] landscape:max-[1024px]:text-[12px]">
              {level}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
