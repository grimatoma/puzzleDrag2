import React from "react";
import { getPhaserScene } from "./phaserBridge.js";
import { Section, CompactOrders } from "./ui/Inventory.jsx";
import { ToolsGrid } from "./ui/Tools.jsx";

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
      {chainInfo && (
        <div className="bg-[#2b2218]/90 border border-[#ffd248] rounded-xl px-3 py-2 text-[#ffd248] font-bold text-[13px] text-center flex-shrink-0">
          chain × {chainInfo.count}{chainInfo.upgrades > 0 ? `  +${chainInfo.upgrades}★` : ""}
        </div>
      )}
      <Section title="Tools" titleColor="#f8e7c6">
        <ToolsGrid tools={state.tools} onUse={(key) => {
          dispatch({ type: "USE_TOOL", key });
          if (key === "shuffle") getPhaserScene()?.shuffleBoard();
        }} />
      </Section>
      <Section title="Orders" titleColor="#f8e7c6">
        <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
      </Section>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────

export function BottomNav({ view, modal, dispatch, state }) {
  const built = state?.built ?? {};
  const baseItems = [
    { key: "town",        icon: "⌂",   label: "Town" },
    { key: "inventory",   icon: "🎒",  label: "Inventory" },
    { key: "quests",      icon: "📜",  label: "Quests" },
    { key: "crafting",    icon: "🔨",  label: "Craft" },
    { key: "cartography", icon: "🗺️", label: "Map" },
    { key: "townsfolk",   icon: "👥",  label: "Townsfolk" },
    { key: "tileCollection", icon: "🧩",  label: "Tiles" },
    ...(built.portal       ? [{ key: "portal", icon: "🔮", label: "Portal" }] : []),
  ];
  const items = baseItems;
  const activeKey = modal ? (items.find((i) => i.modal === modal)?.key ?? view) : view;
  return (
    <div className="flex w-full bg-[#2b2218]/95 border-t-2 border-[#f7e2b6] flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,.25)]">
      {items.map((it) => {
        const active = activeKey === it.key;
        return (
          <button
            key={it.key}
            onClick={() => {
              if (it.modal) {
                dispatch({ type: "OPEN_MODAL", modal: it.modal });
              } else {
                dispatch({ type: "SET_VIEW", view: it.key });
              }
            }}
            aria-label={`${it.icon} ${it.label}`}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${active ? "bg-[#d6612a] text-white" : "text-[#f7e2b6] hover:bg-white/10"}`}
          >
            <span className="text-[18px] leading-none">{it.icon}</span>
            <span className="text-[10px] font-bold leading-none whitespace-nowrap">{it.label}</span>
          </button>
        );
      })}
    </div>
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
