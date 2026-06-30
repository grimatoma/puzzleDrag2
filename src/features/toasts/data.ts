/**
 * Global toast notifications — a small, transient message queue surfaced over
 * the whole app (quest completions, future one-off alerts). Toasts live on
 * `state.toasts`, are NOT persisted (see `VOLATILE` in state/persistence.ts),
 * and auto-dismiss from the renderer via the `TOASTS/DISMISS` action.
 */

/** Visual accent for a toast. Mirrors the badge/notifier tone vocabulary. */
export type ToastTone = "gold" | "moss" | "ember" | "info";

export interface Toast {
  id: string;
  /** Bold lead line (e.g. "Quest complete!"). */
  title: string;
  /** Optional secondary line (e.g. the quest's name). */
  message?: string;
  /** Icon key rendered to the left, resolved by the design IconCanvas registry. */
  icon?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss; the renderer applies a default when unset. */
  duration?: number;
}

/** Never show more than this many toasts at once — the oldest are dropped. */
export const MAX_TOASTS = 4;

// Module-scoped id counter. Mirrors the `_questIdSeq`/Toast.tsx `nextId`
// precedent: reducers stay pure-enough while ids remain unique within a session.
let _toastSeq = 1;
export function nextToastId(): string {
  return `toast-${_toastSeq++}`;
}

/**
 * Append `incoming` toasts to the existing queue, capping at {@link MAX_TOASTS}
 * (oldest dropped). Returns the original array reference unchanged when there is
 * nothing to add, so callers preserve referential equality on the no-op path.
 */
export function appendToasts(existing: Toast[] | undefined, incoming: Toast[]): Toast[] {
  const base = existing ?? [];
  if (incoming.length === 0) return base;
  const merged = [...base, ...incoming];
  return merged.length > MAX_TOASTS ? merged.slice(merged.length - MAX_TOASTS) : merged;
}
