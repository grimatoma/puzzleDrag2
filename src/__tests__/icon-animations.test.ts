import { describe, it, expect } from "vitest";
import { ICON_ANIMATIONS, ANIMATED_ICON_KEYS, iconAnimation, hasIconAnimation } from "../textures/iconAnimations.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";

describe("icon animations", () => {
  it("every animation key maps to a registered static icon", () => {
    const orphans = [...ANIMATED_ICON_KEYS].filter((k) => !ICON_REGISTRY[k]);
    if (orphans.length) console.log("Orphan animation keys:\n  " + orphans.join("\n  "));
    expect(orphans).toEqual([]);
  });

  it("exposes a non-empty registry of (ctx, t) => void draws", () => {
    expect(ANIMATED_ICON_KEYS.size).toBeGreaterThan(20);
    for (const fn of Object.values(ICON_ANIMATIONS)) {
      expect(typeof fn).toBe("function");
      expect(fn.length).toBe(2); // (ctx, t)
    }
  });

  it("hasIconAnimation / iconAnimation agree and resolve known keys", () => {
    expect(hasIconAnimation("arcane_candle")).toBe(true);
    expect(typeof iconAnimation("arcane_candle")).toBe("function");
    expect(hasIconAnimation("definitely_not_an_icon")).toBe(false);
    expect(iconAnimation("definitely_not_an_icon")).toBeNull();
  });

  it("each animation runs without throwing across a few time samples", () => {
    // A minimal CanvasRenderingContext2D stub: every method is a no-op and
    // gradient factories return an object with addColorStop. This exercises
    // the control flow of every draw at several t values (deterministic, no
    // Math.random) to catch obvious runtime errors.
    const grad = { addColorStop() {} };
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createConicGradient") {
          return () => grad;
        }
        if (prop === "canvas") return { width: 64, height: 64 };
        if (prop === "save" || prop === "restore" || prop === "measureText") {
          return prop === "measureText" ? () => ({ width: 10 }) : () => {};
        }
        // Any other property read returns a no-op function (method) — assigning
        // to style props like fillStyle is a set, handled below.
        return () => {};
      },
      set() {
        return true;
      },
    };
    const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
    for (const [key, fn] of Object.entries(ICON_ANIMATIONS)) {
      for (const t of [0, 0.37, 1.5, 3.14, 7.9, 60.2]) {
        expect(() => fn(ctx, t), `${key} @ t=${t}`).not.toThrow();
      }
    }
  });
});
