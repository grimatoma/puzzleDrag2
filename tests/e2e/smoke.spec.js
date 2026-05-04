import { test, expect } from '@playwright/test';
import { clearSave, waitForBoot } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

test('initial load: HUD + side panel + nav', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  // Board-view HUD elements
  await expect(page.getByText('8 left')).toBeVisible();
  await expect(page.getByText('Orders')).toBeVisible();
  // Coins and buildings are hidden on board — navigate to town to check them
  await page.getByTestId('menu-btn').click();
  await expect(page.getByTestId('coins')).toHaveText('150');
  await expect(page.getByTestId('buildings')).toHaveText('1');
  // Bottom nav is visible off board
  await expect(page.getByRole('button', { name: '◳ Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: '⌂ Town' })).toBeVisible();
  await expect(page.getByRole('button', { name: '🔨 Craft' })).toBeVisible();
});

test('nav pills are visible off board', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  // Navigate off board so the nav is visible
  await page.getByTestId('menu-btn').click();
  for (const label of ['◳ Board', '⌂ Town', '🎒 Inventory', '📜 Quests', '📖 Almanac', '🔨 Craft', '🏆 Trophies', '🗺 Map']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});
