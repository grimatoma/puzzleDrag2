import React, { useState, useEffect } from 'react';
import { MAP_NODES, MAP_EDGES, NODE_COLORS } from './data.js';

export const viewKey = 'cartography';

const EDGES_SET = (() => {
  const s = new Set();
  for (const [a, b] of MAP_EDGES) { s.add(`${a}|${b}`); s.add(`${b}|${a}`); }
  return s;
})();

function isAdjacent(a, b) { return EDGES_SET.has(`${a}|${b}`); }

function kindLabel(kind) {
  switch (kind) {
    case 'home':     return 'Home';
    case 'farm':     return 'Farm Region';
    case 'mine':     return 'Mine Region';
    case 'festival': return 'Festival';
    case 'boss':     return 'Boss Arena';
    case 'event':    return 'Event';
    default:         return kind;
  }
}

function PulseRing({ cx, cy }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    let rising = true;
    const id = setInterval(() => {
      setScale(s => {
        const next = rising ? s + 0.06 : s - 0.06;
        if (next >= 1.5) rising = false;
        if (next <= 1.0) rising = true;
        return next;
      });
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5 * scale}
      fill="none"
      stroke="#f5a623"
      strokeWidth="0.8"
      opacity={1.5 - scale * 0.4}
    />
  );
}

function MapSvg({ nodes, edges, discovered, current, tapped, playerLevel, onTap }) {
  const discoveredSet = new Set(discovered);

  const edgePaths = edges.map(([a, b], i) => {
    const na = nodes.find(n => n.id === a);
    const nb = nodes.find(n => n.id === b);
    if (!na || !nb) return null;
    const bothKnown = discoveredSet.has(a) && discoveredSet.has(b);
    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2 + (i % 2 === 0 ? -5 : 5);
    return (
      <path
        key={`${a}-${b}`}
        d={`M ${na.x} ${na.y} Q ${mx} ${my} ${nb.x} ${nb.y}`}
        fill="none"
        stroke={bothKnown ? '#5a3a20' : '#8a6a50'}
        strokeWidth="0.6"
        strokeDasharray="1.5 1"
        opacity={bothKnown ? 0.9 : 0.35}
      />
    );
  });

  const nodeElements = nodes.map(node => {
    const isDiscovered = discoveredSet.has(node.id);
    const isCurrent   = node.id === current;
    const isTapped    = node.id === tapped;
    const color       = NODE_COLORS[node.kind] || '#888';
    const r           = isDiscovered ? 4 : 2.5;
    const canTravel   = isAdjacent(current, node.id) && node.id !== current && node.level <= playerLevel;

    if (!isDiscovered) {
      return (
        <g key={node.id} onClick={() => onTap(node.id)} style={{ cursor: 'pointer' }}>
          <circle cx={node.x} cy={node.y} r={r} fill="#6b4f32" opacity={0.35} />
          <text
            x={node.x}
            y={node.y + 0.8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="2.8"
            fill="#9a7a55"
            opacity={0.5}
            fontFamily="Arial, sans-serif"
          >?</text>
        </g>
      );
    }

    return (
      <g key={node.id} onClick={() => onTap(node.id)} style={{ cursor: 'pointer' }}>
        {isCurrent && <PulseRing cx={node.x} cy={node.y} />}
        {isTapped && !isCurrent && (
          <circle cx={node.x} cy={node.y} r={r + 1.8} fill="none" stroke="#f5e09a" strokeWidth="0.8" />
        )}
        {node.kind === 'boss' && (
          <circle cx={node.x} cy={node.y} r={r + 0.8} fill="none" stroke="#cc2222" strokeWidth="0.7" />
        )}
        <circle
          cx={node.x}
          cy={node.y}
          r={r}
          fill={color}
          stroke={isCurrent ? '#f5a623' : canTravel ? '#f5e09a' : '#2a1a0a'}
          strokeWidth={isCurrent ? 1 : 0.6}
          opacity={0.95}
        />
        <text
          x={node.x}
          y={node.y + r + 2.8}
          textAnchor="middle"
          fontSize="3"
          fill="#2a1505"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
        >
          {node.name.split(' ').slice(0, 2).join(' ')}
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
      <rect x="0" y="0" width="100" height="100" fill="#c9a96e" rx="4" />
      <rect x="1" y="1" width="98" height="98" fill="none" stroke="#8a6030" strokeWidth="0.4" rx="3.5" />
      <text x="50" y="5.5" textAnchor="middle" fontSize="3" fill="#7a5528" fontFamily="Arial, sans-serif" opacity="0.5">
        Hearthlands
      </text>
      {edgePaths}
      {nodeElements}
    </svg>
  );
}

function SidePanel({ node, current, playerLevel, dispatch }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2 text-center">
        <p style={{ color: '#7c4f2c', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
          Tap a node to explore
        </p>
      </div>
    );
  }

  const isCurrent   = node.id === current;
  const isAdjacent_ = isAdjacent(current, node.id);
  const levelOk     = node.level <= playerLevel;
  const canTravel   = !isCurrent && isAdjacent_ && levelOk;

  const color = NODE_COLORS[node.kind] || '#888';

  function handleTravel() {
    dispatch({ type: 'CARTO/TRAVEL', nodeId: node.id });
  }

  return (
    <div className="flex flex-col gap-2 h-full px-2 py-2">
      <div
        className="rounded-xl p-2 flex flex-col gap-1"
        style={{ background: '#f0ddb5', border: '2px solid #b08040' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: color, flexShrink: 0,
              border: node.kind === 'boss' ? '1.5px solid #cc2222' : '1.5px solid #2a1a0a',
            }}
          />
          <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: 12, color: '#3a2715', lineHeight: 1.2 }}>
            {node.name}
          </span>
        </div>
        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#7c4f2c' }}>
          {kindLabel(node.kind)}
        </span>
        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#5a3a20' }}>
          Req. level {node.level}
        </span>
      </div>

      {isCurrent ? (
        <div
          className="rounded-lg px-2 py-1.5 text-center"
          style={{ background: '#c8a868', border: '1.5px solid #a07840', fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#3a2715', fontWeight: 'bold' }}
        >
          You are here
        </div>
      ) : !isAdjacent_ ? (
        <div
          className="rounded-lg px-2 py-1.5 text-center"
          style={{ background: '#d4b585', border: '1.5px solid #b08040', fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#9a6a3a' }}
        >
          Not reachable
        </div>
      ) : !levelOk ? (
        <div
          className="rounded-lg px-2 py-1.5 text-center"
          style={{ background: '#d4b585', border: '1.5px solid #b08040', fontFamily: 'Arial, sans-serif', fontSize: 10, color: '#9a3a2a' }}
        >
          Level {node.level} required
        </div>
      ) : (
        <button
          onClick={handleTravel}
          style={{
            background: 'linear-gradient(to bottom, #7a9f2a, #5a7a18)',
            border: '2px solid #4a6a10',
            borderRadius: 10,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: 12,
            padding: '6px 4px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          TRAVEL
        </button>
      )}
    </div>
  );
}

export default function CartographyScreen({ state, dispatch }) {
  const {
    mapCurrent    = 'home',
    mapDiscovered = ['home', 'meadow', 'orchard'],
    level         = 1,
  } = state;

  const [tapped, setTapped] = useState(null);

  const tappedNode = tapped ? MAP_NODES.find(n => n.id === tapped) : null;

  function handleTap(nodeId) {
    setTapped(prev => (prev === nodeId ? null : nodeId));
  }

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'linear-gradient(to bottom, #5b3b20, #3a2715)' }}
    >
      <div
        className="flex-1 flex flex-col m-2 rounded-2xl overflow-hidden"
        style={{ border: '6px solid #7c4f2c', background: '#d4b585' }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
          style={{ borderBottom: '2px solid #b08040' }}
        >
          <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: 14, color: '#3a2715' }}>
            Map
          </span>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', view: 'town' })}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#f6efe0', border: '2px solid #b28b62',
              color: '#6a4b31', fontWeight: 'bold', fontSize: 14,
              cursor: 'pointer', display: 'grid', placeItems: 'center',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 p-1">
            <MapSvg
              nodes={MAP_NODES}
              edges={MAP_EDGES}
              discovered={mapDiscovered}
              current={mapCurrent}
              tapped={tapped}
              playerLevel={level}
              onTap={handleTap}
            />
          </div>

          <div
            className="flex-shrink-0 flex flex-col"
            style={{ width: 110, borderLeft: '2px solid #b08040' }}
          >
            <SidePanel
              node={tappedNode}
              current={mapCurrent}
              playerLevel={level}
              dispatch={dispatch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
