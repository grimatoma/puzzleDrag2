import React from "react";
import TabBar, { Tab } from "./ui/primitives/TabBar.jsx";

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

export function BottomNav({ view, dispatch, state }) {
  const orders = state?.orders ?? [];
  const inventory = state?.inventory ?? {};
  const ordersReady = orders.filter((o) => (inventory[o.key] ?? 0) >= o.need).length;
  const ordersBadge = ordersReady > 0 ? { count: ordersReady, tone: "moss" } : undefined;
  return (
    <TabBar
      current={view}
      onSelect={(key) => dispatch({ type: "SET_VIEW", view: key })}
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

export function FeatureScreens({ state, dispatch, inventorySearchOpen, onInventorySearchToggle }) {
  if (state.view === "board" || state.view === "town") return null;
  for (const f of FEATURES) {
    if (f.viewKey && state.view === f.viewKey) {
      const C = f.Component;
      const extra = f.viewKey === "inventory"
        ? { searchOpen: inventorySearchOpen, onToggleSearch: onInventorySearchToggle }
        : {};
      return (
        <FeatureErrorBoundary featureKey={f.viewKey}>
          <C state={state} dispatch={dispatch} {...extra} />
        </FeatureErrorBoundary>
      );
    }
  }
  return null;
}
