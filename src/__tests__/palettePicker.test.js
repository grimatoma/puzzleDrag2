import { describe, it, expect } from "vitest";
import { findColorClashes, paletteSummary, colourFamily, hexString } from "../balanceManager/palettePicker.js";

describe("findColorClashes", () => {
  it("returns one entry per item with a colour", () => {
    const out = findColorClashes({ items: {
      a: { color: 0xffffff, label: "A" },
      b: { color: 0x000000, label: "B" },
    }});
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveProperty("hex");
    expect(out[0]).toHaveProperty("peers");
  });

  it("flags two near-identical colours as peers", () => {
    const out = findColorClashes({ items: {
      a: { color: 0xff0000, label: "A" },
      b: { color: 0xfe0101, label: "B" },   // almost the same
      c: { color: 0x00ff00, label: "C" },   // far away
    }, threshold: 30 });
    const a = out.find((e) => e.id === "a");
    expect(a.peers.map((p) => p.id)).toEqual(["b"]);
    const c = out.find((e) => e.id === "c");
    expect(c.peers).toEqual([]);
  });

  it("respects the threshold parameter", () => {
    const out1 = findColorClashes({ items: {
      a: { color: 0xff0000 }, b: { color: 0xee0000 },
    }, threshold: 5 });
    expect(out1.find((e) => e.id === "a").peers).toEqual([]);

    const out2 = findColorClashes({ items: {
      a: { color: 0xff0000 }, b: { color: 0xee0000 },
    }, threshold: 30 });
    expect(out2.find((e) => e.id === "a").peers.map((p) => p.id)).toEqual(["b"]);
  });

  it("sorts the result by peer count descending", () => {
    const out = findColorClashes({ items: {
      a: { color: 0xff0000 }, b: { color: 0xfe0101 },
      c: { color: 0x00ff00 },
    }});
    expect(out[0].peers.length).toBeGreaterThanOrEqual(out[out.length - 1].peers.length);
  });

  it("ignores items without a colour", () => {
    const out = findColorClashes({ items: {
      a: { color: 0xff0000 }, b: { label: "no color" },
    }});
    expect(out.map((e) => e.id)).toEqual(["a"]);
  });

  it("runs against the live ITEMS catalog without crashing", () => {
    const out = findColorClashes();
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("paletteSummary", () => {
  it("counts items, clashing items, and de-duplicates pair counts", () => {
    const summary = paletteSummary({ items: {
      a: { color: 0xff0000 }, b: { color: 0xfe0101 },
      c: { color: 0x00ff00 },
    }, threshold: 30 });
    expect(summary.totalItems).toBe(3);
    expect(summary.clashingItems).toBe(2);    // a and b each see one peer
    expect(summary.totalClashes).toBe(1);     // but only one *pair*
  });
});

describe("colourFamily", () => {
  it("classifies primary colours", () => {
    expect(colourFamily(0xff0000)).toBe("red");
    expect(colourFamily(0x00ff00)).toBe("green");
    expect(colourFamily(0x0000ff)).toBe("blue");
  });
  it("classifies greyscale near-equal channels", () => {
    expect(colourFamily(0xffffff)).toBe("white");
    expect(colourFamily(0x000000)).toBe("black");
    expect(colourFamily(0x808080)).toBe("gray");
  });
  it("returns 'other' for null / invalid input", () => {
    expect(colourFamily(undefined)).toBe("other");
  });
});

describe("hexString", () => {
  it("formats an RGB integer as #RRGGBB", () => {
    expect(hexString(0xff0000)).toBe("#ff0000");
    expect(hexString(0x123)).toBe("#000123");
  });
  it("falls back to #000000 for non-finite input", () => {
    expect(hexString(undefined)).toBe("#000000");
  });
});
