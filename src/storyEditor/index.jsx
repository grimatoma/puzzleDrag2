// Story Tree Editor — full-page editor at /story/.
// Visualises STORY_BEATS + SIDE_BEATS (plus author-created draft beats) as a
// decision tree. Edits go to `draft.story` in the shared `hearth.balance.draft`
// localStorage key, so they flow through `applyStoryOverrides` on the game's
// next load:
//   draft.story.beats[id]   — title / scene / body / lines, the full choice
//                             list (label + whitelisted outcome), and (for
//                             draft beats) trigger + onComplete.setFlag
//   draft.story.newBeats[]  — author-created side beats / resolution branches
// Collapse state (which forks are folded on the canvas) lives in a separate
// `hearth.story.collapsed` key — it's a view preference, not game data.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { STORY_BEATS, SIDE_BEATS } from "../story.js";
import { readBalanceDraft, writeBalanceDraft } from "../config/applyOverrides.js";
import { BALANCE_OVERRIDES } from "../constants.js";
import {
  C, NPCS, Portrait, actColor, hexAlpha, triggerSummary,
  effectiveBeat, effectiveChoices, findIncomingChoice, allBeatIds,
  draftBeats, draftBeatIndex, isDraftBeat,
  cloneDraft, deriveGraph, visibleSubset, collapsibleIds,
  readCollapsed, writeCollapsed, readNodePositions, writeNodePositions, DRAFT_LANE_Y,
  branchingRowCenterY, MY, NH, Btn, directionalNodeId,
  collectStoryWarnings, renameDraftBeatInDraft, storySlicesEqual,
} from "./shared.jsx";
import Inspector from "./Inspector.jsx";
import PreviewModal from "./PreviewModal.jsx";

function builtInSideSubtreeIds(startId) {
  const ids = new Set();
  const stack = [startId];
  const sideById = new Map(SIDE_BEATS.map((b) => [b.id, b]));
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || ids.has(id) || !sideById.has(id)) continue;
    ids.add(id);
    for (const c of (sideById.get(id).choices || [])) {
      const target = c?.outcome?.queueBeat;
      if (sideById.has(target)) stack.push(target);
    }
  }
  return ids.size > 0 ? ids : new Set([startId]);
}

// ─── edges ───────────────────────────────────────────────────────────────────

function TreeEdge({ edge, nodeById, draft }) {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (!from || !to) return null;

  let x1 = from.x + from.w;
  let y1 = from.y + from.h / 2;
  if (edge.kind === "choice" && edge.choice && from.branching) {
    const idx = effectiveChoices(edge.from, draft).findIndex((c) => c.id === edge.choice);
    if (idx >= 0) y1 = from.y + branchingRowCenterY(idx);
  }
  // route to the target's left edge, but if the target sits left of the source,
  // loop out the bottom of source → top of target (keeps drafts-lane links sane).
  let x2 = to.x, y2 = to.y + to.h / 2, path;
  if (to.x + to.w < from.x) {
    x1 = from.x + from.w / 2; y1 = from.y + from.h;
    x2 = to.x + to.w / 2; y2 = to.y;
    const my = (y1 + y2) / 2;
    path = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  } else if (to.y > from.y + 240) {
    x1 = from.x + from.w / 2; y1 = from.y + from.h;
    x2 = to.x + (x2 < x1 ? to.w : 0); y2 = to.y + Math.min(to.h / 2, 24);
    const mx = (x1 + x2) / 2;
    path = `M ${x1} ${y1} C ${x1} ${y1 + 60}, ${mx} ${y2}, ${x2} ${y2}`;
  } else {
    const dx = Math.max(40, (x2 - x1) * 0.55);
    path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  const isChoice = edge.kind === "choice";
  const stroke = isChoice ? C.ember : (edge.kind === "trigger" ? "#8b6845" : "#a39880");
  const sw = isChoice ? 2 : 1.4;
  const dash = (edge.kind === "trigger" && !edge.side) ? "5 5" : (edge.side ? "2 4" : null);
  const op = edge.side ? 0.6 : 1;
  const verticalArrival = (to.y > from.y + 240) || (to.x + to.w < from.x);
  const head = verticalArrival
    ? `${x2 - 5},${y2 - 7} ${x2},${y2} ${x2 + 5},${y2 - 7}`
    : `${x2 - 7},${y2 - 5} ${x2},${y2} ${x2 - 7},${y2 + 5}`;
  return (
    <g>
      <path d={path} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} opacity={op} />
      <polygon points={head} fill={stroke} opacity={op} />
    </g>
  );
}

// ─── chips on nodes ──────────────────────────────────────────────────────────

function TriggerChip({ beat, accent }) {
  const ts = triggerSummary(beat);
  if (!ts) return null;
  const tone = ts.kind === "queued-code" ? { fg: C.emberDeep, bd: C.emberDeep } : { fg: C.ink, bd: accent || "#8b6845" };
  return (
    <div style={{ position: "absolute", top: -10, left: 10, zIndex: 3, display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 7px", borderRadius: 999, background: "#fff", border: `1.5px solid ${tone.bd}`, color: tone.fg,
      font: "700 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
      boxShadow: "0 1px 2px rgba(40,28,10,0.15)", maxWidth: "calc(100% - 20px)" }}>
      <span style={{ fontSize: 11, lineHeight: 0, color: tone.bd }}>{ts.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{ts.label}</span>
    </div>
  );
}

function CollapseToggle({ collapsed, hiddenCount, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={collapsed ? `Expand (${hiddenCount} hidden)` : "Collapse this branch"}
      style={{
        position: "absolute", top: -10, right: -10, zIndex: 4,
        minWidth: 20, height: 20, padding: collapsed ? "0 5px" : 0, borderRadius: 999,
        border: `1.5px solid ${collapsed ? C.emberDeep : C.border}`,
        background: collapsed ? C.ember : "#fff", color: collapsed ? "#fff" : C.inkSubtle,
        font: "700 9px/1 system-ui", cursor: "pointer", display: "grid", placeItems: "center",
        boxShadow: "0 1px 3px rgba(40,28,10,0.2)",
      }}
    >
      {collapsed ? `▸${hiddenCount || ""}` : "–"}
    </button>
  );
}

// ─── node cards ──────────────────────────────────────────────────────────────

function CompactNode({ node, beat, selected }) {
  const ring = actColor(beat);
  const speakers = [...new Set((beat?.lines || []).map((l) => l.speaker).filter(Boolean))];
  const firstLine = beat?.lines?.[0]?.text || beat?.body || "—";
  const hasSpeaker = beat?.lines?.find((l) => l.speaker)?.speaker;
  const choices = beat?.choices || [];
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 10,
      background: selected ? "linear-gradient(180deg,#fff 0%,#fbf6ea 100%)" : "#fff",
      border: selected ? `2px solid ${ring}` : "1.5px solid #ddd0b4",
      boxShadow: selected ? `0 0 0 3px ${hexAlpha(ring, 0.2)}, 0 8px 16px -6px rgba(40,28,10,0.22)` : "0 2px 6px -2px rgba(40,28,10,0.12)",
      overflow: "hidden", position: "relative" }}>
      <div style={{ height: 4, background: ring }} />
      <div style={{ padding: "7px 9px", height: node.h - 24, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <div style={{ font: "600 11px/1.2 system-ui", color: C.ink, overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{beat?.title}</div>
          <div style={{ display: "flex" }}>
            {speakers.slice(0, 3).map((sp, i) => (
              <div key={sp} style={{ marginLeft: i > 0 ? -5 : 0, zIndex: 3 - i, border: "1.5px solid #fff", borderRadius: "50%" }}>
                <Portrait npcKey={sp} size={18} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ font: "italic 400 10px/1.35 Georgia,serif", color: C.inkSubtle, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {hasSpeaker ? `"${firstLine}"` : firstLine}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 9px", height: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(240,232,212,0.7)", borderTop: "1px solid #ddd0b4" }}>
        <span style={{ font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>{beat?.id}</span>
        <span style={{ font: "600 8px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase", color: C.inkSubtle }}>
          {choices.length > 0 ? `${choices.length} choices` : beat?.resolution ? "END" : "→ continue"}
        </span>
      </div>
    </div>
  );
}

function BranchingNode({ beat, selected }) {
  const ring = actColor(beat);
  const choices = beat?.choices || [];
  const firstLine = beat?.lines?.[0]?.text || beat?.body || "—";
  const firstSpk = beat?.lines?.find((l) => l.speaker)?.speaker;
  const HEADER = 78, ROW = 38, GAP = 4, FOOTER = 22;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12,
      background: selected ? "linear-gradient(180deg,#fff,#fbf6ea)" : "#fff",
      border: `${selected ? 2 : 1.5}px solid ${ring}`,
      boxShadow: selected ? `0 0 0 4px ${hexAlpha(ring, 0.18)}, 0 12px 24px -8px rgba(40,28,10,0.26)` : `0 0 0 2px ${hexAlpha(ring, 0.1)}, 0 4px 10px -4px rgba(40,28,10,0.18)`,
      overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: HEADER, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
        background: "linear-gradient(180deg,rgba(255,255,255,0.6),transparent)", borderBottom: "1px solid rgba(200,180,140,0.3)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ font: "600 12px/1.2 system-ui", color: C.ink, paddingRight: 44, overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{beat?.title}</div>
          {firstSpk && <div style={{ border: "1.5px solid #fff", borderRadius: "50%", flexShrink: 0 }}><Portrait npcKey={firstSpk} size={20} /></div>}
        </div>
        <div style={{ font: "italic 400 10px/1.35 Georgia,serif", color: C.inkSubtle, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{firstSpk ? `"${firstLine}"` : firstLine}</div>
        <div style={{ position: "absolute", top: 8, right: 8, padding: "2px 7px", borderRadius: 999, background: ring, color: "#fff",
          font: "700 8px/1 system-ui", letterSpacing: "0.14em", textTransform: "uppercase" }}>⑂ FORK</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: GAP, flex: 1 }}>
        {choices.map((c, i) => {
          const o = c.outcome || {};
          const badges = [];
          if (o.bondDelta) badges.push(`♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount}`);
          if (o.embers) badges.push(`✸ ${o.embers}`);
          if (o.coreIngots) badges.push(`◈ ${o.coreIngots}`);
          if (o.gems) badges.push(`◆ ${o.gems}`);
          if (o.setFlag) badges.push("⚐");
          return (
            <div key={c.id} style={{ height: ROW, padding: "0 10px", display: "flex", alignItems: "center", gap: 7,
              background: i === 0 ? "rgba(214,97,42,0.025)" : "transparent",
              borderTop: i > 0 ? "1px solid rgba(200,180,140,0.25)" : "none", position: "relative" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                background: C.ember, color: "#fff", font: "700 10px/1 ui-monospace,monospace" }}>{"ABCDE"[i]}</span>
              <span style={{ flex: 1, minWidth: 0, font: "500 11px/1.25 Georgia,serif", color: C.ink, overflow: "hidden",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.label}</span>
              {badges.length > 0 && (
                <span style={{ font: "600 9px/1 ui-monospace,monospace", color: C.emberDeep, padding: "2px 5px", borderRadius: 4,
                  background: "rgba(214,97,42,0.08)", border: "1px solid rgba(214,97,42,0.18)", flexShrink: 0 }}>{badges.join(" ")}</span>
              )}
              <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%",
                background: c.outcome?.queueBeat ? C.ember : "#c8b48a", border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.18)" }} />
            </div>
          );
        })}
        {choices.length === 0 && <div style={{ flex: 1, display: "grid", placeItems: "center", font: "italic 400 10px/1 Georgia,serif", color: C.inkSubtle }}>no choices</div>}
      </div>
      <div style={{ height: FOOTER, padding: "0 10px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(240,232,212,0.7)", borderTop: "1px solid rgba(200,180,140,0.3)" }}>
        <span style={{ font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>{beat?.id}</span>
        <span style={{ font: "600 8px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase", color: ring }}>BRANCH · {choices.length}</span>
      </div>
    </div>
  );
}

function ExpandedCard({ node, beat, selected, draft }) {
  const incoming = findIncomingChoice(beat?.id, draft);
  const o = incoming?.choice?.outcome || {};
  const effects = [];
  if (o.bondDelta) effects.push({ icon: "♥", label: `Bond ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${NPCS[o.bondDelta.npc]?.name || o.bondDelta.npc}` });
  if (o.embers) effects.push({ icon: "✸", label: `+${o.embers} Embers` });
  if (o.coreIngots) effects.push({ icon: "◈", label: `+${o.coreIngots} Core Ingots` });
  if (o.gems) effects.push({ icon: "◆", label: `+${o.gems} Gems` });
  if (o.setFlag) (Array.isArray(o.setFlag) ? o.setFlag : [o.setFlag]).slice(0, 2).forEach((f) => effects.push({ icon: "⚐", label: f }));
  const speaker = beat?.lines?.find((l) => l.speaker)?.speaker;
  const isDraftNode = !!node.draft;
  const accent = isDraftNode ? actColor(beat) : C.ember;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12, background: "#fff",
      border: selected ? `2px solid ${accent}` : `1.5px solid ${isDraftNode ? hexAlpha(accent, 0.6) : "#c8b48a"}`,
      boxShadow: selected ? `0 0 0 3px ${hexAlpha(accent, 0.15)}, 0 10px 20px -8px rgba(40,28,10,0.22)` : `0 6px 14px -6px rgba(40,28,10,0.18), 0 0 0 3px ${hexAlpha(accent, 0.05)}`,
      overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 10px", background: `linear-gradient(180deg,${hexAlpha(accent, 0.1)},${hexAlpha(accent, 0.02)})`,
        borderBottom: `1px solid ${hexAlpha(accent, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ font: "700 8px/1 system-ui", letterSpacing: "0.14em", textTransform: "uppercase", color: isDraftNode ? accent : C.emberDeep }}>
          {isDraftNode ? "DRAFT" : "RESOLUTION"}
        </span>
        <span style={{ font: "500 11px/1.3 Georgia,serif", color: C.ink, flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{beat?.title}</span>
      </div>
      <div style={{ margin: 8, marginBottom: 6, borderRadius: 8, padding: 8, background: "linear-gradient(180deg,#221710,#1a110a)",
        border: "1px solid rgba(120,80,40,0.6)", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 5, overflow: "hidden" }}>
        {speaker && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Portrait npcKey={speaker} size={18} />
            <span style={{ font: "600 9px/1 system-ui", color: NPCS[speaker]?.color || "#d4b896", letterSpacing: "0.06em", textTransform: "uppercase" }}>{NPCS[speaker]?.name}</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {(beat?.lines || []).map((l, i) => (
            <p key={i} style={{ margin: 0, font: l.speaker ? "400 10.5px/1.45 Georgia,serif" : "italic 400 10px/1.45 Georgia,serif",
              color: l.speaker ? "#f0e6cf" : "rgba(189,154,114,0.9)" }}>{l.text}</p>
          ))}
          {(!beat?.lines || beat.lines.length === 0) && <p style={{ margin: 0, font: "italic 400 10px/1.45 Georgia,serif", color: "rgba(189,154,114,0.6)" }}>{beat?.body || "(no dialogue yet)"}</p>}
        </div>
      </div>
      <div style={{ padding: "6px 8px 8px", borderTop: "1px solid rgba(200,180,140,0.3)", background: "rgba(240,232,212,0.5)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ font: "600 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkSubtle, marginBottom: 4 }}>
            {isDraftNode ? "Branch / beat" : "Branch outcome"}
          </div>
          <span style={{ font: "500 8px/1 ui-monospace,monospace", color: C.inkSubtle }}>{beat?.id}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {isDraftNode && (beat?.choices?.length ? <span style={{ font: "600 9px/1 system-ui", color: accent, padding: "2px 5px", borderRadius: 4, background: hexAlpha(accent, 0.1), border: `1px solid ${hexAlpha(accent, 0.25)}` }}>⑂ {beat.choices.length} choices</span>
            : beat?.trigger ? <span style={{ font: "600 9px/1 system-ui", color: accent, padding: "2px 5px", borderRadius: 4, background: hexAlpha(accent, 0.1), border: `1px solid ${hexAlpha(accent, 0.25)}` }}>{triggerSummary(beat)?.icon} {triggerSummary(beat)?.label}</span>
            : <span style={{ font: "italic 400 9.5px/1 system-ui", color: incoming ? C.inkSubtle : "#b88a10" }}>{incoming ? "queued by a choice" : "⚠ unreached"}</span>)}
          {!isDraftNode && effects.length === 0 && <span style={{ font: "italic 400 9.5px/1 system-ui", color: C.inkSubtle }}>no outcome</span>}
          {!isDraftNode && effects.map((ef, i) => (
            <span key={i} style={{ font: "600 9px/1 system-ui", color: C.emberDeep, padding: "2px 5px", borderRadius: 4, background: "rgba(214,97,42,0.08)", border: "1px solid rgba(214,97,42,0.18)" }}>{ef.icon} {ef.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewPlay({ onPlay }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onPlay(); }} title="Preview this dialogue (walk the branch)"
      style={{ position: "absolute", bottom: -10, right: -10, zIndex: 4, width: 22, height: 22, borderRadius: "50%",
        border: `1.5px solid ${C.emberDeep}`, background: C.ember, color: "#fff", font: "9px/1 system-ui", cursor: "pointer",
        display: "grid", placeItems: "center", paddingLeft: 1, boxShadow: "0 1px 3px rgba(40,28,10,0.25)" }}>
      ▶
    </button>
  );
}

function WarningBadge({ count }) {
  if (!count) return null;
  return (
    <div title={`${count} validation warning${count === 1 ? "" : "s"}`} style={{ position: "absolute", top: -10, left: -10, zIndex: 5,
      minWidth: 20, height: 20, padding: "0 5px", borderRadius: 999, border: `1.5px solid ${C.redDeep}`,
      background: "#fff3ed", color: C.redDeep, display: "grid", placeItems: "center",
      font: "700 10px/1 system-ui", boxShadow: "0 1px 3px rgba(40,28,10,0.18)" }}>
      ⚠{count > 1 ? count : ""}
    </div>
  );
}

function DragHandle({ dragging, onMouseDown, onTouchStart }) {
  return (
    <button data-drag-handle="1" title="Drag to move card"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{ position: "absolute", top: -10, left: 13, zIndex: 6, width: 22, height: 22, borderRadius: 999,
        border: `1.5px solid ${C.border}`, background: dragging ? C.ember : "#fff", color: dragging ? "#fff" : C.inkSubtle,
        cursor: dragging ? "grabbing" : "grab", font: "700 12px/1 system-ui", display: "grid", placeItems: "center",
        boxShadow: "0 1px 3px rgba(40,28,10,0.18)", touchAction: "none" }}>
      ⋮⋮
    </button>
  );
}

function TreeNode({ node, beat, selectedId, collapsed, hiddenCount, showCollapse, dragging, warningCount, onNodeMouseDown, onNodeTouchStart, onToggleCollapse, onPreview, draft }) {
  const selected = node.id === selectedId;
  let Inner;
  if (node.draft || node.expanded) Inner = <ExpandedCard node={node} beat={beat} selected={selected} draft={draft} />;
  else if (node.branching) Inner = <BranchingNode beat={beat} selected={selected} />;
  else Inner = <CompactNode node={node} beat={beat} selected={selected} />;
  return (
    <div data-story-node="1" style={{ position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h, cursor: "default", touchAction: "none" }}>
      <WarningBadge count={warningCount} />
      <DragHandle dragging={dragging} onMouseDown={(e) => onNodeMouseDown(e, node)} onTouchStart={(e) => onNodeTouchStart(e, node)} />
      <TriggerChip beat={beat} accent={actColor(beat)} />
      {showCollapse && <CollapseToggle collapsed={collapsed} hiddenCount={hiddenCount} onToggle={() => onToggleCollapse(node.id)} />}
      <PreviewPlay onPlay={() => onPreview(node.id)} />
      {Inner}
    </div>
  );
}

// ─── act labels / dividers ───────────────────────────────────────────────────

const ACT_LABELS = [
  { label: "Act I · Roots",     x: 32,   color: "#7a8b5e" },
  { label: "Act II · Iron",     x: 784,  color: "#c9863a" },
  { label: "Act III · Kingdom", x: 1536, color: "#a8431a" },
];

// ─── left rail ───────────────────────────────────────────────────────────────

function RailRow({ beatId, draft, selectedId, onlineIds, onSelect }) {
  const beat = effectiveBeat(beatId, draft);
  const isSel = beatId === selectedId;
  const choices = beat?.choices || [];
  return (
    <div onClick={() => onSelect(beatId)} style={{ padding: "5px 12px 5px 22px", cursor: "pointer",
      background: isSel ? "rgba(214,97,42,0.12)" : "transparent",
      borderLeft: `3px solid ${isSel ? actColor(beat) : "transparent"}`, display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ font: "500 11px/1.3 system-ui", color: isSel ? C.ink : C.inkLight, fontWeight: isSel ? 600 : 500,
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{beat?.title || beatId}</span>
      {!onlineIds.has(beatId) && (
        <span style={{ font: "600 8px/1 system-ui", color: C.inkSubtle, flexShrink: 0, padding: "1px 4px", borderRadius: 3, background: "rgba(0,0,0,0.06)" }}>OFF</span>
      )}
      {choices.length > 0 && (
        <span style={{ marginLeft: "auto", font: "600 8px/1 system-ui", color: C.emberDeep, background: "rgba(214,97,42,0.12)", padding: "2px 5px", borderRadius: 999, flexShrink: 0 }}>{choices.length}</span>
      )}
    </div>
  );
}

function GroupHeader({ color, label, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", font: "600 9px/1 system-ui",
      letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkSubtle }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}<span style={{ marginLeft: "auto" }}>{count}</span>
    </div>
  );
}

function LeftRail({ draft, selectedId, onlineIds, onSelect, onNewBeat }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const dBeats = draftBeats(draft);
  const knownIds = new Set(allBeatIds(draft));
  const matches = (id) => {
    const beat = effectiveBeat(id, draft);
    if (!beat) return false;
    return !q || id.toLowerCase().includes(q) || (beat.title || "").toLowerCase().includes(q);
  };

  const groups = [
    { id: 1,      label: "Act I · Roots",     color: "#7a8b5e", ids: STORY_BEATS.filter((b) => b.act === 1).map((b) => b.id) },
    { id: 2,      label: "Act II · Iron",      color: "#c9863a", ids: STORY_BEATS.filter((b) => b.act === 2).map((b) => b.id) },
    { id: 3,      label: "Act III · Kingdom",  color: "#a8431a", ids: STORY_BEATS.filter((b) => b.act === 3).map((b) => b.id) },
    { id: "side", label: "Side events",        color: C.violet,  ids: SIDE_BEATS.map((b) => b.id).filter((id) => knownIds.has(id)) },
  ];

  return (
    <div style={{ width: 224, flexShrink: 0, background: C.parchmentDeep, borderRight: `2px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ position: "relative" }}>
          <input placeholder="Search beats…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 8px 6px 26px", borderRadius: 7, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 11px/1 system-ui", color: C.ink, outline: "none", boxSizing: "border-box" }} />
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.inkSubtle, fontSize: 12 }}>🔍</span>
        </div>
        <Btn tone="ember" onClick={onNewBeat} style={{ width: "100%", padding: "7px 10px", font: "700 11px/1 system-ui" }}>✦ New beat</Btn>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 16px" }}>
        {dBeats.length > 0 && (
          <div>
            <GroupHeader color="#6b8e9e" label="Drafts (this override)" count={dBeats.filter((b) => matches(b.id)).length} />
            {dBeats.filter((b) => matches(b.id)).map((b) => (
              <RailRow key={b.id} beatId={b.id} draft={draft} selectedId={selectedId} onlineIds={onlineIds} onSelect={onSelect} />
            ))}
          </div>
        )}
        {groups.map((g) => {
          const ids = g.ids.filter(matches);
          if (ids.length === 0) return null;
          return (
            <div key={g.id}>
              <GroupHeader color={g.color} label={g.label} count={ids.length} />
              {ids.map((id) => <RailRow key={id} beatId={id} draft={draft} selectedId={selectedId} onlineIds={onlineIds} onSelect={onSelect} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniMap({ nodes, bounds, selectedId, zoom, pan, canvasRef, onPanTo }) {
  const W = 180, H = 112, PAD = 8;
  const scale = Math.min((W - PAD * 2) / Math.max(1, bounds.w), (H - PAD * 2) / Math.max(1, bounds.h));
  const rect = canvasRef.current ? canvasRef.current.getBoundingClientRect() : null;
  const view = rect ? {
    x: -pan.x / Math.max(zoom, 0.01),
    y: -pan.y / Math.max(zoom, 0.01),
    w: rect.width / Math.max(zoom, 0.01),
    h: rect.height / Math.max(zoom, 0.01),
  } : null;
  const toSvg = (x, y) => ({ x: PAD + x * scale, y: PAD + y * scale });
  const onPointer = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const worldX = Math.max(0, (e.clientX - box.left - PAD) / scale);
    const worldY = Math.max(0, (e.clientY - box.top - PAD) / scale);
    onPanTo(worldX, worldY);
  };
  return (
    <div title="Mini map · click to center the canvas" style={{ position: "absolute", left: 16, bottom: 16, zIndex: 10, width: W, height: H,
      borderRadius: 8, border: `1.5px solid ${C.border}`, background: "rgba(255,255,255,0.92)",
      boxShadow: "0 3px 10px rgba(40,28,10,0.12)", overflow: "hidden" }}>
      <svg width={W} height={H} onMouseDown={onPointer} style={{ display: "block", cursor: "crosshair" }}>
        <rect x={PAD} y={PAD} width={bounds.w * scale} height={bounds.h * scale} rx="3" fill="rgba(240,232,212,0.8)" stroke={C.canvasRule} />
        {nodes.map((n) => {
          const p = toSvg(n.x, n.y);
          return <rect key={n.id} x={p.x} y={p.y} width={Math.max(2, n.w * scale)} height={Math.max(2, n.h * scale)}
            rx="1" fill={n.id === selectedId ? C.ember : (n.draft ? "#6b8e9e" : C.inkSubtle)} opacity={n.id === selectedId ? 1 : 0.65} />;
        })}
        {view && (() => {
          const p = toSvg(view.x, view.y);
          return <rect x={p.x} y={p.y} width={Math.max(4, view.w * scale)} height={Math.max(4, view.h * scale)}
            fill="none" stroke={C.emberDeep} strokeWidth="1.5" strokeDasharray="3 2" />;
        })()}
      </svg>
      <div style={{ position: "absolute", left: 7, top: 5, font: "700 8px/1 system-ui",
        color: C.inkSubtle, letterSpacing: "0.08em", textTransform: "uppercase", pointerEvents: "none" }}>Mini map</div>
      <div style={{ position: "absolute", right: 7, bottom: 5, font: "500 8px/1 system-ui",
        color: C.inkSubtle, pointerEvents: "none" }}>click to center</div>
    </div>
  );
}

// ─── draft mutation helpers ──────────────────────────────────────────────────

function stripEmpty(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v === undefined || v === null || v === "") { delete out[k]; continue; }
    if (Array.isArray(v) && v.length === 0) { delete out[k]; continue; }
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) delete out[k];
  }
  return out;
}

// ─── app ─────────────────────────────────────────────────────────────────────

export default function StoryEditorApp() {
  const [draft, setDraft] = useState(() => cloneDraft(BALANCE_OVERRIDES));
  const [savedDraft, setSavedDraft] = useState(() => cloneDraft(BALANCE_OVERRIDES));
  const [selectedId, setSelectedId] = useState(null);
  const [savedNotice, setSavedNotice] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readCollapsed());
  const [previewBeatId, setPreviewBeatId] = useState(null);
  const [nodePositions, setNodePositions] = useState(() => readNodePositions());
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef(null);
  const nodeDrag = useRef(null);
  const canvasRef = useRef(null);

  const moveNode = useCallback((id, x, y) => {
    setNodePositions((prev) => { const next = { ...prev, [id]: { x: Math.round(x), y: Math.round(y) } }; writeNodePositions(next); return next; });
  }, []);
  const resetLayout = useCallback(() => { setNodePositions({}); writeNodePositions({}); }, []);
  const onNodeMouseDown = useCallback((e, node) => {
    if (!e.target.closest("[data-drag-handle]")) return;
    e.stopPropagation();                                // don't let the canvas start a pan
    e.preventDefault();                                 // no text selection while dragging
    nodeDrag.current = { id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y, moved: false };
  }, []);
  const onNodeTouchStart = useCallback((e, node) => {
    if (e.touches.length !== 1 || !e.target.closest("[data-drag-handle]")) return;
    e.stopPropagation();
    e.preventDefault();
    const t = e.touches[0];
    nodeDrag.current = { id: node.id, touchId: t.identifier, sx: t.clientX, sy: t.clientY, nx: node.x, ny: node.y, moved: false, touch: true };
  }, []);

  const isDirty = !storySlicesEqual(draft, savedDraft);
  const dirtyRef = useRef(isDirty);
  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

  const saveDraft = useCallback(() => {
    writeBalanceDraft(draft);
    setSavedDraft(cloneDraft(draft));
    setSavedNotice("Saved · reload game to apply");
    setTimeout(() => setSavedNotice(""), 2400);
  }, [draft]);

  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveDraft(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "hearth.balance.draft" || dirtyRef.current) return;
      const next = cloneDraft(readBalanceDraft() || BALANCE_OVERRIDES);
      setDraft(next);
      setSavedDraft(cloneDraft(next));
      setSavedNotice("Synced from Balance Manager");
      setTimeout(() => setSavedNotice(""), 1800);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // canvas pan/zoom
  const onMouseDown = useCallback((e) => {
    if (e.target !== canvasRef.current && !e.target.closest("[data-canvas-bg]")) return;
    isDragging.current = true; setDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);
  useEffect(() => {
    const z = zoom || 1;
    const onMove = (e) => {
      const nd = nodeDrag.current;
      if (nd) {
        if (!nd.moved && (Math.abs(e.clientX - nd.sx) > 3 || Math.abs(e.clientY - nd.sy) > 3)) { nd.moved = true; setDraggingNodeId(nd.id); }
        if (nd.moved) moveNode(nd.id, nd.nx + (e.clientX - nd.sx) / z, nd.ny + (e.clientY - nd.sy) / z);
        return;
      }
      if (isDragging.current) setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onUp = () => {
      const nd = nodeDrag.current;
      if (nd) { nodeDrag.current = null; setDraggingNodeId(null); if (!nd.moved) setSelectedId(nd.id); return; }
      isDragging.current = false; setDragging(false);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [moveNode, zoom]);
  useEffect(() => {
    const z = zoom || 1;
    const touchById = (list, id) => {
      for (let i = 0; i < list.length; i += 1) if (list[i].identifier === id) return list[i];
      return null;
    };
    const onMove = (e) => {
      const nd = nodeDrag.current;
      if (!nd?.touch) return;
      const t = touchById(e.touches, nd.touchId);
      if (!t) return;
      e.preventDefault();
      if (!nd.moved && (Math.abs(t.clientX - nd.sx) > 3 || Math.abs(t.clientY - nd.sy) > 3)) { nd.moved = true; setDraggingNodeId(nd.id); }
      if (nd.moved) moveNode(nd.id, nd.nx + (t.clientX - nd.sx) / z, nd.ny + (t.clientY - nd.sy) / z);
    };
    const onEnd = (e) => {
      const nd = nodeDrag.current;
      if (!nd?.touch) return;
      const stillActive = touchById(e.touches, nd.touchId);
      if (stillActive) return;
      e.preventDefault();
      nodeDrag.current = null;
      setDraggingNodeId(null);
      if (!nd.moved) setSelectedId(nd.id);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: false });
    window.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [moveNode, zoom]);
  const onWheel = useCallback((e) => { e.preventDefault(); setZoom((z) => Math.min(2, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08)))); }, []);

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
        if (t.target.closest("[data-story-node],button,a,input,textarea,select")) { touchState.current = null; return; }
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

  // ── beat edits ──
  const editBeat = useCallback((beatId, fields) => {
    setDraft((prev) => {
      const d = cloneDraft(prev);
      d.story ??= {};
      const di = draftBeatIndex(d, beatId);
      if (di >= 0) {
        // author-created beat — patch the entry in newBeats directly
        const arr = d.story.newBeats.slice();
        const merged = { ...arr[di] };
        for (const [k, v] of Object.entries(fields)) {
          if (v === undefined || v === null) delete merged[k];
          else merged[k] = v;
        }
        const cleaned = stripEmpty(merged);
        cleaned.id = arr[di].id;
        if (!cleaned.title) cleaned.title = arr[di].title || cleaned.id;
        arr[di] = cleaned;
        d.story.newBeats = arr;
      } else {
        d.story.beats ??= {};
        const next = stripEmpty({ ...(d.story.beats[beatId] || {}), ...fields });
        if (Object.keys(next).length === 0) delete d.story.beats[beatId];
        else d.story.beats[beatId] = next;
        if (Object.keys(d.story.beats).length === 0) delete d.story.beats;
      }
      if (d.story && Object.keys(d.story).length === 0) delete d.story;
      return d;
    });
  }, []);

  // ── create a draft beat. opts: { triggered?:bool, queuedBy?:{beatId,choiceId}, idHint? } ──
  const createDraftBeat = useCallback((opts = {}) => {
    // pick a free id from the current snapshot (single-user UI — no real race),
    // re-checked inside the updater for paranoia.
    const base = (opts.idHint && /^[a-z0-9_]+$/i.test(opts.idHint)) ? opts.idHint
      : (opts.queuedBy ? `${opts.queuedBy.beatId}_${opts.queuedBy.choiceId}` : "side_beat");
    const pickFree = (d) => {
      const taken = new Set(allBeatIds(d));
      if (!taken.has(base)) return base;
      let n = 2; while (taken.has(`${base}_${n}`)) n += 1; return `${base}_${n}`;
    };
    const newId = pickFree(draft);
    let placedNearSource = null;
    if (opts.queuedBy) {
      const sourceGraph = deriveGraph(draft, nodePositions);
      const source = sourceGraph.nodes.find((n) => n.id === opts.queuedBy.beatId);
      if (source) {
        const row = effectiveChoices(opts.queuedBy.beatId, draft).findIndex((c) => c.id === opts.queuedBy.choiceId);
        const rowY = row >= 0 && source.branching ? source.y + branchingRowCenterY(row) - 96 : source.y + source.h / 2 - 96;
        placedNearSource = { x: Math.round(source.x + source.w + 90), y: Math.round(rowY) };
      }
    }
    setDraft((prev) => {
      const d = cloneDraft(prev);
      d.story ??= {};
      d.story.newBeats ??= [];
      const id = allBeatIds(d).includes(newId) ? pickFree(d) : newId;
      const beat = { id, title: opts.triggered ? "New side beat" : "New branch", lines: [] };
      if (opts.triggered) beat.trigger = { type: "bond_at_least", npc: "wren", amount: 8 };
      d.story.newBeats = [...d.story.newBeats, beat];
      if (opts.queuedBy) {
        d.story.beats ??= {};
        const { beatId, choiceId } = opts.queuedBy;
        const nextChoices = effectiveChoices(beatId, d).map((c) => (c.id === choiceId
          ? { ...c, outcome: { ...(c.outcome || {}), queueBeat: id } } : c));
        const dj = draftBeatIndex(d, beatId);
        if (dj >= 0) { const arr = d.story.newBeats.slice(); arr[dj] = { ...arr[dj], choices: nextChoices }; d.story.newBeats = arr; }
        else d.story.beats[beatId] = stripEmpty({ ...(d.story.beats[beatId] || {}), choices: nextChoices });
      }
      return d;
    });
    if (placedNearSource) {
      setNodePositions((prev) => {
        const next = { ...prev, [newId]: placedNearSource };
        writeNodePositions(next);
        return next;
      });
    }
    setSelectedId(newId);
    return newId;
  }, [draft, nodePositions]);

  const deleteDraftBeat = useCallback((beatId) => {
    setDraft((prev) => {
      const d = cloneDraft(prev);
      if (!d.story?.newBeats) return d;
      d.story.newBeats = d.story.newBeats.filter((b) => b && b.id !== beatId);
      if (d.story.newBeats.length === 0) delete d.story.newBeats;
      if (d.story.beats) delete d.story.beats[beatId];
      // unlink any choice pointing at the deleted beat
      const scrub = (choices) => Array.isArray(choices)
        ? choices.map((c) => {
            if (c?.outcome?.queueBeat !== beatId) return c;
            const o = { ...c.outcome }; delete o.queueBeat;
            return { ...c, outcome: Object.keys(o).length ? o : undefined };
          })
        : choices;
      if (d.story.beats) for (const id of Object.keys(d.story.beats)) {
        if (Array.isArray(d.story.beats[id].choices)) d.story.beats[id] = stripEmpty({ ...d.story.beats[id], choices: scrub(d.story.beats[id].choices) });
        if (Object.keys(d.story.beats[id]).length === 0) delete d.story.beats[id];
      }
      if (d.story.newBeats) d.story.newBeats = d.story.newBeats.map((b) => (Array.isArray(b.choices) ? { ...b, choices: scrub(b.choices) } : b));
      if (d.story.beats && Object.keys(d.story.beats).length === 0) delete d.story.beats;
      if (d.story && Object.keys(d.story).length === 0) delete d.story;
      return d;
    });
    setCollapsed((prev) => { if (!prev.has(beatId)) return prev; const n = new Set(prev); n.delete(beatId); writeCollapsed(n); return n; });
    setSelectedId((cur) => (cur === beatId ? null : cur));
  }, []);

  const suppressBuiltInBeat = useCallback((beatId) => {
    setDraft((prev) => {
      const d = cloneDraft(prev);
      d.story ??= {};
      const ids = new Set(Array.isArray(d.story.suppressedBeats) ? d.story.suppressedBeats : []);
      for (const id of builtInSideSubtreeIds(beatId)) ids.add(id);
      d.story.suppressedBeats = [...ids].sort();
      return d;
    });
    setCollapsed((prev) => { if (!prev.has(beatId)) return prev; const n = new Set(prev); n.delete(beatId); writeCollapsed(n); return n; });
    setSelectedId((cur) => (cur === beatId ? null : cur));
    setPreviewBeatId((cur) => (cur === beatId ? null : cur));
  }, []);

  const restoreSuppressedBeats = useCallback(() => {
    setDraft((prev) => {
      const d = cloneDraft(prev);
      if (!d.story?.suppressedBeats) return d;
      delete d.story.suppressedBeats;
      if (d.story && Object.keys(d.story).length === 0) delete d.story;
      return d;
    });
  }, []);

  const renameDraftBeat = useCallback((oldId, nextId) => {
    const result = renameDraftBeatInDraft(draft, oldId, nextId);
    if (!result.ok || !result.changed) return result;
    const newId = result.id;
    setDraft(result.draft);
    setNodePositions((prev) => {
      if (!prev[oldId]) return prev;
      const next = { ...prev, [newId]: prev[oldId] };
      delete next[oldId];
      writeNodePositions(next);
      return next;
    });
    setCollapsed((prev) => {
      if (!prev.has(oldId)) return prev;
      const next = new Set(prev);
      next.delete(oldId);
      next.add(newId);
      writeCollapsed(next);
      return next;
    });
    setSelectedId((cur) => (cur === oldId ? newId : cur));
    setPreviewBeatId((cur) => (cur === oldId ? newId : cur));
    return result;
  }, [draft]);

  const onNewBranch = useCallback((parentBeatId, choiceId) => createDraftBeat({ queuedBy: { beatId: parentBeatId, choiceId } }), [createDraftBeat]);

  const toggleCollapse = useCallback((nodeId) => {
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(nodeId)) n.delete(nodeId); else n.add(nodeId); writeCollapsed(n); return n; });
  }, []);

  // ── graph ──
  const fullGraph = useMemo(() => deriveGraph(draft, nodePositions), [draft, nodePositions]);
  const collapsible = useMemo(() => collapsibleIds(fullGraph.edges), [fullGraph]);
  const view = useMemo(() => visibleSubset(fullGraph.nodes, fullGraph.edges, collapsed), [fullGraph, collapsed]);
  const nodeById = useMemo(() => new Map(view.nodes.map((n) => [n.id, n])), [view]);
  const onlineIds = useMemo(() => new Set(fullGraph.nodes.map((n) => n.id)), [fullGraph]);
  const warningsByBeat = useMemo(() => collectStoryWarnings(draft), [draft]);
  const suppressedCount = Array.isArray(draft?.story?.suppressedBeats) ? draft.story.suppressedBeats.length : 0;
  const fitToScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el || view.nodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of view.nodes) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 80;
    const nextZoom = Math.min(1.6, Math.max(0.3, Math.min(rect.width / Math.max(1, maxX - minX + pad * 2), rect.height / Math.max(1, maxY - minY + pad * 2))));
    setZoom(nextZoom);
    setPan({
      x: Math.round((rect.width - (maxX - minX) * nextZoom) / 2 - minX * nextZoom),
      y: Math.round((rect.height - (maxY - minY) * nextZoom) / 2 - minY * nextZoom),
    });
  }, [view.nodes]);
  const panToWorld = useCallback((worldX, worldY) => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPan({ x: Math.round(rect.width / 2 - worldX * zoom), y: Math.round(rect.height / 2 - worldY * zoom) });
  }, [zoom]);
  const selectAndCenter = useCallback((id) => {
    if (!id) return;
    setSelectedId(id);
    const node = view.nodes.find((n) => n.id === id);
    if (node) panToWorld(node.x + node.w / 2, node.y + node.h / 2);
  }, [panToWorld, view.nodes]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || e.target?.isContentEditable) return;
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[e.key]) {
        e.preventDefault();
        selectAndCenter(directionalNodeId(view.nodes, selectedId, map[e.key]));
      } else if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        setPreviewBeatId(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectAndCenter, view.nodes]);

  const selIsDraft = selectedId ? isDraftBeat(draft, selectedId) : false;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: C.parchmentDeep, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px", background: "linear-gradient(180deg,#2a1d0f,#3a2812)", borderBottom: `3px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📖</span>
          <div>
            <div style={{ font: "700 16px/1 system-ui", color: "#f4d9a0" }}>Story Tree Editor</div>
            <div style={{ font: "400 10px/1 system-ui", color: "rgba(244,217,160,0.6)", marginTop: 2 }}>Hearthlands · beats · choices · branches</div>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {savedNotice && <span style={{ font: "700 10px/1 system-ui", padding: "4px 9px", borderRadius: 6, background: C.green, color: "#fff" }}>{savedNotice}</span>}
          {isDirty && !savedNotice && <span style={{ font: "700 10px/1 system-ui", padding: "4px 9px", borderRadius: 6, background: C.ember, color: "#fff" }}>Unsaved changes</span>}
          <span style={{ font: "400 10px/1 system-ui", color: "rgba(244,217,160,0.5)" }}>Drag by the handle · arrows move selection · Enter previews · ⌘S saves</span>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <button onClick={() => setToolsOpen((v) => !v)} title="Layout and story-editor utilities"
              style={{ padding: "6px 12px", borderRadius: 7, border: `2px solid ${C.border}`, background: toolsOpen ? C.parchment : C.parchmentDeep, color: C.inkLight, font: "700 11px/1 system-ui", cursor: "pointer" }}>
              Tools ▾
            </button>
            {toolsOpen && (
              <div style={{ position: "absolute", right: 0, top: 34, zIndex: 30, minWidth: 210, padding: 8, borderRadius: 8,
                border: `1.5px solid ${C.border}`, background: "#fff", boxShadow: "0 10px 26px rgba(28,18,8,0.22)", display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => { resetLayout(); setToolsOpen(false); }} disabled={Object.keys(nodePositions).length === 0}
                  style={{ textAlign: "left", padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.border}`, background: Object.keys(nodePositions).length ? C.parchment : "rgba(0,0,0,0.03)", color: Object.keys(nodePositions).length ? C.ink : C.inkSubtle, font: "600 11px/1 system-ui", cursor: Object.keys(nodePositions).length ? "pointer" : "not-allowed" }}>
                  Reset layout {Object.keys(nodePositions).length ? `(${Object.keys(nodePositions).length})` : ""}
                </button>
                <button onClick={() => { setCollapsed(new Set()); writeCollapsed(new Set()); setToolsOpen(false); }} disabled={collapsed.size === 0}
                  style={{ textAlign: "left", padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.border}`, background: collapsed.size ? C.parchment : "rgba(0,0,0,0.03)", color: collapsed.size ? C.ink : C.inkSubtle, font: "600 11px/1 system-ui", cursor: collapsed.size ? "pointer" : "not-allowed" }}>
                  Expand all {collapsed.size ? `(${collapsed.size})` : ""}
                </button>
                <button onClick={() => { restoreSuppressedBeats(); setToolsOpen(false); }} disabled={suppressedCount === 0}
                  style={{ textAlign: "left", padding: "7px 9px", borderRadius: 6, border: `1px solid ${suppressedCount ? C.redDeep : C.border}`, background: suppressedCount ? "#fff" : "rgba(0,0,0,0.03)", color: suppressedCount ? C.redDeep : C.inkSubtle, font: "600 11px/1 system-ui", cursor: suppressedCount ? "pointer" : "not-allowed" }}>
                  Restore disabled side beats {suppressedCount ? `(${suppressedCount})` : ""}
                </button>
              </div>
            )}
          </span>
          <button onClick={saveDraft} style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.greenDeep}`, background: C.green, color: "#fff", font: "700 11px/1 system-ui", cursor: "pointer" }}>💾 Save Draft</button>
          <a href={import.meta.env.BASE_URL + "b/#/story"} style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.border}`, background: C.parchmentDeep, color: C.inkLight, font: "700 11px/1 system-ui", textDecoration: "none" }}>← Balance Manager</a>
          <a href={import.meta.env.BASE_URL} style={{ padding: "6px 14px", borderRadius: 7, border: `2px solid ${C.border}`, background: C.parchmentDeep, color: C.inkLight, font: "700 11px/1 system-ui", textDecoration: "none" }}>← Back to Game</a>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftRail draft={draft} selectedId={selectedId} onlineIds={onlineIds} onSelect={setSelectedId}
          onNewBeat={() => createDraftBeat({ triggered: true })} />

        <div ref={canvasRef} data-canvas-bg="1" onMouseDown={onMouseDown} onWheel={onWheel}
          style={{ flex: 1, position: "relative", overflow: "hidden", touchAction: "none", background: C.canvas, cursor: dragging ? "grabbing" : "grab",
            backgroundImage: `radial-gradient(circle, ${C.canvasRule} 1px, transparent 1px)`, backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}>
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, display: "flex", gap: 4, background: "#fff", borderRadius: 8, border: `1.5px solid ${C.border}`, padding: 4 }}>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`, background: C.parchment, color: C.ink, font: "700 16px/1 system-ui", cursor: "pointer" }}>+</button>
            <span style={{ font: "600 10px/1 system-ui", color: C.inkSubtle, alignSelf: "center", minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`, background: C.parchment, color: C.ink, font: "700 16px/1 system-ui", cursor: "pointer" }}>−</button>
            <button onClick={() => { setZoom(1); setPan({ x: 20, y: 20 }); }} style={{ width: 28, height: 28, borderRadius: 5, border: `1px solid ${C.border}`, background: C.parchment, color: C.inkSubtle, font: "400 9px/1 system-ui", cursor: "pointer" }}>↺</button>
            <button onClick={fitToScreen} title="Fit visible cards to screen" style={{ width: 36, height: 28, borderRadius: 5, border: `1px solid ${C.border}`, background: C.parchment, color: C.inkSubtle, font: "700 9px/1 system-ui", cursor: "pointer" }}>Fit</button>
          </div>
          <MiniMap nodes={view.nodes} bounds={fullGraph.bounds} selectedId={selectedId} zoom={zoom} pan={pan} canvasRef={canvasRef} onPanTo={panToWorld} />

          <div style={{ position: "absolute", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: fullGraph.bounds.w, height: fullGraph.bounds.h }}>
            {ACT_LABELS.map((al) => (
              <div key={al.label} style={{ position: "absolute", top: MY - 32, left: al.x, font: "700 11px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: al.color, opacity: 0.85 }}>{al.label}</div>
            ))}
            {[784, 1536].map((x) => <div key={x} style={{ position: "absolute", left: x - 22, top: MY - 40, width: 1, height: NH + 80, background: C.canvasRule, opacity: 0.6 }} />)}
            {draftBeats(draft).length > 0 && (
              <div style={{ position: "absolute", left: 32, top: DRAFT_LANE_Y - 30, font: "700 11px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b8e9e", opacity: 0.9 }}>Drafts · author-created beats</div>
            )}

            <svg style={{ position: "absolute", left: 0, top: 0, width: fullGraph.bounds.w, height: fullGraph.bounds.h, overflow: "visible", pointerEvents: "none" }}>
              {view.edges.map((edge, i) => <TreeEdge key={i} edge={edge} nodeById={nodeById} draft={draft} />)}
            </svg>

            {view.nodes.map((node) => (
              <TreeNode key={node.id} node={node} beat={effectiveBeat(node.id, draft)} selectedId={selectedId}
                collapsed={collapsed.has(node.id)} hiddenCount={view.hiddenCounts[node.id] || 0}
                showCollapse={collapsible.has(node.id)} dragging={draggingNodeId === node.id}
                warningCount={warningsByBeat[node.id]?.length || 0}
                onNodeMouseDown={onNodeMouseDown} onNodeTouchStart={onNodeTouchStart} onToggleCollapse={toggleCollapse}
                onPreview={setPreviewBeatId} draft={draft} />
            ))}
          </div>
        </div>

        <Inspector beatId={selectedId} draft={draft} isDraft={selIsDraft}
          onEditBeat={editBeat} onNewBranch={onNewBranch} onDeleteBeat={deleteDraftBeat}
          onSuppressBeat={suppressBuiltInBeat} onRenameBeat={renameDraftBeat}
          onSelect={setSelectedId} onPreview={setPreviewBeatId} />
      </div>

      {previewBeatId && (
        <PreviewModal key={previewBeatId} startBeatId={previewBeatId} draft={draft}
          onClose={() => setPreviewBeatId(null)}
          onOpenInEditor={(id) => setSelectedId(id)} />
      )}
    </div>
  );
}
