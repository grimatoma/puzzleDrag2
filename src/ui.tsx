import React from "react";
import TabBar, { Tab } from "./ui/primitives/TabBar.jsx";
import { inventoryQty } from "./types/inventory.js";
import { zoneInventory } from "./state/zoneInventory.js";
import type { Dispatch, GameState } from "./types/state.js";

interface FeatureErrorBoundaryProps {
  featureKey: string | undefined;
  children: React.ReactNode;
}

interface FeatureErrorBoundaryState {
  error: Error | null;
}

// Per-feature error boundary. A crash in any one feature renders an inline
// fallback inside that feature's slot and dispatches CLOSE_MODAL so the
// player can navigate away — the rest of the app (HUD, board, other panels)
// keeps working. Resets when the active feature changes.
class FeatureErrorBoundary extends React.Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState { return { error }; }
  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[hearth] feature "${this.props.featureKey}" crashed:`, error, info?.componentStack);
  }
  override componentDidUpdate(prev: FeatureErrorBoundaryProps) {
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

interface BottomNavOrder {
  key: string;
  need: number;
  [extra: string]: unknown;
}

export function BottomNav({ view, dispatch, state }: { view: string; dispatch: Dispatch; state: GameState }) {
  const orders = (state?.orders ?? []) as BottomNavOrder[];
  const inventory = zoneInventory(state ?? { inventory: {}, farmRun: null, activeZone: "home", mapCurrent: "home" } as import("./types/state.js").GameState);
  const ordersReady = orders.filter((o) => inventoryQty(inventory, o.key) >= o.need).length;
  const ordersBadge = ordersReady > 0 ? { count: ordersReady, tone: "moss" } : undefined;
  return (
    <TabBar
      current={view}
      onSelect={(key: string) => dispatch({ type: "SET_VIEW", view: key })}
    >
      <Tab itemKey="town" iconKey="ui_star" label="Town" />
      <Tab itemKey="inventory" iconKey="ui_inventory" label="Inventory" badge={ordersBadge} />
      <Tab itemKey="crafting" iconKey="ui_build" label="Craft" />
      <Tab itemKey="cartography" iconKey="ui_map" label="Map" />
      <Tab itemKey="townsfolk" iconKey="ui_people" label="Townsfolk" />
      <Tab itemKey="quests" iconKey="quest_book" label="Quests" />
    </TabBar>
  );
}

// ─── Feature extension points ─────────────────────────────────────────────
// Auto-discover features. Each feature's index.jsx must export:
//   - default: the React component (receives { state, dispatch })
//   - viewKey?: string — if set, mounts as a full-screen view when state.view === viewKey
//   - modalKey?: string — if set, mounts as a modal when state.modal === modalKey
// Vite's import.meta.glob with eager: true resolves at build time.

interface FeatureModule {
  default: React.ComponentType<Record<string, unknown>>;
  viewKey?: string;
  modalKey?: string;
  alwaysMounted?: boolean;
}

interface FeatureEntry {
  Component: React.ComponentType<Record<string, unknown>>;
  viewKey: string | undefined;
  modalKey: string | undefined;
  alwaysMounted: boolean;
}

const featureModules = import.meta.glob("./features/*/index.{jsx,tsx}", { eager: true });
const FEATURES: FeatureEntry[] = Object.values(featureModules).map((m) => {
  const mod = m as FeatureModule;
  return {
    Component: mod.default,
    viewKey: mod.viewKey,
    modalKey: mod.modalKey,
    alwaysMounted: !!mod.alwaysMounted,
  };
});

export function FeatureModals({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
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
        const MF = modalFeature;
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

export function FeatureScreens({
  state,
  dispatch,
  inventorySearchOpen,
  onInventorySearchToggle,
  viewDirection = "up",
}: {
  state: GameState;
  dispatch: Dispatch;
  inventorySearchOpen: boolean;
  onInventorySearchToggle: (() => void) | undefined;
  viewDirection?: string;
}) {
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
