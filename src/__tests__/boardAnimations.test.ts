import { describe, it, expect } from "vitest";
import {
  BOARD_ANIMATIONS,
  BOARD_ANIMATION_NAMES,
  demoBoardAnimResetMs,
} from "../config/boardAnimations.js";

describe("BOARD_ANIMATIONS registry", () => {
  it("exports sweep, popIn, and goldenFlash entries", () => {
    expect(BOARD_ANIMATIONS.sweep).toBeDefined();
    expect(BOARD_ANIMATIONS.popIn).toBeDefined();
    expect(BOARD_ANIMATIONS.goldenFlash).toBeDefined();
  });

  it("sweep has fadeOut shape (duration, staggerMs, rotationHalfDeg, ease)", () => {
    const s = BOARD_ANIMATIONS.sweep;
    expect(s.kind).toBe("fadeOut");
    expect(typeof s.duration).toBe("number");
    expect(typeof s.staggerMs).toBe("number");
    expect(typeof s.rotationHalfDeg).toBe("number");
    expect(typeof s.ease).toBe("string");
  });

  it("popIn has popIn shape (duration, ease)", () => {
    const p = BOARD_ANIMATIONS.popIn;
    expect(p.kind).toBe("popIn");
    expect(typeof p.duration).toBe("number");
    expect(typeof p.ease).toBe("string");
  });

  it("goldenFlash has twoStage shape (duration, settleMs, ease)", () => {
    const g = BOARD_ANIMATIONS.goldenFlash;
    expect(g.kind).toBe("twoStage");
    expect(typeof g.duration).toBe("number");
    expect(typeof g.settleMs).toBe("number");
    expect(typeof g.ease).toBe("string");
  });

  it("registry and entries are frozen", () => {
    expect(Object.isFrozen(BOARD_ANIMATIONS)).toBe(true);
    for (const entry of Object.values(BOARD_ANIMATIONS)) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it("BOARD_ANIMATION_NAMES matches Object.keys(BOARD_ANIMATIONS)", () => {
    expect([...BOARD_ANIMATION_NAMES]).toEqual(Object.keys(BOARD_ANIMATIONS));
  });
});

describe("demoBoardAnimResetMs", () => {
  it("includes collapse pipeline for sweep", () => {
    expect(demoBoardAnimResetMs("sweep", 6)).toBe(240 + 190 + 210 + 210 + 100);
  });

  it("uses duration + settle for goldenFlash", () => {
    const g = BOARD_ANIMATIONS.goldenFlash;
    expect(demoBoardAnimResetMs("goldenFlash", 3)).toBe(g.duration + g.settleMs + 100);
  });

  it("uses duration for popIn", () => {
    expect(demoBoardAnimResetMs("popIn", 5)).toBe(BOARD_ANIMATIONS.popIn.duration + 100);
  });
});
