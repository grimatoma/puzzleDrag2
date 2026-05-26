// Dev Panel — standalone console for editing tile chains, resources,
// recipes, building costs and tile power hooks. Served from its own page at
// `/b/` (separate Vite entry, see `b/index.html`). Edits are kept in a draft
// object stored in localStorage (`hearth.balance.draft`) and applied to the
// game's constants on next page load. The full draft can be exported as
// JSON for committing to `src/config/balance.json`.
//
// Because both the game and this app share an origin, localStorage drafts
// written here are picked up by the game on its next load.

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from "react";
import { BALANCE_OVERRIDES } from "../constants.js";
import { writeBalanceDraft } from "../config/applyOverrides.js";
import balanceFile from "../config/balance.json";
import Icon from "../ui/Icon.jsx";
import { COLORS } from "./shared.jsx";
import { parseHash, useBalanceRouter } from "./router.js";
import { useDraftHistory } from "./useDraftHistory.js";
import CommandPalette from "./CommandPalette.jsx";
import { BalanceNavProvider } from "./balanceNav.jsx";
import type { CommandEntry } from "./commandPalette.js";

// The shape of the editable balance draft. All section fields are dictionaries
// of overrides keyed by id. Casting through Partial reflects that any section
// can hold arbitrary override shapes (different tabs target different leaves).
export interface BalanceDraft {
  version: number;
  upgradeThresholds: Record<string, unknown>;
  items: Record<string, unknown>;
  recipes: Record<string, unknown>;
  buildings: Record<string, unknown>;
  tilePowers: Record<string, unknown>;
  tileUnlocks: Record<string, unknown>;
  tileDescriptions: Record<string, unknown>;
  zones: Record<string, unknown>;
  workers: Record<string, unknown>;
  keepers: Record<string, unknown>;
  expedition: Record<string, unknown>;
  biomes: Record<string, unknown>;
  tuning: Record<string, unknown>;
  npcs: Record<string, unknown>;
  story: Record<string, unknown>;
  flags: Record<string, unknown>;
  bosses: Record<string, unknown>;
  achievements: Record<string, unknown>;
  dailyRewards: Record<string, unknown>;
}

// Props passed to every lazy tab. Individual tabs destructure only the fields
// they need (e.g. RationsTab ignores focus); typing them uniformly lets us
// render <ActiveComponent {...props}/> against a heterogeneous union without
// fighting every overload.
export interface TabProps {
  draft: BalanceDraft;
  updateDraft: (updater: (draft: BalanceDraft) => void) => void;
  focus?: string | null;
}

type TabComponent = React.ComponentType<TabProps>;

// Lazy-load tabs so the Dev Panel (a dev-time tool) stays out of the
// main entry chunk. Each tab becomes its own JS chunk fetched only when
// the user opens the modal and selects that tab.
const ItemsTab = lazy(() => import("./tabs/ItemsTab.jsx")) as unknown as TabComponent;
const RecipesTab   = lazy(() => import("./tabs/RecipesTab.jsx")) as unknown as TabComponent;
const BuildingsTab = lazy(() => import("./tabs/BuildingsTab.jsx")) as unknown as TabComponent;
const PowersTab    = lazy(() => import("./tabs/PowersTab.jsx")) as unknown as TabComponent;
const ZonesTab     = lazy(() => import("./tabs/ZonesTab.jsx")) as unknown as TabComponent;
const BiomesTab    = lazy(() => import("./tabs/BiomesTab.jsx")) as unknown as TabComponent;
const WorkersTab   = lazy(() => import("./tabs/WorkersTab.jsx")) as unknown as TabComponent;
const KeepersTab   = lazy(() => import("./tabs/KeepersTab.jsx")) as unknown as TabComponent;
const BoonsTab     = lazy(() => import("./tabs/BoonsTab.jsx")) as unknown as TabComponent;
const NpcsTab      = lazy(() => import("./tabs/NpcsTab.jsx")) as unknown as TabComponent;
const StoryTab     = lazy(() => import("./tabs/StoryTab.jsx")) as unknown as TabComponent;
const FlagsTab     = lazy(() => import("./tabs/FlagsTab.jsx")) as unknown as TabComponent;
const RationsTab   = lazy(() => import("./tabs/RationsTab.jsx")) as unknown as TabComponent;
const TuningTab    = lazy(() => import("./tabs/TuningTab.jsx")) as unknown as TabComponent;
const BossesTab    = lazy(() => import("./tabs/BossesTab.jsx")) as unknown as TabComponent;
const AchievementsTab = lazy(() => import("./tabs/AchievementsTab.jsx")) as unknown as TabComponent;
const DailyRewardsTab = lazy(() => import("./tabs/DailyRewardsTab.jsx")) as unknown as TabComponent;
const ExportTab    = lazy(() => import("./tabs/ExportTab.jsx")) as unknown as TabComponent;
const IconsTab     = lazy(() => import("./tabs/IconsTab.jsx")) as unknown as TabComponent;
const AbilitiesReferenceTab = lazy(() => import("./tabs/AbilitiesReferenceTab.jsx")) as unknown as TabComponent;
const ToolPowersReferenceTab = lazy(() => import("./tabs/ToolPowersReferenceTab.jsx")) as unknown as TabComponent;
const TileDiscoveryReferenceTab = lazy(() => import("./tabs/TileDiscoveryReferenceTab.jsx")) as unknown as TabComponent;
const WikiTab = lazy(() => import("./tabs/WikiTab.jsx")) as unknown as TabComponent;
const AnimationsDemoTab = lazy(() => import("./tabs/AnimationsDemoTab.jsx")) as unknown as TabComponent;

// Hash routing for the Dev Panel lives in `./router.js` — kept separate
// from `src/router.js` because the Dev Panel is its own page (`/b/`).
//
// The game's object model separates Tiles from inventory entries. Inventory
// entries (resources + items + tools) are unified under Items.
const TABS = [
  // Reference — scan the full catalog before editing
  { id: "wiki", label: "Concepts", iconKey: "ui_star", Component: WikiTab,
    section: "reference",
    blurb: "Read-only catalog of every game concept — tiles, resources, tools, zones, hazards, recipes, attributes, and more. One filter per concept; entries pull live from source files." },

  // Board — pieces, places, founding context
  { id: "tiles", label: "Tiles", iconKey: "ui_star", Component: PowersTab,
    section: "board",
    blurb: "Board pieces: label, colour, sale value, chain target, discovery method, produced resource, and attached power hooks." },
  { id: "zones", label: "Zones", iconKey: "ui_star", Component: ZonesTab,
    section: "board",
    blurb: "Per-zone settings: base turns, entry cost, chain-upgrade map, and per-(zone, season) tile drop weights." },
  { id: "biomes", label: "Settlement biomes", iconKey: "ui_star", Component: BiomesTab,
    section: "board", dormant: true,
    blurb: "Founding biomes (four per settlement type): name, icon, round hazards, and resource bonus." },

  // Economy — inventory through town and expeditions
  { id: "items", label: "Inventory", iconKey: "ui_star", Component: ItemsTab,
    section: "economy",
    blurb: "Resources, tools, and plain items in one editor. Filter by kind; kind and biome tags stay on each card." },
  { id: "recipes", label: "Recipes", iconKey: "ui_star", Component: RecipesTab,
    section: "economy",
    blurb: "Crafted goods and tools: ingredients, station, coin reward, and description." },
  { id: "buildings", label: "Buildings", iconKey: "ui_star", Component: BuildingsTab,
    section: "economy",
    blurb: "Town building costs and unlock levels." },
  { id: "rations", label: "Expedition rations", iconKey: "ui_star", Component: RationsTab,
    section: "economy", dormant: true,
    blurb: "Mine/harbor expedition food: turn value per ration and which foods count as meat for the Smokehouse +1." },

  // World — narrative and characters
  { id: "flags", label: "Story flags", iconKey: "ui_devtools", Component: FlagsTab,
    section: "world", dormant: true,
    blurb: "Story flags: create custom flags, override metadata and triggers, see readers/writers, catch orphans." },
  { id: "story", label: "Story beats", iconKey: "ui_star", Component: StoryTab,
    section: "world",
    blurb: "Beat editing lives in the Story Tree Editor at /story/ (pan/zoom canvas, branches, inspector). Same draft — overrides apply on reload." },
  { id: "npcs", label: "NPCs", iconKey: "ui_star", Component: NpcsTab,
    section: "world",
    blurb: "Townsfolk gift preferences (loves / likes) and bond bands (name + order-reward modifier)." },
  { id: "workers", label: "Workers", iconKey: "ui_devtools", Component: WorkersTab,
    section: "world",
    blurb: "Worker hire costs (flat / linear / geometric), max count per type, and effect parameters." },
  { id: "keepers", label: "Keepers", iconKey: "ui_star", Component: KeepersTab,
    section: "world", dormant: true,
    blurb: "Biome keepers: names, building threshold, Coexist / Drive Out dialogue and rewards." },
  { id: "boons", label: "Boons", iconKey: "ui_star", Component: BoonsTab,
    section: "world", dormant: true,
    blurb: "Keeper-path zone boons (Embers or Core Ingots). Read-only catalog for now." },

  // Systems — passive/active catalogs (editable reference)
  { id: "abilities", label: "Attributes", iconKey: "ui_star", Component: AbilitiesReferenceTab,
    section: "systems",
    blurb: "Passive attribute definitions: name, description, params, trigger/channel behavior. Contrast with tool powers (active, on spend)." },
  { id: "toolPowers", label: "Tool powers", iconKey: "rake", Component: ToolPowersReferenceTab,
    section: "systems",
    blurb: "Active tool effects: params plus default board anim/ms (tools override per item on Inventory)." },
  { id: "tileDiscoveryMethods", label: "Tile discovery", iconKey: "ui_star", Component: TileDiscoveryReferenceTab,
    section: "systems",
    blurb: "How tiles unlock: default, chain, research, buy, daily reward — each method's params and which tiles use it." },

  // Dev — previews and asset lookup
  { id: "icons", label: "Icons", iconKey: "ui_star", Component: IconsTab,
    section: "dev",
    blurb: "Every procedurally drawn icon in ICON_REGISTRY. Filter, search, click to copy the key." },
  { id: "animationsDemo", label: "Board animations", iconKey: "ui_star", Component: AnimationsDemoTab,
    section: "dev",
    blurb: "Preview named board animations on a live board. Source: src/config/boardAnimations.js." },

  // Run — per-run and meta progression (mostly stub tabs; hidden by default)
  { id: "tuning", label: "Global tuning", iconKey: "ui_devtools", Component: TuningTab,
    section: "run", dormant: true,
    blurb: "Top-level constants: round length, audit-boss cooldown, craft-queue timer and gem skip, expedition floor, settlement founding ramp, home biome." },
  { id: "bosses", label: "Bosses", iconKey: "ui_star", Component: BossesTab,
    section: "run", dormant: true,
    blurb: "Seasonal bosses: name, season, clear target, flavour text. Modifier types and params are board logic (not editable here)." },
  { id: "achievements", label: "Achievements", iconKey: "ui_star", Component: AchievementsTab,
    section: "run", dormant: true,
    blurb: "Achievement names, descriptions, unlock threshold, and coin reward. Counter wiring is not editable here." },
  { id: "dailyRewards", label: "Daily rewards", iconKey: "ui_star", Component: DailyRewardsTab,
    section: "run", dormant: true,
    blurb: "30-day login track: coin and rune amounts per day. Tool and tile-unlock drops are not editable here." },

  // Workflow — draft I/O
  { id: "export", label: "Export & import", iconKey: "ui_star", Component: ExportTab,
    section: "workflow",
    blurb: "Save draft, download JSON to commit, or paste a config to import." },
];

const SECTIONS = [
  { id: "reference", label: "Reference" },
  { id: "board", label: "Board" },
  { id: "economy", label: "Economy" },
  { id: "world", label: "World" },
  { id: "systems", label: "Systems" },
  { id: "dev", label: "Dev" },
  { id: "workflow", label: "Workflow" },
  { id: "run", label: "Run" },
];

function tabNavStyle(active: boolean, dormant: boolean): React.CSSProperties {
  if (active) {
    return dormant
      ? { background: "#c45c4a", color: "#fff", border: `1px solid ${COLORS.redDeep}` }
      : { background: COLORS.ember, color: "#fff" };
  }
  if (dormant) {
    return { background: "rgba(194, 59, 34, 0.14)", color: COLORS.redDeep };
  }
  return { background: "transparent", color: COLORS.inkLight };
}

function emptyDraft(): BalanceDraft {
  return {
    version: 1,
    upgradeThresholds: {},
    items: {},
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
    flags: {},
    // Phase 6 — Bosses / Achievements / Daily Rewards tabs.
    bosses: {},
    achievements: {},
    dailyRewards: {},
  };
}

function cloneDraft(d: Partial<BalanceDraft> | null | undefined): BalanceDraft {
  if (!d) return emptyDraft();
  const base = emptyDraft() as unknown as Record<string, unknown>;
  const src = d as Record<string, unknown>;
  for (const k of Object.keys(base)) {
    if (k === "version") {
      const v = src[k];
      base[k] = typeof v === "number" ? v : 1;
    } else if (src[k] && typeof src[k] === "object") {
      base[k] = JSON.parse(JSON.stringify(src[k]));
    }
  }
  return base as unknown as BalanceDraft;
}

const SIDEBAR_COLLAPSED_KEY = "hearth.balance.sidebarCollapsed";
const SIDEBAR_DORMANT_KEY = "hearth.balance.sidebarDormantTabs";

function readSidebarCollapsed() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch { return false; }
}

function writeSidebarCollapsed(v: boolean) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? "1" : "0");
  } catch { /* storage unavailable */ }
}

function readShowDormantTabs() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_DORMANT_KEY) === "1";
  } catch { return false; }
}

function writeShowDormantTabs(v: boolean) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SIDEBAR_DORMANT_KEY, v ? "1" : "0");
  } catch { /* storage unavailable */ }
}

// Below this width, the sidebar becomes an overlay toggled by a hamburger
// button in the header instead of a permanent column.
const SMALL_SCREEN_QUERY = "(max-width: 768px)";

function useIsSmallScreen() {
  const [small, setSmall] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(SMALL_SCREEN_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(SMALL_SCREEN_QUERY);
    const update = () => setSmall(mq.matches);
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return small;
}

export default function BalanceManagerApp() {
  const tabIds = useMemo(() => TABS.map((t) => t.id), []);
  const initialRoute = parseHash(typeof window !== "undefined" ? window.location.hash : "", tabIds);
  const [tab, setTab] = useState(() => initialRoute.tab ?? "wiki");
  const [focus, setFocus] = useState(() => initialRoute.focus ?? null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [showDormantTabs, setShowDormantTabs] = useState(readShowDormantTabs);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isSmallScreen = useIsSmallScreen();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // The overlay is only meaningful on small screens; ignore the toggle on desktop.
  const overlayOpen = isSmallScreen && mobileNavOpen;

  // Bind the active tab to the URL hash. On mount this normalises the hash
  // (e.g. empty → `#/wiki`); subsequent `setTab` calls push history entries,
  // and back/forward / `hashchange` events rebind the tab.
  useBalanceRouter(tab, setTab, focus, setFocus, tabIds);

  const navigateTo = useCallback((nextTab: string, nextFocus: string | null = null) => {
    setTab(nextTab);
    setFocus(nextFocus);
    setMobileNavOpen(false);
  }, []);

  const navigate = useCallback(({ tab: nextTab, focus: nextFocus = null }: { tab: string; focus?: string | null }) => {
    navigateTo(nextTab, nextFocus);
  }, [navigateTo]);
  // Initialise the draft from whatever the constants module merged in:
  // committed file + previous localStorage draft. That way, opening the
  // manager always shows the user's full set of overrides as starting point.
  const {
    state: draft, setState: setDraft, undo, redo, reset: resetDraft,
    canUndo, canRedo,
  } = useDraftHistory(() => cloneDraft(BALANCE_OVERRIDES));
  const [savedNotice, setSavedNotice] = useState("");

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  const toggleDormantTabs = useCallback(() => {
    setShowDormantTabs((v) => {
      const next = !v;
      writeShowDormantTabs(next);
      return next;
    });
  }, []);

  const updateDraft = useCallback((updater: (draft: BalanceDraft) => void) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      updater(next);
      return next;
    });
  }, [setDraft]);

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
    resetDraft(cloneDraft(balanceFile));
  }, [resetDraft]);

  const clearAllOverrides = useCallback(() => {
    if (!confirm("Clear EVERY override? The game will revert to its default constants on next reload.")) return;
    resetDraft(emptyDraft());
  }, [resetDraft]);

  // Save on Cmd/Ctrl-S, undo/redo on Cmd/Ctrl-Z, command palette on Cmd/Ctrl-K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") { e.preventDefault(); saveDraft(); return; }
      if (key === "k") { e.preventDefault(); setPaletteOpen((v) => !v); return; }
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo(); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft, undo, redo]);

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveComponent = activeTab.Component;
  // On small screens the sidebar renders as an overlay and is always
  // shown in its "expanded" form (labels + section headers).
  const effectiveCollapsed = !isSmallScreen && sidebarCollapsed;

  const handlePaletteSelect = useCallback((entry: CommandEntry | null | undefined) => {
    if (entry?.tab) navigateTo(entry.tab, entry.id ?? null);
  }, [navigateTo]);

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
            {isSmallScreen && (
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                className="grid place-items-center w-9 h-9 rounded-md border-2 text-[18px] font-bold"
                style={{ background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }}
                title={overlayOpen ? "Close navigation" : "Open navigation"}
                aria-label={overlayOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={overlayOpen}
                aria-controls="balance-mobile-nav"
              >
                ☰
              </button>
            )}
            <span className="text-[24px]">🛠</span>
            <div>
              <div className="text-[18px] font-bold leading-tight" style={{ color: COLORS.ember }}>
                Dev Panel
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
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-bold rounded-lg border-2"
              style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
              title="Search across every tab (Cmd/Ctrl-K)"
              aria-label="Open command palette"
            >
              🔎 Search
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: COLORS.parchment, color: COLORS.inkSubtle, border: `1px solid ${COLORS.border}` }}>⌘K</span>
            </button>
            <div className="flex items-center rounded-lg border-2 overflow-hidden" style={{ borderColor: COLORS.border }}>
              <button
                onClick={() => undo()}
                disabled={!canUndo}
                title="Undo (Cmd/Ctrl-Z)"
                aria-label="Undo last change"
                className="px-2 py-1.5 text-[12px] font-bold transition-opacity"
                style={{ background: COLORS.parchmentDeep, color: canUndo ? COLORS.inkLight : COLORS.inkSubtle, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "not-allowed" }}
              >
                ↶
              </button>
              <span aria-hidden style={{ width: 1, alignSelf: "stretch", background: COLORS.border }} />
              <button
                onClick={() => redo()}
                disabled={!canRedo}
                title="Redo (Cmd/Ctrl-Shift-Z)"
                aria-label="Redo last undone change"
                className="px-2 py-1.5 text-[12px] font-bold transition-opacity"
                style={{ background: COLORS.parchmentDeep, color: canRedo ? COLORS.inkLight : COLORS.inkSubtle, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "not-allowed" }}
              >
                ↷
              </button>
            </div>
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

        <div className="flex flex-1 min-h-0 relative">
          {/* Backdrop for mobile overlay nav. */}
          {overlayOpen && (
            <div
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
              className="absolute inset-0 z-10"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
          )}
          {/* Sidebar tabs — inline column on desktop, fixed overlay on small screens. */}
          <nav
            id="balance-mobile-nav"
            className="flex flex-col gap-1 p-3 flex-shrink-0 overflow-y-auto transition-transform duration-200"
            style={
              isSmallScreen
                ? {
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 240,
                    background: COLORS.parchmentDeep,
                    borderRight: `2px solid ${COLORS.border}`,
                    transform: overlayOpen ? "translateX(0)" : "translateX(-100%)",
                    zIndex: 20,
                    boxShadow: overlayOpen ? "2px 0 12px rgba(0,0,0,0.25)" : "none",
                  }
                : {
                    width: effectiveCollapsed ? 56 : 200,
                    background: COLORS.parchmentDeep,
                    borderRight: `2px solid ${COLORS.border}`,
                    position: "relative",
                    transition: "width 200ms",
                  }
            }
            aria-hidden={isSmallScreen && !overlayOpen}
          >
            <div className="self-end mb-1 flex gap-1">
              <button
                onClick={toggleDormantTabs}
                className="w-7 h-7 grid place-items-center text-[11px] font-bold rounded-md border-2"
                style={{
                  background: showDormantTabs ? "rgba(194, 59, 34, 0.2)" : COLORS.parchment,
                  borderColor: showDormantTabs ? COLORS.red : COLORS.border,
                  color: showDormantTabs ? COLORS.redDeep : COLORS.inkLight,
                }}
                title={showDormantTabs ? "Hide unused tabs" : "Show unused tabs"}
                aria-label={showDormantTabs ? "Hide unused tabs" : "Show unused tabs"}
                aria-pressed={showDormantTabs}
              >
                {effectiveCollapsed ? "⊡" : "···"}
              </button>
              <button
                onClick={isSmallScreen ? () => setMobileNavOpen(false) : toggleSidebar}
                className="w-7 h-7 grid place-items-center text-[14px] font-bold rounded-md border-2"
                style={{ background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }}
                title={isSmallScreen ? "Close navigation" : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
                aria-label={isSmallScreen ? "Close navigation" : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
                aria-expanded={isSmallScreen ? overlayOpen : !sidebarCollapsed}
              >
                {isSmallScreen ? "✕" : (sidebarCollapsed ? "»" : "«")}
              </button>
            </div>
            {SECTIONS.map((sec) => {
              const sectionTabs = TABS.filter((t) => t.section === sec.id && (showDormantTabs || !t.dormant));
              if (sectionTabs.length === 0) return null;
              return (
                <div key={sec.id} className="flex flex-col gap-1">
                  {!effectiveCollapsed && (
                    <div
                      className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {sec.label}
                    </div>
                  )}
                  {effectiveCollapsed && (
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
                        style={tabNavStyle(active, !!t.dormant)}
                        title={effectiveCollapsed ? t.label : undefined}
                        aria-label={t.label}
                      >
                        <Icon iconKey={t.iconKey} size={16} title="" />
                        {!effectiveCollapsed && <span className="flex-1">{t.label}</span>}
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
                {effectiveCollapsed ? "↺" : "↺ Reset to Committed"}
              </button>
              <button
                onClick={clearAllOverrides}
                className="w-full px-2 py-1.5 text-[10px] font-bold rounded-md border-2"
                style={{ background: COLORS.red, borderColor: COLORS.redDeep, color: "#fff" }}
                title="Wipe every override — restores raw defaults"
                aria-label="Clear all overrides"
              >
                {effectiveCollapsed ? "✕" : "✕ Clear All Overrides"}
              </button>
            </div>
          </nav>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={handlePaletteSelect} />

          {/* Active tab content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
                <BalanceNavProvider focus={focus} navigate={navigate}>
                  <ActiveComponent draft={draft} updateDraft={updateDraft} focus={focus} />
                </BalanceNavProvider>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
