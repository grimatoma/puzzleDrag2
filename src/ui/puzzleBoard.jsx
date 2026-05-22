/**
 * Hearthwood Vale puzzle-board chrome: the pieces of the board view's
 * visual frame, ported from the design mock at
 * 04cd42d7-Hearthwood_Vale_Puzzle_Board.html.
 *
 *   - SeasonWheel        — circular 4-quadrant year wheel for the HUD.
 *   - PuzzleActionPanel  — cream paper card with idle/chain/tool states.
 *   - PuzzleToolStrip    — grid / vertical / horizontal tool tray with count pills.
 *   - PuzzleHotbar       — compact pinned-tools rail with a chevron that
 *                          opens the tool modal.
 *   - PuzzleToolModal    — overlay with tool detail, scrollable grid, and
 *                          tap-to-pin hotbar slots.
 *   - BoardFrame         — dark-brown rounded card around the Phaser host.
 *
 * All four read from existing game state; no new slices or actions.
 * Hotbar pin assignments persist to localStorage (no save-schema bump).
 */

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import LegacyIcon from "./Icon.jsx";
import { BIOMES } from "../constants.js";
import { TOOL_BY_KEY, isTapTargetTool, visibleTools, TOOL_CATALOG } from "./toolRegistry.js";
import { getPhaserScene } from "../phaserBridge.js";
import { SeasonStrip } from "./seasonStrip.jsx";
import { lazy, Suspense } from "react";

// Phaser-rendered strip is lazy-loaded so the heavy graphics library is only
// pulled into the bundle when the player opts in via the debug toggle.
const SeasonStripPhaserLazy = lazy(() =>
  import("./seasonStripPhaser.jsx").then((m) => ({ default: m.SeasonStripPhaser }))
);

const FIELD_GRADIENTS = [
  "linear-gradient(180deg,var(--field-spring-top) 0%,var(--field-spring-bot) 100%)",
  "linear-gradient(180deg,var(--field-summer-top) 0%,var(--field-summer-bot) 100%)",
  "linear-gradient(180deg,var(--field-fall-top) 0%,var(--field-fall-bot) 100%)",
  "linear-gradient(180deg,var(--field-winter-top) 0%,var(--field-winter-bot) 100%)",
];

// Escalating chain-tier palette. Index = upgrades earned, clamped to 4.
const CHAIN_STAGES = [
  { top: "#f0c14b", bot: "#d97a2a", accent: "#e07a3a", label: null      },
  { top: "#a3d65a", bot: "#6d9928", accent: "#5e9a2a", label: "BONUS!"  },
  { top: "#7dc2e4", bot: "#3a7eae", accent: "#4082b5", label: "DOUBLE!" },
  { top: "#d8a4f0", bot: "#8a4ec9", accent: "#9648c6", label: "TRIPLE!" },
  { top: "#ffb04a", bot: "#d62828", accent: "#e62828", label: "FRENZY!" },
];

export function fieldGradientFor(seasonIdx) {
  return FIELD_GRADIENTS[seasonIdx] ?? FIELD_GRADIENTS[0];
}

// ─── Season indicator (full-width strip with walking wagon) ──────────────

export function SeasonIndicator({
  turnsUsed,
  turnBudget,
  turnsRemaining,
  seasonIdx,
  seasonName,
  bespoke,
  phaser,
}) {
  if (phaser) {
    return (
      <Suspense
        fallback={
          <SeasonStrip
            turnsUsed={turnsUsed}
            turnBudget={turnBudget}
            turnsRemaining={turnsRemaining}
            seasonIdx={seasonIdx}
            seasonName={seasonName}
            busy={!!bespoke}
          />
        }
      >
        <SeasonStripPhaserLazy
          turnsUsed={turnsUsed}
          turnBudget={turnBudget}
          turnsRemaining={turnsRemaining}
          seasonIdx={seasonIdx}
          seasonName={seasonName}
        />
      </Suspense>
    );
  }
  return (
    <SeasonStrip
      turnsUsed={turnsUsed}
      turnBudget={turnBudget}
      turnsRemaining={turnsRemaining}
      seasonIdx={seasonIdx}
      seasonName={seasonName}
      busy={!!bespoke}
    />
  );
}

// ─── Action panel ────────────────────────────────────────────────────────

function PanelHeader({ left, right, accent }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-dashed border-[color:var(--iron-edge)] relative">
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-on-panel-label uppercase tracking-[0.15em]">
        {accent && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: accent }} />}
        {left}
      </div>
      {right && (
        <div className="text-[9.5px] text-on-panel-dim font-bold uppercase tracking-wider">{right}</div>
      )}
    </div>
  );
}

function IdleView({ inventory, biomeKey, cap }) {
  // The mock shows a 4-column grid of resource chips. Trim to the first 12
  // resources of the biome so the grid stays tight and predictable.
  const list = useMemo(() => (BIOMES[biomeKey]?.resources ?? []).slice(0, 12), [biomeKey]);
  const ownedCount = list.filter((r) => (inventory?.[r.key] ?? 0) > 0).length;
  return (
    <>
      <PanelHeader left="Stockpile" right={`${ownedCount}/${list.length} kinds`} />
      <div className="grid grid-cols-4 gap-1.5 p-2 flex-1 min-h-0 overflow-y-auto content-start">
        {list.map((r) => {
          const count = inventory?.[r.key] ?? 0;
          const empty = count === 0;
          const pct = Math.min(1, count / Math.max(1, cap));
          return (
            <div
              key={r.key}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md relative overflow-hidden"
              style={{
                background: empty ? "rgba(138,106,71,0.10)" : "var(--board-chip-bg)",
                border: `1px solid ${empty ? "transparent" : "var(--board-chip-border)"}`,
                opacity: empty ? 0.55 : 1,
              }}
              title={`${r.label ?? r.key}: ${count}`}
            >
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{ width: `${pct * 100}%`, background: "rgba(124,179,66,0.12)" }}
              />
              <LegacyIcon iconKey={r.key} size={32} />
              <span
                className="font-mono font-bold text-[13px] text-on-panel relative tabular-nums"
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ChainView({ chainInfo, inventory }) {
  const length = chainInfo.count ?? 0;
  const threshold = chainInfo.nextTileProgress?.threshold ?? 0;
  const into = chainInfo.nextTileProgress?.current ?? length;
  const earned = chainInfo.upgrades ?? 0;
  const upgradeLabel = chainInfo.nextTileProgress?.targetLabel ?? "";
  const upgradeKey = chainInfo.nextTileProgress?.targetKey ?? null;
  const resourceKey = chainInfo.resourceKey;
  const resourceLabel = chainInfo.resourceLabel ?? resourceKey ?? "";

  const stage = CHAIN_STAGES[Math.min(earned, CHAIN_STAGES.length - 1)];
  const pct = threshold > 0 ? Math.min(100, (into / threshold) * 100) : 0;

  // Carried tile count from previous chains/rounds (persisted in inventory).
  // Shown as an "old" base fill behind the live chain so the bar reflects
  // total tile progress, looping with a brighter cycle color past threshold.
  const carriedTotal = (resourceKey && inventory?.[resourceKey]) || 0;
  const carriedInCycle = threshold > 0 ? carriedTotal % threshold : 0;
  const combined = carriedInCycle + length;
  const cyclesCompleted = threshold > 0 ? Math.floor(combined / threshold) : 0;
  const remainder = threshold > 0 ? combined % threshold : 0;
  // Visual loop kicks in only when there's spillover past the threshold
  // (combined > threshold), so the bar always shows an in-progress fill.
  const looped = threshold > 0 && combined > threshold;
  const carriedPct = threshold > 0 ? (carriedInCycle / threshold) * 100 : 0;
  const newFitsInCycle = threshold > 0
    ? Math.max(0, Math.min(length, threshold - carriedInCycle))
    : length;
  const newPct = threshold > 0 ? (newFitsInCycle / threshold) * 100 : 0;
  const overflowPct = threshold > 0 ? (remainder / threshold) * 100 : 0;

  // Text format flips only after combined exceeds the threshold — while still
  // inside the first cycle (combined <= threshold), the "{carried}+{length}"
  // split is preserved so the player can see their carry-over contribution.
  // Once spillover begins, carried is absorbed into the "{remainder}/{threshold}
  // + {N}" cycle counter. Multi-cycle boundaries with no spillover (e.g. exact
  // 2×threshold) read as "{threshold}/{threshold} + {N-1}".
  const useCycleText = threshold > 0 && combined > threshold;
  const onCycleBoundary = useCycleText && remainder === 0;
  const textCurrent = onCycleBoundary ? threshold : remainder;
  const textPriorCycles = onCycleBoundary ? cyclesCompleted - 1 : cyclesCompleted;

  return (
    <>
      <PanelHeader
        left="Chaining"
        right={`${resourceLabel} chain`}
        accent={stage.accent}
      />
      <div className="flex items-center gap-3 px-3 py-2 min-h-0 flex-1">
        <div className="flex-1 relative">
          <div
            className="relative rounded-[13px] overflow-hidden"
            style={{
              height: 50,
              background: "var(--board-panel-track)",
              border: "2px solid var(--board-panel-border)",
              boxShadow:
                earned >= 2
                  ? `inset 0 2px 4px rgba(0,0,0,0.12), 0 0 0 2px ${stage.accent}, 0 0 12px ${stage.accent}66`
                  : "inset 0 2px 4px rgba(0,0,0,0.10)",
            }}
          >
            {looped ? (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{
                    width: "100%",
                    background: "linear-gradient(180deg, #b89762 0%, #8a6428 100%)",
                    boxShadow:
                      "inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                />
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{
                    width: `${overflowPct}%`,
                    background: `linear-gradient(180deg, ${stage.top} 0%, ${stage.bot} 100%)`,
                    boxShadow:
                      "inset 0 -3px 0 rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.4)",
                    transition: "width 120ms ease-out",
                  }}
                />
              </>
            ) : (
              <>
                {carriedPct > 0 && (
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{
                      width: `${carriedPct}%`,
                      background: "linear-gradient(180deg, #b89762 0%, #8a6428 100%)",
                      boxShadow:
                        "inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)",
                    }}
                  />
                )}
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${carriedPct}%`,
                    width: `${newPct}%`,
                    background: `linear-gradient(180deg, ${stage.top} 0%, ${stage.bot} 100%)`,
                    boxShadow:
                      "inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
                    transition: "left 120ms ease-out, width 120ms ease-out",
                  }}
                />
              </>
            )}
            <div
              className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[#fff8e7]"
              style={{
                fontSize: 24,
                letterSpacing: 1,
                textShadow: "0 2px 0 rgba(0,0,0,0.45), 0 0 6px rgba(0,0,0,0.35)",
              }}
            >
              {threshold > 0 ? (
                useCycleText ? (
                  <>
                    {textCurrent}
                    <span style={{ opacity: 0.7 }}>/</span>
                    {threshold}
                    {textPriorCycles > 0 && (
                      <>
                        <span style={{ opacity: 0.6 }}> + </span>
                        {textPriorCycles}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {carriedInCycle > 0 && (
                      <>
                        <span style={{ opacity: 0.75 }}>{carriedInCycle}</span>
                        <span style={{ opacity: 0.6 }}>+</span>
                      </>
                    )}
                    {length}
                    <span style={{ opacity: 0.7 }}>/</span>
                    {threshold}
                  </>
                )
              ) : (
                <>×{length}</>
              )}
            </div>
            {stage.label && (
              <div
                className="absolute top-0.5 right-2 font-extrabold uppercase"
                style={{
                  fontSize: 8.5,
                  letterSpacing: 1,
                  color: earned >= 4 ? "#ffe7a0" : "#fff8e7",
                  textShadow: "0 1px 0 rgba(0,0,0,0.55)",
                }}
              >
                {stage.label}
              </div>
            )}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <div
            className="rounded-[13px] flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              background: "var(--paper-soft)",
              border: earned > 0 ? `2px solid ${stage.accent}` : "2px solid var(--board-panel-border)",
              boxShadow:
                earned > 0
                  ? `inset 0 -3px 0 rgba(0,0,0,0.10), 0 2px 0 rgba(168,146,114,0.30), 0 0 0 3px ${stage.accent}33`
                  : "inset 0 -3px 0 rgba(0,0,0,0.08), 0 2px 0 rgba(168,146,114,0.30)",
            }}
          >
            {resourceKey ? <LegacyIcon iconKey={resourceKey} size={40} /> : null}
          </div>
          {earned > 0 && (
            <div
              className="absolute font-mono font-extrabold text-[#fff8e7] tabular-nums text-center"
              style={{
                bottom: -6,
                right: -6,
                background: `linear-gradient(180deg, ${stage.top}, ${stage.bot})`,
                border: "2px solid var(--ink)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 14,
                boxShadow: `0 2px 0 rgba(0,0,0,0.25), 0 0 8px ${stage.accent}99`,
                textShadow: "0 1px 0 rgba(0,0,0,0.4)",
                minWidth: 24,
              }}
            >
              +{earned}
            </div>
          )}
        </div>
      </div>
      {threshold > 0 && (
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 border-t border-dashed border-[color:var(--iron-edge)]"
          style={{ background: "rgba(138,100,40,0.06)" }}
        >
          <div className="text-[9px] font-extrabold text-on-panel-label uppercase tracking-wider whitespace-nowrap">
            Upgrade to
          </div>
          {upgradeKey ? <LegacyIcon iconKey={upgradeKey} size={18} /> : null}
          <span className="text-[11px] font-extrabold text-on-panel whitespace-nowrap">
            {upgradeLabel}
          </span>
          <div
            className="flex-1 h-2 rounded relative overflow-hidden"
            style={{ background: "rgba(0,0,0,0.22)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${stage.accent}, ${stage.top})`,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
                transition: "width 120ms ease-out",
              }}
            />
          </div>
          <div className="font-mono font-bold text-[12px] text-[#7a3c12] tabular-nums">
            {into}
            <span className="text-[#b89762]">/{threshold}</span>
          </div>
          <div className="text-[12px] text-[#8a6a47]">→</div>
          <div
            className="flex items-center gap-1 font-extrabold rounded-md"
            style={{
              fontSize: 13,
              color: earned >= 1 ? "#fff8e7" : "#3d5d18",
              background: earned >= 1 ? stage.accent : "transparent",
              padding: earned >= 1 ? "2px 7px" : "0",
              boxShadow: earned >= 1 ? `0 0 6px ${stage.accent}99` : "none",
            }}
          >
            +1 {upgradeKey ? <LegacyIcon iconKey={upgradeKey} size={14} /> : null}
          </div>
        </div>
      )}
    </>
  );
}

function ToolView({ tool, armedKey, fertilizerActive, dispatch, onClose }) {
  const targeted = isTapTargetTool(tool.key);
  const armed = armedKey === tool.key;
  const count = tool.count ?? 0;
  const handleUse = () => {
    dispatchUseTool(dispatch, tool.key, { toolPending: armedKey, fertilizerActive });
  };
  const handleDisarm = () => {
    dispatch({ type: "CANCEL_TOOL" });
  };
  const handleClose = () => {
    // Plain close: leave any armed state alone — the explicit DISARM button
    // is the cancel affordance now, so closing the inspect panel shouldn't
    // throw away an arming the player just made.
    onClose?.();
  };
  return (
    <>
      <style>{`
        @keyframes hwv-armed-marquee {
          0%, 100% { background-position: 0 0; }
          100% { background-position: 32px 0; }
        }
      `}</style>
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-dashed border-[rgba(138,100,40,0.55)]"
        style={armed ? {
          background: "linear-gradient(180deg, rgba(224,40,40,0.18), rgba(224,40,40,0.08))",
        } : undefined}
      >
        <div
          className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.15em] min-w-0"
          style={{ color: armed ? "#9a1a1a" : "#7a5520" }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block flex-shrink-0"
            style={{
              background: armed ? "#e02828" : "#8a6a47",
              boxShadow: armed ? "0 0 6px rgba(224,40,40,0.85)" : "none",
            }}
          />
          <span className="truncate">{armed ? "Tool armed" : targeted ? "Tool ready" : "Tool inspect"}</span>
          <span className="font-bold normal-case tracking-normal" style={{ color: armed ? "#9a1a1a" : "#8a6a47" }}>
            · × {count} left
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#5b3a1e] font-extrabold leading-none flex-shrink-0 ml-2"
          style={{
            background: armed ? "rgba(224,40,40,0.18)" : "rgba(138,100,40,0.18)",
            border: armed ? "1px solid rgba(224,40,40,0.55)" : "1px solid rgba(138,100,40,0.4)",
            fontSize: 15,
          }}
          title="Close"
          aria-label="Close tool inspect"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2 flex-1 min-h-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 60,
            height: 60,
            borderRadius: 13,
            background: "#3a2412",
            border: armed ? "2px solid #e02828" : "2px solid #f0c14b",
            boxShadow: armed
              ? "0 2px 0 rgba(0,0,0,0.3), inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 0 4px rgba(224,40,40,0.30)"
              : "0 2px 0 rgba(0,0,0,0.3), inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 0 4px rgba(240,193,75,0.25)",
          }}
        >
          <LegacyIcon iconKey={tool.iconKey} size={38} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[#3a2412] font-extrabold italic leading-none"
            style={{ fontFamily: "Georgia, serif", fontSize: 18 }}
          >
            {tool.name}
          </div>
          <div
            className="text-[11.5px] text-[#5b3a1e] leading-snug mt-1.5 overflow-hidden"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            {tool.desc}
          </div>
        </div>
      </div>
      {targeted ? (
        <div
          className="flex items-center gap-2 px-2 py-1.5 border-t border-dashed border-[rgba(138,100,40,0.55)]"
          style={{
            background: armed
              ? "linear-gradient(180deg, rgba(224,40,40,0.18), rgba(224,40,40,0.30))"
              : "linear-gradient(180deg, rgba(224,122,58,0.14), rgba(224,122,58,0.22))",
          }}
        >
          <div
            className="text-[10.5px] font-extrabold flex-1 uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: armed ? "#9a1a1a" : "#7a3c12" }}
          >
            <span
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 16,
                height: 16,
                borderRadius: 50,
                background: armed ? "#e02828" : "#e07a3a",
                color: "#fff8e7",
                fontSize: 10,
                animation: armed ? "hwv-armed-marquee 900ms steps(8) infinite" : "none",
              }}
            >
              ◎
            </span>
            {armed ? "Tap a tile on the board" : "Tap arms — then pick a tile"}
          </div>
          {armed ? (
            <button
              type="button"
              onClick={handleDisarm}
              className="font-extrabold"
              style={{
                background: "linear-gradient(180deg,#e07a3a,#a02a14)",
                color: "#fff8e7",
                fontSize: 12,
                padding: "7px 16px",
                borderRadius: 9,
                border: "1.5px solid #5a1a08",
                boxShadow: "0 2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.30)",
                letterSpacing: 0.5,
              }}
              title="Cancel armed tool"
              aria-label="Disarm tool"
            >
              ✕ DISARM
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUse}
              disabled={count === 0}
              className="font-extrabold disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg,#f4a050,#d97a2a)",
                color: "#2c1408",
                fontSize: 12,
                padding: "7px 18px",
                borderRadius: 9,
                border: "1.5px solid #7a3c12",
                boxShadow: "0 2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
                letterSpacing: 0.5,
              }}
              title="Arm tool — then tap a tile on the board"
              aria-label="Arm tool"
            >
              ◎ ARM
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1.5 border-t border-dashed border-[rgba(138,100,40,0.55)]">
          <div className="text-[10.5px] font-extrabold text-[#7a5520] flex-1">
            Affects entire board
          </div>
          <button
            type="button"
            onClick={handleUse}
            disabled={count === 0}
            className="font-extrabold disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg,#85c14a,#4e8425)",
              color: "#0c2e10",
              fontSize: 12,
              padding: "7px 18px",
              borderRadius: 9,
              border: "1.5px solid #3a5a12",
              boxShadow:
                "0 2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
              letterSpacing: 0.5,
            }}
          >
            ✓ USE NOW
          </button>
        </div>
      )}
    </>
  );
}

export function PuzzleActionPanel({
  chainInfo,
  inspectedTool,
  armedTool,
  fertilizerActive,
  inventory,
  biomeKey,
  cap = 200,
  dispatch,
  onCloseInspect,
}) {
  const hasChain = !!(chainInfo && chainInfo.count > 0 && chainInfo.resourceKey);
  const state = hasChain ? "chain" : inspectedTool ? "tool" : "idle";
  return (
    <div
      // Fixed height so swapping idle/chain/tool content never shifts surrounding
      // layout. Sized to the densest view (idle stockpile grid measures ~147px;
      // chain/tool variants are shorter) so the board gets the spare pixels back.
      className="rounded-[13px] relative overflow-hidden flex flex-col flex-shrink-0"
      style={{
        height: 148,
        background:
          "linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bottom) 100%)",
        border: "1.5px solid var(--card-border-strong)",
        boxShadow: "var(--card-shadow-strong), inset 0 0 0 1px rgba(255,255,255,0.55)",
      }}
      data-testid="puzzle-action-panel"
      data-state={state}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.12,
          backgroundImage:
            "radial-gradient(rgba(138,100,40,0.25) 0.7px, transparent 0.7px)",
          backgroundSize: "8px 8px",
        }}
      />
      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {state === "idle" && <IdleView inventory={inventory} biomeKey={biomeKey} cap={cap} />}
        {state === "chain" && <ChainView chainInfo={chainInfo} inventory={inventory} />}
        {state === "tool" && (
          <ToolView
            tool={inspectedTool}
            armedKey={armedTool?.key}
            fertilizerActive={fertilizerActive}
            dispatch={dispatch}
            onClose={onCloseInspect}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tools strip ─────────────────────────────────────────────────────────

// Only one tool may be "selected" (inspected, armed, or used) at a time.
// Touching a new tool implicitly cancels any other tool that's still armed —
// the previously-armed tool is "no longer selected", so its highlight, its
// arming, and (for non-tap-target tools) its consumed charge are all undone.
// Fertilizer uses its own flag rather than toolPending; re-dispatching
// USE_TOOL fertilizer is the canonical disarm + refund path for it.
function disarmOtherTools(dispatch, key, state) {
  if (state?.toolPending && state.toolPending !== key) {
    dispatch({ type: "CANCEL_TOOL" });
  }
  if (state?.fertilizerActive && key !== "fertilizer") {
    dispatch({ type: "USE_TOOL", key: "fertilizer" });
  }
}

function dispatchUseTool(dispatch, key, state) {
  const isPending = state.toolPending === key;
  if (isPending) {
    dispatch({ type: "CANCEL_TOOL" });
    return;
  }
  disarmOtherTools(dispatch, key, state);
  const def = TOOL_BY_KEY[key];
  if (def?.category === "magic") {
    dispatch({ type: "USE_TOOL", payload: { id: key } });
  } else {
    dispatch({ type: "USE_TOOL", key });
  }
  if (key === "shuffle") getPhaserScene()?.shuffleBoard();
}

// When a tap-target tool (bomb / rake / axe / magic_wand) or fertilizer is
// already armed, single-tapping another tool means "switch to this one" —
// the player has already committed to using a tool, so the new tap should
// transfer the arming rather than leave nothing selected. When no tool is
// armed, the two-tap inspect→activate pattern still applies. Returns true
// when arming was transferred so the caller can skip the plain inspect path.
function maybeTransferArming(dispatch, key, state) {
  const armedKey = state?.toolPending;
  const fertilizerArmed = !!state?.fertilizerActive;
  const hasOtherArmed =
    (armedKey && armedKey !== key) ||
    (fertilizerArmed && key !== "fertilizer");
  if (!hasOtherArmed) return false;
  dispatchUseTool(dispatch, key, state);
  return true;
}

// ─── Tool tile (shared by hotbar / grid / modal) ─────────────────────────

// Two-tap to arm: first tap on a tile inspects it; a second tap within this
// window activates (arms / uses) the tool. This keeps long-press for drag
// while preventing a stray tap from arming a tool the player only wanted to
// look at.
const DOUBLE_TAP_MS = 420;

const ToolTile = forwardRef(function ToolTile(
  { tool, inspected, onClick, onActivate, onPointerDown, size = "md", dragging = false, hideArmed = false },
  ref,
) {
  // The dropdown grid passes `hideArmed` so an already-armed tool doesn't get
  // a special bright tile — the player armed it elsewhere, the dropdown
  // shouldn't redraw attention to it.
  const armed = !!tool.armed && !hideArmed;
  const empty = tool.count === 0 && !armed;
  const dims = size === "sm"
    ? { w: 48, h: 52, icon: 42, badge: 9, badgeMin: 14 }
    : { w: 58, h: 62, icon: 48, badge: 10, badgeMin: 15 };
  const lastTapAt = useRef(0);
  const handleClick = () => {
    const now = Date.now();
    const isDouble = now - lastTapAt.current < DOUBLE_TAP_MS;
    lastTapAt.current = isDouble ? 0 : now;
    if (isDouble && onActivate) {
      onActivate(tool);
      return;
    }
    onClick?.(tool);
  };
  // Empty tiles get a clearly-recessed look — no warm tint, faded ink — so
  // the player can't mistake them for an active selection. Owned tiles keep
  // the lighter parchment fill that reads as "available".
  const background = armed
    ? "#fdf3e3"
    : inspected
    ? "rgba(246,227,191,0.55)"
    : empty
    ? "rgba(20,12,5,0.32)"
    : "rgba(246,227,191,0.18)";
  const borderColor = armed
    ? "2px solid #f0c14b"
    : inspected
    ? "2px solid rgba(240,193,75,0.60)"
    : empty
    ? "1.5px solid rgba(200,160,90,0.12)"
    : "1.5px solid rgba(200,160,90,0.40)";
  const ink = armed ? "#3a2412" : empty ? "rgba(232,212,168,0.45)" : "#f6e3bf";
  return (
    <button
      type="button"
      ref={ref}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      className="flex-shrink-0 flex items-center justify-center relative select-none"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: 11,
        background,
        border: borderColor,
        color: ink,
        boxShadow: empty ? "inset 0 2px 4px rgba(0,0,0,0.35)" : "0 2px 0 rgba(0,0,0,0.2)",
        opacity: dragging ? 0.35 : (empty ? 0.55 : 1),
        filter: empty ? "grayscale(0.85)" : "none",
        touchAction: "none",
      }}
      title={tool.name}
      aria-label={`${tool.name} (${tool.count})`}
      data-tool-key={tool.key}
      data-armed={armed ? "true" : "false"}
    >
      <div
        className="absolute font-mono font-bold text-center pointer-events-none"
        style={{
          top: 2,
          right: 2,
          background: armed ? "rgba(58,36,18,0.92)" : empty ? "rgba(10,5,3,0.55)" : "rgba(10,5,3,0.85)",
          borderRadius: 6,
          fontSize: dims.badge,
          padding: "0px 4px",
          lineHeight: 1.3,
          color: armed ? "#f0c14b" : empty ? "rgba(255,248,231,0.45)" : "#fff8e7",
          minWidth: dims.badgeMin,
          letterSpacing: 0.2,
        }}
      >
        {tool.count}
      </div>
      <LegacyIcon iconKey={tool.iconKey} size={dims.icon} />
    </button>
  );
});

function buildVisibleToolList(state) {
  const tools = state.tools || {};
  return visibleTools(tools).map((def) => ({
    key: def.key,
    iconKey: def.iconKey,
    name: def.name,
    desc: def.desc,
    count: tools[def.key] || 0,
    armed:
      state.toolPending === def.key ||
      (def.key === "fertilizer" && !!state.fertilizerActive),
  }));
}

// When the player arms a tool from anywhere (modal, hotbar, grid), the
// status panel auto-shows that tool's detail. This is the shared effect.
// We refuse to override an explicit selection: if the player has inspected
// a different tool than what's armed, leave the panel alone. Otherwise a
// state.tools change (e.g. using an instant tool) would yank the panel back
// to the armed tool that the player wasn't even looking at.
function useAutoInspectArmed(state, onInspectChange, inspectedKey) {
  useEffect(() => {
    if (!onInspectChange) return;
    const pending = state.toolPending;
    if (!pending || !TOOL_BY_KEY[pending]) return;
    if (inspectedKey != null && inspectedKey !== pending) return;
    onInspectChange({
      ...TOOL_BY_KEY[pending],
      count: state.tools?.[pending] ?? 0,
    });
  }, [state.toolPending, state.tools, onInspectChange, inspectedKey]);
}

// ─── Tool grid (side-by-side left column) ────────────────────────────────

export function PuzzleToolGrid({ state, onInspectChange, inspectedKey, dispatch }) {
  const list = useMemo(() => buildVisibleToolList(state), [state]);
  useAutoInspectArmed(state, onInspectChange, inspectedKey);
  const toolPending = state.toolPending;
  const fertilizerActive = state.fertilizerActive;
  const select = useCallback(
    (t) => {
      if (dispatch && !maybeTransferArming(dispatch, t.key, { toolPending, fertilizerActive })) {
        disarmOtherTools(dispatch, t.key, { toolPending, fertilizerActive });
      }
      onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
    },
    [dispatch, onInspectChange, toolPending, fertilizerActive],
  );
  const activate = useCallback(
    (t) => {
      onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
      if (dispatch) dispatchUseTool(dispatch, t.key, { toolPending, fertilizerActive });
    },
    [dispatch, onInspectChange, toolPending, fertilizerActive],
  );
  return (
    <div
      className="h-full overflow-y-auto rounded-[11px]"
      style={{
        background: "linear-gradient(180deg,var(--board-tools-top),var(--board-tools-bot))",
        border: "1px solid var(--board-tools-border)",
        boxShadow: "var(--card-shadow)",
      }}
      data-testid="puzzle-tool-grid"
    >
      <div
        className="px-2 pt-3 pb-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
          gap: 8,
        }}
      >
        {list.map((t) => (
          <ToolTile key={t.key} tool={t} inspected={inspectedKey === t.key} onClick={select} onActivate={activate} />
        ))}
      </div>
    </div>
  );
}

// ─── Pinned-tools persistence ────────────────────────────────────────────

const PIN_STORAGE_KEY = "hearthwood:hotbar-pins";
// Absolute ceiling. The actual cap is computed dynamically from the hotbar
// container width so adding more tools never forces horizontal scrolling.
export const MAX_PINS = 8;
const DEFAULT_PINS = TOOL_CATALOG
  .filter((t) => t.category === "field")
  .slice(0, 5)
  .map((t) => t.key);

function readStoredPins() {
  try {
    const raw = typeof window !== "undefined" && window.localStorage?.getItem(PIN_STORAGE_KEY);
    if (!raw) return DEFAULT_PINS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PINS.slice();
    // Pins are a sparse fixed-slot array — keep slot positions, normalize
    // non-strings / unknown keys to `null` so each index still represents
    // a specific hotbar slot.
    return parsed
      .map((k) => (typeof k === "string" && TOOL_BY_KEY[k] ? k : null))
      .slice(0, MAX_PINS);
  } catch {
    return DEFAULT_PINS.slice();
  }
}

export function usePinnedTools() {
  const [pins, setPins] = useState(readStoredPins);
  useEffect(() => {
    try {
      window.localStorage?.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
    } catch { /* localStorage may be unavailable in private mode; ignore */ }
  }, [pins]);
  // Place `key` at slot `index`, overwriting whatever was there. If the
  // tool was already pinned to a different slot, that slot becomes empty
  // (move semantics — never duplicates). Honors the supplied cap so the
  // hotbar never overflows the visible width.
  const placeAt = useCallback((key, index, cap = MAX_PINS) => {
    if (!TOOL_BY_KEY[key]) return;
    setPins((prev) => {
      const slotCap = Math.max(1, Math.min(MAX_PINS, cap));
      const target = Math.max(0, Math.min(index, slotCap - 1));
      const len = Math.max(prev.length, target + 1);
      const next = Array.from({ length: len }, (_, i) => prev[i] ?? null);
      for (let i = 0; i < next.length; i++) {
        if (next[i] === key && i !== target) next[i] = null;
      }
      next[target] = key;
      return next.slice(0, slotCap);
    });
  }, []);
  const remove = useCallback((key) => {
    if (!TOOL_BY_KEY[key]) return;
    setPins((prev) => prev.map((k) => (k === key ? null : k)));
  }, []);
  return [pins, { placeAt, remove }];
}

// Measure how many tool tiles fit in a container — used so the hotbar's
// effective pin cap shrinks on narrow viewports instead of overflowing.
// Slots are distributed with space-between, so we only need a minimum
// gap to keep tiles from kissing on narrow viewports.
const HOTBAR_TILE_W = 48; // sm tile width
const HOTBAR_MIN_GAP = 8;
const HOTBAR_RESERVED = 8 + 8 + 48 + 4; // pl-2 + gap-2 + chevron width + pr-1
export function useMaxFitPins(ref) {
  const [maxFit, setMaxFit] = useState(MAX_PINS);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const recompute = () => {
      const width = el.getBoundingClientRect().width;
      const usable = Math.max(0, width - HOTBAR_RESERVED);
      // N tiles need: N*TILE_W + (N-1)*MIN_GAP <= usable
      // → N <= (usable + MIN_GAP) / (TILE_W + MIN_GAP)
      const fit = Math.max(1, Math.floor((usable + HOTBAR_MIN_GAP) / (HOTBAR_TILE_W + HOTBAR_MIN_GAP)));
      setMaxFit(Math.min(MAX_PINS, fit));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return maxFit;
}

// ─── Drag-and-drop hook ──────────────────────────────────────────────────
// Long-press a tool tile in the dropdown or hotbar to start a drag. Drag a
// ghost over the hotbar to place/reorder; from the hotbar, drop onto the
// modal grid to unpin. Hotbar-originated drags are only wired up while
// the modal is open — the hotbar is tap-only when the dropdown is closed.
// Tap is preserved by suppressing onClick only after the drag actually
// starts.

const DRAG_LONGPRESS_MS = 220;
const DRAG_THRESHOLD_PX = 6;

export function useToolDrag({ pins, pinActions, maxFitPins }) {
  // Active drag state: { key, fromHotbar, x, y, suppressClick }
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  // Mirror the drag state into a ref via effect so window listeners (which
  // close over stale snapshots) can read the latest value without re-binding
  // every render. Updating refs during render is unsafe (lints as an error).
  useEffect(() => { dragRef.current = drag; }, [drag]);

  // Track pending press without committing to drag yet — lets short taps
  // fall through to the normal click handler.
  const pressRef = useRef(null);

  const beginPress = useCallback(
    (key, fromHotbar, ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.currentTarget?.setPointerCapture?.(ev.pointerId);
      pressRef.current = {
        key,
        fromHotbar,
        startX: ev.clientX,
        startY: ev.clientY,
        pointerId: ev.pointerId,
        target: ev.currentTarget,
        longPressTimer: setTimeout(() => {
          // Long-press hit — promote to drag mode.
          if (pressRef.current?.key !== key) return;
          setDrag({
            key,
            fromHotbar,
            x: pressRef.current.startX,
            y: pressRef.current.startY,
            suppressClick: true,
          });
        }, DRAG_LONGPRESS_MS),
      };
    },
    [],
  );

  useEffect(() => {
    const onMove = (e) => {
      const press = pressRef.current;
      if (!press) return;
      const dx = e.clientX - press.startX;
      const dy = e.clientY - press.startY;
      // Movement larger than the threshold pre-empts the long-press timer
      // so quick swipes promote to drag without waiting.
      if (!dragRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        clearTimeout(press.longPressTimer);
        setDrag({
          key: press.key,
          fromHotbar: press.fromHotbar,
          x: e.clientX,
          y: e.clientY,
          suppressClick: true,
        });
        return;
      }
      if (dragRef.current) {
        setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      }
    };
    const finish = (e) => {
      const press = pressRef.current;
      if (press) {
        clearTimeout(press.longPressTimer);
        try { press.target?.releasePointerCapture?.(press.pointerId); } catch { /* already released */ }
      }
      const d = dragRef.current;
      pressRef.current = null;
      if (!d) {
        setDrag(null);
        return;
      }
      // Resolve the drop target from the element under the pointer.
      const x = e.clientX ?? d.x;
      const y = e.clientY ?? d.y;
      const el = document.elementFromPoint(x, y);
      const slot = el?.closest?.("[data-hotbar-slot]");
      const inHotbar = !!el?.closest?.("[data-testid='puzzle-hotbar']");
      const inToolList = !!el?.closest?.("[data-testid='puzzle-tool-modal']");
      if (d.fromHotbar) {
        // Hotbar-originated drags: the only valid drop target is the tool
        // list (dropping there unpins). Anywhere else — including other
        // hotbar slots and the board area — is a no-op so an accidental
        // drag off the hotbar can never silently lose pins.
        if (inToolList) {
          pinActions.remove(d.key);
        }
      } else if (slot) {
        const idx = Number.parseInt(slot.getAttribute("data-hotbar-slot"), 10);
        if (Number.isFinite(idx)) pinActions.placeAt(d.key, idx, maxFitPins);
      } else if (inHotbar) {
        // Dropped on the hotbar container (e.g., in the gap between two
        // slots) — place in the first empty slot, otherwise the last.
        const firstEmpty = Array.from({ length: maxFitPins }, (_, i) => pins[i] ?? null)
          .findIndex((k) => !k);
        const target = firstEmpty >= 0 ? firstEmpty : maxFitPins - 1;
        pinActions.placeAt(d.key, target, maxFitPins);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [pinActions, pins, maxFitPins]);

  return { drag, beginDrag: beginPress };
}

// Floating tile that follows the cursor while a hotbar drag is active.
export function DragGhost({ drag, tool }) {
  if (!drag || !tool) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: drag.x,
        top: drag.y,
        transform: "translate(-50%, -50%) scale(1.1)",
        pointerEvents: "none",
        zIndex: 1000,
        opacity: 0.9,
      }}
    >
      <ToolTile tool={tool} size="sm" />
    </div>
  );
}

// ─── Hotbar (portrait top rail) ──────────────────────────────────────────

export function PuzzleHotbar({
  state,
  dispatch,
  onInspectChange,
  inspectedKey,
  pins,
  onOpenModal,
  modalOpen,
  maxFitPins,
  dragKey,
  dragFromHotbar,
  onBeginDrag,
}) {
  const list = useMemo(() => buildVisibleToolList(state), [state]);
  useAutoInspectArmed(state, onInspectChange, inspectedKey);
  const byKey = useMemo(() => Object.fromEntries(list.map((t) => [t.key, t])), [list]);
  // Each pin slot is positional: slot `i` shows whatever tool sits at
  // `pins[i]`, or an empty placeholder when that entry is null / the
  // referenced tool isn't currently owned. The rail always renders
  // exactly `maxFitPins` slots so its footprint matches the container.
  const slots = useMemo(
    () => Array.from({ length: maxFitPins }, (_, i) => {
      const key = pins[i];
      return key && byKey[key] ? byKey[key] : null;
    }),
    [pins, byKey, maxFitPins],
  );
  const toolPending = state.toolPending;
  const fertilizerActive = state.fertilizerActive;
  const select = useCallback(
    (t) => {
      if (dispatch && !maybeTransferArming(dispatch, t.key, { toolPending, fertilizerActive })) {
        disarmOtherTools(dispatch, t.key, { toolPending, fertilizerActive });
      }
      onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
    },
    [dispatch, onInspectChange, toolPending, fertilizerActive],
  );
  const activate = useCallback(
    (t) => {
      onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
      if (dispatch) dispatchUseTool(dispatch, t.key, { toolPending, fertilizerActive });
    },
    [dispatch, onInspectChange, toolPending, fertilizerActive],
  );
  // Drop indicators light up only for drags originating in the dropdown
  // list — hotbar→list reordering already shows its own ghost and
  // hotbar-originated drags only resolve when dropped on the list, so
  // we don't draw a hotbar drop hint for them.
  const showHotbarDropHints = !!dragKey && dragFromHotbar === false;
  return (
    <div
      className="flex items-stretch gap-2 pl-2 pr-1"
      style={{
        background: "linear-gradient(#6b4a26,#54391d)",
        borderBottom: "1px solid #2a1a08",
        paddingTop: 6,
        paddingBottom: 6,
      }}
      data-testid="puzzle-hotbar"
    >
      <div className="flex-1 min-w-0 flex items-center justify-between">
        {slots.map((tool, i) => {
          if (tool) {
            return (
              <div
                key={tool.key}
                data-hotbar-slot={i}
                className="flex-shrink-0 relative"
                style={
                  showHotbarDropHints
                    ? { boxShadow: "0 0 0 2px rgba(240,193,75,0.55), 0 0 12px rgba(240,193,75,0.45)", borderRadius: 12 }
                    : undefined
                }
              >
                <ToolTile
                  tool={tool}
                  inspected={inspectedKey === tool.key}
                  onClick={select}
                  onActivate={activate}
                  // Hotbar tiles only initiate a drag while the dropdown
                  // is open — when it's closed, the rail is tap-only so
                  // a stray long-press can't accidentally unpin a tool.
                  onPointerDown={modalOpen ? (ev) => onBeginDrag?.(tool.key, true, ev) : undefined}
                  size="sm"
                  dragging={dragKey === tool.key}
                />
              </div>
            );
          }
          // Empty placeholder slot — dashed outline, accepts drops from the modal.
          return (
            <div
              key={`empty-${i}`}
              data-hotbar-slot={i}
              aria-hidden="true"
              className="flex-shrink-0 rounded-[11px]"
              style={{
                width: 48,
                height: 52,
                border: "1.5px dashed rgba(240,193,75,0.55)",
                background: showHotbarDropHints
                  ? "rgba(240,193,75,0.18)"
                  : "transparent",
              }}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 48,
          height: 52,
          borderRadius: 10,
          // Bright gold against the brown hotbar so the button reads as a
          // control rather than another tool slot. Pressed state inverts
          // to a deep brown so the open/close affordance is unambiguous.
          background: modalOpen
            ? "linear-gradient(180deg,#3a2412,#2a1a08)"
            : "linear-gradient(180deg,#f4c66b,#d99a2a)",
          border: "1.5px solid #2a1a08",
          color: modalOpen ? "#f0c14b" : "#3a2412",
          boxShadow: "0 2px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
          transition: "background 120ms ease, color 120ms ease",
        }}
        title={modalOpen ? "Close tools" : "Open tools"}
        aria-label={modalOpen ? "Close tools" : "Open tools"}
        aria-expanded={!!modalOpen}
        data-testid="puzzle-hotbar-open"
      >
        <div
          style={{
            fontSize: 24,
            lineHeight: 1,
            fontWeight: 900,
            transform: modalOpen ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        >▾</div>
      </button>
    </div>
  );
}

// ─── Tool modal ──────────────────────────────────────────────────────────

export function PuzzleToolModal({
  open,
  onClose,
  state,
  dispatch,
  pins,
  inspectedTool,
  onInspectChange,
  dragKey,
  dragFromHotbar,
  onBeginDrag,
}) {
  const list = useMemo(() => buildVisibleToolList(state), [state]);
  const byKey = useMemo(() => Object.fromEntries(list.map((t) => [t.key, t])), [list]);
  // The modal's selected tool defaults to whatever's already inspected;
  // otherwise the first visible tool so the detail area is never empty.
  // Derived: the modal mirrors whichever tool the player is inspecting in
  // the rest of the UI, but the modal can also drive that inspect (via the
  // grid below) — we only need a local override when the player picks
  // something inside the modal that differs from the outer inspect.
  const [localSelectedKey, setLocalSelectedKey] = useState(null);
  const openKey = open ? "1" : "0";
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset transient local selection when modal opens
  useEffect(() => { if (open) setLocalSelectedKey(null); }, [openKey, open]);

  if (!open) return null;
  const effectiveKey = localSelectedKey ?? inspectedTool?.key ?? list[0]?.key ?? null;
  const selectedTool = effectiveKey ? byKey[effectiveKey] : null;
  const select = (t) => {
    setLocalSelectedKey(t.key);
    if (!maybeTransferArming(dispatch, t.key, state)) {
      disarmOtherTools(dispatch, t.key, state);
    }
    onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
  };
  const activate = (t) => {
    setLocalSelectedKey(t.key);
    const willCancel = state.toolPending === t.key;
    const isArmable = isTapTargetTool(t.key);
    if (isArmable) {
      onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
    }
    dispatchUseTool(dispatch, t.key, state);
    if (!willCancel) {
      onClose?.();
      // Instant tools fire-and-clear: send the action panel back to the
      // resource (idle) view rather than leaving the tool detail showing.
      if (!isArmable) onInspectChange?.(null);
    }
  };
  const handleUse = () => {
    if (!selectedTool) return;
    const willCancel = state.toolPending === selectedTool.key;
    const isArmable = isTapTargetTool(selectedTool.key);
    dispatchUseTool(dispatch, selectedTool.key, state);
    if (!willCancel) {
      onClose?.();
      if (!isArmable) onInspectChange?.(null);
    }
  };
  const pinned = selectedTool ? pins.includes(selectedTool.key) : false;
  // Highlight the dropdown grid as a drop target whenever the player is
  // dragging a tool out of the hotbar — that's the only valid drop target
  // for hotbar-originated drags.
  const showListDropHint = !!dragKey && dragFromHotbar === true;

  // The dropdown floats *over* the board area rather than covering the
  // whole screen — no dark backdrop, capped height — so the player keeps
  // sight of the tiles they're about to act on.
  return (
    <>
      {/* Click-blocker behind the panel so taps under the dropdown can't
          fall through to the board canvas. Sized to extend well past the
          viewport so it covers the board no matter the layout. */}
      <div
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        aria-hidden="true"
        className="absolute"
        style={{
          top: "100%",
          left: "-50vw",
          right: "-50vw",
          bottom: "-200vh",
          zIndex: 54,
        }}
        data-testid="puzzle-tool-modal-backdrop"
      />
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Tools"
      className="absolute left-0 right-0 z-[55] flex justify-center pointer-events-none"
      style={{ top: "100%" }}
      data-testid="puzzle-tool-modal"
    >
      <style>{`
        @keyframes hwv-tool-modal-drop {
          from { transform: translateY(-12%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        className="w-full max-w-[520px] flex flex-col pointer-events-auto mx-2"
        style={{
          background: "linear-gradient(180deg,#4a2e14 0%,#362210 100%)",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          border: "1.5px solid #8a6428",
          borderTop: "none",
          maxHeight: "60dvh",
          boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
          animation: "hwv-tool-modal-drop 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "top center",
        }}
      >
        {/* Detail header. The close button now sits beside the title row
            instead of floating over the action buttons. */}
        <div
          className="relative"
          style={{
            background: "linear-gradient(180deg, rgba(253,243,227,0.97) 0%, rgba(246,227,191,0.97) 100%)",
            borderBottom: "1px solid #8a6428",
          }}
        >
          <div className="flex items-center justify-between gap-2 px-3 pt-2">
            <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-[#7a5520] uppercase tracking-[0.15em] min-w-0">
              <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: "#8a6a47" }} />
              <span className="truncate">Tool detail</span>
              {pinned && (
                <span className="text-[#8a6a47] normal-case tracking-normal font-bold">· pinned</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[#5b3a1e] font-extrabold leading-none flex-shrink-0"
              style={{ background: "rgba(138,100,40,0.18)", border: "1px solid rgba(138,100,40,0.4)", fontSize: 16 }}
              aria-label="Close tools"
            >×</button>
          </div>
          <div className="flex items-center gap-3 px-3 pt-1 pb-3">
            {selectedTool ? (
              <>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 13,
                    background: "#3a2412",
                    border: "2px solid #f0c14b",
                    boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 0 4px rgba(240,193,75,0.25)",
                  }}
                >
                  <LegacyIcon iconKey={selectedTool.iconKey} size={38} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div
                      className="text-[#3a2412] font-extrabold italic leading-none"
                      style={{ fontFamily: "Georgia, serif", fontSize: 18 }}
                    >
                      {selectedTool.name}
                    </div>
                    <span className="text-[10px] font-extrabold text-[#7a5520] uppercase tracking-wider">
                      × {selectedTool.count} left
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#5b3a1e] leading-snug mt-1.5 line-clamp-2">
                    {selectedTool.desc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUse}
                  disabled={selectedTool.count === 0 && state.toolPending !== selectedTool.key}
                  className="font-extrabold whitespace-nowrap disabled:opacity-50 flex-shrink-0 self-center"
                  style={{
                    background: isTapTargetTool(selectedTool.key)
                      ? "linear-gradient(180deg,#f4a050,#d97a2a)"
                      : "linear-gradient(180deg,#85c14a,#4e8425)",
                    color: "#0c2e10",
                    fontSize: 11,
                    padding: "7px 13px",
                    borderRadius: 8,
                    border: "1.5px solid #3a5a12",
                    boxShadow: "0 2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
                    letterSpacing: 0.5,
                  }}
                >
                  {isTapTargetTool(selectedTool.key) ? "ARM" : "✓ USE"}
                </button>
              </>
            ) : (
              <div className="text-[12px] text-[#5b3a1e] py-3">No tools available — head to the workshop or portal to craft some.</div>
            )}
          </div>
        </div>
        {/* Scrollable grid */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-3 rounded-b-md"
          style={
            showListDropHint
              ? { background: "rgba(240,193,75,0.10)", outline: "2px dashed rgba(240,193,75,0.55)", outlineOffset: -6 }
              : undefined
          }
        >
          <div
            className="text-[9px] font-extrabold uppercase tracking-widest text-[#caa97a] mb-2 px-0.5"
          >
            {showListDropHint
              ? "Drop here to unpin from the hotbar"
              : "Long-press a tool and drag it up to pin · double-tap to use"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              gap: 10,
            }}
          >
            {list.map((t) => (
              <ToolTile
                key={t.key}
                tool={t}
                inspected={effectiveKey === t.key}
                onClick={select}
                onActivate={activate}
                onPointerDown={(ev) => onBeginDrag?.(t.key, false, ev)}
                dragging={dragKey === t.key}
                hideArmed
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Board layout (template-areas grid; reshapes Phaser-free) ─────────────

const BOARD_LAYOUT_CSS = `
.hwv-board-layout {
  display: grid;
  width: 100%;
  height: 100%;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
  grid-template-areas:
    "hotbar"
    "panel"
    "board";
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr);
}
.hwv-board-layout > [data-area="hotbar"] { grid-area: hotbar; min-width: 0; }
.hwv-board-layout > [data-area="panel"]  { grid-area: panel; min-width: 0; }
.hwv-board-layout > [data-area="tools"]  { display: none; }
.hwv-board-layout > [data-area="board"]  { grid-area: board; min-height: 0; min-width: 0; }
@media (orientation: landscape) and (min-width: 500px) {
  .hwv-board-layout {
    grid-template-areas:
      "panel board"
      "tools board";
    grid-template-columns: minmax(360px, 44%) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .hwv-board-layout > [data-area="hotbar"] { display: none; }
  .hwv-board-layout > [data-area="tools"]  {
    display: block;
    grid-area: tools;
    min-height: 0;
    overflow: hidden;
  }
}
`;

export function BoardLayout({ hotbar, statusPanel, toolsGrid, board }) {
  return (
    <>
      <style>{BOARD_LAYOUT_CSS}</style>
      <div className="hwv-board-layout">
        <div data-area="hotbar">{hotbar}</div>
        <div data-area="panel">{statusPanel}</div>
        <div data-area="tools">{toolsGrid}</div>
        <div data-area="board">{board}</div>
      </div>
    </>
  );
}

// ─── Board frame ─────────────────────────────────────────────────────────

export function BoardFrame({ children, seasonIdx, armed = false }) {
  // Single rounded card — the dark brown chrome frames the tiles directly,
  // no field-tint padding wrapper around it. The cell containing the frame
  // gets a thin drop shadow for depth.
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        background: fieldGradientFor(seasonIdx),
        borderRadius: 14,
        boxShadow: "0 4px 0 rgba(0,0,0,0.25)",
      }}
    >
      {children}
      {armed && (
        <>
          <style>{`
            @keyframes hwv-armed-pulse {
              0%, 100% {
                box-shadow:
                  inset 0 0 0 4px rgba(255,40,40,0.95),
                  inset 0 0 0 8px rgba(255,40,40,0.45),
                  inset 0 0 32px rgba(255,40,40,0.55);
                opacity: 1;
              }
              50% {
                box-shadow:
                  inset 0 0 0 6px rgba(255,60,60,1),
                  inset 0 0 0 11px rgba(255,60,60,0.65),
                  inset 0 0 48px rgba(255,60,60,0.85);
                opacity: 0.85;
              }
            }
          `}</style>
          <div
            aria-hidden="true"
            data-testid="board-armed-border"
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: 14,
              animation: "hwv-armed-pulse 1100ms ease-in-out infinite",
              zIndex: 30,
            }}
          />
        </>
      )}
    </div>
  );
}
