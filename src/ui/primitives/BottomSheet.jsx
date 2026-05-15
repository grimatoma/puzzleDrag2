import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";

const CLOSE_THRESHOLD_PX = 80;

export default function BottomSheet({
  open,
  onClose,
  snapPoints = [0.5, 0.9],
  initialSnap,
  dismissible = true,
  title,
  children,
  className = "",
}) {
  const sheetRef = useRef(null);
  const dragRef = useRef(null);
  const titleId = useId();

  const sorted = [...snapPoints].sort((a, b) => a - b);
  const initial = initialSnap != null && sorted.includes(initialSnap) ? initialSnap : sorted[sorted.length - 1];

  const [snap, setSnap] = useState(initial);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, dismissible, onClose]);

  const onPointerDown = (e) => {
    if (!dismissible) return;
    if (e.button != null && e.button !== 0) return;
    dragRef.current = { startY: e.clientY, pointerId: e.pointerId };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    setDragOffset(Math.max(0, dy));
  };

  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    e.currentTarget.releasePointerCapture?.(dragRef.current.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (dy > CLOSE_THRESHOLD_PX && dismissible) {
      onClose?.();
    } else {
      const snapsDesc = [...sorted].reverse();
      const next = snapsDesc.find((s) => s <= snap) ?? sorted[0];
      setSnap(next);
    }
    setDragOffset(0);
  };

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget && dismissible) onClose?.();
  };

  if (!open) return null;

  const heightPct = snap * 100;
  const translateY = `calc(${100 - heightPct}% + ${dragOffset}px)`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/55"
      style={{ animation: "fadein 200ms ease-out both" }}
      onMouseDown={onBackdrop}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`fixed left-0 right-0 bottom-0 bg-parchment-soft shadow-2xl flex flex-col ${className}`}
        style={{
          height: "100dvh",
          transform: `translateY(${translateY})`,
          transition: dragging ? "none" : "transform 240ms cubic-bezier(.2,.7,.2,1)",
          animation: "bottomSheetIn 240ms cubic-bezier(.2,.7,.2,1) both",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTop: "1px solid var(--iron)",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        {dismissible && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="pt-3 pb-2 flex-shrink-0 grid place-items-center cursor-grab active:cursor-grabbing touch-none"
            aria-hidden="true"
          >
            <div className="h-1.5 w-12 rounded-full bg-iron/50" />
          </div>
        )}
        {title && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`px-5 pb-3 flex-shrink-0 ${dismissible ? "touch-none cursor-grab active:cursor-grabbing" : ""}`}
          >
            <h2 id={titleId} className="font-bold text-h3 text-ink-soft m-0">
              {title}
            </h2>
          </div>
        )}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 text-ink text-body-lg"
          style={{ overscrollBehavior: "contain" }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
