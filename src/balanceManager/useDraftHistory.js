// Shared undo/redo state hook used by the Balance Manager and Story Editor.
//
// Wraps `useState` with a past/future stack so a designer can step backwards
// through their edits with Cmd/Ctrl-Z and forward with Cmd/Ctrl-Shift-Z (or
// the toolbar buttons each editor adds). To avoid recording every keystroke as
// a separate history entry, sequential `setState` calls within
// `coalesceMs` (default 700ms) are folded into the most recent entry. Callers
// that need an explicit commit boundary can pass `{ commit: true }` — undo
// (or any pause longer than coalesceMs) also opens a fresh entry.
//
// The history bookkeeping is split out as pure helpers (`pushHistoryEntry`,
// `undoHistoryState`, `redoHistoryState`) so it's covered by node-only tests.

import { useState, useCallback, useRef } from "react";

const DEFAULT_MAX_HISTORY = 60;
const DEFAULT_COALESCE_MS = 700;

export function emptyHistory(present) {
  return { past: [], present, future: [] };
}

/**
 * Insert the current `present` into `past` and replace it with `next`.
 * When `coalesce` is true the new value lands in place without growing
 * the past stack (used to merge rapid keystrokes into one entry).
 * Skips entirely if `next === h.present`.
 */
export function pushHistoryEntry(h, next, { coalesce = false, maxHistory = DEFAULT_MAX_HISTORY } = {}) {
  if (Object.is(next, h.present)) return h;
  let past = h.past;
  if (!coalesce) {
    if (past.length >= maxHistory) past = past.slice(past.length - maxHistory + 1);
    past = [...past, h.present];
  }
  return { past, present: next, future: [] };
}

export function undoHistoryState(h) {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
  };
}

export function redoHistoryState(h) {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}

function resolve(initial) {
  return typeof initial === "function" ? initial() : initial;
}

export function useDraftHistory(initial, options = {}) {
  const coalesceMs = Number.isFinite(options.coalesceMs) ? options.coalesceMs : DEFAULT_COALESCE_MS;
  const maxHistory = Number.isFinite(options.maxHistory) ? Math.max(1, options.maxHistory) : DEFAULT_MAX_HISTORY;

  const [history, setHistory] = useState(() => emptyHistory(resolve(initial)));
  const lastChangeAt = useRef(0);

  const setState = useCallback((updaterOrValue, opts) => {
    const force = opts && opts.commit === true;
    const now = Date.now();
    const coalesce = !force && (now - lastChangeAt.current < coalesceMs);
    lastChangeAt.current = now;
    setHistory((h) => {
      const next = typeof updaterOrValue === "function" ? updaterOrValue(h.present) : updaterOrValue;
      return pushHistoryEntry(h, next, { coalesce, maxHistory });
    });
  }, [coalesceMs, maxHistory]);

  const undo = useCallback(() => {
    lastChangeAt.current = 0;
    let did = false;
    setHistory((h) => {
      if (h.past.length === 0) return h;
      did = true;
      return undoHistoryState(h);
    });
    return did;
  }, []);

  const redo = useCallback(() => {
    lastChangeAt.current = 0;
    let did = false;
    setHistory((h) => {
      if (h.future.length === 0) return h;
      did = true;
      return redoHistoryState(h);
    });
    return did;
  }, []);

  const reset = useCallback((value) => {
    lastChangeAt.current = 0;
    setHistory(emptyHistory(resolve(value)));
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoCount: history.past.length,
    redoCount: history.future.length,
  };
}
