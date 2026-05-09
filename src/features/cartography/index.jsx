import { useState, useEffect, useMemo } from 'react';
import { MAP_NODES, MAP_EDGES, NODE_COLORS, REGIONS, KIND_LABELS } from './data.js';
import { isAdjacent } from './slice.js';
import IconCanvas, { hasIcon } from '../../ui/IconCanvas.jsx';

function NodeBadge({ nodeId, fallbackEmoji, size = 22 }) {
  const k = `map_${nodeId}`;
  if (hasIcon(k)) {
    return (
      <span style={{ width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
        <IconCanvas iconKey={k} size={size} />
      </span>
    );
  }
  return <span>{fallbackEmoji}</span>;
}

export const viewKey = 'cartography';

// ─── Helpers ──────────────────────────────────────────────────────────────

// Portrait phones get a stacked layout (panel on top, full-width map below).
// Landscape (and tablets/desktop) keep the side-by-side layout.
function useIsPortrait() {
  const [portrait, setPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(orientation: portrait)');
    const update = () => setPortrait(mq.matches);
    mq.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return portrait;
}

function getNodeStatus(node, visitedSet, discoveredSet, current, playerLevel) {
  if (node.id === current) return 'current';
  if (visitedSet.has(node.id)) return 'visited';
  if (discoveredSet.has(node.id)) {
    const reachable = isAdjacent(current, node.id);
    if (!reachable) return 'discovered-unreachable';
    if (node.level > playerLevel) return 'discovered-locked';
    return 'discovered-ready';
  }
  return 'hidden';
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function PulseRing({ cx, cy, color = '#f5a623' }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    let rising = true;
    const id = setInterval(() => {
      setScale(s => {
        const next = rising ? s + 0.05 : s - 0.05;
        if (next >= 1.6) rising = false;
        if (next <= 1.0) rising = true;
        return next;
      });
    }, 70);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <circle cx={cx} cy={cy} r={5 * scale} fill="none" stroke={color} strokeWidth="0.7" opacity={1.6 - scale * 0.5} />
      <circle cx={cx} cy={cy} r={6.5 * scale} fill="none" stroke={color} strokeWidth="0.4" opacity={1.2 - scale * 0.5} />
    </>
  );
}

function ReadyGlow({ cx, cy }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(v => v + 1), 120);
    return () => clearInterval(id);
  }, []);
  const opacity = 0.45 + Math.sin(t * 0.3) * 0.25;
  return <circle cx={cx} cy={cy} r="5.6" fill="none" stroke="#f5e09a" strokeWidth="0.6" opacity={opacity} />;
}

function MapSvg({ nodes, edges, visited, discovered, current, tapped, playerLevel, onTap }) {
  const visitedSet    = useMemo(() => new Set(visited),    [visited]);
  const discoveredSet = useMemo(() => new Set(discovered), [discovered]);

  const regionShapes = REGIONS.map(r => (
    <ellipse
      key={r.id}
      cx={r.cx}
      cy={r.cy}
      rx={r.rx}
      ry={r.ry}
      fill={r.fill}
      opacity={0.32}
    />
  ));

  const regionLabels = REGIONS.map(r => (
    <text
      key={`${r.id}-label`}
      x={r.cx}
      y={r.cy - r.ry + 3.2}
      textAnchor="middle"
      fontSize="2.4"
      fill="#5a3a20"
      opacity={0.55}
      fontFamily="Arial, sans-serif"
      fontStyle="italic"
      letterSpacing="0.3"
    >
      {r.label.toUpperCase()}
    </text>
  ));

  // Edges are drawn with three styles:
  //   visited↔visited      → solid bold, "traveled" road
  //   visited↔discovered   → dashed amber, "you can unlock through here"
  //   anything else        → faint, suggesting unexplored terrain
  const edgePaths = edges.map(([a, b], i) => {
    const na = nodes.find(n => n.id === a);
    const nb = nodes.find(n => n.id === b);
    if (!na || !nb) return null;

    const aV = visitedSet.has(a),  bV = visitedSet.has(b);
    const aD = discoveredSet.has(a), bD = discoveredSet.has(b);

    const traveled  = aV && bV;
    const unlockable = (aV && bD && !bV) || (bV && aD && !aV);

    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2 + (i % 2 === 0 ? -4 : 4);

    let stroke, width, dash, opacity;
    if (traveled) {
      stroke = '#5a3a20'; width = 1.0; dash = 'none';   opacity = 0.85;
    } else if (unlockable) {
      stroke = '#c87a28'; width = 0.7; dash = '1.4 1';  opacity = 0.85;
    } else if (aD && bD) {
      stroke = '#8a6a50'; width = 0.5; dash = '1 1.5'; opacity = 0.45;
    } else {
      stroke = '#8a6a50'; width = 0.4; dash = '0.6 1.5'; opacity = 0.18;
    }

    return (
      <path
        key={`${a}-${b}`}
        d={`M ${na.x} ${na.y} Q ${mx} ${my} ${nb.x} ${nb.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash}
        opacity={opacity}
        strokeLinecap="round"
      />
    );
  });

  const nodeElements = nodes.map(node => {
    const status = getNodeStatus(node, visitedSet, discoveredSet, current, playerLevel);
    const isTapped = node.id === tapped;
    const color    = NODE_COLORS[node.kind] || '#888';

    if (status === 'hidden') {
      // Faint hint that something exists farther afield. Not interactive.
      return (
        <g key={node.id} opacity="0.22">
          <circle cx={node.x} cy={node.y} r="1.6" fill="#6b4f32" />
        </g>
      );
    }

    // Sizes & visual treatment per status
    const isCurrent = status === 'current';
    const isVisited = status === 'visited' || isCurrent;
    const r = isVisited ? 4.2 : 3.2;
    const interactable = status !== 'hidden';

    const labelFill = isVisited ? '#2a1505' : '#6a4b31';
    const labelOpacity = isVisited ? 1 : 0.85;
    const fillOpacity = status === 'discovered-locked' || status === 'discovered-unreachable' ? 0.5 : 0.95;

    const strokeColor =
      isCurrent                       ? '#f5a623' :
      status === 'discovered-ready'   ? '#f5e09a' :
      status === 'discovered-locked'  ? '#9a3a2a' :
      status === 'discovered-unreachable' ? '#7c5a3a' :
      '#2a1a0a';
    const strokeW = isCurrent ? 1.2 : 0.7;

    return (
      <g
        key={node.id}
        onClick={interactable ? () => onTap(node.id) : undefined}
        style={{ cursor: interactable ? 'pointer' : 'default' }}
      >
        {isCurrent && <PulseRing cx={node.x} cy={node.y} />}
        {status === 'discovered-ready' && !isTapped && <ReadyGlow cx={node.x} cy={node.y} />}
        {isTapped && !isCurrent && (
          <circle cx={node.x} cy={node.y} r={r + 2.2} fill="none" stroke="#f5e09a" strokeWidth="0.9" />
        )}
        {node.kind === 'boss' && status !== 'discovered-unreachable' && (
          <circle cx={node.x} cy={node.y} r={r + 1.0} fill="none" stroke="#cc2222" strokeWidth="0.6" opacity="0.8" />
        )}
        <circle
          cx={node.x}
          cy={node.y}
          r={r}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeW}
          opacity={fillOpacity}
        />
        {/* Icon inside the node */}
        <text
          x={node.x}
          y={node.y + 1.4}
          textAnchor="middle"
          fontSize={isVisited ? '4.2' : '3.4'}
          fontFamily="Arial, sans-serif"
          opacity={isVisited ? 1 : 0.75}
        >
          {node.icon}
        </text>
        {/* Lock badge for level-locked discovered nodes */}
        {status === 'discovered-locked' && (
          <g>
            <circle cx={node.x + r * 0.85} cy={node.y - r * 0.85} r="1.7" fill="#3a1a1a" stroke="#f5e09a" strokeWidth="0.3" />
            <text x={node.x + r * 0.85} y={node.y - r * 0.85 + 0.6} textAnchor="middle" fontSize="2" fill="#f5e09a" fontFamily="Arial, sans-serif" fontWeight="bold">L{node.level}</text>
          </g>
        )}
        <text
          x={node.x}
          y={node.y + r + 3.2}
          textAnchor="middle"
          fontSize="2.6"
          fill={labelFill}
          opacity={labelOpacity}
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
        >
          {node.name}
        </text>
      </g>
    );
  });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <radialGradient id="parchment" cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#e8c98a" />
          <stop offset="70%"  stopColor="#caa66a" />
          <stop offset="100%" stopColor="#a78346" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#parchment)" rx="4" />
      <rect x="1" y="1" width="98" height="98" fill="none" stroke="#7a5528" strokeWidth="0.5" rx="3.5" strokeDasharray="0.6 0.4" opacity="0.6" />
      {regionShapes}
      {regionLabels}
      <text x="50" y="6" textAnchor="middle" fontSize="3.4" fill="#5a3a20" fontFamily="Arial, sans-serif" opacity="0.6" fontStyle="italic" letterSpacing="0.4">
        Hearthlands & Beyond
      </text>
      {edgePaths}
      {nodeElements}
    </svg>
  );
}

// ─── Side panel ────────────────────────────────────────────────────────────

const labelStyle = { fontFamily: 'Arial, sans-serif', color: '#5a3a20' };

function StatusBadge({ status, target }) {
  let bg, fg, text;
  switch (status) {
    case 'current':
      bg = '#c8a868'; fg = '#3a2715'; text = '◉ You are here'; break;
    case 'visited':
      bg = '#9bbf68'; fg = '#1f3a10'; text = '✓ Visited — fast travel'; break;
    case 'discovered-ready':
      bg = '#e6c478'; fg = '#3a2715'; text = '★ Ready to explore'; break;
    case 'discovered-locked':
      bg = '#d4a585'; fg = '#5a2a1a'; text = `🔒 Requires Level ${target.level}`; break;
    case 'discovered-unreachable':
      bg = '#c8b890'; fg = '#5a3a20'; text = '↯ No path from here'; break;
    case 'hidden':
    default:
      bg = '#b89a72'; fg = '#3a2715'; text = '？ Unknown territory'; break;
  }
  return (
    <div
      className="rounded-lg px-2 py-1 text-center"
      style={{ background: bg, border: '1.5px solid #7c4f2c', ...labelStyle, fontSize: 10, color: fg, fontWeight: 'bold' }}
    >
      {text}
    </div>
  );
}

function ActionControl({ status, node, isCurrent, canFastTravel, canUnlock, onTravel, fullWidth }) {
  const w = fullWidth ? '100%' : undefined;
  const baseBox = {
    ...labelStyle, fontSize: 10, padding: '6px 8px', borderRadius: 10,
    textAlign: 'center', lineHeight: 1.25, width: w,
  };
  if (isCurrent) {
    return (
      <div style={{ ...baseBox, background: '#c8a868', border: '2px solid #a07840', color: '#3a2715', fontSize: 11, fontWeight: 'bold' }}>
        You are here
      </div>
    );
  }
  if (canFastTravel) {
    return (
      <button
        onClick={onTravel}
        style={{
          ...baseBox,
          background: 'linear-gradient(to bottom, #5a8acc, #3a6aa8)',
          border: '2px solid #2a4a78', color: 'white',
          fontWeight: 'bold', fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em',
        }}
      >
        ✈ FAST TRAVEL
      </button>
    );
  }
  if (canUnlock) {
    return (
      <button
        onClick={onTravel}
        style={{
          ...baseBox,
          background: 'linear-gradient(to bottom, #7a9f2a, #5a7a18)',
          border: '2px solid #4a6a10', color: 'white',
          fontWeight: 'bold', fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em',
        }}
      >
        ★ EXPLORE & UNLOCK
      </button>
    );
  }
  if (status === 'discovered-locked') {
    return (
      <div style={{ ...baseBox, background: '#d4b585', border: '2px solid #b08040', color: '#9a3a2a', fontWeight: 'bold' }}>
        Reach Level {node.level}
      </div>
    );
  }
  if (status === 'discovered-unreachable') {
    return (
      <div style={{ ...baseBox, background: '#d4b585', border: '2px solid #b08040', color: '#7c4f2c', fontSize: 9 }}>
        Travel through an adjacent location first
      </div>
    );
  }
  return (
    <div style={{ ...baseBox, background: '#d4b585', border: '2px solid #b08040', color: '#7c4f2c' }}>
      Not yet discovered
    </div>
  );
}

function SidePanel({ node, current, visited, discovered, playerLevel, dispatch, compact }) {
  if (!node) {
    return (
      <div
        className={
          compact
            ? "flex items-center justify-center h-full w-full px-3 py-1.5 gap-2"
            : "flex flex-col items-center justify-center h-full px-2 text-center gap-1.5"
        }
      >
        <div style={{ fontSize: compact ? 18 : 22, opacity: 0.6 }}>🗺️</div>
        <div className={compact ? "flex flex-col gap-0.5 min-w-0" : "contents"}>
          <p style={{ ...labelStyle, fontSize: 11, color: '#7c4f2c', textAlign: compact ? 'left' : 'center' }}>
            Tap any location to view details.
          </p>
          <p style={{ ...labelStyle, fontSize: 9, color: '#9a7a55', lineHeight: 1.3, textAlign: compact ? 'left' : 'center' }}>
            ✓ visited let you fast-travel · ★ glowing nodes are ready to unlock
          </p>
        </div>
      </div>
    );
  }

  const visitedSet    = new Set(visited);
  const discoveredSet = new Set(discovered);
  const status = getNodeStatus(node, visitedSet, discoveredSet, current, playerLevel);
  const color = NODE_COLORS[node.kind] || '#888';
  const isCurrent = status === 'current';
  const canFastTravel = status === 'visited';
  const canUnlock = status === 'discovered-ready';

  function handleTravel() {
    dispatch({ type: 'CARTO/TRAVEL', nodeId: node.id });
  }

  // ─── Compact (portrait) layout: a single horizontal row that keeps the
  // map huge underneath. Identity on left, body in the middle, action right.
  if (compact) {
    return (
      <div className="flex h-full w-full items-stretch gap-2 px-2 py-2 overflow-hidden">
        {/* Identity */}
        <div
          className="flex flex-col gap-1 flex-shrink-0 rounded-xl p-2"
          style={{ background: '#f0ddb5', border: '2px solid #b08040', minWidth: 110, maxWidth: 150 }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="grid place-items-center flex-shrink-0"
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: color,
                border: node.kind === 'boss' ? '2px solid #cc2222' : '2px solid #2a1a0a',
                fontSize: 12, lineHeight: 1,
              }}
            >
              {node.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ ...labelStyle, fontWeight: 'bold', fontSize: 11, color: '#3a2715', lineHeight: 1.15 }}>
                {node.name}
              </div>
              <div style={{ ...labelStyle, fontSize: 9, color: '#7c4f2c' }}>
                {KIND_LABELS[node.kind] || node.kind}
              </div>
            </div>
          </div>
          <StatusBadge status={status} target={node} playerLevel={playerLevel} />
        </div>

        {/* Body: description + activities */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-y-auto">
          <div style={{ ...labelStyle, fontSize: 10, color: '#3a2715', lineHeight: 1.3 }}>
            {node.description}
          </div>
          {Array.isArray(node.activities) && node.activities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.activities.map((a, i) => (
                <span
                  key={i}
                  style={{
                    ...labelStyle, fontSize: 9, color: '#3a2715',
                    background: '#e8d4a8', border: '1px solid #b08040',
                    borderRadius: 999, padding: '1px 6px',
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex flex-col justify-center flex-shrink-0" style={{ minWidth: 110 }}>
          <ActionControl
            status={status} node={node}
            isCurrent={isCurrent} canFastTravel={canFastTravel} canUnlock={canUnlock}
            onTravel={handleTravel} fullWidth
          />
        </div>
      </div>
    );
  }

  // ─── Vertical (landscape) layout: original side-rail design.
  return (
    <div className="flex flex-col gap-1.5 h-full px-2 py-2 overflow-y-auto">
      <div
        className="rounded-xl p-2 flex flex-col gap-1"
        style={{ background: '#f0ddb5', border: '2px solid #b08040' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="grid place-items-center flex-shrink-0 overflow-hidden"
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: color,
              border: node.kind === 'boss' ? '2px solid #cc2222' : '2px solid #2a1a0a',
              fontSize: 12, lineHeight: 1,
            }}
          >
            <NodeBadge nodeId={node.id} fallbackEmoji={node.icon} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ ...labelStyle, fontWeight: 'bold', fontSize: 11, color: '#3a2715', lineHeight: 1.15 }}>
              {node.name}
            </div>
            <div style={{ ...labelStyle, fontSize: 9, color: '#7c4f2c' }}>
              {KIND_LABELS[node.kind] || node.kind}
            </div>
          </div>
        </div>
        <StatusBadge status={status} target={node} playerLevel={playerLevel} />
      </div>

      <div style={{ ...labelStyle, fontSize: 10, color: '#3a2715', lineHeight: 1.35 }}>
        {node.description}
      </div>

      {Array.isArray(node.activities) && node.activities.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div style={{ ...labelStyle, fontSize: 9, color: '#7c4f2c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
            Activities
          </div>
          {node.activities.map((a, i) => (
            <div key={i} style={{ ...labelStyle, fontSize: 10, color: '#3a2715' }}>
              • {a}
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <ActionControl
          status={status} node={node}
          isCurrent={isCurrent} canFastTravel={canFastTravel} canUnlock={canUnlock}
          onTravel={handleTravel} fullWidth
        />
      </div>
    </div>
  );
}

// ─── Header & legend ───────────────────────────────────────────────────────

function HeaderBar({ currentNode, visitedCount, totalCount, onClose }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
      <span className="font-bold text-[14px] text-[#f8e7c6]">
        🗺️ Map
        {currentNode && (
          <span className="font-normal text-[11px] text-[#e2c19b]/70 ml-1.5">
            · {currentNode.icon} {currentNode.name}
          </span>
        )}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#e2c19b]/70">{visitedCount} / {totalCount} discovered</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { dot: '#bb3b2f', label: 'Visited',     stroke: '#2a1a0a' },
    { dot: '#bb3b2f', label: 'Ready',       stroke: '#f5e09a', glow: true },
    { dot: '#bb3b2f', label: 'Locked',      stroke: '#9a3a2a', muted: true },
  ];
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 flex-shrink-0"
      style={{ borderTop: '2px solid #b08040', background: '#e8d4a8' }}
    >
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-1">
          <span
            style={{
              width: 9, height: 9, borderRadius: '50%',
              background: it.dot, opacity: it.muted ? 0.5 : 1,
              border: `1.5px solid ${it.stroke}`,
              display: 'inline-block',
              boxShadow: it.glow ? '0 0 4px #f5e09a' : 'none',
            }}
          />
          <span style={{ ...labelStyle, fontSize: 9, color: '#5a3a20' }}>{it.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#5a3a20" strokeWidth="1.4" /></svg>
        <span style={{ ...labelStyle, fontSize: 9, color: '#5a3a20' }}>Road</span>
      </div>
      <div className="flex items-center gap-1">
        <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#c87a28" strokeWidth="1" strokeDasharray="3 2" /></svg>
        <span style={{ ...labelStyle, fontSize: 9, color: '#5a3a20' }}>Unlockable path</span>
      </div>
    </div>
  );
}

// ─── Top-level screen ──────────────────────────────────────────────────────

export default function CartographyScreen({ state, dispatch }) {
  const {
    mapCurrent    = 'home',
    mapVisited,
    mapDiscovered = ['home', 'meadow', 'orchard'],
    level         = 1,
  } = state;

  // Save migration: older saves don't have mapVisited. Treat the previously
  // discovered list as visited so the player keeps fast-travel access.
  const visited = mapVisited || mapDiscovered;

  const isPortrait = useIsPortrait();
  // The "tapped" zone (the one shown in the side panel) lives in viewParams.zone
  // so each zone has its own URL path (`#/cartography/<zoneId>`). A bad zone id
  // from a stale URL is silently ignored (no panel shown).
  const tappedFromUrl = state.viewParams?.zone ?? null;
  const tapped = tappedFromUrl && MAP_NODES.some(n => n.id === tappedFromUrl) ? tappedFromUrl : null;
  const tappedNode = tapped ? MAP_NODES.find(n => n.id === tapped) : null;
  const currentNode = MAP_NODES.find(n => n.id === mapCurrent);

  function handleTap(nodeId) {
    const next = nodeId === tapped ? null : nodeId;
    dispatch({ type: 'SET_VIEW_PARAMS', params: { zone: next } });
  }

  // In portrait the panel sits above the map (full width); in landscape it
  // sits to the right (fixed-width rail).
  const sidePanel = (
    <div
      className="flex-shrink-0 flex flex-col"
      style={
        isPortrait
          ? { width: '100%', minHeight: 96, maxHeight: 130, borderBottom: '2px solid #b08040' }
          : { width: 130, borderLeft: '2px solid #b08040' }
      }
    >
      <SidePanel
        node={tappedNode}
        current={mapCurrent}
        visited={visited}
        discovered={mapDiscovered}
        playerLevel={level}
        dispatch={dispatch}
        compact={isPortrait}
      />
    </div>
  );

  const mapArea = (
    <div className="flex-1 min-w-0 min-h-0 p-1">
      <MapSvg
        nodes={MAP_NODES}
        edges={MAP_EDGES}
        visited={visited}
        discovered={mapDiscovered}
        current={mapCurrent}
        tapped={tapped}
        playerLevel={level}
        onTap={handleTap}
      />
    </div>
  );

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <HeaderBar
        currentNode={currentNode}
        visitedCount={visited.length}
        totalCount={MAP_NODES.length}
        onClose={() => dispatch({ type: 'SET_VIEW', view: 'town' })}
      />

      <div
        className="flex-1 flex flex-col m-2 rounded-xl overflow-hidden"
        style={{ border: '2px solid #b08040', background: '#d4b585' }}
      >
        <div className={`flex-1 flex min-h-0 ${isPortrait ? 'flex-col' : 'flex-row'}`}>
          {isPortrait ? (
            <>
              {sidePanel}
              {mapArea}
            </>
          ) : (
            <>
              {mapArea}
              {sidePanel}
            </>
          )}
        </div>

        <Legend />
      </div>
    </div>
  );
}
