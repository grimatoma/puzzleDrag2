/**
 * <Button> — typed action element with tones from the design system.
 * Lifts the 15+ bespoke buttons called out in UX Audit Vol II §04 #09: the
 * SeasonModal CTA, the tool-detail Close, the WinBeat Continue, the trade
 * buy/sell pair, the BiomeEntryModal "Set out", etc. — all reach for one
 * inline `bg-[#…] border-2 rounded-lg` recipe today.
 *
 * Tones map to tokens in src/tokens.css:
 *   ember (primary destructive / call-to-action)
 *   moss  (primary affirmative — "Continue", "Return")
 *   gold  (story prompt submit)
 *   iron  (default — neutral parchment)
 *   ghost (text-only, no fill — modal "Close", "Cancel")
 *
 * Sizes:
 *   sm = 32h (compact rows)
 *   md = 40h (default — meets HIG 44pt with the safe-area gutter included)
 *   lg = 48h (primary CTAs in modals)
 *
 * `block` makes the button stretch its container (full-width form actions).
 */

const TONES = {
  ember: { bg: "var(--ember)", bd: "var(--ember-deep)", fg: "#fff",
           hover: "filter: brightness(1.1)" },
  moss:  { bg: "var(--moss)",  bd: "var(--moss-deep)",  fg: "#fff",
           hover: "filter: brightness(1.08)" },
  gold:  { bg: "linear-gradient(180deg, var(--gold-soft), var(--gold))",
           bd: "var(--gold)", fg: "var(--ink-strong)",
           hover: "filter: brightness(1.1)" },
  iron:  { bg: "#e8dcc4", bd: "var(--iron)", fg: "#5a3a20",
           hover: "background: #f0e3cc" },
  ghost: { bg: "transparent", bd: "transparent", fg: "var(--ink-warm)",
           hover: "background: rgba(0,0,0,0.05)" },
};

const SIZES = {
  sm: { padX: 12, padY: 6,  font: 12, gap: 6, radius: 8 },
  md: { padX: 18, padY: 9,  font: 13, gap: 7, radius: 10 },
  lg: { padX: 26, padY: 12, font: 15, gap: 8, radius: 14 },
};

export default function Button({
  tone = "iron",
  size = "md",
  variant = "solid", // "solid" | "outline" — outline strips the fill
  leading = null,
  trailing = null,
  block = false,
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  onClick,
  children,
  ...rest
}) {
  const t = TONES[tone] || TONES.iron;
  const s = SIZES[size] || SIZES.md;
  const isOutline = variant === "outline";
  const isDisabled = disabled || loading;

  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    padding: `${s.padY}px ${s.padX}px`,
    fontSize: s.font,
    fontWeight: 700,
    lineHeight: 1.2,
    borderRadius: s.radius,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: t.bd,
    background: isOutline ? "transparent" : t.bg,
    color: isOutline ? t.bd : t.fg,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.55 : 1,
    width: block ? "100%" : undefined,
    minHeight: "var(--tap-min, 32px)",
    transitionProperty: "transform, opacity, background, filter",
    transitionDuration: "120ms",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      style={style}
      className={`hover:brightness-110 active:scale-[0.97] ${className}`}
      aria-busy={loading || undefined}
      {...rest}
    >
      {leading}
      {loading ? <span aria-live="polite">…</span> : children}
      {trailing}
    </button>
  );
}
