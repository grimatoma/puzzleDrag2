import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Apprentices / workers slice. Hiring takes coins/resources and requires
 * a built building (e.g. Hilda needs the granary). The slice is gated by:
 *   - state.workers.pool ≥ 1 (slot)
 *   - per-worker maxCount cap
 *   - housingCapacity gate
 *   - WORKERS.requirement (e.g., specific building)
 *
 * APP/HIRE / APP/FIRE are SLICE_PRIMARY actions — they live in the
 * apprentices slice only and aren't seen by the core reducer.
 */

test('APP/HIRE with all gates satisfied adds the worker', async ({ page }) => {
  // Seed every gate explicitly so the hire actually succeeds.
  await gotoFresh(page, {
    coins: 5000,
    built: { hearth: true, granary: true },
    inventory: { grass_hay: 100, bread: 100 },
    workers: { hired: {}, debt: 0, pool: 5 },
  });
  await dispatchAction(page, { type: 'APP/HIRE', payload: { id: 'hilda' } });
  await waitForState(page, (s) => (s.workers?.hired?.hilda ?? 0) >= 1);
});

test('APP/HIRE with no granary built is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 5000,
    built: {},
    inventory: { grass_hay: 100, bread: 100 },
    workers: { hired: {}, debt: 0, pool: 5 },
  });
  await dispatchAction(page, { type: 'APP/HIRE', payload: { id: 'hilda' } });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  expect(s.workers?.hired?.hilda ?? 0).toBe(0);
  expect(s.inventory.grass_hay).toBe(100); // not debited
});

test('APP/FIRE removes a hired worker', async ({ page }) => {
  await gotoFresh(page, {
    coins: 5000,
    workers: { hired: { hilda: 1 }, debt: 0, pool: 5 },
  });
  await dispatchAction(page, { type: 'APP/FIRE', payload: { id: 'hilda' } });
  await waitForState(page, (s) => (s.workers?.hired?.hilda ?? 0) === 0);
});

test('APP/HIRE with bogus id does not crash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoFresh(page, { coins: 50000, workers: { hired: {}, debt: 0, pool: 5 } });
  await dispatchAction(page, { type: 'APP/HIRE', payload: { id: 'nope' } });
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
});
