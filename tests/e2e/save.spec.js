import { test, expect } from '@playwright/test';
import {
  gotoFresh, waitForAppBoot, dispatchAction, getReactState,
} from './helpers.js';

test('state persists across reload', async ({ page }) => {
  await gotoFresh(page, { coins: 1000, inventory: { grass_hay: 0 } });
  await dispatchAction(page, { type: 'BUY_RESOURCE', payload: { key: 'grass_hay', qty: 1 } });
  // Persistence is rAF-coalesced — give it a frame to flush.
  await page.waitForTimeout(800);
  const before = await getReactState(page);
  expect(before.inventory?.grass_hay, 'resource bought before reload').toBe(1);
  expect(before.coins, 'coins debited before reload').toBeLessThan(1000);

  // Reload without re-seeding (the helper is gated on `hearth.e2e.seeded` so
  // the live save survives this round-trip).
  await page.reload();
  await waitForAppBoot(page);
  const after = await getReactState(page);
  // Reloads return to Town while preserving persistent resources.
  expect(after.view).toBe('town');
  expect(after.turnsUsed).toBe(0);
  expect(after.coins).toBe(before.coins);
  expect(after.inventory?.grass_hay).toBe(1);
});
