import React, { useState } from "react";
import { ACHIEVEMENTS, BIOMES } from "../../constants.js";

export const viewKey = "achievements";

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function hexColor(n) {
  return "#" + n.toString(16).padStart(6, "0");
}

function getMetricValue(state, eventKey) {
  switch (eventKey) {
    case "totalHarvested":   return state.totalHarvested || 0;
    case "longestChain":     return state.longestChain || 0;
    case "chainsThisSeason": return state.chainsThisSeason || 0;
    case "totalOrders":      return state.totalOrders || 0;
    case "buildingCount":    return Object.keys(state.built || {}).length;
    case "seasonsCycled":    return state.seasonsCycled || 0;
    case "totalCrafted":     return state.totalCrafted || 0;
    default:
      return (state.collected || {})[eventKey] || 0;
  }
}

// ─── Trophy card ─────────────────────────────────────────────────────────────

function TrophyCard({ achievement, current, trophyState, dispatch }) {
  const { id, name, desc, icon, target, reward } = achievement;
  const unlocked = !!trophyState;
  const claimed  = trophyState === "claimed";
  const claimable = unlocked && !claimed;
  const pct = Math.min(100, (current / target) * 100);

  let cardBg = "bg-[#3a2715]";
  let borderCls = "border-[#c5a87a]/50";
  if (claimed)   { cardBg = "bg-[#91bf24]/30"; borderCls = "border-[#91bf24]/60"; }
  else if (claimable) { cardBg = "bg-[#5b3b20]"; borderCls = "border-[#f7c254]"; }
  else if (unlocked)  { cardBg = "bg-[#5b3b20]"; borderCls = "border-[#c5a87a]"; }

  return (
    <div className={`${cardBg} border ${borderCls} rounded-xl p-2 flex gap-2 items-center min-h-[72px] transition-colors`}
      style={claimable ? { boxShadow: "0 0 8px rgba(247,194,84,.35)" } : {}}>
      {/* Icon */}
      <div className={`text-[22px] w-8 flex-shrink-0 text-center leading-none ${!unlocked ? "grayscale opacity-40" : ""}`}>
        {unlocked ? icon : "🔒"}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="font-bold text-[12px] text-[#f8e7c6] leading-tight truncate">{name}</div>
        <div className="text-[10px] text-[#c5a87a]/80 leading-snug line-clamp-1">{desc}</div>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 h-1.5 bg-[#2a1d0f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: claimed ? "#91bf24" : unlocked ? "#f7c254" : "#c8923a",
              }}
            />
          </div>
          <div className="text-[9px] text-[#c5a87a] whitespace-nowrap font-bold">
            {Math.min(current, target)}/{target}
          </div>
        </div>
      </div>

      {/* Right: reward + claim */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="text-[9px] text-[#c8923a] font-bold whitespace-nowrap leading-tight">
          {reward.coins ? `+${reward.coins}◉` : ""}{reward.coins && reward.xp ? " " : ""}{reward.xp ? `+${reward.xp}xp` : ""}
        </div>
        {claimable && (
          <button
            onClick={() => dispatch({ type: "ACHIEVEMENTS/CLAIM", id })}
            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#f7c254] hover:bg-[#ffe07a] text-[#5a3a20] border border-[#d4a030] transition-colors"
          >
            CLAIM
          </button>
        )}
        {claimed && (
          <div className="text-[9px] font-bold text-[#91bf24]">✓ Claimed</div>
        )}
      </div>
    </div>
  );
}

// ─── Collection chip ─────────────────────────────────────────────────────────

function ResourceChip({ resource, count }) {
  const discovered = count > 0;
  const bg = discovered ? hexColor(resource.color) : "#3a2715";
  const textColor = discovered ? "#fff" : "#6a4b31";

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border flex-shrink-0 gap-0.5"
      style={{
        width: 52,
        height: 62,
        backgroundColor: bg,
        borderColor: discovered ? "rgba(255,255,255,0.3)" : "#5a3a25",
        opacity: discovered ? 1 : 0.55,
      }}
    >
      <div className="text-[18px] leading-none" style={{ textShadow: discovered ? "0 1px 2px rgba(0,0,0,.5)" : "none" }}>
        {discovered ? resource.glyph : "?"}
      </div>
      <div className="text-[8px] font-bold leading-tight text-center px-0.5 truncate w-full text-center" style={{ color: textColor }}>
        {discovered ? resource.label : "???"}
      </div>
      {discovered && (
        <div className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
          ✓{count}
        </div>
      )}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AchievementsScreen({ state, dispatch }) {
  const [tab, setTab] = useState("trophies");

  const trophies = state.trophies || {};
  const collected = state.collected || {};

  const discoveredCount = ALL_RESOURCES.filter((r) => (collected[r.key] || 0) > 0).length;
  const totalLifetime = Object.values(collected).reduce((s, v) => s + v, 0);

  const CATEGORIES = ["Harvest", "Chains", "Orders", "Buildings", "Seasons", "Resources", "Crafting"];

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] rounded-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🏆 Trophies</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "board" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >
          ✕
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1.5 px-3 py-1.5 flex-shrink-0">
        {["trophies", "collection"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors border ${
              tab === t
                ? "bg-[#d6612a] text-white border-[#d6612a]"
                : "bg-[#3a2715] text-[#c5a87a] border-[#c5a87a]/40 hover:bg-[#4a2e18]"
            }`}
          >
            {t === "trophies" ? "Trophies" : "Collection"}
          </button>
        ))}
        <div className="ml-auto text-[10px] text-[#c5a87a] flex items-center">
          {tab === "trophies"
            ? `${Object.keys(trophies).length}/${ACHIEVEMENTS.length} unlocked`
            : `${discoveredCount}/${ALL_RESOURCES.length} discovered`}
        </div>
      </div>

      {/* Body */}
      {tab === "trophies" ? (
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const group = ACHIEVEMENTS.filter((a) => a.category === cat);
            if (!group.length) return null;
            return (
              <div key={cat} className="mb-2">
                <div className="text-[10px] font-bold text-[#c8923a] uppercase tracking-widest px-1 mb-1">{cat}</div>
                <div className="grid grid-cols-3 portrait:grid-cols-2 gap-1.5">
                  {group.map((a) => (
                    <TrophyCard
                      key={a.id}
                      achievement={a}
                      current={getMetricValue(state, a.eventKey)}
                      trophyState={trophies[a.id]}
                      dispatch={dispatch}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden pb-2">
          {/* Scrollable resource strip */}
          <div
            className="flex-1 overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-1.5 px-2 py-1.5 h-full" style={{ minWidth: "max-content" }}>
              {/* Farm resources */}
              <div className="flex flex-col gap-1 justify-center">
                <div className="text-[9px] text-[#c8923a] font-bold uppercase tracking-widest px-0.5">Farm</div>
                <div className="flex gap-1.5">
                  {BIOMES.farm.resources.map((r) => (
                    <ResourceChip key={r.key} resource={r} count={collected[r.key] || 0} />
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div className="w-px bg-[#c5a87a]/30 mx-1 self-stretch" />
              {/* Mine resources */}
              <div className="flex flex-col gap-1 justify-center">
                <div className="text-[9px] text-[#c8923a] font-bold uppercase tracking-widest px-0.5">Mine</div>
                <div className="flex gap-1.5">
                  {BIOMES.mine.resources.map((r) => (
                    <ResourceChip key={r.key} resource={r} count={collected[r.key] || 0} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Footer strip */}
          <div className="flex-shrink-0 px-3 py-1.5 border-t border-[#e2c19b]/30 text-[11px] text-[#c5a87a] font-bold flex gap-3">
            <span>Discovered {discoveredCount}/{ALL_RESOURCES.length}</span>
            <span className="text-[#c5a87a]/60">·</span>
            <span>Total harvested: {totalLifetime.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
