import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEventHandler, ReactNode, TouchEventHandler } from "react";
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

interface Position {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

function computePosition(anchorRect: DOMRect, contentRect: DOMRect, placement: PopoverPlacement): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 8;
  let resolved: "top" | "bottom";
  if (placement === "auto") {
    const spaceTop = anchorRect.top;
    const spaceBottom = vh - anchorRect.bottom;
    resolved = spaceBottom >= contentRect.height + gap + VIEWPORT_MARGIN || spaceBottom >= spaceTop ? "bottom" : "top";
  } else {
    resolved = placement;
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

type PopoverPlacement = "auto" | "top" | "bottom";
type PopoverTrigger = "tap" | "hover" | "long-press" | "right-click";
type PopoverDensity = "compact" | "rich";

interface PopoverProps {
  trigger?: PopoverTrigger;
  placement?: PopoverPlacement;
  density?: PopoverDensity;
  anchor: ReactNode;
  content: ReactNode;
}

interface TriggerProps {
  onMouseEnter?: MouseEventHandler<HTMLSpanElement>;
  onMouseLeave?: MouseEventHandler<HTMLSpanElement>;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  onTouchStart?: TouchEventHandler<HTMLSpanElement>;
  onTouchMove?: TouchEventHandler<HTMLSpanElement>;
  onTouchEnd?: TouchEventHandler<HTMLSpanElement>;
  onTouchCancel?: TouchEventHandler<HTMLSpanElement>;
  onContextMenu?: MouseEventHandler<HTMLSpanElement>;
}

export default function Popover({
  trigger = "tap",
  placement = "auto",
  density = "compact",
  anchor,
  content,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const openIt = useCallback(() => setOpen(true), []);

  useLayoutEffect(() => {
    if (!open || (isPhone() && density === "rich")) return;
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
    const onDocDown = (e: Event) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
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

  const triggerProps: TriggerProps = {};
  if (trigger === "hover") {
    triggerProps.onMouseEnter = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(openIt, HOVER_DELAY_MS);
    };
    triggerProps.onMouseLeave = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(close, HOVER_DELAY_MS);
    };
  } else if (trigger === "tap") {
    triggerProps.onClick = () => setOpen((v) => !v);
  } else if (trigger === "long-press") {
    triggerProps.onTouchStart = (e) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(openIt, LONG_PRESS_MS);
    };
    triggerProps.onTouchMove = (e) => {
      if (!touchStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        touchStart.current = null;
      }
    };
    triggerProps.onTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      touchStart.current = null;
    };
    triggerProps.onTouchCancel = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
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
        animation: "fadein 150ms cubic-bezier(0.4, 0, 0.2, 1) both",
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
