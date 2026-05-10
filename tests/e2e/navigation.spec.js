import { test, expect } from '@playwright/test';
import {
  gotoFresh, getReactState, dispatchAction, waitForState, chainUntil,
} from './helpers.js';

test('navigate to Town shows Hearthwood Vale', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: '⌂ Town' }).click();
  await expect(page.getByText('Hearthwood Vale', { exact: true })).toBeVisible();
  const s = await getReactState(page);
  expect(s.view).toBe('town');
});

test('open Crafting screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: '🔨 Craft' }).click();
  await expect(page.getByText(/🔨 Crafting/)).toBeVisible();
});

test('open Inventory screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: '🎒 Inventory' }).click();
  await waitForState(page, (s) => s.view === 'inventory');
});

test('open Quests screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: '📜 Quests' }).click();
  await waitForState(page, (s) => s.view === 'quests');
});

test('open Map screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: '🗺️ Map' }).click();
  await waitForState(page, (s) => s.view === 'cartography');
});

test('season bar hides when not on board', async ({ page }) => {
  await gotoFresh(page);
  // Switch to board first so the SeasonBar renders.
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  await expect(page.getByTestId('turns-left')).toBeVisible();
  await dispatchAction(page, { type: 'SET_VIEW', view: 'town' });
  await expect(page.getByTestId('turns-left')).toHaveCount(0);
});

test('reaching MAX_TURNS opens the season summary modal', async ({ page }) => {
  test.setTimeout(60_000);
  await gotoFresh(page);
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  // The season modal is set inside CHAIN_COLLECTED when turnsUsed reaches the
  // session cap. Drive chains until that happens. Fall back to END_TURN if a
  // chain can't be formed on the current board.
  const final = await chainUntil(page, (s) => s.modal === 'season', { maxChains: 18 });
  expect(final.modal).toBe('season');
});
