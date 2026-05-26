// Cmd-K command palette index for the Dev Panel.
//
// Walks the canonical game data (TILE/ITEM/recipe/building/biome/zone
// catalogs + worker/keeper/boss/achievement lists + story beats + flags)
// and emits a flat array of `{ id, label, sublabel, kind, tab }` entries.
// The palette UI ranks entries against a free-form query (token-match scoring
// with a small bonus for prefix hits) and routes the selected entry to the
// appropriate dev-panel tab via the same hash routing the sidebar uses.
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
import { getToolPower } from "../config/toolPowers.js";

function asArrayValues<T = unknown>(obj: unknown): T[] {
  if (Array.isArray(obj)) return obj as T[];
  if (obj && typeof obj === "object") return Object.values(obj as Record<string, T>);
  return [];
}

export interface CommandEntry {
  id: string;
  kind: string;
  tab: string;
  label: string;
  sublabel: string;
  keywords: string[];
}

interface BuildIndexOptions {
  items?: Record<string, unknown>;
  npcs?: Record<string, unknown>;
  buildings?: unknown;
  recipes?: Record<string, unknown>;
  biomes?: Record<string, unknown>;
  keepers?: Record<string, unknown>;
  workers?: unknown;
  bosses?: unknown;
  achievements?: unknown;
  zones?: Record<string, unknown>;
  storyBeats?: unknown[];
  sideBeats?: unknown[];
  flags?: unknown;
}

/**
 * Build a search index from the live game data. Returns an array of entry
 * descriptors with `id`, `kind`, `label`, `sublabel`, and `tab` fields. Each
 * entry's `tab` is the Dev Panel tab id (e.g. `recipes`, `bosses`) the
 * palette should navigate to when the entry is picked.
 */
export function buildCommandIndex({ items = ITEMS, npcs = NPCS, buildings = BUILDINGS, recipes = RECIPES, biomes = BIOMES, keepers = KEEPERS, workers = TYPE_WORKERS, bosses = BOSSES, achievements = ACHIEVEMENTS, zones = ZONES, storyBeats = STORY_BEATS, sideBeats = SIDE_BEATS, flags = STORY_FLAGS }: BuildIndexOptions = {}): CommandEntry[] {
  const entries: CommandEntry[] = [];
  const push = (entry: CommandEntry) => entries.push(entry);
  // Narrow individual entries to a loose record so the dynamic field reads
  // don't smear `unknown` across every line.
  const asRec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
  const stringList = (...xs: unknown[]): string[] =>
    xs.filter((x): x is string => typeof x === "string" && x.length > 0);

  for (const [id, raw] of Object.entries(items || {})) {
    const item = asRec(raw);
    const label = typeof item.label === "string" ? item.label : id;
    push({ id, kind: "tile", tab: "tiles",
      label, sublabel: `tile · ${id}`,
      keywords: stringList(id, item.label, "tile") });
  }
  for (const [id, raw] of Object.entries(items || {})) {
    const item = asRec(raw);
    const effect = typeof item.effect === "string" ? item.effect : null;
    const power = effect ? getToolPower(effect) : null;
    const powerBit = power
      ? ` · ${power.name}`
      : (effect ? ` · ${effect}` : "");
    const label = typeof item.label === "string" ? item.label : id;
    push({ id, kind: "item", tab: "items",
      label, sublabel: `item · ${id}${powerBit}`,
      keywords: stringList(id, item.label, effect, power?.name, item.target, "item", "tool", "power") });
  }
  for (const [id, raw] of Object.entries(recipes || {})) {
    const recipe = asRec(raw);
    const name = typeof recipe.name === "string" ? recipe.name : id;
    const station = typeof recipe.station === "string" ? recipe.station : "any";
    const coins = typeof recipe.coins === "number" ? recipe.coins : null;
    push({ id, kind: "recipe", tab: "recipes",
      label: name, sublabel: `recipe · ${station}${coins !== null ? ` · ${coins}◉` : ""}`,
      keywords: stringList(id, recipe.name, recipe.station, "recipe") });
  }
  for (const raw of asArrayValues(buildings)) {
    const b = asRec(raw);
    const bid = typeof b.id === "string" ? b.id : null;
    if (!bid) continue;
    const label = typeof b.label === "string" ? b.label : bid;
    const lvl = typeof b.level === "number" ? String(b.level) : "?";
    const coins = typeof b.coins === "number" ? b.coins : null;
    push({ id: bid, kind: "building", tab: "buildings",
      label, sublabel: `building · level ${lvl}${coins !== null ? ` · ${coins}◉` : ""}`,
      keywords: stringList(bid, b.label, "building") });
  }
  for (const [id, raw] of Object.entries(biomes || {})) {
    const biome = asRec(raw);
    const label = typeof biome.name === "string" ? biome.name : (typeof biome.label === "string" ? biome.label : id);
    push({ id, kind: "biome", tab: "biomes",
      label, sublabel: `biome · ${id}`,
      keywords: stringList(id, biome.name, biome.label, "biome") });
  }
  for (const id of ZONE_IDS || Object.keys(zones || {})) {
    const z = asRec((zones as Record<string, unknown>)?.[id]);
    const label = typeof z.name === "string" ? z.name : (typeof z.label === "string" ? z.label : id);
    push({ id, kind: "zone", tab: "zones",
      label, sublabel: `zone · ${id}`,
      keywords: stringList(id, z.name, z.label, "zone") });
  }
  for (const [id, raw] of Object.entries(npcs || {})) {
    const npc = asRec(raw);
    const label = typeof npc.name === "string" ? npc.name : id;
    push({ id, kind: "npc", tab: "npcs",
      label, sublabel: `NPC · ${id}`,
      keywords: stringList(id, npc.name, "npc") });
  }
  for (const [id, raw] of Object.entries(keepers || {})) {
    const keeper = asRec(raw);
    const label = typeof keeper.name === "string" ? keeper.name : id;
    push({ id, kind: "keeper", tab: "keepers",
      label, sublabel: `keeper · ${id}`,
      keywords: stringList(id, keeper.name, "keeper") });
  }
  for (const raw of asArrayValues(workers)) {
    const w = asRec(raw);
    const wid = typeof w.id === "string" ? w.id : null;
    if (!wid) continue;
    const label = typeof w.label === "string" ? w.label : wid;
    push({ id: wid, kind: "worker", tab: "workers",
      label, sublabel: `worker · ${wid}`,
      keywords: stringList(wid, w.label, "worker") });
  }
  for (const raw of asArrayValues(bosses)) {
    const b = asRec(raw);
    const bid = typeof b.id === "string" ? b.id : null;
    if (!bid) continue;
    const label = typeof b.name === "string" ? b.name : (typeof b.label === "string" ? b.label : bid);
    const season = typeof b.season === "string" ? b.season : "?";
    push({ id: bid, kind: "boss", tab: "bosses",
      label, sublabel: `boss · ${season}`,
      keywords: stringList(bid, b.name, b.label, b.season, "boss") });
  }
  for (const raw of asArrayValues(achievements)) {
    const a = asRec(raw);
    const aid = typeof a.id === "string" ? a.id : null;
    if (!aid) continue;
    const label = typeof a.name === "string" ? a.name : (typeof a.label === "string" ? a.label : aid);
    push({ id: aid, kind: "achievement", tab: "achievements",
      label, sublabel: "achievement",
      keywords: stringList(aid, a.name, a.label, "achievement") });
  }
  for (const raw of [...(storyBeats || []), ...(sideBeats || [])]) {
    const beat = asRec(raw);
    const beatId = typeof beat.id === "string" ? beat.id : null;
    if (!beatId) continue;
    const title = typeof beat.title === "string" ? beat.title : beatId;
    const act = typeof beat.act === "number" ? beat.act : null;
    const scene = typeof beat.scene === "string" ? beat.scene : null;
    push({ id: beatId, kind: "beat", tab: "story",
      label: title,
      sublabel: `story beat · ${act ? `Act ${act}` : "side"}${scene ? ` · ${scene}` : ""}`,
      keywords: stringList(beatId, beat.title, beat.scene, act ? `act${act}` : "side", "beat") });
  }
  for (const raw of asArrayValues(flags)) {
    const flag = asRec(raw);
    const flagId = typeof flag.id === "string" ? flag.id : null;
    if (!flagId) continue;
    const label = typeof flag.label === "string" ? flag.label : flagId;
    const category = typeof flag.category === "string" ? flag.category : "story";
    push({ id: flagId, kind: "flag", tab: "flags",
      label, sublabel: `flag · ${category}`,
      keywords: stringList(flagId, flag.label, flag.category, "flag") });
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
export function scoreEntry(entry: CommandEntry, query: string): number {
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
export function searchCommandIndex(index: CommandEntry[], query: string, limit = 12): CommandEntry[] {
  const q = String(query ?? "").trim();
  if (!q || !Array.isArray(index)) return [];
  const ranked: { score: number; order: number; entry: CommandEntry }[] = [];
  for (let i = 0; i < index.length; i += 1) {
    const score = scoreEntry(index[i], q);
    if (score > 0) ranked.push({ score, order: i, entry: index[i] });
  }
  ranked.sort((a, b) => (b.score - a.score) || (a.order - b.order));
  return ranked.slice(0, limit).map((r) => r.entry);
}
