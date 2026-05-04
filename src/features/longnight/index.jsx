import React, { useEffect, useRef } from 'react';
import { LONGNIGHT_WAVES, RESOURCE_COLORS } from './data.js';

export const modalKey = 'longnight';

const FF = 'Arial, sans-serif';

function TimerPill({ timeLeft, totalTime }) {
  const urgent = timeLeft < 10;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const label = `${mins}:${String(secs).padStart(2, '0')}`;
  const pct = totalTime > 0 ? Math.max(0, (timeLeft / totalTime) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div
        style={{
          fontFamily: FF,
          fontSize: 22,
          fontWeight: 'bold',
          color: urgent ? '#ff4040' : '#ffffff',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 10,
          padding: '2px 10px',
          letterSpacing: '0.05em',
          transition: 'color 0.3s',
        }}
      >
        {label}
      </div>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: urgent ? '#ff4040' : '#5a9aef',
            width: `${pct}%`,
            transition: 'width 0.9s linear, background 0.3s',
          }}
        />
      </div>
    </div>
  );
}

function CostChip({ resKey, amount, inventory }) {
  const have = (inventory[resKey] || 0) >= amount;
  const color = RESOURCE_COLORS[resKey] || '#ccc';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(0,0,0,0.35)',
        border: `1.5px solid ${have ? '#4caf50' : '#cf4444'}`,
        borderRadius: 8,
        padding: '3px 9px',
        fontFamily: FF,
        fontSize: 12,
        color: '#fff',
      }}
    >
      <span style={{ color, fontWeight: 'bold' }}>{resKey}</span>
      <span style={{ color: '#aaa' }}>×</span>
      <span style={{ fontWeight: 'bold' }}>{amount}</span>
      <span style={{ fontSize: 13 }}>{have ? '✓' : '✗'}</span>
    </div>
  );
}

function WaveHeld({ onNext }) {
  useEffect(() => {
    const t = setTimeout(onNext, 1000);
    return () => clearTimeout(t);
  }, [onNext]);
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: FF }}>
      <div style={{ fontSize: 36 }}>✓</div>
      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#7effa8', marginTop: 6 }}>Wave Held</div>
    </div>
  );
}

export default function LongNightModal({ state, dispatch }) {
  const ln = state.longnight || {};
  const { active, wave, timeLeft, won, lost, lostBuilding } = ln;
  const intervalRef = useRef(null);
  const waveHeldRef = useRef(false);

  // Drive the countdown tick
  useEffect(() => {
    if (!active || won || lost) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      dispatch({ type: 'LONGNIGHT/TICK' });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active, won, lost, wave]);

  // Trigger pending Long Night on mount if pending
  useEffect(() => {
    if (ln.pending && !ln.active && !ln.won && !ln.lost) {
      dispatch({ type: 'LONGNIGHT/START' });
    }
  }, []);

  if (!ln) return null;

  const waveData = LONGNIGHT_WAVES[(wave || 1) - 1];
  const totalWaves = LONGNIGHT_WAVES.length;
  const inventory = state.inventory || {};
  const affordable = waveData ? Object.entries(waveData.cost).every(([k, v]) => (inventory[k] || 0) >= v) : false;

  const cardStyle = {
    background: 'linear-gradient(to bottom, #0a0a14, #1a1428)',
    border: '4px solid #5a4a8a',
    borderRadius: 20,
    padding: 20,
    width: 'min(560px, 94vw)',
    maxHeight: '88vh',
    overflowY: 'auto',
    boxShadow: '0 0 40px rgba(90,74,138,0.4)',
    color: '#fff',
    fontFamily: FF,
    animation: 'lnPulse 3s ease-in-out infinite',
  };

  if (won) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
        <style>{`@keyframes lnPulse { 0%,100%{box-shadow:0 0 40px rgba(90,74,138,0.4)} 50%{box-shadow:0 0 60px rgba(90,74,138,0.7)} }`}</style>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
            <div style={{ fontSize: 48 }}>🌅</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f8e7c6', marginTop: 8 }}>Dawn arrives.</div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 6 }}>The hearth held through the Long Night.</div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#ffd34c', fontWeight: 'bold' }}>+200◉ &nbsp; +1 heirloom</div>
          </div>
          <button
            onClick={() => dispatch({ type: 'LONGNIGHT/CLOSE' })}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, border: '2px solid #a07a40',
              background: 'linear-gradient(to bottom, #c8923a, #8a5a1a)',
              color: '#fff', fontFamily: FF, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            Welcome the morning
          </button>
        </div>
      </div>
    );
  }

  if (lost) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
        <style>{`@keyframes lnPulse { 0%,100%{box-shadow:0 0 40px rgba(90,74,138,0.4)} 50%{box-shadow:0 0 60px rgba(90,74,138,0.7)} }`}</style>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
            <div style={{ fontSize: 48 }}>🌑</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#cf6666', marginTop: 8 }}>
              {lostBuilding ? `The dark took the ${lostBuilding}.` : 'The night was too long...'}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 6, fontStyle: 'italic' }}>
              {lostBuilding ? 'A building crumbled before dawn.' : 'The hearth grew cold.'}
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'LONGNIGHT/CLOSE' })}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, border: '2px solid #6a4a4a',
              background: 'linear-gradient(to bottom, #8a3a3a, #4a1a1a)',
              color: '#fff', fontFamily: FF, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            Rebuild
          </button>
        </div>
      </div>
    );
  }

  if (!active || !waveData) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)' }}>
      <style>{`@keyframes lnPulse { 0%,100%{box-shadow:0 0 40px rgba(90,74,138,0.4)} 50%{box-shadow:0 0 60px rgba(90,74,138,0.7)} }`}</style>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 2 }}>🌑 {waveData.name}</div>
          <div style={{ fontSize: 12, color: '#9a9ab8', fontStyle: 'italic' }}>{waveData.threat}</div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: FF, fontSize: 18, fontWeight: 'bold', color: '#d0c8f0' }}>
            Wave {wave} / {totalWaves}
          </div>
          <TimerPill timeLeft={timeLeft} totalTime={waveData.time} />
        </div>

        {/* Threat illustration */}
        <div style={{ textAlign: 'center', fontSize: 22, letterSpacing: 4, margin: '8px 0 14px', color: '#a898d8' }}>
          🌲🌲🌑🌲🌲
        </div>

        {/* Cost row */}
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(90,74,138,0.5)',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 11, color: '#9a9ab8', marginBottom: 8, fontFamily: FF }}>Burn to hold the dark:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(waveData.cost).map(([k, v]) => (
              <CostChip key={k} resKey={k} amount={v} inventory={inventory} />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            disabled={!affordable}
            onClick={() => { if (affordable) dispatch({ type: 'LONGNIGHT/PAY', wave }); }}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              border: affordable ? '2px solid #e86a30' : '2px solid #5a3a2a',
              background: affordable
                ? 'linear-gradient(to bottom, #c8602a, #a84a1a)'
                : 'rgba(80,40,20,0.5)',
              color: affordable ? '#fff' : '#888',
              fontFamily: FF, fontSize: 14, fontWeight: 'bold', cursor: affordable ? 'pointer' : 'not-allowed',
              letterSpacing: '0.05em',
              transition: 'opacity 0.2s',
            }}
          >
            🔥 BURN
          </button>
          <button
            onClick={() => dispatch({ type: 'LONGNIGHT/FAIL' })}
            style={{
              padding: '11px 16px', borderRadius: 12,
              border: '2px solid #5a5a6a',
              background: 'rgba(30,30,50,0.8)',
              color: '#9a9ab8', fontFamily: FF, fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            🏃 FLEE
          </button>
        </div>
      </div>
    </div>
  );
}
