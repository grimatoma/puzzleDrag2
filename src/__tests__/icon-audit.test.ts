import { describe, it, expect } from "vitest";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";
import { ITEMS, RECIPES, BUILDINGS, SEASONS } from "../constants.js";
import { TOOL_CATALOG } from "../ui/toolRegistry.js";
import { TYPE_WORKERS } from "../features/workers/data.js";
import { ABILITIES } from "../config/abilities.js";
import { BOSSES } from "../features/bosses/data.js";
import { DECORATIONS } from "../features/decorations/data.js";

describe("icon audit (Round 3)", () => {
  it("zero unresolved icon references across every data catalog", () => {
    const REG = ICON_REGISTRY;
    const missing = [];
    for (const k of Object.keys(ITEMS || {})) if (!REG[k]) missing.push(`ITEM ${k}`);
    for (const [rid, r] of Object.entries(RECIPES || {})) {
      if (r.item && !REG[r.item]) missing.push(`RECIPE_OUT ${r.item} (${rid})`);
      for (const ik of Object.keys(r.inputs || {})) if (!REG[ik]) missing.push(`RECIPE_IN ${ik} (${rid})`);
    }
    for (const t of TOOL_CATALOG || []) if (t.iconKey && !REG[t.iconKey]) missing.push(`TOOL ${t.iconKey} (${t.key})`);
    for (const w of TYPE_WORKERS || []) if (w.look?.iconKey && !REG[w.look.iconKey]) missing.push(`WORKER ${w.look.iconKey} (${w.id})`);
    for (const a of ABILITIES || []) if (a.look?.iconKey && !REG[a.look.iconKey]) missing.push(`ABILITY ${a.look.iconKey} (${a.id})`);
    for (const s of SEASONS || []) if (s.look?.iconKey && !REG[s.look.iconKey]) missing.push(`SEASON ${s.look.iconKey} (${s.name})`);
    for (const b of BOSSES || []) { const k = `boss_${b.id}`; if (!REG[k]) missing.push(`BOSS ${k}`); }
    for (const d of Object.values(DECORATIONS || {})) { const k = `decor_${d.id}`; if (!REG[k]) missing.push(`DECOR ${k}`); }
    for (const b of BUILDINGS || []) {
      for (const ck of Object.keys(b.cost || {})) {
        if (["coins","runes","embers","coreIngots","gems"].includes(ck)) continue;
        if (!REG[ck]) missing.push(`BLDG_COST ${ck} (${b.id})`);
      }
    }
    if (missing.length > 0) console.log("Missing:\n  " + missing.join("\n  "));
    expect(missing).toEqual([]);
  });

  it("abilities carry appearance under look.iconKey, not flat iconKey", () => {
    for (const a of ABILITIES || []) {
      expect(typeof a.look?.iconKey, a.id).toBe("string");
      expect((a as Record<string, unknown>).iconKey, a.id).toBeUndefined();
    }
  });

  it("workers carry appearance under look (iconKey + color), not flat", () => {
    for (const w of TYPE_WORKERS || []) {
      expect(typeof w.look?.iconKey, w.id).toBe("string");
      expect(typeof w.look?.color, w.id).toBe("string");
      expect((w as Record<string, unknown>).iconKey, w.id).toBeUndefined();
      expect((w as Record<string, unknown>).color, w.id).toBeUndefined();
    }
  });

  it("promotes the vector portraits onto canonical keys, with v2 alternates registered separately", () => {
    // The canonical char_*/boss_*/worker_* keys now carry the "Decorative Detail
    // Vector" redesign (textures/categories/charactersVector.ts). Accent colours are
    // preserved (board tunic for npcs/workers, rim for bosses), and the previous-
    // generation `_v2` alternates stay registered under their own keys with distinct
    // draw functions.
    expect(ICON_REGISTRY.char_mira?.color).toBe("#d6612a");
    expect(ICON_REGISTRY.char_mira_v2?.color).toBe("#e0833a");
    expect(ICON_REGISTRY.char_mira?.draw).not.toBe(ICON_REGISTRY.char_mira_v2?.draw);
    expect(ICON_REGISTRY.legacy_char_mira).toBeUndefined();

    expect(ICON_REGISTRY.boss_frostmaw?.color).toBe("#3a82c4");
    expect(ICON_REGISTRY.boss_frostmaw_v2?.draw).toBeTruthy();
    expect(ICON_REGISTRY.boss_frostmaw?.draw).not.toBe(ICON_REGISTRY.boss_frostmaw_v2?.draw);

    expect(ICON_REGISTRY.worker_farmer?.color).toBe("#4f8c3a");
    expect(ICON_REGISTRY.worker_farmer_v2?.draw).toBeTruthy();
  });
});
