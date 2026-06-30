import { type ReactNode } from "react";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { tiersForZone, settlementTier, displayZoneName } from "../zones/data.js";
import type { Dispatch, GameState } from "../../types/state";

export const modalKey = "debug";

function DebugBtn({ children, onClick, color = 'slate' }: { children: ReactNode; onClick: () => void; color?: string }) {
  const palettes: Record<string, { background: string; borderColor: string }> = {
    mine_gold:   { background: '#7a6a10', borderColor: '#4a4008' },
    green:  { background: '#2a7a3a', borderColor: '#1a4a20' },
    blue:   { background: '#3a5a8a', borderColor: '#1a2e5a' },
    purple: { background: '#5a3a8a', borderColor: '#2e1a5a' },
    red:    { background: '#a84a1a', borderColor: '#7a3210' },
    slate:  { background: 'var(--slate)', borderColor: '#2a2e36' },
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

const MENU_LINKS = [
  { view: "portal",         label: "🌀 Portal",       color: "purple" },
  { view: "chronicle",      label: "📜 Chronicle",    color: "slate" },
  { view: "bosses",         label: "🐉 Foes",         color: "red" },
  { view: "orders",         label: "📋 Orders",       color: "mine_gold" },
  { view: "castle",         label: "🏰 Castle",       color: "rose" },
  { view: "tileCollection", label: "🧩 Tiles",        color: "blue" },
  { view: "decorations",    label: "🌿 Decorations",  color: "green" },
  { view: "charter",        label: "📜 Charter",      color: "slate" },
  { view: "boons",          label: "✨ Boons",        color: "teal" },
  { view: "achievements",   label: "🏆 Trophies",     color: "mine_gold" },
];

export default function DebugModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const open = state.modal === 'debug';
  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  const settings = (state.settings ?? {}) as { tutorialDisabled?: boolean };
  const gotoView = (view: string) => {
    dispatch({ type: 'CLOSE_MODAL' });
    dispatch({ type: 'SET_VIEW', view });
  };

  if (!open) return null;

  const currentZone = String(state.mapCurrent ?? 'home');
  const zoneTiers = tiersForZone(currentZone);
  const currentTier = settlementTier(state, currentZone);

  return (
    <ParchmentDialog open={open} onClose={close} size="lg" ariaLabel="Debug Tools" backdropClassName="z-[70]">
      <ParchmentDialog.Body className="relative !p-5">
        <FeaturePanel.CloseButton
          onClick={close}
          className="absolute top-3 right-3"
          aria-label="Close"
        />

        <div className="flex flex-col gap-3 text-left">
          <div className="text-[18px] font-bold text-center text-on-panel">
            🛠 Debug Tools
          </div>

          {/* Live counters */}
          <div
            className="grid grid-cols-3 gap-1.5 py-2 px-2 rounded-lg border-2 text-[11px]"
            style={{ background: 'var(--cream)', borderColor: 'var(--iron)', color: 'var(--ink)' }}
          >
            <div>🪙 {state?.coins ?? 0}</div>
            <div>⭐ Lv {state?.level ?? 1}</div>
            <div>✨ {state?.xp ?? 0} xp</div>
            <div>🔮 {state?.runes ?? 0} runes</div>
            <div>💠 {state?.influence ?? 0} infl</div>
            <div>📚 Alm {state?.almanac?.level ?? 1}</div>
          </div>

          {/* Menu shortcuts — quick access to in-development panels */}
          <div>
            <div className="hl-section-label !text-[10px] mb-1.5">Menus</div>
            <div className="grid grid-cols-2 gap-1.5">
              {MENU_LINKS.map((m) => (
                <DebugBtn key={m.view} color={m.color} onClick={() => gotoView(m.view)}>
                  {m.label}
                </DebugBtn>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <div className="hl-section-label !text-[10px] mb-1.5">Money & XP</div>
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
            <div className="hl-section-label !text-[10px] mb-1.5">Items</div>
            <div className="grid grid-cols-2 gap-1.5">
              <DebugBtn color="green" onClick={() => dispatch({ type: 'DEV/FILL_STORAGE', amount: 100 })}>📦 +100 Every Item</DebugBtn>
              <DebugBtn color="slate" onClick={() => dispatch({ type: 'DEV/FILL_TOOLS', amount: 5 })}>🔧 +5 Every Tool</DebugBtn>
            </div>
          </div>

          {/* Display toggles */}
          <div>
            <div className="hl-section-label !text-[10px] mb-1.5">Display</div>
            <div className="grid grid-cols-1 gap-1.5">
              <DebugBtn
                color={settings.tutorialDisabled ? 'slate' : 'green'}
                onClick={() => dispatch({ type: 'SETTINGS/TOGGLE', key: 'tutorialDisabled' })}
              >
                {settings.tutorialDisabled ? '○ OFF' : '● ON'} — Tutorial
              </DebugBtn>
              <div className="text-[10px] italic text-on-panel-faint text-center">
                Feature flag: when OFF the onboarding tutorial never auto-starts. Persists across a game reset.
              </div>
            </div>
          </div>

          {/* Zone tier override — preview any settlement growth state */}
          <div>
            <div className="hl-section-label !text-[10px] mb-1.5">Zone Tier</div>
            {zoneTiers.length === 0 ? (
              <div className="text-[10px] italic text-on-panel-faint">
                {displayZoneName(state, currentZone)} has no tier ladder.
              </div>
            ) : (
              <div
                className="flex flex-col gap-1.5 py-2 px-2 rounded-lg border-2"
                style={{ background: 'var(--cream)', borderColor: 'var(--iron)' }}
              >
                <div className="text-[11px] font-bold" style={{ color: 'var(--ink)' }}>
                  {displayZoneName(state, currentZone)} — force upgrade level
                </div>
                <select
                  value={currentTier}
                  onChange={(e) =>
                    dispatch({ type: 'DEV/SET_ZONE_TIER', zoneId: currentZone, tier: Number(e.target.value) })
                  }
                  className="hl-input !h-auto py-1 !text-[11px]"
                >
                  {zoneTiers.map((t, i) => (
                    <option key={t.id} value={i}>
                      Tier {i} — {t.name} ({t.plots} plots)
                    </option>
                  ))}
                </select>
                <div className="text-[10px] italic text-on-panel-faint">
                  Sets the current zone's tier directly (no cost, ignores gating). Founds the zone if needed.
                </div>
              </div>
            )}
          </div>

          {/* Triggers & Reset */}
          <div>
            <div className="hl-section-label !text-[10px] mb-1.5">Triggers</div>
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

        </div>
      </ParchmentDialog.Body>
    </ParchmentDialog>
  );
}
