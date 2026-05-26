import { useState, useMemo, useRef, useEffect, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import { labelFor } from "../../ui/Inventory.jsx";
import Icon from "../../ui/Icon.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";
import { SearchInput } from "../../ui/primitives/Field.jsx";
import { buildGraph, NODE_W, NODE_H, type WikiNodeDef, type WikiEdgeDef } from "./graphLayout.js";

export const viewKey = "recipeWiki";

const STATION_COLORS: Record<string, string> = {
  workshop:   "#b06a3a",
  bakery:     "#c4893e",
  forge:      "#7a7a8a",
  larder:     "#6d9b5a",
  kitchen:    "#c4a33e",
  smokehouse: "#9b6b4a",
};

interface RecipeDef {
  item: string;
  station: string;
  inputs: Record<string, number>;
}

interface ItemDef {
  desc?: string;
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

interface WikiNodeProps {
  node: WikiNodeDef;
  selectedKey: string | null;
  connectedKeys: Set<string> | null;
  onSelect: (k: string) => void;
}

// ── WikiNode ──────────────────────────────────────────────────────────────────
function WikiNode({ node, selectedKey, connectedKeys, onSelect }: WikiNodeProps) {
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

interface WikiEdgeProps {
  edge: WikiEdgeDef;
  selectedKey: string | null;
  connectedKeys: Set<string> | null;
}

// ── WikiEdge ──────────────────────────────────────────────────────────────────
function WikiEdge({ edge, selectedKey, connectedKeys }: WikiEdgeProps) {
  const { x1, y1, x2, y2, cpX, station, qty, fromKey, toKey } = edge;
  const isHighlighted = !!selectedKey && (fromKey === selectedKey || toKey === selectedKey);
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

interface WikiInfoCardProps {
  itemKey: string;
  isVisible: boolean;
  onClose: () => void;
  edges?: WikiEdgeDef[];
}

// ── WikiInfoCard ──────────────────────────────────────────────────────────────
function WikiInfoCard({ itemKey, isVisible, onClose }: WikiInfoCardProps) {
  const label = labelFor(itemKey);
  const itemMap = ITEMS as unknown as Record<string, ItemDef | undefined>;
  const itemDef: ItemDef = itemMap[itemKey] ?? {};

  // Recipes that produce this item ("Crafted by:")
  const craftedBy = useMemo(
    () => (Object.entries(RECIPES) as Array<[string, RecipeDef]>).filter(([k, r]) => k.startsWith("rec_") && r.item === itemKey),
    [itemKey]
  );

  // Recipes that use this item as an input ("Used in:")
  const usedIn = useMemo(
    () =>
      (Object.entries(RECIPES) as Array<[string, RecipeDef]>).filter(
        ([k, r]) => k.startsWith("rec_") && r.inputs && Object.prototype.hasOwnProperty.call(r.inputs, itemKey)
      ),
    [itemKey]
  );

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-parchment border-t border-iron p-3"
      style={{
        minHeight: 160,
        maxHeight: 200,
        overflowY: "auto",
        transform: isVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 220ms ease-out",
        willChange: "transform",
      }}
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
                {Object.entries(r.inputs).map(([inp, qty]: [string, number]) => (
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

interface ViewState { x: number; y: number; scale: number }
interface DragState { startX: number; startY: number }
interface PinchState { distance: number; cx: number; cy: number; baseView: ViewState }

// ── Main WikiScreen ───────────────────────────────────────────────────────────
export default function WikiScreen() {
  const [view, setView] = useState<ViewState>({ x: 40, y: 40, scale: 1 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filteredNodeKey, setFilteredNodeKey] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  // Card animation: cardKey keeps the card mounted during exit transition
  const [cardKey, setCardKey] = useState<string | null>(null);
  const [cardVisible, setCardVisible] = useState<boolean>(false);

  useEffect(() => {
    let raf1: number | undefined;
    let raf2: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (selectedKey) {
      const key = selectedKey;
      // Frame 1: mount hidden; Frame 2: transition in
      raf1 = requestAnimationFrame(() => {
        setCardKey(key);
        raf2 = requestAnimationFrame(() => setCardVisible(true));
      });
    } else {
      // Start exit transition, then unmount after it completes
      raf1 = requestAnimationFrame(() => setCardVisible(false));
      timer = setTimeout(() => setCardKey(null), 230);
    }
    return () => {
      if (raf1 != null) cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
      if (timer != null) clearTimeout(timer);
    };
  }, [selectedKey]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);

  const { nodes, edges, totalW, totalH } = useMemo(
    () =>
      buildGraph(
        Object.fromEntries(Object.entries(RECIPES).filter(([k]) => k.startsWith("rec_"))) as Record<string, RecipeDef>,
        labelFor
      ),
    []
  );

  // Key matched by current search query (for chain filter)
  const autoSelectedKey: string | null = useMemo(() => {
    if (!query) return null;
    return nodes.find((n: WikiNodeDef) => n.label.toLowerCase().includes(query.toLowerCase()))?.key ?? null;
  }, [query, nodes]);

  const chainFocusKey: string | null = (selectedKey ?? filteredNodeKey) || autoSelectedKey;
  const connectedKeys: Set<string> | null = useMemo(
    () => (chainFocusKey ? computeTransitiveChain(chainFocusKey, edges) : null),
    [chainFocusKey, edges]
  );

  const visibleNodes = useMemo(
    () => (connectedKeys ? nodes.filter((n: WikiNodeDef) => connectedKeys.has(n.key)) : nodes),
    [connectedKeys, nodes]
  );
  const visibleEdges = useMemo(
    () =>
      connectedKeys
        ? edges.filter((e: WikiEdgeDef) => connectedKeys.has(e.fromKey) && connectedKeys.has(e.toKey))
        : edges,
    [connectedKeys, edges]
  );

  // Pan
  function startPan(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = { startX: e.clientX - view.x, startY: e.clientY - view.y };
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
      const nextScale = Math.min(2.5, Math.max(0.25, pinch.baseView.scale * (distance / pinch.distance)));
      setView(() => ({
        scale: nextScale,
        x: pinch.cx - (pinch.cx - pinch.baseView.x) * (nextScale / pinch.baseView.scale),
        y: pinch.cy - (pinch.cy - pinch.baseView.y) * (nextScale / pinch.baseView.scale),
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

  // Zoom — must be non-passive to call preventDefault and block page scroll
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

  // Select / deselect a node
  function handleSelect(key: string) {
    setSelectedKey((prev: string | null) => (prev === key ? null : key));
  }

  // Search — pan to first match
  useEffect(() => {
    if (!query) return;
    const match = nodes.find((n: WikiNodeDef) => n.label.toLowerCase().includes(query.toLowerCase()));
    if (!match) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setView((v: ViewState) => ({
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
          onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
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
        <select
          value={filteredNodeKey}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilteredNodeKey(e.target.value)}
          aria-label="Filter by node"
          className="ml-2 rounded-lg px-2 py-1 border border-iron bg-parchment text-ink-soft text-[11px]"
        >
          <option value="">All nodes</option>
          {nodes.map((n: WikiNodeDef) => (
            <option key={n.key} value={n.key}>{n.label}</option>
          ))}
        </select>
      </FeaturePanel.Toolbar>

      <FeaturePanel.Body>
        <div
          ref={containerRef}
          className="w-full h-full overflow-hidden relative select-none"
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
              {visibleEdges.map((e: WikiEdgeDef, i: number) => (
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
            {visibleNodes.map((n: WikiNodeDef) => (
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

        {cardKey && (
          <WikiInfoCard
            key={cardKey}
            itemKey={cardKey}
            isVisible={cardVisible}
            edges={edges}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
