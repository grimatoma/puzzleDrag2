import { useEffect, useRef } from 'react';
import { play, setEnabled, unlock } from './index.js';

/**
 * React hook that watches game state and fires synthesized sounds.
 * Wire into the App component: useAudio(state)
 */
export function useAudio(state) {
  // Sync sfx/music toggles from settings whenever they change
  useEffect(() => {
    setEnabled({
      sfx: state?.settings?.sfxOn !== false,
      music: state?.settings?.musicOn === true,
    });
  }, [state?.settings?.sfxOn, state?.settings?.musicOn]);

  // Track previous state to detect changes
  const prev = useRef(state);
  useEffect(() => {
    const p = prev.current || {};
    const s = state || {};

    // turnsUsed increase → chain was collected. Pitch climbs with chain length
    // so a 3-chain sounds modest and a 10+ chain sounds triumphant.
    if ((s.turnsUsed || 0) > (p.turnsUsed || 0)) {
      const len = s.lastChainLength || 0;
      const pitch = len >= 3 ? Math.min(2.0, 1 + (len - 3) * 0.10) : 1;
      play('chainCollect', { pitch });
      if (s?.settings?.hapticsOn && navigator.vibrate) navigator.vibrate(len >= 6 ? 80 : 40);
    }

    // level increase → level up fanfare
    if ((s.level || 0) > (p.level || 0)) play('levelUp');

    // new NPC bubble appeared
    if (s.bubble && s.bubble.id !== p.bubble?.id) play('npcBubble');

    // season modal opened
    if (s.modal === 'season' && p.modal !== 'season') play('seasonTurn');

    // new building constructed
    const prevBuilt = Object.keys(p.built || {}).length;
    const newBuilt = Object.keys(s.built || {}).length;
    const buildingConstructed = newBuilt > prevBuilt;
    if (buildingConstructed) {
      play('coinSpend');
      setTimeout(() => play('upgrade'), 200);
    }

    // coins decreased (purchase made) — skip if a building was just constructed
    // to avoid playing coinSpend twice on the same event
    if ((s.coins || 0) < (p.coins || 0) && !buildingConstructed) play('coinSpend');

    // crafting total increased
    const prevCrafted = Object.values(p.craftedTotals || {}).reduce((a, v) => a + v, 0);
    const newCrafted = Object.values(s.craftedTotals || {}).reduce((a, v) => a + v, 0);
    if (newCrafted > prevCrafted) play('upgrade');

    // Fish biome — tide flip (state.fish.tide changes)
    if (s.fish?.tide && p.fish?.tide && s.fish.tide !== p.fish.tide) {
      play('tideSplash');
      if (s?.settings?.hapticsOn && navigator.vibrate) {
        try { navigator.vibrate(60); } catch { /* unsupported */ }
      }
    }

    // Fish biome — pearl capture (rune count goes up while on fish biome)
    if ((s.runes || 0) > (p.runes || 0) && s.biomeKey === 'fish') {
      play('pearlCapture');
      if (s?.settings?.hapticsOn && navigator.vibrate) {
        try { navigator.vibrate([20, 30, 20]); } catch { /* unsupported */ }
      }
    }

    prev.current = s;
  });

  // Unlock AudioContext on first pointer interaction (autoplay policy)
  useEffect(() => {
    const handler = () => {
      unlock();
      window.removeEventListener('pointerdown', handler);
    };
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, []);
}
