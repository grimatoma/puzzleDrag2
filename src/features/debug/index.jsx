import { useState } from "react";
import { BIOMES } from "../../constants.js";

export const modalKey = "debug";

function DebugBtn({ children, onClick, color = 'slate' }) {
  const palettes = {
    mine_gold:   { background: '#7a6a10', borderColor: '#4a4008' },
    green:  { background: '#2a7a3a', borderColor: '#1a4a20' },
    blue:   { background: '#3a5a8a', borderColor: '#1a2e5a' },
    purple: { background: '#5a3a8a', borderColor: '#2e1a5a' },
    red:    { background: '#a84a1a', borderColor: '#7a3210' },
    slate:  { background: '#5a5e66', borderColor: '#2a2e36' },
    teal:   { background: '#2a7a7a', borderColor: '#0f4a4a' },
    rose:   { background: '#a83a5a', borderColor: '#702030' },
  };
  return (
    <button
      onClick={onClick}
      className="py-1 px-2 text-[11px] font-bold rounded-lg border-2 leading-tight"
      style={{ ...palettes[color], color: '#fff' }}
    >
      {children}
    </button>
  );
}

export default function DebugModal({ state, dispatch }) {
  const [itemBiome, setItemBiome] = useState('farm');
  const [itemKey, setItemKey] = useState('grass_hay');

  if (state.modal !== 'debug') return null;

  const biomeResources = BIOMES[itemBiome]?.resources ?? [];

  return (
    <div
      className="absolute inset-0 grid place-items-center pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.35)', zIndex: 70 }}
    >
      <div
        className="relative p-5 rounded-[20px] overflow-y-auto shadow-2xl pointer-events-auto"
        style={{
          background: '#f4ecd8',
          border: '4px solid #b28b62',
          width: 'min(540px, 92vw)',
          maxHeight: '85vh',
        }}
      >
        <button
          onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg grid place-items-center text-[16px] font-bold border-2"
          style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex flex-col gap-3 text-left">
          <div className="text-[18px] font-bold text-center" style={{ color: '#2b2218' }}>
            🛠 Debug Tools
          </div>

          {/* Live counters */}
          <div
            className="grid grid-cols-3 gap-1.5 py-2 px-2 rounded-lg border-2 text-[11px]"
            style={{ background: '#f4e8d0', borderColor: '#b28b62', color: '#2b2218' }}
          >
            <div>🪙 {state?.coins ?? 0}</div>
            <div>⭐ Lv {state?.level ?? 1}</div>
            <div>✨ {state?.xp ?? 0} xp</div>
            <div>🔮 {state?.runes ?? 0} runes</div>
            <div>💠 {state?.influence ?? 0} infl</div>
            <div>📚 Alm {state?.almanac?.level ?? 1}</div>
          </div>

          {/* Currency */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#7a5a38' }}>Money & XP</div>
            <div className="grid grid-cols-2 gap-1.5">
              <DebugBtn color="mine_gold" onClick={() => dispatch({ type: 'DEV/ADD_GOLD', amount: 1000 })}>🪙 +1,000 Gold</DebugBtn>
              <DebugBtn color="mine_gold" onClick={() => dispatch({ type: 'DEV/ADD_GOLD', amount: 10000 })}>🪙 +10,000 Gold</DebugBtn>
              <DebugBtn color="purple" onClick={() => dispatch({ type: 'DEV/ADD_XP', amount: 100 })}>✨ +100 XP</DebugBtn>
              <DebugBtn color="purple" onClick={() => dispatch({ type: 'DEV/ADD_LEVEL', amount: 1 })}>⭐ +1 Level</DebugBtn>
              <DebugBtn color="teal" onClick={() => dispatch({ type: 'DEV/ADD_ALMANAC_XP', amount: 50 })}>📚 +50 Almanac XP</DebugBtn>
              <DebugBtn color="blue" onClick={() => dispatch({ type: 'DEV/ADD_RUNES', amount: 10 })}>🔮 +10 Runes</DebugBtn>
              <DebugBtn color="rose" onClick={() => dispatch({ type: 'DEV/ADD_INFLUENCE', amount: 10 })}>💠 +10 Influence</DebugBtn>
              <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/ADD_SUPPLIES', amount: 10 })}>🍞 +10 Supplies</DebugBtn>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#7a5a38' }}>Items</div>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/FILL_STORAGE', amount: 100 })}>📦 +100 Every Item</DebugBtn>
              <DebugBtn color="slate" onClick={() => dispatch({ type: 'DEV/FILL_TOOLS', amount: 5 })}>🔧 +5 Every Tool</DebugBtn>
            </div>
            <div
              className="flex flex-col gap-1.5 py-2 px-2 rounded-lg border-2"
              style={{ background: '#f4e8d0', borderColor: '#b28b62' }}
            >
              <div className="flex gap-1.5">
                {Object.keys(BIOMES).map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setItemBiome(b);
                      setItemKey(BIOMES[b].resources[0]?.key ?? '');
                    }}
                    className="flex-1 py-1 text-[11px] font-bold rounded border-2"
                    style={
                      itemBiome === b
                        ? { background: '#d6612a', borderColor: '#a84010', color: '#fff' }
                        : { background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }
                    }
                  >
                    {BIOMES[b].name}
                  </button>
                ))}
              </div>
              <select
                value={itemKey}
                onChange={(e) => setItemKey(e.target.value)}
                className="w-full py-1 px-2 text-[11px] rounded border-2"
                style={{ background: '#fff', borderColor: '#b28b62', color: '#2b2218' }}
              >
                {biomeResources.map((r) => (
                  <option key={r.key} value={r.key}>{r.label} ({r.key})</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/ADD_ITEM', key: itemKey, amount: 10 })}>+10</DebugBtn>
                <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/ADD_ITEM', key: itemKey, amount: 50 })}>+50</DebugBtn>
                <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/ADD_ITEM', key: itemKey, amount: 250 })}>+250</DebugBtn>
              </div>
            </div>
          </div>

          {/* Triggers & Reset */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#7a5a38' }}>Triggers</div>
            <div className="grid grid-cols-2 gap-1.5">
              <DebugBtn color="red" onClick={() => dispatch({ type: 'BOSS/TRIGGER' })}>🐉 Trigger Boss</DebugBtn>
              <DebugBtn color="teal" onClick={() => dispatch({ type: 'DEV/BUILD_ALL' })}>🏗 Build All</DebugBtn>
              <DebugBtn color="slate" onClick={() => {
                if (confirm('Reset the entire game? This cannot be undone.')) {
                  dispatch({ type: 'DEV/RESET_GAME' });
                }
              }}>🔄 Reset Game</DebugBtn>
            </div>
          </div>

          {/* Balance Manager — design-time editor for game constants */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#7a5a38' }}>Game Balance</div>
            <a
              href={`${import.meta.env.BASE_URL}b/`}
              className="w-full py-2 text-[12px] font-bold rounded-lg border-2 flex items-center justify-center gap-2 no-underline"
              style={{ background: '#d6612a', borderColor: '#a84010', color: '#fff' }}
            >
              ⚖️ Open Balance Manager
            </a>
            <div className="mt-1 text-[10px] italic" style={{ color: '#7a5a38' }}>
              Edit upgrade chains, recipes, building costs, and tile power hooks. Opens at /b/ in this tab; export as JSON to commit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
