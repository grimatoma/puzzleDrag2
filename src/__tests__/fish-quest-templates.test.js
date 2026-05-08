import { describe, it, expect } from "vitest";
import { QUEST_TEMPLATES } from "../features/quests/templates.js";
import { rollQuests } from "../features/quests/data.js";

describe("fish-biome quest templates", () => {
  it("registers four collect templates and two craft templates", () => {
    const ids = QUEST_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("collect_sardine");
    expect(ids).toContain("collect_mackerel");
    expect(ids).toContain("collect_clam");
    expect(ids).toContain("collect_kelp");
    expect(ids).toContain("craft_chowder");
    expect(ids).toContain("craft_fish_oil");
  });

  it("each new template has a sensible target window and positive coinBase", () => {
    for (const id of [
      "collect_sardine", "collect_mackerel", "collect_clam", "collect_kelp",
      "craft_chowder", "craft_fish_oil",
    ]) {
      const t = QUEST_TEMPLATES.find((x) => x.id === id);
      expect(t).toBeDefined();
      expect(t.targetMin).toBeGreaterThan(0);
      expect(t.targetMax).toBeGreaterThanOrEqual(t.targetMin);
      expect(t.coinBase).toBeGreaterThan(0);
      expect(t.coinPerUnit).toBeGreaterThan(0);
    }
  });

  it("collect_sardine references a real fish_sardine resource key", () => {
    const t = QUEST_TEMPLATES.find((x) => x.id === "collect_sardine");
    expect(t.category).toBe("collect");
    expect(t.key).toBe("fish_sardine");
  });

  it("craft_chowder targets the chowder recipe item", () => {
    const t = QUEST_TEMPLATES.find((x) => x.id === "craft_chowder");
    expect(t.category).toBe("craft");
    expect(t.item).toBe("chowder");
  });

  it("rollQuests still produces 6 quests now that the pool grew (deterministic)", () => {
    const quests = rollQuests("seed-1", 1, 1);
    expect(quests).toHaveLength(6);
    // No duplicate template ids in a single roll
    const tplIds = quests.map((q) => q.template);
    expect(new Set(tplIds).size).toBe(tplIds.length);
  });
});
