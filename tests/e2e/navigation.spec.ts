import { test, expect } from '@playwright/test';
import {
  gotoFresh, getReactState, dispatchAction, waitForState, chainUntil,
} from './helpers';

function navButton(page, label) {
  return page.getByRole('button', { name: label }).first();
}

test('navigate to Town shows Hearthwood Vale', async ({ page }) => {
  await gotoFresh(page);
  await navButton(page, 'Town').click();
  await expect(page.getByText('Hearthwood Vale', { exact: true })).toBeVisible();
  const s = await getReactState(page);
  expect(s.view).toBe('town');
});

test('open Crafting screen', async ({ page }) => {
  await gotoFresh(page);
  await navButton(page, 'Craft').click();
  await waitForState(page, (s) => s.view === 'crafting');
});

test('open Inventory screen', async ({ page }) => {
  await gotoFresh(page);
  await navButton(page, 'Inventory').click();
  await waitForState(page, (s) => s.view === 'inventory');
});

test('open Townsfolk screen', async ({ page }) => {
  await gotoFresh(page);
  await navButton(page, 'Townsfolk').click();
  await waitForState(page, (s) => s.view === 'townsfolk');
});

test('open Map screen', async ({ page }) => {
  await gotoFresh(page);
  await navButton(page, 'Map').click();
  await waitForState(page, (s) => s.view === 'cartography');
});

test('season bar hides when not on board', async ({ page }) => {
  await gotoFresh(page);
  // Switch to board first so the SeasonBar renders.
  await dispatchAction(page, { type: 'FARM/ENTER', payload: { selectedTiles: [], useFertilizer: false } });
  await expect(page.getByTestId('turns-left')).toBeVisible();
  await dispatchAction(page, { type: 'SET_VIEW', view: 'town' });
  await expect(page.getByTestId('turns-left')).toHaveCount(0);
});

test('spending the farmRun turn budget opens the season summary modal', async ({ page }) => {
  test.setTimeout(60_000);
  await gotoFresh(page);
  await dispatchAction(page, { type: 'FARM/ENTER', payload: { selectedTiles: [], useFertilizer: false } });
  // The season modal is set inside CHAIN_COLLECTED when turnsRemaining reaches 0.
  // Drive chains until that happens.
  const final = await chainUntil(page, (s) => s.modal === 'season', { maxChains: 18 });
  expect(final.modal).toBe('season');
});
