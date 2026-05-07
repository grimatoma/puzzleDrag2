import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTooltip, Tooltip } from "./Tooltip.jsx";
import { CompactOrders } from "./Inventory.jsx";
import { getPhaserScene } from "../phaserBridge.js";

export const TOOL_DEFS = [
  { key: "clear", icon: "⚔", name: "Scythe", desc: "Clears tiles from the board and collects +5 basic resources." },
  { key: "basic", icon: "+", name: "Seedpack", desc: "Instantly adds +5 basic resources to your inventory." },
  { key: "rare", icon: "★", name: "Lockbox", desc: "Grants +2 rare resources directly to your inventory." },
  { key: "shuffle", icon: "↻", name: "Reshuffle Horn", desc: "Reshuffles all tiles on the board for a fresh layout." },
];

export function ToolsGrid({ tools, onUse }) {
  const { tip: tooltipTip, show: showTooltip, hide: hideTooltip, lastTouchTime } = useTooltip();
  const [modalTool, setModalTool] = useState(null);
  const longPressTimer = useRef(null);
  const longPressOccurred = useRef(false);

  const startLongPress = (t) => {
    longPressOccurred.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressOccurred.current = true;
      setModalTool(t);
    }, 500);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current);
  };

  const tooltipDef = tooltipTip ? TOOL_DEFS.find((t) => t.key === tooltipTip.data) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {TOOL_DEFS.map((t) => {
          const amt = tools[t.key] || 0;
          const empty = amt === 0;
          return (
            <div key={t.key} className="relative">
              <button
                disabled={empty}
                aria-label={`Use ${t.name}${empty ? " (none left)" : ""}`}
                onClick={() => {
                  if (longPressOccurred.current) { longPressOccurred.current = false; return; }
                  onUse(t.key);
                }}
                onMouseEnter={(e) => { if (Date.now() - lastTouchTime.current > 600) showTooltip(t.key, e.currentTarget); }}
                onMouseLeave={() => { if (Date.now() - lastTouchTime.current > 600) hideTooltip(); }}
                onTouchStart={(e) => {
                  lastTouchTime.current = Date.now();
                  startLongPress(t);
                  showTooltip(t.key, e.currentTarget);
                }}
                onTouchEnd={() => { cancelLongPress(); hideTooltip(2000); }}
                onTouchCancel={() => { cancelLongPress(); hideTooltip(2000); }}
                onTouchMove={() => cancelLongPress()}
                className={`relative w-full rounded-lg border-2 border-[#e6c49a] py-1.5 px-1 flex flex-col items-center gap-0.5 transition-transform ${empty ? "bg-[#9a724d] opacity-40 cursor-not-allowed" : "bg-[#9a724d] hover:bg-[#b8845a] hover:-translate-y-0.5"}`}
              >
                {amt > 0 && <div className="absolute -top-1 -right-1 bg-[#2b2218] text-white border border-[#f7e2b6] rounded-full px-1.5 text-[10px] font-bold">{amt}</div>}
                <div className="text-[20px] leading-none text-white">{t.icon}</div>
                <div className="text-[9px] font-bold text-white">{t.name}</div>
              </button>
            </div>
          );
        })}
      </div>
      {tooltipDef && (
        <Tooltip
          anchorX={tooltipTip.x}
          anchorY={tooltipTip.y}
          className="z-[9999] w-36 bg-[#2b1d0e] text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg pointer-events-none border border-[#e6c49a]"
          arrowClassName="border-4 border-transparent border-t-[#2b1d0e]"
        >
          <div className="font-bold text-[11px] mb-0.5">{tooltipDef.name}</div>
          <div className="text-white/80 leading-snug">{tooltipDef.desc}</div>
        </Tooltip>
      )}
      {modalTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalTool(null)}>
          <div className="bg-[#3d2310] border-2 border-[#e6c49a] rounded-2xl p-5 max-w-[260px] w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-[36px] text-center mb-1 leading-none">{modalTool.icon}</div>
            <div className="text-white font-bold text-[17px] text-center mb-2">{modalTool.name}</div>
            <div className="text-white/80 text-[12px] text-center leading-relaxed">{modalTool.desc}</div>
            <button
              onClick={() => setModalTool(null)}
              className="mt-4 w-full bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-2 rounded-lg border border-[#e6c49a] text-[13px] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
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

export function PortraitToolsBar({ state, dispatch }) {
  return (
    <div className="bg-[#3a2715] border-t border-[#b28b62] px-3 py-2 flex-shrink-0">
      <div className="grid grid-cols-4 gap-2">
        {TOOL_DEFS.map((t) => {
          const amt = state.tools[t.key] || 0;
          const empty = amt === 0;
          return (
            <button
              key={t.key}
              disabled={empty}
              aria-label={`Use ${t.name}${empty ? " (none left)" : ""}`}
              onClick={() => {
                dispatch({ type: "USE_TOOL", key: t.key });
                if (t.key === "shuffle") getPhaserScene()?.shuffleBoard();
              }}
              className={`relative flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 border-[#e6c49a] transition-transform ${empty ? "bg-[#9a724d] opacity-40 cursor-not-allowed" : "bg-[#9a724d] hover:bg-[#b8845a] active:-translate-y-0.5"}`}
            >
              {amt > 0 && <div className="absolute -top-1 -right-1 bg-[#2b2218] text-white border border-[#f7e2b6] rounded-full px-1.5 text-[9px] font-bold leading-none py-0.5">{amt}</div>}
              <div className="text-[18px] leading-none text-white">{t.icon}</div>
              <div className="text-[8px] font-bold text-white/90">{t.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MobileDock({ state, dispatch }) {
  const [sheet, setSheet] = useState(null); // "tools" | "orders" | null

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clear local sheet state when leaving board view
  useEffect(() => { if (state.view !== "board") setSheet(null); }, [state.view]);

  const totalTools = Object.values(state.tools || {}).reduce((s, v) => s + v, 0);
  const readyOrders = (state.orders || []).filter((o) => (state.inventory[o.key] || 0) >= o.need).length;

  const closeSheet = () => setSheet(null);

  return (
    <>
      <div className="flex border-t-2 border-[#b28b62] bg-[#3a2715]">
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
          <span className="text-[20px] leading-none">⚔</span>
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
          <span className="text-[20px] leading-none">📋</span>
          <span className="text-[9px] font-bold">Orders</span>
        </button>
      </div>

      {sheet === "tools" && (
        <BottomSheet onClose={closeSheet}>
          <div className="text-[#f8e7c6] font-bold text-[14px] mb-3">Tools</div>
          <ToolsGrid
            tools={state.tools}
            onUse={(key) => {
              dispatch({ type: "USE_TOOL", key });
              if (key === "shuffle") getPhaserScene()?.shuffleBoard();
              closeSheet();
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
