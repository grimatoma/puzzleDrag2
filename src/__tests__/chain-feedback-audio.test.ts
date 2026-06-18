import { describe, it, expect } from "vitest";
import { SOUNDS } from "../audio/index.js";

// Drag-build feedback ladder (doc 02): the per-tile tick + threshold confirm.
// We only inspect the SOUNDS table — calling play() in node would construct an
// AudioContext, which is unavailable in the test env.
describe("drag-build feedback audio cues", () => {
  for (const name of ["chainTick", "chainReady"]) {
    it(`${name} is registered with a non-empty steps array`, () => {
      expect(SOUNDS[name]).toBeDefined();
      expect(Array.isArray(SOUNDS[name].steps)).toBe(true);
      expect(SOUNDS[name].steps.length).toBeGreaterThan(0);
    });

    it(`${name} steps all carry positive freq/dur/gain`, () => {
      for (const step of SOUNDS[name].steps) {
        expect(step.freq).toBeGreaterThan(0);
        expect(step.dur).toBeGreaterThan(0);
        expect(step.gain).toBeGreaterThan(0);
        expect(typeof step.type).toBe("string");
      }
    });
  }

  it("chainReady is a distinct multi-note confirm (brighter than the tick)", () => {
    expect(SOUNDS.chainReady.steps.length).toBeGreaterThanOrEqual(2);
    // The confirm climbs to a clearly higher note than the per-tile tick's range.
    const tickTop = Math.max(
      ...SOUNDS.chainTick.steps.map((s) => s.freqEnd ?? s.freq),
    );
    const readyTop = Math.max(...SOUNDS.chainReady.steps.map((s) => s.freq));
    expect(readyTop).toBeGreaterThan(tickTop);
  });
});
