import React from "react";
import TabBar, { Tab } from "./ui/primitives/TabBar.jsx";

// Per-feature error boundary. A crash in any one feature renders an inline
// fallback inside that feature's slot and dispatches CLOSE_MODAL so the
// player can navigate away — the rest of the app (HUD, board, other panels)
// keeps working. Resets when the active feature changes.
class FeatureErrorBoundary extends React.Component<{ featureKey: any; children: any }, { error: any }> {
  constructor(props: { featureKey: any; children: any }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) { return { error }; }
  override componentDidCatch(error: any, info: any) {
    console.error(`[hearth] feature "${this.props.featureKey}" crashed:`, error, info?.componentStack);
  }
  override componentDidUpdate(prev: any) {
    if (prev.featureKey !== this.props.featureKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  override render() {
    if (this.state.error) {
      return (
        <div className="hl-card m-4">
          <div className="hl-card-title mb-1">This panel hit an error.</div>
          <div className="hl-card-meta">The rest of the game is still running. Try closing this panel and reopening.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, dispatch, state }: { view: any; dispatch: any; state: any }) {
  const orders = state?.orders ?? [];
  const inventory = state?.inventory ?? {};
  const ordersReady = orders.filter((o: any) => (inventory[o.key] ?? 0) >= o.need).length;
  const ordersBadge = ordersReady > 0 ? { count: ordersReady, tone: "moss" } : undefined;
  return (
    <TabBar
      current={view}
      onSelect={(key: any) => dispatch({ type: "SET_VIEW", view: key })}
    >
      <Tab itemKey="town" iconKey="ui_star" label="Town" />
      <Tab itemKey="inventory" iconKey="ui_inventory" label="Inventory" badge={ordersBadge} />
      <Tab itemKey="crafting" iconKey="ui_build" label="Craft" />
      <Tab itemKey="cartography" iconKey="ui_map" label="Map" />
      <Tab itemKey="townsfolk" iconKey="ui_people" label="Townsfolk" />
    </TabBar>
  );
}

// ─── Feature extension points ─────────────────────────────────────────────
// Auto-discover features. Each feature's index.jsx must export:
//   - default: the React component (receives { state, dispatch })
//   - viewKey?: string — if set, mounts as a full-screen view when state.view === viewKey
//   - modalKey?: string — if set, mounts as a modal when state.modal === modalKey
// Vite's import.meta.glob with eager: true resolves at build time.

const featureModules = import.meta.glob("./features/*/index.{jsx,tsx}", { eager: true });
const FEATURES = Object.values(featureModules).map((m: any) => ({
  Component: (m as any).default,
  viewKey: (m as any).viewKey,
  modalKey: (m as any).modalKey,
  alwaysMounted: !!(m as any).alwaysMounted,
}));

export function FeatureModals({ state, dispatch }: { state: any; dispatch: any }) {
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
      {modalFeature && (() => {
        const MF = (modalFeature as any);
        const MFC = MF.Component;
        return (
          <FeatureErrorBoundary featureKey={MF.modalKey}>
            <MFC state={state} dispatch={dispatch} />
          </FeatureErrorBoundary>
        );
      })()}
    </>
  );
}

export function FeatureScreens({ state, dispatch, inventorySearchOpen, onInventorySearchToggle, viewDirection = "up" }: { state: any; dispatch: any; inventorySearchOpen: any; onInventorySearchToggle: any; viewDirection?: string }) {
  if (state.view === "board" || state.view === "town") return null;
  for (const f of FEATURES) {
    if (f.viewKey && state.view === f.viewKey) {
      const C = f.Component;
      const extra = f.viewKey === "inventory"
        ? { searchOpen: inventorySearchOpen, onToggleSearch: onInventorySearchToggle }
        : {};
      const enterCls = viewDirection === "down" ? "view-enter-down" : "view-enter-up";
      // Wrapper keyed on viewKey forces re-mount when navigating between
      // features, which retriggers the .view-enter-* animation.
      return (
        <div key={f.viewKey} className={`${enterCls} absolute inset-0`}>
          <FeatureErrorBoundary featureKey={f.viewKey}>
            <C state={state} dispatch={dispatch} {...extra} />
          </FeatureErrorBoundary>
        </div>
      );
    }
  }
  return null;
}
