import { SEASONS } from "../constants.js";
import { hex } from "../utils.js";
import { xpForLevel } from "../state.js";
import { seasonIndexInSession, hearthTokenCount } from "../features/zones/data.js";
import { locBuilt } from "../locBuilt.js";
import Icon from "./Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import ProgressTrack from "./primitives/ProgressTrack.jsx";

// Phase 7 — calendar season effects were removed. Keeping the export as an
// empty list so any lingering imports compile to no-ops; prefer deleting the
// import entirely in future cleanup.
export const SEASON_EFFECTS = ["", "", "", ""];

// Dev/Balance buttons are gated to URL `?debug=1` or Vite's dev-only mode so
// they don't ship to players (Vol I #01 — Balance Manager opens a new tab,
// players will tap it).
function devModeEnabled() {
  if (import.meta.env?.DEV) return true;
  if (typeof window === "undefined") return false;
  try { return new URLSearchParams(window.location.search).has("debug"); }
  catch { return false; }
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
        <Pill size="md" title="Kingdom currencies — Embers (Coexist), Core Ingots (Drive Out), Gems (timer skip)">
          {embers > 0 && <span className="flex items-center gap-1"><Icon iconKey="ui_ember" size={14} />{embers}</span>}
          {ingots > 0 && <span className="flex items-center gap-1"><Icon iconKey="ui_ingot" size={14} />{ingots}</span>}
          {gems > 0 && <span className="flex items-center gap-1"><Icon iconKey="ui_gem" size={14} />{gems}</span>}
        </Pill>
      )}
      {tokens > 0 && (
        <Pill size="md" title="Hearth-Tokens — collect all 3 (farm + mine + harbor) to open the Old Capital">
          <Icon iconKey="ui_hearth_token" size={14} />
          <span className="tabular-nums">{tokens}/3</span>
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
  // Tide is high → indigo (cool, full); low → ember (warm, drained).
  return (
    <Pill
      tone={isHigh ? "indigo" : "ember"}
      variant="solid"
      size="sm"
      leading={<Icon iconKey={iconKey} size={12} className="opacity-90" />}
      title={`Tide flips in ${turnsUntilFlip} turn${turnsUntilFlip === 1 ? "" : "s"}.`}
      className="flex-shrink-0"
    >
      <span>{label}</span>
      <span className="opacity-70">·{turnsUntilFlip}</span>
    </Pill>
  );
}

function SeasonBar({ season, turnsUsed, turnsLeft, turnBudget }) {
  const pipCount = Math.max(1, turnBudget | 0);
  return (
    <div className="bg-[#faf0dd] border-2 border-[var(--iron)] rounded-full pl-3 pr-2 py-0.5 flex items-center gap-2 min-w-0 flex-1 max-w-[540px]">
      <div className="flex flex-col items-start">
        <div className="text-[var(--ink-warm)] font-bold text-[12px] landscape:max-[1024px]:text-[10px] whitespace-nowrap leading-tight">{season.name}</div>
      </div>
      <div className="flex gap-1 flex-1 justify-center min-w-0" role="progressbar" aria-valuemin={0} aria-valuemax={pipCount} aria-valuenow={turnsUsed} aria-label="Turns used">
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
      <div className="text-[var(--ink-warm)] font-bold text-[12px] landscape:max-[1024px]:text-[10px] whitespace-nowrap pl-1 border-l border-[var(--iron)] ml-1 tabular-nums" data-testid="turns-left">{turnsLeft} left</div>
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
  // Vol II §02 — the 9px label was sub-perceptual on standard DPR. Bumped to
  // 11px tabular-nums so the count reads at arm's length.
  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-label="Larder progress toward festival target">
      {LARDER_RESOURCES.map(({ key, iconKey, label }) => {
        const amt = Math.min(50, inventory[key] ?? 0);
        const pct = (amt / 50) * 100;
        const done = amt >= 50;
        return (
          <div key={key} className="flex items-center gap-1 min-w-0" title={`${label}: ${amt}/50`}>
            <Icon iconKey={iconKey} size={14} />
            <div className="w-10 h-2 rounded-full bg-[var(--bark-shade)] border border-[var(--iron)] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  background: done ? "var(--gold-amber)" : "var(--ember-deep)",
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-[var(--parchment-soft)] leading-none tabular-nums">{amt}</span>
          </div>
        );
      })}
    </div>
  );
}

function DevButton({ title, iconKey, onClick }) {
  // 28×28 visual circle inside a 44×44 hit area (Vol II §02 tap-target floor).
  return (
    <button
      onClick={onClick}
      className="relative grid place-items-center flex-shrink-0"
      style={{ width: 44, height: 44 }}
      title={title}
      aria-label={title}
    >
      <span className="w-7 h-7 rounded-lg bg-[var(--bark)] border-2 border-[var(--iron-deep)] grid place-items-center">
        <Icon iconKey={iconKey} size={14} />
      </span>
    </button>
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
  const builtAtLoc = locBuilt(state);
  const buildingCount = Object.keys(builtAtLoc).filter((k) => k !== "_plots").length;
  const festivalAnnounced = !!state.story?.flags?.festival_announced;
  const isWon = !!state.story?.flags?.isWon;
  const sandbox = !!state.story?.sandbox;
  const showDevButtons = devModeEnabled();
  // Vol I #02 — Three explicit zones (left chrome / center context / right
  // status). Each zone owns one job:
  //   left   = identity & shell controls (menu, sandbox tag, dev escape hatches)
  //   center = the player's current focus (SeasonBar on the board; coin chip in town)
  //   right  = run/season status (tide + larder on board; XP + level in town)
  // The wrapper is no longer `flex-wrap`: zones can each wrap internally if
  // they overflow, but the structural row count stays 1 down to ~360px.
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-[var(--bark-mid)] border-b-2 border-[#2a1d0f] text-[var(--ink-warm)]"
      data-testid="hud"
    >
      {/* ── Left zone ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        {/* Menu — 32px visual disc inside a 44×44 hit area (Vol II §02). */}
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "menu" })}
          className="relative grid place-items-center flex-shrink-0"
          style={{ width: 44, height: 44 }}
          data-testid="menu-btn"
          aria-label="Menu"
        >
          <span className="w-8 h-8 rounded-lg bg-[var(--paper)] border-2 border-[var(--iron)] grid place-items-center text-[var(--ink-warm)] font-bold text-[18px]">≡</span>
        </button>
        {(isWon || sandbox) && (
          <Pill tone="gold" variant="solid" size="sm" className="flex-shrink-0">Sandbox</Pill>
        )}
        {showDevButtons && (
          <>
            <DevButton title="Debug tools" iconKey="ui_devtools" onClick={() => dispatch({ type: "SETTINGS/OPEN_DEBUG" })} />
            <DevButton title="Balance Manager" iconKey="ui_scale" onClick={() => { window.open(`${import.meta.env.BASE_URL}b/`, "_blank", "noopener,noreferrer"); }} />
          </>
        )}
      </div>

      {/* ── Center zone ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
        {onBoard ? (
          <SeasonBar season={season} turnsUsed={turnsUsed} turnsLeft={turnsRemaining} turnBudget={turnBudget || 1} />
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Pill size="md" leading={<Icon iconKey="ui_coin" size={18} />}>
              <span className="font-bold text-[15px] tabular-nums" data-testid="coins">{coins.toLocaleString()}</span>
            </Pill>
            <Pill size="md" leading={<Icon iconKey="ui_building" size={16} />}>
              <span className="font-bold text-[14px] tabular-nums" data-testid="buildings">{buildingCount}</span>
            </Pill>
            <MetaPills state={state} />
          </div>
        )}
      </div>

      {/* ── Right zone ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onBoard && state.biomeKey === "fish" && <TideChip fish={state.fish} />}
        {onBoard && festivalAnnounced && !isWon && (
          <LarderWidget inventory={state.inventory || {}} />
        )}
        {!onBoard && (
          <>
            <ProgressTrack
              value={xp}
              max={xpNeed}
              style="bar"
              size="sm"
              tone="ember"
              showValue="inside"
              width={110}
              ariaLabel={`Experience ${xp} of ${xpNeed}`}
              className="landscape:max-[1024px]:!w-[80px]"
            />
            <div className="w-9 h-9 landscape:max-[1024px]:w-7 landscape:max-[1024px]:h-7 rounded-full bg-[#bb3b2f] border-[3px] border-[#ffe2a3] grid place-items-center text-white font-bold text-[16px] landscape:max-[1024px]:text-[12px] tabular-nums" aria-label={`Level ${level}`}>
              {level}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
