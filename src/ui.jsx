import React from "react";
import { getPhaserScene } from "./phaserBridge.js";
import { locBuilt } from "./locBuilt.js";
import { Section, CompactOrders } from "./ui/Inventory.jsx";
import { ToolsGrid } from "./ui/Tools.jsx";
import { TOOL_BY_KEY } from "./ui/toolRegistry.js";
import ChainBadge from "./ui/primitives/ChainBadge.jsx";
import TabBar from "./ui/primitives/TabBar.jsx";

// Per-feature error boundary. A crash in any one feature renders an inline
// fallback inside that feature's slot and dispatches CLOSE_MODAL so the
// player can navigate away — the rest of the app (HUD, board, other panels)
// keeps working. Resets when the active feature changes.
class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error(`[hearth] feature "${this.props.featureKey}" crashed:`, error, info?.componentStack);
  }
  componentDidUpdate(prev) {
    if (prev.featureKey !== this.props.featureKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="bg-[#3a2715]/90 border border-[#c5a87a] rounded-xl p-4 text-[#f8e7c6] text-[13px] m-4">
          <div className="font-bold mb-1">This panel hit an error.</div>
          <div className="opacity-80">The rest of the game is still running. Try closing this panel and reopening.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Side panel (orders / inventory / tools / biome switcher) ─────────────

export function SidePanel({ state, dispatch, chainInfo }) {
  return (
    <div className="bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] rounded-2xl p-3 flex flex-col gap-3 overflow-hidden h-full min-h-0">
      <ChainBadge chainInfo={chainInfo} layout="side" />
      <Section title="Tools" titleColor="#f8e7c6">
        <div className="max-h-[40vh] landscape:max-[1024px]:max-h-[34vh] overflow-y-auto pr-1">
          <ToolsGrid
            tools={state.tools}
            toolPending={state.toolPending}
            fertilizerActive={state.fertilizerActive}
            onUse={(key) => {
              const isPending = state.toolPending === key;
              if (isPending) { dispatch({ type: "CANCEL_TOOL" }); return; }
              const def = TOOL_BY_KEY[key];
              if (def?.category === "magic") {
                dispatch({ type: "USE_TOOL", payload: { id: key } });
              } else {
                dispatch({ type: "USE_TOOL", key });
              }
              if (key === "shuffle") getPhaserScene()?.shuffleBoard();
            }}
          />
        </div>
      </Section>
      <Section title="Orders" titleColor="#f8e7c6">
        <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
      </Section>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, modal, dispatch, state }) {
  // Vol I #03 — reserve all 8 slots from session start. Portal renders locked
  // until built so the row width never shifts on the player. Locked slot taps
  // surface a tooltip instead of switching view.
  const s = state ?? {};
  const builtAtLoc = locBuilt(s);
  // Vol II Polish #8 — surface ready-order count + chronicle "new beat" hint
  // as a presence dot. Counts are conservative — only ready (not "needed")
  // orders qualify, so the badge means "you can act now".
  const readyOrders = (s.orders || []).filter((o) => (s.inventory?.[o.key] ?? 0) >= o.need).length;
  const hasNewChronicle = !!(s.story?.chronicle?.hasUnseen);
  const navItems = [
    { key: "town",        iconKey: "ui_star",     label: "Town" },
    {
      key: "inventory",
      iconKey: "ui_inventory",
      label: "Inventory",
      badge: readyOrders > 0 ? readyOrders : null,
      badgeTone: "moss",
    },
    { key: "crafting",    iconKey: "ui_build",    label: "Craft" },
    { key: "cartography", iconKey: "ui_map",      label: "Map" },
    { key: "townsfolk",   iconKey: "ui_people",   label: "Townsfolk" },
    {
      key: "chronicle",
      iconKey: "ui_clipboard",
      label: "Chronicle",
      badge: hasNewChronicle ? "" : null,
      badgeTone: "ember",
    },
    { key: "tileCollection", iconKey: "ui_puzzle",label: "Tiles" },
    {
      key: "portal",
      iconKey: "ui_portal",
      label: "Portal",
      locked: !builtAtLoc.portal,
      unlockHint: "Build the Portal in town to unlock.",
    },
  ];
  const activeKey = modal ? view : view;
  const items = navItems.map((it) => ({
    ...it,
    active: activeKey === it.key,
    testId: `bottom-nav-${it.key}`,
    onClick: () => dispatch({ type: "SET_VIEW", view: it.key }),
  }));
  return <TabBar items={items} density="nav" testId="bottom-nav" />;
}

// ─── Feature extension points ─────────────────────────────────────────────
// Auto-discover features. Each feature's index.jsx must export:
//   - default: the React component (receives { state, dispatch })
//   - viewKey?: string — if set, mounts as a full-screen view when state.view === viewKey
//   - modalKey?: string — if set, mounts as a modal when state.modal === modalKey
// Vite's import.meta.glob with eager: true resolves at build time.

const featureModules = import.meta.glob("./features/*/index.jsx", { eager: true });
const FEATURES = Object.values(featureModules).map((m) => ({
  Component: m.default,
  viewKey: m.viewKey,
  modalKey: m.modalKey,
  alwaysMounted: !!m.alwaysMounted,
}));

export function FeatureModals({ state, dispatch }) {
  // Always-mounted features manage their own visibility internally
  const alwaysFeatures = FEATURES.filter(f => f.alwaysMounted);

  // Modal-keyed features only render when their modal is active
  let modalFeature = null;
  for (const f of FEATURES) {
    if (!f.alwaysMounted && f.modalKey && state.modal === f.modalKey) {
      modalFeature = f;
      break;
    }
  }

  return (
    <>
      {alwaysFeatures.map(f => {
        const k = f.modalKey || f.viewKey;
        return (
          <FeatureErrorBoundary key={k} featureKey={k}>
            <f.Component state={state} dispatch={dispatch} />
          </FeatureErrorBoundary>
        );
      })}
      {modalFeature && (
        <FeatureErrorBoundary featureKey={modalFeature.modalKey}>
          <modalFeature.Component state={state} dispatch={dispatch} />
        </FeatureErrorBoundary>
      )}
    </>
  );
}

export function FeatureScreens({ state, dispatch }) {
  if (state.view === "board" || state.view === "town") return null;
  for (const f of FEATURES) {
    if (f.viewKey && state.view === f.viewKey) {
      const C = f.Component;
      return (
        <FeatureErrorBoundary featureKey={f.viewKey}>
          <C state={state} dispatch={dispatch} />
        </FeatureErrorBoundary>
      );
    }
  }
  return null;
}
