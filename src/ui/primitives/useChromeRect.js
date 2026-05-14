/**
 * useChromeRect — publishes a CSS variable with the rendered height of the
 * element. Used by Hud, BottomNav, and MobileDock to write live values into
 *   --chrome-top    (HUD height — Hud writes this)
 *   --chrome-bottom (BottomNav / MobileDock height — whichever is mounted)
 *
 * Floating elements (StoryBar, NpcBubble) anchor to these values instead of
 * hard-coding `bottom: 56`, which the audit flagged as the cause of the
 * StoryBar covering the BottomNav at the wrong viewport heights
 * (UX Audit Vol II §04 #16).
 *
 * The hook uses a ResizeObserver to track the element across breakpoint
 * changes (so the var updates when the HUD wraps a row, when the dock
 * mounts/unmounts, etc.). On unmount it clears the var so the next surface
 * doesn't see a stale offset.
 */

import { useLayoutEffect, useRef } from "react";

export default function useChromeRect(cssVar) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const root = document.documentElement;
    const write = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      root.style.setProperty(cssVar, `${h}px`);
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => {
      ro.disconnect();
      // Reset to the token default. If another surface mounted in the
      // meantime, it will write its own value on next observer tick.
      root.style.setProperty(cssVar, "0px");
    };
  }, [cssVar]);

  return ref;
}
