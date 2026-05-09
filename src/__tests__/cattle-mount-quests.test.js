import { describe, it, expect } from "vitest";
import { QUEST_TEMPLATES } from "../features/quests/templates.js";

describe("cattle / mount / herd / tree quest templates", () => {
  it("registers five collect + three craft templates", () => {
    const ids = QUEST_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("collect_pig");
    expect(ids).toContain("collect_sheep");
    expect(ids).toContain("collect_cow");
    expect(ids).toContain("collect_horse");
    expect(ids).toContain("collect_oak");
    expect(ids).toContain("craft_pie");
    expect(ids).toContain("craft_meat");
    expect(ids).toContain("craft_milk");
  });

  it("each new template has positive bounds and coinBase", () => {
    for (const id of [
      "collect_pig", "collect_sheep", "collect_cow", "collect_horse", "collect_oak",
      "craft_pie", "craft_meat", "craft_milk",
    ]) {
      const t = QUEST_TEMPLATES.find((x) => x.id === id);
      expect(t).toBeDefined();
      expect(t.targetMin).toBeGreaterThan(0);
      expect(t.targetMax).toBeGreaterThanOrEqual(t.targetMin);
      expect(t.coinBase).toBeGreaterThan(0);
      expect(t.coinPerUnit).toBeGreaterThan(0);
    }
  });

  it("collect templates reference real resource keys", () => {
    expect(QUEST_TEMPLATES.find((x) => x.id === "collect_pig").key).toBe("herd_pig");
    expect(QUEST_TEMPLATES.find((x) => x.id === "collect_cow").key).toBe("cattle_cow");
    expect(QUEST_TEMPLATES.find((x) => x.id === "collect_horse").key).toBe("mount_horse");
    expect(QUEST_TEMPLATES.find((x) => x.id === "collect_oak").key).toBe("tree_oak");
  });

  it("higher-tier collect quests pay more per unit (horse > cow > sheep)", () => {
    const horse = QUEST_TEMPLATES.find((x) => x.id === "collect_horse");
    const cow = QUEST_TEMPLATES.find((x) => x.id === "collect_cow");
    const sheep = QUEST_TEMPLATES.find((x) => x.id === "collect_sheep");
    expect(horse.coinPerUnit).toBeGreaterThan(cow.coinPerUnit);
    expect(cow.coinPerUnit).toBeGreaterThan(sheep.coinPerUnit);
  });

  it("craft templates target real product keys (pie / meat / milk)", () => {
    expect(QUEST_TEMPLATES.find((x) => x.id === "craft_pie").item).toBe("pie");
    expect(QUEST_TEMPLATES.find((x) => x.id === "craft_meat").item).toBe("meat");
    expect(QUEST_TEMPLATES.find((x) => x.id === "craft_milk").item).toBe("milk");
  });
});
