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
    for (const w of TYPE_WORKERS || []) if (w.iconKey && !REG[w.iconKey]) missing.push(`WORKER ${w.iconKey} (${w.id})`);
    for (const a of ABILITIES || []) if (a.iconKey && !REG[a.iconKey]) missing.push(`ABILITY ${a.iconKey} (${a.id})`);
    for (const s of SEASONS || []) if (s.iconKey && !REG[s.iconKey]) missing.push(`SEASON ${s.iconKey} (${s.key})`);
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
});
