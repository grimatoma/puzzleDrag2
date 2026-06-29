// Shared inline-expand ("accordion") engine + animated row.
//
// This is the portrait/stacked presentation used by the browser tabs
// (Inventory, Workers, Crafting, Buildings): a vertical list where tapping a
// row expands its detail body in place with a max-height transition. At/above
// BREAKPOINTS.browserStack each tab uses the two-pane BrowserDetailLayout
// instead — the expand list is portrait-only.
//
// The animation is driven by a small state machine: SELECT sets `displayedKey`
// (the expanded body mounts at max-height:0), a requestAnimationFrame then
// dispatches OPEN (body transitions to its open height). Closing reverses it
// and waits for the max-height `transitionend` to finalize, so the body stays
// mounted through the collapse animation. This is the same engine the Inventory
// grid caret-accordion uses; see InventoryAccordion in Inventory.tsx.

import { useCallback, useEffect, useReducer, type ReactNode } from "react";
import { BrowserItemButton } from "./BrowserDetail.jsx";

export interface AccordionState {
  displayedKey: string | null;
  isOpen: boolean;
  pendingKey: string | null;
}

export interface AccordionAction {
  type: "SELECT" | "SELECT_IN_PLACE" | "OPEN" | "CLOSE" | "TRANSITION_END" | "RESET";
  key?: string;
}

export const accordionInitialState: AccordionState = { displayedKey: null, isOpen: false, pendingKey: null };

export function accordionReducer(state: AccordionState, action: AccordionAction): AccordionState {
  switch (action.type) {
    case "SELECT": {
      const { key } = action;
      if (key === state.displayedKey && state.isOpen) {
        return { ...state, isOpen: false, pendingKey: null };
      }
      if (state.displayedKey && state.isOpen) {
        return { ...state, isOpen: false, pendingKey: key ?? null };
      }
      if (!state.displayedKey) {
        return { displayedKey: key ?? null, isOpen: false, pendingKey: null };
      }
      return { ...state, pendingKey: key ?? null };
    }
    case "SELECT_IN_PLACE": {
      const { key } = action;
      if (key === state.displayedKey) {
        return { ...state, isOpen: false, pendingKey: null };
      }
      return { displayedKey: key ?? null, isOpen: true, pendingKey: null };
    }
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false, pendingKey: null };
    // Fully clear selection in one step. List view collapses instantly
    // (no max-height animation, so no TRANSITION_END fires to finalize the
    // close), so it needs to drop `displayedKey` directly.
    case "RESET":
      return accordionInitialState;
    case "TRANSITION_END":
      if (state.isOpen) return state;
      return state.pendingKey
        ? { displayedKey: state.pendingKey, isOpen: false, pendingKey: null }
        : { displayedKey: null, isOpen: false, pendingKey: null };
    default:
      return state;
  }
}

export interface AccordionApi {
  displayedKey: string | null;
  isOpen: boolean;
  /** Toggle a row with the open/close animation (rAF enter + transitionend close). */
  select: (key: string) => void;
  /** Swap directly to a row with no enter animation (used by instant list views). */
  selectInPlace: (key: string) => void;
  /** Animate the currently-open row closed. */
  close: () => void;
  /** Clear the selection immediately, skipping the close animation. */
  closeImmediate: () => void;
  /** Call from the body's max-height `transitionend` to finalize a close. */
  onClosed: () => void;
}

export function useAccordion(): AccordionApi {
  const [state, dispatch] = useReducer(accordionReducer, accordionInitialState);

  // Trigger the enter animation after displayedKey is set. A *double* rAF is
  // required: the body mounts at max-height:0, and we must let the browser
  // paint that collapsed frame before flipping to is-open. Otherwise the mount
  // and the class change land in the same frame and the element jumps straight
  // to its open height with no transition — the row-swap case (ExpandRow),
  // where the body is freshly mounted on every open rather than persisting.
  useEffect(() => {
    if (!state.displayedKey) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => dispatch({ type: "OPEN" }));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [state.displayedKey]);

  const select = useCallback((key: string) => dispatch({ type: "SELECT", key }), []);
  const selectInPlace = useCallback((key: string) => dispatch({ type: "SELECT_IN_PLACE", key }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const closeImmediate = useCallback(() => dispatch({ type: "RESET" }), []);
  const onClosed = useCallback(() => dispatch({ type: "TRANSITION_END" }), []);

  return { displayedKey: state.displayedKey, isOpen: state.isOpen, select, selectInPlace, close, closeImmediate, onClosed };
}

export interface ExpandRowProps {
  /** True when this row is the displayed (expanded) one. */
  open: boolean;
  /** Animation flag: body is at its open height when true, collapsing when false. */
  isOpen: boolean;
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned count shown (tabular-nums) in both collapsed and expanded headers. */
  meta?: string | number | null;
  /** Collapsed-only status pill (passed through to BrowserItemButton). */
  status?: ReactNode;
  muted?: boolean;
  /** Toggle handler — wire to accordion.select(key). */
  onToggle: () => void;
  /** Finalize-close handler — wire to accordion.onClosed. */
  onClosed: () => void;
  /** Accessible label for the collapsed row button. */
  expandLabel?: string;
  /** Accessible label for the expanded (collapse) row button. */
  collapseLabel?: string;
  /** Extra class on the animated body wrapper, e.g. for a taller open cap when
   *  the body itself contains a nested expand list. */
  bodyClassName?: string;
  /** Detail body, revealed when expanded. */
  children: ReactNode;
}

/**
 * One row of an expand list. Collapsed it renders as a BrowserItemButton;
 * expanded it shows the same header plus an animated detail body. The single
 * source of header data (icon/title/subtitle/meta) keeps the two states in
 * sync. Pair with useAccordion in the parent to enforce single-open behaviour.
 */
export function ExpandRow({
  open,
  isOpen,
  icon,
  title,
  subtitle,
  meta,
  status,
  muted = false,
  onToggle,
  onClosed,
  expandLabel,
  collapseLabel,
  bodyClassName = "",
  children,
}: ExpandRowProps) {
  if (!open) {
    return (
      <BrowserItemButton
        selected={false}
        muted={muted}
        icon={icon}
        title={title}
        subtitle={subtitle}
        count={meta ?? null}
        status={status}
        onClick={onToggle}
        aria-label={expandLabel}
      />
    );
  }

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Only react to this row's OWN body collapsing — a nested expand list's
    // transitionend bubbles here too and must not finalize-close the parent.
    if (e.target === e.currentTarget && e.propertyName === "max-height" && !isOpen) onClosed?.();
  };

  return (
    <div className="hl-browser-item is-selected hl-browser-item--expanded">
      <button
        type="button"
        className="hl-browser-item__row"
        onClick={onToggle}
        aria-expanded="true"
        aria-label={collapseLabel}
      >
        <span className="hl-browser-item__icon">{icon}</span>
        <span className="hl-browser-item__main">
          <span className="hl-browser-item__title">{title}</span>
          {subtitle && <span className="hl-browser-item__subtitle">{subtitle}</span>}
        </span>
        {meta != null && (
          <span className="hl-browser-item__meta">
            <span className="tabular-nums">{meta}</span>
          </span>
        )}
      </button>
      <div
        className={`hl-expand-body${bodyClassName ? ` ${bodyClassName}` : ""}${isOpen ? " is-open" : ""}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="hl-browser-item__details">{children}</div>
      </div>
    </div>
  );
}
