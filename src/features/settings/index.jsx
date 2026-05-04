import React from "react";

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

// --- Tab pill ---
function TabPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[12px] font-bold border-2 transition-colors"
      style={{
        background: active ? '#d6612a' : '#e8dcc4',
        borderColor: active ? '#a84010' : '#b28b62',
        color: active ? '#fff' : '#5a3a20',
      }}
    >
      {label}
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
      // Lock landscape if available (Android Chrome / TWA)
      try { await screen.orientation?.lock?.("landscape"); } catch {}
    }
  } catch {}
}

function MainTab({ state, dispatch }) {
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const [fs, setFs] = React.useState(isFullscreen());
  React.useEffect(() => {
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
        <ActionBtn variant="primary" onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
          ▶ Resume
        </ActionBtn>

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

        {confirmReset ? (
          <div
            className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-xl border-2"
            style={{ background: '#f4e8d0', borderColor: '#c23b22' }}
          >
            <span className="text-[12px] font-bold" style={{ color: '#5a3a20' }}>Sure? This cannot be undone.</span>
            <div className="flex gap-2">
              <button
                onClick={() => { dispatch({ type: 'SETTINGS/RESET_SAVE' }); setConfirmReset(false); }}
                className="py-1 px-3 text-[12px] font-bold rounded-lg border-2"
                style={{ background: '#c23b22', borderColor: '#8f2a18', color: '#fff' }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="py-1 px-3 text-[12px] font-bold rounded-lg border-2"
                style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <ActionBtn variant="danger" onClick={() => setConfirmReset(true)}>
            🗑 Reset Save
          </ActionBtn>
        )}
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

function SettingsTab({ settings = {}, dispatch }) {
  return (
    <div className="flex flex-col gap-3">
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
              onToggle={() => dispatch({ type: 'SETTINGS/TOGGLE', key })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- About tab ---
function AboutTab({ dispatch }) {
  const [taps, setTaps] = React.useState(0);

  function handleFireTap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) {
      setTaps(0);
      dispatch({ type: 'SETTINGS/EASTER_EGG' });
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
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
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#7a5a38' }}>Dev triggers</div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => dispatch({ type: 'BOSS/TRIGGER' })}
            className="py-1 px-3 text-[11px] font-bold rounded-lg border-2"
            style={{ background: '#a84a1a', borderColor: '#7a3210', color: '#fff' }}
          >🐉 Trigger Boss</button>
          <button
            onClick={() => dispatch({ type: 'DEV/FILL_STORAGE' })}
            className="py-1 px-3 text-[11px] font-bold rounded-lg border-2"
            style={{ background: '#2a7a3a', borderColor: '#1a4a20', color: '#fff' }}
          >📦 +100 All Items</button>
          <button
            onClick={() => dispatch({ type: 'DEV/ADD_GOLD', amount: 1000 })}
            className="py-1 px-3 text-[11px] font-bold rounded-lg border-2"
            style={{ background: '#7a6a10', borderColor: '#4a4008', color: '#fff' }}
          >🪙 +1000 Gold</button>
          <button
            onClick={() => dispatch({ type: 'DEV/RESET_GAME' })}
            className="py-1 px-3 text-[11px] font-bold rounded-lg border-2"
            style={{ background: '#3a3a8a', borderColor: '#1a1a5a', color: '#fff' }}
          >🔄 Reset Game</button>
        </div>
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
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 55 }}
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

        {/* Tab bar */}
        <div className="flex gap-2 mb-4">
          {['main', 'settings', 'about'].map((t) => (
            <TabPill
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              active={tab === t}
              onClick={() => dispatch({ type: 'SETTINGS/SET_TAB', tab: t })}
            />
          ))}
        </div>

        {/* Tab content */}
        {tab === 'main' && <MainTab state={state} dispatch={dispatch} />}
        {tab === 'settings' && <SettingsTab settings={settings} dispatch={dispatch} />}
        {tab === 'about' && <AboutTab dispatch={dispatch} />}
      </div>
    </div>
  );
}
