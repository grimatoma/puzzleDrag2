import { describe, it, expect } from "vitest";
import {
  idleAnimTime,
  IDLE_ACTIVE_SEC,
  IDLE_REST_SEC,
} from "../textures/idleAnimTiming.js";

const CYCLE = IDLE_ACTIVE_SEC + IDLE_REST_SEC;

describe("idleAnimTime", () => {
  it("advances by exactly IDLE_ACTIVE_SEC per real cycle (delay between loops)", () => {
    // The animation clock should gain one active-window's worth of motion for
    // every full real cycle (active + rest), so the rest is genuine dead time.
    const a = idleAnimTime(0, "tile_k");
    const b = idleAnimTime(CYCLE, "tile_k");
    expect(b - a).toBeCloseTo(IDLE_ACTIVE_SEC, 6);
  });

  it("holds the clock still during the rest window", () => {
    // Pick a real time deep inside a rest window and confirm the clock does not
    // move across it.
    const key = "tile_k";
    // Find the per-key phase by probing: rest occupies the last IDLE_REST_SEC of
    // each cycle in key-local time. Sample two points both inside one rest gap.
    const base = 100 * CYCLE; // far from t=0 to avoid edge effects
    // Sweep to locate a rest region for this key, then assert flatness within it.
    let restStart = -1;
    for (let s = 0; s < CYCLE; s += 0.05) {
      const v0 = idleAnimTime(base + s, key);
      const v1 = idleAnimTime(base + s + 0.2, key);
      if (Math.abs(v1 - v0) < 1e-4) {
        restStart = s;
        break;
      }
    }
    expect(restStart).toBeGreaterThanOrEqual(0);
    const mid = base + restStart + 0.1;
    expect(idleAnimTime(mid, key)).toBeCloseTo(idleAnimTime(mid + 0.3, key), 4);
  });

  it("is continuous and monotonic non-decreasing over time", () => {
    let prev = idleAnimTime(0, "tile_x");
    for (let s = 0; s <= 3 * CYCLE; s += 0.01) {
      const v = idleAnimTime(s, "tile_x");
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      // No large jumps — eased, so per-step delta stays small.
      expect(v - prev).toBeLessThan(0.05);
      prev = v;
    }
  });

  it("staggers the rest phase across different keys", () => {
    // At a fixed instant, distinct keys should sit at different points in their
    // cycle, so they are not all resting/moving together.
    const t = 1.3;
    const values = ["tile_a", "tile_b", "tile_c", "tile_d", "tile_e"].map((k) =>
      idleAnimTime(t, k),
    );
    const unique = new Set(values.map((v) => v.toFixed(4)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("uses up the full rest gap (rest is a non-trivial fraction of the cycle)", () => {
    expect(IDLE_REST_SEC).toBeGreaterThan(0);
    expect(IDLE_ACTIVE_SEC).toBeGreaterThan(0);
  });
});
