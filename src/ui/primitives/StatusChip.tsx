import type { CSSProperties, ReactNode, HTMLAttributes } from "react";
import { UI_COLORS } from "./palette.js";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Tone = "default" | "muted" | "success" | "warning" | "danger" | "ember" | "gold" | "slate" | "info";
type Size = "xs" | "sm" | "md";

interface ToneSpec { background: string; color: string; border: string }

const TONES: Record<Tone, ToneSpec> = {
  default: {
    background: UI_COLORS.parchmentDeep,
    color: UI_COLORS.inkLight,
    border: UI_COLORS.border,
  },
  muted: {
    background: "rgba(43,34,24,0.06)",
    color: UI_COLORS.inkSubtle,
    border: "rgba(43,34,24,0.16)",
  },
  success: {
    background: "rgba(90,158,75,0.12)",
    color: UI_COLORS.greenDeep,
    border: "rgba(90,158,75,0.42)",
  },
  warning: {
    background: "rgba(226,178,74,0.16)",
    color: "#7a5810",
    border: "rgba(226,178,74,0.5)",
  },
  danger: {
    background: "rgba(194,59,34,0.10)",
    color: UI_COLORS.redDeep,
    border: "rgba(194,59,34,0.42)",
  },
  ember: {
    background: "rgba(214,97,42,0.12)",
    color: UI_COLORS.emberDeep,
    border: "rgba(214,97,42,0.42)",
  },
  gold: {
    background: "rgba(244,214,90,0.35)",
    color: "#6a4f10",
    border: "rgba(176,154,80,0.65)",
  },
  slate: {
    background: "rgba(90,94,102,0.14)",
    color: "#3a3e42",
    border: "rgba(90,94,102,0.38)",
  },
  info: {
    background: "rgba(126,122,166,0.14)",
    color: "#5a4f8a",
    border: "rgba(126,122,166,0.42)",
  },
};

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
