// WikiShell — the player-facing wiki shell for the `/b/` entry.
//
// Collapses the old Dev Panel's 21-tab editor shell into a single article
// namespace: a Wikipedia-style sidebar (concept sections + narrative pages +
// dev utilities), a header with Cmd-K search and a back-to-game link, and a
// main pane that switches on (tab, focus) between category pages, entity
// articles, narrative pages, and the two surviving developer utility tabs.
//
// Navigation lives in the Dev Panel hash router (`../router.js`); the IA lives
// in `./wikiNav.js` + `./concepts.js`. All cross-link routing flows through
// `wikiNavTarget` so each concept owns its own tab.

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { BALANCE_OVERRIDES } from "../../constants.js";
import Icon from "../../ui/Icon.jsx";
import { COLORS } from "../shared.jsx";
import { parseHash, useBalanceRouter } from "../router.js";
import CommandPalette from "../CommandPalette.jsx";
import { BalanceNavProvider } from "../balanceNav.jsx";
import type { CommandEntry } from "../commandPalette.js";
import type { BalanceDraft, TabProps } from "../tabProps.js";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, UTILITIES } from "./wikiNav.js";
import { parseWikiFocus } from "./conceptEntities.js";
import { wikiNavTarget } from "./WikiLinkButton.jsx";

type TabComponent = React.ComponentType<TabProps>;

// Lazy-load the heavy article/category/narrative renderers and the two
// surviving developer utility tabs so they stay out of the shell chunk.
const WikiArticle = lazy(() => import("./WikiArticle.jsx"));
const CategoryPageLazy = lazy(() =>
  import("./CategoryPage.jsx").then((m) => ({ default: m.CategoryPage })),
);
const NarrativePageLazy = lazy(() =>
  import("./NarrativePage.jsx").then((m) => ({ default: m.NarrativePage })),
);
const IconsTab = lazy(() => import("../tabs/IconsTab.jsx")) as unknown as TabComponent;
const AnimationsDemoTab = lazy(() => import("../tabs/AnimationsDemoTab.jsx")) as unknown as TabComponent;

// Concept id → human label, for sidebar links.
const CONCEPT_LABELS: Record<string, string> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c.label]),
);

// Valid hash tabs: every concept id, the narrative-page namespace `page`, and
// each developer utility id. The router only honours these.
const VALID_TABS: string[] = [
  ...CONCEPTS.map((c) => c.id),
  "page",
  ...UTILITIES.map((u) => u.id),
];

const SIDEBAR_COLLAPSED_KEY = "hearth.balance.sidebarCollapsed";

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

function navLinkStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: COLORS.ember, color: "#fff" }
    : { background: "transparent", color: COLORS.inkLight };
}

export default function WikiShell() {
  const initialRoute = parseHash(typeof window !== "undefined" ? window.location.hash : "", VALID_TABS);
  // Default landing: the Overview narrative page (`/b/` with no hash).
  const [tab, setTab] = useState(() => initialRoute.tab ?? "page");
  const [focus, setFocus] = useState(() => initialRoute.tab ? (initialRoute.focus ?? null) : "overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isSmallScreen = useIsSmallScreen();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // The overlay is only meaningful on small screens; ignore the toggle on desktop.
  const overlayOpen = isSmallScreen && mobileNavOpen;

  // Bind the active tab/focus to the URL hash. On mount this normalises the
  // hash (e.g. empty → `#/page/overview`); subsequent navigation pushes history
  // entries, and back/forward / `hashchange` rebind the route.
  useBalanceRouter(tab, setTab, focus, setFocus, VALID_TABS);

  const navigate = useCallback(({ tab: nextTab, focus: nextFocus = null }: { tab: string; focus?: string | null }) => {
    setTab(nextTab);
    setFocus(nextFocus);
    setMobileNavOpen(false);
  }, []);

  // Read-only: the panel renders the effective config the constants module
  // already merged (committed balance.json over defaults). The two surviving
  // utility tabs still take a `draft` + inert `updateDraft` via TabProps.
  const draft = BALANCE_OVERRIDES as BalanceDraft;
  const noop = useCallback((_updater: (draft: BalanceDraft) => void) => {
    /* read-only: edits are ignored */
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  // Command palette on Cmd/Ctrl-K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "k") { e.preventDefault(); setPaletteOpen((v) => !v); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On small screens the sidebar renders as an overlay and is always shown in
  // its "expanded" form (labels + section headers).
  const effectiveCollapsed = !isSmallScreen && sidebarCollapsed;

  // All palette entries now carry a concept tab id + bare entity id; route them
  // through wikiNavTarget so the entity article opens in its own concept tab.
  const handlePaletteSelect = useCallback((entry: CommandEntry | null | undefined) => {
    if (entry?.tab) navigate(wikiNavTarget(entry.tab, entry.id));
  }, [navigate]);

  const parsedFocus = parseWikiFocus(focus);
  const isConceptTab = CONCEPTS.some((c) => c.id === tab);
  // Only treat the focus as an entity article when it actually belongs to the
  // active concept tab. wikiNavTarget always keeps tab === focus-prefix, so a
  // mismatch only arises from a stale/garbled hash — fall back to the category
  // landing rather than rendering one concept's key against another's schema.
  const articleFocus = isConceptTab && parsedFocus?.conceptId === tab ? parsedFocus : null;

  // On the narrative-page tab, an absent focus means the Overview page. This
  // keeps `#/page` (the canonical empty-hash landing, which the router
  // normalises focus → null) and `#/page/overview` resolving to the same page
  // and the same sidebar highlight.
  const pageSlug = tab === "page" ? (focus ?? "overview") : null;

  // ── Main pane content — switch on (tab, focus) ────────────────────────────
  let mainContent: React.ReactNode;
  if (tab === "page") {
    mainContent = <NarrativePageLazy slug={pageSlug!} />;
  } else if (tab === "icons") {
    mainContent = <IconsTab draft={draft} updateDraft={noop} focus={focus} />;
  } else if (tab === "animationsDemo") {
    mainContent = <AnimationsDemoTab draft={draft} updateDraft={noop} focus={focus} />;
  } else if (articleFocus != null) {
    mainContent = (
      <WikiArticle
        conceptId={tab}
        entityKey={articleFocus.entityKey}
        onBack={() => navigate({ tab })}
      />
    );
  } else if (isConceptTab) {
    mainContent = <CategoryPageLazy conceptId={tab} />;
  } else {
    // Unknown tab — fall back to the Overview narrative page.
    mainContent = <NarrativePageLazy slug="overview" />;
  }

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
                aria-controls="wiki-mobile-nav"
              >
                ☰
              </button>
            )}
            <span className="text-[24px]">📖</span>
            <div>
              <div className="text-[18px] font-bold leading-tight" style={{ color: COLORS.ember }}>
                Hearthwood Vale
              </div>
              <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                Game wiki — every tile, recipe, building, and beat
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-bold rounded-lg border-2"
              style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
              title="Search the wiki (Cmd/Ctrl-K)"
              aria-label="Open command palette"
            >
              🔎 Search
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: COLORS.parchment, color: COLORS.inkSubtle, border: `1px solid ${COLORS.border}` }}>⌘K</span>
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
          {/* Sidebar — inline column on desktop, fixed overlay on small screens. */}
          <nav
            id="wiki-mobile-nav"
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
                    width: effectiveCollapsed ? 56 : 210,
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

            {/* Concept sections */}
            {WIKI_SECTIONS.map((sec) => (
              <div key={sec.id} className="flex flex-col gap-1">
                {!effectiveCollapsed ? (
                  <div
                    className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: COLORS.inkSubtle }}
                  >
                    {sec.label}
                  </div>
                ) : (
                  <div className="mx-2 my-1 h-px" style={{ background: COLORS.border, opacity: 0.4 }} />
                )}
                {sec.conceptIds.map((cid) => {
                  const label = CONCEPT_LABELS[cid] ?? cid;
                  const active = tab === cid;
                  return (
                    <button
                      key={cid}
                      onClick={() => navigate({ tab: cid })}
                      className="text-left px-3 py-2 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-2"
                      style={navLinkStyle(active)}
                      title={effectiveCollapsed ? label : undefined}
                      aria-label={label}
                    >
                      <Icon iconKey="ui_star" size={16} title="" />
                      {!effectiveCollapsed && <span className="flex-1">{label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Narrative pages */}
            <div className="flex flex-col gap-1">
              {!effectiveCollapsed ? (
                <div
                  className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.inkSubtle }}
                >
                  Pages
                </div>
              ) : (
                <div className="mx-2 my-1 h-px" style={{ background: COLORS.border, opacity: 0.4 }} />
              )}
              {NARRATIVE_PAGES.map((p) => {
                const active = tab === "page" && pageSlug === p.slug;
                return (
                  <button
                    key={p.slug}
                    onClick={() => navigate({ tab: "page", focus: p.slug })}
                    className="text-left px-3 py-2 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-2"
                    style={navLinkStyle(active)}
                    title={effectiveCollapsed ? p.label : undefined}
                    aria-label={p.label}
                  >
                    <Icon iconKey="ui_star" size={16} title="" />
                    {!effectiveCollapsed && <span className="flex-1">{p.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Dev utilities */}
            <div className="flex flex-col gap-1">
              {!effectiveCollapsed ? (
                <div
                  className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.inkSubtle }}
                >
                  Dev
                </div>
              ) : (
                <div className="mx-2 my-1 h-px" style={{ background: COLORS.border, opacity: 0.4 }} />
              )}
              {UTILITIES.map((u) => {
                const active = tab === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => navigate({ tab: u.id })}
                    className="text-left px-3 py-2 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-2"
                    style={navLinkStyle(active)}
                    title={effectiveCollapsed ? u.label : undefined}
                    aria-label={u.label}
                  >
                    <Icon iconKey="ui_devtools" size={16} title="" />
                    {!effectiveCollapsed && <span className="flex-1">{u.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={handlePaletteSelect} />

          {/* Main content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Suspense fallback={
                <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
                  Loading…
                </div>
              }>
                <BalanceNavProvider focus={focus} navigate={navigate}>
                  {mainContent}
                </BalanceNavProvider>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
