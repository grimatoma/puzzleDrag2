// Balance Manager — standalone console for editing tile chains, resources,
// recipes, building costs and tile power hooks. Served from its own page at
// `/b/` (separate Vite entry, see `b/index.html`). Edits are kept in a draft
// object stored in localStorage (`hearth.balance.draft`) and applied to the
// game's constants on next page load. The full draft can be exported as
// JSON for committing to `src/config/balance.json`.
//
// Because both the game and this app share an origin, localStorage drafts
// written here are picked up by the game on its next load.

import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from "react";
import { BALANCE_OVERRIDES } from "../constants.js";
import { writeBalanceDraft } from "../config/applyOverrides.js";
import balanceFile from "../config/balance.json";
import { COLORS } from "./shared.jsx";
import { parseHash, useBalanceRouter } from "./router.js";

// Lazy-load tabs so the Balance Manager (a dev-time tool) stays out of the
// main entry chunk. Each tab becomes its own JS chunk fetched only when
// the user opens the modal and selects that tab.
const ResourcesTab = lazy(() => import("./tabs/ResourcesTab.jsx"));
const RecipesTab   = lazy(() => import("./tabs/RecipesTab.jsx"));
const BuildingsTab = lazy(() => import("./tabs/BuildingsTab.jsx"));
const PowersTab    = lazy(() => import("./tabs/PowersTab.jsx"));
const ZonesTab     = lazy(() => import("./tabs/ZonesTab.jsx"));
const BiomesTab    = lazy(() => import("./tabs/BiomesTab.jsx"));
const WorkersTab   = lazy(() => import("./tabs/WorkersTab.jsx"));
const KeepersTab   = lazy(() => import("./tabs/KeepersTab.jsx"));
const NpcsTab      = lazy(() => import("./tabs/NpcsTab.jsx"));
const StoryTab     = lazy(() => import("./tabs/StoryTab.jsx"));
const RationsTab   = lazy(() => import("./tabs/RationsTab.jsx"));
const TuningTab    = lazy(() => import("./tabs/TuningTab.jsx"));
const BossesTab    = lazy(() => import("./tabs/BossesTab.jsx"));
const AchievementsTab = lazy(() => import("./tabs/AchievementsTab.jsx"));
const DailyRewardsTab = lazy(() => import("./tabs/DailyRewardsTab.jsx"));
const ExportTab    = lazy(() => import("./tabs/ExportTab.jsx"));
const IconsTab     = lazy(() => import("./tabs/IconsTab.jsx"));

// Hash routing for the Balance Manager lives in `./router.js` — kept separate
// from `src/router.js` because the Balance Manager is its own page (`/b/`).
//
// Tabs are grouped under three top-level sections that mirror the game's
// model: tiles live on the board, resources are inventory currencies, and
// items are the things crafted from resources (tools count as items).
const TABS = [
  { id: "tiles",     label: "Tiles",          iconKey: "ui_star", Component: PowersTab,
    section: "tiles",
    blurb: "Per-tile attributes: discovery method, what resource the chain produces, and any attached power hooks." },
  { id: "zones",     label: "Zones",          iconKey: "ui_star", Component: ZonesTab,
    section: "tiles",
    blurb: "Per-zone settings: starting turns, entry cost, the chain-upgrade redirect map, and the per-(zone, season) tile drop percentages." },
  { id: "biomes",    label: "Settlement Biomes", iconKey: "ui_star", Component: BiomesTab,
    section: "tiles",
    blurb: "The biomes a settlement can be founded as (4 per type): name, icon, the two hazards that appear in every round there, and the resource bonus." },
  { id: "resources", label: "Resources",      iconKey: "ui_star", Component: ResourcesTab,
    section: "resources",
    blurb: "Inventory resources — names, icons, descriptions, colors, sale value, and the next-tier upgrade target for every resource." },
  { id: "recipes",   label: "Recipes",        iconKey: "ui_star", Component: RecipesTab,
    section: "items",
    blurb: "Crafted items (and tools): ingredients, station, coin reward, and description." },
  { id: "buildings", label: "Buildings",      iconKey: "ui_star", Component: BuildingsTab,
    section: "items",
    blurb: "Town building costs and unlock levels." },
  { id: "rations",   label: "Expedition Rations", iconKey: "ui_star", Component: RationsTab,
    section: "items",
    blurb: "Food values for supply-structured mine/harbor expeditions: how many turns each ration is worth, and which foods count as 'meat' for the Smokehouse +1 modifier." },
  { id: "workers",   label: "Workers",        iconKey: "ui_devtools", Component: WorkersTab,
    section: "other",
    blurb: "Type-tier worker hire costs (flat / linear / geometric ramp), max count, and effect parameters." },
  { id: "tuning",    label: "Tuning",         iconKey: "ui_devtools", Component: TuningTab,
    section: "other",
    blurb: "Loose top-level constants: round length, audit-boss cooldown, craft-queue timer + gem-skip cost, expedition floor, settlement founding cost ramp, and the home biome." },
  { id: "bosses",    label: "Bosses",         iconKey: "ui_star", Component: BossesTab,
    section: "other",
    blurb: "Seasonal bosses: name, season, the target resource amount to clear, and the flavour / modifier descriptions. (Modifier types and params drive board logic and aren't editable here.)" },
  { id: "achievements", label: "Achievements", iconKey: "ui_star", Component: AchievementsTab,
    section: "other",
    blurb: "Achievement names, descriptions, the count threshold to unlock, and the coin reward. (Which counter each one watches isn't editable here.)" },
  { id: "dailyRewards", label: "Daily Rewards", iconKey: "ui_star", Component: DailyRewardsTab,
    section: "other",
    blurb: "The 30-day login reward track: tune the coin / rune amounts per day. (Tool and tile-unlock drops aren't editable here.)" },
  { id: "story",     label: "Story · Dialogue", iconKey: "ui_star", Component: StoryTab,
    section: "story",
    blurb: "Story beats and side-events: titles, scenes, the narration/dialogue lines, and choice labels. (Triggers and outcomes are not editable here.)" },
  { id: "npcs",      label: "NPCs",           iconKey: "ui_star", Component: NpcsTab,
    section: "story",
    blurb: "Townsfolk gift preferences (loves / likes — the items that raise their bond fastest) and the four bond bands (name + the order-reward modifier at that band)." },
  { id: "keepers",   label: "Keepers",        iconKey: "ui_star", Component: KeepersTab,
    section: "story",
    blurb: "The biome keepers (Deer-Spirit / Stone-Knocker / Tidesinger): names, the building threshold at which they appear, and the Coexist / Drive Out dialogue + rewards." },
  { id: "icons",     label: "Icons",          iconKey: "ui_star", Component: IconsTab,
    section: "other",
    blurb: "Browse every procedurally-drawn icon in ICON_REGISTRY. Filter by category, search by key or label, and click to copy the key." },
  { id: "export",    label: "Export · Import",iconKey: "ui_star", Component: ExportTab,
    section: "other",
    blurb: "Save your draft, download as JSON to commit, or paste a config to import." },
];

const SECTIONS = [
  { id: "tiles",     label: "Tiles" },
  { id: "resources", label: "Resources" },
  { id: "items",     label: "Items" },
  { id: "story",     label: "Story" },
  { id: "other",     label: "Other" },
];

function emptyDraft() {
  return {
    version: 1,
    upgradeThresholds: {},
    resources: {},
    recipes: {},
    buildings: {},
    tilePowers: {},
    tileUnlocks: {},
    tileDescriptions: {},
    // Phase 6 — Zones tab patches per-zone fields.
    zones: {},
    // Phase 6 — Workers tab patches per-id TYPE_WORKERS entries.
    workers: {},
    // Phase 6 — Keepers tab patches per-type KEEPERS entries.
    keepers: {},
    // Phase 6 — Expedition Rations / Settlement Biomes / Tuning / NPCs / Story tabs.
    expedition: {},
    biomes: {},
    tuning: {},
    npcs: {},
    story: {},
    // Phase 6 — Bosses / Achievements / Daily Rewards tabs.
    bosses: {},
    achievements: {},
    dailyRewards: {},
  };
}

function cloneDraft(d) {
  if (!d) return emptyDraft();
  const base = emptyDraft();
  for (const k of Object.keys(base)) {
    if (k === "version") base[k] = d[k] ?? 1;
    else if (d[k] && typeof d[k] === "object") base[k] = JSON.parse(JSON.stringify(d[k]));
  }
  return base;
}

const SIDEBAR_COLLAPSED_KEY = "hearth.balance.sidebarCollapsed";

function readSidebarCollapsed() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch { return false; }
}

function writeSidebarCollapsed(v) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? "1" : "0");
  } catch { /* storage unavailable */ }
}

export default function BalanceManagerApp() {
  const tabIds = useMemo(() => TABS.map((t) => t.id), []);
  const [tab, setTab] = useState(() => parseHash(typeof window !== "undefined" ? window.location.hash : "", tabIds).tab ?? "tiles");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  // Bind the active tab to the URL hash. On mount this normalises the hash
  // (e.g. empty → `#/tiles`); subsequent `setTab` calls push history entries,
  // and back/forward / `hashchange` events rebind the tab.
  useBalanceRouter(tab, setTab, tabIds);

  const navigateTo = useCallback((nextTab) => {
    setTab(nextTab);
  }, []);
  // Initialise the draft from whatever the constants module merged in:
  // committed file + previous localStorage draft. That way, opening the
  // manager always shows the user's full set of overrides as starting point.
  const [draft, setDraft] = useState(() => cloneDraft(BALANCE_OVERRIDES));
  const [savedNotice, setSavedNotice] = useState("");

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  const updateDraft = useCallback((updater) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      updater(next);
      return next;
    });
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(BALANCE_OVERRIDES);
  }, [draft]);

  const saveDraft = useCallback(() => {
    writeBalanceDraft(draft);
    setSavedNotice("Draft saved · reload to apply");
    setTimeout(() => setSavedNotice(""), 2400);
  }, [draft]);

  const resetToCommitted = useCallback(() => {
    if (!confirm("Reset to the committed balance.json? Your unsaved edits will be lost.")) return;
    setDraft(cloneDraft(balanceFile));
  }, []);

  const clearAllOverrides = useCallback(() => {
    if (!confirm("Clear EVERY override? The game will revert to its default constants on next reload.")) return;
    setDraft(emptyDraft());
  }, []);

  // Save on Cmd/Ctrl-S so designers can iterate quickly.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft]);

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveComponent = activeTab.Component;

  return (
    <div
      className="fixed inset-0 grid place-items-stretch"
      style={{ background: COLORS.parchmentDeep }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          background: COLORS.parchment,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{
            background: `linear-gradient(180deg, ${COLORS.parchmentDeep} 0%, ${COLORS.parchment} 100%)`,
            borderBottom: `3px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[24px]">⚖️</span>
            <div>
              <div className="text-[18px] font-bold leading-tight" style={{ color: COLORS.ember }}>
                Balance Manager
              </div>
              <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                Tune game constants · attach power hooks · export config
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ background: COLORS.green, color: "#fff" }}>
                {savedNotice}
              </span>
            )}
            {isDirty && !savedNotice && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-md animate-pulse" style={{ background: COLORS.ember, color: "#fff" }}>
                Unsaved changes
              </span>
            )}
            <button
              onClick={saveDraft}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2"
              style={{ background: COLORS.green, borderColor: COLORS.greenDeep, color: "#fff" }}
              title="Save Draft (Cmd/Ctrl-S). Applied on next reload."
            >
              💾 Save Draft
            </button>
            <button
              onClick={() => location.reload()}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2"
              style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
              title="Reload the page to apply the saved draft."
            >
              ↻ Reload
            </button>
            <a
              href={import.meta.env.BASE_URL}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2 no-underline"
              style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
              title="Return to the game"
            >
              ← Back to Game
            </a>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar tabs (collapsible) */}
          <nav
            className="flex flex-col gap-1 p-3 flex-shrink-0 overflow-y-auto transition-[width] duration-200 relative"
            style={{
              width: sidebarCollapsed ? 56 : 200,
              background: COLORS.parchmentDeep,
              borderRight: `2px solid ${COLORS.border}`,
            }}
          >
            <button
              onClick={toggleSidebar}
              className="self-end mb-1 w-7 h-7 grid place-items-center text-[14px] font-bold rounded-md border-2"
              style={{ background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
            {SECTIONS.map((sec) => {
              const sectionTabs = TABS.filter((t) => t.section === sec.id);
              if (sectionTabs.length === 0) return null;
              return (
                <div key={sec.id} className="flex flex-col gap-1">
                  {!sidebarCollapsed && (
                    <div
                      className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {sec.label}
                    </div>
                  )}
                  {sidebarCollapsed && (
                    <div
                      className="mx-2 my-1 h-px"
                      style={{ background: COLORS.border, opacity: 0.4 }}
                    />
                  )}
                  {sectionTabs.map((t) => {
                    const active = t.id === tab;
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigateTo(t.id)}
                        className="text-left px-3 py-2 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-2"
                        style={
                          active
                            ? { background: COLORS.ember, color: "#fff" }
                            : { background: "transparent", color: COLORS.inkLight }
                        }
                        title={sidebarCollapsed ? t.label : undefined}
                        aria-label={t.label}
                      >
                        <span className="text-[15px]">{t.icon}</span>
                        {!sidebarCollapsed && <span className="flex-1">{t.label}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
              <button
                onClick={resetToCommitted}
                className="w-full px-2 py-1.5 text-[10px] font-bold rounded-md border-2 mb-1"
                style={{ background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }}
                title="Discard local edits and reload from balance.json"
                aria-label="Reset to committed balance.json"
              >
                {sidebarCollapsed ? "↺" : "↺ Reset to Committed"}
              </button>
              <button
                onClick={clearAllOverrides}
                className="w-full px-2 py-1.5 text-[10px] font-bold rounded-md border-2"
                style={{ background: COLORS.red, borderColor: COLORS.redDeep, color: "#fff" }}
                title="Wipe every override — restores raw defaults"
                aria-label="Clear all overrides"
              >
                {sidebarCollapsed ? "✕" : "✕ Clear All Overrides"}
              </button>
            </div>
          </nav>

          {/* Active tab content */}
          <main className="flex-1 flex flex-col min-w-0">
            <div
              className="px-5 py-2 text-[11px] italic flex-shrink-0"
              style={{ color: COLORS.inkSubtle, background: COLORS.parchment, borderBottom: `1px solid ${COLORS.border}` }}
            >
              {activeTab.blurb}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Suspense fallback={
                <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
                  Loading {activeTab.label}…
                </div>
              }>
                <ActiveComponent draft={draft} updateDraft={updateDraft} />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
