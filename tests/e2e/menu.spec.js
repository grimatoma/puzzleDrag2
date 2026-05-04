import { test, expect } from '@playwright/test';
import { clearSave, waitForBoot, getReactState } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

test('menu opens, settings/about tabs work', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  // On board view the hamburger exits to town — navigate to town first, then open menu
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: '⌂ Town' }).click();
  await page.getByTestId('menu-btn').click();
  await expect(page.getByText('🔥 Hearthlands')).toBeVisible();
  // Click the tab pill labelled "Settings" (exact match to avoid matching "⚙ Settings" action btn)
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Sound Effects')).toBeVisible();
  // Click the tab pill labelled "About" (exact match to avoid matching "ℹ About" action btn)
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByText('Hearthlands · v0.1.0')).toBeVisible();
});

test('boss dev trigger sets boss state', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  // On board view the hamburger exits to town — navigate to town first, then open menu
  await page.getByTestId('menu-btn').click();
  await page.getByRole('button', { name: '⌂ Town' }).click();
  await page.getByTestId('menu-btn').click();
  // Click About tab pill (exact match)
  await page.getByRole('button', { name: 'About', exact: true }).click();
  // The trigger button closes the menu and dispatches BOSS/TRIGGER
  await page.getByRole('button', { name: /Trigger Boss/ }).click();
  await page.waitForTimeout(300);
  // Verify boss state was set in React (the boss object holds name, emoji, goal etc.)
  const state = await getReactState(page);
  expect(state.boss).not.toBeNull();
  expect(state.boss.name).toMatch(/Frostmaw|Drake|Quagmire|Stoneface/);
});
