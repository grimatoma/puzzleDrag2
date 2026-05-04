import React from "react";
import { ALMANAC_TIERS } from "../../constants.js";

export const viewKey = "quests";

function QuestCard({ q, dispatch }) {
  const pct = Math.min(100, (q.progress / q.target) * 100);
  const claimable = q.done && !q.claimed;

  return (
    <div className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2.5 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold text-[12px] text-[#3a2715] leading-snug flex-1">{q.label}</span>
        <span className="text-[11px] font-bold text-[#c8923a] whitespace-nowrap">
          +{q.reward.coins}◉{q.reward.almanacXp ? ` +${q.reward.almanacXp}✦` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#3a2715" }}>
          <div
            className="h-full transition-[width] duration-300 rounded-full"
            style={{ width: `${pct}%`, background: "#d6612a" }}
          />
        </div>
        <span className="text-[11px] font-bold text-[#6a4b31] whitespace-nowrap">{q.progress}/{q.target}</span>
      </div>
      <button
        disabled={!claimable}
        onClick={() => claimable && dispatch({ type: "QUESTS/CLAIM_QUEST", id: q.id })}
        className={`text-[11px] font-bold py-1 rounded-lg border-2 transition-colors ${
          q.claimed
            ? "bg-[#c5a87a] border-[#a88a5a] text-white/70 cursor-default"
            : claimable
            ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
            : "bg-[#e0d2b0] border-[#c5a87a] text-[#a88a5a] cursor-not-allowed"
        }`}
      >
        {q.claimed ? "✓ CLAIMED" : "CLAIM"}
      </button>
    </div>
  );
}

function AlmanacTierCard({ idx, tierDef, almanacXp, almanacClaimed, dispatch }) {
  const tier = idx + 1;
  const cost = tier * 100;
  const claimed = almanacClaimed.includes(tier);
  const unlocked = almanacXp >= cost;
  const claimable = unlocked && !claimed;

  const rewardStr = tierDef.reward.coins
    ? `+${tierDef.reward.coins}◉`
    : tierDef.reward.tool
    ? `+${tierDef.reward.amt}↻`
    : "?";

  const icon = tier >= 8 ? "🔺" : tier >= 5 ? "△" : "◈";

  return (
    <div
      className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 ${
        claimed
          ? "bg-[#c5a87a]/40 border-[#c5a87a]"
          : claimable
          ? "bg-[#f6efe0] border-[#d6612a]"
          : "bg-[#3a2715]/60 border-[#5a3a20]"
      }`}
      style={{ width: 90, minWidth: 90 }}
    >
      <div className="text-[11px] font-bold text-[#f8e7c6]">Tier {tier}</div>
      <div className="text-[20px] leading-none">{claimed ? "✓" : claimable ? icon : "🔒"}</div>
      <div className="text-[11px] font-bold text-[#c8923a]">{rewardStr}</div>
      <div className="text-[9px] text-[#f8e7c6]/60">{cost}✦</div>
      <button
        disabled={!claimable}
        onClick={() => claimable && dispatch({ type: "QUESTS/CLAIM_ALMANAC", tier })}
        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
          claimed
            ? "bg-[#c5a87a] border-[#a88a5a] text-white/60 cursor-default"
            : claimable
            ? "bg-[#d6612a] border-[#a84010] text-white hover:bg-[#e8722a]"
            : "bg-[#2a1d0f] border-[#3a2715] text-white/30 cursor-not-allowed"
        }`}
      >
        {claimed ? "✓" : claimable ? "CLAIM" : "🔒"}
      </button>
    </div>
  );
}

export default function QuestsScreen({ state, dispatch, initialTab }) {
  const [tab, setTab] = React.useState(initialTab || "daily");

  const { dailies = [], almanacXp = 0, almanacTier = 0, almanacClaimed = [] } = state;

  const currentTier = Math.floor(almanacXp / 100);
  const nextCost = (currentTier + 1) * 100;
  const xpIntoTier = almanacXp - currentTier * 100;
  const xpPct = Math.min(100, (xpIntoTier / 100) * 100);

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">📜 Quests & Almanac</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "board" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 px-3 py-2 flex-shrink-0">
        {["daily", "almanac"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1 rounded-full text-[12px] font-bold border-2 transition-colors ${
              tab === t
                ? "bg-[#d6612a] border-[#a84010] text-white"
                : "bg-[#3a2715]/60 border-[#5a3a20] text-[#f8e7c6]/70 hover:bg-[#3a2715]"
            }`}
          >
            {t === "daily" ? "Daily" : "Almanac"}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "daily" ? (
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
          {dailies.map((q) => (
            <QuestCard key={q.id} q={q} dispatch={dispatch} />
          ))}
          <p className="text-[10px] text-[#f8e7c6]/50 text-center mt-1">Next refresh: when season ends</p>
          <button
            onClick={() => dispatch({ type: "QUESTS/ROLL_DAILIES" })}
            className="text-[10px] font-bold py-1 px-3 rounded-lg bg-[#3a2715]/70 border border-[#5a3a20] text-[#f8e7c6]/60 hover:bg-[#3a2715] self-center"
          >
            🔄 Reroll (dev)
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3 gap-2">
          {/* XP progress bar */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#3a2715" }}>
              <div
                className="h-full transition-[width] duration-300 rounded-full"
                style={{ width: `${xpPct}%`, background: "#d6612a" }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#f8e7c6] whitespace-nowrap">
              {almanacXp}✦ / {nextCost > 1000 ? "MAX" : nextCost}
            </span>
          </div>
          {/* Tier strip */}
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {ALMANAC_TIERS.map((tierDef, idx) => (
              <AlmanacTierCard
                key={idx}
                idx={idx}
                tierDef={tierDef}
                almanacXp={almanacXp}
                almanacClaimed={almanacClaimed}
                dispatch={dispatch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
