import { describe, it, expect } from "vitest";
import { SOUNDS } from "../audio/index.js";

describe("fish-biome audio cues", () => {
  it("tideSplash sound is registered", () => {
    expect(SOUNDS.tideSplash).toBeDefined();
    expect(Array.isArray(SOUNDS.tideSplash.steps)).toBe(true);
    expect(SOUNDS.tideSplash.steps.length).toBeGreaterThan(0);
  });

  it("pearlCapture sound is registered", () => {
    expect(SOUNDS.pearlCapture).toBeDefined();
    expect(Array.isArray(SOUNDS.pearlCapture.steps)).toBe(true);
    expect(SOUNDS.pearlCapture.steps.length).toBeGreaterThan(0);
  });

  it("tideSplash uses a low triangle wave (watery whoosh)", () => {
    const step = SOUNDS.tideSplash.steps[0];
    expect(step.type).toBe("triangle");
    expect(step.freq).toBeLessThanOrEqual(220);
  });

  it("pearlCapture is a multi-step shimmer with high frequencies", () => {
    expect(SOUNDS.pearlCapture.steps.length).toBeGreaterThanOrEqual(2);
    for (const step of SOUNDS.pearlCapture.steps) {
      expect(step.type).toBe("sine");
      expect(step.freq).toBeGreaterThan(1000);
    }
  });

  it("each new step has dur, gain, type", () => {
    for (const name of ["tideSplash", "pearlCapture"]) {
      for (const step of SOUNDS[name].steps) {
        expect(typeof step.dur).toBe("number");
        expect(typeof step.gain).toBe("number");
        expect(typeof step.type).toBe("string");
      }
    }
  });
});
