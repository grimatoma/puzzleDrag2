import { SEASONS } from "../constants.js";
import { xpForLevel } from "../state.js";
import { seasonIndexInSession, hearthTokenCount } from "../features/zones/data.js";
import { locBuilt } from "../locBuilt.js";
import LegacyIcon from "./Icon.jsx";
import Icon from "./primitives/Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import Popover from "./primitives/Popover.jsx";
import ProgressTrack from "./primitives/ProgressTrack.jsx";

export const SEASON_EFFECTS = ["", "", "", ""];

const LARDER_RESOURCES = [
  { key: "grass_hay",   iconKey: "grass_hay", label: "Hay" },
  { key: "grain_wheat", iconKey: "grain_wheat", label: "Wheat" },
  { key: "grain",       iconKey: "grain",       label: "Grain" },
  { key: "berry",       iconKey: "berry",       label: "Berry" },
  { key: "wood_log",    iconKey: "wood_log",    label: "Log" },
];

function StashContent({ state, inventory, festivalAnnounced }) {
  const embers = state.embers ?? 0;
  const ingots = state.coreIngots ?? 0;
  const gems = state.gems ?? 0;
  const tokens = hearthTokenCount(state);
  const rows = [
    embers > 0 && { iconKey: "design.currency.ember",        label: "Embers",        value: embers },
    ingots > 0 && { iconKey: "design.currency.ingot",        label: "Core Ingots",   value: ingots },
    gems   > 0 && { iconKey: "design.currency.gem",          label: "Gems",          value: gems },
    tokens > 0 && { iconKey: "design.currency.hearth-token", label: "Hearth-Tokens", value: `${tokens}/3` },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3 min-w-[220px]">
      <div>
        <div className="text-caption font-semibold text-ink-mid mb-1.5">Stash</div>
        {rows.length === 0 ? (
          <div className="text-caption text-ink-light">Empty.</div>
        ) : (
          <div className="flex flex-col gap-1">
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
        )}
      </div>
      {festivalAnnounced && (
        <div className="border-t border-iron-edge pt-2">
          <div className="text-caption font-semibold text-ink-mid mb-1.5">Larder · target 50</div>
          <div className="flex flex-col gap-1.5">
            {LARDER_RESOURCES.map(({ key, iconKey, label }) => {
              const amt = Math.min(50, inventory[key] ?? 0);
              return (
                <div key={key} className="flex items-center gap-2">
                  <LegacyIcon iconKey={iconKey} size={14} />
                  <span className="text-caption flex-1">{label}</span>
                  <div className="w-24">
                    <ProgressTrack value={amt} max={50} style="bar" tone={amt >= 50 ? "gold" : "ember"} size="xs" />
                  </div>
                  <span className="tabular-nums text-caption w-8 text-right">{amt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

function SeasonRing({ season, turnsUsed, turnsLeft, turnBudget }) {
  const pipCount = Math.max(1, turnBudget | 0);
  const used = Math.max(0, Math.min(pipCount, turnsUsed ?? 0));
  const tone = season?.fill === 0xffe2a3 ? "gold" : "ember";
  return (
    <div className="inline-flex items-center gap-2 bg-paper border border-iron rounded-pill pl-3 pr-2 py-0.5 max-w-[420px]">
      <span className="text-caption font-semibold text-ink-mid whitespace-nowrap">{season.name}</span>
      <div className="flex-1 min-w-0 flex justify-center">
        <ProgressTrack value={used} max={pipCount} style="pips" tone={tone} size="sm" currentMarker={used < pipCount ? used : undefined} />
      </div>
      <span
        className="text-caption font-semibold text-ink-mid whitespace-nowrap pl-2 border-l border-iron tabular-nums"
        data-testid="turns-left"
      >
        {turnsLeft} turn{turnsLeft === 1 ? "" : "s"} left
      </span>
    </div>
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

export function Hud({ state, dispatch }) {
  const { coins, level, xp, turnsUsed, view } = state;
  const onBoard = view === "board";
  const turnBudget = state.farmRun?.turnBudget ?? 0;
  const turnsRemaining = state.farmRun?.turnsRemaining ?? Math.max(0, turnBudget - (turnsUsed ?? 0));
  const seasonIdx = onBoard ? seasonIndexInSession(turnsUsed ?? 0, turnBudget || 1) : 0;
  const season = SEASONS[seasonIdx];
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const builtAtLoc = locBuilt(state);
  const buildingCount = Object.keys(builtAtLoc).filter((k) => k !== "_plots").length;
  const festivalAnnounced = !!state.story?.flags?.festival_announced;
  const isWon = !!state.story?.flags?.isWon;
  const sandbox = !!state.story?.sandbox || isWon;
  const settlementName = state.settlement?.name ?? "Hearthwood Vale";
  const inventory = state.inventory || {};
  const showTide = state.biomeKey === "fish" && (onBoard || view === "town");

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-ink-soft border-b-2 border-bg-darker text-ink-mid"
      data-testid="hud"
    >
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "menu" })}
          className="w-8 h-8 rounded-lg bg-paper-soft border-2 border-iron grid place-items-center text-ink-mid font-bold text-large flex-shrink-0"
          data-testid="menu-btn"
          aria-label="Menu"
          title="Menu"
        >&#x2261;</button>
        <div className="flex flex-col items-start min-w-0 leading-tight">
          <span className="text-body font-semibold text-cream truncate max-w-[180px]">
            {settlementName}
            {sandbox && <span className="italic text-cream-soft font-normal"> · sandbox</span>}
          </span>
          <span className="hidden md:inline text-micro text-cream-soft">Menu</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-center min-w-0 flex-wrap">
        {onBoard && (
          <SeasonRing season={season} turnsUsed={turnsUsed} turnsLeft={turnsRemaining} turnBudget={turnBudget || 1} />
        )}
        {onBoard && (
          <Popover
            density="rich"
            content={<StashContent state={state} inventory={inventory} festivalAnnounced={festivalAnnounced} />}
            anchor={
              <Pill
                interactive
                tone="iron"
                variant="solid"
                size="sm"
                leading={<Icon iconKey="design.currency.coin" size={14} />}
                title="Stash — currencies, tokens, larder"
              >
                <span className="tabular-nums">Stash</span>
              </Pill>
            }
          />
        )}
        {showTide && <TideChip fish={state.fish} />}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <DevButton title="Debug tools" iconKey="ui_devtools" onClick={() => dispatch({ type: "SETTINGS/OPEN_DEBUG" })} />
        <DevButton title="Balance Manager" iconKey="ui_scale" onClick={() => { window.open(`${import.meta.env.BASE_URL}b/`, "_blank", "noopener,noreferrer"); }} />
        {!onBoard && (
          <>
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
                  <span className="tabular-nums" data-testid="coins">{coins.toLocaleString()}</span>
                </Pill>
              }
            />
            <Pill
              tone="iron"
              variant="solid"
              size="sm"
              leading={<Icon iconKey="design.building.market" size={14} />}
              title="Buildings built at this location"
            >
              <span className="tabular-nums" data-testid="buildings">{buildingCount}</span>
            </Pill>
            <Pill
              tone="ember"
              variant="solid"
              size="sm"
              title={`Level ${level} · ${xp} / ${xpNeed} XP`}
              className="!px-2 !gap-1.5"
            >
              <span className="text-caption font-semibold tabular-nums">Lv {level}</span>
              <span className="flex flex-col items-stretch min-w-[80px]">
                <span className="text-micro tabular-nums text-cream leading-none mb-0.5 text-center">{xp}/{xpNeed}</span>
                <span className="block h-1 rounded-pill bg-bg-dark/60 overflow-hidden">
                  <span
                    className="block h-full bg-gold-bright transition-[width] duration-300"
                    style={{ width: `${xpPct}%` }}
                  />
                </span>
              </span>
            </Pill>
          </>
        )}
      </div>
    </div>
  );
}
