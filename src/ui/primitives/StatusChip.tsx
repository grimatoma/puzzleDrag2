import type { CSSProperties, ReactNode, HTMLAttributes } from "react";
import { STATUS_TONES, type Tone } from "./statusTones.js";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Size = "xs" | "sm" | "md";

const TONES = STATUS_TONES;

const SIZES: Record<Size, string> = {
  xs: "px-1.5 py-0.5 text-[9px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-3 py-1 text-[12px]",
};

interface StatusChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className" | "style"> {
  tone?: Tone;
  size?: Size;
  uppercase?: boolean;
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export default function StatusChip({
  tone = "default",
  size = "sm",
  uppercase = false,
  mono = false,
  className = "",
  style,
  children,
  ...rest
}: StatusChipProps) {
  const t = TONES[tone] || TONES.default;
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full border font-bold leading-tight whitespace-nowrap",
        uppercase && "uppercase tracking-wide",
        mono && "font-mono",
        SIZES[size] || SIZES.sm,
        className,
      )}
      style={{
        background: t.background,
        color: t.color,
        borderColor: t.border,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
