import type { HTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

interface ChipBaseProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string;
  children?: ReactNode;
}

export function CostChip({ className = "", children, ...rest }: ChipBaseProps) {
  return (
    <span className={cx("hl-cost-tag", className)} {...rest}>
      {children}
    </span>
  );
}

interface RequirementChipProps extends ChipBaseProps {
  ok?: boolean;
}

export function RequirementChip({ ok = false, className = "", children, ...rest }: RequirementChipProps) {
  return (
    <span className={cx("hl-chip", ok ? "hl-chip--ok" : "hl-chip--missing", className)} {...rest}>
      {children}
    </span>
  );
}

export function RewardChip({ className = "", children, ...rest }: ChipBaseProps) {
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
