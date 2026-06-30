import { SEASONS } from "../constants.js";
import { XP_PER_LEVEL } from "../features/almanac/data.js";
import { seasonIndexInSession, displayZoneName } from "../features/zones/data.js";
import LegacyIcon from "./Icon.jsx";
import Icon from "./primitives/Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import Popover from "./primitives/Popover.jsx";
import { memo, useEffect, useRef } from "react";
import { useCountUp } from "./primitives/useCountUp.js";
import { useReceiptChips } from "./primitives/useReceiptChips.js";
import { setCoinAnchorEl } from "./rewardEvents.js";
import { SeasonIndicator } from "./puzzleBoard.jsx";
import type { Dispatch, GameState } from "../types/state.js";

export const SEASON_EFFECTS = ["", "", "", ""];

interface FishLike {
  tide?: string;
  tideTurn?: number;
  [key: string]: unknown;
}

function TideContent({ fish }: { fish: FishLike | null | undefined }) {
  const tide = fish?.tide ?? "high";
  const tideTurn = fish?.tideTurn ?? 0;
  const turnsUntilFlip = Math.max(0, 3 - tideTurn);
  const isHigh = tide === "high";
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <div className="text-caption font-semibold text-ink-mid">{isHigh ? "High Tide" : "Low Tide"}</div>
      <div className="text-caption text-ink">
        Flips in <span className="tabular-nums font-semibold">{turnsUntilFlip}</span> turn{turnsUntilFlip === 1 ? "" : "s"}.
      </div>
    </div>
  );
}

export function TideChip({ fish }: { fish: FishLike | null | undefined }) {
  if (!fish) return null;
  const tide = fish.tide ?? "high";
  const tideTurn = fish.tideTurn ?? 0;
  const turnsUntilFlip = Math.max(0, 3 - tideTurn);
  const isHigh = tide === "high";
  const label = isHigh ? "High Tide" : "Low Tide";
  const iconKey = isHigh ? "ui_water" : "tile_special_giant_pearl";
  return (
    <Popover
      density="compact"
      content={<TideContent fish={fish} />}
      anchor={
        <Pill
          interactive
          tone={isHigh ? "indigo" : "slate"}
          variant="solid"
          size="sm"
          leading={<LegacyIcon iconKey={iconKey} size={12} />}
          title={`Tide flips in ${turnsUntilFlip} turn${turnsUntilFlip === 1 ? "" : "s"}.`}
        >
          <span>{label}</span>
          <span className="opacity-70 ml-1 tabular-nums">·{turnsUntilFlip}</span>
        </Pill>
      }
    />
  );
}

function CurrencyContent({ state }: { state: GameState }) {
  const coins = state.coins ?? 0;
  const embers = state.embers ?? 0;
  const ingots = state.coreIngots ?? 0;
  const gems = state.gems ?? 0;
  const h = (state.heirlooms ?? {}) as Record<string, number>;
  const rows: { iconKey: string; label: string; value: string | number; show: boolean }[] = [
    { iconKey: "design.currency.coin", label: "Coins",        value: coins.toLocaleString(), show: true },
    { iconKey: "cur_embers",           label: "Embers",       value: embers,                 show: embers > 0 },
    { iconKey: "cur_core_ingot",       label: "Core Ingots",  value: ingots,                 show: ingots > 0 },
    { iconKey: "cur_gems",             label: "Gems",         value: gems,                   show: gems > 0 },
    { iconKey: "token_hearth_forest",  label: "Forest Token", value: "✓",                    show: (h.heirloomSeed ?? 0) >= 1 },
    { iconKey: "token_hearth_stone",   label: "Stone Token",  value: "✓",                    show: (h.pactIron ?? 0) >= 1 },
    { iconKey: "token_hearth_tide",    label: "Tide Token",   value: "✓",                    show: (h.tidesingerPearl ?? 0) >= 1 },
  ].filter((r) => r.show);
  return (
    <div className="flex flex-col gap-1 min-w-[200px]">
      <div className="text-caption font-semibold text-ink-mid mb-0.5">Treasury</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Icon iconKey={r.iconKey} size={16} />
            <span className="text-body">{r.label}</span>
          </span>
          <span className="tabular-nums font-semibold text-body">{r.value}</span>
        </div>
      ))}
    </div>
  );
}


function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface HudProps {
  state: GameState;
  dispatch: Dispatch;
  inventorySearchOpen: boolean;
  onInventorySearchToggle: (() => void) | undefined;
}

// Memoized: on a chainInfo-only update (separate state in App), `state`/`dispatch`
// and the now-stable callback props keep referential identity, so this skips re-render.
export const Hud = memo(function Hud({ state, dispatch, inventorySearchOpen, onInventorySearchToggle }: HudProps) {
  const { coins, turnsUsed, view } = state;
  const level = state.almanac?.level ?? state.level ?? 1;
  const totalXp = state.almanac?.xp ?? state.xp ?? 0;
  const onBoard = view === "board";
  // farmRun has additional dynamic fields beyond the canonical type (turnBudget).
  const turnBudget = (state.farmRun?.turnBudget as number | undefined) ?? 0;
  const turnsRemaining = state.farmRun?.turnsRemaining ?? Math.max(0, turnBudget - (turnsUsed ?? 0));
  const seasonIdx = onBoard ? seasonIndexInSession(turnsUsed ?? 0, turnBudget || 1) : 0;
  const season = SEASONS[seasonIdx];
  const xpNeed = XP_PER_LEVEL;
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpPct = Math.min(100, (xpInLevel / xpNeed) * 100);
  const { display: coinsDisplay, pulse: coinsPulse, pulseKey: coinsPulseKey } = useCountUp(coins ?? 0);
  const { pulse: levelPulse, pulseKey: levelPulseKey } = useCountUp(level ?? 1);
  const coinChips = useReceiptChips(coins ?? 0);
  const coinAnchorRef = useRef(null);
  useEffect(() => {
    setCoinAnchorEl(coinAnchorRef.current);
    return () => setCoinAnchorEl(null);
  }, []); // setCoinAnchorEl is a stable module fn; ref is set after mount — run once.
  // The settlement name is the player-facing identity of the zone you're in
  // (custom name if set, else the static zone name). It doubles as the Town
  // screen's header label so the header reads "Hearthwood Vale" rather than a
  // generic "Town", and follows you to whichever settlement you're viewing.
  const settlementName = displayZoneName(state);
  const showTide = state.biomeKey === "fish" && (onBoard || view === "town");
  const VIEW_LABELS: Record<string, string> = {
    town: settlementName,
    inventory: "Inventory",
    crafting: "Craft",
    cartography: "Map",
    townsfolk: "Townsfolk",
  };
  const viewLabel = !onBoard ? (VIEW_LABELS[view] ?? null) : null;

  // The HUD's bottom edge carries the current season as a solid, saturated
  // strip — the same per-season hue used on the board frame and season chip,
  // so the season is something you feel at a glance (UX review §C). Off the
  // board it falls back to the ember "action" accent. (The previous code
  // appended `55` alpha to the value, which silently produced invalid CSS for
  // the off-board `var(--ember)` case and a near-invisible 33% strip on board.)
  const SEASON_ACCENTS = [
    "var(--season-spring)",
    "var(--season-summer)",
    "var(--season-fall)",
    "var(--season-winter)",
  ];
  const accentStrip = onBoard ? (SEASON_ACCENTS[seasonIdx] ?? "var(--ember)") : "var(--ember)";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-hud-bg border-b border-iron text-ink relative"
      data-testid="hud"
      style={{ boxShadow: `var(--hud-shadow), inset 0 -4px 0 ${accentStrip}` }}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: onBoard ? "leaveBoard" : "menu" })}
          className="w-8 h-8 rounded-lg bg-paper-soft border-2 border-iron flex items-center justify-center text-ink-mid font-bold text-large flex-shrink-0 leading-none"
          data-testid="menu-btn"
          aria-label={onBoard ? "Leave board" : "Menu"}
          title={onBoard ? `Leave board · ${settlementName}` : settlementName}
        >{onBoard ? "←" : "≡"}</button>
        {viewLabel && (
          <span
            className="text-large font-bold text-ink leading-none flex-shrink-0"
            style={{ fontFamily: "var(--font-display)" }}
          >{viewLabel}</span>
        )}
        {view === "inventory" && onInventorySearchToggle && (
          <button
            type="button"
            onClick={onInventorySearchToggle}
            aria-pressed={!!inventorySearchOpen}
            aria-label={inventorySearchOpen ? "Close search" : "Search inventory"}
            className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 transition-colors"
            style={inventorySearchOpen
              ? { background: "var(--moss)", border: "2px solid var(--moss)", color: "white" }
              : { background: "var(--paper-soft)", border: "2px solid var(--iron)", color: "var(--ink-mid)" }
            }
          >
            <SearchIcon size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1 justify-center min-w-0 flex-wrap">
        {onBoard && (
          <SeasonIndicator
            turnsUsed={turnsUsed ?? 0}
            turnBudget={turnBudget || 1}
            turnsRemaining={turnsRemaining}
            seasonIdx={seasonIdx}
            seasonName={season.name}
          />
        )}
        {showTide && <TideChip fish={state.fish as FishLike | null | undefined} />}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!onBoard && (
          <>
            <div className="relative" ref={coinAnchorRef}>
              <Popover
                density="rich"
                content={<CurrencyContent state={state} />}
                anchor={
                  <Pill
                    interactive
                    tone="gold"
                    variant="soft"
                    size="sm"
                    leading={<Icon iconKey="design.currency.coin" size={14} />}
                    title="Currencies"
                    className="border border-iron"
                  >
                    <span
                      key={coinsPulseKey}
                      className="tabular-nums"
                      data-testid="coins"
                      data-count-pulse={coinsPulse || undefined}
                    >{coinsDisplay.toLocaleString()}</span>
                  </Pill>
                }
              />
              {coinChips.map((c: { id: number; delta: number }) => (
                <span key={c.id} className="reward-chip text-gold-bright text-caption">
                  +{c.delta.toLocaleString()}
                </span>
              ))}
            </div>
            <Pill
              tone="ember"
              variant="solid"
              size="sm"
              title={`Level ${level} · ${xpInLevel} / ${xpNeed} XP`}
              className="!px-2 !gap-1.5"
            >
              <LegacyIcon iconKey="xp_levelup" size={12} />
              <span
                key={levelPulseKey}
                className="text-caption font-semibold tabular-nums"
                data-count-pulse={levelPulse || undefined}
              >Lv {level}</span>
              <span className="block w-12 h-1.5 rounded-pill bg-bg-dark/60 overflow-hidden">
                <span
                  className="block h-full bg-gold-bright transition-[width] duration-300"
                  style={{ width: `${xpPct}%` }}
                />
              </span>
            </Pill>
          </>
        )}
      </div>
    </div>
  );
});
