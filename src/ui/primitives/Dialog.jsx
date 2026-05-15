import { useEffect, useRef, useId, createContext, useContext } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const DialogCtx = createContext({ titleId: "", hasStickyActions: false, setHasStickyActions: () => {} });

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function useDialogBehavior(open, onClose, panelRef) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const focusables = panel.querySelectorAll(FOCUSABLE);
      const first = focusables[0] || panel;
      first.focus?.();
    }
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panel) {
        const focusables = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
          (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose, panelRef]);
}

function BackdropShell({ open, onClose, children }) {
  if (!open) return null;
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55"
      style={{ animation: "fadein 200ms ease-out both" }}
      onMouseDown={onBackdrop}
    >
      {children}
    </div>,
    document.body
  );
}

function PanelIn({ children, style }) {
  return (
    <div
      style={{
        animation: "dialogPanelIn 200ms cubic-bezier(.2,.7,.2,1) both",
        ...style,
      }}
    >
      {children}
      <style>{`@keyframes dialogPanelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export function ParchmentDialog({ open, onClose, size = "md", tone = "parchment", children, className = "" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const stickyRef = useRef(false);
  const sizeCls = SIZES[size] || SIZES.md;
  const bgCls = tone === "paper" ? "bg-paper-soft" : "bg-parchment-soft";
  useDialogBehavior(open, onClose, panelRef);
  if (!open) return null;
  return (
    <BackdropShell open={open} onClose={onClose}>
      <PanelIn>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`${bgCls} border-[4px] border-iron w-[92vw] ${sizeCls} max-h-[88dvh] flex flex-col shadow-2xl outline-none ${className}`}
          style={{ borderRadius: 20 }}
        >
          <DialogCtx.Provider
            value={{
              titleId,
              tone: "light",
              setHasStickyActions: (v) => { stickyRef.current = v; },
            }}
          >
            {children}
          </DialogCtx.Provider>
        </div>
      </PanelIn>
    </BackdropShell>
  );
}

export function StoryDialog({ open, onClose, size = "md", children, className = "" }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const sizeCls = SIZES[size] || SIZES.md;
  useDialogBehavior(open, onClose, panelRef);
  if (!open) return null;
  return (
    <BackdropShell open={open} onClose={onClose}>
      <PanelIn>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`w-[92vw] ${sizeCls} max-h-[88dvh] flex flex-col shadow-2xl outline-none border border-panel-edge ${className}`}
          style={{
            background: "linear-gradient(180deg, var(--panel-edge) 0%, var(--bg-darkest) 100%)",
            borderRadius: 22,
          }}
        >
          <DialogCtx.Provider value={{ titleId, tone: "dark" }}>
            {children}
          </DialogCtx.Provider>
        </div>
      </PanelIn>
    </BackdropShell>
  );
}

function Title({ children, className = "" }) {
  const { titleId, tone } = useContext(DialogCtx);
  const color = tone === "dark" ? "text-gold-soft" : "text-ink-soft";
  return (
    <div className={`px-5 pt-4 pb-3 flex-shrink-0 ${className}`}>
      <h2 id={titleId} className={`font-bold text-h2 ${color} m-0`}>
        {children}
      </h2>
      {tone === "dark" && (
        <div
          className="mt-3"
          style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)",
          }}
        />
      )}
    </div>
  );
}

function Portrait({ children, className = "" }) {
  return (
    <div className={`px-5 pt-1 pb-2 flex-shrink-0 flex justify-center ${className}`}>
      {children}
    </div>
  );
}

function Body({ children, className = "" }) {
  const { tone } = useContext(DialogCtx);
  const color = tone === "dark" ? "text-parchment" : "text-ink";
  return (
    <div
      className={`px-5 py-3 flex-1 min-h-0 overflow-y-auto ${color} text-body-lg ${className}`}
      style={{ overscrollBehavior: "contain" }}
    >
      {children}
    </div>
  );
}

function Actions({ children, sticky = false, className = "" }) {
  const { tone } = useContext(DialogCtx);
  const stickyCls = sticky
    ? `sticky bottom-0 flex-shrink-0 pb-safe-bottom ${tone === "dark" ? "bg-bg-darkest/95" : "bg-parchment-soft/95"} backdrop-blur-sm`
    : "flex-shrink-0";
  const borderCls = sticky
    ? tone === "dark"
      ? "border-t border-panel-edge"
      : "border-t border-iron-edge"
    : "";
  return (
    <div className={`px-5 py-3 ${stickyCls} ${borderCls} flex items-center justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}

ParchmentDialog.Title = Title;
ParchmentDialog.Portrait = Portrait;
ParchmentDialog.Body = Body;
ParchmentDialog.Actions = Actions;

StoryDialog.Title = Title;
StoryDialog.Portrait = Portrait;
StoryDialog.Body = Body;
StoryDialog.Actions = Actions;

const Dialog = { Title, Portrait, Body, Actions };
export default Dialog;
