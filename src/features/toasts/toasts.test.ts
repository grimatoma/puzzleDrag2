import { describe, it, expect } from "vitest";
import type { Action, GameState } from "../../types/state.js";
import { mergeTestState } from "../../testUtils/testState.js";
import { reduce as toastReduce } from "./slice.js";
import { appendToasts, nextToastId, MAX_TOASTS, type Toast } from "./data.js";

function toast(over: Partial<Toast> = {}): Toast {
  return { id: nextToastId(), title: "Hello", ...over };
}

describe("toasts/data — appendToasts", () => {
  it("returns the original array reference when nothing is added", () => {
    const existing = [toast()];
    expect(appendToasts(existing, [])).toBe(existing);
  });

  it("appends new toasts to the queue", () => {
    const existing = [toast({ title: "a" })];
    const next = appendToasts(existing, [toast({ title: "b" })]);
    expect(next.map((t) => t.title)).toEqual(["a", "b"]);
  });

  it("caps the queue at MAX_TOASTS, dropping the oldest", () => {
    const existing = Array.from({ length: MAX_TOASTS }, (_, i) => toast({ title: `old${i}` }));
    const next = appendToasts(existing, [toast({ title: "newest" })]);
    expect(next).toHaveLength(MAX_TOASTS);
    expect(next[next.length - 1].title).toBe("newest");
    expect(next[0].title).toBe("old1"); // old0 dropped
  });

  it("tolerates an undefined existing queue", () => {
    expect(appendToasts(undefined, [toast()])).toHaveLength(1);
    expect(appendToasts(undefined, [])).toEqual([]);
  });
});

describe("toasts/data — nextToastId", () => {
  it("produces unique ids", () => {
    const a = nextToastId();
    const b = nextToastId();
    expect(a).not.toBe(b);
  });
});

describe("toasts/slice — TOASTS/DISMISS", () => {
  const base = (toasts: Toast[]): GameState => mergeTestState({ toasts });

  it("removes the toast with the matching id", () => {
    const s0 = base([toast({ id: "keep", title: "keep" }), toast({ id: "drop", title: "drop" })]);
    const s1 = toastReduce(s0, { type: "TOASTS/DISMISS", id: "drop" } as Action);
    expect(s1.toasts.map((t) => t.id)).toEqual(["keep"]);
  });

  it("is a no-op (same reference) when the id is unknown", () => {
    const s0 = base([toast({ id: "a" })]);
    const s1 = toastReduce(s0, { type: "TOASTS/DISMISS", id: "missing" } as Action);
    expect(s1).toBe(s0);
  });

  it("ignores unrelated actions", () => {
    const s0 = base([toast({ id: "a" })]);
    const s1 = toastReduce(s0, { type: "SOMETHING_ELSE" } as unknown as Action);
    expect(s1).toBe(s0);
  });
});
