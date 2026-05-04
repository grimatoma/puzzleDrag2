import { test, expect } from '@playwright/test';
import { clearSave, waitForBoot, triggerChainViaScene, getReactState, dispatchAction } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

test('navigate to Town shows Hearthwood Vale', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await page.getByRole('button', { name: '⌂ Town' }).click();
  // TownView header always renders exactly "Hearthwood Vale"
  await expect(page.getByText('Hearthwood Vale', { exact: true })).toBeVisible();
  // Confirm TownView is active via React state
  const state = await getReactState(page);
  expect(state.view).toBe('town');
});

test('navigate to Map shows map screen', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await page.getByRole('button', { name: '🗺 Map' }).click();
  // The cartography screen side panel shows "Tap a node to explore" when nothing is selected
  await expect(page.getByText('Tap a node to explore')).toBeVisible();
});

test('open Crafting screen', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await page.getByRole('button', { name: '🔨 Craft' }).click();
  await expect(page.getByText(/🔨 Crafting/)).toBeVisible();
});

test('season bar hides when not on board', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await expect(page.getByText('8 left')).toBeVisible();
  await page.getByRole('button', { name: '⌂ Town' }).click();
  await expect(page.getByText('8 left')).toHaveCount(0);
});

test('leaving board mid-session triggers season summary modal', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  // Trigger a chain to advance turn
  await triggerChainViaScene(page, 3);
  await page.waitForTimeout(800);
  // Use dispatchAction to navigate away from board — avoids click interception from overlays
  await dispatchAction(page, { type: 'SET_VIEW', view: 'town' });
  await page.waitForTimeout(500);
  // SET_VIEW while turnsUsed > 0 triggers season modal (pendingView = 'town', modal = 'season')
  const state = await getReactState(page);
  expect(state.modal).toBe('season');
});
