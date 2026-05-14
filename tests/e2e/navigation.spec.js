import { test, expect } from '@playwright/test';
import {
  gotoFresh, enterBoard, getReactState, dispatchAction, waitForState,
} from './helpers.js';

test('navigate to Town shows Hearthwood Vale', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('bottom-nav-town').click();
  await expect(page.getByText('Hearthwood Vale', { exact: true }).first()).toBeVisible();
  const s = await getReactState(page);
  expect(s.view).toBe('town');
});

test('open Crafting screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: 'Craft' }).click();
  await waitForState(page, (s) => s.view === 'crafting');
});

test('open Inventory screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: 'Inventory' }).click();
  await waitForState(page, (s) => s.view === 'inventory');
});

test('open Quests screen', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'SET_VIEW', view: 'quests' });
  await waitForState(page, (s) => s.view === 'quests');
});

test('open Map screen', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('button', { name: 'Map' }).click();
  await waitForState(page, (s) => s.view === 'cartography');
});

test('season bar hides when not on board', async ({ page }) => {
  await gotoFresh(page);
  // Switch to board first so the SeasonBar renders.
  await enterBoard(page);
  await expect(page.getByTestId('turns-left')).toBeVisible();
  await dispatchAction(page, { type: 'SET_VIEW', view: 'town' });
  await expect(page.getByTestId('turns-left')).toHaveCount(0);
});

test('spending the farmRun turn budget opens the season summary modal', async ({ page }) => {
  test.setTimeout(60_000);
  await gotoFresh(page);
  await enterBoard(page);
  // END_TURN is the reducer-level contract for spending the board turn budget.
  // Driving this directly keeps the navigation smoke deterministic; chain
  // behavior has its own focused coverage.
  let final = await getReactState(page);
  for (let i = 0; i < 20 && final.modal !== 'season'; i += 1) {
    await dispatchAction(page, { type: 'END_TURN' });
    final = await getReactState(page);
  }
  expect(final.modal).toBe('season');
});
