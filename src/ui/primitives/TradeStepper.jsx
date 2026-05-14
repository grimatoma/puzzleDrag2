/**
 * <TradeStepper> — UX Audit Vol II §02 (Tap-target 2) + Vol I #06.
 *
 * Replaces the vertical TradeButton stack in the Inventory: two 18px buttons
 * stacked failed the 24px WCAG floor *and* the 44pt HIG target. A stepper
 * with 32×32 buttons collapses the same two actions into one row at half the
 * vertical cost.
 *
 * Semantics:
 *   `−`   tap          → sell 1
 *   `+`   tap          → buy 1
 *   long-press either  → batch (×5) tick repeated every 250ms until released
 *
 * `count` is shown between the buttons; price labels are inline. The dispatch
 * happens on every tick — the qty grid is *the* inventory, not local state.
 */

import { useRef } from "react";

export default function TradeStepper({
  count,
  buyPrice,
  sellPrice,
  canBuy,
  canSell,
  onBuy,
  onSell,
  reasonBuy,    // tooltip when buy disabled
  reasonSell,   // tooltip when sell disabled
}) {
  const holdRef = useRef(null);

  // Tap = ±1. Hold past 350 ms = ±5 batch repeated every 250 ms. This is the
  // cadence Vol I §03 named ("long-press = ×5; long-press hold = max-ish").
  const startHold = (fn) => {
    fn(1);
    holdRef.current = setTimeout(function repeat() {
      fn(5);
      holdRef.current = setTimeout(repeat, 250);
    }, 350);
  };
  const cancelHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };

  const buttonStyle = (disabled, tone) => ({
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    background: tone === "buy" ? "var(--moss)" : "#3a82c4",
    color: "#fff",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${tone === "buy" ? "var(--moss-deep)" : "#235a8a"}`,
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    touchAction: "manipulation",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="group"
      aria-label="Trade"
      onPointerLeave={cancelHold}
    >
      <span title={canSell ? "" : reasonSell || ""}>
        <button
          type="button"
          disabled={!canSell}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); if (canSell) startHold((q) => onSell(q)); }}
          onPointerUp={(e) => { e.stopPropagation(); cancelHold(); }}
          onPointerCancel={cancelHold}
          onClick={(e) => { e.stopPropagation(); }}
          style={buttonStyle(!canSell, "sell")}
          aria-label={`Sell at ${sellPrice}◉`}
        >
          −
        </button>
      </span>
      <span className="text-[10px] text-white/70 leading-none tabular-nums">
        {sellPrice > 0 && <span title="Sell price">{sellPrice}◉</span>}
        {sellPrice > 0 && buyPrice > 0 && <span className="mx-0.5 opacity-50">/</span>}
        {buyPrice > 0 && <span title="Buy price">{buyPrice}◉</span>}
      </span>
      <span title={canBuy ? "" : reasonBuy || ""}>
        <button
          type="button"
          disabled={!canBuy}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); if (canBuy) startHold((q) => onBuy(q)); }}
          onPointerUp={(e) => { e.stopPropagation(); cancelHold(); }}
          onPointerCancel={cancelHold}
          onClick={(e) => { e.stopPropagation(); }}
          style={buttonStyle(!canBuy, "buy")}
          aria-label={`Buy at ${buyPrice}◉`}
        >
          +
        </button>
      </span>
    </div>
  );
}
