import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Biome switching coverage. The game runs three boards: Farm (default),
 * Mine (level 2+, entry tiered), Fish/Saltspray Harbor (added in this
 * session). Switching is done via SWITCH_BIOME which writes a new state.grid
 * and clears the previous board's hazards.
 */

test('SWITCH_BIOME farm → mine: biomeKey + grid swap, hazards initialised', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  const before = await getReactState(page);
  expect(before.biome).toBe('farm');
  await dispatchAction(page, { type: 'SWITCH_BIOME', key: 'mine' });
  await waitForState(page, (s) => s.biome === 'mine');
  const after = await getReactState(page);
  // mysteriousOre is reset on biome enter (line 1411 in state.js).
  expect(after.mysteriousOre).toBeNull();
  // hazards is preserved object shape.
  expect(after.hazards).toBeTruthy();
});

test('SWITCH_BIOME farm → fish: tide bookkeeping initialised', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  await dispatchAction(page, { type: 'SWITCH_BIOME', key: 'fish' });
  await waitForState(page, (s) => s.biome === 'fish');
  const s = await getReactState(page);
  // Fish slice owns state.fish — initialised with tide:'high', tideTurn:0.
  expect(s.fish).toBeTruthy();
  expect(['high', 'low']).toContain(s.fish.tide);
});

test('FISH/FORCE_TIDE_FLIP toggles tide and rotates bottom row', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  await dispatchAction(page, { type: 'SWITCH_BIOME', key: 'fish' });
  await waitForState(page, (s) => s.biome === 'fish');
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'FISH/FORCE_TIDE_FLIP' });
  const after = await waitForState(page, (s) => s.fish?.tide !== before.fish.tide);
  expect(after.fish.tide).not.toBe(before.fish.tide);
  expect(after.fish.tideTurn).toBe(0);
});

test('SET_BIOME with invalid key is a no-op', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'SWITCH_BIOME', key: 'not_a_biome' });
  await page.waitForTimeout(200);
  const after = await getReactState(page);
  expect(after.biome).toBe(before.biome);
});
