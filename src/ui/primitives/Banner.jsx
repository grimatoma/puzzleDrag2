/**
 * <Banner> — inline informational strip. UX Audit Vol II §04 #10.
 *
 * The same visual unit shows up scattered across:
 *   - Inventory · "Build the Caravan Post to enable trading"
 *   - Inventory · status legend (ready / needed / excess)
 *   - Hud · Sandbox Mode pill (when it's *informational*, not a chip)
 *   - StoryBar · "Board paused while we talk" caption
 *
 * One primitive with four tones — info / success / warning / danger.
 *
 * The `dismissible` flag adds a 32×32 close button (Vol II §02 tap-floor).
 * The `action` slot accepts an inline <Button> for "Build it →"-style CTAs.
 */

const TONES = {
  info:    { bg: "rgba(56,64,107,0.10)",   bd: "rgba(56,64,107,0.40)",   fg: "var(--ink-strong)", glyph: "ⓘ" },
  success: { bg: "rgba(120,170,90,0.14)",  bd: "rgba(120,170,90,0.45)",  fg: "var(--ink-strong)", glyph: "✓" },
  warning: { bg: "rgba(226,178,74,0.16)",  bd: "rgba(226,178,74,0.50)",  fg: "var(--ink-strong)", glyph: "⚠" },
  danger:  { bg: "rgba(214,97,42,0.14)",   bd: "rgba(214,97,42,0.45)",   fg: "var(--ink-strong)", glyph: "!" },
};

export default function Banner({
  tone = "info",
  icon,
  children,
  action,
  dismissible = false,
  onDismiss,
  className = "",
  role,
}) {
  const t = TONES[tone] || TONES.info;
  return (
    <div
      role={role || (tone === "danger" || tone === "warning" ? "alert" : "status")}
      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 ${className}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.fg,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <span className="flex-shrink-0 mt-0.5 text-[15px] leading-none" aria-hidden="true">
        {icon || t.glyph}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 grid place-items-center text-[var(--ink-mute)] hover:text-[var(--ink-strong)]"
          style={{ width: 32, height: 32, marginTop: -4, marginRight: -6 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
