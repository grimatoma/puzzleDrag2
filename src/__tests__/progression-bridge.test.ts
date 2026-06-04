// src/__tests__/progression-bridge.test.ts
// Unit test for beatTriggerToCond and buildFactSnapshot.
// Written BEFORE implementing storyBridge.ts (TDD step 1).
import { describe, it, expect } from "vitest";
import { beatTriggerToCond, buildFactSnapshot } from "../config/progression/storyBridge.js";

// ─── beatTriggerToCond ───────────────────────────────────────────────────────

describe("beatTriggerToCond — resource_total", () => {
  it("maps to gte leaf on resource.<key>.total", () => {
    expect(beatTriggerToCond({ type: "resource_total", key: "tile_grass_grass", amount: 20 })).toEqual({
      fact: "resource.tile_grass_grass.total",
      op: "gte",
      value: 20,
    });
  });
});

describe("beatTriggerToCond — resource_total_multi", () => {
  it("maps to all array of gte leaves", () => {
    expect(beatTriggerToCond({
      type: "resource_total_multi",
      req: { tile_mine_stone: 20, tile_mine_coal: 10 },
    })).toEqual({
      all: [
        { fact: "resource.tile_mine_stone.total", op: "gte", value: 20 },
        { fact: "resource.tile_mine_coal.total",  op: "gte", value: 10 },
      ],
    });
  });

  it("empty req gives empty all", () => {
    expect(beatTriggerToCond({ type: "resource_total_multi" })).toEqual({ all: [] });
  });
});

describe("beatTriggerToCond — flag_set", () => {
  it("maps to truthy leaf on flag.<id>", () => {
    expect(beatTriggerToCond({ type: "flag_set", flag: "intro_seen" })).toEqual({
      fact: "flag.intro_seen",
    });
  });
});

describe("beatTriggerToCond — flag_cleared", () => {
  it("maps to not-truthy on flag.<id>", () => {
    expect(beatTriggerToCond({ type: "flag_cleared", flag: "intro_seen" })).toEqual({
      not: { fact: "flag.intro_seen" },
    });
  });
});

describe("beatTriggerToCond — session_start", () => {
  it("maps to eq on event.type", () => {
    expect(beatTriggerToCond({ type: "session_start" })).toEqual({
      fact: "event.type", op: "eq", value: "session_start",
    });
  });
});

describe("beatTriggerToCond — session_ended", () => {
  it("maps to eq on event.type", () => {
    expect(beatTriggerToCond({ type: "session_ended" })).toEqual({
      fact: "event.type", op: "eq", value: "session_ended",
    });
  });
});

describe("beatTriggerToCond — act_entered", () => {
  it("maps to all: [event.type eq, event.act eq]", () => {
    expect(beatTriggerToCond({ type: "act_entered", act: 2 })).toEqual({
      all: [
        { fact: "event.type", op: "eq", value: "act_entered" },
        { fact: "event.act",  op: "eq", value: 2 },
      ],
    });
  });
});

describe("beatTriggerToCond — craft_made", () => {
  it("maps to all: [event.type, event.item, event.count gte]", () => {
    expect(beatTriggerToCond({ type: "craft_made", item: "iron_hinge", count: 1 })).toEqual({
      all: [
        { fact: "event.type",  op: "eq",  value: "craft_made" },
        { fact: "event.item",  op: "eq",  value: "iron_hinge" },
        { fact: "event.count", op: "gte", value: 1 },
      ],
    });
  });

  it("defaults count to 1 when absent", () => {
    expect(beatTriggerToCond({ type: "craft_made", item: "bread" })).toEqual({
      all: [
        { fact: "event.type",  op: "eq",  value: "craft_made" },
        { fact: "event.item",  op: "eq",  value: "bread" },
        { fact: "event.count", op: "gte", value: 1 },
      ],
    });
  });
});

describe("beatTriggerToCond — building_built", () => {
  it("maps to all: [event.type eq, event.id eq]", () => {
    expect(beatTriggerToCond({ type: "building_built", id: "granary" })).toEqual({
      all: [
        { fact: "event.type", op: "eq", value: "building_built" },
        { fact: "event.id",   op: "eq", value: "granary" },
      ],
    });
  });
});

describe("beatTriggerToCond — order_fulfilled", () => {
  it("maps to all: [event.type, event.count gte count??1]", () => {
    expect(beatTriggerToCond({ type: "order_fulfilled", count: 3 })).toEqual({
      all: [
        { fact: "event.type",  op: "eq",  value: "order_fulfilled" },
        { fact: "event.count", op: "gte", value: 3 },
      ],
    });
  });

  it("defaults count to 1 when absent", () => {
    expect(beatTriggerToCond({ type: "order_fulfilled" })).toEqual({
      all: [
        { fact: "event.type",  op: "eq",  value: "order_fulfilled" },
        { fact: "event.count", op: "gte", value: 1 },
      ],
    });
  });
});

describe("beatTriggerToCond — keeper_confronted", () => {
  it("emits only event.type eq when no zoneId/path", () => {
    expect(beatTriggerToCond({ type: "keeper_confronted" })).toEqual({
      all: [
        { fact: "event.type", op: "eq", value: "keeper_confronted" },
      ],
    });
  });

  it("includes event.zoneId eq when zoneId set", () => {
    expect(beatTriggerToCond({ type: "keeper_confronted", zoneId: "home" })).toEqual({
      all: [
        { fact: "event.type",   op: "eq", value: "keeper_confronted" },
        { fact: "event.zoneId", op: "eq", value: "home" },
      ],
    });
  });

  it("includes event.path eq when path set", () => {
    expect(beatTriggerToCond({ type: "keeper_confronted", path: "coexist" })).toEqual({
      all: [
        { fact: "event.type", op: "eq", value: "keeper_confronted" },
        { fact: "event.path", op: "eq", value: "coexist" },
      ],
    });
  });

  it("includes both zoneId and path when both set", () => {
    expect(beatTriggerToCond({ type: "keeper_confronted", zoneId: "home", path: "coexist" })).toEqual({
      all: [
        { fact: "event.type",   op: "eq", value: "keeper_confronted" },
        { fact: "event.zoneId", op: "eq", value: "home" },
        { fact: "event.path",   op: "eq", value: "coexist" },
      ],
    });
  });
});

describe("beatTriggerToCond — boss_defeated", () => {
  it("maps to all: [event.type eq, event.id eq]", () => {
    expect(beatTriggerToCond({ type: "boss_defeated", id: "frostmaw" })).toEqual({
      all: [
        { fact: "event.type", op: "eq", value: "boss_defeated" },
        { fact: "event.id",   op: "eq", value: "frostmaw" },
      ],
    });
  });
});

describe("beatTriggerToCond — all_buildings_built", () => {
  it("maps to all: [event.type eq, event.allBuilt eq true]", () => {
    expect(beatTriggerToCond({ type: "all_buildings_built" })).toEqual({
      all: [
        { fact: "event.type",     op: "eq", value: "all_buildings_built" },
        { fact: "event.allBuilt", op: "eq", value: true },
      ],
    });
  });
});

describe("beatTriggerToCond — unknown type", () => {
  it("maps to __never__ leaf (always false)", () => {
    expect(beatTriggerToCond({ type: "some_unknown_type_xyz" })).toEqual({
      fact: "__never__",
    });
  });
});

// ─── buildFactSnapshot ───────────────────────────────────────────────────────

describe("buildFactSnapshot — resource totals", () => {
  it("maps totals to resource.<key>.total facts", () => {
    const snap = buildFactSnapshot(null, { tile_grass_grass: 20, flour: 5 }, {});
    expect(snap["resource.tile_grass_grass.total"]).toBe(20);
    expect(snap["resource.flour.total"]).toBe(5);
  });
});

describe("buildFactSnapshot — flags", () => {
  it("maps flags to flag.<id> facts", () => {
    const snap = buildFactSnapshot(null, {}, { intro_seen: true, hearth_lit: false });
    expect(snap["flag.intro_seen"]).toBe(true);
    expect(snap["flag.hearth_lit"]).toBe(false);
  });
});

describe("buildFactSnapshot — event fields", () => {
  it("maps event fields to event.<field> facts", () => {
    const snap = buildFactSnapshot({ type: "building_built", id: "granary" }, {}, {});
    expect(snap["event.type"]).toBe("building_built");
    expect(snap["event.id"]).toBe("granary");
  });

  it("defaults event.count to 1 when event has no count", () => {
    const snap = buildFactSnapshot({ type: "order_fulfilled" }, {}, {});
    expect(snap["event.count"]).toBe(1);
  });

  it("preserves event.count when it is set", () => {
    const snap = buildFactSnapshot({ type: "craft_made", item: "bread", count: 3 }, {}, {});
    expect(snap["event.count"]).toBe(3);
  });

  it("handles null event gracefully", () => {
    const snap = buildFactSnapshot(null, {}, {});
    expect(snap["event.type"]).toBeUndefined();
    expect(snap["event.count"]).toBeUndefined();
  });
});
