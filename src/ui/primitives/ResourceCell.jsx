import Icon from "./Icon.jsx";
import { iconLabel } from "../../textures/iconRegistry.js";

const DENSITY = {
  micro: {
    minH: 40,
    iconSize: 20,
    pad: "px-2 py-1",
    gap: "gap-1.5",
    countCls: "text-caption font-semibold tabular-nums",
    labelCls: "hidden",
    layout: "row",
  },
  compact: {
    minH: 56,
    iconSize: 24,
    pad: "px-2.5 py-1.5",
    gap: "gap-2",
    countCls: "text-body font-semibold tabular-nums",
    labelCls: "text-body text-ink truncate",
    layout: "row",
  },
  comfortable: {
    minH: 80,
    iconSize: 32,
    pad: "px-3 py-2",
    gap: "gap-2",
    countCls: "text-body-lg font-semibold tabular-nums",
    labelCls: "text-caption text-ink-soft truncate",
    layout: "stack",
  },
};

const STATUS = {
  ready:  { glyph: "✓", color: "text-moss",          ring: "border-moss" },
  needed: { glyph: "↑", color: "text-gold",          ring: "border-gold" },
  excess: { glyph: "−", color: "text-parchment-dim", ring: "border-iron-soft" },
};

function humanize(key) {
  if (!key) return "";
  const idx = key.lastIndexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function ProgressBar({ current, target }) {
  const t = Math.max(1, target || 1);
  const pct = Math.max(0, Math.min(100, Math.round((current / t) * 100)));
  return (
    <div className="w-full h-1 rounded-full bg-iron-soft/30 overflow-hidden">
      <div
        className="h-full bg-moss rounded-full transition-all"
        style={{ width: pct + "%" }}
      />
    </div>
  );
}

function StatusGlyph({ status }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span
      aria-label={status}
      className={"inline-flex items-center justify-center w-4 h-4 text-caption font-bold leading-none " + s.color}
    >
      {s.glyph}
    </span>
  );
}

export default function ResourceCell({
  resourceKey,
  count = 0,
  density = "comfortable",
  progress,
  status,
  actions,
  onTap,
  className = "",
  ...rest
}) {
  const d = DENSITY[density] || DENSITY.comfortable;
  const s = status ? STATUS[status] : null;
  const label = iconLabel(resourceKey) || humanize(resourceKey);

  const baseCls = [
    "w-full flex flex-col rounded-md border bg-paper text-ink",
    "transition-colors",
    s ? s.ring : "border-iron-soft",
    d.pad,
    className,
  ].filter(Boolean).join(" ");

  const interactiveCls = onTap
    ? " cursor-pointer hover:bg-paper-soft hover:border-iron"
    : "";

  const minHStyle = { minHeight: d.minH };

  const headerLayout =
    d.layout === "stack"
      ? "flex items-start " + d.gap
      : "flex items-center " + d.gap;

  const inner = (
    <>
      <div className={headerLayout}>
        <Icon iconKey={resourceKey} size={d.iconSize} title={label} />
        {d.layout === "stack" ? (
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={d.labelCls + " flex-1"}>{label}</span>
              <span className={d.countCls}>{count}</span>
              {s && <StatusGlyph status={status} />}
            </div>
          </div>
        ) : (
          <>
            {density !== "micro" && (
              <span className={d.labelCls + " flex-1 min-w-0"}>{label}</span>
            )}
            <span className={d.countCls + (density === "micro" ? " ml-auto" : "")}>
              {count}
            </span>
            {s && <StatusGlyph status={status} />}
          </>
        )}
      </div>
      {progress && progress.target > 0 && (
        <div className="mt-1.5">
          <ProgressBar current={progress.current} target={progress.target} />
          {density === "comfortable" && (
            <div className="mt-0.5 text-micro text-ink-light tabular-nums">
              {progress.current}/{progress.target}
            </div>
          )}
        </div>
      )}
      {actions && d.layout === "stack" && (
        <div className="mt-1.5 flex items-center justify-end gap-1.5">{actions}</div>
      )}
      {actions && d.layout !== "stack" && density !== "micro" && (
        <div className="mt-1.5 flex items-center justify-end gap-1.5">{actions}</div>
      )}
    </>
  );

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={baseCls + interactiveCls + " text-left"}
        style={minHStyle}
        aria-label={label + " " + count}
        {...rest}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={baseCls} style={minHStyle} {...rest}>
      {inner}
    </div>
  );
}
