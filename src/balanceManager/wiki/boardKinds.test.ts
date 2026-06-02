import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { getEntity } from "./conceptEntities.js";
import { WIKI_SECTIONS } from "./wikiNav.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { ledeFor } from "./lede.js";
import { infoboxFacts } from "./infoboxFacts.js";

const concept = () => CONCEPTS.find((c) => c.id === "boardKinds");

describe("boardKinds concept registration", () => {
  it("is a registered concept", () => {
    expect(concept()).toBeDefined();
  });
  it("has exactly three entries: farm, mine, fish", () => {
    const keys = concept()!.getEntries().map((e) => (e as { key: string }).key).sort();
    expect(keys).toEqual(["farm", "fish", "mine"]);
  });
  it("entry display names match BIOMES (Harbor for fish)", () => {
    const byKey = Object.fromEntries(
      concept()!.getEntries().map((e) => [(e as { key: string }).key, (e as { name: string }).name]),
    );
    expect(byKey.farm).toBe("Farm");
    expect(byKey.mine).toBe("Mine");
    expect(byKey.fish).toBe("Harbor");
  });
  it("getEntity resolves a board kind from BIOMES", () => {
    const mine = getEntity("boardKinds", "mine");
    expect(mine).not.toBeNull();
    expect(mine!.name).toBe("Mine");
    expect(Array.isArray(mine!.tiles)).toBe(true);
  });
  it("appears in exactly one nav section (board)", () => {
    const sections = WIKI_SECTIONS.filter((s) => s.conceptIds.includes("boardKinds"));
    expect(sections.map((s) => s.id)).toEqual(["board"]);
  });
  it("has no Zod schema (live-config-only)", () => {
    expect(schemaForConcept("boardKinds")).toBeNull();
  });
});

describe("boardKinds lede + facts", () => {
  it("lede names the board kind and mentions tiles", () => {
    const mine = getEntity("boardKinds", "mine");
    const s = ledeFor("boardKinds", "mine", mine);
    expect(s).toMatch(/Mine/);
    expect(s).toMatch(/board kind/i);
    expect(s.endsWith(".")).toBe(true);
  });
  it("facts include a tile-species count", () => {
    const mine = getEntity("boardKinds", "mine");
    const facts = infoboxFacts("boardKinds", "mine", mine);
    const labels = facts.map((f) => f.label);
    expect(labels).toContain("Tile species");
  });
});
