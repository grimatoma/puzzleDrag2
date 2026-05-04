import React, { useState } from 'react';
import { NPCS, BIOMES } from '../../constants.js';
import { NPC_FAVORITES, MOOD_STATES, moodForBond } from './data.js';

export const modalKey = 'mood';

// ── helpers ────────────────────────────────────────────────────────────────

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function hexColor(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

function resourceColor(key) {
  const r = ALL_RESOURCES.find((x) => x.key === key);
  return r ? hexColor(r.color) : '#888';
}

/** Render 10 hearts split at bond value (float). */
function HeartsRow({ bond }) {
  const filled = Math.round(bond); // round half-hearts to nearest whole
  return (
    <span className="inline-flex gap-[2px] flex-wrap" style={{ fontSize: 12 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ color: i < filled ? '#bb3b2f' : '#9a8a72' }}>
          {i < filled ? '❤️' : '🤍'}
        </span>
      ))}
    </span>
  );
}

// ── GiftPicker ─────────────────────────────────────────────────────────────

function GiftPicker({ npcKey, inventory, dispatch, onClose }) {
  const fav = NPC_FAVORITES[npcKey] || {};
  const items = ALL_RESOURCES.filter((r) => (inventory[r.key] || 0) > 0);

  if (items.length === 0) {
    return (
      <div className="mt-1 text-[10px] text-[#9a8a72] italic">
        No items in inventory to gift.
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1 pb-1">
      {items.map((r) => {
        const isFav = r.key === fav.favorite;
        const isDislike = r.key === fav.dislike;
        return (
          <button
            key={r.key}
            onClick={() => {
              dispatch({ type: 'MOOD/GIFT', npc: npcKey, resource: r.key });
              onClose();
            }}
            title={isFav ? 'Favorite!' : isDislike ? 'Dislikes this' : ''}
            style={{
              backgroundColor: hexColor(r.color),
              border: isFav
                ? '2px solid #d4a017'
                : isDislike
                ? '2px solid #bb3b2f'
                : '2px solid rgba(255,255,255,0.25)',
              color: '#fff',
              borderRadius: 8,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700,
              position: 'relative',
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {r.glyph} {r.label} ×{inventory[r.key]}
            {isFav && (
              <span
                style={{
                  position: 'absolute',
                  top: -7,
                  right: -5,
                  fontSize: 9,
                  background: '#d4a017',
                  borderRadius: '50%',
                  padding: '0 2px',
                  lineHeight: '14px',
                }}
              >
                ★
              </span>
            )}
            {isDislike && (
              <span
                style={{
                  position: 'absolute',
                  top: -7,
                  right: -5,
                  fontSize: 9,
                  background: '#bb3b2f',
                  borderRadius: '50%',
                  padding: '0 2px',
                  lineHeight: '14px',
                }}
              >
                ✕
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── NpcCard ─────────────────────────────────────────────────────────────────

function NpcCard({ npcKey, npcData, bond, inventory, dispatch }) {
  const [giftOpen, setGiftOpen] = useState(false);
  const mood = moodForBond(bond);

  return (
    <div
      className="bg-[#faf3e4] border-2 border-[#c5a87a] rounded-2xl p-3 flex flex-col gap-1"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Top row: avatar + info + gift button */}
      <div className="flex items-center gap-2">
        {/* Avatar circle */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: npcData.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.4)',
          }}
        >
          {npcData.name[0]}
        </div>

        {/* Name / role / mood */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[13px] text-[#3a2715]">{npcData.name}</span>
            <span className="text-[10px] text-[#7a6248]">{npcData.role}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: mood.color }}
            >
              {mood.icon} {mood.name}
            </span>
          </div>
          <HeartsRow bond={bond} />
        </div>

        {/* Modifier + gift button */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="text-[10px] font-bold"
            style={{ color: mood.color }}
          >
            Orders: ×{mood.modifier.toFixed(2)}
          </span>
          <button
            onClick={() => setGiftOpen((o) => !o)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg border-2 border-[#c5a87a] bg-[#f4ecd8] text-[#6a4b31] hover:bg-[#e8d9bc] transition-colors"
          >
            🎁 Gift
          </button>
        </div>
      </div>

      {/* Inline gift picker */}
      {giftOpen && (
        <GiftPicker
          npcKey={npcKey}
          inventory={inventory}
          dispatch={dispatch}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

export function MoodPanel({ state, dispatch, showHeader = true, onClose = null }) {
  const { npcBond = {}, inventory = {} } = state;

  return (
    <div className="bg-[#f4ecd8] rounded-[20px] p-5 w-full max-h-[88vh] overflow-y-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-[16px] text-[#3a2715]">💞 Townsfolk</span>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#e8d9bc] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]">×</button>
          )}
        </div>
      )}

        {/* Sub-heading */}
        <p className="text-[11px] text-[#7a6248] mb-3">
          Higher hearts = better order rewards. Gifts and deliveries grow your bond.
        </p>

        {/* NPC list */}
        <div className="flex flex-col gap-2">
          {Object.keys(NPCS).map((key) => (
            <NpcCard
              key={key}
              npcKey={key}
              npcData={NPCS[key]}
              bond={npcBond[key] ?? 1}
              inventory={inventory}
              dispatch={dispatch}
            />
          ))}
        </div>
    </div>
  );
}

export default function MoodModal({ state, dispatch }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] p-0 w-[min(640px,94vw)] max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <MoodPanel state={state} dispatch={dispatch} showHeader onClose={() => dispatch({ type: 'CLOSE_MODAL' })} />
      </div>
    </div>
  );
}
