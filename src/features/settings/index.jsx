import { useState, useEffect, useRef } from "react";
import useFocusTrap from "../../ui/primitives/useFocusTrap.js";

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
  { key: 'sfxOn',     label: 'Sound Effects' },
  { key: 'musicOn',   label: 'Music' },
  { key: 'hapticsOn', label: 'Haptics' },
];

function SettingsTab({ settings = {}, dispatch }) {
  function handleToggle(key) {
    dispatch({ type: 'SETTINGS/TOGGLE', key });
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
        Audio
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
    </div>
  );
}

// --- About tab ---
function AboutTab({ dispatch }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <button
        onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: 'main' })}
        className="self-start text-[12px] font-bold px-3 py-1 rounded-lg border-2"
        style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
      >
        ← Back
      </button>
      <div className="text-[48px] leading-none select-none" aria-hidden="true">🔥</div>
      <div className="text-[16px] font-bold" style={{ color: '#2b2218' }}>Hearthlands · v0.1.0</div>
      <div className="text-[11px] italic" style={{ color: '#7a5a38' }}>Hearthwood Vale</div>
      <p className="text-[12px] max-w-[280px]" style={{ color: '#5a3a20' }}>
        Inspired by Puzzle Craft 2. Original IP. Designed in Claude Design, built in Claude Code.
      </p>
      <p className="text-[12px] italic" style={{ color: '#7a5a38' }}>
        Made with care for cozy chains and slow seasons.
      </p>
    </div>
  );
}

// --- Root modal ---
export default function SettingsModal({ state, dispatch }) {
  const open = state.modal === 'menu';
  const panelRef = useRef(null);
  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  useFocusTrap(panelRef, open, close);
  if (!open) return null;

  const tab = state.settingsTab || 'main';
  const settings = state.settings || {};

  return (
    <div
      className="absolute inset-0 grid place-items-center pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.35)', zIndex: 70 }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="relative p-5 rounded-[20px] overflow-y-auto shadow-2xl pointer-events-auto outline-none"
        style={{
          background: '#f4ecd8',
          border: '4px solid #b28b62',
          width: 'min(540px, 92vw)',
          maxHeight: '85vh',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg grid place-items-center text-[16px] font-bold border-2"
          style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Tab content */}
        {tab === 'main' && <MainTab state={state} dispatch={dispatch} />}
        {tab === 'settings' && <SettingsTab settings={settings} dispatch={dispatch} />}
        {tab === 'about' && <AboutTab dispatch={dispatch} />}
      </div>
    </div>
  );
}
