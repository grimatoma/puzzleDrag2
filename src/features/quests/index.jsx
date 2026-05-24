import { useState } from "react";
import { ALMANAC_TIERS } from "../almanac/data.js";
import { QUEST_TEMPLATES } from "./templates.js";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import ActionCard, { ProgressBar } from "../../ui/primitives/ActionCard.jsx";

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
  const isDone = q.done ?? (q.progress >= q.target);
  const claimable = isDone && !q.claimed;
  const completed = isDone || q.claimed;

  return (
    <ActionCard
      className={`max-w-sm w-full self-center transition-all duration-300 ${
        completed ? "!border-[#d6612a] shadow-[0_0_0_2px_rgba(214,97,42,.25)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <ActionCard.Title className="text-[12px] flex-1">{questLabel(q)}</ActionCard.Title>
        {claimable && (
          <span className="relative mr-1 mt-0.5">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#f1b34c] opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#d6612a]" />
          </span>
        )}
        <span className="text-[11px] font-bold text-[#a8722a] whitespace-nowrap">
          +{q.reward.coins}◉{q.reward.almanacXp ? ` +${q.reward.almanacXp}✦` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ProgressBar value={q.progress} max={q.target} className="flex-1" />
        <span className="text-[11px] font-bold text-[#6a4b31] whitespace-nowrap">{q.progress}/{q.target}</span>
      </div>
      <button
        disabled={!claimable}
        onClick={() => claimable && dispatch({ type: "QUESTS/CLAIM_QUEST", id: q.id })}
        className={`hl-btn hl-btn--go ${claimable ? "animate-pulse" : ""}`}
      >
        {q.claimed ? <span className="inline-flex items-center gap-1 justify-center"><CheckGlyph size={11} /> CLAIMED</span> : "CLAIM"}
      </button>
    </ActionCard>
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
    <ActionCard
      className="gap-1 w-full"
      style={{
        background: claimed ? "rgba(197,168,122,0.4)" : claimable ? "var(--card-bg)" : "rgba(212,181,133,0.4)",
        borderColor: claimed ? "#c5a87a" : claimable ? "var(--ember)" : "rgba(178,139,98,0.6)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="text-[18px] leading-none flex-shrink-0 flex items-center justify-center">{claimed ? <CheckGlyph size={16} /> : claimable ? icon : <LockGlyph size={16} />}</div>
        <div className="flex-1 min-w-0">
          <ActionCard.Title className="text-[11px]">
            Tier {tier}{tierDef.name ? ` — ${tierDef.name}` : ""}
          </ActionCard.Title>
          <div className="text-[10px] font-bold text-[#a8722a]">{rewardStr}</div>
        </div>
        <div className="text-[9px] text-[#7a5e3f]/70 flex-shrink-0">{cost}✦</div>
      </div>
      {tierDef.description && (
        <div className="text-[9px] text-[#7a5e3f]/80 italic leading-snug">
          {tierDef.description}
        </div>
      )}
      <button
        disabled={!claimable}
        onClick={() => claimable && dispatch({ type: "QUESTS/CLAIM_ALMANAC", tier })}
        className="hl-btn hl-btn--sm hl-btn--primary self-end"
      >
        {claimed ? <span className="inline-flex items-center gap-1 justify-center"><CheckGlyph size={9} /> Claimed</span> : claimable ? "CLAIM" : <span className="inline-flex justify-center"><LockGlyph size={10} /></span>}
      </button>
    </ActionCard>
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

  return (
    <div className="flex flex-col gap-2">
      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        {["daily", "almanac"].map((t) => (
          <FeaturePanel.Tab
            key={t}
            onClick={() => setTab(t)}
            active={tab === t}
          >
            {t === "daily" ? "Daily" : "Almanac"}
          </FeaturePanel.Tab>
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
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ProgressBar value={xpIntoTier} max={100} className="flex-1 h-3" />
            <span className="text-[11px] font-bold text-[#2b2218] whitespace-nowrap">
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

  return (
    <FeaturePanel>
      <FeaturePanel.Tabs>
        {["daily", "almanac"].map((t) => (
          <FeaturePanel.Tab
            key={t}
            onClick={() => setTab(t)}
            active={tab === t}
          >
            {t === "daily" ? "Daily" : "Almanac"}
          </FeaturePanel.Tab>
        ))}
      </FeaturePanel.Tabs>

      {tab === "daily" ? (
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
          {[...quests].sort((a, b) => {
            const aDone = a.done ?? (a.progress >= a.target);
            const bDone = b.done ?? (b.progress >= b.target);
            return (bDone && !b.claimed ? 1 : 0) - (aDone && !a.claimed ? 1 : 0);
          }).map((q) => (
            <QuestCard key={q.id} q={q} dispatch={dispatch} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3 gap-2">
          <div className="flex-shrink-0 flex items-center gap-2">
            <ProgressBar value={xpIntoTier} max={100} className="flex-1 h-3" />
            <span className="text-[11px] font-bold text-[#2b2218] whitespace-nowrap">
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
    </FeaturePanel>
  );
}
