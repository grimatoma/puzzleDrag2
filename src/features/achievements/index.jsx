import { BIOMES } from "../../constants.js";

const TABS = ["trophies", "collection"];
// Use the canonical achievements list from features/achievements/data.js
// (12 entries with counter/threshold shape). The constants.js ACHIEVEMENTS
// list (20 entries) is retained for legacy compatibility but not rendered here.
import { ACHIEVEMENTS } from "./data.js";
import { MAGIC_TOOLS } from "../portal/data.js";
import Icon from "../../ui/Icon.jsx";

function CheckGlyph({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function prettyToolName(key) {
  const magic = MAGIC_TOOLS.find((t) => t.id === key);
  if (magic) return magic.name;
  // Fallback: replace underscores with spaces and title-case
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const viewKey = "achievements";

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function hexColor(n) {
  return "#" + n.toString(16).padStart(6, "0");
}

// Get progress value for the canonical counter-based achievements
function getCounterValue(state, counter) {
  return (state.achievements?.counters?.[counter] ?? 0);
}

// Legacy metric lookup kept for reference (not currently rendered)
// function getMetricValue(state, eventKey) { ... }

// ─── Trophy card ─────────────────────────────────────────────────────────────

function TrophyCard({ achievement, current, trophyState }) {
  // canonical shape uses threshold; legacy shape uses target
  const { name, desc, icon, threshold, target: targetLegacy } = achievement;
  const target = threshold ?? targetLegacy ?? 1;
  const unlocked = !!trophyState;
  const claimed  = trophyState === "claimed";
  const pct = Math.min(100, (current / target) * 100);

  let cardBg = "bg-[#3a2715]";
  let borderCls = "border-[#c5a87a]/50";
  if (claimed)        { cardBg = "bg-[#91bf24]/30"; borderCls = "border-[#91bf24]/60"; }
  else if (unlocked)  { cardBg = "bg-[#5b3b20]"; borderCls = "border-[#c5a87a]"; }

  return (
    <div className={`${cardBg} border ${borderCls} rounded-xl p-2 flex gap-2 items-center min-h-[72px] transition-colors`}>
      {/* Icon */}
      <div className={`text-[22px] w-8 flex-shrink-0 text-center leading-none flex items-center justify-center ${!unlocked ? "grayscale opacity-40" : ""}`}>
        {unlocked ? icon : <LockGlyph size={18} />}
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

      {/* Right: reward */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {achievement.reward && (
          <div className="text-[9px] text-[#c8923a] font-bold whitespace-nowrap leading-tight">
            {achievement.reward.coins ? `+${achievement.reward.coins}◉` : ""}
            {achievement.reward.xp ? ` +${achievement.reward.xp}xp` : ""}
            {achievement.reward.tools
              ? Object.entries(achievement.reward.tools)
                  .map(([k, v]) => ` +${v} ${prettyToolName(k)}`)
                  .join("")
              : ""}
          </div>
        )}
        {claimed && (
          <div className="text-[9px] font-bold text-[#91bf24] inline-flex items-center gap-1">
            <CheckGlyph size={10} />
            Done
          </div>
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
        {discovered ? <Icon iconKey={resource.key} size={24} /> : "?"}
      </div>
      <div className="text-[8px] font-bold leading-tight text-center px-0.5 truncate w-full text-center" style={{ color: textColor }}>
        {discovered ? resource.label : "???"}
      </div>
      {discovered && (
        <div className="text-[8px] font-bold inline-flex items-center gap-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>
          <CheckGlyph size={8} />{count}
        </div>
      )}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

// Derive counter-grouped categories from canonical ACHIEVEMENTS list
const COUNTER_GROUPS = {
  chains_committed: "Chains",
  orders_fulfilled: "Orders",
  bosses_defeated: "Bosses",
  distinct_resources_chained: "Resources",
  distinct_buildings_built: "Buildings",
  supplies_converted: "Supplies",
};

export default function AchievementsScreen({ state, dispatch }) {
  const requested = state?.viewParams?.tab;
  const tab = TABS.includes(requested) ? requested : "trophies";
  const setTab = (next) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });

  // Canonical: state.achievements.unlocked (from features/achievements/data.js)
  const unlockedMap = state.achievements?.unlocked ?? {};
  const collected = state.collected || {};

  const discoveredCount = ALL_RESOURCES.filter((r) => (collected[r.key] || 0) > 0).length;
  const totalLifetime = Object.values(collected).reduce((s, v) => s + v, 0);

  // Use canonical achievements list, group by counter
  const counterGroups = [...new Set(ACHIEVEMENTS.map((a) => COUNTER_GROUPS[a.counter] ?? a.counter))];
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedMap[a.id]).length;

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] rounded-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🏆 Trophies</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
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
            ? `${unlockedCount}/${ACHIEVEMENTS.length} unlocked`
            : `${discoveredCount}/${ALL_RESOURCES.length} discovered`}
        </div>
      </div>

      {/* Body */}
      {tab === "trophies" ? (
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
          {counterGroups.map((grp) => {
            const group = ACHIEVEMENTS.filter((a) => (COUNTER_GROUPS[a.counter] ?? a.counter) === grp);
            if (!group.length) return null;
            return (
              <div key={grp} className="mb-2">
                <div className="text-[10px] font-bold text-[#c8923a] uppercase tracking-widest px-1 mb-1">{grp}</div>
                <div className="grid grid-cols-3 portrait:grid-cols-2 gap-1.5">
                  {group.map((a) => (
                    <TrophyCard
                      key={a.id}
                      achievement={a}
                      current={getCounterValue(state, a.counter)}
                      trophyState={unlockedMap[a.id] ? "claimed" : null}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden pb-2">
          {/* Resource strip */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
              {/* Farm resources */}
              <div className="flex flex-col gap-1 justify-center">
                <div className="text-[9px] text-[#c8923a] font-bold uppercase tracking-widest px-0.5">Farm</div>
                <div className="flex flex-wrap gap-1.5">
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
                <div className="flex flex-wrap gap-1.5">
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
