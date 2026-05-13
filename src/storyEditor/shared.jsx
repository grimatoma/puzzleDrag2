// Story Tree Editor — shared atoms, colours, and the beat/graph model.
// Pure(ish) module: no app state, just data + tiny presentational helpers used
// by both the canvas (index.jsx) and the inspector (Inspector.jsx).

import { STORY_BEATS, SIDE_BEATS, SCENE_THEMES } from "../story.js";
import {
  sanitizeBeatLines, sanitizeChoiceArray, sanitizeChoiceOutcome,
  sanitizeBeatTrigger, sanitizeBeatOnComplete,
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

// Re-export the canonical sanitizers so callers don't reach into config/.
export { sanitizeBeatLines, sanitizeChoiceArray, sanitizeChoiceOutcome, sanitizeBeatTrigger, sanitizeBeatOnComplete };

// ─── Draft (override-doc) helpers ────────────────────────────────────────────

const DRAFT_KEYS = ["upgradeThresholds", "items", "recipes", "buildings",
  "tilePowers", "tileUnlocks", "tileDescriptions", "zones", "workers", "keepers",
  "expedition", "biomes", "tuning", "npcs", "story", "bosses", "achievements", "dailyRewards"];

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
  const base = fromDraft || BUILTIN_BEAT(beatId);
  if (!base) return null;
  const merged = { ...base };
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
  return [
    ...STORY_BEATS.map((b) => b.id),
    ...SIDE_BEATS.map((b) => b.id),
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
// *derived from data* now (see deriveGraph) — only `kind:"trigger"` edges live
// here, plus the node boxes.
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
  // Side: Mira's Letter (branching below Act II)
  { id: "mira_letter_1",      x: 1000, y: 580, branching: true },
  { id: "mira_letter_sent",   x: 1300, y: 500, expanded: true },
  { id: "mira_letter_read",   x: 1300, y: 740, expanded: true },
  { id: "mira_letter_kept",   x: 1300, y: 980, expanded: true },
  // Side: Frostmaw Keeper
  { id: "frostmaw_keeper",          x: 1620, y: 580, branching: true },
  { id: "frostmaw_keeper_coexist",  x: 1950, y: 500, expanded: true },
  { id: "frostmaw_keeper_driveout", x: 1950, y: 740, expanded: true },
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

/**
 * Build the canvas graph from the live draft. Returns:
 *   { nodes:[{id,x,y,w,h,branching?,expanded?,draft?}], edges:[{from,to,kind,choice?,side?}], bounds:{w,h} }
 * - Static beats keep their hand-positioned boxes (heights re-derived for forks).
 * - Author-created beats are auto-placed in a "Drafts" lane below the canvas.
 * - `kind:"trigger"` edges come from LAYOUT; `kind:"choice"` edges are derived
 *   from each beat's effective `choices[].outcome.queueBeat`.
 */
export function deriveGraph(draft) {
  const dBeats = draftBeats(draft);

  const nodes = [];
  const known = new Set();
  for (const ln of LAYOUT_NODES) {
    if (known.has(ln.id)) continue;
    known.add(ln.id);
    let w = NW, h = NH;
    if (ln.branching) {
      const n = effectiveChoices(ln.id, draft).length || 1;
      w = 240; h = branchingNodeHeight(n);
    } else if (ln.expanded) {
      w = 260; h = 188;
    }
    nodes.push({ id: ln.id, x: ln.x, y: ln.y, w, h, branching: !!ln.branching, expanded: !!ln.expanded, draft: false });
  }
  // draft beats → "Drafts" lane
  let dIdx = 0;
  for (const b of dBeats) {
    if (!b || typeof b.id !== "string" || known.has(b.id)) continue;
    known.add(b.id);
    const col = dIdx % 6, row = Math.floor(dIdx / 6);
    dIdx += 1;
    nodes.push({
      id: b.id, kind: "draft", draft: true, expanded: true,
      x: 32 + col * 300, y: DRAFT_LANE_Y + row * 220, w: 264, h: 196,
    });
  }
  const nodeIds = new Set(nodes.map((n) => n.id));

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
  for (const n of nodes) {
    for (const c of effectiveChoices(n.id, draft)) {
      const target = c?.outcome?.queueBeat;
      if (typeof target === "string") push({ from: n.id, to: target, kind: "choice", choice: c.id });
    }
  }

  let maxX = CANVAS_W_BASE, maxY = CANVAS_H_BASE;
  for (const n of nodes) { maxX = Math.max(maxX, n.x + n.w + 60); maxY = Math.max(maxY, n.y + n.h + 60); }
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

// ─── Collapse-state persistence ──────────────────────────────────────────────

const COLLAPSE_KEY = "hearth.story.collapsed";

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
