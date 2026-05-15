import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BottomSheet from "./BottomSheet.jsx";

const LONG_PRESS_MS = 500;
const HOVER_DELAY_MS = 200;
const MOVE_TOLERANCE = 8;
const VIEWPORT_MARGIN = 8;

function isPhone() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

function computePosition(anchorRect, contentRect, placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 8;
  let resolved = placement;
  if (placement === "auto") {
    const spaceTop = anchorRect.top;
    const spaceBottom = vh - anchorRect.bottom;
    resolved = spaceBottom >= contentRect.height + gap + VIEWPORT_MARGIN || spaceBottom >= spaceTop ? "bottom" : "top";
  }
  let top = resolved === "top"
    ? anchorRect.top - contentRect.height - gap
    : anchorRect.bottom + gap;
  let left = anchorRect.left + anchorRect.width / 2 - contentRect.width / 2;
  if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
  if (top + contentRect.height > vh - VIEWPORT_MARGIN) top = vh - VIEWPORT_MARGIN - contentRect.height;
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
  if (left + contentRect.width > vw - VIEWPORT_MARGIN) left = vw - VIEWPORT_MARGIN - contentRect.width;
  return { top, left, placement: resolved };
}

export default function Popover({
  trigger = "tap",
  placement = "auto",
  density = "compact",
  anchor,
  content,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const contentRef = useRef(null);
  const longPressTimer = useRef(null);
  const touchStart = useRef(null);
  const hoverTimer = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  const openIt = useCallback(() => setOpen(true), []);

  useLayoutEffect(() => {
    if (!open || isPhone() && density === "rich") return;
    const anchorEl = anchorRef.current;
    const contentEl = contentRef.current;
    if (!anchorEl || !contentEl) return;
    const reposition = () => {
      const a = anchorEl.getBoundingClientRect();
      const c = contentEl.getBoundingClientRect();
      setPos(computePosition(a, c, placement));
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, placement, density]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (contentRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const triggerProps = {};
  if (trigger === "hover") {
    triggerProps.onMouseEnter = () => {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(openIt, HOVER_DELAY_MS);
    };
    triggerProps.onMouseLeave = () => {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(close, HOVER_DELAY_MS);
    };
  } else if (trigger === "tap") {
    triggerProps.onClick = () => setOpen((v) => !v);
  } else if (trigger === "long-press") {
    triggerProps.onTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
      clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(openIt, LONG_PRESS_MS);
    };
    triggerProps.onTouchMove = (e) => {
      if (!touchStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        clearTimeout(longPressTimer.current);
        touchStart.current = null;
      }
    };
    triggerProps.onTouchEnd = () => {
      clearTimeout(longPressTimer.current);
      touchStart.current = null;
    };
    triggerProps.onTouchCancel = () => {
      clearTimeout(longPressTimer.current);
      touchStart.current = null;
    };
  } else if (trigger === "right-click") {
    triggerProps.onContextMenu = (e) => {
      e.preventDefault();
      setOpen(true);
    };
  }

  const anchorEl = (
    <span ref={anchorRef} className="inline-flex" {...triggerProps}>
      {anchor}
    </span>
  );

  const phoneRich = open && density === "rich" && isPhone();

  const popoverPanel = open && !phoneRich ? createPortal(
    <div
      ref={contentRef}
      role={trigger === "hover" ? "tooltip" : "dialog"}
      className={
        density === "compact"
          ? "bg-parchment-soft text-ink border border-iron rounded-md shadow-xl px-2.5 py-1.5 text-caption"
          : "bg-parchment-soft text-ink border-2 border-iron rounded-lg shadow-2xl p-4 text-body-lg max-w-sm"
      }
      style={{
        position: "fixed",
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        zIndex: 60,
        visibility: pos ? "visible" : "hidden",
        animation: "fadein 150ms ease-out both",
      }}
    >
      {content}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {anchorEl}
      {popoverPanel}
      {phoneRich && (
        <BottomSheet open={open} onClose={close} snapPoints={[0.5, 0.9]} initialSnap={0.5} dismissible>
          {content}
        </BottomSheet>
      )}
    </>
  );
}
