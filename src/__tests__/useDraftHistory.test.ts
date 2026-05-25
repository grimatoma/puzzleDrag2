import { describe, it, expect } from "vitest";
import {
  emptyHistory,
  pushHistoryEntry,
  undoHistoryState,
  redoHistoryState,
} from "../balanceManager/useDraftHistory.js";

describe("useDraftHistory pure helpers", () => {
  it("emptyHistory wraps a present value with no past/future", () => {
    const h = emptyHistory({ v: 1 });
    expect(h.past).toEqual([]);
    expect(h.present).toEqual({ v: 1 });
    expect(h.future).toEqual([]);
  });

  it("pushHistoryEntry records the previous present and resets future", () => {
    const h0 = emptyHistory({ v: 0 });
    const h1 = pushHistoryEntry(h0, { v: 1 });
    expect(h1.past).toEqual([{ v: 0 }]);
    expect(h1.present).toEqual({ v: 1 });
    expect(h1.future).toEqual([]);
  });

  it("pushHistoryEntry skips when next === present (no-op write)", () => {
    const present = { v: 1 };
    const h0 = { past: [], present, future: [] };
    const h1 = pushHistoryEntry(h0, present);
    expect(h1).toBe(h0);
  });

  it("pushHistoryEntry with coalesce: true replaces present without growing past", () => {
    const h0 = pushHistoryEntry(emptyHistory({ v: 0 }), { v: 1 });
    const h1 = pushHistoryEntry(h0, { v: 2 }, { coalesce: true });
    expect(h1.past).toEqual([{ v: 0 }]);
    expect(h1.present).toEqual({ v: 2 });
  });

  it("pushHistoryEntry clears future on a fresh edit (redo-after-edit semantics)", () => {
    const undone = { past: [{ v: 0 }], present: { v: 1 }, future: [{ v: 2 }] };
    const out = pushHistoryEntry(undone, { v: 9 });
    expect(out.future).toEqual([]);
    expect(out.past).toEqual([{ v: 0 }, { v: 1 }]);
    expect(out.present).toEqual({ v: 9 });
  });

  it("pushHistoryEntry caps past at maxHistory entries, dropping oldest first", () => {
    let h = emptyHistory({ v: 0 });
    for (let i = 1; i <= 6; i += 1) h = pushHistoryEntry(h, { v: i }, { maxHistory: 3 });
    expect(h.past).toHaveLength(3);
    // After 6 pushes the oldest values fall off the end: past holds the 3
    // most recent prior presents — [{v:3}, {v:4}, {v:5}] — and present is {v:6}.
    expect(h.past[0]).toEqual({ v: 3 });
    expect(h.past[h.past.length - 1]).toEqual({ v: 5 });
    expect(h.present).toEqual({ v: 6 });
  });

  it("undoHistoryState moves present back, pushes redo entry", () => {
    const h1 = pushHistoryEntry(emptyHistory({ v: 0 }), { v: 1 });
    const h2 = pushHistoryEntry(h1, { v: 2 });
    const u = undoHistoryState(h2);
    expect(u.present).toEqual({ v: 1 });
    expect(u.past).toEqual([{ v: 0 }]);
    expect(u.future).toEqual([{ v: 2 }]);
  });

  it("undoHistoryState on empty past is a no-op (returns same ref)", () => {
    const h0 = emptyHistory({ v: 0 });
    expect(undoHistoryState(h0)).toBe(h0);
  });

  it("redoHistoryState replays a undone value and rebuilds past", () => {
    const h1 = pushHistoryEntry(emptyHistory({ v: 0 }), { v: 1 });
    const undone = undoHistoryState(h1);
    const redone = redoHistoryState(undone);
    expect(redone.present).toEqual({ v: 1 });
    expect(redone.past).toEqual([{ v: 0 }]);
    expect(redone.future).toEqual([]);
  });

  it("redoHistoryState on empty future is a no-op (returns same ref)", () => {
    const h0 = emptyHistory({ v: 0 });
    expect(redoHistoryState(h0)).toBe(h0);
  });

  it("pushHistoryEntry after a sequence of undos clears all forward history", () => {
    const h1 = pushHistoryEntry(emptyHistory({ v: 0 }), { v: 1 });
    const h2 = pushHistoryEntry(h1, { v: 2 });
    const h3 = pushHistoryEntry(h2, { v: 3 });
    const u1 = undoHistoryState(h3);
    const u2 = undoHistoryState(u1);
    expect(u2.future).toHaveLength(2);
    const branched = pushHistoryEntry(u2, { v: 9 });
    expect(branched.future).toEqual([]);
    expect(branched.present).toEqual({ v: 9 });
    expect(branched.past).toEqual([{ v: 0 }, { v: 1 }]);
  });

  it("walking past length undos returns the original present", () => {
    let h = emptyHistory({ v: 0 });
    for (let i = 1; i <= 4; i += 1) h = pushHistoryEntry(h, { v: i });
    for (let i = 0; i < 4; i += 1) h = undoHistoryState(h);
    expect(h.present).toEqual({ v: 0 });
    expect(h.past).toEqual([]);
    expect(h.future).toHaveLength(4);
  });
});
