/**
 * <ProgressTrack> — bar / pips / ring render of a value/max ratio.
 * UX Audit Vol II §04 #12.
 *
 * Replaces:
 *   - Hud XP bar          (was: bespoke 110×26 pill with text overlay)
 *   - Hud LarderWidget    (was: 5× 40×8 bespoke bars)
 *   - Hud SeasonBar pips  (was: row of 10×10 circles)
 *
 * Three styles:
 *   bar   — horizontal pill, optional inline label
 *   pips  — discrete dots (use for "turns remaining", "5/10 stages")
 *   ring  — circular indicator (use for "expedition turns left")
 *
 * Tones (from src/tokens.css):
 *   ember (XP, energy, run heat)
 *   moss  (food, supply, "you're full")
 *   gold  (festival larder when complete)
 *   indigo (cool / passive — e.g. tide turn counter)
 */

const TONES = {
  ember:  "var(--ember)",
  moss:   "var(--moss)",
  gold:   "var(--gold-amber)",
  indigo: "var(--indigo)",
  rose:   "var(--rose)",
};

const SIZE = {
  xs: { bar: 6,  pip: 8,  ring: 24 },
  sm: { bar: 10, pip: 10, ring: 32 },
  md: { bar: 14, pip: 12, ring: 44 },
};

export default function ProgressTrack({
  value = 0,
  max = 1,
  style = "bar",
  size = "sm",
  tone = "ember",
  showValue = "after", // "inside" | "after" | false
  currentMarker, // pips: highlight an index (e.g. current turn)
  className = "",
  ariaLabel,
  width = 110,
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const s = SIZE[size] || SIZE.sm;
  const color = TONES[tone] || TONES.ember;

  const a11y = {
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-label": ariaLabel,
  };

  if (style === "pips") {
    const count = Math.max(1, max | 0);
    return (
      <div className={`flex gap-1 items-center ${className}`} {...a11y}>
        {Array.from({ length: count }).map((_, i) => {
          const filled = i < value;
          const current = i === currentMarker;
          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: s.pip,
                height: s.pip,
                borderRadius: 999,
                background: filled ? color : "#fff",
                border: filled ? "1px solid transparent" : "1px solid #8a6a3a",
                boxShadow: current ? `0 0 0 2px rgba(255,122,0,.55)` : "none",
                transition: "transform 120ms",
                transform: filled ? "scale(1.05)" : "none",
              }}
            />
          );
        })}
        {showValue && (
          <span className="text-[11px] font-bold text-[var(--ink-warm)] tabular-nums ml-1">
            {value}/{count}
          </span>
        )}
      </div>
    );
  }

  if (style === "ring") {
    const r = s.ring / 2 - 3;
    const c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    return (
      <div className={`relative inline-block ${className}`} style={{ width: s.ring, height: s.ring }} {...a11y}>
        <svg width={s.ring} height={s.ring} viewBox={`0 0 ${s.ring} ${s.ring}`} aria-hidden="true">
          <circle cx={s.ring / 2} cy={s.ring / 2} r={r} stroke="rgba(0,0,0,0.12)" strokeWidth="3" fill="none" />
          <circle
            cx={s.ring / 2} cy={s.ring / 2} r={r}
            stroke={color} strokeWidth="3" fill="none"
            strokeDasharray={c} strokeDashoffset={off}
            strokeLinecap="round"
            transform={`rotate(-90 ${s.ring / 2} ${s.ring / 2})`}
          />
        </svg>
        {showValue && (
          <span
            className="absolute inset-0 grid place-items-center text-[11px] font-bold text-[var(--ink-strong)] tabular-nums"
          >
            {value}
          </span>
        )}
      </div>
    );
  }

  // bar — default
  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{
        width,
        height: s.bar + 16,
        background: "var(--paper)",
        border: "2px solid var(--iron)",
      }}
      {...a11y}
    >
      <div
        className="h-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
      {showValue === "inside" && (
        <span
          className="absolute inset-0 grid place-items-center text-[11px] font-bold text-white tabular-nums"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}
        >
          {value} / {max}
        </span>
      )}
      {showValue === "after" && (
        <span className="ml-2 text-[11px] font-bold text-[var(--ink-warm)] tabular-nums">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
