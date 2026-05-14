/**
 * <ChainBadge> — single source of truth for the "chain × N · +N★ · progress"
 * readout. UX Audit Vol II §04 #11 flagged two divergent React renders (the
 * desktop SidePanel and the phone-landscape overlay in prototype.jsx) that
 * had drifted on formatting; this collapses them.
 *
 * Layouts:
 *   - side       — inline block, fits the side-panel card. Desktop look.
 *   - overlay    — telegraph-style pill on top of the canvas. The chain
 *                  telegraph: shows yield, next-tier preview, and a
 *                  "one more = ★" hint when the player is on the cusp.
 *                  (Vol II "Chain telegraph" mid-drag overlay)
 */

import IconCanvas, { hasIcon } from "../IconCanvas.jsx";
import Icon from "../Icon.jsx";

function StarIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M6 1l1.5 3.2L11 4.8 8.5 7.2 9.1 11 6 9.1 2.9 11 3.5 7.2 1 4.8l3.5-.6L6 1z"
        fill="currentColor"
      />
    </svg>
  );
}

function NextTilePreview({ progress }) {
  if (!progress || progress.threshold <= 0) return null;
  const { current, threshold, targetLabel, targetKey } = progress;
  const remaining = Math.max(0, threshold - current);
  const onCusp = remaining === 1;
  const passed = current >= threshold;
  const iconSize = 16;
  const icon = targetKey && hasIcon(targetKey)
    ? <IconCanvas iconKey={targetKey} size={iconSize} />
    : <Icon iconKey={targetKey || "ui_star"} size={iconSize} />;
  return (
    <div
      className="flex items-center gap-1.5 mt-1 pt-1 border-t"
      style={{
        borderTopColor: "rgba(255, 210, 72, 0.3)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div className="grid place-items-center" style={{ width: iconSize, height: iconSize }}>{icon}</div>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--parchment-soft)" }}>{targetLabel}</span>
      {passed ? (
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-amber)" }} className="flex items-center gap-0.5">
          <StarIcon /> ready
        </span>
      ) : onCusp ? (
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-amber)" }} className="flex items-center gap-0.5 animate-pulse">
          one more <StarIcon />
        </span>
      ) : (
        <span style={{ fontSize: 10, fontWeight: 400, color: "var(--parchment-soft)" }}>
          {current}/{threshold}
        </span>
      )}
    </div>
  );
}

export default function ChainBadge({ chainInfo, layout = "side" }) {
  if (!chainInfo) return null;
  const { count, doubled, upgrades, nextTileProgress } = chainInfo;
  const hasProgress = nextTileProgress && nextTileProgress.threshold > 0;
  const onCusp = hasProgress && nextTileProgress.current === nextTileProgress.threshold - 1;

  if (layout === "overlay") {
    return (
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        style={{
          background: "rgba(43, 34, 24, 0.93)",
          border: `1.5px solid ${onCusp ? "var(--gold-amber)" : "rgba(255, 210, 72, 0.7)"}`,
          boxShadow: onCusp ? "0 0 20px rgba(255, 210, 72, 0.55)" : "0 4px 12px rgba(0,0,0,0.35)",
          borderRadius: 14,
          padding: "6px 14px 5px",
          color: "var(--gold-amber)",
          minWidth: hasProgress ? 168 : undefined,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
        role="status"
        aria-live="polite"
      >
        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.15, whiteSpace: "nowrap" }}>
          chain × {count}
          {doubled && <span style={{ color: "#fff", marginLeft: 6 }}>×2</span>}
          {upgrades > 0 && (
            <span style={{ marginLeft: 8, color: "var(--gold-amber)" }} className="inline-flex items-center gap-0.5">
              +{upgrades}<StarIcon />
            </span>
          )}
        </div>
        {hasProgress && <NextTilePreview progress={nextTileProgress} />}
      </div>
    );
  }

  // Side layout — desktop side-panel inline block.
  return (
    <div
      className="rounded-xl px-3 py-2 text-center flex-shrink-0"
      style={{
        background: "rgba(43, 34, 24, 0.9)",
        border: `1.5px solid ${onCusp ? "var(--gold-amber)" : "rgba(255, 210, 72, 0.7)"}`,
        boxShadow: onCusp ? "0 0 14px rgba(255, 210, 72, 0.45)" : undefined,
        color: "var(--gold-amber)",
        fontVariantNumeric: "tabular-nums",
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ fontWeight: 700, fontSize: 13 }}>
        chain × {count}
        {doubled && <span style={{ color: "#fff", marginLeft: 6 }}>×2</span>}
        {upgrades > 0 && (
          <span style={{ marginLeft: 8 }} className="inline-flex items-center gap-0.5">
            +{upgrades}<StarIcon />
          </span>
        )}
      </div>
      {hasProgress && <NextTilePreview progress={nextTileProgress} />}
    </div>
  );
}
