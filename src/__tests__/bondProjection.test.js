import { describe, it, expect } from "vitest";
import { projectBondDecay, ticksUntilFloor, projectBondLadder } from "../balanceManager/bondProjection.js";

describe("projectBondDecay", () => {
  it("emits start + N entries for N ticks", () => {
    const out = projectBondDecay(10, 5);
    expect(out.trajectory).toHaveLength(6);
    expect(out.trajectory[0]).toBe(10);
  });

  it("decays by 0.1 per tick when above the floor", () => {
    const out = projectBondDecay(10, 3);
    expect(out.trajectory).toEqual([10, 9.9, 9.8, 9.7]);
  });

  it("floors at 5 and stays there", () => {
    const out = projectBondDecay(5.2, 6);
    expect(out.trajectory[0]).toBe(5.2);
    expect(out.end).toBe(5);
  });

  it("doesn't move bonds at/below the floor", () => {
    const out = projectBondDecay(4.5, 12);
    expect(out.end).toBe(4.5);
  });

  it("normalises non-finite input to 5", () => {
    const out = projectBondDecay(undefined, 3);
    expect(out.trajectory).toEqual([5, 5, 5, 5]);
  });

  it("treats negative tick counts as 0 (returns just the start)", () => {
    const out = projectBondDecay(8, -5);
    expect(out.trajectory).toEqual([8]);
  });
});

describe("ticksUntilFloor", () => {
  it("returns the number of decays until bond touches 5", () => {
    expect(ticksUntilFloor(5.3)).toBe(3);
    expect(ticksUntilFloor(6)).toBe(10);
  });

  it("returns 0 for bonds already at/below the floor", () => {
    expect(ticksUntilFloor(5)).toBe(0);
    expect(ticksUntilFloor(4)).toBe(0);
  });
});

describe("projectBondLadder", () => {
  it("emits one row per starting bond with ticks-to-floor included", () => {
    const out = projectBondLadder({ bonds: [10, 6, 5], ticks: 5 });
    expect(out).toHaveLength(3);
    expect(out[0].start).toBe(10);
    expect(out[2].ticksToFloor).toBe(0);
  });
});
