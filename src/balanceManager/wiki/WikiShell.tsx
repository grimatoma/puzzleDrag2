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
import "./wikiTheme.css";
import CommandPalette from "../CommandPalette.jsx";
import { BalanceNavProvider } from "../balanceNav.jsx";
import type { CommandEntry } from "../commandPalette.js";
import type { BalanceDraft, TabProps } from "../tabProps.js";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, UTILITIES } from "./wikiNav.js";
import { parseWikiFocus } from "./conceptEntities.js";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { WikiViewProvider, useWikiView } from "./wikiView.js";

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

// ─── Developer-only sidebar sections ─────────────────────────────────────────
//
// These components call useWikiView() and must be rendered inside
// <WikiViewProvider> (i.e. as children of WikiShell's JSX, not in
// WikiShell's own function body).

const SCREENS_SECTION_ID = "screens";
const DEV_ONLY_SECTION_IDS = new Set([SCREENS_SECTION_ID]);

interface SidebarConceptSectionsProps {
  tab: string;
  effectiveCollapsed: boolean;
  manualExpanded: Set<string>;
  setManualExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

function SidebarConceptSections({
  tab,
  effectiveCollapsed,
  manualExpanded,
  setManualExpanded,
  navigate,
}: SidebarConceptSectionsProps) {
  const { view } = useWikiView();
  // In player view, hide the Screens section (views/modals are developer-only).
  const visibleSections = view === "player"
    ? WIKI_SECTIONS.filter((sec) => !DEV_ONLY_SECTION_IDS.has(sec.id))
    : WIKI_SECTIONS;

  return (
    <>
      {visibleSections.map((sec) => (
        <div key={sec.id} className="flex flex-col gap-1">
          {!effectiveCollapsed ? (
            <div className="wiki-sidebar-label px-2 pt-2 pb-1">{sec.label}</div>
          ) : (
            <div className="mx-2 my-1 h-px" style={{ background: COLORS.border, opacity: 0.4 }} />
          )}

          {sec.nodes.map((node) => {
            const cid = node.conceptId;
            const label = CONCEPT_LABELS[cid] ?? cid;
            const active = tab === cid;
            const children = node.children ?? [];
            const hasChildren = children.length > 0;
            const isOpen = children.includes(tab) || manualExpanded.has(cid);

            return (
              <div key={cid} className="flex flex-col">
                <div className="flex items-stretch">
                  {hasChildren && !effectiveCollapsed && (
                    <button
                      type="button"
                      aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
                      aria-expanded={isOpen}
                      onClick={() =>
                        setManualExpanded((prev) => {
                          const next = new Set(prev);
                          if (isOpen) next.delete(cid);
                          else next.add(cid);
                          return next;
                        })
                      }
                      className="px-1 flex items-center"
                      style={{ color: COLORS.inkSubtle, cursor: "pointer" }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: 10,
                          fontSize: 9,
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 150ms ease",
                        }}
                      >
                        ▶
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => navigate({ tab: cid })}
                    className={`wiki-nav-link flex-1${active ? " wiki-nav-link--active" : ""}`}
                    title={effectiveCollapsed ? label : undefined}
                    aria-label={label}
                  >
                    <Icon iconKey="ui_star" size={16} title="" />
                    {!effectiveCollapsed && <span className="flex-1">{label}</span>}
                  </button>
                </div>

                {hasChildren && !effectiveCollapsed && isOpen && (
                  <div className="flex flex-col gap-1" style={{ paddingLeft: 18 }}>
                    {children.map((childId) => {
                      const childLabel = CONCEPT_LABELS[childId] ?? childId;
                      const childActive = tab === childId;
                      return (
                        <button
                          key={childId}
                          onClick={() => navigate({ tab: childId })}
                          className={`wiki-nav-link${childActive ? " wiki-nav-link--active" : ""}`}
                          aria-label={childLabel}
                        >
                          <Icon iconKey="ui_star" size={13} title="" />
                          <span className="flex-1">{childLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

interface SidebarDevUtilitiesProps {
  tab: string;
  effectiveCollapsed: boolean;
  navigate: (target: { tab: string; focus?: string | null }) => void;
}

function SidebarDevUtilities({ tab, effectiveCollapsed, navigate }: SidebarDevUtilitiesProps) {
  const { view } = useWikiView();
  // Dev utilities are developer-only — hidden in player view.
  if (view === "player") return null;

  return (
    <div className="flex flex-col gap-1">
      {!effectiveCollapsed ? (
        <div className="wiki-sidebar-label px-2 pt-2 pb-1">
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
            className={`wiki-nav-link${active ? " wiki-nav-link--active" : ""}`}
            title={effectiveCollapsed ? u.label : undefined}
            aria-label={u.label}
          >
            <Icon iconKey="ui_devtools" size={16} title="" />
            {!effectiveCollapsed && <span className="flex-1">{u.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── View toggle control ──────────────────────────────────────────────────────

function WikiViewToggle() {
  const { view, setView } = useWikiView();
  return (
    <div className="wiki-view-toggle" role="group" aria-label="Wiki view mode">
      <button
        type="button"
        className={`wiki-view-toggle__btn${view === "developer" ? " wiki-view-toggle__btn--active" : ""}`}
        onClick={() => setView("developer")}
        aria-pressed={view === "developer"}
        title="Developer view — shows schema tables, raw keys, and dev utilities"
      >
        Developer
      </button>
      <button
        type="button"
        className={`wiki-view-toggle__btn${view === "player" ? " wiki-view-toggle__btn--active" : ""}`}
        onClick={() => setView("player")}
        aria-pressed={view === "player"}
        title="Player view — shows only player-facing content"
      >
        Player
      </button>
    </div>
  );
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
  // Tracks which primary nodes the user has manually toggled. Auto-open is
  // derived separately: a primary node is open if `tab` is one of its children.
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(() => new Set());

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
    <WikiViewProvider>
    <div
      className="wiki-root fixed inset-0 grid place-items-stretch"
      style={{ background: COLORS.parchmentDeep }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          background: COLORS.canvas,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <header
          className="wiki-header flex items-center justify-between px-5 py-3 flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            {isSmallScreen && (
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                className="wiki-toggle-btn wiki-toggle-btn--lg"
                title={overlayOpen ? "Close navigation" : "Open navigation"}
                aria-label={overlayOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={overlayOpen}
                aria-controls="wiki-mobile-nav"
              >
                ☰
              </button>
            )}
            {/* Inline SVG hearth/flame accent — no external asset */}
            <svg
              className="wiki-header-icon"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Stone arch base */}
              <rect x="4" y="26" width="28" height="7" rx="2" fill="#b28b62" />
              {/* Hearth opening */}
              <path d="M10 26 Q10 18 18 14 Q26 18 26 26Z" fill="#e8dcc4" />
              {/* Flame — ember orange */}
              <path d="M18 24 Q15 20 17 16 Q18 14 18 12 Q20 15 21 18 Q22 16 21 13 Q24 16 23 20 Q22 23 18 24Z" fill="#d6612a" />
              {/* Flame inner glow */}
              <path d="M18 22 Q16.5 19 17.5 17 Q18 15.5 18 14.5 Q19.2 17 19.5 19 Q20 17.5 19.5 16 Q21.5 18 20.5 21 Q19.5 22.5 18 22Z" fill="#f09050" opacity="0.7" />
              {/* Logs */}
              <rect x="11" y="25" width="14" height="3" rx="1.5" fill="#8b6845" />
            </svg>
            <div>
              <div className="wiki-wordmark">Hearthwood Vale</div>
              <div className="wiki-tagline">Game wiki — every tile, recipe, building, and beat</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WikiViewToggle />
            <button
              onClick={() => setPaletteOpen(true)}
              className="wiki-search-btn"
              title="Search the wiki (Cmd/Ctrl-K)"
              aria-label="Open command palette"
            >
              🔎 Search
              <span className="wiki-kbd">⌘K</span>
            </button>
            <a
              href={import.meta.env.BASE_URL}
              className="wiki-back-btn"
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
            className="wiki-sidebar flex flex-col gap-1 p-3 flex-shrink-0 overflow-y-auto transition-transform duration-200"
            style={
              isSmallScreen
                ? {
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 240,
                    transform: overlayOpen ? "translateX(0)" : "translateX(-100%)",
                    zIndex: 20,
                    boxShadow: overlayOpen ? "4px 0 20px rgba(43,34,24,0.20)" : "none",
                  }
                : {
                    width: effectiveCollapsed ? 56 : 210,
                    position: "relative",
                    transition: "width 200ms",
                  }
            }
            aria-hidden={isSmallScreen && !overlayOpen}
          >
            <div className="self-end mb-1 flex gap-1">
              <button
                onClick={isSmallScreen ? () => setMobileNavOpen(false) : toggleSidebar}
                className="wiki-toggle-btn"
                title={isSmallScreen ? "Close navigation" : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
                aria-label={isSmallScreen ? "Close navigation" : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
                aria-expanded={isSmallScreen ? overlayOpen : !sidebarCollapsed}
              >
                {isSmallScreen ? "✕" : (sidebarCollapsed ? "»" : "«")}
              </button>
            </div>

            {/* Concept sections — Screens section hidden in player view */}
            <SidebarConceptSections
              tab={tab}
              effectiveCollapsed={effectiveCollapsed}
              manualExpanded={manualExpanded}
              setManualExpanded={setManualExpanded}
              navigate={navigate}
            />

            {/* Narrative pages */}
            <div className="flex flex-col gap-1">
              {!effectiveCollapsed ? (
                <div className="wiki-sidebar-label px-2 pt-2 pb-1">
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
                    className={`wiki-nav-link${active ? " wiki-nav-link--active" : ""}`}
                    title={effectiveCollapsed ? p.label : undefined}
                    aria-label={p.label}
                  >
                    <Icon iconKey="ui_star" size={16} title="" />
                    {!effectiveCollapsed && <span className="flex-1">{p.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Dev utilities — hidden entirely in player view */}
            <SidebarDevUtilities
              tab={tab}
              effectiveCollapsed={effectiveCollapsed}
              navigate={navigate}
            />
          </nav>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={handlePaletteSelect} />

          {/* Main content */}
          <main className="wiki-main flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Suspense fallback={
                <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
                  Loading…
                </div>
              }>
                <BalanceNavProvider focus={focus} navigate={navigate}>
                  <div className="wiki-reveal">
                    {mainContent}
                  </div>
                </BalanceNavProvider>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
    </WikiViewProvider>
  );
}
