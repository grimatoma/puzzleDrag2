// Story Tree Editor — shared atoms, colours, and the beat/graph model.
// Pure(ish) module: no app state, just data + tiny presentational helpers used
// by both the canvas (index.jsx) and the inspector (Inspector.jsx).

import { STORY_BEATS, SIDE_BEATS, SCENE_THEMES, beatLines } from "../story.js";
import { STORY_FLAGS } from "../flags.js";
import {
  sanitizeBeatLines, sanitizeChoiceArray, sanitizeChoiceOutcome,
  sanitizeBeatTrigger, sanitizeBeatOnComplete, sanitizeBeatRepeatCooldown,
} from "../config/applyOverrides.js";

// ─── Colours ─────────────────────────────────────────────────────────────────

export const C = {
  parchment:     "#f4ecd8",
  parchmentDeep: "#e8dcc4",
  border:        "#b28b62",
  ink:           "#2b2218",
  inkLight:      "#5a3a20",
  inkSubtle:     "#7a5a38",
  ember:         "#d6612a",
  emberDeep:     "#a84010",
  green:         "#5a9e4b",
  greenDeep:     "#3e7236",
  red:           "#c23b22",
  redDeep:       "#8f2c19",
  violet:        "#7e7aa6",
  canvas:        "#f0e8d4",
  canvasRule:    "#ddd0b4",
};

// ─── NPC data ────────────────────────────────────────────────────────────────

export const NPCS = {
  wren:  { name: "Wren",        color: "#7a8b5e", initial: "W", bg: "linear-gradient(160deg,#8a9d6b,#4a5638)" },
  mira:  { name: "Mira",        color: "#c9863a", initial: "M", bg: "linear-gradient(160deg,#e0a364,#7a4a1f)" },
  tomas: { name: "Old Tomas",   color: "#a36a6a", initial: "T", bg: "linear-gradient(160deg,#b88080,#5a3232)" },
  bram:  { name: "Bram",        color: "#8a5040", initial: "B", bg: "linear-gradient(160deg,#a45a3a,#3a1a0e)" },
  liss:  { name: "Sister Liss", color: "#7e7aa6", initial: "L", bg: "linear-gradient(160deg,#948fc4,#3e3a5e)" },
};
export const NPC_KEYS = Object.keys(NPCS);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function actColor(beat) {
  if (beat?.draft) return "#6b8e9e";
  if (beat?.side || beat?.resolution) return C.violet;
  if (beat?.act === 1) return "#7a8b5e";
  if (beat?.act === 2) return "#c9863a";
  if (beat?.act === 3) return "#a8431a";
  return "#8b6845";
}

export function hexAlpha(hex, a) {
  const h = String(hex || "#000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

export function triggerSummary(beat) {
  const t = beat?.trigger;
  if (t) {
    switch (t.type) {
      case "session_start":        return { icon: "▶", label: "Session start", kind: "trigger" };
      case "act_entered":          return { icon: "↦", label: `Act ${["", "I", "II", "III"][t.act] || t.act}`, kind: "trigger" };
      case "resource_total":       return { icon: "⛁", label: `${String(t.key || "").split("_").pop()} ≥ ${t.amount}`, kind: "trigger" };
      case "resource_total_multi": return { icon: "⛁", label: `${Object.keys(t.req || {}).length} resources`, kind: "trigger" };
      case "craft_made":           return { icon: "✦", label: `Craft ${t.item}`, kind: "trigger" };
      case "building_built":       return { icon: "▥", label: `Build ${t.id}`, kind: "trigger" };
      case "boss_defeated":        return { icon: "⚔", label: `Defeat ${t.id}`, kind: "trigger" };
      case "all_buildings_built":  return { icon: "▥", label: "All buildings", kind: "trigger" };
      case "bond_at_least":        return { icon: "♥", label: `${NPCS[t.npc]?.name || t.npc} bond ≥ ${t.amount}`, kind: "trigger" };
      case "session_ended":        return { icon: "■", label: "Session end", kind: "trigger" };
      case "flag_set":             return { icon: "⚐", label: `flag ${t.flag}`, kind: "trigger" };
      case "flag_cleared":         return { icon: "⚑", label: `flag ${t.flag} off`, kind: "trigger" };
      default:                     return { icon: "?", label: t.type, kind: "trigger" };
    }
  }
  const hints = { frostmaw_keeper: { icon: "⚔", label: "Frostmaw defeated", kind: "queued-code" } };
  return hints[beat?.id] ?? null;
}

// ─── Portrait ────────────────────────────────────────────────────────────────

export function Portrait({ npcKey, size = 24 }) {
  const npc = NPCS[npcKey];
  const style = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "grid", placeItems: "center",
    fontSize: Math.floor(size * 0.4), fontWeight: 700, color: "#fff",
    background: npc ? npc.bg : "linear-gradient(160deg,#6a5a40,#2a1e10)",
    border: "1.5px solid rgba(255,255,255,0.4)",
  };
  return <div style={style} title={npc?.name}>{npc ? npc.initial : "✦"}</div>;
}

// ─── Scene options + line ⇄ text round-tripping ──────────────────────────────

export const SCENE_OPTS = [
  { value: "", label: "— none —" },
  ...Object.keys(SCENE_THEMES).map((k) => ({ value: k, label: `${k} — ${SCENE_THEMES[k].label}` })),
];

export const linesToText = (lines) =>
  Array.isArray(lines)
    ? lines.map((l) => `${l?.speaker ? l.speaker : "narrator"}: ${l?.text || ""}`).join("\n")
    : "";

export const textToLines = (str) =>
  String(str ?? "").split("\n").filter((r) => r.trim()).map((row) => {
    const i = row.indexOf(": ");
    if (i > 0) {
      const sp = row.slice(0, i).trim();
      return { speaker: (sp === "narrator" || sp === "") ? null : sp, text: row.slice(i + 2) };
    }
    return { speaker: null, text: row.trim() };
  });

export const DRAFT_BEAT_ID_RE = /^[a-z][a-z0-9_]*$/;
export const FLAG_ID_RE = /^[a-z_][a-z0-9_]*$/;

const stable = (v) => {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      const sv = stable(v[k]);
      if (sv === undefined) continue;
      if (Array.isArray(sv) && sv.length === 0) continue;
      if (sv && typeof sv === "object" && !Array.isArray(sv) && Object.keys(sv).length === 0) continue;
      out[k] = sv;
    }
    return out;
  }
  return v;
};

export function normalizedStorySlice(draft) {
  return stable(draft?.story || {});
}

export function storySlicesEqual(a, b) {
  return JSON.stringify(normalizedStorySlice(a)) === JSON.stringify(normalizedStorySlice(b));
}

export function knownStoryFlagIds(draft) {
  const ids = new Set(STORY_FLAGS.map((f) => f?.id).filter(Boolean));
  const add = (id) => { if (typeof id === "string" && id.trim()) ids.add(id.trim()); };
  for (const f of draft?.flags?.new || []) add(f?.id);
  for (const id of Object.keys(draft?.flags?.byId || {})) add(id);
  return ids;
}

export function validateDraftBeatId(draft, currentId, nextId) {
  const id = String(nextId ?? "").trim();
  if (!id) return { ok: false, id, message: "Beat id is required." };
  if (!DRAFT_BEAT_ID_RE.test(id)) return { ok: false, id, message: "Use lowercase letters, numbers, and underscores; start with a letter." };
  if (id !== currentId && allBeatIds(draft).includes(id)) return { ok: false, id, message: "That beat id is already in use." };
  return { ok: true, id, message: "" };
}

function rewriteChoiceTargets(choices, oldId, newId) {
  if (!Array.isArray(choices)) return choices;
  return choices.map((c) => {
    if (!c?.outcome || c.outcome.queueBeat !== oldId) return c;
    return { ...c, outcome: { ...c.outcome, queueBeat: newId } };
  });
}

export function renameDraftBeatInDraft(draft, oldId, newId) {
  const check = validateDraftBeatId(draft, oldId, newId);
  if (!check.ok) return { draft, ok: false, message: check.message };
  if (oldId === check.id) return { draft, ok: true, id: oldId, changed: false };
  if (!isDraftBeat(draft, oldId)) return { draft, ok: false, message: "Only draft beats can be renamed." };

  const d = cloneDraft(draft);
  d.story ??= {};
  const idx = draftBeatIndex(d, oldId);
  if (idx < 0) return { draft, ok: false, message: "Draft beat not found." };
  const arr = d.story.newBeats.slice();
  arr[idx] = { ...arr[idx], id: check.id };
  d.story.newBeats = arr.map((b) => Array.isArray(b?.choices) ? { ...b, choices: rewriteChoiceTargets(b.choices, oldId, check.id) } : b);

  if (d.story.beats) {
    const beats = {};
    for (const [beatId, patch] of Object.entries(d.story.beats)) {
      const nextPatch = { ...patch };
      if (Array.isArray(nextPatch.choices)) nextPatch.choices = rewriteChoiceTargets(nextPatch.choices, oldId, check.id);
      beats[beatId] = nextPatch;
    }
    d.story.beats = beats;
  }
  return { draft: d, ok: true, id: check.id, changed: true };
}

const flagList = (value) => Array.isArray(value) ? value : (typeof value === "string" && value ? [value] : []);

function addFlagWarnings(list, knownFlags, warnings, context) {
  for (const raw of flagList(list)) {
    const id = String(raw || "").trim();
    if (!id || id.startsWith("_fired_") || knownFlags.has(id)) continue;
    warnings.push({ type: "unknownFlag", flag: id, message: `${context} references unregistered flag "${id}".` });
  }
}

export function storyWarningsForBeat(beatId, draft) {
  const beat = effectiveBeat(beatId, draft);
  if (!beat) return [];
  const ids = new Set(allBeatIds(draft));
  const knownFlags = knownStoryFlagIds(draft);
  const warnings = [];

  if (beat.trigger && (beat.trigger.type === "flag_set" || beat.trigger.type === "flag_cleared")) {
    addFlagWarnings(beat.trigger.flag, knownFlags, warnings, `${beat.trigger.type} trigger`);
  }
  addFlagWarnings(beat.onComplete?.setFlag, knownFlags, warnings, "onComplete.setFlag");

  for (const c of effectiveChoices(beatId, draft)) {
    const target = c?.outcome?.queueBeat;
    if (target && !ids.has(target)) {
      warnings.push({ type: "missingBeat", target, choiceId: c.id, message: `Choice "${c.label || c.id}" leads to missing beat "${target}".` });
    }
    addFlagWarnings(c?.outcome?.setFlag, knownFlags, warnings, `Choice "${c.label || c.id}" setFlag`);
    addFlagWarnings(c?.outcome?.clearFlag, knownFlags, warnings, `Choice "${c.label || c.id}" clearFlag`);
  }
  return warnings;
}

export function collectStoryWarnings(draft) {
  const byBeat = {};
  for (const id of allBeatIds(draft)) {
    const warnings = storyWarningsForBeat(id, draft);
    if (warnings.length > 0) byBeat[id] = warnings;
  }
  return byBeat;
}

export function editorLinesForBeat(beat) {
  if (!beat) return [];
  if (Array.isArray(beat.lines) && beat.lines.length > 0) return beat.lines;
  return beatLines(beat);
}

// Re-export the canonical sanitizers so callers don't reach into config/.
export { sanitizeBeatLines, sanitizeChoiceArray, sanitizeChoiceOutcome, sanitizeBeatTrigger, sanitizeBeatOnComplete, sanitizeBeatRepeatCooldown };

// ─── Draft (override-doc) helpers ────────────────────────────────────────────

const DRAFT_KEYS = ["upgradeThresholds", "items", "recipes", "buildings",
  "tilePowers", "tileUnlocks", "tileDescriptions", "zones", "workers", "keepers",
  "expedition", "biomes", "tuning", "npcs", "story", "flags", "bosses", "achievements", "dailyRewards"];

export function emptyDraft() {
  const d = { version: 1 };
  for (const k of DRAFT_KEYS) d[k] = {};
  return d;
}

export function cloneDraft(d) {
  if (!d) return emptyDraft();
  const base = emptyDraft();
  base.version = d.version ?? 1;
  for (const k of DRAFT_KEYS) {
    if (d[k] && typeof d[k] === "object") base[k] = JSON.parse(JSON.stringify(d[k]));
  }
  return base;
}

/** The author-created (draft) beats from a draft doc. */
export function draftBeats(draft) {
  const arr = draft?.story?.newBeats;
  return Array.isArray(arr) ? arr : [];
}

/** Index of a draft beat in `draft.story.newBeats`, or -1. */
export function draftBeatIndex(draft, beatId) {
  return draftBeats(draft).findIndex((b) => b && b.id === beatId);
}

/** True if `beatId` is an author-created draft beat (not a built-in). */
export function isDraftBeat(draft, beatId) {
  return draftBeatIndex(draft, beatId) >= 0;
}

export function suppressedBeatIds(draft) {
  const ids = draft?.story?.suppressedBeats;
  return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()) : []);
}

export function isBeatSuppressed(draft, beatId) {
  return suppressedBeatIds(draft).has(beatId);
}

const BUILTIN_BEAT = (id) =>
  STORY_BEATS.find((b) => b.id === id) || SIDE_BEATS.find((b) => b.id === id) || null;

/**
 * The effective beat after applying the live draft on top of the built-in
 * (or, for an author-created beat, the draft entry itself). Mirrors what
 * `applyStoryOverrides` would produce so the canvas reflects unsaved edits.
 */
export function effectiveBeat(beatId, draft) {
  if (!beatId) return null;
  const fromDraft = draftBeats(draft).find((b) => b && b.id === beatId);
  if (!fromDraft && isBeatSuppressed(draft, beatId)) return null;
  const base = fromDraft || BUILTIN_BEAT(beatId);
  if (!base) return null;
  const merged = { ...base };
  if (Object.prototype.hasOwnProperty.call(merged, "repeatCooldown")) {
    const cd = sanitizeBeatRepeatCooldown(merged.repeatCooldown);
    if (cd) merged.repeatCooldown = cd; else delete merged.repeatCooldown;
  }
  const ov = (draft?.story?.beats || {})[beatId];
  if (ov && typeof ov === "object") {
    if (typeof ov.title === "string" && ov.title.length > 0) merged.title = ov.title;
    if (typeof ov.scene === "string") merged.scene = ov.scene.length > 0 ? ov.scene : undefined;
    if (typeof ov.body === "string") merged.body = ov.body.length > 0 ? ov.body : undefined;
    if (Array.isArray(ov.lines)) merged.lines = sanitizeBeatLines(ov.lines);
    if (Array.isArray(ov.choices)) {
      const arr = sanitizeChoiceArray(ov.choices);
      merged.choices = (arr && arr.length > 0) ? arr : undefined;
    } else if (ov.choices && typeof ov.choices === "object" && Array.isArray(base.choices)) {
      merged.choices = base.choices.map((c) => ({ ...c, label: ov.choices[c.id]?.label ?? c.label }));
    }
    if (ov.trigger) { const t = sanitizeBeatTrigger(ov.trigger); if (t) merged.trigger = t; }
    if (Object.prototype.hasOwnProperty.call(ov, "repeat")) merged.repeat = ov.repeat === true ? true : undefined;
    if (Object.prototype.hasOwnProperty.call(ov, "repeatCooldown")) {
      const cd = sanitizeBeatRepeatCooldown(ov.repeatCooldown);
      if (cd) merged.repeatCooldown = cd; else delete merged.repeatCooldown;
    }
    if (Object.prototype.hasOwnProperty.call(ov, "onComplete")) {
      const oc = sanitizeBeatOnComplete(ov.onComplete);
      if (oc) merged.onComplete = { ...(base.onComplete || {}), ...oc };
    }
  }
  return merged;
}

/** Effective choices for a beat (array form), defaulting to [] for non-forks. */
export function effectiveChoices(beatId, draft) {
  const b = effectiveBeat(beatId, draft);
  return Array.isArray(b?.choices) ? b.choices : [];
}

/** Every beat id known to the editor (built-ins + drafts). */
export function allBeatIds(draft) {
  const suppressed = suppressedBeatIds(draft);
  return [
    ...STORY_BEATS.map((b) => b.id),
    ...SIDE_BEATS.map((b) => b.id).filter((id) => !suppressed.has(id)),
    ...draftBeats(draft).map((b) => b && b.id).filter(Boolean),
  ];
}

/** The first effective choice (across all beats) whose outcome queues `beatId`. */
export function findIncomingChoice(beatId, draft) {
  for (const id of allBeatIds(draft)) {
    const b = effectiveBeat(id, draft);
    for (const c of (b?.choices || [])) {
      if (c?.outcome?.queueBeat === beatId) return { parentId: id, parent: b, choice: c };
    }
  }
  return null;
}

// ─── Canvas geometry ─────────────────────────────────────────────────────────

export const NW = 160, NH = 88, MY = 360;
export const DRAFT_LANE_Y = 1200;     // y of the first auto-placed draft-beat row
export const BR_HEADER_H = 78, BR_ROW_H = 38, BR_ROW_GAP = 4, BR_FOOTER_H = 22;

export function branchingNodeHeight(n) {
  return BR_HEADER_H + n * BR_ROW_H + Math.max(0, n - 1) * BR_ROW_GAP + BR_FOOTER_H;
}
export function branchingRowCenterY(idx) {
  return BR_HEADER_H + idx * (BR_ROW_H + BR_ROW_GAP) + BR_ROW_H / 2;
}

// Hand-positioned layout for the canonical beats. Edge `kind:"choice"` rows are
// Hand-positioned starting layout for the canonical beats — `{ id, x, y }` only.
// Render *type* (compact / fork / resolution) is derived from each beat's data
// in deriveGraph (a beat with choices → fork; a trigger-less endpoint →
// resolution; otherwise compact). Positions can be dragged in the editor (saved
// under `hearth.story.layout`). Edge `kind:"choice"` rows are derived from data;
// only `kind:"trigger"` edges live in LAYOUT_TRIGGER_EDGES.
export const LAYOUT_NODES = [
  // Act I
  { id: "act1_arrival",       x: 32,   y: MY },
  { id: "act1_light_hearth",  x: 216,  y: MY },
  { id: "act1_first_bread",   x: 400,  y: MY },
  { id: "act1_build_mill",    x: 584,  y: MY },
  // Act II
  { id: "act2_bram_arrives",  x: 784,  y: MY },
  { id: "act2_first_hinge",   x: 968,  y: MY },
  { id: "act2_frostmaw",      x: 1152, y: MY },
  { id: "act2_liss_arrives",  x: 1336, y: MY },
  // Act III
  { id: "act3_mine_found",    x: 1536, y: MY },
  { id: "act3_mine_opened",   x: 1720, y: MY },
  { id: "act3_caravan",       x: 1904, y: MY },
  { id: "act3_festival",      x: 2088, y: MY },
  { id: "act3_win",           x: 2272, y: MY },
  // Side: Mira's Letter (the fork sits below Act II)
  { id: "mira_letter_1",      x: 1000, y: 580 },
  { id: "mira_letter_sent",   x: 1300, y: 500 },
  { id: "mira_letter_read",   x: 1300, y: 740 },
  { id: "mira_letter_kept",   x: 1300, y: 980 },
  // Side: The Hearth-Keeper
  { id: "frostmaw_keeper",          x: 1620, y: 580 },
  { id: "frostmaw_keeper_coexist",  x: 1950, y: 500 },
  { id: "frostmaw_keeper_driveout", x: 1950, y: 740 },
];

export const LAYOUT_TRIGGER_EDGES = [
  { from: "act1_arrival",      to: "act1_light_hearth" },
  { from: "act1_light_hearth", to: "act1_first_bread" },
  { from: "act1_first_bread",  to: "act1_build_mill" },
  { from: "act1_build_mill",   to: "act2_bram_arrives" },
  { from: "act2_bram_arrives", to: "act2_first_hinge" },
  { from: "act2_first_hinge",  to: "act2_frostmaw" },
  { from: "act2_frostmaw",     to: "act2_liss_arrives" },
  { from: "act2_liss_arrives", to: "act3_mine_found" },
  { from: "act3_mine_found",   to: "act3_mine_opened" },
  { from: "act3_mine_opened",  to: "act3_caravan" },
  { from: "act3_caravan",      to: "act3_festival" },
  { from: "act3_festival",     to: "act3_win" },
  // visual hints for where the side forks hang off the main spine
  { from: "act2_bram_arrives", to: "mira_letter_1",   side: true },
  { from: "act2_frostmaw",     to: "frostmaw_keeper", side: true },
];

const CANVAS_W_BASE = 2500;
const CANVAS_H_BASE = 1150;

const NODE_W_COMPACT = NW, NODE_H_COMPACT = NH;
const NODE_W_RESOLUTION = 264, NODE_H_RESOLUTION = 192;
const NODE_W_FORK = 240;

/**
 * Render type for a beat, derived from its data:
 *  - `branching` (fork) — it has choices; shows a choice row per option.
 *  - `expanded` (resolution / dialogue card) — a draft beat, or a built-in beat
 *    with no trigger (a branch endpoint queued via a choice); shows the dialogue.
 *  - `compact` — everything else (trigger-fired mid-chain beats).
 */
export function nodeKind(beatId, draft, isDraftNode) {
  const beat = effectiveBeat(beatId, draft);
  if (Array.isArray(beat?.choices) && beat.choices.length > 0) return "branching";
  if (isDraftNode || !beat?.trigger) return "expanded";
  return "compact";
}

/**
 * Build the canvas graph from the live draft (+ a `positions` map of
 * drag-saved overrides). Returns:
 *   { nodes:[{id,x,y,w,h,branching,expanded,draft}], edges:[{from,to,kind,choice?,side?}], bounds:{w,h} }
 * - Positions: `positions[id]` overrides the static layout (and the auto-placed
 *   "Drafts" lane for author-created beats).
 * - Render type/size is derived (see `nodeKind`) — a fork's height scales with
 *   its choice count.
 * - `kind:"trigger"` edges come from LAYOUT_TRIGGER_EDGES; `kind:"choice"` edges
 *   are derived from each beat's effective `choices[].outcome.queueBeat`.
 */
export function deriveGraph(draft, positions = {}) {
  const dBeats = draftBeats(draft);
  const suppressed = suppressedBeatIds(draft);
  const pos = (positions && typeof positions === "object") ? positions : {};
  const at = (id, dx, dy) => ({ x: Number.isFinite(pos[id]?.x) ? pos[id].x : dx, y: Number.isFinite(pos[id]?.y) ? pos[id].y : dy });

  const placed = [];
  const known = new Set();
  for (const ln of LAYOUT_NODES) {
    if (suppressed.has(ln.id)) continue;
    if (known.has(ln.id)) continue;
    known.add(ln.id);
    placed.push({ id: ln.id, draft: false, ...at(ln.id, ln.x, ln.y) });
  }
  let dIdx = 0;
  for (const b of dBeats) {
    if (!b || typeof b.id !== "string" || known.has(b.id)) continue;
    known.add(b.id);
    const col = dIdx % 6, row = Math.floor(dIdx / 6);
    dIdx += 1;
    placed.push({ id: b.id, draft: true, ...at(b.id, 32 + col * 300, DRAFT_LANE_Y + row * 220) });
  }
  const nodeIds = new Set(placed.map((n) => n.id));

  const edges = [];
  const seen = new Set();
  const push = (e) => {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) return;
    const k = `${e.from}|${e.to}|${e.kind}|${e.choice || ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    edges.push(e);
  };
  for (const e of LAYOUT_TRIGGER_EDGES) push({ from: e.from, to: e.to, kind: "trigger", side: !!e.side });
  for (const n of placed) {
    for (const c of effectiveChoices(n.id, draft)) {
      const target = c?.outcome?.queueBeat;
      if (typeof target === "string") push({ from: n.id, to: target, kind: "choice", choice: c.id });
    }
  }

  const nodes = placed.map((p) => {
    const kind = nodeKind(p.id, draft, p.draft);
    const choiceCount = effectiveChoices(p.id, draft).length;
    const branching = kind === "branching", expanded = kind === "expanded";
    const w = branching ? NODE_W_FORK : (expanded ? NODE_W_RESOLUTION : NODE_W_COMPACT);
    const h = branching ? branchingNodeHeight(Math.max(1, choiceCount)) : (expanded ? NODE_H_RESOLUTION : NODE_H_COMPACT);
    return { ...p, w, h, branching, expanded };
  });

  let maxX = CANVAS_W_BASE, maxY = CANVAS_H_BASE;
  for (const n of nodes) { maxX = Math.max(maxX, n.x + n.w + 80); maxY = Math.max(maxY, n.y + n.h + 80); }
  return { nodes, edges, bounds: { w: maxX, h: maxY } };
}

/** An edge whose source being collapsed should hide it (a fork branch / side hint). */
const isFoldable = (e) => e.kind === "choice" || !!e.side;

/** Node ids that have ≥1 foldable outgoing edge — these get a collapse toggle. */
export function collapsibleIds(edges) {
  const s = new Set();
  for (const e of edges) if (isFoldable(e)) s.add(e.from);
  return s;
}

/**
 * Filter a graph for collapsed subtrees. A collapsed node stays visible; from it
 * only the main story chain (`kind:"trigger"`, not `side`) keeps flowing, so its
 * choice branches / side hints (and everything only reachable through them) are
 * hidden. Returns { nodes, edges, hiddenCounts:{[collapsedId]:n} }.
 */
export function visibleSubset(nodes, edges, collapsed) {
  if (!collapsed || collapsed.size === 0) return { nodes, edges, hiddenCounts: {} };
  const adj = new Map();
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const traverseFrom = (id) => {
    const outs = adj.get(id) || [];
    return collapsed.has(id) ? outs.filter((e) => e.kind === "trigger" && !e.side) : outs;
  };
  const visible = new Set();
  const queue = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift();
    if (visible.has(id)) continue;
    visible.add(id);
    for (const e of traverseFrom(id)) if (!visible.has(e.to)) queue.push(e.to);
  }
  for (const n of nodes) if ((indeg.get(n.id) || 0) === 0) visible.add(n.id);

  // hidden count per collapsed node: nodes reachable from it via foldable paths
  // that aren't currently visible.
  const hiddenCounts = {};
  for (const cid of collapsed) {
    const seen = new Set();
    const q = (adj.get(cid) || []).filter(isFoldable).map((e) => e.to);
    while (q.length) {
      const x = q.shift();
      if (seen.has(x)) continue;
      seen.add(x);
      for (const e of (adj.get(x) || [])) q.push(e.to);
    }
    let cnt = 0;
    for (const x of seen) if (!visible.has(x)) cnt += 1;
    if (cnt > 0) hiddenCounts[cid] = cnt;
  }
  const edgeVisible = (e) => {
    if (!visible.has(e.from) || !visible.has(e.to)) return false;
    if (collapsed.has(e.from) && isFoldable(e)) return false;
    return true;
  };
  return { nodes: nodes.filter((n) => visible.has(n.id)), edges: edges.filter(edgeVisible), hiddenCounts };
}

export function directionalNodeId(nodes, selectedId, dir) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (list.length === 0) return null;
  const cur = list.find((n) => n.id === selectedId);
  if (!cur) return list[0].id;
  const cx = cur.x + cur.w / 2;
  const cy = cur.y + cur.h / 2;
  let best = null;
  for (const n of list) {
    if (!n || n.id === cur.id) continue;
    const nx = n.x + n.w / 2;
    const ny = n.y + n.h / 2;
    const dx = nx - cx;
    const dy = ny - cy;
    const ok =
      (dir === "left" && dx < -12) ||
      (dir === "right" && dx > 12) ||
      (dir === "up" && dy < -12) ||
      (dir === "down" && dy > 12);
    if (!ok) continue;
    const primary = (dir === "left" || dir === "right") ? Math.abs(dx) : Math.abs(dy);
    const secondary = (dir === "left" || dir === "right") ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 0.65;
    if (!best || score < best.score) best = { id: n.id, score };
  }
  return best?.id || cur.id;
}

// ─── View-preference persistence (collapse state · dragged node positions) ───

const COLLAPSE_KEY = "hearth.story.collapsed";
const LAYOUT_KEY = "hearth.story.layout";

export function readCollapsed() {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(COLLAPSE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : []);
  } catch { return new Set(); }
}
export function writeCollapsed(set) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
  } catch { /* storage unavailable */ }
}

/** `{ [beatId]: { x, y } }` of dragged node positions (overrides the static layout). */
export function readNodePositions() {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(LAYOUT_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if (!obj || typeof obj !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k === "string" && v && Number.isFinite(v.x) && Number.isFinite(v.y)) out[k] = { x: v.x, y: v.y };
    }
    return out;
  } catch { return {}; }
}
export function writeNodePositions(map) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(map || {}));
  } catch { /* storage unavailable */ }
}

// ─── Small UI atoms shared across the editor ─────────────────────────────────

export function FieldLabel({ children, hint }) {
  return (
    <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>
      {children}
      {hint && <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.7 }}> {hint}</span>}
    </span>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
        background: "#fff", font: "400 12px/1 system-ui", color: C.ink, outline: "none",
        width: "100%", boxSizing: "border-box", ...(props.style || {}),
      }}
    />
  );
}

export function Btn({ tone = "ghost", children, style, ...rest }) {
  const tones = {
    primary: { bg: C.green, bd: C.greenDeep, fg: "#fff" },
    ember:   { bg: C.ember, bd: C.emberDeep, fg: "#fff" },
    danger:  { bg: "transparent", bd: C.red, fg: C.redDeep },
    ghost:   { bg: C.parchmentDeep, bd: C.border, fg: C.inkLight },
  };
  const t = tones[tone] || tones.ghost;
  return (
    <button
      {...rest}
      style={{
        padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${t.bd}`,
        background: t.bg, color: t.fg, font: "700 10px/1 system-ui", cursor: "pointer",
        whiteSpace: "nowrap", ...(style || {}),
      }}
    >
      {children}
    </button>
  );
}
