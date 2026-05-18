import { UI_COLORS } from "./palette.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const TONES = {
  default: {
    bg: UI_COLORS.parchmentDeep,
    border: UI_COLORS.border,
    label: UI_COLORS.inkSubtle,
    value: UI_COLORS.ink,
  },
  muted: {
    bg: UI_COLORS.parchmentDeep,
    border: UI_COLORS.border,
    label: UI_COLORS.inkSubtle,
    value: UI_COLORS.inkSubtle,
  },
  ember: {
    bg: "#fff5e6",
    border: UI_COLORS.ember,
    label: UI_COLORS.emberDeep,
    value: UI_COLORS.ember,
  },
  success: {
    bg: "rgba(90,158,75,0.10)",
    border: UI_COLORS.greenDeep,
    label: UI_COLORS.greenDeep,
    value: UI_COLORS.greenDeep,
  },
  warning: {
    bg: "rgba(226,178,74,0.14)",
    border: "#b88a10",
    label: "#7a5810",
    value: "#7a5810",
  },
  danger: {
    bg: "rgba(194,59,34,0.10)",
    border: UI_COLORS.red,
    label: UI_COLORS.redDeep,
    value: UI_COLORS.red,
  },
};

export function MetricGrid({ children, className = "" }) {
  return (
    <div className={cx("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
      {children}
    </div>
  );
}

export default function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  align = "center",
  className = "",
  valueClassName = "",
}) {
  const t = TONES[tone] || TONES.default;
  const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
  return (
    <div
      className={cx("flex flex-col justify-center px-2 py-2 rounded-lg border-2 gap-1", alignClass, className)}
      style={{ background: t.bg, borderColor: `${t.border}55` }}
    >
      <div className={cx("text-[18px] font-bold tabular-nums leading-none", valueClassName)} style={{ color: t.value }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: t.label }}>
        {label}
      </div>
      {hint && (
        <div className="text-[10px] italic leading-snug" style={{ color: UI_COLORS.inkSubtle }}>
          {hint}
        </div>
      )}
    </div>
  );
}
