// Story Tree Editor — full-page editor at /story/
// Visualises STORY_BEATS + SIDE_BEATS as a decision tree. Edits go to
// draft.story.beats[beatId] in hearth.balance.draft (same localStorage key as
// the Balance Manager), so overrides are picked up by the game on next load.
// Presentation-only fields: title, scene, body, lines, choice labels.

import { useState, useEffect, useCallback, useRef } from "react";
import { STORY_BEATS, SIDE_BEATS, SCENE_THEMES } from "../story.js";
import { writeBalanceDraft } from "../config/applyOverrides.js";
import { BALANCE_OVERRIDES } from "../constants.js";

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
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
  canvas:        "#f0e8d4",
  canvasRule:    "#ddd0b4",
};

// ─── NPC data ─────────────────────────────────────────────────────────────────

const NPCS = {
  wren:  { name: "Wren",        color: "#7a8b5e", initial: "W", bg: "linear-gradient(160deg,#8a9d6b,#4a5638)" },
  mira:  { name: "Mira",        color: "#c9863a", initial: "M", bg: "linear-gradient(160deg,#e0a364,#7a4a1f)" },
  tomas: { name: "Old Tomas",   color: "#a36a6a", initial: "T", bg: "linear-gradient(160deg,#b88080,#5a3232)" },
  bram:  { name: "Bram",        color: "#8a5040", initial: "B", bg: "linear-gradient(160deg,#a45a3a,#3a1a0e)" },
  liss:  { name: "Sister Liss", color: "#7e7aa6", initial: "L", bg: "linear-gradient(160deg,#948fc4,#3e3a5e)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actColor(beat) {
  if (beat?.side || beat?.resolution) return "#7e7aa6";
  if (beat?.act === 1) return "#7a8b5e";
  if (beat?.act === 2) return "#c9863a";
  if (beat?.act === 3) return "#a8431a";
  return "#8b6845";
}

function hexAlpha(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

function triggerSummary(beat) {
  const t = beat?.trigger;
  if (t) {
    switch (t.type) {
      case "session_start":        return { icon: "▶", label: "Session start", kind: "trigger" };
      case "act_entered":          return { icon: "↦", label: `Act ${["","I","II","III"][t.act]||t.act}`, kind: "trigger" };
      case "resource_total":       return { icon: "⛁", label: `${t.key.split("_").pop()} ≥ ${t.amount}`, kind: "trigger" };
      case "resource_total_multi": return { icon: "⛁", label: `${Object.keys(t.req).length} resources`, kind: "trigger" };
      case "craft_made":           return { icon: "✦", label: `Craft ${t.item}`, kind: "trigger" };
      case "building_built":       return { icon: "▥", label: `Build ${t.id}`, kind: "trigger" };
      case "boss_defeated":        return { icon: "⚔", label: `Defeat ${t.id}`, kind: "trigger" };
      case "all_buildings_built":  return { icon: "▥", label: "All buildings", kind: "trigger" };
      case "bond_at_least":        return { icon: "♥", label: `${NPCS[t.npc]?.name||t.npc} bond ≥ ${t.amount}`, kind: "trigger" };
      default:                     return { icon: "?", label: t.type, kind: "trigger" };
    }
  }
  const hints = { frostmaw_keeper: { icon: "⚔", label: "Frostmaw defeated", kind: "queued-code" } };
  return hints[beat?.id] ?? null;
}

function findBeatLocal(id) {
  return STORY_BEATS.find(b => b.id === id) || SIDE_BEATS.find(b => b.id === id) || null;
}

function findIncomingChoice(beatId) {
  const all = [...STORY_BEATS, ...SIDE_BEATS];
  for (const b of all) {
    for (const c of (b.choices || [])) {
      if (c.outcome?.queueBeat === beatId) return { parent: b, choice: c };
    }
  }
  return null;
}

// ─── Portrait ─────────────────────────────────────────────────────────────────

function Portrait({ npcKey, size = 24 }) {
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

// ─── Node sizing ──────────────────────────────────────────────────────────────

const BR_HEADER_H = 78;
const BR_ROW_H    = 38;
const BR_ROW_GAP  = 4;
const BR_FOOTER_H = 22;

function branchingNodeHeight(n) {
  return BR_HEADER_H + n * BR_ROW_H + Math.max(0, n - 1) * BR_ROW_GAP + BR_FOOTER_H;
}
function branchingRowCenterY(idx) {
  return BR_HEADER_H + idx * (BR_ROW_H + BR_ROW_GAP) + BR_ROW_H / 2;
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

const NW = 160, NH = 88, MY = 360;

const LAYOUT = {
  nodes: [
    // Act I
    { id: "act1_arrival",       x: 32,   y: MY, w: NW, h: NH },
    { id: "act1_light_hearth",  x: 216,  y: MY, w: NW, h: NH },
    { id: "act1_first_bread",   x: 400,  y: MY, w: NW, h: NH },
    { id: "act1_build_mill",    x: 584,  y: MY, w: NW, h: NH },
    // Act II
    { id: "act2_bram_arrives",  x: 784,  y: MY, w: NW, h: NH },
    { id: "act2_first_hinge",   x: 968,  y: MY, w: NW, h: NH },
    { id: "act2_frostmaw",      x: 1152, y: MY, w: NW, h: NH },
    { id: "act2_liss_arrives",  x: 1336, y: MY, w: NW, h: NH },
    // Act III
    { id: "act3_mine_found",    x: 1536, y: MY, w: NW, h: NH },
    { id: "act3_mine_opened",   x: 1720, y: MY, w: NW, h: NH },
    { id: "act3_caravan",       x: 1904, y: MY, w: NW, h: NH },
    { id: "act3_festival",      x: 2088, y: MY, w: NW, h: NH },
    { id: "act3_win",           x: 2272, y: MY, w: NW, h: NH },
    // Side: Mira's Letter (branching below Act II)
    { id: "mira_letter_1",      x: 1000, y: 580, w: 240, h: branchingNodeHeight(3), branching: true },
    { id: "mira_letter_sent",   x: 1300, y: 500, w: 260, h: 180, expanded: true },
    { id: "mira_letter_read",   x: 1300, y: 710, w: 260, h: 180, expanded: true },
    { id: "mira_letter_kept",   x: 1300, y: 920, w: 260, h: 180, expanded: true },
    // Side: Frostmaw Keeper (branching below Act II, right cluster)
    { id: "frostmaw_keeper",          x: 1620, y: 580, w: 270, h: branchingNodeHeight(2), branching: true },
    { id: "frostmaw_keeper_coexist",  x: 1950, y: 500, w: 260, h: 180, expanded: true },
    { id: "frostmaw_keeper_driveout", x: 1950, y: 710, w: 260, h: 180, expanded: true },
  ],
  edges: [
    // Main story chain
    { from: "act1_arrival",      to: "act1_light_hearth",  kind: "trigger" },
    { from: "act1_light_hearth", to: "act1_first_bread",   kind: "trigger" },
    { from: "act1_first_bread",  to: "act1_build_mill",    kind: "trigger" },
    { from: "act1_build_mill",   to: "act2_bram_arrives",  kind: "trigger" },
    { from: "act2_bram_arrives", to: "act2_first_hinge",   kind: "trigger" },
    { from: "act2_first_hinge",  to: "act2_frostmaw",      kind: "trigger" },
    { from: "act2_frostmaw",     to: "act2_liss_arrives",  kind: "trigger" },
    { from: "act2_liss_arrives", to: "act3_mine_found",    kind: "trigger" },
    { from: "act3_mine_found",   to: "act3_mine_opened",   kind: "trigger" },
    { from: "act3_mine_opened",  to: "act3_caravan",       kind: "trigger" },
    { from: "act3_caravan",      to: "act3_festival",      kind: "trigger" },
    { from: "act3_festival",     to: "act3_win",           kind: "trigger" },
    // Side branches
    { from: "act2_bram_arrives", to: "mira_letter_1",             kind: "trigger", side: true },
    { from: "mira_letter_1",     to: "mira_letter_sent",          kind: "choice",  choice: "send" },
    { from: "mira_letter_1",     to: "mira_letter_read",          kind: "choice",  choice: "read" },
    { from: "mira_letter_1",     to: "mira_letter_kept",          kind: "choice",  choice: "keep" },
    { from: "act2_frostmaw",     to: "frostmaw_keeper",           kind: "trigger", side: true },
    { from: "frostmaw_keeper",   to: "frostmaw_keeper_coexist",   kind: "choice",  choice: "coexist" },
    { from: "frostmaw_keeper",   to: "frostmaw_keeper_driveout",  kind: "choice",  choice: "drive_out" },
  ],
};

const CANVAS_W = 2500;
const CANVAS_H = 1150;

// ─── Draft helpers ────────────────────────────────────────────────────────────

function emptyDraft() {
  return { version: 1, upgradeThresholds: {}, items: {}, recipes: {}, buildings: {},
    tilePowers: {}, tileUnlocks: {}, tileDescriptions: {}, zones: {}, workers: {},
    keepers: {}, expedition: {}, biomes: {}, tuning: {}, npcs: {}, story: {},
    bosses: {}, achievements: {}, dailyRewards: {} };
}

function cloneDraft(d) {
  if (!d) return emptyDraft();
  const base = emptyDraft();
  for (const k of Object.keys(base)) {
    if (k === "version") base[k] = d[k] ?? 1;
    else if (d[k] && typeof d[k] === "object") base[k] = JSON.parse(JSON.stringify(d[k]));
  }
  return base;
}

// ─── Tree edge ────────────────────────────────────────────────────────────────

function TreeEdge({ edge }) {
  const fromNode = LAYOUT.nodes.find(n => n.id === edge.from);
  const toNode   = LAYOUT.nodes.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return null;

  let x1 = fromNode.x + fromNode.w;
  let y1 = fromNode.y + fromNode.h / 2;

  if (edge.kind === "choice" && edge.choice && fromNode.branching) {
    const fromBeat = findBeatLocal(edge.from);
    const idx = (fromBeat?.choices || []).findIndex(c => c.id === edge.choice);
    if (idx >= 0) y1 = fromNode.y + branchingRowCenterY(idx);
  }

  const x2 = toNode.x;
  const y2 = toNode.y + toNode.h / 2;
  const dx = Math.max(40, (x2 - x1) * 0.55);
  const path = `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`;

  const isChoice  = edge.kind === "choice";
  const isTrigger = edge.kind === "trigger";
  const stroke = isChoice ? C.ember : isTrigger ? "#8b6845" : "#a39880";
  const sw     = isChoice ? 2 : isTrigger ? 1.4 : 1.3;
  const dash   = isTrigger ? "5 5" : null;

  return (
    <g>
      <path d={path} fill="none" stroke={stroke} strokeWidth={sw}
            strokeDasharray={dash} opacity={edge.side ? 0.7 : 1} />
      <polygon points={`${x2-7},${y2-5} ${x2},${y2} ${x2-7},${y2+5}`}
               fill={stroke} opacity={edge.side ? 0.7 : 1} />
    </g>
  );
}

// ─── Trigger chip ─────────────────────────────────────────────────────────────

function TriggerChip({ beat, accent }) {
  const ts = triggerSummary(beat);
  if (!ts) return null;
  const tone = ts.kind === "queued-code"
    ? { fg: C.emberDeep, bd: C.emberDeep }
    : { fg: C.ink, bd: accent || "#8b6845" };
  return (
    <div style={{
      position: "absolute", top: -10, left: 10, zIndex: 3,
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 7px", borderRadius: 999,
      background: "#fff", border: `1.5px solid ${tone.bd}`, color: tone.fg,
      font: "700 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase",
      whiteSpace: "nowrap", boxShadow: "0 1px 2px rgba(40,28,10,0.15)",
      maxWidth: "calc(100% - 20px)",
    }}>
      <span style={{ fontSize: 11, lineHeight: 0, color: tone.bd }}>{ts.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{ts.label}</span>
    </div>
  );
}

// ─── Compact node ─────────────────────────────────────────────────────────────

function CompactNode({ node, beat, selected, onSelect }) {
  const ringColor = actColor(beat);
  const speakers  = [...new Set((beat?.lines || []).map(l => l.speaker).filter(Boolean))];
  const firstLine = beat?.lines?.[0]?.text || beat?.body || "—";
  const hasSpeaker = beat?.lines?.find(l => l.speaker)?.speaker;
  const choices   = beat?.choices || [];

  return (
    <div
      style={{ position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h, cursor: "pointer" }}
      onClick={() => onSelect(beat?.id)}
    >
      <TriggerChip beat={beat} accent={ringColor} />
      <div style={{
        width: "100%", height: "100%", borderRadius: 10,
        background: selected ? "linear-gradient(180deg,#fff 0%,#fbf6ea 100%)" : "#fff",
        border: selected ? `2px solid ${ringColor}` : `1.5px solid #ddd0b4`,
        boxShadow: selected
          ? `0 0 0 3px ${hexAlpha(ringColor,0.2)}, 0 8px 16px -6px rgba(40,28,10,0.22)`
          : "0 2px 6px -2px rgba(40,28,10,0.12)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{ height: 4, background: ringColor }} />
        <div style={{ padding: "7px 9px", height: node.h - 4 - 20, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
            <div style={{ font: "600 11px/1.2 system-ui", color: C.ink, overflow: "hidden",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {beat?.title}
            </div>
            <div style={{ display: "flex" }}>
              {speakers.slice(0, 3).map((sp, i) => (
                <div key={sp} style={{ marginLeft: i > 0 ? -5 : 0, zIndex: 3-i, border: "1.5px solid #fff", borderRadius: "50%" }}>
                  <Portrait npcKey={sp} size={18} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ font: "italic 400 10px/1.35 Georgia,serif", color: C.inkSubtle,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {hasSpeaker ? `"${firstLine}"` : firstLine}
          </div>
        </div>
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "0 9px", height: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(240,232,212,0.7)", borderTop: "1px solid #ddd0b4",
        }}>
          <span style={{ font: "500 9px/1 monospace", color: C.inkSubtle }}>{beat?.id}</span>
          <span style={{ font: "600 8px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase", color: C.inkSubtle }}>
            {choices.length > 0 ? `${choices.length} choices` : beat?.resolution ? "END" : "→ continue"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Branching node ───────────────────────────────────────────────────────────

function BranchingNode({ node, beat, selected, onSelect }) {
  const ringColor = actColor(beat);
  const choices   = beat?.choices || [];
  const firstLine = beat?.lines?.[0]?.text || "—";
  const firstSpk  = beat?.lines?.find(l => l.speaker)?.speaker;

  return (
    <div
      style={{ position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h, cursor: "pointer" }}
      onClick={() => onSelect(beat?.id)}
    >
      <TriggerChip beat={beat} accent={ringColor} />
      <div style={{
        width: "100%", height: "100%", borderRadius: 12,
        background: selected ? "linear-gradient(180deg,#fff,#fbf6ea)" : "#fff",
        border: selected ? `2px solid ${ringColor}` : `1.5px solid ${ringColor}`,
        boxShadow: selected
          ? `0 0 0 4px ${hexAlpha(ringColor,0.18)}, 0 12px 24px -8px rgba(40,28,10,0.26)`
          : `0 0 0 2px ${hexAlpha(ringColor,0.10)}, 0 4px 10px -4px rgba(40,28,10,0.18)`,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ height: BR_HEADER_H, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
          background: "linear-gradient(180deg,rgba(255,255,255,0.6),transparent)",
          borderBottom: "1px solid rgba(200,180,140,0.3)", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ font: "600 12px/1.2 system-ui", color: C.ink, paddingRight: 44,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {beat?.title}
            </div>
            {firstSpk && (
              <div style={{ border: "1.5px solid #fff", borderRadius: "50%", flexShrink: 0 }}>
                <Portrait npcKey={firstSpk} size={20} />
              </div>
            )}
          </div>
          <div style={{ font: "italic 400 10px/1.35 Georgia,serif", color: C.inkSubtle,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {firstSpk ? `"${firstLine}"` : firstLine}
          </div>
          <div style={{ position: "absolute", top: 8, right: 8, padding: "2px 7px", borderRadius: 999,
            background: ringColor, color: "#fff", font: "700 8px/1 system-ui", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            ⑂ FORK
          </div>
        </div>
        {/* Choice rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: BR_ROW_GAP, flex: 1 }}>
          {choices.map((c, i) => {
            const o = c.outcome || {};
            const badges = [];
            if (o.bondDelta) badges.push(`♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount}`);
            if (o.embers) badges.push(`✸ ${o.embers}`);
            if (o.coreIngots) badges.push(`◈ ${o.coreIngots}`);
            if (o.setFlag) badges.push("⚐");
            return (
              <div key={c.id} style={{
                height: BR_ROW_H, padding: "0 10px",
                display: "flex", alignItems: "center", gap: 7,
                background: i === 0 ? "rgba(214,97,42,0.025)" : "transparent",
                borderTop: i > 0 ? "1px solid rgba(200,180,140,0.25)" : "none",
                position: "relative",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center",
                  background: C.ember, color: "#fff", font: "700 10px/1 monospace" }}>
                  {"ABCDE"[i]}
                </span>
                <span style={{ flex: 1, minWidth: 0, font: "500 11px/1.25 Georgia,serif", color: C.ink,
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {c.label}
                </span>
                {badges.length > 0 && (
                  <span style={{ font: "600 9px/1 monospace", color: C.emberDeep, padding: "2px 5px",
                    borderRadius: 4, background: "rgba(214,97,42,0.08)", border: "1px solid rgba(214,97,42,0.18)", flexShrink: 0 }}>
                    {badges.join(" ")}
                  </span>
                )}
                <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)",
                  width: 10, height: 10, borderRadius: "50%",
                  background: C.ember, border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.18)" }} />
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ height: BR_FOOTER_H, padding: "0 10px", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(240,232,212,0.7)", borderTop: "1px solid rgba(200,180,140,0.3)" }}>
          <span style={{ font: "500 9px/1 monospace", color: C.inkSubtle }}>{beat?.id}</span>
          <span style={{ font: "600 8px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase", color: ringColor }}>
            BRANCH · {choices.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded fork card (resolution beat) ─────────────────────────────────────

function ExpandedCard({ node, beat, selected, onSelect }) {
  const incoming = findIncomingChoice(beat?.id);
  const o = incoming?.choice?.outcome || {};
  const effects = [];
  if (o.bondDelta) effects.push({ icon: "♥", label: `Bond ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${NPCS[o.bondDelta.npc]?.name || o.bondDelta.npc}` });
  if (o.embers)    effects.push({ icon: "✸", label: `+${o.embers} Embers` });
  if (o.coreIngots) effects.push({ icon: "◈", label: `+${o.coreIngots} Core Ingots` });
  if (o.setFlag) {
    const flags = Array.isArray(o.setFlag) ? o.setFlag : [o.setFlag];
    flags.slice(0, 2).forEach(f => effects.push({ icon: "⚐", label: f }));
  }
  const speaker = beat?.lines?.find(l => l.speaker)?.speaker;

  return (
    <div
      style={{ position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h, cursor: "pointer" }}
      onClick={() => onSelect(beat?.id)}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: 12,
        background: "#fff",
        border: selected ? `2px solid ${C.ember}` : "1.5px solid #c8b48a",
        boxShadow: selected
          ? `0 0 0 3px ${hexAlpha(C.ember,0.15)}, 0 10px 20px -8px rgba(40,28,10,0.22)`
          : "0 6px 14px -6px rgba(40,28,10,0.18), 0 0 0 3px rgba(214,97,42,0.05)",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "8px 10px",
          background: "linear-gradient(180deg,rgba(214,97,42,0.08),rgba(214,97,42,0.02))",
          borderBottom: "1px solid rgba(214,97,42,0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ font: "700 8px/1 system-ui", letterSpacing: "0.14em", textTransform: "uppercase", color: C.emberDeep }}>
            RESOLUTION
          </span>
          <span style={{ font: "500 11px/1.3 Georgia,serif", color: C.ink, flex: 1, textAlign: "right",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {beat?.title}
          </span>
        </div>
        {/* Dark dialogue panel */}
        <div style={{
          margin: 8, marginBottom: 6, borderRadius: 8, padding: 8,
          background: "linear-gradient(180deg,#221710,#1a110a)",
          border: "1px solid rgba(120,80,40,0.6)",
          flex: 1, minHeight: 0,
          display: "flex", flexDirection: "column", gap: 5, overflow: "hidden",
        }}>
          {speaker && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Portrait npcKey={speaker} size={18} />
              <span style={{ font: "600 9px/1 system-ui", color: NPCS[speaker]?.color || "#d4b896",
                letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {NPCS[speaker]?.name}
              </span>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {(beat?.lines || []).map((l, i) => (
              <p key={i} style={{ margin: 0, font: l.speaker ? "400 10.5px/1.45 Georgia,serif" : "italic 400 10px/1.45 Georgia,serif",
                color: l.speaker ? "#f0e6cf" : "rgba(189,154,114,0.9)" }}>
                {l.text}
              </p>
            ))}
          </div>
        </div>
        {/* Outcome strip */}
        <div style={{ padding: "6px 8px 8px", borderTop: "1px solid rgba(200,180,140,0.3)",
          background: "rgba(240,232,212,0.5)" }}>
          <div style={{ font: "600 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase",
            color: C.inkSubtle, marginBottom: 4 }}>Branch outcome</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {effects.length === 0 && <span style={{ font: "italic 400 9.5px/1 system-ui", color: C.inkSubtle }}>no outcome</span>}
            {effects.map((ef, i) => (
              <span key={i} style={{ font: "600 9px/1 system-ui", color: C.emberDeep,
                padding: "2px 5px", borderRadius: 4,
                background: "rgba(214,97,42,0.08)", border: "1px solid rgba(214,97,42,0.18)" }}>
                {ef.icon} {ef.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tree node dispatcher ─────────────────────────────────────────────────────

function TreeNode({ node, selectedId, onSelect }) {
  const beat = findBeatLocal(node.id);
  const selected = node.id === selectedId;
  if (node.expanded)  return <ExpandedCard  node={node} beat={beat} selected={selected} onSelect={onSelect} />;
  if (node.branching) return <BranchingNode node={node} beat={beat} selected={selected} onSelect={onSelect} />;
  return <CompactNode node={node} beat={beat} selected={selected} onSelect={onSelect} />;
}

// ─── Act divider labels ───────────────────────────────────────────────────────

const ACT_LABELS = [
  { label: "Act I · Roots",     x: 32,   color: "#7a8b5e" },
  { label: "Act II · Iron",     x: 784,  color: "#c9863a" },
  { label: "Act III · Kingdom", x: 1536, color: "#a8431a" },
];

// ─── Left rail ────────────────────────────────────────────────────────────────

function LeftRail({ selectedId, onSelect }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const groups = [
    { id: 1, label: "Act I · Roots", color: "#7a8b5e",
      beats: STORY_BEATS.filter(b => b.act === 1) },
    { id: 2, label: "Act II · Iron",  color: "#c9863a",
      beats: STORY_BEATS.filter(b => b.act === 2) },
    { id: 3, label: "Act III · Kingdom", color: "#a8431a",
      beats: STORY_BEATS.filter(b => b.act === 3) },
    { id: "side", label: "Side events", color: "#7e7aa6",
      beats: SIDE_BEATS },
  ];

  return (
    <div style={{ width: 220, flexShrink: 0, background: C.parchmentDeep,
      borderRight: `2px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search beats…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 8px 6px 26px", borderRadius: 7,
              border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 11px/1 system-ui", color: C.ink, outline: "none", boxSizing: "border-box" }}
          />
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            color: C.inkSubtle, fontSize: 12 }}>🔍</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 12px" }}>
        {groups.map(g => {
          const filtered = q ? g.beats.filter(b =>
            b.id.toLowerCase().includes(q) || (b.title||"").toLowerCase().includes(q)
          ) : g.beats;
          if (filtered.length === 0) return null;
          return (
            <div key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 7,
                padding: "7px 12px", font: "600 9px/1 system-ui",
                letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkSubtle }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                {g.label}
                <span style={{ marginLeft: "auto" }}>{filtered.length}</span>
              </div>
              {filtered.map(b => {
                const isSel = b.id === selectedId;
                const isInLayout = LAYOUT.nodes.some(n => n.id === b.id);
                return (
                  <div key={b.id}
                    onClick={() => onSelect(b.id)}
                    style={{
                      padding: "5px 12px 5px 22px", cursor: "pointer",
                      background: isSel ? "rgba(214,97,42,0.12)" : "transparent",
                      borderLeft: isSel ? `3px solid ${actColor(b)}` : `3px solid transparent`,
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                    <span style={{ font: "500 11px/1.3 system-ui", color: isSel ? C.ink : C.inkLight,
                      fontWeight: isSel ? 600 : 500, flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.title}
                    </span>
                    {!isInLayout && (
                      <span style={{ font: "600 8px/1 system-ui", color: C.inkSubtle, flexShrink: 0,
                        padding: "1px 4px", borderRadius: 3, background: "rgba(0,0,0,0.06)" }}>
                        OFF
                      </span>
                    )}
                    {(b.choices?.length > 0) && (
                      <span style={{ marginLeft: "auto", font: "600 8px/1 system-ui", color: C.emberDeep,
                        background: "rgba(214,97,42,0.12)", padding: "2px 5px", borderRadius: 999, flexShrink: 0 }}>
                        {b.choices.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inspector ────────────────────────────────────────────────────────────────

const SCENE_OPTS = [
  { value: "", label: "— none —" },
  ...Object.keys(SCENE_THEMES).map(k => ({ value: k, label: `${k} — ${SCENE_THEMES[k].label}` })),
];

const linesToText = lines =>
  Array.isArray(lines)
    ? lines.map(l => `${l?.speaker ? l.speaker : "narrator"}: ${l?.text || ""}`).join("\n")
    : "";

const textToLines = str =>
  String(str ?? "").split("\n").filter(r => r.trim()).map(row => {
    const i = row.indexOf(": ");
    if (i > 0) {
      const sp = row.slice(0, i).trim();
      return { speaker: (sp === "narrator" || sp === "") ? null : sp, text: row.slice(i + 2) };
    }
    return { speaker: null, text: row.trim() };
  });

function Inspector({ beatId, draft, onPatch }) {
  const sourceBeat = findBeatLocal(beatId);
  if (!sourceBeat) {
    return (
      <div style={{ width: 320, flexShrink: 0, background: C.parchment, borderLeft: `2px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ font: "italic 400 12px/1.5 Georgia,serif", color: C.inkSubtle, textAlign: "center" }}>
          Select a beat on the canvas or in the sidebar to inspect and edit it.
        </p>
      </div>
    );
  }

  const p = (draft?.story?.beats ?? {})[beatId] ?? {};
  const eff = {
    title:  p.title  ?? sourceBeat.title  ?? beatId,
    scene:  p.scene  ?? sourceBeat.scene  ?? "",
    body:   p.body   ?? sourceBeat.body   ?? "",
    lines:  Array.isArray(p.lines) ? p.lines : (sourceBeat.lines ?? null),
  };

  const ts     = triggerSummary(sourceBeat);
  const ring   = actColor(sourceBeat);
  const isSide = !!(sourceBeat.side || !sourceBeat.act);

  return (
    <div style={{ width: 320, flexShrink: 0, background: C.parchment,
      borderLeft: `2px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "11px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999,
            background: ring, color: "#fff", font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {isSide ? "SIDE BEAT" : `ACT ${["","I","II","III"][sourceBeat.act] || sourceBeat.act}`}
          </span>
          {sourceBeat.choices?.length > 0 && (
            <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999,
              background: "rgba(214,97,42,0.14)", color: C.emberDeep,
              font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              FORK · {sourceBeat.choices.length}
            </span>
          )}
          {sourceBeat.resolution && (
            <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999,
              background: "rgba(90,90,90,0.1)", color: C.inkSubtle,
              font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              RESOLUTION
            </span>
          )}
          <span style={{ marginLeft: "auto", font: "500 9px/1 monospace", color: C.inkSubtle }}>{beatId}</span>
        </div>

        {/* Trigger info */}
        {ts && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 7px", borderRadius: 6,
            background: ts.kind === "queued-code" ? "rgba(168,64,16,0.08)" : "rgba(43,34,24,0.06)",
            border: `1px solid ${ts.kind === "queued-code" ? "rgba(168,64,16,0.2)" : "rgba(43,34,24,0.12)"}`,
            marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.inkSubtle }}>{ts.icon}</span>
            <span style={{ font: "600 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase",
              color: ts.kind === "queued-code" ? C.emberDeep : C.inkSubtle }}>
              TRIGGER
            </span>
            <span style={{ font: "400 10px/1 system-ui", color: C.inkLight }}>{ts.label}</span>
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Title */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>Title</span>
          <input
            value={eff.title}
            onChange={e => onPatch(beatId, { title: e.target.value })}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
              background: "#fff", font: "400 12px/1 system-ui", color: C.ink, outline: "none" }}
          />
        </label>

        {/* Scene */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>Scene</span>
          <select
            value={eff.scene}
            onChange={e => onPatch(beatId, { scene: e.target.value })}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
              background: "#fff", font: "400 12px/1 system-ui", color: C.ink, outline: "none" }}
          >
            {SCENE_OPTS.map(o => <option key={o.value || "_none"} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        {/* Body */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>
            Body <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.7 }}>(single line)</span>
          </span>
          <textarea
            rows={2}
            value={eff.body}
            onChange={e => onPatch(beatId, { body: e.target.value })}
            placeholder="e.g. Mira: 'Bake a loaf with me.'"
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
              background: "#fff", font: "400 11px/1.4 system-ui", color: C.ink, outline: "none",
              resize: "vertical", width: "100%", boxSizing: "border-box" }}
          />
        </label>

        {/* Lines */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>
            Lines <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.7 }}>(speaker: text per row)</span>
          </span>
          <textarea
            rows={5}
            value={eff.lines ? linesToText(eff.lines) : ""}
            onChange={e => {
              const arr = textToLines(e.target.value);
              onPatch(beatId, { lines: arr.length ? arr : undefined });
            }}
            placeholder={"narrator: She presses tongs into your palm.\nwren: Took you long enough."}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
              background: "#fff", font: "400 11px/1.4 system-ui", color: C.ink, outline: "none",
              resize: "vertical", width: "100%", boxSizing: "border-box" }}
          />
        </label>

        {/* Choices */}
        {Array.isArray(sourceBeat.choices) && sourceBeat.choices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>
              Choice labels <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, opacity: 0.7 }}>(label only — outcomes are fixed)</span>
            </span>
            {sourceBeat.choices.map(c => {
              const lbl = (p.choices ?? {})[c.id]?.label ?? c.label;
              return (
                <label key={c.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ font: "600 9px/1 monospace", color: C.ember }}>{c.id}</span>
                  <input
                    value={lbl}
                    onChange={e => {
                      const choices = { ...((p.choices ?? {})), [c.id]: { label: e.target.value } };
                      onPatch(beatId, { choices });
                    }}
                    style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`,
                      background: "#fff", font: "400 11px/1 system-ui", color: C.ink, outline: "none" }}
                  />
                </label>
              );
            })}
          </div>
        )}

        {/* onComplete (read-only info) */}
        {sourceBeat.onComplete && (
          <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
            <div style={{ font: "700 9px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase",
              color: C.inkSubtle, marginBottom: 6 }}>On complete <span style={{ textTransform: "none", fontWeight: 400, opacity: 0.6 }}>(read-only)</span></div>
            {Object.entries(sourceBeat.onComplete).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                <span style={{ font: "600 9px/1.5 monospace", color: C.inkSubtle, flexShrink: 0 }}>{k}:</span>
                <span style={{ font: "400 9px/1.5 monospace", color: C.inkLight }}>
                  {Array.isArray(v) ? v.join(", ") : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────

export default function StoryEditorApp() {
  const [draft, setDraft] = useState(() => cloneDraft(BALANCE_OVERRIDES));
  const [selectedId, setSelectedId] = useState(null);
  const [savedNotice, setSavedNotice] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false); // cursor mirror of isDragging (a ref can't drive render)
  const isDragging = useRef(false);
  const dragStart  = useRef(null);
  const canvasRef  = useRef(null);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(BALANCE_OVERRIDES);

  const saveDraft = useCallback(() => {
    writeBalanceDraft(draft);
    setSavedNotice("Saved · reload game to apply");
    setTimeout(() => setSavedNotice(""), 2400);
  }, [draft]);

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft]);

  // Pan via mouse drag on canvas background
  const onMouseDown = useCallback(e => {
    if (e.target !== canvasRef.current && !e.target.closest("[data-canvas-bg]")) return;
    isDragging.current = true;
    setDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  useEffect(() => {
    const onMove = e => {
      if (!isDragging.current) return;
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onUp = () => { isDragging.current = false; setDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // Zoom via scroll on canvas
  const onWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
  }, []);

  // Touch: one-finger pan, two-finger pinch-zoom (with focal point)
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => { panRef.current = pan; zoomRef.current = zoom; });
  const touchState = useRef(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const clampZoom = z => Math.min(2, Math.max(0.3, z));
    const onTouchStart = e => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (t.target !== el && !t.target.closest("[data-canvas-bg]")) { touchState.current = null; return; }
        touchState.current = { mode: "pan", startX: t.clientX - panRef.current.x, startY: t.clientY - panRef.current.y };
        isDragging.current = true;
        setDragging(true);
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const rect = el.getBoundingClientRect();
        touchState.current = {
          mode: "pinch",
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          startZoom: zoomRef.current,
          startPan: { ...panRef.current },
          rect,
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
        isDragging.current = false;
        setDragging(false);
      }
    };
    const onTouchMove = e => {
      const st = touchState.current;
      if (!st) return;
      if (st.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        setPan({ x: t.clientX - st.startX, y: t.clientY - st.startY });
      } else if (st.mode === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || st.dist;
        const newZoom = clampZoom(st.startZoom * (dist / st.dist));
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        // Content-space point under the original midpoint stays under the current midpoint.
        const cx = (st.midX - st.rect.left - st.startPan.x) / st.startZoom;
        const cy = (st.midY - st.rect.top  - st.startPan.y) / st.startZoom;
        setZoom(newZoom);
        setPan({ x: midX - st.rect.left - cx * newZoom, y: midY - st.rect.top - cy * newZoom });
      }
    };
    const onTouchEnd = e => {
      if (e.touches.length === 0) {
        touchState.current = null;
        isDragging.current = false;
        setDragging(false);
      } else if (e.touches.length === 1 && touchState.current?.mode === "pinch") {
        // Drop from pinch back to single-finger pan.
        const t = e.touches[0];
        touchState.current = { mode: "pan", startX: t.clientX - panRef.current.x, startY: t.clientY - panRef.current.y };
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const patchBeat = useCallback((beatId, fields) => {
    setDraft(prev => {
      const d = cloneDraft(prev);
      d.story ??= {};
      d.story.beats ??= {};
      const next = { ...(d.story.beats[beatId] ?? {}), ...fields };
      if (fields.choices) next.choices = { ...(d.story.beats[beatId]?.choices ?? {}), ...fields.choices };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v === "" || v === undefined || v === null) { delete next[k]; continue; }
        if (Array.isArray(v) && v.length === 0) { delete next[k]; continue; }
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.story.beats[beatId];
      else d.story.beats[beatId] = next;
      if (!d.story.beats || Object.keys(d.story.beats).length === 0) delete d.story.beats;
      if (d.story && Object.keys(d.story).length === 0) delete d.story;
      return d;
    });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: C.parchmentDeep, fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px", background: `linear-gradient(180deg,#2a1d0f,#3a2812)`,
        borderBottom: `3px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📖</span>
          <div>
            <div style={{ font: "700 16px/1 system-ui", color: "#f4d9a0" }}>Story Tree Editor</div>
            <div style={{ font: "400 10px/1 system-ui", color: "rgba(244,217,160,0.6)", marginTop: 2 }}>
              Hearthlands · visual decision-tree editor
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {savedNotice && (
            <span style={{ font: "700 10px/1 system-ui", padding: "4px 9px", borderRadius: 6,
              background: C.green, color: "#fff" }}>{savedNotice}</span>
          )}
          {isDirty && !savedNotice && (
            <span style={{ font: "700 10px/1 system-ui", padding: "4px 9px", borderRadius: 6,
              background: C.ember, color: "#fff", animation: "pulse 2s infinite" }}>Unsaved changes</span>
          )}
          <span style={{ font: "400 10px/1 system-ui", color: "rgba(244,217,160,0.5)" }}>
            Scroll / pinch = zoom · Drag = pan · ⌘S = save
          </span>
          <button
            onClick={saveDraft}
            style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.greenDeep}`,
              background: C.green, color: "#fff", font: "700 11px/1 system-ui", cursor: "pointer" }}>
            💾 Save Draft
          </button>
          <a
            href={import.meta.env.BASE_URL + "b/#/story"}
            style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.border}`,
              background: C.parchmentDeep, color: C.inkLight, font: "700 11px/1 system-ui",
              textDecoration: "none", cursor: "pointer" }}>
            ← Balance Manager
          </a>
          <a
            href={import.meta.env.BASE_URL}
            style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.border}`,
              background: C.parchmentDeep, color: C.inkLight, font: "700 11px/1 system-ui",
              textDecoration: "none", cursor: "pointer" }}>
            ← Back to Game
          </a>
        </div>
      </header>

      {/* Body: rail + canvas + inspector */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftRail selectedId={selectedId} onSelect={setSelectedId} />

        {/* Canvas area */}
        <div
          ref={canvasRef}
          data-canvas-bg="1"
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          style={{ flex: 1, position: "relative", overflow: "hidden", touchAction: "none",
            background: C.canvas, cursor: dragging ? "grabbing" : "grab",
            backgroundImage: `radial-gradient(circle, ${C.canvasRule} 1px, transparent 1px)`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Zoom controls */}
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10,
            display: "flex", gap: 4, background: "#fff", borderRadius: 8,
            border: `1.5px solid ${C.border}`, padding: 4 }}>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`,
                background: C.parchment, color: C.ink, font: "700 16px/1 system-ui", cursor: "pointer" }}>+</button>
            <span style={{ font: "600 10px/1 system-ui", color: C.inkSubtle, alignSelf: "center", minWidth: 32, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`,
                background: C.parchment, color: C.ink, font: "700 16px/1 system-ui", cursor: "pointer" }}>−</button>
            <button onClick={() => { setZoom(1); setPan({ x: 20, y: 20 }); }}
              style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`,
                background: C.parchment, color: C.inkSubtle, font: "400 9px/1 system-ui", cursor: "pointer" }}>↺</button>
          </div>

          {/* Transformed canvas content */}
          <div style={{ position: "absolute", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0", width: CANVAS_W, height: CANVAS_H }}>

            {/* Act labels */}
            {ACT_LABELS.map(al => (
              <div key={al.label} style={{ position: "absolute", top: MY - 32, left: al.x,
                font: "700 11px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase",
                color: al.color, opacity: 0.85 }}>
                {al.label}
              </div>
            ))}

            {/* Act dividers */}
            {[784, 1536].map(x => (
              <div key={x} style={{ position: "absolute", left: x - 22, top: MY - 40,
                width: 1, height: NH + 80, background: C.canvasRule, opacity: 0.6 }} />
            ))}

            {/* SVG edges */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: CANVAS_W, height: CANVAS_H,
              overflow: "visible", pointerEvents: "none" }}>
              {LAYOUT.edges.map((edge, i) => <TreeEdge key={i} edge={edge} />)}
            </svg>

            {/* Nodes */}
            {LAYOUT.nodes.map(node => (
              <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={setSelectedId} />
            ))}
          </div>
        </div>

        <Inspector beatId={selectedId} draft={draft} onPatch={patchBeat} />
      </div>
    </div>
  );
}
