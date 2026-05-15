const TONES = {
  info:    { surface: "bg-iron-soft/25 border-iron",  text: "text-ink",   iconColor: "text-iron-deep" },
  success: { surface: "bg-moss-soft/30 border-moss",  text: "text-ink",   iconColor: "text-moss" },
  warning: { surface: "bg-gold-soft/35 border-gold",  text: "text-ink",   iconColor: "text-iron-deep" },
  danger:  { surface: "bg-rose/15 border-rose",       text: "text-rose",  iconColor: "text-rose" },
};

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Banner({
  tone = "info",
  icon,
  action,
  dismissible = false,
  onDismiss,
  className = "",
  children,
  ...rest
}) {
  const t = TONES[tone] || TONES.info;
  const classes = [
    "flex items-center gap-3 min-h-tap w-full px-3 py-2 border rounded-md text-body",
    t.surface,
    t.text,
    className,
  ].filter(Boolean).join(" ");

  return (
    <div role="status" className={classes} {...rest}>
      {icon != null && <span className={`inline-flex items-center shrink-0 ${t.iconColor}`}>{icon}</span>}
      <div className="flex-1 min-w-0">{children}</div>
      {action != null && <div className="shrink-0">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-ink/10 ${t.iconColor}`}
        >
          <CloseGlyph />
        </button>
      )}
    </div>
  );
}
