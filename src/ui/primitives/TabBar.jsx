import { Children, cloneElement, isValidElement } from "react";
import Icon from "./Icon.jsx";

const BADGE_TONE = {
  moss:  "bg-moss text-ink",
  ember: "bg-ember text-cream",
  gold:  "bg-gold text-ink",
};

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Badge({ count, tone = "moss" }) {
  const cls = BADGE_TONE[tone] || BADGE_TONE.moss;
  return (
    <span
      className={`absolute top-0.5 right-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-pill text-[11px] leading-none font-semibold tabular-nums pointer-events-none ${cls}`}
    >
      {count}
    </span>
  );
}

export function Tab({
  itemKey,
  iconKey,
  label,
  badge,
  locked = false,
  unlockHint,
  active = false,
  density = "nav",
  onSelect,
}) {
  const iconSize = density === "dock" ? 22 : 18;
  const labelCls = density === "dock" ? "text-caption" : "text-micro";

  const containerBase =
    density === "dock"
      ? "relative flex flex-col items-center justify-center gap-1 px-3 min-h-tap min-w-[88px] flex-1"
      : "relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-tap py-1";

  // Solid colours only — Tailwind opacity modifiers (`/85`) on var()-based
  // token colours emit invalid CSS and silently fall back to inherited
  // text colour, which reads black against the dark nav.
  const stateCls = active
    ? "bg-white/[0.07] text-cream"
    : locked
    ? "text-on-dark-faint"
    : "text-on-dark-dim hover:bg-white/[0.04]";

  const onClick = () => {
    if (locked) return;
    onSelect?.(itemKey);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      aria-disabled={locked || undefined}
      disabled={locked}
      title={locked ? unlockHint : undefined}
      className={`${containerBase} ${stateCls} transition-colors select-none`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[3px] bg-ember"
        />
      )}
      <span className="inline-flex items-center justify-center relative">
        <Icon iconKey={iconKey} size={iconSize} />
        {locked && (
          <span className="absolute -bottom-1 -right-1 text-on-dark-faint">
            <LockGlyph />
          </span>
        )}
      </span>
      <span className={`${labelCls} font-semibold leading-none whitespace-nowrap`}>
        {label}
      </span>
      {!locked && badge && typeof badge.count === "number" && badge.count > 0 && (
        <Badge count={badge.count} tone={badge.tone} />
      )}
    </button>
  );
}

export default function TabBar({
  density = "nav",
  current,
  onSelect,
  className = "",
  children,
}) {
  const containerCls =
    density === "dock"
      ? "flex items-stretch justify-around w-full bg-bg-dark border-t-2 border-cream-soft pb-safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,.25)]"
      : "flex items-stretch w-full bg-bg-dark border-t-2 border-cream-soft pb-safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,.25)]";

  const tabs = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, {
      density,
      active: child.props.itemKey === current,
      onSelect: child.props.onSelect || onSelect,
    });
  });

  return (
    <nav role="tablist" className={`${containerCls} ${className}`}>
      {tabs}
    </nav>
  );
}
