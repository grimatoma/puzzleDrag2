/**
 * <BottomSheet> — UX Audit Vol II §03 (Gesture #3) + §04 #05.
 *
 * The implementation that lived inline in Tools.jsx had a decorative 40×4
 * "drag handle" that lied — there was no drag wired. Either own the gesture
 * or drop the handle. This primitive owns the gesture: vertical pointer-pan
 * drags the sheet down with rubber-band on overshoot. Past ~80px (or fast
 * flick) closes; otherwise it springs back.
 *
 * Stays inside the Phaser host container — the parent is `position: relative`,
 * so `inset-0` letterboxes the sheet over the canvas/board chrome, not the
 * whole document. This keeps the sheet from clobbering the BottomNav on
 * board-only sub-views.
 *
 * Props:
 *   open         — show/hide (component returns null when false)
 *   onClose      — fires on scrim-tap, Esc, or drag past threshold
 *   title        — optional header text
 *   maxHeight    — CSS height (default 60dvh)
 *   children     — body content
 *
 * Vol II §03 Gesture #3 also asks for `touch-action: pan-y` on the body so
 * inner scroll still works — that's the default on the scrollable div.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_THRESHOLD_PX = 80;
const FLICK_VELOCITY_PXMS = 0.7;

export default function BottomSheet({
  open,
  onClose,
  title,
  maxHeight = "60dvh",
  className = "",
  children,
}) {
  // Drag state — kept in refs so we don't re-render on every pointermove.
  const sheetRef = useRef(null);
  const dragRef = useRef({ active: false, startY: 0, startTs: 0, lastY: 0, dy: 0 });
  const [dy, setDy] = useState(0); // visible translateY in px

  // Esc dismisses every modal with a Close affordance (Vol II Polish #7).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset translation when re-opened.
  useEffect(() => { if (open) setDy(0); }, [open]);

  if (!open) return null;

  const onPointerDown = (e) => {
    // Only start a drag from the header / handle, not from inside the scroll
    // body — otherwise list scrolling becomes ambiguous.
    if (!e.target.closest?.("[data-bs-handle]")) return;
    dragRef.current = { active: true, startY: e.clientY, startTs: Date.now(), lastY: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const next = e.clientY - dragRef.current.startY;
    dragRef.current.lastY = e.clientY;
    // Rubber-band on upward drag: ignore negative motion past 12px.
    const clamped = next < 0 ? Math.max(-12, next / 3) : next;
    dragRef.current.dy = clamped;
    setDy(clamped);
  };
  const onPointerUp = (e) => {
    if (!dragRef.current.active) return;
    const elapsed = Math.max(1, Date.now() - dragRef.current.startTs);
    const v = dragRef.current.dy / elapsed; // px/ms
    dragRef.current.active = false;
    if (dragRef.current.dy > CLOSE_THRESHOLD_PX || v > FLICK_VELOCITY_PXMS) {
      onClose?.();
    } else {
      setDy(0);
    }
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // Portal into the Phaser host so we live inside the game's container, not
  // over the BottomNav. (The host wrapper is the immediate parent of
  // <PhaserHost>, which has `position: relative; overflow: hidden`.)
  const host = typeof document !== "undefined"
    ? document.querySelector("[data-game-host]") || document.body
    : null;
  if (!host) return null;

  const content = (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Sheet"}
        className={`relative bg-[var(--bark-shade)] border-t-2 border-[var(--iron)] rounded-t-2xl p-4 overflow-y-auto ${className}`}
        style={{
          maxHeight,
          transform: `translateY(${Math.max(0, dy)}px)`,
          transition: dragRef.current.active ? "none" : "transform 220ms cubic-bezier(.2,.7,.2,1)",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Drag handle — now honestly draggable. Tapping it has no effect;
         *  dragging down past ~80px closes the sheet. */}
        <div
          data-bs-handle="true"
          className="w-10 h-1 bg-[var(--iron)] rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        />
        {title && (
          <div data-bs-handle="true" className="text-[var(--parchment-soft)] font-bold text-[14px] mb-3 cursor-grab active:cursor-grabbing">{title}</div>
        )}
        {children}
      </div>
    </div>
  );
  return createPortal(content, host);
}
