import { useState, useEffect } from "react";
import { BIOMES } from "../../constants.js";

export const modalKey = "menu";

// --- Toggle switch ---
function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ background: on ? '#d6612a' : '#9a8a72' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// --- Action button ---
function ActionBtn({ children, onClick, variant = 'default', className = '' }) {
  const styles = {
    primary:  { background: '#5a9e4b', borderColor: '#3e7236', color: '#fff' },
    danger:   { background: '#c23b22', borderColor: '#8f2a18', color: '#fff' },
    default:  { background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' },
    ember:    { background: '#d6612a', borderColor: '#a84010', color: '#fff' },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      className={`w-full py-2 px-4 text-[13px] font-bold rounded-xl border-2 transition-colors ${className}`}
      style={s}
    >
      {children}
    </button>
  );
}

// --- Main tab ---
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      await exit?.call(document);
    } else {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      await req?.call(el);
      // Lock portrait if available (Android Chrome / TWA)
      try { await screen.orientation?.lock?.("portrait"); } catch { /* orientation lock not supported */ }
    }
  } catch { /* fullscreen not supported or denied */ }
}

function MainTab({ state, dispatch }) {
  const [fs, setFs] = useState(isFullscreen());
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    const sync = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const onBoard = state?.view === 'board';

  return (
    <div className="flex flex-col items-center gap-3 pt-1">
      <div className="text-center">
        <div className="text-[24px] font-bold" style={{ color: '#a8431a' }}>🔥 Hearthlands</div>
        <div className="text-[12px] italic" style={{ color: '#7a5a38' }}>A puzzle of seasons and stews.</div>
      </div>

      <div className="w-full flex flex-col gap-2 max-w-[320px]">
        {onBoard && (
          confirmLeave ? (
            <div
              className="w-full flex flex-col gap-2 py-3 px-3 rounded-xl border-2"
              style={{ background: '#f4e8d0', borderColor: '#c23b22' }}
            >
              <span className="text-[12px] font-bold text-center" style={{ color: '#5a3a20' }}>
                Leave the board? Your current run will not be saved.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => dispatch({ type: 'SETTINGS/LEAVE_BOARD' })}
                  className="flex-1 py-1.5 text-[12px] font-bold rounded-lg border-2"
                  style={{ background: '#c23b22', borderColor: '#8f2a18', color: '#fff' }}
                >
                  Leave
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 py-1.5 text-[12px] font-bold rounded-lg border-2"
                  style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
                >
                  Stay
                </button>
              </div>
            </div>
          ) : (
            <ActionBtn onClick={() => setConfirmLeave(true)}>
              ⌂ Go to Town
            </ActionBtn>
          )
        )}

        <ActionBtn onClick={() => dispatch({ type: 'SETTINGS/SHOW_TUTORIAL' })}>
          📖 Show Tutorial
        </ActionBtn>

        <ActionBtn onClick={toggleFullscreen}>
          {fs ? "↙ Exit Fullscreen" : "⛶ Go Fullscreen"}
        </ActionBtn>

        <ActionBtn onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: 'settings' })}>
          ⚙ Settings
        </ActionBtn>

        <ActionBtn
          variant="ember"
          onClick={() => { window.location.href = `${import.meta.env.BASE_URL}b/`; }}
        >
          ⚖️ Balance Manager
        </ActionBtn>

        <ActionBtn onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: 'about' })}>
          ℹ About
        </ActionBtn>

        <ActionBtn onClick={() => { dispatch({ type: 'CLOSE_MODAL' }); dispatch({ type: 'SET_VIEW', view: 'achievements' }); }}>
          🏆 Trophies
        </ActionBtn>
      </div>
    </div>
  );
}

// --- Settings tab ---
const TOGGLE_ROWS = [
  { key: 'sfxOn',        label: 'Sound Effects' },
  { key: 'musicOn',      label: 'Music' },
  { key: 'hapticsOn',    label: 'Haptics' },
  { key: 'reducedMotion',label: 'Reduced Motion' },
  { key: 'colorBlind',   label: 'Color-Blind Mode' },
];

const PALETTE_OPTIONS = [
  { id: 'default',      label: 'Default' },
  { id: 'deuteranopia', label: 'Deuteranopia' },
  { id: 'protanopia',   label: 'Protanopia' },
  { id: 'tritanopia',   label: 'Tritanopia' },
];

function SettingsTab({ settings = {}, dispatch }) {
  const activePalette = settings.palette ?? 'default';

  function handleToggle(key) {
    dispatch({ type: 'SETTINGS/TOGGLE', key });
    // Sync colorBlind toggle with palette
    if (key === 'colorBlind') {
      const willBeOn = !settings[key];
      if (willBeOn && activePalette === 'default') {
        dispatch({ type: 'SET_PALETTE', id: 'deuteranopia' });
      } else if (!willBeOn && activePalette !== 'default') {
        dispatch({ type: 'SET_PALETTE', id: 'default' });
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: 'main' })}
        className="self-start text-[12px] font-bold px-3 py-1 rounded-lg border-2"
        style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
      >
        ← Back
      </button>
      <div className="text-[13px] font-bold text-center" style={{ color: '#7a5a38' }}>
        Audio · Motion · Accessibility
      </div>
      <div className="flex flex-col gap-2">
        {TOGGLE_ROWS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between py-2 px-3 rounded-xl border-2"
            style={{ background: '#f4e8d0', borderColor: '#b28b62' }}
          >
            <span className="text-[13px] font-bold" style={{ color: '#2b2218' }}>{label}</span>
            <Toggle
              on={!!settings[key]}
              onToggle={() => handleToggle(key)}
            />
          </div>
        ))}
      </div>

      {/* Palette selector */}
      <div
        className="flex flex-col gap-2 py-2 px-3 rounded-xl border-2"
        style={{ background: '#f4e8d0', borderColor: '#b28b62' }}
      >
        <span className="text-[13px] font-bold" style={{ color: '#2b2218' }}>Color Palette</span>
        <div className="grid grid-cols-2 gap-1.5">
          {PALETTE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => dispatch({ type: 'SET_PALETTE', id })}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg border-2 transition-colors"
              style={
                activePalette === id
                  ? { background: '#d6612a', borderColor: '#a84010', color: '#fff' }
                  : { background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Debug button ---
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

// --- About tab ---
function AboutTab({ state, dispatch }) {
  const [taps, setTaps] = useState(0);
  const [debugOpen, setDebugOpen] = useState(state.settingsDebugOpen ?? false);
  const [itemBiome, setItemBiome] = useState('farm');
  const [itemKey, setItemKey] = useState('grass_hay');

  function handleFireTap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) {
      setTaps(0);
      dispatch({ type: 'SETTINGS/EASTER_EGG' });
    }
  }

  const biomeResources = BIOMES[itemBiome]?.resources ?? [];

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <button
        onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: 'main' })}
        className="self-start text-[12px] font-bold px-3 py-1 rounded-lg border-2"
        style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
      >
        ← Back
      </button>
      <button
        onClick={handleFireTap}
        className="text-[48px] leading-none select-none focus:outline-none"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Secret hearth"
      >
        🔥
      </button>
      <div className="text-[16px] font-bold" style={{ color: '#2b2218' }}>Hearthlands · v0.1.0</div>
      <div className="text-[11px] italic" style={{ color: '#7a5a38' }}>Hearthwood Vale</div>
      <p className="text-[12px] max-w-[280px]" style={{ color: '#5a3a20' }}>
        Inspired by Puzzle Craft 2. Original IP. Designed in Claude Design, built in Claude Code.
      </p>
      <p className="text-[12px] italic" style={{ color: '#7a5a38' }}>
        Made with care for cozy chains and slow seasons.
      </p>

      <div className="w-full pt-3 border-t-2 mt-1" style={{ borderColor: '#b28b62' }}>
        <button
          onClick={() => setDebugOpen((v) => !v)}
          className="w-full py-1.5 text-[12px] font-bold rounded-lg border-2"
          style={{ background: '#2b2218', borderColor: '#000', color: '#f4ecd8' }}
        >
          🛠 Debug Tools {debugOpen ? '▾' : '▸'}
        </button>

        {debugOpen && (
          <div className="mt-3 flex flex-col gap-3 text-left">
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
        )}
      </div>
    </div>
  );
}

// --- Root modal ---
export default function SettingsModal({ state, dispatch }) {
  if (state.modal !== 'menu') return null;

  const tab = state.settingsTab || 'main';
  const settings = state.settings || {};

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 70 }}
    >
      <div
        className="relative p-5 rounded-[20px] overflow-y-auto shadow-2xl"
        style={{
          background: '#f4ecd8',
          border: '4px solid #b28b62',
          width: 'min(540px, 92vw)',
          maxHeight: '85vh',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg grid place-items-center text-[16px] font-bold border-2"
          style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Tab content */}
        {tab === 'main' && <MainTab state={state} dispatch={dispatch} />}
        {tab === 'settings' && <SettingsTab settings={settings} dispatch={dispatch} />}
        {tab === 'about' && <AboutTab state={state} dispatch={dispatch} />}
      </div>
    </div>
  );
}
