import { describe, it, expect, vi, afterEach } from "vitest";
import { advanceSmokeColumn, type SmokeColumn, type SmokePuff } from "../smoke.js";

// A minimal stand-in for a Phaser.GameObjects.Image puff — advanceSmokeColumn
// only touches x/y/scale/alpha + setScale/setAlpha + the _active flag, so we can
// exercise the pure animation logic without booting Phaser.
function fakePuff(over: Partial<SmokePuff> = {}): SmokePuff {
  const p = {
    x: 0,
    y: 0,
    scale: 0.3,
    alpha: 0.85,
    _active: true,
    setScale(s: number) { this.scale = s; return this; },
    setAlpha(a: number) { this.alpha = a; return this; },
    ...over,
  };
  return p as unknown as SmokePuff;
}

function column(puffs: SmokePuff[], intensity: number): SmokeColumn {
  return { root: {} as SmokeColumn["root"], puffs, intensity };
}

afterEach(() => vi.restoreAllMocks());

describe("advanceSmokeColumn", () => {
  it("is a no-op when intensity is 0", () => {
    const p = fakePuff({ _active: true, y: 0, alpha: 0.85 });
    advanceSmokeColumn(column([p], 0), 0.1, 0);
    expect(p.y).toBe(0);
    expect(p.alpha).toBe(0.85);
    expect(p._active).toBe(true);
  });

  it("rises an active puff, grows it, and fades it", () => {
    const p = fakePuff({ _active: true, y: 0, scale: 0.3, alpha: 0.85 });
    advanceSmokeColumn(column([p], 1), 0.1, 0);
    expect(p.y).toBeCloseTo(-2.8, 5); // rose by dt*28
    expect(p.scale).toBeCloseTo(0.322, 5); // grew by dt*0.22
    expect(p.alpha).toBeCloseTo(0.818, 5); // faded by dt*0.32
    expect(p._active).toBe(true);
  });

  it("recycles a puff once it fully fades", () => {
    const p = fakePuff({ _active: true, y: -10, alpha: 0.02 });
    advanceSmokeColumn(column([p], 1), 0.1, 0);
    expect(p.alpha).toBe(0); // clamped, not negative
    expect(p._active).toBe(false);
  });

  it("recycles a puff once it rises past the top", () => {
    const p = fakePuff({ _active: true, y: -89, alpha: 0.85 });
    advanceSmokeColumn(column([p], 1), 0.1, 0);
    expect(p.y).toBeLessThan(-90);
    expect(p._active).toBe(false);
  });

  it("spawns a dormant puff when the spawn roll passes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always below the spawn gate
    const p = fakePuff({ _active: false, alpha: 0 });
    advanceSmokeColumn(column([p], 1), 1, 0);
    expect(p._active).toBe(true);
    expect(p.alpha).toBeGreaterThan(0); // seeded visible, then aged this frame
  });
});
