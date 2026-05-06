import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── Tooltip hook ──────────────────────────────────────────────────────────
// tip: null | { data, x, y }
// handlers(data) returns the full set of mouse/touch event props with all
// mobile fixes applied (synthetic-mouseleave guard, 2s touch dismiss, etc.)
export function useTooltip() {
  const [tip, setTip] = useState(null);
  const lastTouchTime = useRef(0);
  const dismissTimer = useRef(null);

  const show = (data, el) => {
    clearTimeout(dismissTimer.current);
    const rect = el.getBoundingClientRect();
    setTip({ data, x: rect.left + rect.width / 2, y: rect.top });
  };

  const hide = (delay = 0) => {
    clearTimeout(dismissTimer.current);
    if (delay > 0) {
      dismissTimer.current = setTimeout(() => setTip(null), delay);
    } else {
      setTip(null);
    }
  };

  const handlers = (data) => ({
    onMouseEnter: (e) => { if (Date.now() - lastTouchTime.current > 600) show(data, e.currentTarget); },
    onMouseLeave: () => { if (Date.now() - lastTouchTime.current > 600) hide(); },
    onTouchStart: (e) => { lastTouchTime.current = Date.now(); show(data, e.currentTarget); },
    onTouchEnd: () => hide(2000),
    onTouchCancel: () => hide(2000),
  });

  return { tip, show, hide, handlers, lastTouchTime };
}

// Tooltip portal that clamps horizontally to the viewport so it never
// gets cut off near the screen edges, and shifts its tail to keep
// pointing at the anchor.
export function Tooltip({ anchorX, anchorY, gap = 8, edgeMargin = 8, className = "", style, arrowClassName, children }) {
  const ref = useRef(null);
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = rect.width;
    const minLeft = edgeMargin;
    const maxLeft = vw - edgeMargin - w;
    let leftEdge = anchorX - w / 2;
    leftEdge = maxLeft < minLeft ? minLeft : Math.max(minLeft, Math.min(maxLeft, leftEdge));
    const tailLeft = Math.max(10, Math.min(w - 10, anchorX - leftEdge));
    setLayout({ leftEdge, tailLeft });
  }, [anchorX, anchorY, gap, edgeMargin, children]);

  return createPortal(
    <div
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        left: layout ? layout.leftEdge : anchorX,
        top: anchorY - gap,
        transform: layout ? "translateY(-100%)" : "translate(-50%, -100%)",
        visibility: layout ? "visible" : "hidden",
        ...style,
      }}
    >
      {children}
      {arrowClassName && (
        <div
          className={arrowClassName}
          style={{
            position: "absolute",
            top: "100%",
            left: layout ? layout.tailLeft : "50%",
            transform: "translateX(-50%)",
          }}
        />
      )}
    </div>,
    document.body
  );
}
