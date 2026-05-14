/**
 * <Dialog> — single modal-chrome primitive. Two visual variants:
 *
 *   <ParchmentDialog>  cream/iron card on a scrim — the SeasonModal /
 *                      BiomeEntryModal / tool-detail family
 *   <StoryDialog>      dark parchment-and-iron with the gold hairline —
 *                      the StoryStagePanel family (the audit's "gold
 *                      standard", Vol II §05)
 *
 * Both ship with the things the audit asked every modal to bake in
 * (Vol II §04 #04):
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - Escape-to-close (when `onClose` is provided)
 *   - focus trap inside the dialog while open
 *   - sticky bottom action bar slot so the CTA never hides below the fold
 *     on a short phone
 *   - safe-area-aware bottom padding (`--safe-bottom`)
 *   - landscape and `max-[640px]` overrides folded into one place
 *
 * Use the composition slots:
 *   <Dialog open onClose={...}>
 *     <Dialog.Title>Harvest Complete</Dialog.Title>
 *     <Dialog.Body>{...}</Dialog.Body>
 *     <Dialog.Actions>
 *       <Button tone="moss">Return</Button>
 *     </Dialog.Actions>
 *   </Dialog>
 */

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const node = ref.current;
    const prevFocus = document.activeElement;
    // Defer one frame so autofocus targets land first
    const id = requestAnimationFrame(() => {
      const focusables = node.querySelectorAll(FOCUSABLE);
      if (focusables.length && !node.contains(document.activeElement)) {
        focusables[0].focus();
      }
    });

    function onKeyDown(e) {
      if (e.key !== "Tab") return;
      const focusables = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      node.removeEventListener("keydown", onKeyDown);
      // Restore focus to the caller so screen-reader users land back where
      // they came from (Vol II §07 Accessibility).
      if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
    };
  }, [active, ref]);
}

function useEscape(active, onClose) {
  useEffect(() => {
    if (!active || !onClose) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

const PARCHMENT_SHELL = {
  parchment: {
    surface: "#f4ecd8",
    edge: "var(--iron)",
    color: "var(--ink-strong)",
    radius: 20,
  },
  dark: {
    surface: "linear-gradient(180deg, #221710 0%, #1a110a 100%)",
    edge: "#3a2a1d",
    color: "var(--parchment)",
    radius: 22,
  },
};

const SIZES = {
  sm: { width: 360, max: 420 },
  md: { width: 460, max: 560 },
  lg: { width: 560, max: 720 },
};

export function Dialog({
  open,
  onClose,
  tone = "parchment",
  size = "md",
  labelledBy = "dialog-title",
  describedBy,
  children,
  className = "",
}) {
  const cardRef = useRef(null);
  useFocusTrap(cardRef, !!open);
  useEscape(!!open, onClose);
  if (!open) return null;
  const shell = PARCHMENT_SHELL[tone] || PARCHMENT_SHELL.parchment;
  const sz = SIZES[size] || SIZES.md;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="absolute inset-0 bg-black/55 grid place-items-center z-50 animate-fadein"
      // Click on the scrim (but not the card) dismisses — matches
      // BottomSheet / Tools modal precedent. Disabled when no onClose given.
      onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div
        ref={cardRef}
        className={`flex flex-col shadow-2xl ${className}`}
        style={{
          width: `min(92vw, ${sz.width}px)`,
          maxWidth: sz.max,
          maxHeight: "min(88dvh, 720px)",
          background: shell.surface,
          border: `${tone === "parchment" ? 4 : 1}px solid ${shell.edge}`,
          color: shell.color,
          borderRadius: shell.radius,
          // Sticky-action room — pad bottom for the safe-area inset so any
          // <Dialog.Actions> doesn't crash into the home indicator.
          paddingBottom: "var(--safe-bottom, 0px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Title({ id = "dialog-title", children, className = "" }) {
  return (
    <h2
      id={id}
      className={`font-bold text-[var(--ink-strong)] text-[22px] leading-tight px-6 pt-5 pb-2 text-center ${className}`}
      style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif' }}
    >
      {children}
    </h2>
  );
}

function Body({ children, className = "" }) {
  return (
    <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-2 ${className}`} style={{ overscrollBehavior: "contain" }}>
      {children}
    </div>
  );
}

/**
 * Sticky action footer — always pinned to the bottom of the dialog so the
 * CTA stays visible even when the body scrolls (Vol II §03 — modal CTAs
 * regularly hide below the fold on phones with the keyboard open).
 */
function Actions({ children, className = "" }) {
  return (
    <div
      className={`flex justify-center items-center gap-3 px-6 py-4 border-t border-[var(--iron)]/30 flex-shrink-0 ${className}`}
      style={{ background: "rgba(0,0,0,0.02)" }}
    >
      {children}
    </div>
  );
}

Dialog.Title = Title;
Dialog.Body = Body;
Dialog.Actions = Actions;

/** Cream/iron variant — the parchment family. */
export function ParchmentDialog(props) {
  return <Dialog tone="parchment" {...props} />;
}

/** Dark parchment-and-iron variant — the StoryStagePanel family. */
export function StoryDialog(props) {
  return <Dialog tone="dark" {...props} />;
}
