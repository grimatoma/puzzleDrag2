import { test, expect } from '@playwright/test';
import { gotoFresh, waitForState } from './helpers.js';

test('menu opens, settings/about tabs work', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await expect(page.getByText('🔥 Hearthlands')).toBeVisible();

  // Tab buttons are on the menu's MainTab. Settings/About each replace the
  // main tab, so we go back between switches.
  await page.getByRole('button', { name: '⚙ Settings' }).click();
  await expect(page.getByText('Sound Effects')).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();

  await page.getByRole('button', { name: 'ℹ About' }).click();
  await expect(page.getByText(/Hearthlands · v/)).toBeVisible();
});

test('boss dev trigger sets boss state', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: 'ℹ About' }).click();
  // The Trigger-Boss button lives inside a collapsed "🛠 Debug Tools" section.
  await page.getByRole('button', { name: /Debug Tools/ }).click();
  await page.getByRole('button', { name: /Trigger Boss/ }).click();

  // BOSS/TRIGGER is a SLICE_PRIMARY action handled by the boss slice. The
  // trigger closes the menu and writes a boss object onto state.
  const s = await waitForState(page, (st) => !!st.boss, { timeout: 3000 });
  expect(s.boss.name).toMatch(/Frostmaw|Drake|Quagmire|Stoneface|Mossback|Storm/);
});

test('settings: SFX toggle persists in state', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: '⚙ Settings' }).click();
  // Click any toggle button next to "Sound Effects" — there's a single
  // pill-shaped button per row. Default is true; one click flips it false.
  const row = page.getByText('Sound Effects').locator('..');
  await row.getByRole('button').first().click();
  await waitForState(page, (s) => s.settings?.sfxOn === false, { timeout: 2000 });
});
