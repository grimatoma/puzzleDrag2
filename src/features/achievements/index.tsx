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
  else if (unlocked)  { borderCls = "!border-[color:var(--iron-soft)]"; }

  // Earned trophies glow with a warm parchment-gold fill so they read as
  // "won" at a glance; locked ones stay flat.
  const earnedStyle = claimed
    ? { background: "linear-gradient(180deg, var(--hud-bg) 0%, var(--panel-bottom) 100%)", boxShadow: "0 0 0 1px rgba(145,191,36,0.35), var(--card-shadow)" }
    : undefined;

  return (
    <div className={`hl-card !flex-row gap-2 items-center min-h-[72px] transition-colors ${borderCls}`} style={earnedStyle}>
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
                backgroundColor: claimed ? "#91bf24" : unlocked ? "#f7c254" : "var(--btn-gold-top)",
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
  const bg = discovered ? hexColor(resource.look.color) : "var(--on-dark-dim)";
  const textColor = discovered ? "#fff" : "#7a5e3f";

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border flex-shrink-0 gap-0.5"
      style={{
        width: 52,
        height: 62,
        backgroundColor: bg,
        borderColor: discovered ? "rgba(255,255,255,0.3)" : "var(--iron)",
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

// Group metadata for the canonical ACHIEVEMENTS list: a display label and a
// one-line bit of vale flavor shown under the section heading. Covers every
// counter so no raw snake_case key (e.g. "fish_chained") leaks as a label.
interface GroupMeta { label: string; flavor: string }
const GROUP_META: Record<string, GroupMeta> = {
  chains_committed:             { label: "Chains",        flavor: "The art of the long harvest — link the land together." },
  orders_fulfilled:            { label: "Orders",        flavor: "Every cart you fill is a neighbour fed." },
  bosses_defeated:             { label: "Bosses",        flavor: "The vale remembers those who stood against the dark." },
  distinct_resources_chained:  { label: "Resources",     flavor: "A keeper knows the land by all it yields." },
  distinct_buildings_built:    { label: "Buildings",     flavor: "Brick by brick, Hearthwood rises." },
  supplies_converted:          { label: "Supplies",      flavor: "What you send the capital, the capital remembers." },
  fish_chained:                { label: "The Harbor",    flavor: "Salt air, patient lines, and a full net by dusk." },
  mine_chained:                { label: "The Mine",      flavor: "Down in the dark, the good stone waits." },
  veg_chained:                 { label: "Vegetables",    flavor: "Honest food, pulled straight from the soil." },
  fruit_chained:               { label: "The Orchard",   flavor: "Old Tomas judges every basket by its sweetest fruit." },
  flower_chained:              { label: "Meadows",       flavor: "Petals for the dye-pots and the festival garlands." },
  herd_chained:                { label: "Herds",         flavor: "Wool, mud, and the contentment of a full pen." },
  cattle_chained:              { label: "Cattle",        flavor: "The dairy thanks you with every churn of butter." },
  mount_chained:               { label: "Stables",       flavor: "A good mount is a road made shorter." },
  tree_chained:                { label: "The Woods",     flavor: "Wren counts the rings and nods his approval." },
  bird_chained:                { label: "Fowl",          flavor: "Feathers in the yard, eggs on the table." },
  building_abilities_triggered:{ label: "The Keep",      flavor: "Your workshops hum with their own quiet magic." },
  distinct_abilities_triggered:{ label: "Mastery",       flavor: "Few keepers ever learn so many tricks of the trade." },
};

function humanizeCounter(counter: string): string {
  return counter.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function groupMeta(counter: string): GroupMeta {
  return GROUP_META[counter] ?? { label: humanizeCounter(counter), flavor: "" };
}

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

  // Use canonical achievements list, grouped by counter key (stable order).
  const counterKeys = [...new Set(ACHIEVEMENTS.map((a) => a.counter))];
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
      </FeaturePanel.Tabs>

      {/* Body */}
      {tab === "trophies" ? (
        <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
          <div className="hl-board-head mt-1">
            {hasIcon("ach_champion") && (
              <IconCanvas iconKey="ach_champion" size={34} background={null} rounded={false} title="Hall of Deeds" className="flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="hl-board-head__kicker">Hearthwood Vale</div>
              <div className="hl-board-head__title">Hall of Deeds</div>
              <div className="hl-board-head__sub">Feats worth telling round the hearth.</div>
            </div>
            <span className="hl-board-pill">{unlockedCount}/{ACHIEVEMENTS.length} earned</span>
          </div>
          {counterKeys.map((counter) => {
            const group = ACHIEVEMENTS.filter((a) => a.counter === counter);
            if (!group.length) return null;
            const meta = groupMeta(counter);
            return (
              <div key={counter}>
                <div className="hl-section-label px-1">{meta.label}</div>
                {meta.flavor && (
                  <div className="px-1 mb-1.5 text-[10px] italic leading-snug text-on-panel-dim">{meta.flavor}</div>
                )}
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
        <div className="flex-1 flex flex-col overflow-hidden pb-2 gap-2">
          <div className="hl-board-head mx-2 mt-2 flex-shrink-0">
            {hasIcon("ach_naturalist") && (
              <IconCanvas iconKey="ach_naturalist" size={34} background={null} rounded={false} title="Collection" className="flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="hl-board-head__kicker">Hearthwood Vale</div>
              <div className="hl-board-head__title">The Keeper's Collection</div>
              <div className="hl-board-head__sub">Every resource you've pressed into the Almanac.</div>
            </div>
            <span className="hl-board-pill">{discoveredCount}/{ALL_RESOURCES.length} found</span>
          </div>
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
