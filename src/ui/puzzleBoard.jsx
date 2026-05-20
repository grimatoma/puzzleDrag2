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

import { useCallback, useEffect, useMemo, useState } from "react";
import LegacyIcon from "./Icon.jsx";
import { BIOMES } from "../constants.js";
import { TOOL_BY_KEY, isTapTargetTool, visibleTools, TOOL_CATALOG } from "./toolRegistry.js";
import { getPhaserScene } from "../phaserBridge.js";

const QUAD_COLORS = ["#b8d670", "#f0c14b", "#e07a3a", "#b4cfdf"];
const SEASON_GLYPHS = ["🌸", "☀️", "🍂", "❄️"];

const FIELD_GRADIENTS = [
  "linear-gradient(180deg,#92b85a 0%,#6d9438 100%)",
  "linear-gradient(180deg,#a8b948 0%,#7c9628 100%)",
  "linear-gradient(180deg,#b78f3a 0%,#8a6428 100%)",
  "linear-gradient(180deg,#a8bfc7 0%,#7c98a5 100%)",
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

// ─── Season wheel ────────────────────────────────────────────────────────

export function SeasonWheel({ turnsUsed, turnBudget, turnsRemaining, seasonIdx, seasonName }) {
  const total = Math.max(1, turnBudget | 0);
  const used = Math.max(0, Math.min(total, turnsUsed | 0));
  // Trust the reducer-supplied `turnsRemaining` if it's provided — it accounts
  // for mid-resolution state the raw subtraction can't see — and fall back to
  // total-used otherwise.
  const remaining = Number.isFinite(turnsRemaining) ? Math.max(0, turnsRemaining) : total - used;
  const angle = (used / total) * 360 - 90;
  const sunX = 32 + 24 * Math.cos((angle * Math.PI) / 180);
  const sunY = 32 + 24 * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="inline-flex items-center gap-2.5 min-w-0">
      <svg width="52" height="52" viewBox="0 0 64 64" className="flex-shrink-0" aria-hidden="true">
        {QUAD_COLORS.map((c, i) => {
          const a0 = ((i * 90 - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * 90 - 90) * Math.PI) / 180;
          const x0 = 32 + 28 * Math.cos(a0);
          const y0 = 32 + 28 * Math.sin(a0);
          const x1 = 32 + 28 * Math.cos(a1);
          const y1 = 32 + 28 * Math.sin(a1);
          const active = i === seasonIdx;
          return (
            <path
              key={i}
              d={`M 32 32 L ${x0} ${y0} A 28 28 0 0 1 ${x1} ${y1} Z`}
              fill={c}
              opacity={active ? 1 : 0.45}
              stroke="#3a2412"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="32" cy="32" r="16" fill="#fdf3e3" stroke="#3a2412" strokeWidth="1.5" />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#3a2412"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          data-testid="turns-left"
        >
          {remaining}
        </text>
        <circle cx={sunX} cy={sunY} r="5" fill="#fff8e7" stroke="#3a2412" strokeWidth="1.5" />
        <circle cx={sunX} cy={sunY} r="2" fill="#f0c14b" />
      </svg>
      <div className="leading-tight min-w-0">
        <div className="text-[#f6e3bf] font-extrabold text-[15px] flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[16px]">{SEASON_GLYPHS[seasonIdx] ?? ""}</span>
          {seasonName}
        </div>
        <div className="text-[#caa97a] text-[10px] font-extrabold uppercase tracking-wider mt-0.5 whitespace-nowrap">
          <span className="text-[#f0c14b] font-mono">{remaining}</span> turn{remaining === 1 ? "" : "s"} left
        </div>
      </div>
    </div>
  );
}

// ─── Action panel ────────────────────────────────────────────────────────

function PanelHeader({ left, right, accent }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-dashed border-[rgba(138,100,40,0.55)] relative">
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-[#7a5520] uppercase tracking-[0.15em]">
        {accent && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: accent }} />}
        {left}
      </div>
      {right && (
        <div className="text-[9.5px] text-[#8a6a47] font-bold uppercase tracking-wider">{right}</div>
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
                background: empty ? "rgba(138,106,71,0.10)" : "#fff5dc",
                border: `1px solid ${empty ? "transparent" : "#caa97a"}`,
                opacity: empty ? 0.55 : 1,
              }}
              title={`${r.label ?? r.key}: ${count}`}
            >
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{ width: `${pct * 100}%`, background: "rgba(124,179,66,0.12)" }}
              />
              <LegacyIcon iconKey={r.key} size={20} />
              <span
                className="font-mono font-bold text-[13px] text-[#3a2412] relative tabular-nums"
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

function ChainView({ chainInfo }) {
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
              background: "rgba(58,36,18,0.18)",
              border: "2px solid #3a2412",
              boxShadow:
                earned >= 2
                  ? `inset 0 2px 4px rgba(0,0,0,0.22), 0 0 0 2px ${stage.accent}, 0 0 12px ${stage.accent}66`
                  : "inset 0 2px 4px rgba(0,0,0,0.22)",
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(180deg, ${stage.top} 0%, ${stage.bot} 100%)`,
                boxShadow:
                  "inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
                transition: "width 120ms ease-out",
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[#fff8e7]"
              style={{
                fontSize: 24,
                letterSpacing: 1,
                textShadow: "0 2px 0 rgba(0,0,0,0.45), 0 0 6px rgba(0,0,0,0.35)",
              }}
            >
              {threshold > 0 ? (
                <>
                  {length}
                  <span style={{ opacity: 0.7 }}>/</span>
                  {threshold}
                </>
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
              background: "#3a2412",
              border: earned > 0 ? `2px solid ${stage.accent}` : "2px solid #3a2412",
              boxShadow:
                earned > 0
                  ? `inset 0 -3px 0 rgba(0,0,0,0.35), 0 2px 0 rgba(0,0,0,0.3), 0 0 0 3px ${stage.accent}33`
                  : "inset 0 -3px 0 rgba(0,0,0,0.35), 0 2px 0 rgba(0,0,0,0.3)",
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
                border: "2px solid #1a0d05",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 14,
                boxShadow: `0 2px 0 rgba(0,0,0,0.35), 0 0 8px ${stage.accent}99`,
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
          className="flex items-center gap-2 px-2.5 py-1.5 border-t border-dashed border-[rgba(138,100,40,0.55)]"
          style={{ background: "rgba(138,100,40,0.06)" }}
        >
          <div className="text-[9px] font-extrabold text-[#7a5520] uppercase tracking-wider whitespace-nowrap">
            Upgrade to
          </div>
          {upgradeKey ? <LegacyIcon iconKey={upgradeKey} size={18} /> : null}
          <span className="text-[11px] font-extrabold text-[#3a2412] whitespace-nowrap">
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

function ToolView({ tool, armedKey, dispatch, onClose }) {
  const targeted = isTapTargetTool(tool.key);
  const armed = armedKey === tool.key;
  const count = tool.count ?? 0;
  const handleUse = () => {
    dispatchUseTool(dispatch, tool.key, { toolPending: armedKey });
  };
  const handleClose = () => {
    if (armed) dispatch({ type: "CANCEL_TOOL" });
    onClose?.();
  };
  return (
    <>
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-dashed border-[rgba(138,100,40,0.55)]">
        <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-[#7a5520] uppercase tracking-[0.15em]">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: armed ? "#e07a3a" : "#8a6a47" }}
          />
          {targeted ? "Tool armed" : armed ? "Tool ready" : "Tool inspect"}
          <span className="font-bold text-[#8a6a47] normal-case tracking-normal">
            · × {count} left
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#5b3a1e] font-extrabold leading-none"
          style={{
            background: "rgba(138,100,40,0.18)",
            border: "1px solid rgba(138,100,40,0.4)",
            fontSize: 14,
          }}
          title="Cancel"
          aria-label="Cancel tool"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2 flex-1 min-h-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 64,
            height: 64,
            borderRadius: 13,
            background: "#3a2412",
            border: "2px solid #f0c14b",
            boxShadow:
              "0 2px 0 rgba(0,0,0,0.3), inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 0 4px rgba(240,193,75,0.25)",
          }}
        >
          <LegacyIcon iconKey={tool.iconKey} size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[#3a2412] font-extrabold italic leading-none"
            style={{ fontFamily: "Georgia, serif", fontSize: 19 }}
          >
            {tool.name}
          </div>
          <div
            className="text-[11.5px] text-[#5b3a1e] leading-snug mt-1.5 overflow-hidden"
            style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
          >
            {tool.desc}
          </div>
        </div>
      </div>
      {targeted ? (
        <div
          className="flex items-center justify-center gap-2 py-1.5 border-t border-dashed border-[rgba(138,100,40,0.55)] text-[#7a3c12] uppercase font-extrabold"
          style={{
            background: "linear-gradient(180deg, rgba(224,122,58,0.18), rgba(224,122,58,0.30))",
            fontSize: 11,
            letterSpacing: 1.5,
          }}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 16,
              height: 16,
              borderRadius: 50,
              background: "#e07a3a",
              color: "#fff8e7",
              fontSize: 10,
            }}
          >
            ◎
          </span>
          {armed ? "Tap a tile to use" : "Press to arm — then tap a tile"}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1.5 border-t border-dashed border-[rgba(138,100,40,0.55)]">
          <div className="text-[10.5px] font-extrabold text-[#7a5520] flex-1">
            Affects entire board
          </div>
          <button
            type="button"
            onClick={handleUse}
            disabled={count === 0 && !armed}
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
      // layout — matches PANEL_HEIGHT = 178 in the design mock.
      className="rounded-[13px] relative overflow-hidden flex flex-col flex-shrink-0"
      style={{
        height: 178,
        background:
          "linear-gradient(180deg, rgba(253,243,227,0.97) 0%, rgba(246,227,191,0.97) 100%)",
        border: "1.5px solid #8a6428",
        boxShadow: "0 3px 0 rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.55)",
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
        {state === "chain" && <ChainView chainInfo={chainInfo} />}
        {state === "tool" && (
          <ToolView
            tool={inspectedTool}
            armedKey={armedTool?.key}
            dispatch={dispatch}
            onClose={onCloseInspect}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tools strip ─────────────────────────────────────────────────────────

function dispatchUseTool(dispatch, key, state) {
  const isPending = state.toolPending === key;
  if (isPending) {
    dispatch({ type: "CANCEL_TOOL" });
    return;
  }
  const def = TOOL_BY_KEY[key];
  if (def?.category === "magic") {
    dispatch({ type: "USE_TOOL", payload: { id: key } });
  } else {
    dispatch({ type: "USE_TOOL", key });
  }
  if (key === "shuffle") getPhaserScene()?.shuffleBoard();
}

// ─── Tool tile (shared by hotbar / grid / modal) ─────────────────────────

function ToolTile({ tool, inspected, onClick, size = "md" }) {
  const armed = !!tool.armed;
  const dims = size === "sm"
    ? { w: 48, h: 52, icon: 22, name: 9, badge: 12, badgePad: "1px 6px", badgeMin: 18 }
    : { w: 58, h: 62, icon: 26, name: 9.5, badge: 14, badgePad: "2px 8px", badgeMin: 20 };
  return (
    <button
      type="button"
      onClick={() => onClick?.(tool)}
      className="flex-shrink-0 flex flex-col items-center justify-end relative"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: 11,
        padding: "4px 0 5px",
        background: armed ? "#fdf3e3" : inspected ? "rgba(240,193,75,0.18)" : "rgba(255,255,255,0.04)",
        border: armed
          ? "2px solid #f0c14b"
          : inspected
          ? "2px solid rgba(240,193,75,0.55)"
          : "1.5px solid rgba(255,255,255,0.08)",
        color: armed ? "#3a2412" : "#caa97a",
        boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
        opacity: tool.count === 0 && !armed ? 0.55 : 1,
      }}
      title={tool.name}
      aria-label={`${tool.name} (${tool.count})`}
      data-tool-key={tool.key}
      data-armed={armed ? "true" : "false"}
    >
      <div
        className="absolute font-mono font-extrabold text-center"
        style={{
          top: -8,
          right: -6,
          background: armed ? "#3a2412" : "#1a0d05",
          border: `2px solid ${armed ? "#f0c14b" : "#caa97a"}`,
          borderRadius: 10,
          fontSize: dims.badge,
          padding: dims.badgePad,
          color: armed ? "#f0c14b" : "#fff8e7",
          boxShadow: "0 2px 0 rgba(0,0,0,0.35), inset 0 -1px 0 rgba(0,0,0,0.3)",
          minWidth: dims.badgeMin,
        }}
      >
        {tool.count}
      </div>
      <LegacyIcon iconKey={tool.iconKey} size={dims.icon} />
      <div className="font-extrabold mt-0.5" style={{ fontSize: dims.name, letterSpacing: 0.2 }}>
        {tool.name}
      </div>
    </button>
  );
}

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
function useAutoInspectArmed(state, onInspectChange) {
  useEffect(() => {
    if (!onInspectChange) return;
    if (state.toolPending && TOOL_BY_KEY[state.toolPending]) {
      onInspectChange({
        ...TOOL_BY_KEY[state.toolPending],
        count: state.tools?.[state.toolPending] ?? 0,
      });
    }
  }, [state.toolPending, state.tools, onInspectChange]);
}

// ─── Tool grid (side-by-side left column) ────────────────────────────────

export function PuzzleToolGrid({ state, onInspectChange, inspectedKey }) {
  const list = useMemo(() => buildVisibleToolList(state), [state.tools, state.toolPending, state.fertilizerActive]);
  useAutoInspectArmed(state, onInspectChange);
  const select = useCallback(
    (t) => onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count }),
    [onInspectChange],
  );
  return (
    <div
      className="h-full overflow-y-auto rounded-[11px]"
      style={{
        background: "linear-gradient(#1a0d05,#241710)",
        border: "1px solid #0a0506",
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
          <ToolTile key={t.key} tool={t} inspected={inspectedKey === t.key} onClick={select} />
        ))}
      </div>
    </div>
  );
}

// ─── Pinned-tools persistence ────────────────────────────────────────────

const PIN_STORAGE_KEY = "hearthwood:hotbar-pins";
// Cap matches what fits comfortably on a phone-portrait hotbar (≈ 5 starter
// tools + chevron, with one slot in reserve). Once full, the PIN button
// disables and the player has to unpin one before pinning a new tool.
export const MAX_PINS = 6;
const DEFAULT_PINS = TOOL_CATALOG
  .filter((t) => t.category === "field")
  .slice(0, MAX_PINS)
  .map((t) => t.key);

function readStoredPins() {
  try {
    const raw = typeof window !== "undefined" && window.localStorage?.getItem(PIN_STORAGE_KEY);
    if (!raw) return DEFAULT_PINS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PINS.slice();
    return parsed.filter((k) => typeof k === "string" && TOOL_BY_KEY[k]).slice(0, MAX_PINS);
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
  const toggle = useCallback((key) => {
    if (!TOOL_BY_KEY[key]) return;
    setPins((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Silently ignore over-cap pins — the caller is expected to disable
      // its PIN affordance when `pins.length >= MAX_PINS`.
      if (prev.length >= MAX_PINS) return prev;
      return [...prev, key];
    });
  }, []);
  return [pins, toggle];
}

// ─── Hotbar (portrait top rail) ──────────────────────────────────────────

export function PuzzleHotbar({ state, onInspectChange, inspectedKey, pins, onOpenModal }) {
  const list = useMemo(() => buildVisibleToolList(state), [state.tools, state.toolPending, state.fertilizerActive]);
  useAutoInspectArmed(state, onInspectChange);
  const byKey = useMemo(() => Object.fromEntries(list.map((t) => [t.key, t])), [list]);
  // Show only currently-visible pinned tools (skip pins for tools the
  // player has lost or never owned — pin order is preserved).
  const visiblePins = pins.map((k) => byKey[k]).filter(Boolean);
  const select = useCallback(
    (t) => onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count }),
    [onInspectChange],
  );
  return (
    <div
      className="flex items-center gap-2 pl-2 pr-1"
      style={{
        background: "linear-gradient(#1a0d05,#241710)",
        borderBottom: "1px solid #0a0506",
        paddingTop: 12, // room for the count badges that sit at `top:-8`
        paddingBottom: 8,
      }}
      data-testid="puzzle-hotbar"
    >
      <div
        className="flex-1 min-w-0 flex items-center overflow-x-auto"
        style={{ gap: 12, paddingRight: 10 }}
      >
        {visiblePins.length === 0 ? (
          <div className="text-[#8a6a47] text-[10px] font-bold uppercase tracking-wider px-2">
            Tap ▾ to pin tools
          </div>
        ) : (
          visiblePins.map((t) => (
            <ToolTile key={t.key} tool={t} inspected={inspectedKey === t.key} onClick={select} size="sm" />
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="flex-shrink-0 flex flex-col items-center justify-center"
        style={{
          width: 44,
          height: 52,
          borderRadius: 10,
          background: "rgba(240,193,75,0.10)",
          border: "1.5px dashed rgba(240,193,75,0.55)",
          color: "#f0c14b",
          flexShrink: 0,
        }}
        title="Open tools"
        aria-label="Open tools"
        data-testid="puzzle-hotbar-open"
      >
        <div style={{ fontSize: 18, lineHeight: 1 }}>▾</div>
        <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: 0.5, marginTop: 2 }}>TOOLS</div>
      </button>
    </div>
  );
}

// ─── Tool modal ──────────────────────────────────────────────────────────

export function PuzzleToolModal({ open, onClose, state, dispatch, pins, togglePin, inspectedTool, onInspectChange }) {
  const list = useMemo(() => buildVisibleToolList(state), [state.tools, state.toolPending, state.fertilizerActive]);
  const byKey = useMemo(() => Object.fromEntries(list.map((t) => [t.key, t])), [list]);
  // The modal's selected tool defaults to whatever's already inspected;
  // otherwise the first visible tool so the detail area is never empty.
  // Derived: the modal mirrors whichever tool the player is inspecting in
  // the rest of the UI, but the modal can also drive that inspect (via the
  // grid below) — we only need a local override when the player picks
  // something inside the modal that differs from the outer inspect.
  const [localSelectedKey, setLocalSelectedKey] = useState(null);
  // Reset the local override when the modal opens so the first paint shows
  // whatever the rest of the UI already had inspected.
  const openKey = open ? "1" : "0";
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset transient local selection when modal opens
  useEffect(() => { if (open) setLocalSelectedKey(null); }, [openKey, open]);

  if (!open) return null;
  const effectiveKey = localSelectedKey ?? inspectedTool?.key ?? list[0]?.key ?? null;
  const selectedTool = effectiveKey ? byKey[effectiveKey] : null;
  const select = (t) => {
    setLocalSelectedKey(t.key);
    onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count });
  };
  const handleUse = () => {
    if (!selectedTool) return;
    dispatchUseTool(dispatch, selectedTool.key, { toolPending: state.toolPending });
    onClose?.();
  };
  const visiblePins = pins.map((k) => byKey[k]).filter(Boolean);
  const pinned = selectedTool ? pins.includes(selectedTool.key) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center"
      style={{ background: "rgba(10,5,3,0.55)" }}
      data-testid="puzzle-tool-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <style>{`
        @keyframes hwv-tool-modal-drop {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        className="w-full max-w-[520px] flex flex-col"
        style={{
          background: "linear-gradient(180deg,#241710 0%,#1a0d05 100%)",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          border: "1.5px solid #8a6428",
          borderTop: "none",
          maxHeight: "78dvh",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          animation: "hwv-tool-modal-drop 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "top center",
        }}
      >
        {/* Detail */}
        <div
          className="flex items-center gap-3 p-3 relative"
          style={{
            background: "linear-gradient(180deg, rgba(253,243,227,0.97) 0%, rgba(246,227,191,0.97) 100%)",
            borderBottom: "1px solid #8a6428",
          }}
        >
          {selectedTool ? (
            <>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 13,
                  background: "#3a2412",
                  border: "2px solid #f0c14b",
                  boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 0 4px rgba(240,193,75,0.25)",
                }}
              >
                <LegacyIcon iconKey={selectedTool.iconKey} size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <div
                    className="text-[#3a2412] font-extrabold italic leading-none"
                    style={{ fontFamily: "Georgia, serif", fontSize: 19 }}
                  >
                    {selectedTool.name}
                  </div>
                  <span className="text-[10px] font-extrabold text-[#7a5520] uppercase tracking-wider">
                    × {selectedTool.count} left
                  </span>
                </div>
                <div className="text-[11.5px] text-[#5b3a1e] leading-snug mt-1.5 line-clamp-3">
                  {selectedTool.desc}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => togglePin(selectedTool.key)}
                  disabled={!pinned && pins.length >= MAX_PINS}
                  className="font-extrabold whitespace-nowrap disabled:cursor-not-allowed"
                  style={{
                    fontSize: 10,
                    padding: "5px 9px",
                    borderRadius: 7,
                    background: pinned ? "#3a2412" : "rgba(58,36,18,0.10)",
                    color: pinned ? "#f0c14b" : "#5b3a1e",
                    border: pinned ? "1.5px solid #f0c14b" : "1.5px solid rgba(58,36,18,0.4)",
                    letterSpacing: 0.5,
                    opacity: !pinned && pins.length >= MAX_PINS ? 0.55 : 1,
                  }}
                  title={
                    pinned
                      ? "Unpin from hotbar"
                      : pins.length >= MAX_PINS
                      ? "Hotbar full — unpin one first"
                      : "Pin to hotbar"
                  }
                >
                  📌 {pinned ? "PINNED" : pins.length >= MAX_PINS ? "FULL" : "PIN"}
                </button>
                <button
                  type="button"
                  onClick={handleUse}
                  disabled={selectedTool.count === 0 && state.toolPending !== selectedTool.key}
                  className="font-extrabold whitespace-nowrap disabled:opacity-50"
                  style={{
                    background: isTapTargetTool(selectedTool.key)
                      ? "linear-gradient(180deg,#f4a050,#d97a2a)"
                      : "linear-gradient(180deg,#85c14a,#4e8425)",
                    color: "#0c2e10",
                    fontSize: 11,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #3a5a12",
                    boxShadow: "0 2px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
                    letterSpacing: 0.5,
                  }}
                >
                  {isTapTargetTool(selectedTool.key) ? "ARM" : "✓ USE"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-[12px] text-[#5b3a1e] py-3">No tools available — head to the workshop or portal to craft some.</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[#5b3a1e] font-extrabold"
            style={{ background: "rgba(138,100,40,0.18)", border: "1px solid rgba(138,100,40,0.4)", fontSize: 14 }}
            aria-label="Close tools"
          >×</button>
        </div>
        {/* Scrollable grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              gap: 10,
            }}
          >
            {list.map((t) => (
              <ToolTile key={t.key} tool={t} inspected={effectiveKey === t.key} onClick={select} />
            ))}
          </div>
        </div>
        {/* Pinned-hotbar preview at the bottom.
            pt-5 + extra padding-right on the scroller leave room for the
            count badges, which sit at `top:-8 right:-6` on each ToolTile
            and were getting clipped at the previous compact spacing. */}
        <div
          className="px-3 pt-5 pb-3 flex items-center gap-3"
          style={{
            background: "rgba(26,13,5,0.8)",
            borderTop: "1px solid #0a0506",
          }}
        >
          <div className="text-[#caa97a] text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap">
            Pinned <span className="text-[#8a6a47]">{visiblePins.length}/{MAX_PINS}</span>
          </div>
          <div
            className="flex-1 min-w-0 flex items-center overflow-x-auto"
            style={{ gap: 12, paddingRight: 10 }}
          >
            {visiblePins.length === 0 ? (
              <div className="text-[#8a6a47] text-[10px] italic">Pin tools above to add them</div>
            ) : (
              visiblePins.map((t) => (
                <ToolTile key={t.key} tool={t} inspected={effectiveKey === t.key} onClick={select} size="sm" />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
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
    grid-template-columns: 240px minmax(0, 1fr);
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

export function BoardFrame({ children, seasonIdx }) {
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
    </div>
  );
}
