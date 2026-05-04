import { test, expect } from '@playwright/test';
import { waitForBoot, triggerChainViaScene, getReactState } from './helpers.js';

test('state persists across reload', async ({ page }) => {
  // Clear save only before the first load, not on subsequent reloads.
  // addInitScript runs on every navigation, so we use evaluate instead.
  await page.goto('/');
  // Clear any existing save so we start fresh, but keep tutorial suppressed
  await page.evaluate(() => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('hearth.')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('hearth.tutorial.seen', '1');
    } catch {}
    // Reload to get a clean initial state
    location.reload();
  });
  await waitForBoot(page);
  await triggerChainViaScene(page, 3);
  await page.waitForTimeout(800);
  const before = await getReactState(page);
  const beforeCoins = before.coins;
  // Coins should be > 150 after a chain (each tile yields some coins)
  expect(beforeCoins).toBeGreaterThan(150);
  // Reload WITHOUT clearing localStorage — save should be preserved
  await page.reload();
  await waitForBoot(page);
  const after = await getReactState(page);
  // turnsUsed resets on boot but coins/inventory persist
  expect(after.turnsUsed).toBe(0);
  expect(after.coins).toBe(beforeCoins);
});
