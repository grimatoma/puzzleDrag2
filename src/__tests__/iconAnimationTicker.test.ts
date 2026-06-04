import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { iconAnimationTicker } from "../balanceManager/iconAnimationTicker.js";

describe("iconAnimationTicker", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts a single RAF loop and invokes all subscribers with the same t", async () => {
    const idA = Symbol("a");
    const idB = Symbol("b");
    const timesA: number[] = [];
    const timesB: number[] = [];

    iconAnimationTicker.subscribe(idA, (t) => timesA.push(t));
    iconAnimationTicker.subscribe(idB, (t) => timesB.push(t));

    await new Promise((r) => setTimeout(r, 5));

    expect(timesA.length).toBeGreaterThan(0);
    expect(timesA).toEqual(timesB);

    iconAnimationTicker.unsubscribe(idA);
    iconAnimationTicker.unsubscribe(idB);
    expect(iconAnimationTicker.subscriberCount).toBe(0);
  });

  it("stops the loop when the last subscriber unsubscribes", async () => {
    const id = Symbol("solo");
    iconAnimationTicker.subscribe(id, () => {});
    expect(iconAnimationTicker.subscriberCount).toBe(1);
    iconAnimationTicker.unsubscribe(id);
    expect(iconAnimationTicker.subscriberCount).toBe(0);
  });
});
