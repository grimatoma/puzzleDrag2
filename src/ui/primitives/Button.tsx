const TONE_SOLID = {
  ember: "hl-btn--primary",
  moss: "hl-btn--go",
  gold: "hl-btn--primary",
  iron: "hl-btn--neutral",
  ghost: "hl-btn--ghost",
  danger: "hl-btn--danger",
};

const TONE_SOFT = {
  ember: "hl-btn--primary",
  moss: "hl-btn--go",
  gold: "hl-btn--ghost",
  iron: "hl-btn--neutral-soft",
  ghost: "hl-btn--ghost",
  danger: "hl-btn--danger",
};

const SIZES = {
  sm: "hl-btn--sm",
  md: "",
  lg: "px-5 py-2 text-body-lg",
};

function Spinner({ size = "md" }) {
  const dim = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Button({
  tone = "iron",
  size = "md",
  variant = "solid",
  leading,
  block = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  onClick,
  type = "button",
  ...rest
}) {
  const toneMap = variant === "solid" ? TONE_SOLID : TONE_SOFT;
  const toneCls = toneMap[tone] || toneMap.iron;
  const sizeCls = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const classes = [
    "hl-btn select-none",
    sizeCls,
    toneCls,
    block ? "w-full" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        leading != null && <span className="inline-flex items-center shrink-0">{leading}</span>
      )}
      {children != null && <span className="inline-flex items-center">{children}</span>}
    </button>
  );
}
