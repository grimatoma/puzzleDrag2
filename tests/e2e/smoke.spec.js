import { test, expect } from '@playwright/test';
import { clearSave, waitForBoot } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

test('initial load: HUD + side panel + nav', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await expect(page.getByTestId('coins')).toHaveText('150');
  await expect(page.getByTestId('buildings')).toHaveText('1');
  await expect(page.getByText('8 left')).toBeVisible();
  await expect(page.getByRole('button', { name: '◳ Board' })).toBeVisible();
  await expect(page.getByRole('button', { name: '⌂ Town' })).toBeVisible();
  await expect(page.getByRole('button', { name: '🔨 Craft' })).toBeVisible();
  // Three orders rendered
  await expect(page.getByText('Orders')).toBeVisible();
});

test('hud has 7 nav pills', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  for (const label of ['◳ Board', '⌂ Town', '📜 Quests', '📖 Almanac', '🔨 Craft', '🏆 Trophies', '🗺 Map']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});
