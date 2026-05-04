import React, { useMemo } from 'react';
import { PERKS, PERK_MAP, BRANCH_ORDER, BRANCH_LABELS, BRANCH_ICONS } from './data.js';
import { calcMemoriesGained } from './slice.js';

export const modalKey = 'memoryweave';

// ── Shimmer keyframe (injected once) ────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes mw-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes mw-glow {
  0%, 100% { box-shadow: 0 0 16px rgba(168,144,240,0.5), 0 0 40px rgba(168,144,240,0.2); }
  50%       { box-shadow: 0 0 28px rgba(168,144,240,0.9), 0 0 60px rgba(168,144,240,0.4); }
}
`;

let shimmerInjected = false;
function ensureShimmer() {
  if (shimmerInjected) return;
  shimmerInjected = true;
  const style = document.createElement('style');
  style.textContent = SHIMMER_CSS;
  document.head.appendChild(style);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function prereqMet(perk, memoryPerks) {
  if (!perk.prereq) return true;
  if (Array.isArray(perk.prereq)) return perk.prereq.some(id => memoryPerks.includes(id));
  return memoryPerks.includes(perk.prereq);
}

function prereqLabel(perk) {
  if (!perk.prereq) return null;
  if (Array.isArray(perk.prereq)) {
    return perk.prereq.map(id => PERK_MAP[id]?.name ?? id).join(' or ');
  }
  return PERK_MAP[perk.prereq]?.name ?? perk.prereq;
}

// ── PerkCard ─────────────────────────────────────────────────────────────────
function PerkCard({ perk, memoryPerks, memories, dispatch }) {
  const purchased = memoryPerks.includes(perk.id);
  const metPrereq  = prereqMet(perk, memoryPerks);
  const affordable = memories >= perk.cost;
  const canUnlock  = !purchased && metPrereq && affordable;

  const border = purchased
    ? '2px solid #6ee7b7'  // green
    : metPrereq
      ? '2px solid #a890f0' // purple
      : '2px solid #4a3860'; // locked dark

  const bg = purchased
    ? 'rgba(110,231,183,0.12)'
    : metPrereq
      ? 'rgba(168,144,240,0.10)'
      : 'rgba(30,15,50,0.6)';

  return (
    <div
      onClick={() => canUnlock && dispatch({ type: 'MW/UNLOCK', id: perk.id })}
      style={{
        background: bg,
        border,
        borderRadius: 12,
        padding: '8px 8px 6px',
        position: 'relative',
        cursor: canUnlock ? 'pointer' : 'default',
        opacity: (!metPrereq && !purchased) ? 0.65 : 1,
        transition: 'opacity 0.2s, border-color 0.2s',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Cost chip */}
      <div style={{
        position: 'absolute',
        top: 6,
        right: 6,
        fontSize: 10,
        fontWeight: 700,
        color: purchased ? '#6ee7b7' : affordable ? '#c4b0ff' : '#a080d0',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 8,
        padding: '1px 5px',
        lineHeight: 1.4,
      }}>
        {perk.cost} 🪡
      </div>

      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, paddingRight: 36 }}>
        {purchased ? (
          <span style={{ fontSize: 13, color: '#6ee7b7' }}>✓</span>
        ) : !metPrereq ? (
          <span style={{ fontSize: 12, opacity: 0.5 }}>🔒</span>
        ) : null}
        <span style={{ fontSize: 12, fontWeight: 700, color: purchased ? '#c4ffea' : '#f0e8ff', lineHeight: 1.2 }}>
          {perk.name}
        </span>
      </div>

      {/* Desc */}
      <div style={{ fontSize: 10, color: '#b0a0cc', lineHeight: 1.35, marginBottom: 2 }}>
        {perk.desc}
      </div>

      {/* Prereq hint */}
      {!metPrereq && (
        <div style={{ fontSize: 9, color: '#806898', fontStyle: 'italic', marginTop: 2 }}>
          Requires: {prereqLabel(perk)}
        </div>
      )}

      {/* Tap hint */}
      {canUnlock && (
        <div style={{ fontSize: 9, color: '#a890f0', marginTop: 2, fontWeight: 700 }}>
          Tap to unlock
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function MemoryweaveModal({ state, dispatch }) {
  ensureShimmer();

  const memories     = state.memories      ?? 0;
  const memoryPerks  = state.memoryPerks   ?? [];
  const lifetimeRuns = state.lifetimeRuns  ?? 0;
  const level        = state.level         ?? 1;
  const seasonsCycled = state.seasonsCycled ?? 0;

  const estimatedGain = useMemo(() => calcMemoriesGained(state), [memories, level, seasonsCycled, state.coins]);

  const eligible = level >= 10 || seasonsCycled >= 12;

  // Group perks by branch
  const byBranch = useMemo(() => {
    const map = {};
    for (const b of BRANCH_ORDER) map[b] = [];
    for (const p of PERKS) {
      if (p.branch !== 'any') map[p.branch]?.push(p);
    }
    return map;
  }, []);

  const anyPerks = PERKS.filter(p => p.branch === 'any');

  function handleClose() {
    dispatch({ type: 'CLOSE_MODAL' });
  }

  function handlePrestige() {
    if (!eligible) return;
    dispatch({ type: 'MW/PRESTIGE' });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,4,20,0.80)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 600,
        padding: '8px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          background: 'linear-gradient(to bottom, #3a2750, #1a0d28)',
          border: '4px solid #a890f0',
          borderRadius: 20,
          padding: 20,
          width: 'min(640px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          boxShadow: '0 0 40px rgba(168,144,240,0.4)',
          color: '#fff',
          animation: 'mw-glow 3s ease-in-out infinite',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#e8d8ff', letterSpacing: 0.5 }}>
            🪡 Memoryweave
          </span>
          <button
            onClick={handleClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(168,144,240,0.15)',
              border: '2px solid #a890f0',
              color: '#c4b0ff',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            ×
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Memories', value: `${memories} 🪡` },
            { label: 'Lifetime Runs', value: lifetimeRuns },
            { label: 'Eligibility', value: eligible ? '✓ Ready' : `Lv ${level}/10` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'rgba(168,144,240,0.12)',
                border: '1.5px solid rgba(168,144,240,0.35)',
                borderRadius: 10,
                padding: '8px 6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, color: '#9080b0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d0ff' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* PRESTIGE button */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handlePrestige}
            disabled={!eligible}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 12,
              border: 'none',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              cursor: eligible ? 'pointer' : 'not-allowed',
              color: '#1a0d28',
              background: eligible
                ? 'linear-gradient(90deg, #a890f0 0%, #d4b8ff 40%, #a890f0 60%, #c4a0ff 100%)'
                : 'rgba(100,80,140,0.4)',
              backgroundSize: eligible ? '200% auto' : undefined,
              animation: eligible ? 'mw-shimmer 2.5s linear infinite' : undefined,
              opacity: eligible ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}
          >
            Weave This Run into Memory
          </button>
          <div style={{ fontSize: 10, color: '#9080b0', textAlign: 'center', marginTop: 5 }}>
            {eligible
              ? `+${estimatedGain} memories estimated`
              : `Reach level 10 or cycle 12 seasons to prestige`}
          </div>
        </div>

        {/* Perk tree — 3 branch columns */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#b090d8', marginBottom: 8, letterSpacing: 0.4 }}>
          ANCESTRAL PERKS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
          {BRANCH_ORDER.map(branch => (
            <div key={branch}>
              {/* Branch header */}
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#c4b0ff',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 6,
                textAlign: 'center',
              }}>
                {BRANCH_ICONS[branch]} {BRANCH_LABELS[branch]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {byBranch[branch].map(perk => (
                  <PerkCard
                    key={perk.id}
                    perk={perk}
                    memoryPerks={memoryPerks}
                    memories={memories}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Any-branch perks (full width) */}
        {anyPerks.length > 0 && (
          <>
            <div style={{
              fontSize: 9,
              color: '#806898',
              textAlign: 'center',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              — Legendary Perks —
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {anyPerks.map(perk => (
                <PerkCard
                  key={perk.id}
                  perk={perk}
                  memoryPerks={memoryPerks}
                  memories={memories}
                  dispatch={dispatch}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ fontSize: 10, color: '#705888', fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
          Memory perks persist across all future runs.
        </div>
      </div>
    </div>
  );
}
