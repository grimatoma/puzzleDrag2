import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, dispatchAction, isIgnoredConsoleError } from './helpers';

test('initial load: boots on Town view, HUD + bottom nav render without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Ignore known-benign console noise (Phaser texture-key re-add, tween race,
  // asset 404s) so a real new console.error still fails the assert below.
  page.on('console', (m) => { if (m.type() === 'error' && !isIgnoredConsoleError(m.text())) errors.push(m.text()); });
  await gotoFresh(page);

  const s = await getReactState(page);
  // First-time players start at the Town view (the saved-state load also
  // forces view: "town"). The HUD always renders; coins only show off-board.
  expect(s.view).toBe('town');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('coins')).toBeVisible();
  await expect(page.getByTestId('coins')).toContainText('150');

  // Bottom nav always renders. Assert presence of each tab via its stable
  // data-tour hook (src/ui/primitives/TabBar.tsx → `nav-<itemKey>`).
  for (const key of ['town', 'inventory', 'crafting', 'cartography', 'townsfolk']) {
    await expect(page.locator(`[data-tour="nav-${key}"]`)).toHaveCount(1);
  }
  expect(errors, `runtime errors:\n${errors.join('\n')}`).toEqual([]);
});

test('Board view: SeasonBar with 10 turns left appears once on board', async ({ page }) => {
  await gotoFresh(page);
  // Start a farm run so the SeasonBar has an active turn budget (a bare
  // SET_VIEW board with no run shows 0). Home farm baseTurns is 10.
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
