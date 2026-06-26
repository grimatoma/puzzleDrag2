import { useState, useEffect, type ReactNode } from "react";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";
import type { GameState, Dispatch } from "../../types/state.js";
import { useAppUpdateReady, applyUpdate, checkForUpdate } from "../../appUpdate.js";

export const modalKey = "menu";
export const alwaysMounted = true;

// --- Toggle switch ---
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
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
interface ActionBtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'default' | 'ember';
  className?: string;
}
function ActionBtn({ children, onClick, variant = 'default', className = '' }: ActionBtnProps) {
  const styles: Record<string, { background: string; borderColor: string; color: string }> = {
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
interface DocWithLegacyFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}
interface ElWithLegacyFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

function isFullscreen(): boolean {
  const d = document as DocWithLegacyFullscreen;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}
async function toggleFullscreen(): Promise<void> {
  try {
    const d = document as DocWithLegacyFullscreen;
    if (isFullscreen()) {
      const exit = d.exitFullscreen || d.webkitExitFullscreen;
      await exit?.call(d);
    } else {
      const el = d.documentElement as ElWithLegacyFullscreen;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      await req?.call(el);
      // Lock portrait if available (Android Chrome / TWA)
      try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.("portrait"); } catch { /* orientation lock not supported */ }
    }
  } catch { /* fullscreen not supported or denied */ }
}

// Update affordance: a prominent "refresh now" button when a new build is
// waiting, otherwise a quiet "Check for Updates" that pokes the service worker.
function UpdateButton() {
  const ready = useAppUpdateReady();
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  if (ready) {
    return (
      <ActionBtn variant="ember" onClick={applyUpdate}>
        ✨ Update Available — Refresh
      </ActionBtn>
    );
  }

  // After a manual check, give brief feedback. If a build is found, the banner
  // (or this button flipping to "Refresh") takes over automatically.
  return (
    <ActionBtn
      onClick={() => {
        checkForUpdate();
        setCheckedAt(Date.now());
      }}
    >
      {checkedAt ? "↻ Checking…" : "↻ Check for Updates"}
    </ActionBtn>
  );
}

function MainTab({ dispatch }: { dispatch: Dispatch }) {
  const [fs, setFs] = useState<boolean>(isFullscreen());
  useEffect(() => {
    const sync = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 pt-1">
      <div className="text-center">
        <div className="text-[24px] font-bold" style={{ color: '#a8431a' }}>🔥 Hearthlands</div>
        <div className="text-[12px] italic" style={{ color: '#7a5a38' }}>A puzzle of seasons and stews.</div>
      </div>

      <div className="w-full flex flex-col gap-2 max-w-[320px]">
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

        <ActionBtn onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'town_hall' })}>
          🏛 Town Hall
        </ActionBtn>

        <ActionBtn onClick={() => dispatch({ type: 'SETTINGS/OPEN_DEBUG' })}>
          🛠 Debug
        </ActionBtn>

        <UpdateButton />

        <a
          href={`${import.meta.env.BASE_URL}b/`}
          target="_blank"
          rel="noopener"
          className="w-full py-2 px-4 text-[13px] font-bold rounded-xl border-2 flex items-center justify-center no-underline"
          style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
        >
          📖 Game Wiki
        </a>
      </div>
    </div>
  );
}

// --- Settings tab ---
const AUDIO_ROWS = [
  { key: 'sfxOn',     label: 'Sound Effects' },
  { key: 'hapticsOn', label: 'Haptics' },
];
const GRAPHICS_ROWS = [
  { key: 'pixelSpriteOverride', label: 'Pixel Sprite Tiles' },
];

interface SettingsTabProps { settings?: Record<string, boolean>; dispatch: Dispatch }
function SettingsTab({ settings = {}, dispatch }: SettingsTabProps) {
  function handleToggle(key: string) {
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
      <div className="hl-section-label text-center">
        Audio
      </div>
      <div className="flex flex-col gap-2">
        {AUDIO_ROWS.map(({ key, label }) => (
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
      <div className="hl-section-label text-center">
        Graphics
      </div>
      <div className="flex flex-col gap-2">
        {GRAPHICS_ROWS.map(({ key, label }) => (
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
function AboutTab({ dispatch }: { dispatch: Dispatch }) {
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
interface SettingsModalProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function SettingsModal({ state, dispatch }: SettingsModalProps) {
  const s = state as GameState & { modal?: string | null; settingsTab?: string; settings?: Record<string, boolean> };
  const open = s.modal === 'menu' || s.modal === 'leaveBoard';
  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  if (!open) return null;
  const leavingBoard = s.modal === 'leaveBoard';

  const tab = s.settingsTab || 'main';
  const settings: Record<string, boolean> = s.settings || {};

  return (
    <ParchmentDialog open={open} onClose={close} size="lg" ariaLabel="Menu" backdropClassName="z-[70]">
      <ParchmentDialog.Body className="relative !p-5">
        {/* Close button */}
        <FeaturePanel.CloseButton
          onClick={close}
          className="absolute top-3 right-3"
          aria-label="Close"
        />

        {/* Tab content */}
        {leavingBoard ? (
          <div
            className="w-full flex flex-col gap-3 py-3 px-3 rounded-xl"
            style={{ background: '#f4e8d0' }}
          >
            <span className="text-[13px] font-bold text-center" style={{ color: '#5a3a20' }}>
              Leave the board? Your current run will not be saved.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => dispatch({ type: 'SETTINGS/LEAVE_BOARD' })}
                className="flex-1 py-2 text-[12px] font-bold rounded-lg border-2"
                style={{ background: '#c23b22', borderColor: '#8f2a18', color: '#fff' }}
              >
                Leave
              </button>
              <button
                onClick={close}
                className="flex-1 py-2 text-[12px] font-bold rounded-lg border-2"
                style={{ background: '#e8dcc4', borderColor: '#b28b62', color: '#5a3a20' }}
              >
                Stay
              </button>
            </div>
          </div>
        ) : (tab === 'main' && <MainTab dispatch={dispatch} />)}
        {tab === 'settings' && <SettingsTab settings={settings} dispatch={dispatch} />}
        {tab === 'about' && <AboutTab dispatch={dispatch} />}
      </ParchmentDialog.Body>
    </ParchmentDialog>
  );
}
