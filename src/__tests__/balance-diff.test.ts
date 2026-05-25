import { describe, it, expect } from "vitest";
import {
  valueDiff, sectionDiff, draftDiff, draftEqual, summariseTotals,
} from "../balanceManager/diff.js";

describe("valueDiff", () => {
  it("returns null when both sides are undefined", () => {
    expect(valueDiff(undefined, undefined)).toBeNull();
  });
  it("reports an added key when baseline is undefined", () => {
    expect(valueDiff(undefined, 7)).toMatchObject({ status: "added", draft: 7 });
  });
  it("reports a removed key when draft is undefined", () => {
    expect(valueDiff(5, undefined)).toMatchObject({ status: "removed", baseline: 5 });
  });
  it("returns null on deep-equal values", () => {
    expect(valueDiff({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toBeNull();
  });
  it("flags modified primitives", () => {
    expect(valueDiff(1, 2)).toMatchObject({ status: "modified", baseline: 1, draft: 2 });
  });
  it("flags arrays whose contents differ", () => {
    expect(valueDiff([1, 2], [1, 3])).toMatchObject({ status: "modified" });
  });
  it("attaches a sub-diff for two plain objects that differ in some keys", () => {
    const out = valueDiff({ a: 1, b: 2 }, { a: 1, b: 9, c: 3 });
    expect(out.status).toBe("modified");
    expect(out.sub.modified.map((m) => m.key)).toEqual(["b"]);
    expect(out.sub.added.map((m) => m.key)).toEqual(["c"]);
  });
});

describe("sectionDiff", () => {
  it("partitions keys into added / removed / modified buckets", () => {
    const baseline = { a: 1, b: 2, c: 3 };
    const draft = { a: 1, b: 5, d: 4 };
    const out = sectionDiff(baseline, draft);
    expect(out.added.map((e) => e.key)).toEqual(["d"]);
    expect(out.removed.map((e) => e.key)).toEqual(["c"]);
    expect(out.modified.map((e) => e.key)).toEqual(["b"]);
  });
  it("sorts each bucket alphabetically for stable rendering", () => {
    const out = sectionDiff({ z: 1 }, { z: 1, a: 2, b: 3 });
    expect(out.added.map((e) => e.key)).toEqual(["a", "b"]);
  });
});

describe("draftDiff", () => {
  it("returns empty sections when baseline === draft", () => {
    const fixture = { version: 1, recipes: { bread: { coins: 10 } } };
    expect(draftDiff(fixture, fixture)).toEqual({
      sections: {},
      totals: { added: 0, removed: 0, modified: 0 },
    });
  });
  it("totals add up across all structural sections", () => {
    const baseline = {
      version: 1,
      recipes: { bread: { coins: 10 } },
      buildings: { granary: { coins: 50 } },
    };
    const draft = {
      version: 1,
      recipes: { bread: { coins: 12 }, pie: { coins: 30 } },
      buildings: {},                           // granary removed
    };
    const out = draftDiff(baseline, draft);
    expect(out.totals.added).toBe(1);    // pie
    expect(out.totals.modified).toBe(1); // bread
    expect(out.totals.removed).toBe(1);  // granary
    expect(Object.keys(out.sections).sort()).toEqual(["buildings", "recipes"]);
  });
  it("folds non-structural top-level keys into a _root section", () => {
    const out = draftDiff({ version: 1, miscFlag: false }, { version: 2, miscFlag: false });
    expect(out.sections._root.modified[0].key).toBe("version");
    expect(out.totals.modified).toBe(1);
  });
});

describe("draftEqual", () => {
  it("treats deep-equal drafts as equal", () => {
    expect(draftEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });
  it("returns false when any nested value differs", () => {
    expect(draftEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });
});

describe("summariseTotals", () => {
  it("returns a placeholder when totals are zero", () => {
    expect(summariseTotals({ added: 0, modified: 0, removed: 0 })).toMatch(/No changes/i);
  });
  it("composes a one-liner from non-zero totals", () => {
    expect(summariseTotals({ added: 3, modified: 2, removed: 0 })).toBe("3 added · 2 modified");
  });
  it("emits all three counts when present", () => {
    expect(summariseTotals({ added: 1, modified: 1, removed: 1 })).toBe("1 added · 1 modified · 1 removed");
  });
});
