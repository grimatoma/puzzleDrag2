import { SEASONS } from "../constants.js";
import { xpForLevel } from "../state.js";
import { seasonIndexInSession, hearthTokenCount } from "../features/zones/data.js";
import LegacyIcon from "./Icon.jsx";
import Icon from "./primitives/Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import Popover from "./primitives/Popover.jsx";
import { useEffect, useRef } from "react";
import { useCountUp } from "./primitives/useCountUp.js";
import { useReceiptChips } from "./primitives/useReceiptChips.js";
import { setCoinAnchorEl } from "./rewardEvents.js";
import { SeasonIndicator } from "./puzzleBoard.jsx";

export const SEASON_EFFECTS = ["", "", "", ""];

const VIEW_LABELS = {
  town: "Menu",
  board: "Menu",
  crafting: "Crafting",
  inventory: "Inventory",
  orders: "Orders",
  quests: "Quests",
  townsfolk: "Townsfolk",
  chronicle: "Chronicle",
  tileCollection: "Tiles",
  portal: "Portal",
  achievements: "Trophies",
  cartography: "Map",
  charter: "Charter",
  boons: "Boons",
  castle: "Castle",
  bosses: "Foes",
  decorations: "Decorations",
};

function TideContent({ fish }) {
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

function TideChip({ fish }) {
  if (!fish) return null;
  const tide = fish.tide ?? "high";
  const tideTurn = fish.tideTurn ?? 0;
  const turnsUntilFlip = Math.max(0, 3 - tideTurn);
  const isHigh = tide === "high";
  const label = isHigh ? "High Tide" : "Low Tide";
  const iconKey = isHigh ? "ui_water" : "fish_pearl";
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

function CurrencyContent({ state }) {
  const coins = state.coins ?? 0;
  const embers = state.embers ?? 0;
  const ingots = state.coreIngots ?? 0;
  const gems = state.gems ?? 0;
  const tokens = hearthTokenCount(state);
  const rows = [
    { iconKey: "design.currency.coin",          label: "Coins",         value: coins.toLocaleString(), show: true },
    { iconKey: "design.currency.ember",         label: "Embers",        value: embers,                 show: embers > 0 },
    { iconKey: "design.currency.ingot",         label: "Core Ingots",   value: ingots,                 show: ingots > 0 },
    { iconKey: "design.currency.gem",           label: "Gems",          value: gems,                   show: gems > 0 },
    { iconKey: "design.currency.hearth-token",  label: "Hearth-Tokens", value: `${tokens}/3`,          show: tokens > 0 },
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

function DevButton({ title, iconKey, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-bg-dark border-2 border-iron-deep grid place-items-center flex-shrink-0"
      title={title}
      aria-label={title}
    ><LegacyIcon iconKey={iconKey} size={14} /></button>
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

export function Hud({ state, dispatch, inventorySearchOpen, onInventorySearchToggle }) {
  const { coins, level, xp, turnsUsed, view } = state;
  const onBoard = view === "board";
  const turnBudget = state.farmRun?.turnBudget ?? 0;
  const turnsRemaining = state.farmRun?.turnsRemaining ?? Math.max(0, turnBudget - (turnsUsed ?? 0));
  const seasonIdx = onBoard ? seasonIndexInSession(turnsUsed ?? 0, turnBudget || 1) : 0;
  const season = SEASONS[seasonIdx];
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const { display: coinsDisplay, pulse: coinsPulse, pulseKey: coinsPulseKey } = useCountUp(coins ?? 0);
  const { pulse: levelPulse, pulseKey: levelPulseKey } = useCountUp(level ?? 1);
  const coinChips = useReceiptChips(coins ?? 0);
  const coinAnchorRef = useRef(null);
  useEffect(() => {
    setCoinAnchorEl(coinAnchorRef.current);
    return () => setCoinAnchorEl(null);
  });
  const isWon = !!state.story?.flags?.isWon;
  const sandbox = !!state.story?.sandbox || isWon;
  const settlementName = state.settlement?.name ?? "Hearthwood Vale";
  const showTide = state.biomeKey === "fish" && (onBoard || view === "town");

  const seasonAccent = onBoard
    ? `#${(season.fill ?? 0xe2b24a).toString(16).padStart(6, "0")}`
    : "var(--ember)";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-paper border-b border-iron text-ink relative"
      data-testid="hud"
      style={{ boxShadow: `inset 0 -3px 0 ${seasonAccent}55` }}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: onBoard ? "leaveBoard" : "menu" })}
          className="w-8 h-8 rounded-lg bg-paper-soft border-2 border-iron grid place-items-center text-ink-mid font-bold text-large flex-shrink-0"
          data-testid="menu-btn"
          aria-label={onBoard ? "Leave board" : "Menu"}
          title={onBoard ? `Leave board · ${settlementName}` : settlementName}
        >{onBoard ? "←" : "≡"}</button>
        <span className="text-caption font-semibold text-ink whitespace-nowrap">
          {VIEW_LABELS[view] ?? "Menu"}
          {sandbox && <span className="italic font-normal"> · sandbox</span>}
        </span>
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
            bespoke={!!state.settings?.bespokeSeasonWidget}
          />
        )}
        {showTide && <TideChip fish={state.fish} />}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <DevButton title="Debug tools" iconKey="ui_devtools" onClick={() => dispatch({ type: "SETTINGS/OPEN_DEBUG" })} />
        <DevButton title="Balance Manager" iconKey="ui_scale" onClick={() => { window.open(`${import.meta.env.BASE_URL}b/`, "_blank", "noopener,noreferrer"); }} />
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
                    variant="solid"
                    size="sm"
                    leading={<Icon iconKey="design.currency.coin" size={14} />}
                    title="Currencies"
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
              {coinChips.map((c) => (
                <span key={c.id} className="reward-chip text-gold-bright text-caption">
                  +{c.delta.toLocaleString()}
                </span>
              ))}
            </div>
            <Pill
              tone="ember"
              variant="solid"
              size="sm"
              title={`Level ${level} · ${xp} / ${xpNeed} XP`}
              className="!px-2 !gap-1.5"
            >
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
}
