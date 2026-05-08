// Balance Manager — central console for editing tile chains, resources,
// recipes, building costs and tile power hooks. Edits are kept in a draft
// object stored in localStorage (`hearth.balance.draft`) and applied to the
// game's constants on next page load. The full draft can be exported as
// JSON for committing to `src/config/balance.json`.

import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from "react";
import { BALANCE_OVERRIDES } from "../../constants.js";
import { writeBalanceDraft } from "../../config/applyOverrides.js";
import balanceFile from "../../config/balance.json";
import { COLORS } from "./shared.jsx";

// Lazy-load tabs so the Balance Manager (a dev-time tool) stays out of the
// main entry chunk. Each tab becomes its own JS chunk fetched only when
// the user opens the modal and selects that tab.
const ResourcesTab = lazy(() => import("./tabs/ResourcesTab.jsx"));
const ChainsTab    = lazy(() => import("./tabs/ChainsTab.jsx"));
const RecipesTab   = lazy(() => import("./tabs/RecipesTab.jsx"));
const BuildingsTab = lazy(() => import("./tabs/BuildingsTab.jsx"));
const PowersTab    = lazy(() => import("./tabs/PowersTab.jsx"));
const UnlocksTab   = lazy(() => import("./tabs/UnlocksTab.jsx"));
const ExportTab    = lazy(() => import("./tabs/ExportTab.jsx"));

export const modalKey = "balanceManager";

const TABS = [
  { id: "resources", label: "Resources",      icon: "📦", Component: ResourcesTab,
    blurb: "Names, icons, descriptions, colors, sale value, and the next-tier upgrade target for every resource." },
  { id: "chains",    label: "Upgrade Chains", icon: "🔗", Component: ChainsTab,
    blurb: "How many of each tile must be chained to unlock its upgrade. Adjust pacing without renaming things." },
  { id: "recipes",   label: "Recipes",        icon: "🍳", Component: RecipesTab,
    blurb: "Crafting recipes: ingredients, station, coin reward, and description." },
  { id: "buildings", label: "Buildings",      icon: "🏛", Component: BuildingsTab,
    blurb: "Town building costs and unlock levels." },
  { id: "powers",    label: "Tile Powers",    icon: "⚡", Component: PowersTab,
    blurb: "Attach predefined power hooks (free moves, coin bonuses, spawn boosts…) to any tile type." },
  { id: "unlocks",   label: "Unlock Hooks",   icon: "🔓", Component: UnlocksTab,
    blurb: "How each tile is discovered: default, chain length, research grind, or coin purchase." },
  { id: "export",    label: "Export · Import",icon: "📤", Component: ExportTab,
    blurb: "Save your draft, download as JSON to commit, or paste a config to import." },
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

export default function BalanceManagerModal({ state, dispatch }) {
  const isOpen = state.modal === modalKey;
  const [tab, setTab] = useState("resources");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
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
    if (!isOpen) return undefined;
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft, isOpen]);

  if (!isOpen) return null;

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveComponent = activeTab.Component;

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: "rgba(0,0,0,0.62)", zIndex: 80 }}
    >
      <div
        className="relative flex flex-col rounded-[20px] shadow-2xl overflow-hidden"
        style={{
          background: COLORS.parchment,
          border: `4px solid ${COLORS.border}`,
          width: "min(1100px, 96vw)",
          height: "min(820px, 92vh)",
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
            <button
              onClick={() => dispatch({ type: "CLOSE_MODAL" })}
              className="w-8 h-8 grid place-items-center text-[18px] font-bold rounded-lg border-2"
              style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
              aria-label="Close"
            >
              ×
            </button>
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
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
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
