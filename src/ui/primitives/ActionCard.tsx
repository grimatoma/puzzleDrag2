function cx(...parts: any[]) {
  return parts.filter(Boolean).join(" ");
}

const PROGRESS_TONES: Record<string, string> = {
  ember: "var(--ember)",
  moss: "var(--moss)",
  gold: "var(--gold)",
  danger: "#9a3a2a",
};

export function ProgressBar({
  value = 0,
  max = 1,
  tone = "ember",
  color,
  className = "",
  trackClassName = "",
}: { value?: number; max?: number; tone?: string; color?: any; className?: string; trackClassName?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx("h-2.5 rounded-full overflow-hidden bg-[#2b2218]/25", trackClassName, className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color || PROGRESS_TONES[tone] || PROGRESS_TONES.ember }}
      />
    </div>
  );
}

export default function ActionCard({
  as: Component = "div" as any,
  interactive = false,
  className = "",
  children,
  ...rest
}: { as?: any; interactive?: boolean; className?: string; children?: any; [x: string]: any }) {
  return (
    <Component
      className={cx(
        "hl-card gap-2",
        interactive && "hl-card--interactive",
        Component === "button" && "text-left w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

function Row({ className = "", children }: { className?: string; children?: any }) {
  return <div className={cx("flex items-center gap-2", className)}>{children}</div>;
}

function Content({ className = "", children }: { className?: string; children?: any }) {
  return <div className={cx("flex-1 min-w-0", className)}>{children}</div>;
}

function Title({ className = "", children }) {
  return <div className={cx("hl-card-title leading-tight", className)}>{children}</div>;
}

function Meta({ className = "", children }) {
  return <div className={cx("hl-card-meta leading-snug", className)}>{children}</div>;
}

function Actions({ className = "", children }) {
  return <div className={cx("flex-shrink-0 flex items-center gap-1.5", className)}>{children}</div>;
}

ActionCard.Row = Row;
ActionCard.Content = Content;
ActionCard.Title = Title;
ActionCard.Meta = Meta;
ActionCard.Actions = Actions;
ActionCard.ProgressBar = ProgressBar;
