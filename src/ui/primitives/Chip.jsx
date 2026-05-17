function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function CostChip({ className = "", children, ...rest }) {
  return (
    <span className={cx("hl-cost-tag", className)} {...rest}>
      {children}
    </span>
  );
}

export function RequirementChip({ ok = false, className = "", children, ...rest }) {
  return (
    <span className={cx("hl-chip", ok ? "hl-chip--ok" : "hl-chip--missing", className)} {...rest}>
      {children}
    </span>
  );
}

export function RewardChip({ className = "", children, ...rest }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-bold border",
        "bg-[#f2d98a] border-[#b09a50] text-[#6a4f10]",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
