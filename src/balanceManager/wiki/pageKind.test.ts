import { describe, it, expect } from "vitest";
import { pageKindFor, PAGE_KIND_META } from "./pageKind.js";
import { CONCEPTS } from "./concepts.js";

describe("pageKindFor", () => {
  it("returns 'category' for the grouping concepts", () => {
    expect(pageKindFor("categories")).toBe("category");
    expect(pageKindFor("tileDiscoveryMethods")).toBe("category");
  });

  it("returns 'instance' for ordinary entity concepts", () => {
    expect(pageKindFor("tiles")).toBe("instance");
    expect(pageKindFor("recipes")).toBe("instance");
    expect(pageKindFor("npcs")).toBe("instance");
  });

  it("defaults unknown concept ids to 'instance'", () => {
    expect(pageKindFor("does_not_exist")).toBe("instance");
  });

  it("every concept resolves to a kind that has badge metadata", () => {
    for (const c of CONCEPTS) {
      const kind = pageKindFor(c.id);
      expect(PAGE_KIND_META[kind]).toBeDefined();
    }
  });

  it("exposes a 'concept' badge for landing pages", () => {
    expect(PAGE_KIND_META.concept.label).toBe("Concept");
    expect(PAGE_KIND_META.category.label).toBe("Category");
    expect(PAGE_KIND_META.instance.label).toBe("Instance");
  });
});
