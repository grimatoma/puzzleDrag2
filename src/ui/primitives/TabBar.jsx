/**
 * <TabBar> — UX Audit Vol II §04 #07. The BottomNav and the MobileDock are
 * two flavours of the same widget: vertical-stack icon + label, badge in the
 * corner, active highlight, safe-area inset. One density mode (`nav` vs
 * `dock`) is the only real difference.
 *
 * The primitive owns:
 *   - The flex row, the bark wash, the top-edge accent on the active item,
 *   - `--chrome-bottom` publication (so StoryBar/NpcBubble anchor above us),
 *   - `safe-area-inset-bottom` padding so labels never land in the iOS gesture zone,
 *   - Locked-slot rendering (reserve all slots, render disabled — Vol I #03),
 *   - Badge dot (number or "" for a presence indicator).
 *
 * Items shape:
 *   { key, iconKey, label, active?, badge?, badgeTone?,
 *     locked?, unlockHint?, onClick, testId? }
 *
 * Density:
 *   "nav"  — 8 items, 48h min, 10px label  (BottomNav)
 *   "dock" — 2 items, 56h min, 12px label  (MobileDock)
 */

import Icon from "../Icon.jsx";
import IconCanvas, { hasIcon } from "../IconCanvas.jsx";
import useChromeRect from "./useChromeRect.js";

const BADGE_TONE = {
  ember:   { bg: "var(--ember)", fg: "#fff" },
  moss:    { bg: "var(--moss)",  fg: "#fff" },
  gold:    { bg: "var(--gold)",  fg: "var(--ink-strong)" },
  iron:    { bg: "var(--iron)",  fg: "#fff" },
};

function TabBadge({ value, tone = "ember" }) {
  if (value == null || value === false) return null;
  const t = BADGE_TONE[tone] || BADGE_TONE.ember;
  const empty = value === "" || value === true;
  return (
    <div
      className={`absolute -top-0.5 right-1 rounded-full font-bold text-[9px] leading-none tabular-nums ${empty ? "w-2 h-2" : "min-w-[16px] h-[16px] px-1 grid place-items-center"}`}
      style={{ background: t.bg, color: t.fg, boxShadow: "0 0 0 1.5px var(--bark)" }}
      aria-hidden="true"
    >
      {empty ? null : value}
    </div>
  );
}

export default function TabBar({ items, density = "nav", className = "", testId }) {
  // Vol II §04 #16 — every TabBar variant publishes its measured height into
  // --chrome-bottom so floating elements anchor cleanly above it.
  const barRef = useChromeRect("--chrome-bottom");

  const isDock = density === "dock";
  const minH = isDock ? 56 : 48;
  const iconSize = isDock ? 24 : 18;
  const labelSize = isDock ? "text-[12px]" : "text-[10px]";

  return (
    <div
      ref={barRef}
      data-testid={testId}
      className={`flex w-full bg-[#2b2218]/95 border-t-2 border-[var(--parchment-soft)] flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,.25)] ${className}`}
      style={{ paddingBottom: "var(--safe-bottom, 0px)" }}
    >
      {items.map((it) => {
        const active = !!it.active;
        const locked = !!it.locked;
        // Vol II §06 #9 — top-edge accent + 12% wash instead of a full ember
        // flood that crushed the icon's contrast on a saturated background.
        const cls = locked
          ? "text-[var(--parchment-soft)]/40 cursor-not-allowed"
          : active
            ? "text-white bg-[var(--ember)]/15 border-t-2 border-[var(--ember)] -mt-[2px]"
            : "text-[var(--parchment-soft)] hover:bg-white/10 border-t-2 border-transparent -mt-[2px]";
        const onClick = () => {
          if (locked) return;
          it.onClick?.();
        };
        return (
          <button
            key={it.key}
            data-testid={it.testId}
            onClick={onClick}
            aria-label={locked ? `${it.label} (locked) — ${it.unlockHint || ""}` : it.label}
            aria-disabled={locked || undefined}
            title={locked ? it.unlockHint : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${cls}`}
            style={{ minHeight: minH }}
          >
            <span className="relative">
              {hasIcon(it.iconKey)
                ? <IconCanvas iconKey={it.iconKey} size={iconSize} />
                : <Icon iconKey={it.iconKey} size={iconSize} />}
              {locked && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-1.5 text-[10px] leading-none text-[var(--parchment-soft)]/70"
                >
                  🔒
                </span>
              )}
              {!locked && (it.badge != null) && (
                <TabBadge value={it.badge} tone={it.badgeTone} />
              )}
            </span>
            <span className={`${labelSize} font-bold leading-none whitespace-nowrap`}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
