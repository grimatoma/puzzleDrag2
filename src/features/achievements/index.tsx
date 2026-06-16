import type { ReactNode } from "react";
import { BIOMES } from "../../constants.js";
import type { GameState, Dispatch } from "../../types/state.js";

const TABS = ["trophies", "collection"];
// Use the canonical achievements list from features/achievements/data.js
// (12 entries with counter/threshold shape). The constants.js ACHIEVEMENTS
// list (20 entries) is retained for legacy compatibility but not rendered here.
import { ACHIEVEMENTS, type AchievementDef } from "./data.js";
import { MAGIC_TOOLS } from "../portal/data.js";
import Icon from "../../ui/Icon.jsx";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";

interface GlyphProps { size?: number }

function CheckGlyph({ size = 12 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockGlyph({ size = 18 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface MagicTool { id: string; name: string }

function prettyToolName(key: string): string {
  const magic = (MAGIC_TOOLS as MagicTool[]).find((t) => t.id === key);
  if (magic) return magic.name;
  // Fallback: replace underscores with spaces and title-case
  return key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export const viewKey = "achievements";

interface Resource {
  key: string;
  label: string;
  look: { color: number };
}

const ALL_RESOURCES: Resource[] = [...BIOMES.farm.resources, ...BIOMES.mine.resources] as Resource[];

function hexColor(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

interface AchievementsState {
  counters?: Record<string, number>;
  unlocked?: Record<string, boolean>;
}

// Get progress value for the canonical counter-based achievements
function getCounterValue(state: GameState, counter: string): number {
  const ach = (state as GameState & { achievements?: AchievementsState }).achievements;
  return (ach?.counters?.[counter] ?? 0);
}

// Legacy metric lookup kept for reference (not currently rendered)
// function getMetricValue(state, eventKey) { ... }

// ─── Trophy card ─────────────────────────────────────────────────────────────

interface TrophyCardProps {
  achievement: AchievementDef;
  current: number;
  trophyState: string | null;
}

function TrophyCard({ achievement, current, trophyState }: TrophyCardProps) {
  // canonical shape uses threshold; legacy shape uses target
  const { name, desc, threshold, target: targetLegacy } = achievement;
  const icon: ReactNode = (achievement as AchievementDef & { look?: { icon?: ReactNode } }).look?.icon ?? null;
  const iconKey = `ach_${achievement.id}`;
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
        {unlocked
          ? (hasIcon(iconKey) ? <IconCanvas iconKey={iconKey} size={30} background={null} rounded={false} title={name} /> : icon)
          : <LockGlyph size={18} />}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="hl-card-title text-caption leading-tight truncate">{name}</div>
        <div className="hl-card-meta text-[10px] leading-snug line-clamp-1">{desc}</div>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 h-1.5 bg-[#2b2218]/25 rounded-full overflow-hidden">
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

interface ResourceChipProps {
  resource: Resource;
  count: number;
}

function ResourceChip({ resource, count }: ResourceChipProps) {
  const discovered = count > 0;
  const bg = discovered ? hexColor(resource.look.color) : "#d8c4a0";
  const textColor = discovered ? "#fff" : "#7a5e3f";

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
const COUNTER_GROUPS: Record<string, string> = {
  chains_committed: "Chains",
  orders_fulfilled: "Orders",
  bosses_defeated: "Bosses",
  distinct_resources_chained: "Resources",
  distinct_buildings_built: "Buildings",
  supplies_converted: "Supplies",
};

interface AchievementsScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function AchievementsScreen({ state, dispatch }: AchievementsScreenProps) {
  const viewParams = (state as GameState & { viewParams?: { tab?: string } }).viewParams;
  const requested = viewParams?.tab;
  const tab = requested && TABS.includes(requested) ? requested : "trophies";
  const setTab = (next: string) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });

  // Canonical: state.achievements.unlocked (from features/achievements/data.js)
  const achState = (state as GameState & { achievements?: AchievementsState; collected?: Record<string, number> });
  const unlockedMap: Record<string, boolean> = achState.achievements?.unlocked ?? {};
  const collected: Record<string, number> = achState.collected || {};

  const discoveredCount = ALL_RESOURCES.filter((r) => (collected[r.key] || 0) > 0).length;
  const totalLifetime = Object.values(collected).reduce((s: number, v: number) => s + v, 0);

  // Use canonical achievements list, group by counter
  const counterGroups = [...new Set(ACHIEVEMENTS.map((a) => COUNTER_GROUPS[a.counter] ?? a.counter))];
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedMap[a.id]).length;

  return (
    <FeaturePanel>
      {/* Tab toggle */}
      <FeaturePanel.Tabs>
        {["trophies", "collection"].map((t) => (
          <FeaturePanel.Tab
            key={t}
            onClick={() => setTab(t)}
            active={tab === t}
          >
            {t === "trophies" ? "Trophies" : "Collection"}
          </FeaturePanel.Tab>
        ))}
        <div className="ml-auto text-[10px] text-on-panel-dim flex items-center">
          {tab === "trophies"
            ? `${unlockedCount}/${ACHIEVEMENTS.length} unlocked`
            : `${discoveredCount}/${ALL_RESOURCES.length} discovered`}
        </div>
      </FeaturePanel.Tabs>

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
                  {(BIOMES.farm.resources as Resource[]).map((r) => (
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
                  {(BIOMES.mine.resources as Resource[]).map((r) => (
                    <ResourceChip key={r.key} resource={r} count={collected[r.key] || 0} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Footer strip */}
          <div className="flex-shrink-0 px-3 py-1.5 border-t border-[var(--panel-divider)] text-micro text-on-panel-dim font-bold flex gap-3">
            <span>Discovered {discoveredCount}/{ALL_RESOURCES.length}</span>
            <span className="text-on-panel-faint">·</span>
            <span>Total harvested: {totalLifetime.toLocaleString()}</span>
          </div>
        </div>
      )}
    </FeaturePanel>
  );
}
