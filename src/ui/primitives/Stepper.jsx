/**
 * <Stepper> — minus / value / plus number input. UX Audit Vol II §04 #03.
 *
 * Replaces:
 *   - BiomeEntryModal's 24×24 +/− buttons (failed touch floor at w-6 h-6)
 *   - The implicit single-step trade buttons in Inventory (Vol I #06)
 *   - Any future "set difficulty / quantity / batch" controls
 *
 * Features:
 *   - 32×32 tap-friendly +/− buttons (Vol II §02 floor)
 *   - Long-press accelerator: tap once = ±step; hold = repeat at 8/s after
 *     a 350 ms dwell (the cadence common to native steppers)
 *   - Quick-set chips (presets) for batch sizes like [1, 5, "max"]
 *   - Tabular-nums on the value so the row doesn't jitter
 *   - Disabled state on the min/max edge
 *
 * The component is controlled — value + onChange are required. Internal
 * state is just the long-press timer ref.
 */

import { useRef } from "react";

export default function Stepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  presets, // optional: [1, 5, 10, "max"]
  size = "md", // "sm" (28h) | "md" (32h) | "lg" (40h)
  label, // optional inline label
  suffix, // optional inline suffix (e.g. "/ 50")
  ariaLabel,
  className = "",
}) {
  const holdRef = useRef(null);

  const SIZE = {
    sm: { btn: 28, font: 12 },
    md: { btn: 32, font: 13 },
    lg: { btn: 40, font: 15 },
  }[size] || { btn: 32, font: 13 };

  const clamp = (n) => Math.max(min, Math.min(max, n));
  const apply = (next) => {
    const v = clamp(next);
    if (v !== value) onChange?.(v);
  };

  const startHold = (delta) => {
    apply(value + delta);
    // 350 ms dwell, then 8/s repeat — matches iOS picker stepper feel.
    holdRef.current = setTimeout(function repeat() {
      apply((holdRef.current.v = clamp(holdRef.current.v + delta)));
      holdRef.current = setTimeout(repeat, 125);
    }, 350);
    holdRef.current.v = value + delta;
  };
  const cancelHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };

  const setPreset = (p) => {
    if (p === "max") apply(max);
    else if (p === "min") apply(min);
    else apply(p);
  };

  const buttonStyle = {
    width: SIZE.btn,
    height: SIZE.btn,
    minWidth: SIZE.btn,
    minHeight: SIZE.btn,
    background: "var(--iron)",
    color: "#fff",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: SIZE.font + 2,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--iron-deep)",
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  };

  const minusDisabled = value <= min;
  const plusDisabled = value >= max;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={ariaLabel}
      role="group"
    >
      {label && <span className="text-[11px] text-[var(--ink-warm)] font-bold">{label}</span>}
      <button
        type="button"
        disabled={minusDisabled}
        onPointerDown={(e) => { e.preventDefault(); if (!minusDisabled) startHold(-step); }}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        style={{ ...buttonStyle, opacity: minusDisabled ? 0.4 : 1 }}
        aria-label="Decrease"
      >
        −
      </button>
      <span
        className="font-bold tabular-nums text-center inline-block"
        style={{ minWidth: 44, fontSize: SIZE.font + 1, color: "var(--ink-strong)" }}
      >
        {value}{suffix ? <span className="text-[var(--ink-mute)] font-normal ml-0.5">{suffix}</span> : null}
      </span>
      <button
        type="button"
        disabled={plusDisabled}
        onPointerDown={(e) => { e.preventDefault(); if (!plusDisabled) startHold(step); }}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        style={{ ...buttonStyle, opacity: plusDisabled ? 0.4 : 1 }}
        aria-label="Increase"
      >
        +
      </button>
      {presets && presets.length > 0 && (
        <div className="flex gap-1 ml-1">
          {presets.map((p) => (
            <button
              key={String(p)}
              type="button"
              onClick={() => setPreset(p)}
              className="text-[10px] font-bold px-1.5 py-1 rounded border border-[var(--iron)]/40 text-[var(--ink-warm)] hover:bg-black/5"
            >
              {p === "max" ? "max" : `×${p}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
