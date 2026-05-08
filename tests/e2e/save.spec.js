import { test, expect } from '@playwright/test';
import {
  gotoFresh, waitForBoot, triggerChainViaScene, getReactState, dispatchAction,
} from './helpers.js';

test('state persists across reload', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  // Land a chain to grow coins beyond the seeded baseline.
  await triggerChainViaScene(page, 3);
  // Persistence is rAF-coalesced — give it a frame to flush.
  await page.waitForTimeout(800);
  const before = await getReactState(page);
  expect(before.coins, 'coins grew after chain').toBeGreaterThan(150);

  // Reload without re-seeding (the helper is gated on `hearth.e2e.seeded` so
  // the live save survives this round-trip).
  await page.reload();
  await waitForBoot(page);
  const after = await getReactState(page);
  // turnsUsed resets on boot but coins / inventory / season counters persist.
  expect(after.turnsUsed).toBe(0);
  expect(after.coins).toBe(before.coins);
});
