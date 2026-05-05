import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BIOMES, NPCS, SEASONS, MAX_TURNS, BUILDINGS, RECIPES } from "./constants.js";
import { xpForLevel, resourceByKey } from "./state.js";
import { seasonIndexForTurns } from "./utils.js";
import { MoodPanel } from "./features/mood/index.jsx";
import { ApprenticesPanel } from "./features/apprentices/index.jsx";

// Mechanical effect active each calendar season (seasonsCycled % 4)
const SEASON_EFFECTS = [
  "🌱 +20% harvest",  // Spring
  "☀️ 2× order pay",  // Summer
  "🍂 2× upgrades",   // Autumn
  "❄️ 4+ chain min",  // Winter
];

const TOOL_DEFS = [
  { key: "clear", icon: "⚔", name: "Scythe", desc: "Clears tiles from the board and collects +5 basic resources." },
  { key: "basic", icon: "+", name: "Seedpack", desc: "Instantly adds +5 basic resources to your inventory." },
  { key: "rare", icon: "★", name: "Lockbox", desc: "Grants +2 rare resources directly to your inventory." },
  { key: "shuffle", icon: "↻", name: "Reshuffle Horn", desc: "Reshuffles all tiles on the board for a fresh layout." },
];

// ─── HUD (top bar) ─────────────────────────────────────────────────────────

export function Hud({ state, dispatch }) {
  const { coins, level, xp, turnsUsed, built, view, seasonsCycled } = state;
  const onBoard = view === "board";
  const seasonIdx = seasonIndexForTurns(turnsUsed);
  const season = SEASONS[seasonIdx];
  const calendarSeason = (seasonsCycled || 0) % 4;
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const turnsLeft = MAX_TURNS - turnsUsed;
  const buildingCount = Object.keys(built || {}).length;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#5b3b20] border-b-2 border-[#2a1d0f] text-[#6a4b31] flex-wrap" data-testid="hud">
      <button
        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "menu" })}
        className="w-8 h-8 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[18px] flex-shrink-0"
        data-testid="menu-btn"
      >≡</button>
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

function Pill({ children, className = "" }) {
  return (
    <div className={`bg-[#f6efe0] border-2 border-[#b28b62] rounded-full px-3 py-1 flex items-center gap-1.5 text-[#6a4b31] ${className}`}>{children}</div>
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
                backgroundColor: filled ? cssFromHex(season.fill) : "#fff",
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

function cssFromHex(intHex) {
  return `#${intHex.toString(16).padStart(6, "0")}`;
}

// ─── Side panel (orders / inventory / tools / biome switcher) ─────────────

export function SidePanel({ state, dispatch, chainInfo }) {
  return (
    <div className="bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] rounded-2xl p-3 flex flex-col gap-3 overflow-hidden h-full min-h-0">
      {chainInfo && (
        <div className="bg-[#2b2218]/90 border border-[#ffd248] rounded-xl px-3 py-2 text-[#ffd248] font-bold text-[13px] text-center flex-shrink-0">
          chain × {chainInfo.count}{chainInfo.upgrades > 0 ? `  +${chainInfo.upgrades}★` : ""}
        </div>
      )}
      <Section title="Tools" titleColor="#f8e7c6">
        <ToolsGrid tools={state.tools} onUse={(key) => {
          dispatch({ type: "USE_TOOL", key });
          if (key === "shuffle") window.__phaserScene?.shuffleBoard();
        }} />
      </Section>
      <Section title="Orders" titleColor="#f8e7c6">
        <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
      </Section>
    </div>
  );
}

function CompactOrders({ orders, inventory, dispatch }) {
  return (
    <div className="flex flex-col gap-1.5">
      {orders.map((o) => {
        const have = inventory[o.key] || 0;
        const done = have >= o.need;
        const res = resourceByKey(o.key);
        const recipe = !res ? RECIPES[o.key] : null;
        const glyph = res ? res.glyph : recipe?.glyph ?? "?";
        const label = res ? res.label : recipe?.name ?? o.key;
        return (
          <button
            key={o.id}
            onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id })}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-left border transition-colors ${done ? "bg-[#91bf24]/40 border-[#91bf24] text-white" : "bg-[#4a2e18] border-[#7a5038] text-[#f8e7c6]"}`}
          >
            <span className="text-[14px] flex-shrink-0">{glyph}</span>
            <span className="flex-1 min-w-0 text-[10px] font-bold truncate">{label}</span>
            <span className={`text-[10px] font-bold whitespace-nowrap ${done ? "text-white" : have > 0 ? "text-[#f7c254]" : "text-[#c5a87a]"}`}>
              {Math.min(have, o.need)}/{o.need}
            </span>
            {done && <span className="text-[9px] text-white font-bold">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, titleColor = "#f8e7c6", children }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="font-bold text-[14px] landscape:max-[1024px]:text-[11px] tracking-wide" style={{ color: titleColor }}>{title}</div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}


// Per-key order status:
//   "ready"  — at least one open order has all needed resources
//   "needed" — at least one open order needs more of this resource
//   "excess" — non-zero stash but no open order asks for it
//   "idle"   — neither in stash nor in any order
function orderStatusByKey(orders, inventory) {
  const status = {};
  const totals = {};
  for (const o of orders) {
    totals[o.key] = (totals[o.key] || 0) + o.need;
    const have = inventory[o.key] || 0;
    if (have >= o.need) status[o.key] = "ready";
    else if (status[o.key] !== "ready") status[o.key] = "needed";
  }
  return { status, totals };
}

function InventoryCell({ r, count, compact, orderStatus, orderTotal }) {
  // Visual states layered on top of the base cell.
  const ready  = orderStatus === "ready";
  const needed = orderStatus === "needed";
  const excess = !orderStatus && count > 0;
  const ringStyle = ready
    ? { boxShadow: "0 0 0 2px #91bf24, 0 0 12px rgba(145,191,36,.55)" }
    : needed
    ? { boxShadow: "0 0 0 2px #f7c254" }
    : excess
    ? { boxShadow: "0 0 0 1px rgba(255,255,255,.18)" }
    : {};
  const tagText = ready
    ? `✓ Order ${orderTotal}`
    : needed
    ? `Need ${orderTotal}`
    : excess
    ? "Excess"
    : null;
  const tagColor = ready ? "bg-[#91bf24]" : needed ? "bg-[#f7c254] text-[#3a2715]" : "bg-white/20";
  return (
    <div
      className={`relative bg-[#b68d64] border-2 border-[#e6c49a] rounded-lg flex items-center gap-2.5 ${compact ? "p-1.5" : "p-2"} transition-shadow`}
      style={ringStyle}
      title={r.label}
    >
      <div className={`rounded-md flex-shrink-0 grid place-items-center text-white ${compact ? "w-8 h-8 text-[16px]" : "w-10 h-10 text-[20px]"}`} style={{ backgroundColor: cssFromHex(r.color), border: "2px solid rgba(255,255,255,.4)", textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>{r.glyph}</div>
      <div className="flex flex-col leading-none min-w-0 flex-1">
        <div className={`text-white/80 truncate font-medium ${compact ? "text-[10px]" : "text-[12px]"}`}>{r.label}</div>
        <div className={`text-white font-bold mt-0.5 ${compact ? "text-[14px]" : "text-[18px]"}`} style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>{count}</div>
      </div>
      {tagText && (
        <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-[1px] rounded-full text-[9px] font-bold text-white ${tagColor}`} style={{ textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>
          {tagText}
        </div>
      )}
    </div>
  );
}

export function InventoryGrid({ inventory, biomeKey, compact, orders = [] }) {
  const resources = BIOMES[biomeKey].resources;
  const items = Object.entries(RECIPES).filter(([key]) => (inventory[key] || 0) > 0);
  const gridCols = compact ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(180px,1fr))]";
  const { status, totals } = orderStatusByKey(orders, inventory);

  return (
    <div className="flex flex-col gap-3">
      {orders.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-white/70 px-1 -mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#91bf24]" /> ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f7c254]" /> needed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/40" /> excess</span>
        </div>
      )}
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Resources</div>
        <div className={`grid ${gridCols} gap-2`}>
          {resources.map((r) => (
            <InventoryCell
              key={r.key}
              r={r}
              count={inventory[r.key] || 0}
              compact={compact}
              orderStatus={status[r.key]}
              orderTotal={totals[r.key]}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Items</div>
        {items.length === 0 ? (
          <div className="text-[11px] text-white/40 italic px-1">No items yet — craft something!</div>
        ) : (
          <div className={`grid ${gridCols} gap-2`}>
            {items.map(([key, recipe]) => (
              <InventoryCell
                key={key}
                r={{ key, label: recipe.name, color: recipe.color, glyph: recipe.glyph }}
                count={inventory[key] || 0}
                compact={compact}
                orderStatus={status[key]}
                orderTotal={totals[key]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolsGrid({ tools, onUse }) {
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [modalTool, setModalTool] = useState(null);
  const longPressTimer = useRef(null);
  const longPressOccurred = useRef(false);

  const startLongPress = (t) => {
    longPressOccurred.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressOccurred.current = true;
      setModalTool(t);
    }, 500);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current);
  };

  const showTooltip = (key, el) => {
    const rect = el.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setTooltip(key);
  };

  const tooltipDef = TOOL_DEFS.find((t) => t.key === tooltip);

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {TOOL_DEFS.map((t) => {
          const amt = tools[t.key] || 0;
          const empty = amt === 0;
          return (
            <div key={t.key} className="relative">
              <button
                disabled={empty}
                onClick={() => {
                  if (longPressOccurred.current) { longPressOccurred.current = false; return; }
                  onUse(t.key);
                }}
                onMouseEnter={(e) => showTooltip(t.key, e.currentTarget)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => startLongPress(t)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={`relative w-full rounded-lg border-2 border-[#e6c49a] py-1.5 px-1 flex flex-col items-center gap-0.5 transition-transform ${empty ? "bg-[#9a724d] opacity-40 cursor-not-allowed" : "bg-[#9a724d] hover:bg-[#b8845a] hover:-translate-y-0.5"}`}
              >
                {amt > 0 && <div className="absolute -top-1 -right-1 bg-[#2b2218] text-white border border-[#f7e2b6] rounded-full px-1.5 text-[10px] font-bold">{amt}</div>}
                <div className="text-[20px] leading-none text-white">{t.icon}</div>
                <div className="text-[9px] font-bold text-white">{t.name}</div>
              </button>
            </div>
          );
        })}
      </div>
      {tooltipDef && createPortal(
        <div
          className="fixed z-[9999] w-36 bg-[#2b1d0e] text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg pointer-events-none border border-[#e6c49a]"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <div className="font-bold text-[11px] mb-0.5">{tooltipDef.name}</div>
          <div className="text-white/80 leading-snug">{tooltipDef.desc}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2b1d0e]" />
        </div>,
        document.body
      )}
      {modalTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalTool(null)}>
          <div className="bg-[#3d2310] border-2 border-[#e6c49a] rounded-2xl p-5 max-w-[260px] w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-[36px] text-center mb-1 leading-none">{modalTool.icon}</div>
            <div className="text-white font-bold text-[17px] text-center mb-2">{modalTool.name}</div>
            <div className="text-white/80 text-[12px] text-center leading-relaxed">{modalTool.desc}</div>
            <button
              onClick={() => setModalTool(null)}
              className="mt-4 w-full bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-2 rounded-lg border border-[#e6c49a] text-[13px] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}


// ─── Mobile dock (board view only) ────────────────────────────────────────

export function PortraitToolsBar({ state, dispatch }) {
  return (
    <div className="bg-[#3a2715] border-t border-[#b28b62] px-3 py-2 flex-shrink-0">
      <div className="grid grid-cols-4 gap-2">
        {TOOL_DEFS.map((t) => {
          const amt = state.tools[t.key] || 0;
          const empty = amt === 0;
          return (
            <button
              key={t.key}
              disabled={empty}
              onClick={() => {
                dispatch({ type: "USE_TOOL", key: t.key });
                if (t.key === "shuffle") window.__phaserScene?.shuffleBoard();
              }}
              className={`relative flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 border-[#e6c49a] transition-transform ${empty ? "bg-[#9a724d] opacity-40 cursor-not-allowed" : "bg-[#9a724d] hover:bg-[#b8845a] active:-translate-y-0.5"}`}
            >
              {amt > 0 && <div className="absolute -top-1 -right-1 bg-[#2b2218] text-white border border-[#f7e2b6] rounded-full px-1.5 text-[9px] font-bold leading-none py-0.5">{amt}</div>}
              <div className="text-[18px] leading-none text-white">{t.icon}</div>
              <div className="text-[8px] font-bold text-white/90">{t.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomSheet({ onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-[#3a2715] border-t-2 border-[#b28b62] rounded-t-2xl p-4 max-h-[60dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#b28b62] rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>,
    document.body
  );
}

export function MobileDock({ state, dispatch }) {
  const [sheet, setSheet] = useState(null); // "tools" | "orders" | null

  useEffect(() => { if (state.view !== "board") setSheet(null); }, [state.view]);

  const totalTools = Object.values(state.tools || {}).reduce((s, v) => s + v, 0);
  const readyOrders = (state.orders || []).filter((o) => (state.inventory[o.key] || 0) >= o.need).length;

  const closeSheet = () => setSheet(null);

  return (
    <>
      <div className="flex border-t-2 border-[#b28b62] bg-[#3a2715]">
        {/* Tools */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative text-[#f8e7c6]"
          onClick={() => setSheet(sheet === "tools" ? null : "tools")}
        >
          {totalTools > 0 && (
            <div className="absolute top-1.5 right-[calc(50%-14px)] bg-[#d6612a] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {totalTools}
            </div>
          )}
          <span className="text-[20px] leading-none">⚔</span>
          <span className="text-[9px] font-bold">Tools</span>
        </button>

        {/* Orders */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative text-[#f8e7c6]"
          onClick={() => setSheet(sheet === "orders" ? null : "orders")}
        >
          {readyOrders > 0 && (
            <div className="absolute top-1.5 right-[calc(50%-14px)] bg-[#91bf24] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {readyOrders}
            </div>
          )}
          <span className="text-[20px] leading-none">📋</span>
          <span className="text-[9px] font-bold">Orders</span>
        </button>
      </div>

      {sheet === "tools" && (
        <BottomSheet onClose={closeSheet}>
          <div className="text-[#f8e7c6] font-bold text-[14px] mb-3">Tools</div>
          <ToolsGrid
            tools={state.tools}
            onUse={(key) => {
              dispatch({ type: "USE_TOOL", key });
              if (key === "shuffle") window.__phaserScene?.shuffleBoard();
              closeSheet();
            }}
          />
        </BottomSheet>
      )}

      {sheet === "orders" && (
        <BottomSheet onClose={closeSheet}>
          <div className="text-[#f8e7c6] font-bold text-[14px] mb-3">Orders</div>
          <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
        </BottomSheet>
      )}
    </>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, modal, dispatch }) {
  const items = [
    { key: "town",         label: "⌂ Town" },
    { key: "inventory",    label: "🎒 Inventory" },
    { key: "quests",       label: "📜 Quests" },
    { key: "crafting",     label: "🔨 Craft" },
    { key: "cartography", label: "🗺️ Map" },
    { key: "townsfolk",    label: "👥 Townsfolk", modal: "townsfolk" },
  ];
  const activeKey = modal ? (items.find((i) => i.modal === modal)?.key ?? view) : view;
  return (
    <div
      className="bg-[#2b2218]/95 border-2 border-[#f7e2b6] rounded-2xl p-1 flex flex-wrap gap-1 shadow-2xl max-w-[92vw] justify-center"
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => {
            if (it.modal) {
              dispatch({ type: "OPEN_MODAL", modal: it.modal });
            } else {
              dispatch({ type: "SET_VIEW", view: it.key });
            }
          }}
          className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap ${activeKey === it.key ? "bg-[#d6612a] text-white" : "bg-transparent text-[#f7e2b6] hover:bg-white/10"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function TownsfolkModal({ state, dispatch }) {
  if (state.modal !== "townsfolk") return null;
  const [tab, setTab] = useState("mood");
  return createPortal(
    <div className="fixed inset-0 bg-black/55 grid place-items-center z-[100] animate-fadein">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] p-5 w-[min(540px,92vw)] max-h-[85vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[20px] text-[#744d2e]">Townsfolk</h3>
          <button
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
            className="w-8 h-8 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
          >✕</button>
        </div>
        <div className="flex gap-1.5 pb-3 flex-shrink-0">
          {[
            { key: "mood", label: "💞 Townsfolk" },
            { key: "apprentices", label: "🧑‍🌾 Apprentices" },
            { key: "orders", label: "📋 Orders" },
          ].map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border-2 ${tab === item.key ? "bg-[#8a4a26] border-[#6b3114] text-white" : "bg-[#f7ead8] border-[#b28b62] text-[#5a3a20]"}`}>{item.label}</button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "mood" ? (
            <MoodPanel state={state} dispatch={dispatch} showHeader={false} />
          ) : tab === "apprentices" ? (
            <ApprenticesPanel state={state} dispatch={dispatch} showHeader={false} />
          ) : (
            <CompactOrders orders={state.orders || []} inventory={state.inventory || {}} dispatch={dispatch} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Biome entry modal ────────────────────────────────────────────────────

function BiomeEntryModal({ biomeKey, level, onEnter, onClose }) {
  const biome = BIOMES[biomeKey];
  const locked = biomeKey === "mine" && level < 2;
  const descriptions = {
    farm: "Tend the fields of Hearthwood Vale. Harvest crops, gather timber, and collect eggs to fulfil the villagers' orders.",
    mine: "Descend into Ironridge depths. Extract stone, smelt ore, and uncover precious gems hidden below.",
  };
  return (
    <div className="absolute inset-0 bg-black/60 grid place-items-center z-50 animate-fadein" onClick={onClose}>
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 max-w-[400px] w-[92vw] shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[52px] leading-none mb-3">{biomeKey === "farm" ? "🌾" : "⛏"}</div>
        <h2 className="font-bold text-[22px] text-[#744d2e] mb-2">{biome.name}</h2>
        <p className="text-[#6a4b31] text-[13px] mb-5 leading-relaxed">{descriptions[biomeKey]}</p>
        {locked ? (
          <div className="bg-[#f7d572]/30 border border-[#f7d572] rounded-xl px-4 py-3 text-[#7a5020] font-bold text-[13px] mb-3">
            🔒 Unlocks at Level 2
          </div>
        ) : (
          <button
            onClick={onEnter}
            className="w-full mb-3 bg-[#91bf24] hover:bg-[#a3d028] text-white border-[3px] border-white rounded-2xl px-8 py-2.5 text-[16px] font-bold shadow-lg transition-colors"
          >
            Enter {biome.name}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-2 rounded-lg border border-[#e6c49a] text-[13px] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Town view ────────────────────────────────────────────────────────────

const TOWN_THEMES = {
  home: {
    bg: "linear-gradient(180deg, #a8c5d6 0%, #c5b48b 55%, #7e9b5a 100%)",
    hill1: "#8da568", hill2: "#5a7a3e", road: "#c5b48b", roadLine: "#a89065",
    sunColor: "#f7d572", sunGlow: "rgba(247,213,114,.7)",
    textColor: "#3a2715",
  },
  farm: {
    bg: "linear-gradient(180deg, #b5d98c 0%, #d4c97a 55%, #6b9c3e 100%)",
    hill1: "#6b9c3e", hill2: "#4a7a28", road: "#d4c97a", roadLine: "#b0a050",
    sunColor: "#ffe066", sunGlow: "rgba(255,224,102,.7)",
    textColor: "#1e3a0a",
  },
  mine: {
    bg: "linear-gradient(180deg, #7a8a96 0%, #9a8878 55%, #4a4e52 100%)",
    hill1: "#5a6068", hill2: "#3a3e42", road: "#9a8878", roadLine: "#706050",
    sunColor: "#c8c4b0", sunGlow: "rgba(200,196,176,.5)",
    textColor: "#e8e0d0",
  },
  festival: {
    bg: "linear-gradient(180deg, #e8b84a 0%, #d4784a 55%, #8a5a2a 100%)",
    hill1: "#c8782a", hill2: "#9a5820", road: "#e8b84a", roadLine: "#c8922a",
    sunColor: "#fff0a0", sunGlow: "rgba(255,240,160,.8)",
    textColor: "#3a1a00",
  },
  event: {
    bg: "linear-gradient(180deg, #8ab4ca 0%, #b09878 55%, #6a7a5a 100%)",
    hill1: "#7a9060", hill2: "#526840", road: "#b09878", roadLine: "#8a7860",
    sunColor: "#e8e0c0", sunGlow: "rgba(232,224,192,.6)",
    textColor: "#1a2a3a",
  },
  boss: {
    bg: "linear-gradient(180deg, #2a1a1a 0%, #4a2a2a 55%, #1a0a0a 100%)",
    hill1: "#3a1a1a", hill2: "#1a0a0a", road: "#4a2a2a", roadLine: "#6a3a3a",
    sunColor: "#c83030", sunGlow: "rgba(200,48,48,.6)",
    textColor: "#e8c0c0",
  },
};

// NPCs visible walking the town road. Color-keyed to NPCS where possible so
// the same character a player gets orders from is the one ambling past.
const TOWN_WALKERS = [
  { color: "#d6612a", duration: 28, delay:  0,  dir:  1 }, // Mira
  { color: "#5a6973", duration: 36, delay: 11,  dir: -1 }, // Bram
  { color: "#4f6b3a", duration: 32, delay: 18,  dir:  1 }, // Wren
  { color: "#c8923a", duration: 40, delay:  6,  dir: -1 }, // Tomas
];

// Buildings that emit smoke when built (industrial/warm interiors).
const SMOKE_BUILDINGS = new Set(["hearth", "bakery", "forge"]);

export function TownView({ state, dispatch }) {
  const [entryBiome, setEntryBiome] = useState(null);
  const biomeTheme = state.biomeKey === "mine" ? "mine" : "farm";
  const node = { name: biomeTheme === "mine" ? "Ironridge Camp" : "Hearthwood Vale" };
  const theme = TOWN_THEMES[biomeTheme] || TOWN_THEMES.home;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: theme.bg }}
    >
      {/* Sun/light source */}
      <div className="absolute top-12 right-20 w-16 h-16 rounded-full" style={{ background: theme.sunColor, boxShadow: `0 0 60px ${theme.sunGlow}` }} />
      {/* Clouds — drift slowly across the sky */}
      <div className="absolute top-16 w-24 h-6 rounded-full bg-white/70" style={{ animation: "townCloudA 95s linear infinite" }} />
      <div className="absolute top-24 w-28 h-7 rounded-full bg-white/60" style={{ animation: "townCloudB 130s linear infinite" }} />
      <div className="absolute top-10 w-20 h-5 rounded-full bg-white/50" style={{ animation: "townCloudA 160s linear infinite", animationDelay: "-40s" }} />
      {/* Hills + road */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1100 600" preserveAspectRatio="none">
        <path d="M0,300 Q200,250 400,290 T800,280 L1100,260 L1100,600 L0,600 Z" fill={theme.hill1} opacity="0.75" />
        <path d="M0,360 Q300,330 550,360 T1100,350 L1100,600 L0,600 Z" fill={theme.hill2} opacity="0.6" />
        <path d="M-20,500 Q200,480 400,500 T800,510 L1100,500" stroke={theme.road} strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M-20,500 Q200,480 400,500 T800,510 L1100,500" stroke={theme.roadLine} strokeWidth="2" fill="none" strokeDasharray="6 8" />
      </svg>
      {/* Header */}
      <div className="absolute top-3 left-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:left-3 font-bold text-[20px] landscape:max-[1024px]:text-[15px]" style={{ color: theme.textColor }}>{node.name}</div>
      <div className="absolute top-3 right-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:right-3 flex items-center gap-2 z-10">
        <div className="bg-white/85 px-3 py-1.5 landscape:max-[1024px]:px-2 landscape:max-[1024px]:py-1 rounded-full font-bold text-[#3a2715] landscape:max-[1024px]:text-[13px]">◉ {state.coins.toLocaleString()}</div>
      </div>

      {/* Walking NPCs — drift along the road from edge to edge */}
      <div className="absolute inset-x-0 pointer-events-none" style={{ top: "78%", height: "8%" }}>
        {TOWN_WALKERS.map((w, i) => (
          <TownWalker key={i} {...w} />
        ))}
      </div>

      {/* Buildings positioned in the 1100x600 design space, scaled to viewport */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 1100 600" preserveAspectRatio="none" className="w-full h-full" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="absolute" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          {BUILDINGS.map((b) => {
            const isBuilt = !!state.built[b.id];
            const isLocked = state.level < b.lv;
            const canAfford = state.coins >= (b.cost.coins || 0) &&
              Object.entries(b.cost).every(([k, v]) => k === "coins" || (state.inventory[k] || 0) >= v);
            const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
            const onClick = () => {
              if (isLocked) return;
              if (isBuilt && CRAFTING_STATIONS.has(b.id)) {
                dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: b.id });
                return;
              }
              if (isBuilt) return;
              if (!canAfford) return;
              dispatch({ type: "BUILD", building: b });
            };
            const costStr = Object.entries(b.cost).map(([k, v]) => k === "coins" ? `${v}◉` : `${v} ${k}`).join(" · ");
            return (
              <div
                key={b.id}
                className="absolute cursor-pointer"
                style={{
                  left: `${(b.x / 1100) * 100}%`,
                  top: `${(b.y / 600) * 100}%`,
                  width: `${(b.w / 1100) * 100}%`,
                  height: `${(b.h / 600) * 100}%`,
                  opacity: isLocked && !isBuilt ? 0.5 : 1,
                }}
                onClick={onClick}
              >
                {isBuilt ? (
                  <>
                    <div className="absolute -top-3 left-[-5px] right-[-5px] h-5" style={{ background: "#5a2e15", clipPath: "polygon(8% 100%, 50% 0, 92% 100%)" }} />
                    {SMOKE_BUILDINGS.has(b.id) && <BuildingSmoke />}
                    <div
                      className="w-full h-full rounded-sm grid place-items-end justify-center pb-1 font-bold text-[11px] text-white"
                      style={{
                        background: b.color,
                        border: "2px solid rgba(0,0,0,.25)",
                        boxShadow: "0 4px 0 rgba(0,0,0,.25)",
                        textShadow: "0 1px 2px rgba(0,0,0,.5)",
                      }}
                    >
                      {b.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-full h-full rounded-sm grid place-items-center font-bold text-[11px]"
                      style={{
                        background: "repeating-linear-gradient(45deg, rgba(0,0,0,.08) 0px, rgba(0,0,0,.08) 4px, transparent 4px, transparent 10px)",
                        border: `2px dashed ${isLocked ? "#888" : canAfford ? "#9bdb6a" : "rgba(255,255,255,.35)"}`,
                        color: isLocked ? "#888" : canAfford ? "#9bdb6a" : "rgba(255,255,255,.5)",
                      }}
                    >
                      {isLocked ? `🔒` : "+"}
                    </div>
                    <div
                      className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{
                        background: "rgba(0,0,0,.75)",
                        color: isLocked ? "#f7d572" : canAfford ? "#9bdb6a" : "#f7d572",
                      }}
                    >
                      {isLocked ? `🔒 ${b.name} L${b.lv}` : `Build ${b.name}: ${costStr}`}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Farm Field and Mine Entrance — rendered after buildings so they sit on top and receive clicks */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Farm Field — upper-left hills, entry to Farm board */}
        <div
          className="absolute cursor-pointer group pointer-events-auto"
          style={{ left: "1%", top: "28%", width: "14%", height: "20%" }}
          onClick={() => setEntryBiome("farm")}
        >
          <div
            className="w-full h-full rounded-xl overflow-hidden transition-transform duration-150 group-hover:scale-105"
            style={{
              background: "linear-gradient(180deg, #6aaa30 0%, #4a8a1a 55%, #3a6e10 100%)",
              border: "3px solid #2a5010",
              boxShadow: "0 4px 0 rgba(0,0,0,.35)",
            }}
          >
            {[0,1,2,3].map((i) => (
              <div key={i} className="absolute left-0 right-0 opacity-30" style={{ top: `${18 + i * 18}%`, height: "2px", background: "#f7d254" }} />
            ))}
            <div className="absolute top-1.5 inset-x-0 text-center font-bold text-white" style={{ fontSize: "clamp(9px,1.1vw,14px)", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>🌾 Farm Field</div>
            <div className="absolute bottom-0 inset-x-0 text-center font-bold text-white py-1" style={{ background: "rgba(0,0,0,.4)", fontSize: "clamp(8px,0.9vw,11px)", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>▶ Enter</div>
          </div>
        </div>

        {/* Mine Entrance — upper-right hills, entry to Mine board */}
        <div
          className="absolute cursor-pointer group pointer-events-auto"
          style={{ left: "85%", top: "28%", width: "14%", height: "20%" }}
          onClick={() => setEntryBiome("mine")}
        >
          <div
            className="w-full h-full rounded-xl overflow-hidden transition-transform duration-150 group-hover:scale-105"
            style={{
              background: "linear-gradient(180deg, #4a4e52 0%, #2a2e32 55%, #1a1e22 100%)",
              border: "3px solid #1a1e22",
              boxShadow: "0 4px 0 rgba(0,0,0,.35)",
              opacity: state.level < 2 ? 0.65 : 1,
            }}
          >
            <div className="absolute inset-0" style={{ opacity: 0.15, background: "repeating-linear-gradient(45deg, #888 0px, #888 1px, transparent 1px, transparent 7px)" }} />
            <div className="absolute top-1.5 inset-x-0 text-center font-bold text-white" style={{ fontSize: "clamp(9px,1.1vw,14px)", textShadow: "0 1px 3px rgba(0,0,0,.8)" }}>
              {state.level < 2 ? "🔒 Mine" : "⛏ Mine"}
            </div>
            <div className="absolute bottom-0 inset-x-0 text-center font-bold text-white py-1" style={{ background: "rgba(0,0,0,.5)", fontSize: "clamp(8px,0.9vw,11px)", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>
              {state.level < 2 ? "L2 req." : "▶ Enter"}
            </div>
          </div>
        </div>
      </div>

      {entryBiome && (
        <BiomeEntryModal
          biomeKey={entryBiome}
          level={state.level}
          onEnter={() => {
            dispatch({ type: "SWITCH_BIOME", key: entryBiome });
            dispatch({ type: "SET_VIEW", view: "board" });
            setEntryBiome(null);
          }}
          onClose={() => setEntryBiome(null)}
        />
      )}
    </div>
  );
}

function TownWalker({ color, duration, delay, dir }) {
  const animation = dir > 0 ? "townWalkR" : "townWalkL";
  return (
    <div
      className="absolute"
      style={{
        bottom: 0,
        left: dir > 0 ? "-6%" : undefined,
        right: dir < 0 ? "-6%" : undefined,
        animation: `${animation} ${duration}s linear infinite`,
        animationDelay: `-${delay}s`,
      }}
    >
      <div className="relative" style={{ animation: "townBob 0.55s ease-in-out infinite alternate" }}>
        {/* head */}
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f5d6b0", border: "1px solid rgba(0,0,0,.25)", margin: "0 auto" }} />
        {/* body */}
        <div className="w-3.5 h-4 rounded-sm mt-0.5" style={{ background: color, border: "1px solid rgba(0,0,0,.3)" }} />
        {/* shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-black/25" />
      </div>
    </div>
  );
}

function BuildingSmoke() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 18, height: 36 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 0,
            width: 8 + i * 2,
            height: 8 + i * 2,
            background: "rgba(240,235,220,.6)",
            animation: "townSmoke 3.4s ease-out infinite",
            animationDelay: `${i * 1.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Season summary modal ─────────────────────────────────────────────────

export function SeasonModal({ state, dispatch }) {
  if (state.modal !== "season") return null;
  const seasonIdx = seasonIndexForTurns(state.turnsUsed === 0 ? MAX_TURNS - 1 : state.turnsUsed - 1);
  const prevSeason = SEASONS[seasonIdx];
  const nextSeason = SEASONS[(seasonIdx + 1) % SEASONS.length];
  const stats = state.seasonStats;
  const nextCalendarSeason = ((state.seasonsCycled || 0) + 1) % 4;
  const nextEffect = SEASON_EFFECTS[nextCalendarSeason];
  return (
    <div className="absolute inset-0 bg-black/55 grid place-items-center z-50 animate-fadein">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 landscape:max-[1024px]:px-4 landscape:max-[1024px]:py-3 max-[640px]:px-4 max-[640px]:py-4 min-w-[360px] max-w-[560px] landscape:max-[1024px]:min-w-0 landscape:max-[1024px]:w-[92vw] max-[640px]:min-w-0 max-[640px]:w-[92vw] landscape:max-[1024px]:max-h-[88vh] max-[640px]:max-h-[85dvh] landscape:max-[1024px]:overflow-y-auto max-[640px]:overflow-y-auto text-center shadow-2xl">
        <div className="text-[48px] landscape:max-[1024px]:text-[28px] max-[640px]:text-[32px] leading-none">🏡</div>
        <h2 className="font-bold text-[26px] landscape:max-[1024px]:text-[18px] max-[640px]:text-[20px] text-[#744d2e] mt-2 landscape:max-[1024px]:mt-1 max-[640px]:mt-1 mb-1 landscape:max-[1024px]:mb-0.5 max-[640px]:mb-0.5">Harvest Complete</h2>
        <p className="italic text-[#6a4b31] text-[14px] landscape:max-[1024px]:text-[11px] max-[640px]:text-[12px]">{prevSeason.name} is over. Time to head back to town.</p>
        <div className="my-2 inline-block bg-[#d6612a]/15 border border-[#d6612a]/40 rounded-full px-3 py-1 text-[12px] landscape:max-[1024px]:text-[10px] max-[640px]:text-[11px] font-bold text-[#a8431a]">
          Next: {nextSeason.name} — {nextEffect}
        </div>
        <div className="flex justify-around gap-2 my-4 landscape:max-[1024px]:my-2 max-[640px]:my-2 p-3 landscape:max-[1024px]:p-2 max-[640px]:p-2 bg-black/[.04] rounded-xl">
          <Stat v={stats.harvests} l="Harvested" />
          <Stat v={stats.upgrades} l="Upgrades ★" />
          <Stat v={stats.ordersFilled} l="Orders" />
          <Stat v={`+${stats.coins}`} l="Coins" />
        </div>
        <p className="text-[12px] landscape:max-[1024px]:text-[10px] max-[640px]:text-[11px] text-[#8a785e] mb-3 landscape:max-[1024px]:mb-2 max-[640px]:mb-2">Bonus: +1 Reshuffle Horn · +25◉</p>
        <button
          onClick={() => dispatch({ type: "CLOSE_SEASON" })}
          className="bg-[#91bf24] hover:bg-[#a3d028] text-white border-[3px] border-white rounded-2xl px-8 landscape:max-[1024px]:px-5 max-[640px]:px-5 py-2.5 landscape:max-[1024px]:py-1.5 max-[640px]:py-2 text-[16px] landscape:max-[1024px]:text-[13px] max-[640px]:text-[14px] font-bold shadow-lg"
        >
          Return to Town
        </button>
      </div>
    </div>
  );
}

function Stat({ v, l }) {
  return (
    <div>
      <div className="font-bold text-[22px] landscape:max-[1024px]:text-[16px] max-[640px]:text-[18px] text-[#a8431a]">{v}</div>
      <div className="uppercase tracking-widest text-[10px] landscape:max-[1024px]:text-[8px] max-[640px]:text-[9px] text-[#8a785e]">{l}</div>
    </div>
  );
}

// ─── NPC speech bubble ────────────────────────────────────────────────────

export function NpcBubble({ bubble, dispatch }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!bubble) { setShown(null); return; }
    setShown(bubble);
    const t = setTimeout(() => dispatch({ type: "DISMISS_BUBBLE", id: bubble.id }), bubble.ms || 1800);
    return () => clearTimeout(t);
  }, [bubble?.id]);
  if (!shown) return null;
  const npc = NPCS[shown.npc];
  if (!npc) return null;
  return (
    <div className="absolute bottom-28 landscape:max-[1024px]:bottom-20 left-1/2 -translate-x-1/2 bg-[#f4ecd8] border-[3px] border-[#5a3a20] rounded-2xl px-4 py-3 landscape:max-[1024px]:px-3 landscape:max-[1024px]:py-2 max-w-[460px] landscape:max-[1024px]:max-w-[320px] shadow-2xl z-40 animate-bubblein">
      <div className="flex gap-2.5 items-start">
        <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[16px] flex-shrink-0" style={{ backgroundColor: npc.color, border: "2px solid #fff" }}>{npc.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#a8431a] text-[12px]">{npc.name} · {npc.role}</div>
          <div className="text-[#2b2218] text-[13px] leading-snug mt-0.5">{shown.text}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature extension points ─────────────────────────────────────────────
// Auto-discover features. Each feature's index.jsx must export:
//   - default: the React component (receives { state, dispatch })
//   - viewKey?: string — if set, mounts as a full-screen view when state.view === viewKey
//   - modalKey?: string — if set, mounts as a modal when state.modal === modalKey
// Vite's import.meta.glob with eager: true resolves at build time.

const featureModules = import.meta.glob("./features/*/index.jsx", { eager: true });
const FEATURES = Object.values(featureModules).map((m) => ({
  Component: m.default,
  viewKey: m.viewKey,
  modalKey: m.modalKey,
  alwaysMounted: !!m.alwaysMounted,
}));

export function FeatureModals({ state, dispatch }) {
  // Always-mounted features manage their own visibility internally
  const alwaysFeatures = FEATURES.filter(f => f.alwaysMounted);

  // Modal-keyed features only render when their modal is active
  let modalFeature = null;
  for (const f of FEATURES) {
    if (!f.alwaysMounted && f.modalKey && state.modal === f.modalKey) {
      modalFeature = f;
      break;
    }
  }

  return (
    <>
      <TownsfolkModal state={state} dispatch={dispatch} />
      {alwaysFeatures.map(f => <f.Component key={f.modalKey || f.viewKey} state={state} dispatch={dispatch} />)}
      {modalFeature && <modalFeature.Component state={state} dispatch={dispatch} />}
    </>
  );
}

export function FeatureScreens({ state, dispatch }) {
  if (state.view === "board" || state.view === "town") return null;
  for (const f of FEATURES) {
    if (f.viewKey && state.view === f.viewKey) {
      const C = f.Component;
      return <C state={state} dispatch={dispatch} />;
    }
  }
  return null;
}
