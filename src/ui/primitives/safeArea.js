/*
 * Safe-area / chrome-edge hooks (B50).
 *
 * `useChromeEdge('top' | 'bottom')` measures the size of an element and
 * publishes it as a CSS custom property (`--chrome-top` / `--chrome-bottom`)
 * on the document root. Floating elements consume it via:
 *
 *   bottom: calc(var(--chrome-bottom) + var(--safe-bottom) + 12px);
 *
 * Only one element per edge should call this hook — whatever's actually
 * mounted (HUD on top, BottomNav/MobileDock on bottom). Returns a ref to
 * attach to the measured element.
 */
import { useEffect, useRef } from "react";

const CSS_VAR = { top: "--chrome-top", bottom: "--chrome-bottom" };

export function useChromeEdge(edge) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cssVar = CSS_VAR[edge];
    if (!cssVar) return;
    const root = document.documentElement;
    const publish = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty(cssVar, `${Math.round(h)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty(cssVar, "0px");
    };
  }, [edge]);
  return ref;
}
