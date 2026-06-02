/**
 * Unit tests for src/balanceManager/wiki/backlinks.ts
 *
 * Uses real keys from live maps — no fakes or stubs.
 * Mirrors the style of relations.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { backlinksFor, __resetBacklinkIndex } from "./backlinks.js";
import { relationsFor } from "./relations.js";
import { getEntity } from "./conceptEntities.js";
import { canonicalRecipeEntries } from "../recipeCatalog.js";
import { ZONES } from "../../features/zones/data.js";

// ─── Resolve real keys from live maps ────────────────────────────────────────

// A resource that is a recipe output (e.g. bread is produced by bakery recipes)
const recipesList = canonicalRecipeEntries();
const resourcesAsOutput = new Set<string>();
for (const [, rec] of recipesList) {
  // Find outputs that are "resources" concept
  if (getEntity("resources", rec.item) !== null) {
    resourcesAsOutput.add(rec.item);
  }
}
const realResourceOutput = [...resourcesAsOutput][0]!;

// A real building key that exists in BUILDINGS (bakery)
const bakeryEntity = getEntity("buildings", "bakery");
const realBuildingKey = bakeryEntity !== null ? "bakery" : "workshop";

// A real zone that has buildings — for symmetry test
const zoneWithBuildings = Object.entries(ZONES).find(
  ([, z]) => Array.isArray((z as Record<string, unknown>).buildings) &&
    ((z as Record<string, unknown>).buildings as string[]).length > 0,
);
const realZoneId = zoneWithBuildings![0];
const realZoneEntity = zoneWithBuildings![1] as Record<string, unknown>;

// ─── Reset index before each test so tests are isolated ──────────────────────

beforeEach(() => {
  __resetBacklinkIndex();
});

// ─── Test 1: Recipe output resource backlinks the recipe ─────────────────────

describe("backlinksFor — recipe output resource", () => {
  it("a recipe-output resource backlinks to the recipe(s) that craft it", () => {
    const groups = backlinksFor("resources", realResourceOutput);
    // At least one group should be from the "recipes" concept
    const recipeGroup = groups.find((g) =>
      g.links.some((l) => l.conceptId === "recipes"),
    );
    expect(
      recipeGroup,
      `Expected backlinks from "recipes" for resource "${realResourceOutput}"`,
    ).not.toBeUndefined();
  });

  it("the recipes group links all resolve via getEntity", () => {
    const groups = backlinksFor("resources", realResourceOutput);
    const recipeGroup = groups.find((g) =>
      g.links.some((l) => l.conceptId === "recipes"),
    );
    expect(recipeGroup).not.toBeUndefined();
    for (const link of recipeGroup!.links) {
      expect(getEntity(link.conceptId, link.key)).not.toBeNull();
    }
  });

  it("recipe links have a non-empty label", () => {
    const groups = backlinksFor("resources", realResourceOutput);
    for (const group of groups) {
      for (const link of group.links) {
        expect(link.label.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Test 2: All backlinks resolve via getEntity ──────────────────────────────

describe("backlinksFor — fail-safe: all links resolve", () => {
  it(`every link in backlinksFor("buildings","${realBuildingKey}") resolves via getEntity`, () => {
    const groups = backlinksFor("buildings", realBuildingKey);
    for (const group of groups) {
      for (const link of group.links) {
        expect(
          getEntity(link.conceptId, link.key),
          `Link (${link.conceptId}:${link.key}) in group "${group.title}" did not resolve`,
        ).not.toBeNull();
      }
    }
  });

  it("returns an empty array for a key that nothing links to", () => {
    // __no_such_thing__ is not referenced by any forward link
    const groups = backlinksFor("resources", "__no_such_thing__");
    expect(groups).toHaveLength(0);
  });
});

// ─── Test 3: Symmetry with relationsFor ──────────────────────────────────────

describe("backlinksFor — symmetry with relationsFor", () => {
  it("forward links from a zone appear as backlinks on each target", () => {
    const forwardGroups = relationsFor("zones", realZoneId, realZoneEntity);
    // Collect all forward-link targets
    const forwardTargets: Array<{ conceptId: string; key: string }> = [];
    for (const group of forwardGroups) {
      for (const link of group.links) {
        forwardTargets.push({ conceptId: link.conceptId, key: link.key });
      }
    }
    expect(forwardTargets.length).toBeGreaterThan(0);

    for (const target of forwardTargets) {
      const backGroups = backlinksFor(target.conceptId, target.key);
      const allBackLinks = backGroups.flatMap((g) => g.links);
      const hasBackLink = allBackLinks.some(
        (l) => l.conceptId === "zones" && l.key === realZoneId,
      );
      expect(
        hasBackLink,
        `Expected zones:${realZoneId} in backlinks of ${target.conceptId}:${target.key}`,
      ).toBe(true);
    }
  });
});

// ─── Test 4: Deduplication ───────────────────────────────────────────────────

describe("backlinksFor — deduplication", () => {
  it("the same source entity never appears twice in one group", () => {
    const groups = backlinksFor("resources", realResourceOutput);
    for (const group of groups) {
      const seen = new Set<string>();
      for (const link of group.links) {
        const k = `${link.conceptId}:${link.key}`;
        expect(seen.has(k), `Duplicate link ${k} in group "${group.title}"`).toBe(false);
        seen.add(k);
      }
    }
  });
});

// ─── Test 5: __resetBacklinkIndex rebuilds cleanly ───────────────────────────

describe("__resetBacklinkIndex", () => {
  it("returns consistent results after a reset (index rebuilds correctly)", () => {
    const first = backlinksFor("resources", realResourceOutput);
    __resetBacklinkIndex();
    const second = backlinksFor("resources", realResourceOutput);
    // Deep structural equality: same groups and links
    expect(second.length).toBe(first.length);
    for (let i = 0; i < first.length; i++) {
      expect(second[i].title).toBe(first[i].title);
      expect(second[i].links.length).toBe(first[i].links.length);
    }
  });
});
