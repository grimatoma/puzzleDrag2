import { useEffect, useState } from "react";

/**
 * Canonical viewport breakpoints (px). Single source of truth for the
 * JavaScript-side responsive branches that used to hardcode 768 / 720 / 600 in
 * scattered files (inventory, Popover, GameScene).
 *
 * CSS media queries mirror these values — when you change one here, update the
 * matching `@media` rule and the comment that points back to this file:
 *   - `phone`        → Tailwind `screens.md` (tailwind.config.js)
 *   - `browserStack` → components.css `.hl-browser-detail__body` stack rule
 *   - `desktop`      → components.css `.hl-browser-detail` wide rule
 */
export const BREAKPOINTS = {
  /**
   * Phone vs. tablet/desktop. Feature views that keep an always-visible detail
   * pane on wider screens collapse to a single column below this.
   */
  phone: 768,
  /**
   * Two-pane browser/detail panels stack vertically at or below this (portrait
   * phones — comfortably above a phone rotated to landscape, which keeps the
   * side-by-side layout). Mirrors components.css `.hl-browser-detail__body`.
   */
  browserStack: 720,
  /** Below this the Phaser board frame uses tighter decorative padding. */
  boardFrameNarrow: 600,
  /**
   * Mobile portrait: the per-station crafting "up-next" row wraps below the
   * head row. CSS-only — mirrored in src/index.css `.craft-strip-upnext`.
   */
  craftStrip: 480,
  /**
   * At or above this, wide feature views cap + center their content instead of
   * spreading a handful of items across the full panel width. components.css.
   */
  desktop: 900,
} as const;

/** Non-reactive check — safe to call outside React (event handlers, layout math). */
export function isViewportBelow(maxWidth: number): boolean {
  return typeof window !== "undefined" && window.innerWidth < maxWidth;
}

/** Non-reactive convenience: phone-width viewport (< BREAKPOINTS.phone). */
export const isPhoneViewport = (): boolean => isViewportBelow(BREAKPOINTS.phone);

/** Reactively tracks whether the viewport width is below `maxWidth`. SSR-safe. */
export function useViewportBelow(maxWidth: number): boolean {
  const [below, setBelow] = useState(() => isViewportBelow(maxWidth));
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setBelow(window.innerWidth < maxWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxWidth]);
  return below;
}

/** Reactive convenience: true on phone-width viewports (< BREAKPOINTS.phone). */
export function useIsPhoneViewport(): boolean {
  return useViewportBelow(BREAKPOINTS.phone);
}
