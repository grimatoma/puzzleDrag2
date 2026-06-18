import { describe, it, expect } from "vitest";
import { shakeIntensityFor, shakeDurationFor, radialPeakRadiusFor } from "./juiceCurves.js";

describe("shakeIntensityFor", () => {
  it("is 0 below the minimum chain of 3", () => {
    expect(shakeIntensityFor(0)).toBe(0);
    expect(shakeIntensityFor(2)).toBe(0);
  });

  it("pins the base value at len 3", () => {
    expect(shakeIntensityFor(3)).toBe(0.0025);
  });

  it("matches the hand-computed curve mid-range", () => {
    // 0.0025 + (6-3)*0.0028 = 0.0109
    expect(shakeIntensityFor(6)).toBeCloseTo(0.0109, 10);
  });

  it("clamps at 0.018 for long chains", () => {
    // len 9: 0.0025 + 6*0.0028 = 0.0193 → clamped to 0.018
    expect(shakeIntensityFor(9)).toBe(0.018);
    expect(shakeIntensityFor(50)).toBe(0.018);
  });

  it("is monotonic non-decreasing from len 3 up", () => {
    let prev = -Infinity;
    for (let len = 3; len <= 20; len++) {
      const v = shakeIntensityFor(len);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("shakeDurationFor", () => {
  it("is 0 below the minimum chain of 3", () => {
    expect(shakeDurationFor(2)).toBe(0);
  });

  it("pins the base + mid values", () => {
    expect(shakeDurationFor(3)).toBe(160);
    expect(shakeDurationFor(6)).toBe(310); // 160 + 3*50
  });

  it("clamps at 520 for long chains", () => {
    // len 11: 160 + 8*50 = 560 → clamped to 520
    expect(shakeDurationFor(11)).toBe(520);
    expect(shakeDurationFor(40)).toBe(520);
  });
});

describe("radialPeakRadiusFor", () => {
  it("pins the base value at len 3", () => {
    // (40 + min(80, 0)) * 1 = 40
    expect(radialPeakRadiusFor(3, 1)).toBe(40);
  });

  it("scales by tileScale", () => {
    expect(radialPeakRadiusFor(3, 2)).toBe(80);
    expect(radialPeakRadiusFor(6, 2)).toBe((40 + 42) * 2); // 164
  });

  it("clamps the growth term at +80 (peak radius 120 at scale 1)", () => {
    // len 9: (9-3)*14 = 84 → min(80,84)=80 → 40+80 = 120
    expect(radialPeakRadiusFor(9, 1)).toBe(120);
    expect(radialPeakRadiusFor(30, 1)).toBe(120);
  });
});
