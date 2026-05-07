// Phase 11.4 — Motion-reduction setting tests
import { describe, it, expect } from "vitest";
import { INITIAL_SETTINGS, settingsReduce, loadSettings, saveSettings } from "../settings.js";
import { isReducedMotion, getTweenDuration, screenShake, particleQuantity } from "../a11y.js";

describe("11.4 initial reducedMotion = null", () => {
  it("default reducedMotion is null", () => {
    expect(INITIAL_SETTINGS.reducedMotion).toBeNull();
  });
});

describe("11.4 SET_REDUCED_MOTION reducer", () => {
  it("user override true", () => {
    const s = settingsReduce(INITIAL_SETTINGS, { type: "SET_REDUCED_MOTION", value: true });
    expect(s.reducedMotion).toBe(true);
  });
  it("user override false", () => {
    let s = settingsReduce(INITIAL_SETTINGS, { type: "SET_REDUCED_MOTION", value: true });
    s = settingsReduce(s, { type: "SET_REDUCED_MOTION", value: false });
    expect(s.reducedMotion).toBe(false);
  });
});

describe("11.4 isReducedMotion explicit override wins", () => {
  it("true wins", () => {
    expect(isReducedMotion({ settings: { reducedMotion: true } })).toBe(true);
  });
  it("false wins", () => {
    expect(isReducedMotion({ settings: { reducedMotion: false } })).toBe(false);
  });
});

describe("11.4 getTweenDuration scaling", () => {
  const off = { settings: { reducedMotion: false } };
  const on  = { settings: { reducedMotion: true } };

  it("off: passes through", () => {
    expect(getTweenDuration(off, 600)).toBe(600);
  });
  it("on: clamps to 100", () => {
    expect(getTweenDuration(on, 600)).toBe(100);
  });
  it("on: short tween unchanged", () => {
    expect(getTweenDuration(on, 50)).toBe(50);
  });
  it("on: 0 stays 0", () => {
    expect(getTweenDuration(on, 0)).toBe(0);
  });
});

describe("11.4 screenShake suppressed when reduced", () => {
  it("off: shake fires", () => {
    let shaken = 0;
    const fakeCam = { shake: () => { shaken++; } };
    screenShake({ settings: { reducedMotion: false } }, 200, fakeCam);
    expect(shaken).toBe(1);
  });
  it("on: shake suppressed", () => {
    let shaken = 0;
    const fakeCam = { shake: () => { shaken++; } };
    screenShake({ settings: { reducedMotion: true } }, 200, fakeCam);
    expect(shaken).toBe(0);
  });
});

describe("11.4 particleQuantity", () => {
  it("off: full burst", () => {
    expect(particleQuantity({ settings: { reducedMotion: false } }, 60)).toBe(60);
  });
  it("on: no particles", () => {
    expect(particleQuantity({ settings: { reducedMotion: true } }, 60)).toBe(0);
  });
});

describe("11.4 save/load round-trip", () => {
  it("explicit override persists", () => {
    saveSettings({ ...INITIAL_SETTINGS, reducedMotion: true });
    const loaded = loadSettings();
    expect(loaded.reducedMotion).toBe(true);
  });
  it("null override persists as null", () => {
    saveSettings({ ...INITIAL_SETTINGS, reducedMotion: null });
    const loaded = loadSettings();
    expect(loaded.reducedMotion).toBeNull();
  });
});
