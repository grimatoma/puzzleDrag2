import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, dispatchAction } from './helpers';

test('initial load: boots on Town view, HUD + bottom nav render without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await gotoFresh(page);

  const s = await getReactState(page);
  // First-time players start at the Town view (the saved-state load also
  // forces view: "town"). The HUD always renders; coins only show off-board.
  expect(s.view).toBe('town');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('coins')).toBeVisible();
  await expect(page.getByTestId('coins')).toContainText('150');

  // Bottom nav always renders. Assert presence of each tab via accessible name.
  for (const label of ['Town', 'Inventory', 'Craft', 'Map', 'Townsfolk']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible();
  }
  expect(errors, `runtime errors:\n${errors.join('\n')}`).toEqual([]);
});

test('Board view: SeasonBar with 10 turns left appears once on board', async ({ page }) => {
  await gotoFresh(page);
  // Enter a farm run so farmRun.turnBudget drives the season strip (not bare SET_VIEW).
  await dispatchAction(page, { type: 'FARM/ENTER', payload: { selectedTiles: [], useFertilizer: false } });
  await expect(page.getByTestId('turns-left')).toBeVisible();
  await expect(page.getByTestId('turns-left')).toContainText('10');
});

test('menu button opens hamburger menu', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('menu-btn').click();
  await expect(page.getByText(/🔥 Hearthlands/)).toBeVisible();
  const s = await getReactState(page);
  expect(s.modal).toBe('menu');
});
