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

    // turnsUsed increase → chain was collected
    if ((s.turnsUsed || 0) > (p.turnsUsed || 0)) {
      play('chainCollect');
      if (s?.settings?.hapticsOn && navigator.vibrate) navigator.vibrate(40);
    }

    // level increase → level up fanfare
    if ((s.level || 0) > (p.level || 0)) play('levelUp');

    // new NPC bubble appeared
    if (s.bubble && s.bubble.id !== p.bubble?.id) play('npcBubble');

    // season modal opened
    if (s.modal === 'season' && p.modal !== 'season') play('seasonTurn');

    // coins decreased (purchase made)
    if ((s.coins || 0) < (p.coins || 0)) play('coinSpend');

    // new building constructed
    const prevBuilt = Object.keys(p.built || {}).length;
    const newBuilt = Object.keys(s.built || {}).length;
    if (newBuilt > prevBuilt) {
      play('coinSpend');
      setTimeout(() => play('upgrade'), 200);
    }

    // crafting total increased
    const prevCrafted = Object.values(p.craftedTotals || {}).reduce((a, v) => a + v, 0);
    const newCrafted = Object.values(s.craftedTotals || {}).reduce((a, v) => a + v, 0);
    if (newCrafted > prevCrafted) play('upgrade');

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
