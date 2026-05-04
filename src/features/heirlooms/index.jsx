import React, { useState } from 'react';
import { HEIRLOOMS } from './data.js';

export const modalKey = 'heirlooms';

const RARITY_COLOR = {
  common: '#9a8a72',
  rare: '#5a7a9a',
  legendary: '#c8923a',
};

const RARITY_LABEL = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary',
};

function SlotCard({ index, heirloom, onUnequip }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl border-[3px] flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors"
      style={{
        background: heirloom ? '#fff8e8' : '#ede4d0',
        borderColor: heirloom ? RARITY_COLOR[heirloom.rarity] : '#c5a87a',
        minHeight: 80,
        padding: '8px 4px',
      }}
      onClick={() => heirloom && onUnequip(index)}
      title={heirloom ? 'Tap to unequip' : 'Empty slot'}
    >
      {heirloom ? (
        <>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{heirloom.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3a2715', textAlign: 'center', lineHeight: 1.2 }}>
            {heirloom.name}
          </span>
          <span style={{ fontSize: 9, color: RARITY_COLOR[heirloom.rarity], fontWeight: 700 }}>
            {RARITY_LABEL[heirloom.rarity]}
          </span>
          <span style={{ fontSize: 9, color: '#8a785e', marginTop: 2 }}>tap to remove</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 20, opacity: 0.35 }}>◻</span>
          <span style={{ fontSize: 11, color: '#9a8a72', fontStyle: 'italic' }}>Empty Slot</span>
        </>
      )}
    </div>
  );
}

function HeirloomCard({ heirloom, equippedSlot, owned, onEquip }) {
  const [pickingSlot, setPickingSlot] = useState(false);
  const isEquipped = equippedSlot !== -1;

  if (!owned) {
    return (
      <div
        className="rounded-xl border-2 flex flex-col items-center justify-center gap-1 select-none"
        style={{
          background: '#e8e0d0',
          borderColor: '#b8a888',
          padding: '10px 8px',
          minHeight: 90,
          filter: 'grayscale(0.6)',
          opacity: 0.65,
        }}
      >
        <span style={{ fontSize: 22, filter: 'grayscale(1)', opacity: 0.4 }}>🔒</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#9a8a72' }}>???</span>
        <span style={{ fontSize: 9, color: '#b0a090', fontStyle: 'italic' }}>locked</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border-2 flex flex-col gap-1 transition-colors"
      style={{
        background: pickingSlot ? '#fff' : '#fff8e8',
        borderColor: RARITY_COLOR[heirloom.rarity],
        borderWidth: heirloom.rarity === 'legendary' ? 3 : 2,
        padding: '8px 8px 6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{heirloom.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3a2715', lineHeight: 1.2 }}>{heirloom.name}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: RARITY_COLOR[heirloom.rarity] }}>
            {RARITY_LABEL[heirloom.rarity]}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#5a4a35', lineHeight: 1.35 }}>{heirloom.desc}</div>

      {isEquipped ? (
        <div
          style={{
            marginTop: 2,
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            background: RARITY_COLOR[heirloom.rarity],
            borderRadius: 6,
            padding: '2px 6px',
            textAlign: 'center',
            alignSelf: 'flex-start',
          }}
        >
          Equipped (slot {equippedSlot + 1})
        </div>
      ) : pickingSlot ? (
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          {[0, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => { onEquip(heirloom.id, s); setPickingSlot(false); }}
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 0',
                borderRadius: 6,
                border: '1.5px solid #c5a87a',
                background: '#f4ecd8',
                color: '#5a4028',
                cursor: 'pointer',
              }}
            >
              Slot {s + 1}
            </button>
          ))}
          <button
            onClick={() => setPickingSlot(false)}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 6px',
              borderRadius: 6,
              border: '1.5px solid #c5a87a',
              background: '#e8dcc8',
              color: '#8a6040',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPickingSlot(true)}
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            border: '2px solid #b28b62',
            background: '#91bf24',
            color: '#fff',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Equip
        </button>
      )}
    </div>
  );
}

export default function HeirloomsModal({ state, dispatch }) {
  const owned = state.heirloomsOwned || ['oldcoin', 'seedring'];
  const slots = state.heirloomSlots || [null, null, null];

  const slotHeirlooms = slots.map(id => (id ? HEIRLOOMS.find(h => h.id === id) || null : null));

  function getEquippedSlot(id) {
    return slots.indexOf(id);
  }

  function handleEquip(id, slot) {
    dispatch({ type: 'HEIRLOOMS/EQUIP', id, slot });
  }

  function handleUnequip(slot) {
    dispatch({ type: 'HEIRLOOMS/UNEQUIP', slot });
  }

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
        padding: '8px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#3a2715' }}>✨ Heirlooms</span>
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

        <p style={{ fontSize: 11, color: '#7a5a3a', marginBottom: 12, marginTop: 2 }}>
          Equip up to 3 cards. Effects last all run.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {slotHeirlooms.map((h, i) => (
            <SlotCard key={i} index={i} heirloom={h} onUnequip={handleUnequip} />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#7a5a3a', marginBottom: 8 }}>
          Collection ({owned.length} / {HEIRLOOMS.length})
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {HEIRLOOMS.map(h => (
            <HeirloomCard
              key={h.id}
              heirloom={h}
              equippedSlot={getEquippedSlot(h.id)}
              owned={owned.includes(h.id)}
              onEquip={handleEquip}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
