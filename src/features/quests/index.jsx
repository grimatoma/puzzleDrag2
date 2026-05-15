import { useState } from "react";
import { ALMANAC_TIERS } from "../almanac/data.js";
import { QUEST_TEMPLATES } from "./templates.js";

const TABS = ["daily", "almanac"];

function CheckGlyph({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockGlyph({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function rewardLabel(reward) {
  if (!reward) return "?";
  const parts = [];
  if (reward.coins) parts.push(`+${reward.coins}◉`);
  if (reward.tools) {
    for (const [k, v] of Object.entries(reward.tools)) {
      parts.push(`+${v} ${k}`);
    }
  }
  if (reward.structural) {
    const structuralLabels = {
      startingExtraScythe: "Extra Scythe (permanent)",
      extraBlueprintSlot: "Extra Blueprint Slot",
      extraTurn: "Extra Turn token",
      goldSeal: "Golden Seal",
    };
    parts.push(structuralLabels[reward.structural] ?? reward.structural);
  }
  if (reward.tool) {
    parts.push(`+${reward.amt ?? 1} ${reward.tool}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "?";
}

export const viewKey = "quests";

function questLabel(q) {
  if (q.label) return q.label;
  const tpl = QUEST_TEMPLATES.find((t) => t.id === q.template);
  if (tpl?.label) return tpl.label.replace("{n}", q.target);
  return `Quest: ${q.category ?? "unknown"} (${q.target})`;
}

function QuestCard({ q, dispatch }) {
  const pct = Math.min(100, (q.progress / q.target) * 100);
  const isDone = q.done ?? (q.progress >= q.target);
  const claimable = isDone && !q.claimed;
  const completed = isDone || q.claimed;

  return (
    <div
      className={`bg-[#f6efe0] border-2 rounded-xl p-2.5 flex flex-col gap-2 max-w-sm w-full self-center transition-all duration-300 ${
        completed ? "border-[#d6612a] shadow-[0_0_0_2px_rgba(214,97,42,.25)]" : "border-[#c5a87a]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold text-[12px] text-[#3a2715] leading-snug flex-1">{questLabel(q)}</span>
        {claimable && (
          <span className="relative mr-1 mt-0.5">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#f1b34c] opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#d6612a]" />
          </span>
        )}
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
            ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028] animate-pulse"
            : "bg-[#e0d2b0] border-[#c5a87a] text-[#a88a5a] cursor-not-allowed"
        }`}
      >
        {q.claimed ? <span className="inline-flex items-center gap-1 justify-center"><CheckGlyph size={11} /> CLAIMED</span> : "CLAIM"}
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

  const rewardStr = rewardLabel(tierDef.reward);
  const icon = tier >= 8 ? "🔺" : tier >= 5 ? "△" : "◈";

  return (
    <div
      className={`flex flex-col gap-1 p-2.5 rounded-xl border-2 w-full ${
        claimed
          ? "bg-[#c5a87a]/40 border-[#c5a87a]"
          : claimable
          ? "bg-[#f6efe0] border-[#d6612a]"
          : "bg-[#3a2715]/60 border-[#5a3a20]"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="text-[18px] leading-none flex-shrink-0 flex items-center justify-center">{claimed ? <CheckGlyph size={16} /> : claimable ? icon : <LockGlyph size={16} />}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-[#f8e7c6]">
            Tier {tier}{tierDef.name ? ` — ${tierDef.name}` : ""}
          </div>
          <div className="text-[10px] font-bold text-[#c8923a]">{rewardStr}</div>
        </div>
        <div className="text-[9px] text-[#f8e7c6]/60 flex-shrink-0">{cost}✦</div>
      </div>
      {tierDef.description && (
        <div className="text-[9px] text-[#f8e7c6]/70 italic leading-snug">
          {tierDef.description}
        </div>
      )}
      <button
        disabled={!claimable}
        onClick={() => claimable && dispatch({ type: "QUESTS/CLAIM_ALMANAC", tier })}
        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border self-end ${
          claimed
            ? "bg-[#c5a87a] border-[#a88a5a] text-white/60 cursor-default"
            : claimable
            ? "bg-[#d6612a] border-[#a84010] text-white hover:bg-[#e8722a]"
            : "bg-[#2a1d0f] border-[#3a2715] text-white/30 cursor-not-allowed"
        }`}
      >
        {claimed ? <span className="inline-flex items-center gap-1 justify-center"><CheckGlyph size={9} /> Claimed</span> : claimable ? "CLAIM" : <span className="inline-flex justify-center"><LockGlyph size={10} /></span>}
      </button>
    </div>
  );
}

// Embeddable panel (no screen chrome) — used inside the Townsfolk hub.
// Uses local useState for tab so it doesn't conflict with the parent view's viewParams.
export function QuestsPanel({ state, dispatch }) {
  const [tab, setTab] = useState("daily");

  const quests = state.quests ?? state.dailies ?? [];
  const almanacXp = state.almanac?.xp ?? state.almanacXp ?? 0;
  const almanacClaimed = state.almanacClaimed ?? [];

  const currentTier = Math.floor(almanacXp / 100);
  const nextCost = (currentTier + 1) * 100;
  const xpIntoTier = almanacXp - currentTier * 100;
  const xpPct = Math.min(100, (xpIntoTier / 100) * 100);

  return (
    <div className="flex flex-col gap-2">
      {/* Sub-tab toggle */}
      <div className="flex gap-2">
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

      {tab === "daily" ? (
        <div className="flex flex-col gap-2">
          {[...quests].sort((a, b) => {
            const aDone = a.done ?? (a.progress >= a.target);
            const bDone = b.done ?? (b.progress >= b.target);
            return (bDone && !b.claimed ? 1 : 0) - (aDone && !a.claimed ? 1 : 0);
          }).map((q) => (
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
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
      )}
    </div>
  );
}

// Full-screen view (standalone, URL-routed tab).
export default function QuestsScreen({ state, dispatch, initialTab }) {
  const requested = state?.viewParams?.tab ?? initialTab;
  const tab = TABS.includes(requested) ? requested : "daily";
  const setTab = (next) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });

  const quests = state.quests ?? state.dailies ?? [];
  const almanacXp = state.almanac?.xp ?? state.almanacXp ?? 0;
  const almanacClaimed = state.almanacClaimed ?? [];

  const currentTier = Math.floor(almanacXp / 100);
  const nextCost = (currentTier + 1) * 100;
  const xpIntoTier = almanacXp - currentTier * 100;
  const xpPct = Math.min(100, (xpIntoTier / 100) * 100);

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">📜 Quests & Almanac</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>

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

      {tab === "daily" ? (
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
          {[...quests].sort((a, b) => {
            const aDone = a.done ?? (a.progress >= a.target);
            const bDone = b.done ?? (b.progress >= b.target);
            return (bDone && !b.claimed ? 1 : 0) - (aDone && !a.claimed ? 1 : 0);
          }).map((q) => (
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
          <div
            className="flex flex-col gap-2 pb-1 overflow-y-auto"
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
