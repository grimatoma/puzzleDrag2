import { describe, it, expect } from "vitest";
import {
  idleFrameAt,
  cellRestMs,
  IDLE_FRAME_MS,
  IDLE_REST_MIN_MS,
  IDLE_REST_MAX_MS,
} from "../textures/seasonalIdleTiming.js";

const FRAMES = 9;
const CLIP_MS = FRAMES * IDLE_FRAME_MS;

describe("idleFrameAt — per-cell rest-then-play-once", () => {
  it("a single-frame (static) clip is always frame 0", () => {
    for (let ms = 0; ms < 20000; ms += 137) {
      expect(idleFrameAt(ms, 3, 4, 1)).toBe(0);
    }
  });

  it("plays every frame 0..N-1 exactly once per cycle, then rests on frame 0", () => {
    const col = 2, row = 5;
    const cycle = cellRestMs(col, row) + CLIP_MS;
    // Sweep one full cycle finely and tally how long each frame is shown.
    const dwell = new Array(FRAMES).fill(0);
    const step = 5;
    for (let t = 0; t < cycle; t += step) {
      dwell[idleFrameAt(t, col, row, FRAMES)] += step;
    }
    // Every non-rest frame appears for roughly one IDLE_FRAME_MS slice.
    for (let f = 1; f < FRAMES; f++) {
      expect(dwell[f]).toBeGreaterThan(IDLE_FRAME_MS * 0.5);
      expect(dwell[f]).toBeLessThan(IDLE_FRAME_MS * 1.6);
    }
    // Frame 0 dominates — it is both the rest frame and the clip's first frame,
    // and the rest (>= 5s) dwarfs the ~1.2s clip.
    expect(dwell[0]).toBeGreaterThan(IDLE_REST_MIN_MS);
  });

  it("rests far more than it animates (mostly static)", () => {
    const col = 1, row = 1;
    let resting = 0, total = 0;
    const cycle = cellRestMs(col, row) + CLIP_MS;
    for (let t = 0; t < cycle * 3; t += 11) {
      total++;
      if (idleFrameAt(t, col, row, FRAMES) === 0) resting++;
    }
    // Clip is ~1.2s of a >=6.2s cycle, so frame 0 should be shown the large
    // majority of the time.
    expect(resting / total).toBeGreaterThan(0.7);
  });

  it("staggers cells so they are not in lockstep", () => {
    // At a fixed instant, distinct cells should not all show the same frame.
    const t = 3210;
    const frames = [];
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) frames.push(idleFrameAt(t, c, r, FRAMES));
    }
    expect(new Set(frames).size).toBeGreaterThan(1);
  });

  it("two specific cells diverge somewhere over a cycle (independent timers)", () => {
    let diverged = false;
    for (let t = 0; t < 12000; t += 23) {
      if (idleFrameAt(t, 0, 0, FRAMES) !== idleFrameAt(t, 4, 7, FRAMES)) {
        diverged = true;
        break;
      }
    }
    expect(diverged).toBe(true);
  });

  it("is deterministic — same inputs, same frame", () => {
    expect(idleFrameAt(8421, 3, 6, FRAMES)).toBe(idleFrameAt(8421, 3, 6, FRAMES));
  });

  it("per-cell rest length stays within the configured calm range", () => {
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r < 10; r++) {
        const rest = cellRestMs(c, r);
        expect(rest).toBeGreaterThanOrEqual(IDLE_REST_MIN_MS);
        expect(rest).toBeLessThanOrEqual(IDLE_REST_MAX_MS);
      }
    }
  });

  it("the configured calm cadence is 7.5–15s of rest", () => {
    expect(IDLE_REST_MIN_MS).toBe(7500);
    expect(IDLE_REST_MAX_MS).toBe(15000);
  });
});
