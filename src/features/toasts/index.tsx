import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import type { Dispatch, GameState } from "../../types/state.js";
import type { Toast, ToastTone } from "./data.js";

// This feature renders a global, app-wide overlay rather than a routed
// screen/modal — `alwaysMounted` mounts it unconditionally (it manages its own
// visibility from `state.toasts`).
export const alwaysMounted = true;

const DEFAULT_DURATION = 3200;
const EXIT_MS = 220;

const TONE_CLASS: Record<ToastTone, string> = {
  gold: "bg-gold text-ink border-gold-soft",
  moss: "bg-moss text-white border-moss",
  ember: "bg-ember text-white border-ember-soft",
  info: "bg-iron text-ink border-iron-deep",
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

// One toast row. Owns its own enter/exit animation + auto-dismiss timer keyed on
// the (stable) toast id, so unrelated game-state re-renders never reset it.
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dur = toast.duration ?? DEFAULT_DURATION;
    const exitTimer = setTimeout(() => setExiting(true), dur);
    const doneTimer = setTimeout(() => onDismiss(toast.id), dur + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
    // Re-arm only when the toast identity changes — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), EXIT_MS);
  };

  const toneCls = TONE_CLASS[toast.tone ?? "gold"];
  const anim = exiting
    ? `toastOut ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) both`
    : "toastIn 200ms cubic-bezier(0.4, 0, 0.2, 1) both";

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss notification"
      className={`pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border shadow-md text-left max-w-[88vw] ${toneCls}`}
      style={{ animation: anim } as CSSProperties}
    >
      {toast.icon && hasIcon(toast.icon) && (
        <IconCanvas iconKey={toast.icon} size={26} background={null} rounded={false} className="flex-shrink-0" />
      )}
      <span className="min-w-0 leading-tight">
        <span className="block text-body font-semibold">{toast.title}</span>
        {toast.message && (
          <span className="block text-caption opacity-90 truncate">{toast.message}</span>
        )}
      </span>
    </button>
  );
}

interface ToastLayerProps {
  state: GameState;
  dispatch: Dispatch;
}

// Global toast overlay — portals to <body> so it floats above every view
// (including the board, where the bottom nav is hidden).
export default function ToastLayer({ state, dispatch }: ToastLayerProps) {
  const toasts = state.toasts ?? [];
  const onDismiss = useCallback(
    (id: string) => dispatch({ type: "TOASTS/DISMISS", id }),
    [dispatch],
  );

  if (typeof document === "undefined" || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-2 pointer-events-none"
      style={{ top: "calc(var(--chrome-top) + var(--safe-top) + 16px)" }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
