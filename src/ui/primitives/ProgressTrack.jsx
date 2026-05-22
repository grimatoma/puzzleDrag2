const TONE_BAR = {
  ember: "bg-gradient-to-r from-ember-soft to-ember",
  moss:  "bg-gradient-to-r from-moss-soft to-moss",
  gold:  "bg-gradient-to-r from-gold-soft to-gold",
};

const TONE_FILL = {
  ember: "bg-ember",
  moss:  "bg-moss",
  gold:  "bg-gold",
};

const TONE_STROKE = {
  ember: "var(--ember)",
  moss:  "var(--moss)",
  gold:  "var(--gold)",
};

const BAR_HEIGHT = { xs: "h-1.5", sm: "h-2.5", md: "h-3.5" };
const PIP_SIZE   = { xs: "w-2 h-2", sm: "w-2.5 h-2.5", md: "w-3 h-3" };
const RING_SIZE  = { xs: 28, sm: 40, md: 56 };
const VALUE_TEXT = { xs: "text-micro", sm: "text-caption", md: "text-body" };

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function Bar({ value, max, tone, size, showValue }) {
  const pct = max > 0 ? clamp01(value / max) * 100 : 0;
  const heightCls = BAR_HEIGHT[size] || BAR_HEIGHT.md;
  const textCls = VALUE_TEXT[size] || VALUE_TEXT.md;
  const fillCls = TONE_BAR[tone] || TONE_BAR.ember;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`relative flex-1 rounded-pill bg-bg-dark/70 overflow-hidden ${heightCls}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-pill ${fillCls}`}
          style={{ width: `${pct}%` }}
        />
        {showValue === "inside" && (
          <div className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-cream ${textCls}`}>
            {value}/{max}
          </div>
        )}
      </div>
      {showValue === "after" && (
        <span className={`tabular-nums text-ink ${textCls}`}>
          {value}/{max}
        </span>
      )}
    </div>
  );
}

function Pips({ value, max, tone, size, currentMarker, showValue }) {
  const sizeCls = PIP_SIZE[size] || PIP_SIZE.md;
  const fillCls = TONE_FILL[tone] || TONE_FILL.ember;
  const textCls = VALUE_TEXT[size] || VALUE_TEXT.md;
  const pips = [];
  for (let i = 0; i < max; i++) {
    const filled = i < value;
    const isCurrent = currentMarker != null && i === currentMarker;
    const cls = isCurrent
      ? `${sizeCls} rounded-pill ring-2 ring-gold-bright ${filled ? fillCls : "bg-bg-dark/60"}`
      : `${sizeCls} rounded-pill ${filled ? fillCls : "bg-iron-soft/30"}`;
    pips.push(<span key={i} className={cls} />);
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">{pips}</div>
      {showValue === "after" && (
        <span className={`tabular-nums text-ink ${textCls}`}>{value}/{max}</span>
      )}
    </div>
  );
}

function Ring({ value, max, tone, size, showValue }) {
  const dim = RING_SIZE[size] || RING_SIZE.md;
  const stroke = Math.max(3, Math.round(dim / 10));
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? clamp01(value / max) : 0;
  const dash = c * pct;
  const textCls = VALUE_TEXT[size] || VALUE_TEXT.md;
  const color = TONE_STROKE[tone] || TONE_STROKE.ember;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="var(--bg-dark)"
          strokeOpacity="0.6"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      {showValue === "inside" && (
        <span className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-ink ${textCls}`}>
          {Math.round(pct * 100)}
        </span>
      )}
    </div>
  );
}

export default function ProgressTrack({
  value = 0,
  max = 1,
  style = "bar",
  tone = "ember",
  size = "md",
  showValue = false,
  currentMarker,
  className = "",
}) {
  let inner;
  if (style === "pips") {
    inner = <Pips value={value} max={max} tone={tone} size={size} currentMarker={currentMarker} showValue={showValue} />;
  } else if (style === "ring") {
    inner = <Ring value={value} max={max} tone={tone} size={size} showValue={showValue} />;
  } else {
    inner = <Bar value={value} max={max} tone={tone} size={size} showValue={showValue} />;
  }
  if (!className) return inner;
  return <div className={className}>{inner}</div>;
}
