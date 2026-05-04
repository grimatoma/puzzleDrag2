import React, { useEffect, useState } from "react";
import { BIOMES, NPCS, SEASONS, MAX_TURNS, BUILDINGS } from "./constants.js";
import { resourceByKey, xpForLevel } from "./state.js";
import { seasonIndexForTurns } from "./utils.js";

const TOOL_DEFS = [
  { key: "clear", icon: "⚔", name: "Scythe" },
  { key: "basic", icon: "+", name: "Seedpack" },
  { key: "rare", icon: "★", name: "Lockbox" },
  { key: "shuffle", icon: "↻", name: "Reshuffle Horn" },
];

// ─── HUD (top bar) ─────────────────────────────────────────────────────────

export function Hud({ state, dispatch }) {
  const { coins, level, xp, turnsUsed, built, view } = state;
  const onBoard = view === "board";
  const seasonIdx = seasonIndexForTurns(turnsUsed);
  const season = SEASONS[seasonIdx];
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, (xp / xpNeed) * 100);
  const turnsLeft = MAX_TURNS - turnsUsed;
  const buildingCount = Object.keys(built || {}).length;
  return (
    <div className="flex items-center gap-2 px-3 py-2 landscape:max-[900px]:py-1 landscape:max-[900px]:px-2 landscape:max-[900px]:gap-1.5 bg-[#5b3b20] border-b-2 border-[#2a1d0f] text-[#6a4b31] flex-wrap" data-testid="hud">
      <button
        onClick={() => dispatch({ type: "OPEN_MODAL", modal: "menu" })}
        className="w-8 h-8 landscape:max-[900px]:w-6 landscape:max-[900px]:h-6 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[18px] landscape:max-[900px]:text-[13px] flex-shrink-0"
        data-testid="menu-btn"
      >≡</button>
      <Pill>
        <span className="w-5 h-5 rounded-full bg-[#ffc239] grid place-items-center text-[#7a5638] text-[12px] font-bold leading-none">$</span>
        <span className="font-bold text-[15px]" data-testid="coins">{coins.toLocaleString()}</span>
      </Pill>
      <Pill>
        <span className="font-bold text-[14px]">⌂</span>
        <span className="font-bold text-[14px]" data-testid="buildings">{buildingCount}</span>
      </Pill>
      {onBoard && <SeasonBar season={season} turnsUsed={turnsUsed} />}
      {onBoard && <div className="text-[#f8e7c6] text-[12px] font-bold whitespace-nowrap" data-testid="turns-left">{turnsLeft} left</div>}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="bg-[#f6efe0] border-2 border-[#b28b62] rounded-full h-[26px] w-[110px] landscape:max-[900px]:h-[20px] landscape:max-[900px]:w-[80px] relative overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#ff8b25] to-[#ffb347] transition-[width] duration-300" style={{ width: `${xpPct}%` }} />
          <div className="absolute inset-0 grid place-items-center text-[11px] landscape:max-[900px]:text-[9px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
            {xp} / {xpNeed}
          </div>
        </div>
        <div className="w-9 h-9 landscape:max-[900px]:w-7 landscape:max-[900px]:h-7 rounded-full bg-[#bb3b2f] border-[3px] border-[#ffe2a3] grid place-items-center text-white font-bold text-[16px] landscape:max-[900px]:text-[12px]">
          {level}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <div className={`bg-[#f6efe0] border-2 border-[#b28b62] rounded-full px-3 py-1 flex items-center gap-1.5 text-[#6a4b31] ${className}`}>{children}</div>
  );
}

function SeasonBar({ season, turnsUsed }) {
  return (
    <div className="bg-[#faf0dd] border-2 border-[#b28b62] rounded-full px-2 py-0.5 flex items-center gap-1.5 min-w-[200px] landscape:max-[900px]:min-w-[140px] flex-1 max-w-[480px]">
      <div className="text-[#6a4b31] font-bold text-[12px] landscape:max-[900px]:text-[10px] whitespace-nowrap">{season.name}</div>
      <div className="flex gap-0.5 flex-1 justify-center">
        {Array.from({ length: MAX_TURNS }).map((_, i) => {
          const filled = i < turnsUsed;
          const current = i === turnsUsed;
          return (
            <div
              key={i}
              className={`w-3 h-3 landscape:max-[900px]:w-2 landscape:max-[900px]:h-2 rounded-full border ${filled ? "border-transparent" : "border-[#b28b62]"} transition-all`}
              style={{
                backgroundColor: filled ? cssFromHex(season.fill) : "#fff",
                boxShadow: current ? "0 0 0 2px rgba(255,122,0,.45)" : "none",
                transform: filled ? "scale(1.05)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function cssFromHex(intHex) {
  return `#${intHex.toString(16).padStart(6, "0")}`;
}

// ─── Side panel (orders / inventory / tools / biome switcher) ─────────────

export function SidePanel({ state, dispatch }) {
  return (
    <div className="bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] rounded-2xl p-3 landscape:max-[900px]:p-2 flex flex-col gap-3 landscape:max-[900px]:gap-1.5 overflow-hidden landscape:max-[900px]:overflow-y-auto h-full min-h-0">
      <Section title="Orders">
        <OrdersList orders={state.orders} inventory={state.inventory} onTurnIn={(id) => dispatch({ type: "TURN_IN_ORDER", id })} />
      </Section>
      <Section title="Storage" titleColor="#f8e7c6">
        <InventoryGrid inventory={state.inventory} biomeKey={state.biomeKey} />
      </Section>
      <Section title="Tools" titleColor="#f8e7c6">
        <ToolsGrid tools={state.tools} onUse={(key) => {
          dispatch({ type: "USE_TOOL", key });
          if (key === "shuffle") window.__phaserScene?.shuffleBoard();
        }} />
        <BiomeSwitcher biomeKey={state.biomeKey} level={state.level} onSwitch={(key) => dispatch({ type: "SWITCH_BIOME", key })} />
      </Section>
    </div>
  );
}

function Section({ title, titleColor = "#f8e7c6", children }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="font-bold text-[14px] landscape:max-[900px]:text-[11px] tracking-wide" style={{ color: titleColor }}>{title}</div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

function OrdersList({ orders, inventory, onTurnIn }) {
  return (
    <div className="flex flex-col gap-2 max-h-[260px] landscape:max-[900px]:max-h-[130px] overflow-y-auto pr-1">
      {orders.map((o) => {
        const have = inventory[o.key] || 0;
        const done = have >= o.need;
        const npc = NPCS[o.npc];
        const res = resourceByKey(o.key);
        const pct = Math.min(100, (have / o.need) * 100);
        return (
          <button
            key={o.id}
            onClick={() => onTurnIn(o.id)}
            className={`text-left rounded-xl border-2 px-2.5 py-2 flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5 ${done ? "bg-[#cfe4a3] border-[#91bf24]" : "bg-[#f7ead8] border-[#c5a87a]"}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full grid place-items-center text-white font-bold text-[12px] flex-shrink-0" style={{ backgroundColor: npc.color, border: "2px solid #fff" }}>{npc.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#a8431a] text-[12px] leading-tight truncate">{npc.name}</div>
                <div className="text-[#6a4b31] text-[10px] leading-snug line-clamp-2">{o.line}</div>
              </div>
              <div className="text-[#c8923a] text-[10px] font-bold whitespace-nowrap">+{o.reward}◉</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex-shrink-0" style={{ backgroundColor: cssFromHex(res.color), border: "2px solid rgba(255,255,255,.4)" }} />
              <div className="flex-1 h-2 bg-[#e0d2b0] rounded overflow-hidden">
                <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, backgroundColor: done ? "#4f6b3a" : "#d6612a" }} />
              </div>
              <div className="text-[#6a4b31] text-[11px] font-bold whitespace-nowrap min-w-[36px] text-right">{have}/{o.need}</div>
            </div>
            {done && <div className="text-[10px] text-[#4f6b3a] font-bold text-center">TAP TO DELIVER ✓</div>}
          </button>
        );
      })}
    </div>
  );
}

function InventoryGrid({ inventory, biomeKey }) {
  const resources = BIOMES[biomeKey].resources;
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-[180px] landscape:max-[900px]:max-h-[110px] overflow-y-auto pr-1">
      {resources.map((r) => (
        <div key={r.key} className="bg-[#b68d64] border-2 border-[#e6c49a] rounded-lg p-1.5 flex items-center gap-2" title={r.label}>
          <div className="w-7 h-7 rounded-md flex-shrink-0 grid place-items-center text-[14px] text-white" style={{ backgroundColor: cssFromHex(r.color), border: "2px solid rgba(255,255,255,.4)", textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>{r.glyph}</div>
          <div className="flex flex-col leading-none min-w-0">
            <div className="text-[9px] text-white/70 truncate">{r.label}</div>
            <div className="text-[14px] text-white font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>{inventory[r.key] || 0}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolsGrid({ tools, onUse }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {TOOL_DEFS.map((t) => {
        const amt = tools[t.key] || 0;
        const empty = amt === 0;
        return (
          <button
            key={t.key}
            disabled={empty}
            onClick={() => onUse(t.key)}
            className={`relative rounded-lg border-2 border-[#e6c49a] py-1.5 px-1 flex flex-col items-center gap-0.5 transition-transform ${empty ? "bg-[#9a724d] opacity-40 cursor-not-allowed" : "bg-[#9a724d] hover:bg-[#b8845a] hover:-translate-y-0.5"}`}
          >
            {amt > 0 && <div className="absolute -top-1 -right-1 bg-[#2b2218] text-white border border-[#f7e2b6] rounded-full px-1.5 text-[10px] font-bold">{amt}</div>}
            <div className="text-[20px] leading-none text-white">{t.icon}</div>
            <div className="text-[9px] font-bold text-white">{t.name}</div>
          </button>
        );
      })}
    </div>
  );
}

function BiomeSwitcher({ biomeKey, level, onSwitch }) {
  return (
    <div className="flex gap-1.5 mt-2">
      {Object.entries(BIOMES).map(([k, b]) => {
        const locked = k === "mine" && level < 2;
        const active = biomeKey === k;
        return (
          <button
            key={k}
            disabled={locked}
            onClick={() => onSwitch(k)}
            className={`flex-1 px-2 py-1.5 rounded-full border-2 border-[#f7e2b6] font-bold text-[12px] transition-colors ${active ? "bg-[#ffc239] text-[#5a3a20]" : locked ? "bg-[#6b4d34] text-white/40 cursor-not-allowed" : "bg-[#6b4d34] text-white"}`}
          >
            {b.name}{locked ? ` 🔒 L2` : ""}
          </button>
        );
      })}
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, onChange }) {
  const items = [
    { key: "board", label: "◳ Board" },
    { key: "town", label: "⌂ Town" },
    { key: "quests", label: "📜 Quests" },
    { key: "almanac", label: "📖 Almanac" },
    { key: "crafting", label: "🔨 Craft" },
    { key: "achievements", label: "🏆 Trophies" },
    { key: "cartography", label: "🗺 Map" },
  ];
  return (
    <div
      className="bg-[#2b2218]/95 border-2 border-[#f7e2b6] rounded-2xl p-1 flex gap-1 shadow-2xl max-w-[92vw] overflow-x-auto"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex-shrink-0 ${view === it.key ? "bg-[#d6612a] text-white" : "bg-transparent text-[#f7e2b6] hover:bg-white/10"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ─── Town view ────────────────────────────────────────────────────────────

export function TownView({ state, dispatch }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #a8c5d6 0%, #c5b48b 55%, #7e9b5a 100%)",
      }}
    >
      {/* Sun */}
      <div className="absolute top-12 right-20 w-16 h-16 rounded-full" style={{ background: "#f7d572", boxShadow: "0 0 60px rgba(247,213,114,.7)" }} />
      {/* Clouds */}
      <div className="absolute top-16 left-[20%] w-24 h-6 rounded-full bg-white/70" />
      <div className="absolute top-24 left-[55%] w-28 h-7 rounded-full bg-white/60" />
      {/* Hills + road */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1100 600" preserveAspectRatio="none">
        <path d="M0,300 Q200,250 400,290 T800,280 L1100,260 L1100,600 L0,600 Z" fill="#8da568" opacity="0.75" />
        <path d="M0,360 Q300,330 550,360 T1100,350 L1100,600 L0,600 Z" fill="#5a7a3e" opacity="0.6" />
        <path d="M-20,500 Q200,480 400,500 T800,510 L1100,500" stroke="#c5b48b" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M-20,500 Q200,480 400,500 T800,510 L1100,500" stroke="#a89065" strokeWidth="2" fill="none" strokeDasharray="6 8" />
      </svg>
      {/* Header */}
      <div className="absolute top-3 left-4 landscape:max-[900px]:top-2 landscape:max-[900px]:left-3 font-bold text-[20px] landscape:max-[900px]:text-[15px] text-[#3a2715]">Hearthwood Vale</div>
      <div className="absolute top-3 right-4 landscape:max-[900px]:top-2 landscape:max-[900px]:right-3 bg-white/85 px-3 py-1.5 landscape:max-[900px]:px-2 landscape:max-[900px]:py-1 rounded-full font-bold text-[#3a2715] landscape:max-[900px]:text-[13px]">◉ {state.coins.toLocaleString()}</div>

      {/* Buildings positioned in the 1100x600 design space, scaled to viewport */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 1100 600" preserveAspectRatio="none" className="w-full h-full" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="absolute" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          {BUILDINGS.map((b) => {
            const isBuilt = !!state.built[b.id];
            const isLocked = state.level < b.lv;
            const canAfford = state.coins >= (b.cost.coins || 0) &&
              Object.entries(b.cost).every(([k, v]) => k === "coins" || (state.inventory[k] || 0) >= v);
            const onClick = () => {
              if (isLocked || isBuilt) return;
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
                  opacity: isLocked && !isBuilt ? 0.6 : 1,
                }}
                onClick={onClick}
              >
                <div className="absolute -top-3 left-[-5px] right-[-5px] h-5" style={{ background: "#5a2e15", clipPath: "polygon(8% 100%, 50% 0, 92% 100%)" }} />
                <div
                  className="w-full h-full rounded-sm grid place-items-end justify-center pb-1 font-bold text-[11px] text-white"
                  style={{
                    background: isLocked && !isBuilt ? "#888" : b.color,
                    border: "2px solid rgba(0,0,0,.25)",
                    boxShadow: "0 4px 0 rgba(0,0,0,.25)",
                    textShadow: "0 1px 2px rgba(0,0,0,.5)",
                  }}
                >
                  {isLocked && !isBuilt ? `🔒 L${b.lv}` : isBuilt ? b.name : (canAfford ? `Build ${b.name}` : b.name)}
                </div>
                {!isBuilt && (
                  <div
                    className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={{
                      background: "rgba(0,0,0,.75)",
                      color: isLocked ? "#f7d572" : canAfford ? "#9bdb6a" : "#f7d572",
                    }}
                  >
                    {isLocked ? `🔒 L${b.lv}` : costStr}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
  return (
    <div className="absolute inset-0 bg-black/55 grid place-items-center z-50 animate-fadein">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 landscape:max-[900px]:px-4 landscape:max-[900px]:py-3 min-w-[360px] max-w-[560px] landscape:max-[900px]:min-w-0 landscape:max-[900px]:w-[92vw] landscape:max-[900px]:max-h-[88vh] landscape:max-[900px]:overflow-y-auto text-center shadow-2xl">
        <div className="text-[48px] landscape:max-[900px]:text-[28px] leading-none">{nextSeason.icon === "flower" ? "✿" : nextSeason.icon === "sun" ? "☀" : nextSeason.icon === "leaf" ? "🍂" : "❄"}</div>
        <h2 className="font-bold text-[26px] landscape:max-[900px]:text-[18px] text-[#744d2e] mt-2 landscape:max-[900px]:mt-1 mb-1 landscape:max-[900px]:mb-0.5">{prevSeason.name} ends</h2>
        <p className="italic text-[#6a4b31] text-[14px] landscape:max-[900px]:text-[11px]">The wind shifts. {nextSeason.name} arrives in Hearthwood Vale.</p>
        <div className="flex justify-around gap-2 my-4 landscape:max-[900px]:my-2 p-3 landscape:max-[900px]:p-2 bg-black/[.04] rounded-xl">
          <Stat v={stats.harvests} l="Harvested" />
          <Stat v={stats.upgrades} l="Upgrades ★" />
          <Stat v={stats.ordersFilled} l="Orders" />
          <Stat v={`+${stats.coins}`} l="Coins" />
        </div>
        <p className="text-[12px] landscape:max-[900px]:text-[10px] text-[#8a785e] mb-3 landscape:max-[900px]:mb-2">Bonus: +1 Reshuffle Horn · +25◉</p>
        <button
          onClick={() => dispatch({ type: "CLOSE_SEASON" })}
          className="bg-[#91bf24] hover:bg-[#a3d028] text-white border-[3px] border-white rounded-2xl px-8 landscape:max-[900px]:px-5 py-2.5 landscape:max-[900px]:py-1.5 text-[16px] landscape:max-[900px]:text-[13px] font-bold shadow-lg"
        >
          Welcome the {nextSeason.name}
        </button>
      </div>
    </div>
  );
}

function Stat({ v, l }) {
  return (
    <div>
      <div className="font-bold text-[22px] landscape:max-[900px]:text-[16px] text-[#a8431a]">{v}</div>
      <div className="uppercase tracking-widest text-[10px] landscape:max-[900px]:text-[8px] text-[#8a785e]">{l}</div>
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
    <div className="absolute bottom-20 landscape:max-[900px]:bottom-12 left-1/2 -translate-x-1/2 bg-[#f4ecd8] border-[3px] border-[#5a3a20] rounded-2xl px-4 py-3 landscape:max-[900px]:px-3 landscape:max-[900px]:py-2 max-w-[460px] landscape:max-[900px]:max-w-[320px] shadow-2xl z-40 animate-bubblein">
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
}));

export function FeatureModals({ state, dispatch }) {
  for (const f of FEATURES) {
    if (f.modalKey && state.modal === f.modalKey) {
      const C = f.Component;
      return <C state={state} dispatch={dispatch} />;
    }
  }
  return null;
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
