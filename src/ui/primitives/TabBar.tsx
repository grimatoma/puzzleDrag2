import { Children, cloneElement, isValidElement } from "react";
import Icon from "./Icon.jsx";
import { useCountUp } from "./useCountUp.js";

const BADGE_TONE: Record<string, string> = {
  moss:  "bg-moss text-white",
  ember: "bg-ember text-white",
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

interface BadgeInfo {
  count: number;
  tone?: string;
}

function Badge({ count, tone = "moss" }: { count: number; tone?: string }) {
  const cls = BADGE_TONE[tone] || BADGE_TONE.moss;
  const { pulse, pulseKey } = useCountUp(count);
  return (
    <span
      key={pulseKey}
      data-count-pulse={pulse || undefined}
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
}: {
  itemKey: string;
  iconKey: string;
  label: React.ReactNode;
  badge?: BadgeInfo;
  locked?: boolean;
  unlockHint?: string;
  active?: boolean;
  density?: string;
  onSelect?: (key: string) => void;
}) {
  const iconSize = density === "dock" ? 22 : 18;
  const labelCls = density === "dock" ? "text-caption" : "text-micro";

  const containerBase =
    density === "dock"
      ? "relative flex flex-col items-center justify-center gap-1 px-3 min-h-tap min-w-[88px] flex-1"
      : "relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-tap py-1";

  const stateCls = active
    ? "bg-ember/10 text-ink"
    : locked
    ? "text-ink-light"
    : "text-ink-soft hover:bg-ink/[0.05]";

  const onClick = () => {
    if (locked) return;
    onSelect?.(itemKey);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={`nav-${itemKey}`}
      aria-label={typeof label === "string" ? label : undefined}
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
          <span className="absolute -bottom-1 -right-1 text-ink-light">
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
}: {
  density?: string;
  current?: string;
  onSelect?: (key: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const containerCls =
    density === "dock"
      ? "flex items-stretch justify-around w-full bg-paper border-t-2 border-iron shadow-[0_-4px_12px_rgba(0,0,0,.12)]"
      : "flex items-stretch w-full bg-paper border-t-2 border-iron shadow-[0_-4px_12px_rgba(0,0,0,.12)]";

  const tabs = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    // Tab's props match the signature we're cloneElement-ing in; the cast is the
    // standard React API shape but TS can't infer it through Children.map.
    const childProps = child.props as { itemKey?: string; onSelect?: (key: string) => void };
    return cloneElement(child as React.ReactElement<{ density?: string; active?: boolean; onSelect?: (key: string) => void }>, {
      density,
      active: childProps.itemKey === current,
      onSelect: childProps.onSelect || onSelect,
    });
  });

  return (
    <nav role="tablist" className={`${containerCls} ${className}`}>
      {tabs}
    </nav>
  );
}
