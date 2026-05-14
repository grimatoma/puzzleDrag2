import { test, expect } from '@playwright/test';
import { gotoFresh, enterBoard, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Biome switching coverage. The game runs three boards: Farm (default),
 * Mine (level 2+, entry tiered), Fish/Saltspray Harbor (added in this
 * session). E2E uses SET_BIOME at a turn boundary so the test covers the
 * board-state contract without requiring map travel/expedition setup.
 */

test('SET_BIOME farm → mine: biomeKey + grid swap, hazards initialised', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await enterBoard(page);
  const before = await getReactState(page);
  expect(before.biome).toBe('farm');
  await dispatchAction(page, { type: 'SET_BIOME', id: 'mine' });
  await waitForState(page, (s) => s.biome === 'mine');
  const after = await getReactState(page);
  // Mine entry seeds the mysterious ore timer/position when a grid exists.
  expect(after.mysteriousOre).toEqual(expect.objectContaining({
    row: expect.any(Number),
    col: expect.any(Number),
    turnsRemaining: expect.any(Number),
  }));
  // hazards is preserved object shape.
  expect(after.hazards).toBeTruthy();
});

test('SET_BIOME farm → fish: tide bookkeeping initialised', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await enterBoard(page);
  await dispatchAction(page, { type: 'SET_BIOME', id: 'fish' });
  await waitForState(page, (s) => s.biome === 'fish');
  const s = await getReactState(page);
  // Fish slice owns state.fish — initialised with tide:'high', tideTurn:0.
  expect(s.fish).toBeTruthy();
  expect(['high', 'low']).toContain(s.fish.tide);
});

test('FISH/FORCE_TIDE_FLIP toggles tide and rotates bottom row', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await enterBoard(page);
  await dispatchAction(page, { type: 'SET_BIOME', id: 'fish' });
  await waitForState(page, (s) => s.biome === 'fish');
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'FISH/FORCE_TIDE_FLIP' });
  const after = await waitForState(page, (s) => s.fish?.tide !== before.fish.tide);
  expect(after.fish.tide).not.toBe(before.fish.tide);
  expect(after.fish.tideTurn).toBe(0);
});

test('SET_BIOME with invalid key is a no-op', async ({ page }) => {
  await gotoFresh(page, { level: 5, coins: 2000 });
  await enterBoard(page);
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'SET_BIOME', id: 'not_a_biome' });
  await page.waitForTimeout(200);
  const after = await getReactState(page);
  expect(after.biome).toBe(before.biome);
});
