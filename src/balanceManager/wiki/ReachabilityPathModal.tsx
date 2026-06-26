/**
 * ReachabilityPathModal.tsx — popup graph of HOW an entity is reachable.
 *
 * Opened from the reachability badge on a wiki article. Renders the dependency
 * graph from `reachabilityPath()` as an SVG node-link diagram: the entity sits
 * at the top, its unlock chain fans downward to the terminal sources (Home /
 * Default board / a gated system), and each node is coloured by its own
 * reachability so a broken chain is visible. Nodes that are real catalog
 * entities cross-link to their own article (and close the modal).
 */

import React, { useEffect } from "react";
import { COLORS } from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";
import { iconLabel } from "../../textures/iconRegistry.js";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { getEntity } from "./conceptEntities.js";
import { entityIconKey } from "./EntityVisual.jsx";
import { ReachabilityBadge } from "./ReachabilityBadge.jsx";
import { reachabilityPath, type ReachPathNode } from "../../game/reachabilityPath.js";

const NODE_W = 156;
const NODE_H = 58;
const COL_STRIDE = NODE_W + 26;
const ROW_STRIDE = NODE_H + 52;
const PAD = 12;

/** Per-reachability node colours (border / background / ink). */
function toneFor(node: ReachPathNode): { border: string; bg: string; ink: string } {
  if (node.terminal === "missing") return { border: "#c23b22", bg: "rgba(194,59,34,0.10)", ink: "#8c1d0c" };
  switch (node.reach) {
    case "reachable": return { border: "#5a9e4b", bg: "rgba(90,158,75,0.12)", ink: "#2f6b27" };
    case "gated": return { border: "#7e7aa6", bg: "rgba(126,122,166,0.14)", ink: "#5a4f8a" };
    case "unreachable": return { border: "#c23b22", bg: "rgba(194,59,34,0.10)", ink: "#8c1d0c" };
    default: return { border: COLORS.border, bg: COLORS.parchmentDeep, ink: COLORS.ink };
  }
}

/** Emoji glyph for synthetic terminal leaves (which have no baked icon). */
function terminalGlyph(node: ReachPathNode): string | null {
  switch (node.terminal) {
    case "home": return "🏡";
    case "board": return "🎲";
    case "gated": return "🔓";
    case "catalog": return "📚";
    case "missing": return "⛔";
    default: return null;
  }
}

/** Resolve the display label + baked icon key for a node. */
function display(node: ReachPathNode): { label: string; iconKey: string | null } {
  if (node.conceptId && node.entityKey) {
    const entity = getEntity(node.conceptId, node.entityKey);
    const name =
      (entity?.label as string) ?? (entity?.name as string) ?? iconLabel(node.entityKey) ?? node.entityKey;
    return { label: name, iconKey: entityIconKey(node.conceptId, node.entityKey, entity) };
  }
  return { label: node.label, iconKey: null };
}

/** Longest-path depth of every node from the root (small DAG → iterate to fixpoint). */
function computeDepths(rootId: string, edges: Array<{ from: string; to: string }>): Map<string, number> {
  const depth = new Map<string, number>([[rootId, 0]]);
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    for (const e of edges) {
      const d = depth.get(e.from);
      if (d == null) continue;
      if ((depth.get(e.to) ?? -1) < d + 1) { depth.set(e.to, d + 1); changed = true; }
    }
  }
  return depth;
}

export interface ReachabilityPathModalProps {
  conceptId: string;
  entityKey: string;
  onClose: () => void;
}

export function ReachabilityPathModal({ conceptId, entityKey, onClose }: ReachabilityPathModalProps) {
  const { navigate } = useBalanceNav();

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const graph = reachabilityPath(conceptId, entityKey);
  const rootEntity = getEntity(conceptId, entityKey);
  const rootName =
    (rootEntity?.label as string) ?? (rootEntity?.name as string) ?? iconLabel(entityKey) ?? entityKey;

  // ── Layout ──────────────────────────────────────────────────────────────────
  const layout = (() => {
    if (!graph) return null;
    const depth = computeDepths(graph.rootId, graph.edges);
    const byDepth = new Map<number, string[]>();
    for (const n of graph.nodes) {
      const d = depth.get(n.id) ?? 0;
      (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(n.id);
    }
    const pos = new Map<string, { x: number; y: number }>();
    let maxCols = 0;
    let maxDepth = 0;
    for (const [d, ids] of byDepth) {
      maxDepth = Math.max(maxDepth, d);
      maxCols = Math.max(maxCols, ids.length);
      ids.forEach((id, i) => pos.set(id, { x: PAD + i * COL_STRIDE, y: PAD + d * ROW_STRIDE }));
    }
    const width = PAD * 2 + Math.max(1, maxCols) * COL_STRIDE;
    const height = PAD * 2 + (maxDepth + 1) * ROW_STRIDE - (ROW_STRIDE - NODE_H);
    return { pos, width, height };
  })();

  return (
    <div
      className="wiki-cost-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`How ${rootName} is reachable`}
      onClick={onClose}
    >
      <div className="wiki-cost-modal wiki-reach-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wiki-cost-modal__head">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="wiki-concept-title" style={{ margin: 0, fontSize: 18 }}>
              How <span style={{ color: COLORS.ember }}>{rootName}</span> is reachable
            </h2>
            {graph?.status && <ReachabilityBadge reach={graph.status} />}
          </div>
          <button type="button" className="wiki-cost-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!graph || !layout ? (
          <p className="text-[13px] italic" style={{ color: COLORS.inkSubtle }}>
            No reachability data for this entity.
          </p>
        ) : (
          <>
            <p className="text-[12px] m-0" style={{ color: COLORS.inkSubtle }}>
              Read top-down: each step shows what unlocks the one above it, ending at a source
              (Home, the default board, or an optional system). Click any node to open its article.
              {graph.truncated && " (Graph truncated — too many dependencies to show in full.)"}
            </p>

            <div className="wiki-reach-graph" style={{ overflow: "auto" }}>
              <div style={{ position: "relative", width: layout.width, height: layout.height }}>
                {/* Edges */}
                <svg
                  width={layout.width}
                  height={layout.height}
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
                >
                  {graph.edges.map((e, i) => {
                    const a = layout.pos.get(e.from);
                    const b = layout.pos.get(e.to);
                    if (!a || !b) return null;
                    const x1 = a.x + NODE_W / 2;
                    const y1 = a.y + NODE_H;
                    const x2 = b.x + NODE_W / 2;
                    const y2 = b.y;
                    const midY = (y1 + y2) / 2;
                    return (
                      <g key={i}>
                        <path
                          d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                          fill="none"
                          stroke={COLORS.border}
                          strokeWidth={1.75}
                        />
                        {e.label && (
                          <text
                            x={(x1 + x2) / 2}
                            y={midY - 3}
                            textAnchor="middle"
                            fontSize={10}
                            fill={COLORS.inkSubtle}
                            style={{ paintOrder: "stroke", stroke: COLORS.parchment, strokeWidth: 3 }}
                          >
                            {e.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes */}
                {graph.nodes.map((n) => {
                  const p = layout.pos.get(n.id);
                  if (!p) return null;
                  const tone = toneFor(n);
                  const { label, iconKey } = display(n);
                  const glyph = terminalGlyph(n);
                  const clickable = n.conceptId != null && n.entityKey != null;
                  const style: React.CSSProperties = {
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    width: NODE_W,
                    height: NODE_H,
                    borderColor: tone.border,
                    background: tone.bg,
                    cursor: clickable ? "pointer" : "default",
                  };
                  const inner = (
                    <>
                      <span className="wiki-reach-node__visual" aria-hidden>
                        {iconKey ? <Icon iconKey={iconKey} size={26} /> : <span style={{ fontSize: 22 }}>{glyph}</span>}
                      </span>
                      <span className="wiki-reach-node__text">
                        <span className="wiki-reach-node__label" style={{ color: tone.ink }}>{label}</span>
                        {n.detail && <span className="wiki-reach-node__detail">{n.detail}</span>}
                      </span>
                    </>
                  );
                  return clickable ? (
                    <button
                      key={n.id}
                      type="button"
                      className="wiki-reach-node"
                      title={`${n.conceptId}:${n.entityKey}`}
                      onClick={() => { navigate(wikiNavTarget(n.conceptId!, n.entityKey!)); onClose(); }}
                      style={style}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div key={n.id} className="wiki-reach-node" title={label} style={style}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="wiki-reach-legend">
              <span><i style={{ background: "rgba(90,158,75,0.12)", borderColor: "#5a9e4b" }} />Reachable</span>
              <span><i style={{ background: "rgba(126,122,166,0.14)", borderColor: "#7e7aa6" }} />Gated</span>
              <span><i style={{ background: "rgba(194,59,34,0.10)", borderColor: "#c23b22" }} />Unreachable / missing</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReachabilityPathModal;
