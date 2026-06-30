import { useState } from "react";
import type { CSSProperties } from "react";
import { ALMANAC_TIERS } from "../almanac/data.js";
import { QUEST_TEMPLATES } from "./templates.js";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import ActionCard, { ProgressBar } from "../../ui/primitives/ActionCard.jsx";
import { ClaimBurst, RewardHeadlineChip, RewardManifest } from "./RewardBundle.jsx";
import type { Dispatch, GameState } from "../../types/state.js";
import type { Quest } from "./data.js";

interface DisplayReward {
  coins?: number;
  xp?: number;
  almanacXp?: number;
  tools?: Record<string, number>;
  items?: Record<string, number>;
  runes?: number;
  structural?: string;
  unlockTile?: string;
  unlockBuilding?: string;
  tool?: string;
  amt?: number;
  [k: string]: unknown;
}

interface LegacyDaily {
  id: string;
  label?: string;
  template?: string;
  category?: string;
  target: number;
  progress: number;
  done?: boolean;
  claimed: boolean;
  reward: DisplayReward;
  key?: string;
}

// A quest as we render it. The deterministic system stores `Quest` shape, the
// legacy system stores `LegacyDaily`. Their reward fields disagree (xp vs
// almanacXp) — we look up both at the call site.
type DisplayQuest = (Omit<Quest, "reward"> | LegacyDaily) & { reward: DisplayReward };

interface AlmanacTierDef {
  tier: number;
  level: number;
  name?: string;
  description?: string;
  reward: DisplayReward;
}

const TABS = ["daily", "almanac"];

// ── Category presentation ──────────────────────────────────────────────────
// Each quest category gets a colour (the card spine + tag + progress fill), a
// short verb label, and the matching scroll icon. The flavor fallback covers
// legacy dailies whose template id isn't in the pool.
interface CategoryMeta {
  label: string;
  accent: string;
  icon: string;
  flavor: string;
}
const CATEGORY_META: Record<string, CategoryMeta> = {
  collect: { label: "Gather",  accent: "#6f8a3a", icon: "quest_collect", flavor: "The vale's stores run low — gather what the land gives." },
  craft:   { label: "Craft",   accent: "#d6612a", icon: "quest_craft",   flavor: "Idle hands, cold hearth. Set the workshops humming." },
  order:   { label: "Deliver", accent: "#a8722a", icon: "quest_order",   flavor: "Carts wait at the gate. Fill the orders before dusk." },
  tool:    { label: "Toil",    accent: "var(--indigo)", icon: "quest_tool",    flavor: "The right tool, well used, is worth ten hands." },
  chain:   { label: "Combo",   accent: "var(--rose)", icon: "quest_chain",   flavor: "Link your harvest together for a richer haul." },
};
const CATEGORY_DEFAULT: CategoryMeta = {
  label: "Task", accent: "var(--ember)", icon: "quest_book",
  flavor: "A request from the folk of the vale.",
};

function categoryMeta(q: DisplayQuest): CategoryMeta {
  const cat = (q as { category?: string }).category ?? "";
  return CATEGORY_META[cat] ?? CATEGORY_DEFAULT;
}

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

// Four-point sparkle — marks a quest that's ready to claim.
function SparkGlyph({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.6 4.4 3 6.8 7.4 7.4C15 10 12.6 12.4 12 16.8 11.4 12.4 9 10 4.6 9.4 9 8.8 11.4 6.4 12 2z" />
    </svg>
  );
}

export const viewKey = "quests";

function questLabel(q: DisplayQuest): string {
  if ("label" in q && q.label) return q.label;
  const tpl = QUEST_TEMPLATES.find((t) => t.id === (q as { template?: string }).template);
  if (tpl?.label) return tpl.label.replace("{n}", String(q.target));
  const cat = (q as { category?: string }).category;
  return `Quest: ${cat ?? "unknown"} (${q.target})`;
}

// The story line for a quest: prefer the template's authored flavor, then fall
// back to a per-category line so legacy dailies still read like a commission.
function questFlavor(q: DisplayQuest): string {
  const tpl = QUEST_TEMPLATES.find((t) => t.id === (q as { template?: string }).template);
  if (tpl?.flavor) return tpl.flavor;
  return categoryMeta(q).flavor;
}

function isQuestDone(q: DisplayQuest): boolean {
  return (q as LegacyDaily).done ?? (q.progress >= q.target);
}

interface QuestCardProps {
  q: DisplayQuest;
  dispatch: Dispatch;
}

function QuestCard({ q, dispatch }: QuestCardProps) {
  const isDone = isQuestDone(q);
  const claimable = isDone && !q.claimed;
  const claimed = !!q.claimed;
  const meta = categoryMeta(q);
  const catKey = meta.icon;
  const flavor = questFlavor(q);
  const remaining = Math.max(0, q.target - q.progress);

  // One-shot claim celebration. `bursting` mounts the <ClaimBurst> overlay and
  // adds a quick card pop; it clears itself after the animation window so the
  // card settles into its claimed state. Default false ⇒ no effect on the
  // static render (and thus none on visual goldens).
  const [bursting, setBursting] = useState(false);
  const handleClaim = () => {
    if (!claimable) return;
    setBursting(true);
    dispatch({ type: "QUESTS/CLAIM_QUEST", id: q.id });
    window.setTimeout(() => setBursting(false), 900);
  };

  return (
    <div
      className={`quest-card w-full ${claimable ? "quest-card--ready" : ""} ${claimed ? "quest-card--done" : ""} ${bursting ? "quest-card--claimed-fx" : ""}`}
      style={{ "--q-accent": meta.accent } as CSSProperties}
    >
      {bursting && <ClaimBurst reward={q.reward} />}
      {/* Category tag + reward token */}
      <div className="flex items-center justify-between gap-2">
        <span className="quest-tag">
          {catKey && hasIcon(catKey) && (
            <IconCanvas iconKey={catKey} size={13} background={null} rounded={false} title={meta.label} />
          )}
          {meta.label}
        </span>
        <RewardHeadlineChip reward={q.reward} />
      </div>

      {/* Title + flavor line */}
      <div className="flex flex-col gap-0.5">
        <div className="quest-card-title">{questLabel(q)}</div>
        {flavor && <div className="quest-card-flavor">{flavor}</div>}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <ProgressBar value={q.progress} max={q.target} color={meta.accent} className="flex-1" />
        <span className="text-[11px] font-bold text-[#6a4b31] whitespace-nowrap tabular-nums">
          {q.progress}/{q.target}
        </span>
      </div>

      {/* Reward manifest — every reward this quest grants */}
      <RewardManifest reward={q.reward} />

      {/* Status + claim */}
      <div className="flex items-center justify-between gap-2">
        {claimable ? (
          <span className="quest-card-status"><SparkGlyph size={11} /> Ready to claim</span>
        ) : claimed ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#7a5e3f]/70">
            <CheckGlyph size={10} /> Filled
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[#7a5e3f]/70 tabular-nums">{remaining} to go</span>
        )}
        <button
          disabled={!claimable}
          onClick={handleClaim}
          className={`hl-btn hl-btn--sm ${claimable ? "hl-btn--go animate-pulse" : ""}`}
        >
          {claimed
            ? <span className="inline-flex items-center gap-1 justify-center"><CheckGlyph size={10} /> Claimed</span>
            : "Claim"}
        </button>
      </div>
    </div>
  );
}

interface AlmanacTierCardProps {
  idx: number;
  tierDef: AlmanacTierDef;
  almanacXp: number;
  almanacClaimed: number[];
  dispatch: Dispatch;
}

function AlmanacTierCard({ idx, tierDef, almanacXp, almanacClaimed, dispatch }: AlmanacTierCardProps) {
  const tier = idx + 1;
  const cost = tier * 100;
  const claimed = almanacClaimed.includes(tier);
  const unlocked = almanacXp >= cost;
  const claimable = unlocked && !claimed;

  const icon = tier >= 8 ? "🔺" : tier >= 5 ? "△" : "◈";

  return (
    <ActionCard
      className="gap-1 w-full"
      style={{
        background: claimed ? "rgba(197,168,122,0.4)" : claimable ? "var(--card-bg)" : "rgba(212,181,133,0.4)",
        borderColor: claimed ? "var(--iron-soft)" : claimable ? "var(--ember)" : "rgba(178,139,98,0.6)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="text-[18px] leading-none flex-shrink-0 flex items-center justify-center">{claimed ? <CheckGlyph size={16} /> : claimable ? icon : <LockGlyph size={16} />}</div>
        <div className="flex-1 min-w-0">
          <ActionCard.Title className="text-[11px]">
            Tier {tier}{tierDef.name ? ` — ${tierDef.name}` : ""}
          </ActionCard.Title>
        </div>
        <div className="text-[9px] text-[#7a5e3f]/70 flex-shrink-0">{cost}✦</div>
      </div>
      <RewardManifest reward={tierDef.reward} />
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

// ── Shared sections (used by both the embedded panel and the full screen) ───

function QuestBoardHeader({ quests }: { quests: DisplayQuest[] }) {
  const total = quests.length;
  const ready = quests.filter((q) => isQuestDone(q) && !q.claimed).length;
  return (
    <div className="hl-board-head">
      {hasIcon("quest_book") && (
        <IconCanvas iconKey="quest_book" size={36} background={null} rounded={false} title="Quest Board" className="flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="hl-board-head__kicker">Commissions</div>
        <div className="hl-board-head__title">The Vale Notice Board</div>
        <div className="hl-board-head__sub">Tasks from the folk of the vale. Fill them before the season turns.</div>
      </div>
      <span className={`hl-board-pill ${ready > 0 ? "hl-board-pill--alert" : ""}`}>
        {ready > 0 ? (
          <><SparkGlyph size={10} /> {ready} ready</>
        ) : (
          `${total} open`
        )}
      </span>
    </div>
  );
}

function DailyList({ quests, dispatch }: { quests: DisplayQuest[]; dispatch: Dispatch }) {
  const sorted = [...quests].sort((a, b) => {
    const aReady = isQuestDone(a) && !a.claimed ? 1 : 0;
    const bReady = isQuestDone(b) && !b.claimed ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;
    // then unclaimed-in-progress, then claimed last
    const aClaimed = a.claimed ? 1 : 0;
    const bClaimed = b.claimed ? 1 : 0;
    return aClaimed - bClaimed;
  });

  return (
    <div className="flex flex-col gap-2">
      <QuestBoardHeader quests={quests} />
      {sorted.length === 0 ? (
        <div className="hl-empty">The board is clear. New commissions arrive each season.</div>
      ) : (
        sorted.map((q) => <QuestCard key={q.id} q={q} dispatch={dispatch} />)
      )}
    </div>
  );
}

function AlmanacHeader({ almanacXp, xpIntoTier, nextCost }: { almanacXp: number; xpIntoTier: number; nextCost: number }) {
  const maxed = nextCost > 1000;
  return (
    <div className="almanac-head flex-shrink-0">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="almanac-head-kicker">The Vale Almanac</div>
          <div className="almanac-head-title">Keeper's Ledger</div>
        </div>
        <span className="text-[11px] font-bold text-[#3a2150] whitespace-nowrap tabular-nums">
          {almanacXp}✦ {maxed ? "· MAX" : `/ ${nextCost}`}
        </span>
      </div>
      <ProgressBar value={xpIntoTier} max={100} color="var(--panel-arcane-border)" className="h-3" />
      <div className="text-[10px] leading-snug text-[#6a4a8a]">
        Earn ✦ as you complete quests. Each tier the keeper records earns a standing reward.
      </div>
    </div>
  );
}

function AlmanacList({
  almanacXp,
  almanacClaimed,
  dispatch,
  xpIntoTier,
  nextCost,
}: {
  almanacXp: number;
  almanacClaimed: number[];
  dispatch: Dispatch;
  xpIntoTier: number;
  nextCost: number;
}) {
  return (
    <>
      <AlmanacHeader almanacXp={almanacXp} xpIntoTier={xpIntoTier} nextCost={nextCost} />
      {ALMANAC_TIERS.map((tierDef, idx) => (
        <AlmanacTierCard
          key={idx}
          idx={idx}
          tierDef={tierDef as AlmanacTierDef}
          almanacXp={almanacXp}
          almanacClaimed={almanacClaimed}
          dispatch={dispatch}
        />
      ))}
    </>
  );
}

interface QuestsPanelProps {
  state: GameState;
  dispatch: Dispatch;
}

// Embeddable panel (no screen chrome) — used inside the Townsfolk hub.
// Uses local useState for tab so it doesn't conflict with the parent view's viewParams.
export function QuestsPanel({ state, dispatch }: QuestsPanelProps) {
  const [tab, setTab] = useState<"daily" | "almanac">("daily");

  const quests = ((state.quests ?? (state as { dailies?: DisplayQuest[] }).dailies ?? []) as DisplayQuest[]);
  const almanacXp = state.almanac?.xp ?? (state as { almanacXp?: number }).almanacXp ?? 0;
  const almanacClaimed = ((state as { almanacClaimed?: number[] }).almanacClaimed ?? []);

  const currentTier = Math.floor(almanacXp / 100);
  const nextCost = (currentTier + 1) * 100;
  const xpIntoTier = almanacXp - currentTier * 100;

  return (
    <div className="flex flex-col gap-2">
      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        {(["daily", "almanac"] as const).map((t) => (
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
        <DailyList quests={quests} dispatch={dispatch} />
      ) : (
        <div className="flex flex-col gap-2">
          <AlmanacList
            almanacXp={almanacXp}
            almanacClaimed={almanacClaimed}
            dispatch={dispatch}
            xpIntoTier={xpIntoTier}
            nextCost={nextCost}
          />
        </div>
      )}
    </div>
  );
}

interface QuestsScreenProps {
  state: GameState;
  dispatch: Dispatch;
  initialTab?: string;
}

// Full-screen view (standalone, URL-routed tab).
export default function QuestsScreen({ state, dispatch, initialTab }: QuestsScreenProps) {
  const requested = (state?.viewParams as { tab?: string } | undefined)?.tab ?? initialTab;
  const tab = TABS.includes(requested ?? "") ? (requested as string) : "daily";
  const setTab = (next: string) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });

  const quests = ((state.quests ?? (state as { dailies?: DisplayQuest[] }).dailies ?? []) as DisplayQuest[]);
  const almanacXp = state.almanac?.xp ?? (state as { almanacXp?: number }).almanacXp ?? 0;
  const almanacClaimed = ((state as { almanacClaimed?: number[] }).almanacClaimed ?? []);

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
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <DailyList quests={quests} dispatch={dispatch} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3 gap-2">
          <div
            className="flex flex-col gap-2 pb-1 overflow-y-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <AlmanacList
              almanacXp={almanacXp}
              almanacClaimed={almanacClaimed}
              dispatch={dispatch}
              xpIntoTier={xpIntoTier}
              nextCost={nextCost}
            />
          </div>
        </div>
      )}
    </FeaturePanel>
  );
}
