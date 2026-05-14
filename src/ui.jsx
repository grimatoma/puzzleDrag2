import React from "react";
import { getPhaserScene } from "./phaserBridge.js";
import { locBuilt } from "./locBuilt.js";
import { Section, CompactOrders } from "./ui/Inventory.jsx";
import { ToolsGrid } from "./ui/Tools.jsx";
import { TOOL_BY_KEY } from "./ui/toolRegistry.js";
import Icon from "./ui/Icon.jsx";
import ChainBadge from "./ui/primitives/ChainBadge.jsx";

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
  const builtAtLoc = locBuilt(state ?? {});
  const items = [
    { key: "town",        iconKey: "ui_star",     label: "Town" },
    { key: "inventory",   iconKey: "ui_inventory",label: "Inventory" },
    { key: "crafting",    iconKey: "ui_build",    label: "Craft" },
    { key: "cartography", iconKey: "ui_map",      label: "Map" },
    { key: "townsfolk",   iconKey: "ui_people",   label: "Townsfolk" },
    { key: "chronicle",   iconKey: "ui_clipboard",label: "Chronicle" },
    { key: "tileCollection", iconKey: "ui_puzzle",label: "Tiles" },
    {
      key: "portal",
      iconKey: "ui_portal",
      label: "Portal",
      locked: !builtAtLoc.portal,
      unlockHint: "Build the Portal in town to unlock.",
    },
  ];
  const activeKey = modal ? (items.find((i) => i.modal === modal)?.key ?? view) : view;
  return (
    <div
      data-testid="bottom-nav"
      className="flex w-full bg-[#2b2218]/95 border-t-2 border-[#f7e2b6] flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,.25)]"
      style={{
        // Sit above the home-indicator on iOS; pads the nav by safe-area-inset-bottom
        // so the bottom edge of the tab labels never lands in the gesture zone.
        paddingBottom: "var(--safe-bottom, 0px)",
      }}
    >
      {items.map((it) => {
        const active = activeKey === it.key;
        const locked = !!it.locked;
        const onClick = () => {
          if (locked) return; // tooltip via title attribute does the explaining
          if (it.modal) dispatch({ type: "OPEN_MODAL", modal: it.modal });
          else dispatch({ type: "SET_VIEW", view: it.key });
        };
        // Active-state contrast: the old `bg-[#d6612a]` flood crushed the
        // icon. Use a top-edge accent + a soft 12% wash so the icon's outline
        // stays readable (Vol II §06 #9).
        const cls = locked
          ? "text-[#f7e2b6]/40 cursor-not-allowed"
          : active
          ? "text-white bg-[#d6612a]/15 border-t-2 border-[#d6612a] -mt-[2px]"
          : "text-[#f7e2b6] hover:bg-white/10 border-t-2 border-transparent -mt-[2px]";
        return (
          <button
            key={it.key}
            data-testid={`bottom-nav-${it.key}`}
            onClick={onClick}
            aria-label={locked ? `${it.label} (locked) — ${it.unlockHint}` : it.label}
            aria-disabled={locked || undefined}
            title={locked ? it.unlockHint : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${cls}`}
            style={{ minHeight: 48 }}
          >
            <span className="relative">
              <Icon iconKey={it.iconKey} size={18} />
              {locked && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-1.5 text-[10px] leading-none text-[#f7e2b6]/70"
                >
                  🔒
                </span>
              )}
            </span>
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
