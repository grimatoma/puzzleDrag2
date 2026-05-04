import React from 'react';
import { GLYPHS } from './data.js';

export const modalKey = 'glyphs';

const TOTAL = GLYPHS.length;

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 600000) return 'this season';
  return 'earlier';
}

function GlyphCard({ glyph, count }) {
  const discovered = count > 0;
  return (
    <div
      style={{
        background: discovered ? '#fff8e8' : 'rgba(58,39,21,0.10)',
        border: `2px solid ${discovered ? glyph.color : '#c5a87a'}`,
        borderRadius: 12,
        padding: '8px 8px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minHeight: 80,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {discovered ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{glyph.icon}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#3a2715',
                lineHeight: 1.2,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {glyph.name}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                background: glyph.color,
                borderRadius: 8,
                padding: '1px 5px',
                lineHeight: 1.4,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ×{count}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#5a4a35',
              lineHeight: 1.35,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {glyph.desc}
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 4,
            opacity: 0.6,
          }}
        >
          <span style={{ fontSize: 20, filter: 'grayscale(1)', opacity: 0.35 }}>◈</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#9a8a72',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            ???
          </span>
          <span
            style={{
              fontSize: 9,
              color: '#b0a090',
              fontStyle: 'italic',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Discover by chaining.
          </span>
        </div>
      )}
    </div>
  );
}

function LogEntry({ entry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 0',
        borderBottom: '1px solid #e8dcc8',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{entry.glyphIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#3a2715',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {entry.glyphName}
        </span>
        {entry.resourceKey && (
          <span
            style={{
              fontSize: 11,
              color: '#7a5a3a',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {' '}during a {entry.resourceKey} chain
            {entry.chainAmt > 0 && ` (×${entry.chainAmt})`}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          color: '#9a8a72',
          whiteSpace: 'nowrap',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {relativeTime(entry.ts)}
      </span>
    </div>
  );
}

export default function GlyphsModal({ state, dispatch }) {
  const discovered = state.glyphsDiscovered || {};
  const log = state.glyphsLog || [];
  const discoveredCount = GLYPHS.filter(g => (discovered[g.id] || 0) > 0).length;
  const progressPct = Math.round((discoveredCount / TOTAL) * 100);

  function handleClose() {
    dispatch({ type: 'CLOSE_MODAL' });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,18,8,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: 8,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: '#f4ecd8',
          border: '4px solid #b28b62',
          borderRadius: 20,
          padding: 20,
          width: 'min(640px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#3a2715' }}>
            🔮 Tile Glyphs
          </span>
          <button
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#fff8e8',
              border: '2px solid #b28b62',
              color: '#6a4b31',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            ×
          </button>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 11,
            color: '#7a5a3a',
            marginBottom: 14,
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          Rare modifiers that touch your chains. Watch for them — they're not always kind.
        </p>

        {/* Glyph Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {GLYPHS.map(g => (
            <GlyphCard key={g.id} glyph={g} count={discovered[g.id] || 0} />
          ))}
        </div>

        {/* Recent Procs */}
        {log.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#7a5a3a',
                marginBottom: 6,
              }}
            >
              Recent Procs
            </div>
            <div
              style={{
                background: '#fff8e8',
                border: '1.5px solid #d8c8a8',
                borderRadius: 10,
                padding: '4px 10px',
                marginBottom: 14,
              }}
            >
              {log.map(entry => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </>
        )}

        {/* Stats Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#7a5a3a',
              whiteSpace: 'nowrap',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Discovered: {discoveredCount}/{TOTAL}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: '#e8d8b8',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: '#b28b62',
                borderRadius: 6,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              color: '#9a8a72',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {progressPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
