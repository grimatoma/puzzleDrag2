import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

test.describe('CUJ: tools + hotbar journeys', () => {
  test('arming from dropdown closes modal and sets armed state', async ({ page }) => {
    await gotoFresh(page, { tools: { rake: 2 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await expect(page.getByTestId('puzzle-tool-modal')).toBeVisible();

    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="rake"]').first().click();
    await page.getByRole('button', { name: /arm tool/i }).click();

    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);
    await expect(page.getByTestId('board-armed-border')).toBeVisible();
    const state = await waitForState(page, (s) => s.toolPending === 'rake');
    expect(state.tools.rake).toBe(2);
  });

  test('tap-target cancel path preserves count', async ({ page }) => {
    await gotoFresh(page, { tools: { magic_wand: 1 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="magic_wand"]').first().click();
    await page.getByRole('button', { name: /arm tool/i }).click();
    await expect(page.getByTestId('board-armed-border')).toBeVisible();

    await page.getByTestId('puzzle-hotbar-open').click();
    await page.getByRole('button', { name: /disarm tool/i }).click();
    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);

    const s = await waitForState(page, (st) => st.toolPending === null);
    expect(s.tools.magic_wand).toBe(1);
  });

  test('zero-count tap-target tool is inspectable but cannot be armed', async ({ page }) => {
    await gotoFresh(page, { tools: { magic_wand: 0 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

    await page.getByTestId('puzzle-hotbar-open').click();
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="magic_wand"]').first().click();
    const arm = page.getByRole('button', { name: /arm tool/i });
    await expect(arm).toBeDisabled();

    const before = await getReactState(page);
    await page.locator('[data-testid="puzzle-tool-modal"] [data-tool-key="magic_wand"]').first().click();
    const after = await getReactState(page);
    expect(after.toolPending ?? null).toBe(before.toolPending ?? null);
  });

  test('tool modal backdrop blocks pointer leakage to board', async ({ page }) => {
    await gotoFresh(page, { tools: { rake: 1 } });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
    const before = await getReactState(page);

    await page.getByTestId('puzzle-hotbar-open').click();
    await expect(page.getByTestId('puzzle-tool-modal')).toBeVisible();
    await page.getByTestId('puzzle-tool-modal-backdrop').click({ position: { x: 8, y: 8 } });

    await expect(page.getByTestId('puzzle-tool-modal')).toHaveCount(0);
    const after = await getReactState(page);
    expect(after.turnsUsed).toBe(before.turnsUsed);
    expect(after.chainPreview?.count ?? 0).toBe(before.chainPreview?.count ?? 0);
  });
});
