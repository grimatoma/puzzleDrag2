import { test, expect } from '@playwright/test';
import { gotoFresh, enterBoard, getReactState } from './helpers.js';

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

  // Bottom nav always renders. Use stable nav test ids so duplicate Town labels
  // elsewhere in the UI do not make this smoke test brittle.
  for (const key of ['town', 'inventory', 'crafting', 'cartography']) {
    await expect(page.getByTestId(`bottom-nav-${key}`)).toBeVisible();
  }
  expect(errors, `runtime errors:\n${errors.join('\n')}`).toEqual([]);
});

test('Board view: SeasonBar with 10 turns left appears once on board', async ({ page }) => {
  await gotoFresh(page);
  // Town is the default boot view; force the player onto the board so the
  // SeasonBar (which only renders when view === 'board') is visible.
  await enterBoard(page);
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
