import { describe, it, expect } from "vitest";
import {
  BEAT_TEMPLATES, BEAT_TEMPLATE_IDS, buildBeatFromTemplate, templateMenu,
} from "../storyEditor/beatTemplates.js";

describe("BEAT_TEMPLATES", () => {
  it("lists at least four templates", () => {
    expect(BEAT_TEMPLATE_IDS.length).toBeGreaterThanOrEqual(4);
  });

  it("every template carries a label + blurb + build function", () => {
    for (const id of BEAT_TEMPLATE_IDS) {
      const t = BEAT_TEMPLATES[id];
      expect(typeof t.label).toBe("string");
      expect(typeof t.blurb).toBe("string");
      expect(typeof t.build).toBe("function");
    }
  });
});

describe("buildBeatFromTemplate", () => {
  it("returns null for unknown template ids", () => {
    expect(buildBeatFromTemplate("nope")).toBeNull();
  });

  it("triggered_oneline emits a beat with a bond_at_least trigger", () => {
    const b = buildBeatFromTemplate("triggered_oneline", { npc: "mira", amount: 6 });
    expect(b.trigger).toEqual({ type: "bond_at_least", npc: "mira", amount: 6 });
    expect(b.lines).toHaveLength(1);
  });

  it("speaker_then_choice emits two opposite-tone choices", () => {
    const b = buildBeatFromTemplate("speaker_then_choice", { npc: "wren" });
    expect(b.choices).toHaveLength(2);
    const amounts = b.choices.map((c) => c.outcome?.bondDelta?.amount);
    expect(Math.max(...amounts)).toBeGreaterThan(0);
    expect(Math.min(...amounts)).toBeLessThan(0);
  });

  it("flag_gate carries a trigger + onComplete flag pair", () => {
    const b = buildBeatFromTemplate("flag_gate", { flag: "test_in", complete: "test_done" });
    expect(b.trigger).toEqual({ type: "flag_set", flag: "test_in" });
    expect(b.onComplete.setFlag).toBe("test_done");
  });

  it("three_way_split has three choices with different outcome flavours", () => {
    const b = buildBeatFromTemplate("three_way_split");
    expect(b.choices).toHaveLength(3);
    expect(b.choices.some((c) => c.outcome?.bondDelta?.amount > 0)).toBe(true);
    expect(b.choices.some((c) => c.outcome?.embers > 0)).toBe(true);
    expect(b.choices.some((c) => c.outcome?.bondDelta?.amount < 0)).toBe(true);
  });

  it("resource_threshold builds a resource_total trigger with the named resource", () => {
    const b = buildBeatFromTemplate("resource_threshold", { resource: "wood_log", amount: 25 });
    expect(b.trigger).toEqual({ type: "resource_total", key: "wood_log", amount: 25 });
  });

  it("building_built builds a building_built trigger with the named id", () => {
    const b = buildBeatFromTemplate("building_built", { buildingId: "mill" });
    expect(b.trigger).toEqual({ type: "building_built", id: "mill" });
  });

  it("uses default options when options object is omitted", () => {
    expect(buildBeatFromTemplate("triggered_oneline")).toBeTruthy();
    expect(buildBeatFromTemplate("speaker_then_choice")).toBeTruthy();
  });
});

describe("templateMenu", () => {
  it("returns one entry per template", () => {
    const menu = templateMenu();
    expect(menu).toHaveLength(BEAT_TEMPLATE_IDS.length);
    for (const item of menu) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.label).toBe("string");
      expect(typeof item.blurb).toBe("string");
    }
  });
});
