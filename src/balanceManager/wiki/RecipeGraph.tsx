/**
 * RecipeGraph.tsx — Interactive recipe relationship graph for the Dev Panel Wiki.
 *
 * Self-contained, wiki-styled node-link graph of the full recipe web.
 * Adapts the pan/zoom/highlight logic from src/features/wiki/index.tsx but
 * replaces game chrome (FeaturePanel, game SearchInput, game labelFor) with
 * wiki-native inline styles using COLORS, and wires node clicks to wiki
 * navigation rather than a local info-card.
 *
 * READ-ONLY. No game-state, no Phaser, no dispatch.
 */

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import Icon from "../../ui/Icon.jsx";
import {
  buildGraph,
  NODE_W,
  NODE_H,
  type WikiNodeDef,
  type WikiEdgeDef,
} from "../../features/wiki/graphLayout.js";
import { COLORS } from "../shared.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";
import { conceptForKey } from "./conceptEntities.js";

// ── Station colour map (inline — no game import needed) ───────────────────────

const STATION_COLORS: Record<string, string> = {
  workshop:   "#b06a3a",
  bakery:     "#c4893e",
  forge:      "#7a7a8a",
  larder:     "#6d9b5a",
  kitchen:    "#c4a33e",
  smokehouse: "#9b6b4a",
};

// ── Label helper (lightweight — avoids game Inventory.labelFor) ───────────────

function labelFn(k: string): string {
  const item = (ITEMS as Record<string, { label?: string } | undefined>)[k];
  return item?.label ?? k;
}

// ── Transitive chain computation ──────────────────────────────────────────────

function computeTransitiveChain(key: string, edges: WikiEdgeDef[]): Set<string> {
  // BFS upstream: all items needed (transitively) to craft this item
  const chain = new Set<string>([key]);
  for (const curr of chain) {
    for (const e of edges) {
      if (e.toKey === curr) chain.add(e.fromKey);
    }
  }
  // BFS downstream: all items that use this item (transitively)
  const downstream = new Set<string>([key]);
  for (const curr of downstream) {
    for (const e of edges) {
      if (e.fromKey === curr) downstream.add(e.toKey);
    }
  }
  for (const k of downstream) chain.add(k);
  return chain;
}

// ── Node component ────────────────────────────────────────────────────────────

interface WikiNodeProps {
  node: WikiNodeDef;
  selectedKey: string | null;
  connectedKeys: Set<string> | null;
  onSelect: (k: string) => void;
}

function WikiNode({ node, selectedKey, connectedKeys, onSelect }: WikiNodeProps) {
  const isSelected = selectedKey === node.key;
  const isDimmed = connectedKeys != null && !connectedKeys.has(node.key);

  const borderColor = isSelected ? COLORS.ember : COLORS.border;
  const bg = isSelected ? COLORS.parchmentDeep : COLORS.parchment;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={node.label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onSelect(node.key); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          onSelect(node.key);
        }
      }}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: NODE_W,
        height: NODE_H,
        opacity: isDimmed ? 0.2 : 1,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
        gap: 2,
        cursor: "pointer",
        background: bg,
        boxShadow: isSelected ? `0 0 0 2px ${COLORS.ember}44` : undefined,
        // Respect prefers-reduced-motion via CSS transition (no JS needed here)
        transition: "opacity 150ms ease, box-shadow 150ms ease",
        userSelect: "none",
      }}
    >
      <Icon iconKey={node.key} size={36} />
      <span
        style={{
          fontSize: 9,
          textAlign: "center",
          color: COLORS.inkLight,
          lineHeight: 1.2,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.label}
      </span>
    </div>
  );
}

// ── Edge component ────────────────────────────────────────────────────────────

interface WikiEdgeProps {
  edge: WikiEdgeDef;
  selectedKey: string | null;
  connectedKeys: Set<string> | null;
}

function WikiEdge({ edge, selectedKey, connectedKeys }: WikiEdgeProps) {
  const { x1, y1, x2, y2, cpX, station, qty, fromKey, toKey } = edge;
  const isHighlighted =
    selectedKey != null && (fromKey === selectedKey || toKey === selectedKey);
  const isDimmed =
    connectedKeys != null &&
    !connectedKeys.has(fromKey) &&
    !connectedKeys.has(toKey);

  const strokeColor = STATION_COLORS[station] ?? COLORS.inkSubtle;
  const strokeWidth = isHighlighted ? 2.5 : 1.5;
  const opacity = isDimmed ? 0.07 : isHighlighted ? 1 : 0.45;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <>
      <path
        d={`M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
      {isHighlighted && qty != null && (
        <text
          x={midX}
          y={midY - 4}
          textAnchor="middle"
          fontSize="10"
          fill={strokeColor}
          opacity={1}
          style={{ userSelect: "none" }}
        >
          ×{qty}
        </text>
      )}
    </>
  );
}

// ── State types ───────────────────────────────────────────────────────────────

interface ViewState { x: number; y: number; scale: number }
interface DragState { startX: number; startY: number }
interface PinchState { distance: number; cx: number; cy: number; baseView: ViewState }

// ── RecipeGraph ───────────────────────────────────────────────────────────────

/**
 * Interactive recipe relationship graph.
 * - Pan via pointer drag, zoom via wheel, pinch-zoom on touch.
 * - Click a node to select it (dims unrelated nodes/edges via transitive chain).
 * - Click selected node again to deselect.
 * - Click a node to navigate to its wiki article (conceptForKey → wikiNavTarget).
 * - Search box pans to + highlights the first matching node.
 * - "Fit" button resets zoom to fit all nodes.
 */
export default function RecipeGraph() {
  const { navigate } = useBalanceNav();

  const [view, setView] = useState<ViewState>({ x: 40, y: 40, scale: 1 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);

  // Build graph once from live recipes
  const { nodes, edges, totalW, totalH } = useMemo(
    () =>
      buildGraph(
        Object.fromEntries(
          Object.entries(RECIPES).filter(([k]) => k.startsWith("rec_")),
        ) as Record<string, unknown>,
        labelFn,
      ),
    [],
  );

  // Key matched by current search query (for chain filter)
  const autoSelectedKey: string | null = useMemo(() => {
    if (!query) return null;
    return (
      nodes.find((n: WikiNodeDef) =>
        n.label.toLowerCase().includes(query.toLowerCase()),
      )?.key ?? null
    );
  }, [query, nodes]);

  const chainFocusKey: string | null = selectedKey ?? autoSelectedKey;

  const connectedKeys: Set<string> | null = useMemo(
    () => (chainFocusKey ? computeTransitiveChain(chainFocusKey, edges) : null),
    [chainFocusKey, edges],
  );

  // Search — pan to first match
  useEffect(() => {
    if (!query) return;
    const match = nodes.find((n: WikiNodeDef) =>
      n.label.toLowerCase().includes(query.toLowerCase()),
    );
    if (!match) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setView((v: ViewState) => ({
      ...v,
      x: rect.width / 2 - (match.x + NODE_W / 2) * v.scale,
      y: rect.height / 2 - (match.y + NODE_H / 2) * v.scale,
    }));
  }, [query, nodes]);

  // Pan (pointer events)
  function startPan(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = {
        startX: e.clientX - view.x,
        startY: e.clientY - view.y,
      };
      pinchRef.current = null;
      return;
    }
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const [a, b] = pts;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (a.x + b.x) / 2 - rect.left;
      const cy = (a.y + b.y) / 2 - rect.top;
      pinchRef.current = { distance, cx, cy, baseView: { ...view } };
      dragRef.current = null;
    }
  }

  function doPan(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const [a, b] = pts;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const pinch = pinchRef.current;
      if (!pinch || pinch.distance <= 0) return;
      const nextScale = Math.min(
        2.5,
        Math.max(0.25, pinch.baseView.scale * (distance / pinch.distance)),
      );
      setView(() => ({
        scale: nextScale,
        x:
          pinch.cx -
          (pinch.cx - pinch.baseView.x) * (nextScale / pinch.baseView.scale),
        y:
          pinch.cy -
          (pinch.cy - pinch.baseView.y) * (nextScale / pinch.baseView.scale),
      }));
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    setView((v: ViewState) => ({
      ...v,
      x: e.clientX - drag.startX,
      y: e.clientY - drag.startY,
    }));
  }

  function endPan() {
    pointersRef.current.clear();
    dragRef.current = null;
    pinchRef.current = null;
  }

  // Zoom — non-passive so we can call preventDefault and block page scroll
  const doZoom = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setView((v: ViewState) => {
      const next = Math.min(2.5, Math.max(0.25, v.scale * (1 + delta)));
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...v, scale: next };
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      return {
        scale: next,
        x: cx - (cx - v.x) * (next / v.scale),
        y: cy - (cy - v.y) * (next / v.scale),
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", doZoom, { passive: false });
    return () => el.removeEventListener("wheel", doZoom);
  }, [doZoom]);

  // Fit button
  function handleFit() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 20;
    const scaleX = (rect.width - pad * 2) / totalW;
    const scaleY = (rect.height - pad * 2) / totalH;
    const scale = Math.min(scaleX, scaleY, 2.5);
    setView({ x: pad, y: pad, scale });
  }

  // Select / deselect then navigate
  function handleSelect(key: string) {
    setSelectedKey((prev: string | null) => {
      const next = prev === key ? null : key;
      // Navigate to the wiki article for this item when selecting
      if (next !== null) {
        const conceptId = conceptForKey(key);
        if (conceptId != null) {
          navigate(wikiNavTarget(conceptId, key));
        }
      }
      return next;
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* Search box */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          aria-label="Search recipe graph items"
          style={{
            flex: 1,
            minWidth: 120,
            height: 28,
            padding: "0 8px",
            fontSize: 12,
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.parchment,
            color: COLORS.ink,
            outline: "none",
          }}
        />

        {/* Fit button */}
        <button
          type="button"
          onClick={handleFit}
          style={{
            height: 28,
            padding: "0 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.parchmentDeep,
            color: COLORS.inkLight,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Fit
        </button>

        {/* Node filter dropdown */}
        <select
          value={selectedKey ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedKey(val || null);
          }}
          aria-label="Filter by node"
          style={{
            height: 28,
            padding: "0 6px",
            fontSize: 11,
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.parchment,
            color: COLORS.inkLight,
            flexShrink: 0,
          }}
        >
          <option value="">All nodes</option>
          {nodes.map((n: WikiNodeDef) => (
            <option key={n.key} value={n.key}>
              {n.label}
            </option>
          ))}
        </select>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          {Object.entries(STATION_COLORS).map(([station, color]) => (
            <span
              key={station}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                color: COLORS.inkSubtle,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              {station}
            </span>
          ))}
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 480,
          overflow: "hidden",
          background: COLORS.canvas,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          userSelect: "none",
          cursor: "grab",
        }}
        onPointerDown={startPan}
        onPointerMove={doPan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        {/* SVG edge layer */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {edges.map((e: WikiEdgeDef, i: number) => (
              <WikiEdge
                key={i}
                edge={e}
                selectedKey={chainFocusKey}
                connectedKeys={connectedKeys}
              />
            ))}
          </g>
        </svg>

        {/* Node div layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "0 0",
            transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
            width: totalW,
            height: totalH,
          }}
        >
          {nodes.map((n: WikiNodeDef) => (
            <WikiNode
              key={n.key}
              node={n}
              selectedKey={chainFocusKey}
              connectedKeys={connectedKeys}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Hint overlay */}
        {nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: COLORS.inkSubtle,
            }}
          >
            No recipe data found.
          </div>
        )}
      </div>

      {/* ── Footer hint ──────────────────────────────────────────────────────── */}
      <p
        style={{
          margin: 0,
          fontSize: 10,
          color: COLORS.inkSubtle,
          fontStyle: "italic",
        }}
      >
        Click a node to navigate to its wiki article. Drag to pan, scroll to zoom.
        Selecting a node or typing a name dims unrelated items.
      </p>
    </div>
  );
}
