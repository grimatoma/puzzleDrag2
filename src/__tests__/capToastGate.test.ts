import { describe, it, expect } from "vitest";
import { createCooldownGate } from "../game/capToastGate.js";

describe("createCooldownGate", () => {
  it("allows the first event for a key", () => {
    const gate = createCooldownGate(10_000);
    expect(gate("hay", 1_000)).toBe(true);
  });

  it("suppresses repeats inside the window", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("hay", 5_000)).toBe(false);
  });

  it("allows again after the window elapses", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("hay", 11_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("plank", 1_001)).toBe(true);
  });
});
