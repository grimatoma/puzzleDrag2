import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, dispatchAction } from './helpers.js';

/**
 * Error-boundary smoke. The RootErrorBoundary in main.jsx catches render
 * errors and shows a "Something went wrong" fallback. We don't have a
 * deliberate-throw affordance, so we cover this path indirectly: the most
 * common crash — a malformed action — must not propagate to the boundary.
 */

test('Unknown action types are ignored without throwing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoFresh(page);
  await dispatchAction(page, { type: 'TOTALLY/MADE_UP_ACTION', whatever: true });
  await page.waitForTimeout(200);
  // Reducer should ignore unknown actions; no fallback boundary.
  expect(errors).toEqual([]);
  await expect(page.getByText('Something went wrong.')).toHaveCount(0);
});

test('Dispatching with an action missing payload does not crash the reducer', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoFresh(page);
  await dispatchAction(page, { type: 'BUY_RESOURCE' }); // no payload
  await dispatchAction(page, { type: 'SELL_RESOURCE' }); // no payload
  await dispatchAction(page, { type: 'TURN_IN_ORDER' }); // no id
  await dispatchAction(page, { type: 'CRAFTING/CRAFT_RECIPE' }); // no recipeKey
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  const s = await getReactState(page);
  expect(s).not.toBeNull();
});

test('Boot completes without console.error leaks for a fresh save', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await gotoFresh(page);
  await page.waitForTimeout(500);
  // Filter out the well-known Phaser tween race surfaced under fast e2e
  // sequencing (covered separately in full-year.spec.js).
  const real = errors.filter((e) => !/Cannot read properties of null/.test(e));
  expect(real).toEqual([]);
});
