import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import { labelFor } from "../../ui/Inventory.jsx";
import Icon from "../../ui/Icon.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { SearchInput } from "../../ui/primitives/Field.jsx";
import { buildGraph, NODE_W, NODE_H } from "./graphLayout.js";

export const viewKey = "recipeWiki";

const STATION_COLORS = {
  workshop:   "#b06a3a",
  bakery:     "#c4893e",
  forge:      "#7a7a8a",
  larder:     "#6d9b5a",
  kitchen:    "#c4a33e",
  smokehouse: "#9b6b4a",
};

// ── Transitive chain computation ──────────────────────────────────────────────
function computeTransitiveChain(key, edges) {
  // BFS upstream: all items needed (transitively) to craft this item
  const chain = new Set([key]);
  for (const curr of chain) {
    for (const e of edges) {
      if (e.toKey === curr) chain.add(e.fromKey);
    }
  }
  // BFS downstream: all items that use this item (transitively)
  const downstream = new Set([key]);
  for (const curr of downstream) {
    for (const e of edges) {
      if (e.fromKey === curr) downstream.add(e.toKey);
    }
  }
  for (const k of downstream) chain.add(k);
  return chain;
}

// ── WikiNode ──────────────────────────────────────────────────────────────────
function WikiNode({ node, selectedKey, connectedKeys, onSelect }) {
  const isSelected = selectedKey === node.key;
  const isDimmed = connectedKeys && !connectedKeys.has(node.key);

  let borderClass = "border-iron";
  let bgClass = "bg-parchment";
  if (isSelected) {
    borderClass = "border-moss";
    bgClass = "bg-moss/10";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={node.label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onSelect(node.key); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onSelect(node.key); } }}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: NODE_W,
        height: NODE_H,
        opacity: isDimmed ? 0.2 : 1,
      }}
      className={`border-2 rounded-lg flex flex-col items-center justify-center p-1 gap-0.5 cursor-pointer ${bgClass} ${borderClass} transition-opacity`}
    >
      <Icon iconKey={node.key} size={36} />
      <span className="text-[9px] text-center text-ink-soft leading-tight">{node.label}</span>
    </div>
  );
}

// ── WikiEdge ──────────────────────────────────────────────────────────────────
function WikiEdge({ edge, selectedKey, connectedKeys }) {
  const { x1, y1, x2, y2, cpX, station, qty, fromKey, toKey } = edge;
  const isHighlighted = selectedKey && (fromKey === selectedKey || toKey === selectedKey);
  const isDimmed = connectedKeys && !connectedKeys.has(fromKey) && !connectedKeys.has(toKey);

  const strokeColor = STATION_COLORS[station] ?? "#888888";
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
        markerEnd="none"
      />
      {isHighlighted && qty && (
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

// ── WikiInfoCard ──────────────────────────────────────────────────────────────
function WikiInfoCard({ itemKey, onClose }) {
  const label = labelFor(itemKey);
  const itemDef = ITEMS[itemKey] ?? {};

  // Recipes that produce this item ("Crafted by:")
  const craftedBy = useMemo(
    () => Object.entries(RECIPES).filter(([k, r]) => k.startsWith("rec_") && r.item === itemKey),
    [itemKey]
  );

  // Recipes that use this item as an input ("Used in:")
  const usedIn = useMemo(
    () =>
      Object.entries(RECIPES).filter(
        ([k, r]) => k.startsWith("rec_") && r.inputs && Object.prototype.hasOwnProperty.call(r.inputs, itemKey)
      ),
    [itemKey]
  );

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-parchment border-t border-iron p-3"
      style={{ minHeight: 160, maxHeight: 200, overflowY: "auto" }}
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="Close info card"
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-ink-soft hover:bg-parchment-dim transition-colors text-base leading-none"
      >
        ×
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon iconKey={itemKey} size={32} />
        <span className="text-sm font-semibold text-ink">{label}</span>
        {itemDef.desc && (
          <span className="text-[10px] text-ink-soft ml-1">{itemDef.desc}</span>
        )}
      </div>

      <div className="flex gap-6 text-[11px]">
        {/* Crafted by */}
        {craftedBy.length > 0 && (
          <div>
            <div className="text-[10px] text-ink-soft uppercase tracking-wide mb-1">Crafted by</div>
            {craftedBy.map(([key, r]) => (
              <div key={key} className="flex items-center gap-1 mb-0.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATION_COLORS[r.station] ?? "#888" }}
                />
                <span className="text-ink capitalize">{r.station}</span>
                <span className="text-ink-soft">—</span>
                {Object.entries(r.inputs).map(([inp, qty]) => (
                  <span key={inp} className="flex items-center gap-0.5 text-ink-soft">
                    <Icon iconKey={inp} size={14} />
                    <span>×{qty}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Used in */}
        {usedIn.length > 0 && (
          <div>
            <div className="text-[10px] text-ink-soft uppercase tracking-wide mb-1">Used in</div>
            {usedIn.map(([key, r]) => (
              <div key={key} className="flex items-center gap-1 mb-0.5">
                <Icon iconKey={r.item} size={14} />
                <span className="text-ink">{labelFor(r.item)}</span>
                <span className="text-ink-soft text-[10px] capitalize">({r.station})</span>
              </div>
            ))}
          </div>
        )}

        {craftedBy.length === 0 && usedIn.length === 0 && (
          <span className="text-ink-soft">No recipe connections found.</span>
        )}
      </div>
    </div>
  );
}

// ── Main WikiScreen ───────────────────────────────────────────────────────────
export default function WikiScreen() {
  const [view, setView] = useState({ x: 40, y: 40, scale: 1 });
  const [selectedKey, setSelectedKey] = useState(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const { nodes, edges, totalW, totalH } = useMemo(
    () =>
      buildGraph(
        Object.fromEntries(Object.entries(RECIPES).filter(([k]) => k.startsWith("rec_"))),
        labelFor
      ),
    []
  );

  // Key matched by current search query (for chain filter)
  const autoSelectedKey = useMemo(() => {
    if (!query) return null;
    return nodes.find((n) => n.label.toLowerCase().includes(query.toLowerCase()))?.key ?? null;
  }, [query, nodes]);

  // Dimming: click selection → immediate neighbors; search → full transitive chain
  const connectedKeys = useMemo(() => {
    if (selectedKey) {
      const s = new Set([selectedKey]);
      for (const e of edges) {
        if (e.fromKey === selectedKey) s.add(e.toKey);
        if (e.toKey === selectedKey) s.add(e.fromKey);
      }
      return s;
    }
    if (autoSelectedKey) return computeTransitiveChain(autoSelectedKey, edges);
    return null;
  }, [selectedKey, autoSelectedKey, edges]);

  // Pan
  function startPan(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX - view.x, startY: e.clientY - view.y };
  }
  function doPan(e) {
    if (!dragRef.current) return;
    setView((v) => ({
      ...v,
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    }));
  }
  function endPan() {
    dragRef.current = null;
  }

  // Zoom
  const doZoom = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setView((v) => {
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

  // Select / deselect a node
  function handleSelect(key) {
    setSelectedKey((prev) => (prev === key ? null : key));
  }

  // Search — pan to first match
  useEffect(() => {
    if (!query) return;
    const match = nodes.find((n) => n.label.toLowerCase().includes(query.toLowerCase()));
    if (!match) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setView((v) => ({
      ...v,
      x: rect.width / 2 - (match.x + NODE_W / 2) * v.scale,
      y: rect.height / 2 - (match.y + NODE_H / 2) * v.scale,
    }));
  }, [query, nodes]);

  return (
    <FeaturePanel className="z-10">
      <FeaturePanel.Toolbar className="pt-2 pb-2">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search items..."
          ariaLabel="Search items"
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleFit}
          className="ml-2 rounded-lg px-2 py-1 border border-iron bg-parchment-dim text-ink-soft text-[11px] hover:bg-parchment-soft transition-colors"
        >
          Fit
        </button>
      </FeaturePanel.Toolbar>

      <FeaturePanel.Body>
        <div
          ref={containerRef}
          className="w-full h-full overflow-hidden relative select-none"
          onPointerDown={startPan}
          onPointerMove={doPan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onWheel={doZoom}
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
              {edges.map((e, i) => (
                <WikiEdge
                  key={i}
                  edge={e}
                  selectedKey={selectedKey}
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
            {nodes.map((n) => (
              <WikiNode
                key={n.key}
                node={n}
                selectedKey={selectedKey}
                connectedKeys={connectedKeys}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {selectedKey && (
          <WikiInfoCard
            key={selectedKey}
            itemKey={selectedKey}
            edges={edges}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
