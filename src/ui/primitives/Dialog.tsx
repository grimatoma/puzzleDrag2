import { useEffect, useRef, useId, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { useExitTransition } from "./useExitTransition.js";

const DIALOG_EXIT_MS = 140;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const DialogCtx = createContext({ titleId: "", hasStickyActions: false, setHasStickyActions: () => {} });

const SIZES: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function useDialogBehavior(open: any, onClose: any, panelRef: any) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const focusables = panel.querySelectorAll(FOCUSABLE);
      const first = focusables[0] || panel;
      first.focus?.();
    }
    const onKey = (e: any) => {
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

function BackdropShell({ exiting, onClose, closeOnBackdrop = true, className = "", children }: { exiting: any; onClose: any; closeOnBackdrop?: boolean; className?: string; children?: any }) {
  const onBackdrop = (e: any) => {
    if (closeOnBackdrop && e.target === e.currentTarget && onClose) onClose();
  };
  const anim = exiting
    ? `backdropOut ${DIALOG_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) both`
    : "fadein 200ms cubic-bezier(0.4, 0, 0.2, 1) both";
  return createPortal(
    <div
      className={`hl-backdrop ${className}`}
      style={{ animation: anim }}
      onMouseDown={onBackdrop}
    >
      {children}
    </div>,
    document.body
  );
}

function PanelIn({ exiting, children, style }: { exiting: any; children?: any; style?: any }) {
  const anim = exiting
    ? `dialogPanelOut ${DIALOG_EXIT_MS}ms cubic-bezier(.4,.0,.6,1) both`
    : "dialogPanelIn 200ms cubic-bezier(.2,.7,.2,1) both";
  return (
    <div style={{ animation: anim, ...style }}>
      {children}
    </div>
  );
}

export function ParchmentDialog({
  open,
  onClose,
  size = "md",
  tone = "parchment",
  ariaLabel,
  backdropClassName = "",
  closeOnBackdrop = true,
  children,
  className = "",
}: {
  open: any;
  onClose: any;
  size?: string;
  tone?: string;
  ariaLabel?: any;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  children?: any;
  className?: string;
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const stickyRef = useRef(false);
  const sizeCls = SIZES[size] || SIZES.md;
  const bgCls = tone === "paper" ? "bg-paper-soft" : "bg-parchment-soft";
  const { shouldRender, exiting } = useExitTransition(open, DIALOG_EXIT_MS);
  useDialogBehavior(open, onClose, panelRef);
  if (!shouldRender) return null;
  return (
    <BackdropShell exiting={exiting} onClose={onClose} closeOnBackdrop={closeOnBackdrop} className={backdropClassName}>
      <PanelIn exiting={exiting}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabel ? undefined : titleId}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={`${bgCls} border-[4px] border-iron w-[92vw] ${sizeCls} max-h-[88dvh] flex flex-col shadow-2xl outline-none ${className}`}
          style={{ borderRadius: 20 }}
        >
          <DialogCtx.Provider
            value={{
              titleId,
              tone: "light",
              setHasStickyActions: (v: any) => { stickyRef.current = v; },
            }}
          >
            {children}
          </DialogCtx.Provider>
        </div>
      </PanelIn>
    </BackdropShell>
  );
}

export function StoryDialog({
  open,
  onClose,
  size = "md",
  ariaLabel,
  backdropClassName = "",
  closeOnBackdrop = true,
  children,
  className = "",
}: {
  open: any;
  onClose: any;
  size?: string;
  ariaLabel?: any;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  children?: any;
  className?: string;
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const sizeCls = SIZES[size] || SIZES.md;
  const { shouldRender, exiting } = useExitTransition(open, DIALOG_EXIT_MS);
  useDialogBehavior(open, onClose, panelRef);
  if (!shouldRender) return null;
  return (
    <BackdropShell exiting={exiting} onClose={onClose} closeOnBackdrop={closeOnBackdrop} className={backdropClassName}>
      <PanelIn exiting={exiting}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabel ? undefined : titleId}
          aria-label={ariaLabel}
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

function Title({ children, className = "" }: { children?: any; className?: string }) {
  const { titleId, tone } = useContext(DialogCtx) as any;
  const color = tone === "dark" ? "text-ink" : "text-ink-soft";
  return (
    <div className={`px-5 pt-4 pb-3 flex-shrink-0 ${className}`}>
      <h2
        id={titleId}
        className={`font-bold text-h2 ${color} m-0`}
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.015em" }}
      >
        {children}
      </h2>
      <div
        className="mt-3"
        style={{
          height: 1,
          background: tone === "dark"
            ? "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)"
            : "linear-gradient(90deg, transparent, rgba(178,139,98,0.45), transparent)",
        }}
      />
    </div>
  );
}

function Portrait({ children, className = "" }: { children?: any; className?: string }) {
  return (
    <div className={`px-5 pt-1 pb-2 flex-shrink-0 flex justify-center ${className}`}>
      {children}
    </div>
  );
}

function Body({ children, className = "" }: { children?: any; className?: string }) {
  const color = "text-ink";
  return (
    <div
      className={`px-5 py-3 flex-1 min-h-0 overflow-y-auto ${color} text-body-lg ${className}`}
      style={{ overscrollBehavior: "contain" }}
    >
      {children}
    </div>
  );
}

function Actions({ children, sticky = false, className = "" }: { children?: any; sticky?: boolean; className?: string }) {
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
