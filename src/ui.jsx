import React from "react";
import { getPhaserScene } from "./phaserBridge.js";
import { locBuilt } from "./locBuilt.js";
import { Section, CompactOrders } from "./ui/Inventory.jsx";
import { ToolsGrid } from "./ui/Tools.jsx";
import { TOOL_BY_KEY } from "./ui/toolRegistry.js";
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
    <div className="bg-gradient-to-b from-[#ead7b3] to-[#d4b585] border-[3px] border-[#b28b62] rounded-2xl p-3 flex flex-col gap-3 overflow-hidden h-full min-h-0">
      {chainInfo && (
        <div className="bg-[#2b2218]/90 border border-[#ffd248] rounded-xl px-3 py-2 text-[#ffd248] font-bold text-[13px] text-center flex-shrink-0">
          <div>
            chain × {chainInfo.count}{chainInfo.doubled ? " ×2" : ""}{chainInfo.upgrades > 0 ? `  +${chainInfo.upgrades}★` : ""}
          </div>
          {chainInfo.nextTileProgress && chainInfo.nextTileProgress.threshold > 0 && (
            <div className="text-[11px] text-[#f8e7c6] font-normal mt-0.5">
              {chainInfo.nextTileProgress.current}/{chainInfo.nextTileProgress.threshold} {chainInfo.nextTileProgress.targetLabel}
            </div>
          )}
        </div>
      )}
      <Section title="Tools" titleColor="#3a2715">
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
      <Section title="Orders" titleColor="#3a2715">
        <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
      </Section>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, dispatch, state }) {
  const builtAtLoc = locBuilt(state ?? {});
  const orders = state?.orders ?? [];
  const inventory = state?.inventory ?? {};
  const ordersReady = orders.filter((o) => (inventory[o.key] ?? 0) >= o.need).length;
  const ordersBadge = ordersReady > 0 ? { count: ordersReady, tone: "moss" } : undefined;
  // Chronicle badge skipped: no `lastChronicleViewedAt` (or equivalent) field
  // exists in state, and the brief forbids adding new state for this slot.
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
      <Tab itemKey="chronicle" iconKey="ui_clipboard" label="Chronicle" />
      <Tab itemKey="tileCollection" iconKey="ui_puzzle" label="Tiles" />
      <Tab
        itemKey="portal"
        iconKey="ui_portal"
        label="Portal"
        locked={!builtAtLoc.portal}
        unlockHint="Build the Portal"
      />
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
