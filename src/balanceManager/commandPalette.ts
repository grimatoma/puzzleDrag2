// Cmd-K command palette index for the wiki shell.
//
// Walks the canonical game data (ITEMS split per kind into tiles/resources/
// tools, recipes, buildings, zones, NPCs, workers, bosses) and emits a flat
// array of `{ id, label, sublabel, kind, tab }` entries. Every emitted `tab`
// is a real wiki concept id (a member of CONCEPTS) so the shell can route the
// selected entry straight to that concept's article via `wikiNavTarget`.
//
// Pure module — no React, no DOM. The UI lives in CommandPalette.jsx.

import { ITEMS, NPCS, BUILDINGS, RECIPES } from "../constants.js";
import { TYPE_WORKERS } from "../features/workers/data.js";
import { BOSSES } from "../features/bosses/data.js";
import { ZONES, ZONE_IDS } from "../features/zones/data.js";
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
  workers?: unknown;
  bosses?: unknown;
  zones?: Record<string, unknown>;
}

// ITEMS.kind → the wiki concept tab that owns that kind. Items with no
// recognised kind are skipped (no concept page would render them).
const KIND_TO_TAB: Record<string, string> = {
  tile: "tiles",
  resource: "resources",
  tool: "tools",
};

/**
 * Build a search index from the live game data. Returns an array of entry
 * descriptors with `id`, `kind`, `label`, `sublabel`, and `tab` fields. Each
 * entry's `tab` is a wiki concept id (e.g. `recipes`, `bosses`, `tiles`) the
 * palette routes to via `wikiNavTarget` when the entry is picked.
 */
export function buildCommandIndex({ items = ITEMS, npcs = NPCS, buildings = BUILDINGS, recipes = RECIPES, workers = TYPE_WORKERS, bosses = BOSSES, zones = ZONES }: BuildIndexOptions = {}): CommandEntry[] {
  const entries: CommandEntry[] = [];
  const push = (entry: CommandEntry) => entries.push(entry);
  // Narrow individual entries to a loose record so the dynamic field reads
  // don't smear `unknown` across every line.
  const asRec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
  const stringList = (...xs: unknown[]): string[] =>
    xs.filter((x): x is string => typeof x === "string" && x.length > 0);

  // Items: one pass, split per kind into the matching concept tab. Items with
  // no recognised kind are skipped — there is no wiki page to route them to.
  for (const [id, raw] of Object.entries(items || {})) {
    const item = asRec(raw);
    const kind = typeof item.kind === "string" ? item.kind : null;
    const tab = kind ? KIND_TO_TAB[kind] : undefined;
    if (!tab) continue;
    const label = typeof item.label === "string" ? item.label : id;
    const effect = typeof item.effect === "string" ? item.effect : null;
    const power = effect ? getToolPower(effect) : null;
    const powerBit = power ? ` · ${power.name}` : (effect ? ` · ${effect}` : "");
    push({ id, kind: kind!, tab,
      label, sublabel: `${kind} · ${id}${powerBit}`,
      keywords: stringList(id, item.label, effect, power?.name, item.target, kind!) });
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
    const label = typeof b.label === "string" ? b.label : (typeof b.name === "string" ? b.name : bid);
    const lvl = typeof b.level === "number" ? String(b.level) : "?";
    const coins = typeof b.coins === "number" ? b.coins : null;
    push({ id: bid, kind: "building", tab: "buildings",
      label, sublabel: `building · level ${lvl}${coins !== null ? ` · ${coins}◉` : ""}`,
      keywords: stringList(bid, b.label, b.name, "building") });
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
  for (const raw of asArrayValues(workers)) {
    const w = asRec(raw);
    const wid = typeof w.id === "string" ? w.id : null;
    if (!wid) continue;
    const label = typeof w.label === "string" ? w.label : (typeof w.name === "string" ? w.name : wid);
    push({ id: wid, kind: "worker", tab: "workers",
      label, sublabel: `worker · ${wid}`,
      keywords: stringList(wid, w.label, w.name, "worker") });
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
