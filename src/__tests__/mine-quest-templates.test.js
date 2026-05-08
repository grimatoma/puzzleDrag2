import { describe, it, expect } from "vitest";
import { QUEST_TEMPLATES } from "../features/quests/templates.js";

describe("mine-biome quest templates", () => {
  it("registers five collect templates and three craft templates", () => {
    const ids = QUEST_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("collect_stone");
    expect(ids).toContain("collect_ore");
    expect(ids).toContain("collect_coal");
    expect(ids).toContain("collect_gem");
    expect(ids).toContain("collect_dirt");
    expect(ids).toContain("craft_lantern");
    expect(ids).toContain("craft_goldring");
    expect(ids).toContain("craft_cobblepath");
  });

  it("each new template has a sensible target window and positive coinBase", () => {
    for (const id of [
      "collect_stone", "collect_ore", "collect_coal", "collect_gem", "collect_dirt",
      "craft_lantern", "craft_goldring", "craft_cobblepath",
    ]) {
      const t = QUEST_TEMPLATES.find((x) => x.id === id);
      expect(t).toBeDefined();
      expect(t.targetMin).toBeGreaterThan(0);
      expect(t.targetMax).toBeGreaterThanOrEqual(t.targetMin);
      expect(t.coinBase).toBeGreaterThan(0);
      expect(t.coinPerUnit).toBeGreaterThan(0);
    }
  });

  it("collect_stone references a real mine_stone resource key", () => {
    const t = QUEST_TEMPLATES.find((x) => x.id === "collect_stone");
    expect(t.category).toBe("collect");
    expect(t.key).toBe("mine_stone");
  });

  it("craft_goldring references the gold ring forge recipe", () => {
    const t = QUEST_TEMPLATES.find((x) => x.id === "craft_goldring");
    expect(t.category).toBe("craft");
    expect(t.item).toBe("goldring");
  });

  it("collect_dirt has a low coinPerUnit (commodity tier)", () => {
    const t = QUEST_TEMPLATES.find((x) => x.id === "collect_dirt");
    expect(t.coinPerUnit).toBeLessThanOrEqual(2);
  });

  it("collect_gem rewards more per unit than commodity tiles", () => {
    const gem = QUEST_TEMPLATES.find((x) => x.id === "collect_gem");
    const stone = QUEST_TEMPLATES.find((x) => x.id === "collect_stone");
    expect(gem.coinPerUnit).toBeGreaterThan(stone.coinPerUnit);
  });
});
