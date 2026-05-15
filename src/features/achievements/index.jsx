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

  let borderCls = "";
  if (claimed)        { borderCls = "!border-[#91bf24]"; }
  else if (unlocked)  { borderCls = "!border-[#c5a87a]"; }

  return (
    <div className={`hl-card !flex-row gap-2 items-center min-h-[72px] transition-colors ${borderCls}`}>
      {/* Icon */}
      <div className={`text-[22px] w-8 flex-shrink-0 text-center leading-none flex items-center justify-center ${!unlocked ? "grayscale opacity-40 text-on-panel-faint" : ""}`}>
        {unlocked ? icon : <LockGlyph size={18} />}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="hl-card-title text-[12px] leading-tight truncate">{name}</div>
        <div className="hl-card-meta text-[10px] leading-snug line-clamp-1">{desc}</div>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 h-1.5 bg-[#3a2715]/25 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: claimed ? "#91bf24" : unlocked ? "#f7c254" : "#c8923a",
              }}
            />
          </div>
          <div className="text-[9px] text-on-panel-dim whitespace-nowrap font-bold">
            {Math.min(current, target)}/{target}
          </div>
        </div>
      </div>

      {/* Right: reward */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {achievement.reward && (
          <div className="text-[9px] text-[#a8722a] font-bold whitespace-nowrap leading-tight">
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
  const bg = discovered ? hexColor(resource.color) : "#d8c4a0";
  const textColor = discovered ? "#fff" : "#5b3b20";

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border flex-shrink-0 gap-0.5"
      style={{
        width: 52,
        height: 62,
        backgroundColor: bg,
        borderColor: discovered ? "rgba(255,255,255,0.3)" : "#b28b62",
        opacity: discovered ? 1 : 0.7,
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
    <div className="hl-panel">
      {/* Header */}
      <div className="hl-panel-header">
        <span className="hl-panel-title">🏆 Trophies</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >
          ✕
        </button>
      </div>

      {/* Tab toggle */}
      <div className="hl-tabs">
        {["trophies", "collection"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`hl-tab ${tab === t ? "is-active" : ""}`}
          >
            {t === "trophies" ? "Trophies" : "Collection"}
          </button>
        ))}
        <div className="ml-auto text-[10px] text-on-panel-dim flex items-center">
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
                <div className="hl-section-label px-1 mb-1">{grp}</div>
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
                <div className="hl-section-label !text-[9px] px-0.5">Farm</div>
                <div className="flex flex-wrap gap-1.5">
                  {BIOMES.farm.resources.map((r) => (
                    <ResourceChip key={r.key} resource={r} count={collected[r.key] || 0} />
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div className="w-px bg-[var(--panel-divider)] mx-1 self-stretch" />
              {/* Mine resources */}
              <div className="flex flex-col gap-1 justify-center">
                <div className="hl-section-label !text-[9px] px-0.5">Mine</div>
                <div className="flex flex-wrap gap-1.5">
                  {BIOMES.mine.resources.map((r) => (
                    <ResourceChip key={r.key} resource={r} count={collected[r.key] || 0} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Footer strip */}
          <div className="flex-shrink-0 px-3 py-1.5 border-t border-[var(--panel-divider)] text-[11px] text-on-panel-dim font-bold flex gap-3">
            <span>Discovered {discoveredCount}/{ALL_RESOURCES.length}</span>
            <span className="text-on-panel-faint">·</span>
            <span>Total harvested: {totalLifetime.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
