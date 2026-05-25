import { useCallback, useEffect, useRef } from "react";

const SIZES = {
  sm: { btn: 32, value: "text-body", chip: "h-7 px-2 text-caption" },
  md: { btn: 40, value: "text-body-lg", chip: "h-7 px-2 text-caption" },
};

function clamp(n, min, max) {
  if (typeof min === "number" && n < min) n = min;
  if (typeof max === "number" && n > max) n = max;
  return n;
}

function MinusGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Stepper({
  value = 0,
  min = 0,
  max,
  step = 1,
  onChange,
  accelerator = false,
  presets,
  size = "md",
  label,
  suffix,
  className = "",
  disabled = false,
}) {
  const s = SIZES[size] || SIZES.md;
  const atMin = typeof min === "number" && value <= min;
  const atMax = typeof max === "number" && value >= max;

  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const holdRef = useRef({ timeout: null, interval: null });

  const apply = useCallback((delta) => {
    if (disabled || !onChange) return;
    const next = clamp(valueRef.current + delta, min, max);
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    }
  }, [disabled, onChange, min, max]);

  const stopHold = useCallback(() => {
    const h = holdRef.current;
    if (h.timeout) { clearTimeout(h.timeout); h.timeout = null; }
    if (h.interval) { clearInterval(h.interval); h.interval = null; }
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const handlePressStart = useCallback((delta) => {
    if (!accelerator) return;
    stopHold();
    holdRef.current.timeout = setTimeout(() => {
      let tick = 0;
      const slow = 1000 / 6;
      const fast = 1000 / 12;
      const fire = () => {
        apply(delta);
        tick += 1;
        const next = tick > 6 ? fast : slow;
        holdRef.current.interval = setTimeout(fire, next);
      };
      fire();
    }, 500);
  }, [accelerator, apply, stopHold]);

  const dec = () => apply(-step);
  const inc = () => apply(+step);

  const btnCls = (active) => [
    "inline-flex items-center justify-center rounded-md font-medium select-none transition-colors",
    "bg-ember text-cream hover:bg-ember-hot",
    active ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
  ].join(" ");

  const btnStyle = { width: s.btn, height: s.btn };
  const glyphSize = Math.round(s.btn * 0.55);

  const handlePreset = (p) => {
    if (disabled || !onChange) return;
    if (p === "max") {
      if (typeof max === "number") onChange(clamp(max, min, max));
      return;
    }
    onChange(clamp(p, min, max));
  };

  return (
    <div className={"inline-flex flex-col items-stretch gap-1.5 " + className}>
      <div className="inline-flex items-center gap-2">
        {label != null && (
          <span className="text-body text-ink-soft mr-1">{label}</span>
        )}
        <button
          type="button"
          aria-label="decrement"
          disabled={atMin || disabled}
          onClick={dec}
          onPointerDown={() => handlePressStart(-step)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
          className={btnCls(atMin || disabled)}
          style={btnStyle}
        >
          <MinusGlyph size={glyphSize} />
        </button>
        <span
          className={"inline-flex items-center justify-center min-w-[2ch] tabular-nums font-semibold text-ink " + s.value}
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="increment"
          disabled={atMax || disabled}
          onClick={inc}
          onPointerDown={() => handlePressStart(+step)}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
          className={btnCls(atMax || disabled)}
          style={btnStyle}
        >
          <PlusGlyph size={glyphSize} />
        </button>
        {suffix != null && (
          <span className="text-caption text-ink-light tabular-nums ml-1">{suffix}</span>
        )}
      </div>
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((p, idx) => {
            const labelText = p === "max" ? "max" : String(p);
            const isDisabled =
              disabled ||
              (p !== "max" && typeof max === "number" && p > max) ||
              (p !== "max" && typeof min === "number" && p < min);
            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => handlePreset(p)}
                className={[
                  "inline-flex items-center justify-center rounded-md select-none font-medium",
                  "bg-transparent text-ink border border-ink-light/40 hover:bg-iron-soft/20",
                  s.chip,
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                {labelText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
