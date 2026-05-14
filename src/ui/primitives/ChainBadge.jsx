/**
 * <ChainBadge> — single source of truth for the "chain × N · +N★ · progress"
 * readout. UX Audit Vol II §04 #11 flagged two divergent React renders (the
 * desktop SidePanel and the phone-landscape overlay in prototype.jsx) that
 * had drifted on formatting; this collapses them.
 *
 * Layouts:
 *   - side      — inline block, fits the side-panel card. The desktop look.
 *   - overlay   — pill-shape on top of the canvas. Non-interactive.
 */

export default function ChainBadge({ chainInfo, layout = "side" }) {
  if (!chainInfo) return null;
  const { count, doubled, upgrades, nextTileProgress } = chainInfo;
  const hasProgress = nextTileProgress && nextTileProgress.threshold > 0;

  if (layout === "overlay") {
    return (
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        style={{
          background: "rgba(43, 34, 24, 0.9)",
          border: "1px solid var(--gold-amber)",
          borderRadius: 999,
          padding: "4px 12px",
          color: "var(--gold-amber)",
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
        role="status"
        aria-live="polite"
      >
        chain × {count}{doubled ? " ×2" : ""}{upgrades > 0 ? `  +${upgrades}★` : ""}
        {hasProgress && (
          <span className="ml-2" style={{ fontSize: 10, color: "var(--parchment-soft)", fontWeight: 400 }}>
            ({nextTileProgress.current}/{nextTileProgress.threshold} {nextTileProgress.targetLabel})
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-3 py-2 text-center flex-shrink-0"
      style={{
        background: "rgba(43, 34, 24, 0.9)",
        border: "1px solid var(--gold-amber)",
        color: "var(--gold-amber)",
        fontWeight: 700,
        fontSize: 13,
        fontVariantNumeric: "tabular-nums",
      }}
      role="status"
      aria-live="polite"
    >
      <div>
        chain × {count}{doubled ? " ×2" : ""}{upgrades > 0 ? `  +${upgrades}★` : ""}
      </div>
      {hasProgress && (
        <div style={{ fontSize: 11, color: "var(--parchment-soft)", fontWeight: 400, marginTop: 2 }}>
          {nextTileProgress.current}/{nextTileProgress.threshold} {nextTileProgress.targetLabel}
        </div>
      )}
    </div>
  );
}
