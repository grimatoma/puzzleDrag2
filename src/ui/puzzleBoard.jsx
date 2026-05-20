/**
 * Hearthwood Vale puzzle-board chrome: the four pieces of the board view's
 * visual frame, ported from the design mock at
 * 04cd42d7-Hearthwood_Vale_Puzzle_Board.html.
 *
 *   - SeasonWheel        — circular 4-quadrant year wheel for the HUD.
 *   - PuzzleActionPanel  — cream paper card with idle/chain/tool states.
 *   - PuzzleToolStrip    — horizontal scrolling tool tray with count pills.
 *   - BoardFrame         — dark-brown rounded card around the Phaser host.
 *
 * All four read from existing game state; no new slices or actions.
 */

import { useEffect, useMemo } from "react";
import LegacyIcon from "./Icon.jsx";
import { BIOMES } from "../constants.js";
import { TOOL_BY_KEY, isTapTargetTool, visibleTools } from "./toolRegistry.js";
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

export function PuzzleToolStrip({ state, onInspectChange, inspectedKey, orientation = "horizontal" }) {
  const list = useMemo(() => {
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
  }, [state.tools, state.toolPending, state.fertilizerActive]);

  // Whichever tool is currently armed (toolPending) auto-shows its detail.
  // Tapping a different tool just sets the inspect; the player presses
  // USE NOW (or Tap a tile) in the detail panel to actually trigger it.
  useEffect(() => {
    if (!onInspectChange) return;
    if (state.toolPending && TOOL_BY_KEY[state.toolPending]) {
      onInspectChange({
        ...TOOL_BY_KEY[state.toolPending],
        count: state.tools?.[state.toolPending] ?? 0,
      });
    }
  }, [state.toolPending, state.tools, onInspectChange]);

  const isVertical = orientation === "vertical";
  return (
    <div
      className={isVertical ? "h-full flex flex-col" : "flex-shrink-0"}
      style={{
        background: "linear-gradient(#1a0d05,#241710)",
        borderBottom: isVertical ? "none" : "1px solid #0a0506",
      }}
    >
      <div
        className={
          isVertical
            ? "flex flex-col gap-2 px-2 pt-3 pb-1 overflow-y-auto h-full"
            : "flex gap-1.5 px-2.5 pt-3.5 pb-1 overflow-x-auto"
        }
        data-testid="puzzle-tool-strip"
        data-orientation={orientation}
      >
        {list.map((t) => {
          const active = t.armed;
          const inspected = inspectedKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onInspectChange?.({ ...TOOL_BY_KEY[t.key], count: t.count })}
              className="flex-shrink-0 flex flex-col items-center justify-end relative"
              style={{
                width: 58,
                height: 62,
                borderRadius: 11,
                padding: "4px 0 5px",
                background: active ? "#fdf3e3" : inspected ? "rgba(240,193,75,0.18)" : "rgba(255,255,255,0.04)",
                border: active
                  ? "2px solid #f0c14b"
                  : inspected
                  ? "2px solid rgba(240,193,75,0.55)"
                  : "1.5px solid rgba(255,255,255,0.08)",
                color: active ? "#3a2412" : "#caa97a",
                boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
                opacity: t.count === 0 && !active ? 0.55 : 1,
              }}
              title={t.name}
              aria-label={`${t.name} (${t.count})`}
              data-tool-key={t.key}
              data-armed={active ? "true" : "false"}
            >
              <div
                className="absolute font-mono font-extrabold text-center"
                style={{
                  top: -8,
                  right: -6,
                  background: active ? "#3a2412" : "#1a0d05",
                  border: `2px solid ${active ? "#f0c14b" : "#caa97a"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  padding: "2px 8px",
                  color: active ? "#f0c14b" : "#fff8e7",
                  boxShadow:
                    "0 2px 0 rgba(0,0,0,0.35), inset 0 -1px 0 rgba(0,0,0,0.3)",
                  minWidth: 20,
                }}
              >
                {t.count}
              </div>
              <LegacyIcon iconKey={t.iconKey} size={26} />
              <div className="font-extrabold mt-0.5" style={{ fontSize: 9.5, letterSpacing: 0.2 }}>
                {t.name}
              </div>
            </button>
          );
        })}
      </div>
      {!isVertical && (
        <div
          className="text-center font-extrabold"
          style={{ color: "#5b3a1e", fontSize: 9, letterSpacing: 1, marginTop: 2, paddingBottom: 4 }}
        >
          <span style={{ color: "#8a6a47" }}>‹ swipe ›</span>
        </div>
      )}
    </div>
  );
}

// ─── Board frame ─────────────────────────────────────────────────────────

export function BoardFrame({ children, seasonIdx }) {
  return (
    <div
      className="w-full h-full p-2.5 box-border"
      style={{ background: fieldGradientFor(seasonIdx) }}
    >
      <div
        className="w-full h-full relative"
        style={{
          background: "linear-gradient(#3e2818,#2c1a0d)",
          borderRadius: 14,
          padding: 8,
          boxShadow:
            "inset 0 0 0 2px #1a0d05, 0 4px 0 rgba(0,0,0,0.25)",
        }}
      >
        <div className="w-full h-full relative overflow-hidden rounded-md">{children}</div>
      </div>
    </div>
  );
}
