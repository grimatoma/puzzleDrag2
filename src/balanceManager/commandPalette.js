// Cmd-K command palette index for the Balance Manager.
//
// Walks the canonical game data (TILE/ITEM/recipe/building/biome/zone
// catalogs + worker/keeper/boss/achievement lists + story beats + flags)
// and emits a flat array of `{ id, label, sublabel, kind, tab }` entries.
// The palette UI ranks entries against a free-form query (token-match scoring
// with a small bonus for prefix hits) and routes the selected entry to the
// appropriate balance-manager tab via the same hash routing the sidebar uses.
//
// Pure module — no React, no DOM. The UI lives in CommandPalette.jsx.

import { ITEMS, NPCS, BUILDINGS, RECIPES, BIOMES } from "../constants.js";
import { KEEPERS } from "../keepers.js";
import { TYPE_WORKERS } from "../features/workers/data.js";
import { BOSSES } from "../features/bosses/data.js";
import { ACHIEVEMENTS } from "../features/achievements/data.js";
import { ZONES, ZONE_IDS } from "../features/zones/data.js";
import { STORY_BEATS, SIDE_BEATS } from "../story.js";
import { STORY_FLAGS } from "../flags.js";

function asArrayValues(obj) {
  return Array.isArray(obj) ? obj : Object.values(obj || {});
}

/**
 * Build a search index from the live game data. Returns an array of entry
 * descriptors with `id`, `kind`, `label`, `sublabel`, and `tab` fields. Each
 * entry's `tab` is the Balance Manager tab id (e.g. `recipes`, `bosses`) the
 * palette should navigate to when the entry is picked.
 */
export function buildCommandIndex({ items = ITEMS, npcs = NPCS, buildings = BUILDINGS, recipes = RECIPES, biomes = BIOMES, keepers = KEEPERS, workers = TYPE_WORKERS, bosses = BOSSES, achievements = ACHIEVEMENTS, zones = ZONES, storyBeats = STORY_BEATS, sideBeats = SIDE_BEATS, flags = STORY_FLAGS } = {}) {
  const entries = [];
  const push = (entry) => entries.push(entry);

  for (const [id, item] of Object.entries(items || {})) {
    push({ id, kind: "tile", tab: "tiles",
      label: item?.label || id, sublabel: `tile · ${id}`,
      keywords: [id, item?.label, "tile"].filter(Boolean) });
  }
  for (const [id, item] of Object.entries(items || {})) {
    push({ id, kind: "item", tab: "items",
      label: item?.label || id, sublabel: `item · ${id}${item?.effect ? ` · ${item.effect}` : ""}`,
      keywords: [id, item?.label, item?.effect, item?.target, "item"].filter(Boolean) });
  }
  for (const [id, recipe] of Object.entries(recipes || {})) {
    push({ id, kind: "recipe", tab: "recipes",
      label: recipe?.name || id, sublabel: `recipe · ${recipe?.station || "any"}${Number.isFinite(recipe?.coins) ? ` · ${recipe.coins}◉` : ""}`,
      keywords: [id, recipe?.name, recipe?.station, "recipe"].filter(Boolean) });
  }
  for (const b of asArrayValues(buildings)) {
    if (!b || !b.id) continue;
    push({ id: b.id, kind: "building", tab: "buildings",
      label: b.label || b.id, sublabel: `building · level ${b.level ?? "?"}${Number.isFinite(b.coins) ? ` · ${b.coins}◉` : ""}`,
      keywords: [b.id, b.label, "building"].filter(Boolean) });
  }
  for (const [id, biome] of Object.entries(biomes || {})) {
    push({ id, kind: "biome", tab: "biomes",
      label: biome?.name || biome?.label || id, sublabel: `biome · ${id}`,
      keywords: [id, biome?.name, biome?.label, "biome"].filter(Boolean) });
  }
  for (const id of ZONE_IDS || Object.keys(zones || {})) {
    const z = zones?.[id];
    push({ id, kind: "zone", tab: "zones",
      label: z?.name || z?.label || id, sublabel: `zone · ${id}`,
      keywords: [id, z?.name, z?.label, "zone"].filter(Boolean) });
  }
  for (const [id, npc] of Object.entries(npcs || {})) {
    push({ id, kind: "npc", tab: "npcs",
      label: npc?.name || id, sublabel: `NPC · ${id}`,
      keywords: [id, npc?.name, "npc"].filter(Boolean) });
  }
  for (const [id, keeper] of Object.entries(keepers || {})) {
    push({ id, kind: "keeper", tab: "keepers",
      label: keeper?.name || id, sublabel: `keeper · ${id}`,
      keywords: [id, keeper?.name, "keeper"].filter(Boolean) });
  }
  for (const w of asArrayValues(workers)) {
    if (!w || !w.id) continue;
    push({ id: w.id, kind: "worker", tab: "workers",
      label: w.label || w.id, sublabel: `worker · ${w.id}`,
      keywords: [w.id, w.label, "worker"].filter(Boolean) });
  }
  for (const b of asArrayValues(bosses)) {
    if (!b || !b.id) continue;
    push({ id: b.id, kind: "boss", tab: "bosses",
      label: b.name || b.label || b.id, sublabel: `boss · ${b.season || "?"}`,
      keywords: [b.id, b.name, b.label, b.season, "boss"].filter(Boolean) });
  }
  for (const a of asArrayValues(achievements)) {
    if (!a || !a.id) continue;
    push({ id: a.id, kind: "achievement", tab: "achievements",
      label: a.name || a.label || a.id, sublabel: "achievement",
      keywords: [a.id, a.name, a.label, "achievement"].filter(Boolean) });
  }
  for (const beat of [...(storyBeats || []), ...(sideBeats || [])]) {
    if (!beat || !beat.id) continue;
    push({ id: beat.id, kind: "beat", tab: "story",
      label: beat.title || beat.id,
      sublabel: `story beat · ${beat.act ? `Act ${beat.act}` : "side"}${beat.scene ? ` · ${beat.scene}` : ""}`,
      keywords: [beat.id, beat.title, beat.scene, beat.act ? `act${beat.act}` : "side", "beat"].filter(Boolean) });
  }
  for (const flag of asArrayValues(flags)) {
    if (!flag || !flag.id) continue;
    push({ id: flag.id, kind: "flag", tab: "flags",
      label: flag.label || flag.id, sublabel: `flag · ${flag.category || "story"}`,
      keywords: [flag.id, flag.label, flag.category, "flag"].filter(Boolean) });
  }
  return entries;
}

/**
 * Rank an entry against the query tokens. Higher = better match.
 * Returns 0 for "no match" (caller should drop the entry).
 *
 * Strategy:
 *  - Each token of the query must match SOMETHING (a keyword, the kind, or
 *    the label/sublabel). Missing tokens → zero score.
 *  - Per-token: full-string label match > label prefix > label substring >
 *    keyword/sublabel substring.
 *  - Final score is the sum across all tokens, with a small bonus when the
 *    label starts with the entire trimmed query (typical "I know what I'm
 *    looking for" case).
 */
export function scoreEntry(entry, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return 0;
  const tokens = q.split(/\s+/).filter(Boolean);
  const label = String(entry.label || "").toLowerCase();
  const sublabel = String(entry.sublabel || "").toLowerCase();
  const kind = String(entry.kind || "").toLowerCase();
  const haystack = [label, sublabel, kind, ...(entry.keywords || []).map((k) => String(k).toLowerCase())];

  let score = 0;
  for (const tok of tokens) {
    let tokScore = 0;
    if (label === tok) tokScore = Math.max(tokScore, 220);
    else if (label.startsWith(tok)) tokScore = Math.max(tokScore, 140);
    else if (label.includes(tok)) tokScore = Math.max(tokScore, 90);
    if (kind === tok) tokScore = Math.max(tokScore, 110);
    if (sublabel.includes(tok)) tokScore = Math.max(tokScore, 60);
    for (const k of haystack) if (k.includes(tok)) { tokScore = Math.max(tokScore, 30); break; }
    if (tokScore === 0) return 0;
    score += tokScore;
  }
  if (label.startsWith(q)) score += 35;
  if (label === q) score += 80;
  return score;
}

/**
 * Search the index. Returns up to `limit` entries sorted by descending score,
 * with the original index order as a stable tiebreaker.
 */
export function searchCommandIndex(index, query, limit = 12) {
  const q = String(query ?? "").trim();
  if (!q || !Array.isArray(index)) return [];
  const ranked = [];
  for (let i = 0; i < index.length; i += 1) {
    const score = scoreEntry(index[i], q);
    if (score > 0) ranked.push({ score, order: i, entry: index[i] });
  }
  ranked.sort((a, b) => (b.score - a.score) || (a.order - b.order));
  return ranked.slice(0, limit).map((r) => r.entry);
}
