import { describe, it, expect } from "vitest";
import {
  gestureFrameAt,
  idleFrameAt,
  GESTURE_FRAME_MS,
  GESTURE_INTERVAL_MIN_MS,
  GESTURE_INTERVAL_MAX_MS,
} from "../textures/seasonalIdleTiming.js";

const GFRAMES = 6;
const GCLIP_MS = GFRAMES * GESTURE_FRAME_MS;
// Longest possible cycle for any cell — used to sweep at least one full cycle.
const MAX_CYCLE = GESTURE_INTERVAL_MAX_MS + GCLIP_MS;

describe("gestureFrameAt — rare per-cell special gesture", () => {
  it("never fires for a single-frame (or absent) clip", () => {
    for (let ms = 0; ms < 60000; ms += 211) {
      expect(gestureFrameAt(ms, 3, 4, 1)).toBe(-1);
      expect(gestureFrameAt(ms, 3, 4, 0)).toBe(-1);
    }
  });

  it("returns -1 for a non-finite clock", () => {
    expect(gestureFrameAt(Number.NaN, 1, 1, GFRAMES)).toBe(-1);
    expect(gestureFrameAt(Number.POSITIVE_INFINITY, 1, 1, GFRAMES)).toBe(-1);
  });

  it("plays every frame 0..N-1 exactly once per cycle when it does fire", () => {
    const col = 2, row = 5;
    const dwell = new Array(GFRAMES).fill(0);
    const step = 5;
    // Sweep two full max-cycles to be sure we catch one complete gesture.
    for (let t = 0; t < MAX_CYCLE * 2; t += step) {
      const f = gestureFrameAt(t, col, row, GFRAMES);
      if (f >= 0) dwell[f] += step;
    }
    // Every gesture frame appears for roughly one GESTURE_FRAME_MS slice per cycle
    // (two cycles swept → ~2 slices). The clip plays start-to-finish.
    for (let f = 0; f < GFRAMES; f++) {
      expect(dwell[f]).toBeGreaterThan(GESTURE_FRAME_MS * 0.8);
    }
  });

  it("is rare — the cell is NOT gesturing the vast majority of the time", () => {
    const col = 1, row = 1;
    let waiting = 0, total = 0;
    for (let t = 0; t < MAX_CYCLE * 3; t += 7) {
      total++;
      if (gestureFrameAt(t, col, row, GFRAMES) < 0) waiting++;
    }
    // Clip (~0.8s) is a sliver of an 18–40s cycle, so >95% of samples are -1.
    expect(waiting / total).toBeGreaterThan(0.95);
  });

  it("staggers cells so they do not all gesture at the same instant", () => {
    // Collect, per cell, the first instant it begins gesturing. Distinct cells
    // should start at distinct times.
    const starts = new Set<number>();
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) {
        for (let t = 0; t < MAX_CYCLE; t += 13) {
          if (gestureFrameAt(t, c, r, GFRAMES) === 0) { starts.add(t); break; }
        }
      }
    }
    expect(starts.size).toBeGreaterThan(1);
  });

  it("gesture timing is independent of the idle loop (different salts)", () => {
    // The gesture must not deterministically co-fire with the idle clip. Over a
    // long sweep, find instants where the gesture is active and confirm the idle
    // frame at those instants is not always the same value. Sampled across a grid
    // of cells: any single cell's gesture window may happen to fall entirely inside
    // its idle rest (idle frame 0), so the independence property is asserted over the
    // board rather than over one phase-specific cell.
    const idleFramesDuringGesture = new Set<number>();
    let gestureSamples = 0;
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 6; row++) {
        for (let t = 0; t < MAX_CYCLE * 3; t += 9) {
          if (gestureFrameAt(t, col, row, GFRAMES) >= 0) {
            gestureSamples++;
            idleFramesDuringGesture.add(idleFrameAt(t, col, row, 9));
          }
        }
      }
    }
    expect(gestureSamples).toBeGreaterThan(0);
    // If the two schedules were locked together the idle would always sit on the
    // same frame whenever the gesture fires; independence gives a spread.
    expect(idleFramesDuringGesture.size).toBeGreaterThan(1);
  });

  it("is deterministic — same inputs, same frame", () => {
    for (let t = 0; t < MAX_CYCLE; t += 97) {
      expect(gestureFrameAt(t, 3, 6, GFRAMES)).toBe(gestureFrameAt(t, 3, 6, GFRAMES));
    }
  });

  it("uses the configured rare cadence (27–60s between gestures)", () => {
    expect(GESTURE_INTERVAL_MIN_MS).toBe(27000);
    expect(GESTURE_INTERVAL_MAX_MS).toBe(60000);
  });
});
