import { describe, it, expect } from "vitest";
import { analyseDraftSize, formatBytes } from "../balanceManager/draftSize.js";

describe("analyseDraftSize", () => {
  it("returns 0 total + empty sections for null/undefined", () => {
    expect(analyseDraftSize(null)).toEqual({ total: 0, sections: [] });
    expect(analyseDraftSize(undefined)).toEqual({ total: 0, sections: [] });
  });

  it("totals the JSON byte size of the whole draft", () => {
    const draft = { version: 1, recipes: { bread: { coins: 10 } } };
    const out = analyseDraftSize(draft);
    expect(out.total).toBe(JSON.stringify(draft).length);
  });

  it("breaks down per top-level section with key count + share", () => {
    const draft = {
      version: 1,
      recipes: { bread: { coins: 10 }, pie: { coins: 12 } },
      buildings: { granary: { coins: 50 } },
    };
    const out = analyseDraftSize(draft);
    const recipes = out.sections.find((s) => s.key === "recipes");
    const buildings = out.sections.find((s) => s.key === "buildings");
    expect(recipes.keyCount).toBe(2);
    expect(buildings.keyCount).toBe(1);
    expect(recipes.bytes).toBeGreaterThan(buildings.bytes);
    expect(recipes.share).toBeGreaterThan(0);
    expect(recipes.share).toBeLessThanOrEqual(1);
  });

  it("sorts sections by byte count descending", () => {
    const draft = {
      huge: { ...Array.from({ length: 10 }, (_, i) => i).reduce((a, i) => ({ ...a, [`k${i}`]: i }), {}) },
      small: { x: 1 },
    };
    const out = analyseDraftSize(draft);
    expect(out.sections[0].key).toBe("huge");
  });

  it("counts arrays as keyCount=length", () => {
    const draft = { list: [1, 2, 3] };
    const out = analyseDraftSize(draft);
    expect(out.sections[0].keyCount).toBe(3);
  });

  it("treats primitives as keyCount=0", () => {
    const draft = { version: 1, name: "x" };
    const out = analyseDraftSize(draft);
    for (const s of out.sections) expect(s.keyCount).toBe(0);
  });
});

describe("formatBytes", () => {
  it("formats bytes / KB / MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toMatch(/MB$/);
  });
  it("returns '0 B' for non-finite / non-positive input", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(undefined)).toBe("0 B");
  });
});
