import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTooltip, Tooltip } from "./Tooltip.jsx";
import { CompactOrders } from "./Inventory.jsx";
import { getPhaserScene } from "../phaserBridge.js";
import IconCanvas, { hasIcon } from "./IconCanvas.jsx";
import Icon from "./Icon.jsx";
import Button from "./primitives/Button.jsx";
import useChromeRect from "./primitives/useChromeRect.js";
import { TOOL_CATALOG, TOOL_BY_KEY, TOOL_CATEGORIES, visibleTools, isTapTargetTool } from "./toolRegistry.js";

// Re-exported for back-compat with anything that still imports TOOL_DEFS.
export const TOOL_DEFS = TOOL_CATALOG;

/**
 * Renders a tool's icon — prefers the canvas icon registry, falls back to the
 * emoji glyph for tools whose registry icon hasn't been drawn yet.
 */
function ToolIcon({ def, size }) {
  if (def.iconKey && hasIcon(def.iconKey)) {
    return <div style={{ width: size, height: size }}><IconCanvas iconKey={def.iconKey} size={size} /></div>;
  }
  return <div style={{ fontSize: size * 0.7, lineHeight: 1 }}><Icon iconKey={def.iconKey ?? "ui_settings"} size={size * 0.7} /></div>;
}

/**
 * Dispatch a tool use, with bridge side-effects for the few tools that need
 * a synchronous Phaser call (shuffle hits the scene directly so the board
 * animates the same frame the action lands).
 */
function dispatchUseTool(dispatch, key, state) {
  const isPending = state.toolPending === key;
  if (isPending) {
    dispatch({ type: "CANCEL_TOOL" });
    return;
  }
  // Magic tools route through the portal slice exclusively — but they share
  // the USE_TOOL action; payload.id is what the portal slice listens to.
  const def = TOOL_BY_KEY[key];
  const isMagic = def?.category === "magic";
  if (isMagic) {
    dispatch({ type: "USE_TOOL", payload: { id: key } });
  } else {
    dispatch({ type: "USE_TOOL", key });
  }
  if (key === "shuffle") getPhaserScene()?.shuffleBoard();
}

function ToolButton({ def, count, pending, onClick, onLongPress, showTooltip, hideTooltip, lastTouchTimeRef, size = "md" }) {
  const longPressTimer = useRef(null);
  const longPressOccurred = useRef(false);

  const startLongPress = () => {
    longPressOccurred.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressOccurred.current = true;
      onLongPress?.(def);
    }, 500);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const empty = count === 0;
  const armed = pending;
  const iconPx = size === "sm" ? 24 : 32;
  const sizing = size === "sm"
    ? { btn: "py-1.5 px-1", name: "text-[8px]" }
    : { btn: "py-1.5 px-1", name: "text-[9px]" };

  return (
    <button
      disabled={empty && !armed}
      aria-label={`${armed ? "Cancel" : "Use"} ${def.name}${empty && !armed ? " (none left)" : ""}`}
      aria-pressed={armed}
      onClick={() => {
        if (longPressOccurred.current) { longPressOccurred.current = false; return; }
        onClick();
      }}
      onMouseEnter={(e) => { if (Date.now() - lastTouchTimeRef.current > 600) showTooltip(def.key, e.currentTarget); }}
      onMouseLeave={() => { if (Date.now() - lastTouchTimeRef.current > 600) hideTooltip(); }}
      onTouchStart={(e) => {
        lastTouchTimeRef.current = Date.now();
        startLongPress();
        showTooltip(def.key, e.currentTarget);
      }}
      onTouchEnd={() => { cancelLongPress(); hideTooltip(2000); }}
      onTouchCancel={() => { cancelLongPress(); hideTooltip(2000); }}
      onTouchMove={() => cancelLongPress()}
      className={`relative w-full rounded-lg border-2 ${sizing.btn} flex flex-col items-center gap-0.5 transition-transform motion-decorative ${
        armed
          ? "border-[#ffd248] bg-[#7a4f1d] shadow-[0_0_0_2px_rgba(255,210,72,0.45),0_0_12px_rgba(255,210,72,0.35)] motion-safe:animate-pulse"
          : empty
          ? "border-[#7a5836] bg-[#5e3a1f] opacity-40 cursor-not-allowed"
          : "border-[#e6c49a] bg-[#9a724d] hover:bg-[#b8845a] hover:-translate-y-0.5"
      }`}
    >
      {/* Count badge — pointer-events-none so a corner-tap reads as a tool tap,
       *  not a badge tap (Vol II §02). */}
      {count > 0 && (
        <div
          className="absolute -top-1 -right-1 bg-[var(--bark)] text-white border border-[var(--parchment-soft)] rounded-full px-1.5 text-[10px] font-bold leading-none py-0.5 tabular-nums pointer-events-none"
          aria-hidden="true"
        >
          {count}
        </div>
      )}
      {/* The standalone "ARMED" mini-pill is removed — the over-canvas
       *  ArmedToolBanner already says the same thing at a glanceable size, and
       *  the button's own glow ring marks the armed state (Vol I #07, Vol II §02). */}
      <ToolIcon def={def} size={iconPx} />
      <div className={`${sizing.name} font-bold text-white`}>{def.name}</div>
    </button>
  );
}

/**
 * Side-panel grid: shows owned tools, grouped by category.
 * Always-show field tools so the player sees what they can earn.
 */
/**
 * Returns true when a tool's button should render in the "armed" visual state.
 * Tap-target tools track this through state.toolPending; passive tools (e.g.
 * fertilizer) flip a dedicated flag when armed and need their own check.
 */
function isToolArmed(def, { toolPending, fertilizerActive }) {
  if (toolPending === def.key) return true;
  if (def.key === "fertilizer" && fertilizerActive) return true;
  return false;
}

/**
 * Shared tool tooltip + detail-modal manager. Three tool surfaces wanted the
 * same tooltip on hover, the same long-press → rich detail modal, and the
 * same close affordance — keeping all of that in one place is the audit's
 * Vol I #07 ask.
 */
function ToolDetailAndTooltip({ modalTool, setModalTool, tooltipTip }) {
  const tooltipDef = tooltipTip ? TOOL_BY_KEY[tooltipTip.data] : null;
  // Vol II Polish — Esc dismisses every modal with a Close button.
  useEffect(() => {
    if (!modalTool) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setModalTool(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalTool, setModalTool]);
  return (
    <>
      {tooltipDef && (
        <Tooltip
          anchorX={tooltipTip.x}
          anchorY={tooltipTip.y}
          className="z-[9999] w-44 bg-[#2b1d0e] text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg pointer-events-none border border-[#e6c49a]"
          arrowClassName="border-4 border-transparent border-t-[#2b1d0e]"
        >
          <div className="font-bold text-[11px] mb-0.5">{tooltipDef.name}</div>
          <div className="text-white/80 leading-snug">{tooltipDef.desc}</div>
          {isTapTargetTool(tooltipDef.key) && (
            <div className="text-[#ffd248] text-[9px] font-bold mt-1">Tap a tile after using.</div>
          )}
        </Tooltip>
      )}
      {modalTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalTool(null)}>
          <div className="bg-[#3d2310] border-2 border-[#e6c49a] rounded-2xl p-5 max-w-[280px] w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid place-items-center mb-1" style={{ height: 64 }}>
              <ToolIcon def={modalTool} size={64} />
            </div>
            <div className="text-white font-bold text-[17px] text-center mb-2">{modalTool.name}</div>
            <div className="text-white/80 text-[12px] text-center leading-relaxed">{modalTool.desc}</div>
            {isTapTargetTool(modalTool.key) && (
              <div className="text-[#ffd248] text-[11px] font-bold text-center mt-2">Tap a tile on the board to apply.</div>
            )}
            <div className="mt-4">
              <Button tone="iron" size="md" block onClick={() => setModalTool(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ToolStrip — the one tools surface (Vol I #07). `layout` picks shape:
 *
 *   "grid" — desktop side panel (2-col, grouped by category)
 *   "rail" — phone portrait horizontal scroll strip (64px cards)
 *   "sheet"— mobile dock bottom-sheet variant (same as "grid", looser
 *            gap, no category labels)
 *
 * Same ToolButton across all three. Same tooltip + detail modal.
 */
export function ToolStrip({ tools, toolPending, fertilizerActive, onUse, layout = "grid" }) {
  const { tip: tooltipTip, show: showTooltip, hide: hideTooltip, lastTouchTime: lastTouchTimeRef } = useTooltip();
  const [modalTool, setModalTool] = useState(null);

  const visible = visibleTools(tools);
  const size = layout === "rail" ? "sm" : "md";

  const renderButton = (def) => (
    <ToolButton
      key={def.key}
      def={def}
      count={tools[def.key] || 0}
      pending={isToolArmed(def, { toolPending, fertilizerActive })}
      onClick={() => onUse(def.key)}
      onLongPress={(t) => setModalTool(t)}
      showTooltip={showTooltip}
      hideTooltip={hideTooltip}
      lastTouchTimeRef={lastTouchTimeRef}
      size={size}
    />
  );

  let body;
  if (layout === "rail") {
    body = (
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin", touchAction: "pan-x" }}>
        {visible.map((def) => (
          <div key={def.key} className="flex-shrink-0 w-[64px]">{renderButton(def)}</div>
        ))}
      </div>
    );
  } else {
    // grid + sheet share the category-grouped 2-col layout. The sheet variant
    // omits category headers since it's a focused popup.
    const byCategory = TOOL_CATEGORIES.map((cat) => ({
      ...cat,
      tools: visible.filter((t) => t.category === cat.key),
    })).filter((c) => c.tools.length > 0);
    body = (
      <div className="flex flex-col gap-2.5">
        {byCategory.map((cat) => (
          <div key={cat.key}>
            {layout === "grid" && (
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#f8e7c6]/70 mb-1 px-0.5">
                {cat.label}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {cat.tools.map(renderButton)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {body}
      <ToolDetailAndTooltip modalTool={modalTool} setModalTool={setModalTool} tooltipTip={tooltipTip} />
    </>
  );
}

/**
 * Back-compat alias. Existing callers import { ToolsGrid }; new code should
 * use <ToolStrip layout="grid" />.
 */
export function ToolsGrid(props) {
  return <ToolStrip layout="grid" {...props} />;
}

function BottomSheet({ onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-[#3a2715] border-t-2 border-[#b28b62] rounded-t-2xl p-4 max-h-[60dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#b28b62] rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Portrait phone tool bar: a single horizontal scroll strip showing every
 * owned tool plus the four field starters so the player always has a base set.
 * Body is now <ToolStrip layout="rail" /> — same buttons, same tooltip, same
 * long-press detail modal as the desktop grid (Vol I #07).
 */
export function PortraitToolsBar({ state, dispatch }) {
  return (
    <div className="bg-[#3a2715] border-t border-[#b28b62] px-2 py-2 flex-shrink-0">
      <ToolStrip
        layout="rail"
        tools={state.tools || {}}
        toolPending={state.toolPending}
        fertilizerActive={state.fertilizerActive}
        onUse={(key) => dispatchUseTool(dispatch, key, state)}
      />
    </div>
  );
}

export function MobileDock({ state, dispatch }) {
  const [sheet, setSheet] = useState(null); // "tools" | "orders" | null
  // Vol II §04 #16 — same chrome-bottom contract as BottomNav.
  const dockRef = useChromeRect("--chrome-bottom");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clear local sheet state when leaving board view
  useEffect(() => { if (state.view !== "board") setSheet(null); }, [state.view]);

  const totalTools = Object.entries(state.tools || {})
    .filter(([k, v]) => typeof v === "number" && v > 0 && TOOL_BY_KEY[k])
    .reduce((s, [, v]) => s + v, 0);
  const readyOrders = (state.orders || []).filter((o) => (state.inventory[o.key] || 0) >= o.need).length;

  const closeSheet = () => setSheet(null);

  return (
    <>
      <div ref={dockRef} className="flex border-t-2 border-[#b28b62] bg-[#3a2715]" style={{ paddingBottom: "var(--safe-bottom, 0px)" }}>
        {/* Tools */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative text-[#f8e7c6]"
          onClick={() => setSheet(sheet === "tools" ? null : "tools")}
        >
          {totalTools > 0 && (
            <div className="absolute top-1.5 right-[calc(50%-14px)] bg-[#d6612a] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {totalTools}
            </div>
          )}
          <div style={{ width: 24, height: 24 }}><IconCanvas iconKey="player_clear" size={24} /></div>
          <span className="text-[9px] font-bold">Tools</span>
        </button>

        {/* Orders */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative text-[#f8e7c6]"
          onClick={() => setSheet(sheet === "orders" ? null : "orders")}
        >
          {readyOrders > 0 && (
            <div className="absolute top-1.5 right-[calc(50%-14px)] bg-[#91bf24] text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {readyOrders}
            </div>
          )}
          <span className="text-[20px] leading-none"><Icon iconKey="ui_clipboard" size={20} /></span>
          <span className="text-[9px] font-bold">Orders</span>
        </button>
      </div>

      {sheet === "tools" && (
        <BottomSheet onClose={closeSheet}>
          <div className="text-[#f8e7c6] font-bold text-[14px] mb-3">Tools</div>
          <ToolStrip
            layout="sheet"
            tools={state.tools}
            toolPending={state.toolPending}
            fertilizerActive={state.fertilizerActive}
            onUse={(key) => {
              dispatchUseTool(dispatch, key, state);
              // Keep the sheet open for tap-target tools so the player sees the
              // armed state, then can dismiss; close immediately for instants.
              if (!isTapTargetTool(key)) closeSheet();
            }}
          />
        </BottomSheet>
      )}

      {sheet === "orders" && (
        <BottomSheet onClose={closeSheet}>
          <div className="text-[#f8e7c6] font-bold text-[14px] mb-3">Orders</div>
          <CompactOrders orders={state.orders} inventory={state.inventory} dispatch={dispatch} />
        </BottomSheet>
      )}
    </>
  );
}

/**
 * Banner that hovers over the Phaser canvas while an "armed" tap-target
 * tool is waiting for the player to point at a tile. Lets the player cancel
 * without scrolling back to the side panel.
 */
export function ArmedToolBanner({ state, dispatch }) {
  const pending = state.toolPending;
  if (!pending || !isTapTargetTool(pending)) return null;
  const def = TOOL_BY_KEY[pending];
  if (!def) return null;
  // Vol II §02 + §03: the banner wrapper sat with pointer-events: auto, which
  // ate chain-drag touchmove events when a drag started in the top row and
  // passed under the banner. The wrapper and inner card are now non-interactive
  // — only the Cancel button absorbs taps. Cancel is bumped to ~44h (py-2.5).
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="bg-[#2b1d0e]/95 border-2 border-[#ffd248] rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg max-w-[90vw]">
        <ToolIcon def={def} size={24} />
        <div className="flex flex-col">
          <div className="text-[#ffd248] font-bold text-[12px] leading-tight">{def.name} armed</div>
          <div className="text-white/80 text-[10px] leading-tight">Tap a tile on the board.</div>
        </div>
        <div className="ml-2 pointer-events-auto">
          <Button tone="iron" size="sm" onClick={() => dispatch({ type: "CANCEL_TOOL" })} aria-label="Cancel armed tool">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
