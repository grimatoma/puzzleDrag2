// src/__tests__/progression-config.test.ts
import { describe, it, expect } from "vitest";
import { zoneBuildingIds, zoneBoardKinds } from "../config/progression/derive.js";
import { ZONES } from "../features/zones/data.js";
import { PROGRESSION_TRIGGERS } from "../config/progression/triggers.js";
import { factIdsIn } from "../config/progression/conditions.js";
import { isKnownFact } from "../config/progression/facts.js";
import type { Effect } from "../config/progression/types.js";
import { BUILDINGS, ITEMS, RECIPES } from "../constants.js";
import { TYPE_WORKERS } from "../features/workers/data.js";

describe("derive helpers", () => {
  it("zoneBuildingIds returns the zone's buildable ids", () => {
    const home = zoneBuildingIds("home");
    expect(Array.isArray(home)).toBe(true);
    // 'home' (the farm) must exist as a zone
    expect(ZONES["home"]).toBeTruthy();
  });
  it("zoneBoardKinds lists enabled board kinds", () => {
    expect(zoneBoardKinds("home")).toContain("farm");
  });
  it("unknown zone yields empty, not a throw", () => {
    expect(zoneBuildingIds("nope_zone")).toEqual([]);
    expect(zoneBoardKinds("nope_zone")).toEqual([]);
  });
});

const BUILDING_IDS = new Set(BUILDINGS.map((b: { id: string }) => b.id));
const ITEM_KEYS = new Set(Object.keys(ITEMS));
const RECIPE_KEYS = new Set(Object.keys(RECIPES));
const ZONE_IDS = new Set(Object.keys(ZONES));
const WORKER_IDS = new Set(TYPE_WORKERS.map((w: { id: string }) => w.id));

function refResolves(effect: Effect): boolean {
  switch (effect.kind) {
    case "unlockBuilding": return BUILDING_IDS.has(effect.building);
    case "unlockZone": return ZONE_IDS.has(effect.zone);
    case "unlockRecipe": return RECIPE_KEYS.has(effect.recipe);
    case "discoverTile": return ITEM_KEYS.has(effect.tile);
    case "unlockTool": return ITEM_KEYS.has(effect.tool);
    case "unlockWorker": return WORKER_IDS.has(effect.worker);
    case "grant": return Object.keys(effect.resources ?? {}).every((k) => ITEM_KEYS.has(k));
    default: return true; // note/setFlag/advanceAct/etc. carry no live-map ref
  }
}

describe("progression config integrity", () => {
  it("trigger ids are unique", () => {
    const ids = PROGRESSION_TRIGGERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every effect ref resolves in a live map (unless PLANNED)", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS) {
      if (t.status === "PLANNED" || t.status === "DOC-ONLY") continue;
      for (const e of t.effects) if (!refResolves(e)) bad.push(`${t.id}: ${JSON.stringify(e)}`);
    }
    expect(bad).toEqual([]);
  });

  it("every `when` leaf references a known fact family", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS)
      for (const f of factIdsIn(t.when)) if (!isKnownFact(f)) bad.push(`${t.id}: ${f}`);
    expect(bad).toEqual([]);
  });

  it("zone tags are real ZoneIds (unless PLANNED)", () => {
    const bad: string[] = [];
    for (const t of PROGRESSION_TRIGGERS) {
      if (!t.zone || t.status === "PLANNED") continue;
      if (!ZONE_IDS.has(t.zone)) bad.push(`${t.id}: ${t.zone}`);
    }
    expect(bad).toEqual([]);
  });

  it("requires references existing triggers and forms an acyclic graph", () => {
    const ids = new Set(PROGRESSION_TRIGGERS.map((t) => t.id));
    for (const t of PROGRESSION_TRIGGERS)
      for (const r of t.requires ?? []) expect(ids.has(r), `${t.id} requires ${r}`).toBe(true);

    // DAG check via DFS
    const byId = new Map(PROGRESSION_TRIGGERS.map((t) => [t.id, t]));
    const state = new Map<string, 0 | 1 | 2>(); // 0=unseen,1=on-stack,2=done
    const hasCycle = (id: string): boolean => {
      const s = state.get(id) ?? 0;
      if (s === 1) return true;
      if (s === 2) return false;
      state.set(id, 1);
      for (const r of byId.get(id)?.requires ?? []) if (hasCycle(r)) return true;
      state.set(id, 2);
      return false;
    };
    expect(PROGRESSION_TRIGGERS.some((t) => hasCycle(t.id))).toBe(false);
  });
});
