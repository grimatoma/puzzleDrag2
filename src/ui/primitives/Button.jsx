const TONE_SOLID = {
  ember: "bg-ember text-cream hover:bg-ember-hot",
  moss:  "bg-moss text-ink hover:bg-moss-soft",
  gold:  "bg-gold text-ink hover:bg-gold-soft",
  iron:  "bg-iron text-cream hover:bg-iron-soft",
  ghost: "bg-transparent text-ink hover:bg-iron-soft/20",
};

const TONE_OUTLINE = {
  ember: "bg-transparent text-ember border border-ember hover:bg-ember/10",
  moss:  "bg-transparent text-moss border border-moss hover:bg-moss/10",
  gold:  "bg-transparent text-gold border border-gold hover:bg-gold/10",
  iron:  "bg-transparent text-iron border border-iron hover:bg-iron/10",
  ghost: "bg-transparent text-ink border border-ink-light/40 hover:bg-iron-soft/15",
};

const TONE_GHOST = {
  ember: "bg-transparent text-ember hover:bg-ember/10",
  moss:  "bg-transparent text-moss hover:bg-moss/10",
  gold:  "bg-transparent text-gold hover:bg-gold/10",
  iron:  "bg-transparent text-iron hover:bg-iron/10",
  ghost: "bg-transparent text-ink hover:bg-iron-soft/15",
};

const SIZES = {
  sm: "h-8 px-3 text-body gap-1.5",
  md: "h-10 px-4 text-body-lg gap-2",
  lg: "h-12 px-5 text-large gap-2",
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
  const toneMap = variant === "outline" ? TONE_OUTLINE : variant === "ghost" ? TONE_GHOST : TONE_SOLID;
  const toneCls = toneMap[tone] || toneMap.iron;
  const sizeCls = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const classes = [
    "inline-flex items-center justify-center font-medium rounded-md select-none",
    "transition-colors",
    sizeCls,
    toneCls,
    block ? "w-full" : "",
    isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
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
