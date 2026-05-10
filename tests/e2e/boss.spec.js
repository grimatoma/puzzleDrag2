import { test, expect } from '@playwright/test';
import { gotoFresh, waitForState, dispatchAction } from './helpers.js';

/**
 * Boss flow coverage. BOSS/TRIGGER is a SLICE_PRIMARY action handled in
 * src/features/boss/slice.js. Each boss has:
 *   - resource + targetCount: tiles to harvest before turns run out
 *   - turns: BOSS_WINDOW_TURNS (10 by default)
 *   - minChain: optional override (Frostmaw: 5, Storm: 4)
 *
 * The slice mounts state.boss at trigger and clears it on resolve.
 */

test('BOSS/TRIGGER mounts a boss object on state', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'BOSS/TRIGGER' });
  const s = await waitForState(page, (st) => !!st.boss, { timeout: 3000 });
  expect(s.boss.name).toMatch(/Frostmaw|Drake|Quagmire|Stoneface|Mossback|Storm/);
  expect(s.boss.resource).toBeTruthy();
  expect(s.boss.targetCount).toBeGreaterThan(0);
  // Time-budget field is `turnsLeft` on the live boss object (BOSS_META.turns
  // is the source on construction).
  expect(s.boss.turnsLeft).toBeGreaterThan(0);
});

test('BOSS/RESOLVE clears the boss object', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'BOSS/TRIGGER' });
  await waitForState(page, (s) => !!s.boss);
  await dispatchAction(page, { type: 'BOSS/RESOLVE', payload: { won: false } });
  await waitForState(page, (s) => !s.boss, { timeout: 3000 });
});

test('BOSS/TRIGGER, BOSS/RESOLVE clears state.boss back to null', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'BOSS/TRIGGER' });
  await waitForState(page, (s) => !!s.boss);
  await dispatchAction(page, { type: 'BOSS/RESOLVE', payload: { won: true } });
  await waitForState(page, (s) => !s.boss);
});
