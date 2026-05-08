import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Economy: buy / sell / market. The market slice (well, coreReducer)
 * handles BUY_RESOURCE and SELL_RESOURCE. SELL_RESOURCE auto-repays any
 * outstanding worker debt out of the proceeds.
 */

test('BUY_RESOURCE debits coins and credits inventory', async ({ page }) => {
  await gotoFresh(page, { coins: 1000, inventory: { wood_log: 0 } });
  await dispatchAction(page, { type: 'BUY_RESOURCE', payload: { key: 'wood_log', qty: 3 } });
  await waitForState(page, (s) => (s.inventory?.wood_log ?? 0) >= 3);
  const s = await getReactState(page);
  expect(s.coins).toBeLessThan(1000);
});

test('SELL_RESOURCE credits coins and debits inventory', async ({ page }) => {
  await gotoFresh(page, { coins: 0, inventory: { wood_log: 5 } });
  await dispatchAction(page, { type: 'SELL_RESOURCE', payload: { key: 'wood_log', qty: 5 } });
  await waitForState(page, (s) => (s.inventory?.wood_log ?? 0) === 0);
  const s = await getReactState(page);
  expect(s.coins).toBeGreaterThan(0);
});

test('SELL_RESOURCE with debt auto-repays before crediting coins', async ({ page }) => {
  await gotoFresh(page, {
    coins: 0,
    inventory: { wood_log: 100 }, // big stockpile
    townsfolk: { hired: {}, debt: 30, pool: 1 },
  });
  // Sell a chunk of wood; the slice routes the proceeds through
  // applyDebtRepayment first. With wood_log price ~5/unit selling 100
  // should generate enough to clear debt.
  await dispatchAction(page, { type: 'SELL_RESOURCE', payload: { key: 'wood_log', qty: 20 } });
  await page.waitForTimeout(200);
  const s = await getReactState(page);
  expect(s.townsfolk.debt).toBeLessThan(30);
});

test('BUY_RESOURCE with insufficient coins is rejected (no debit)', async ({ page }) => {
  await gotoFresh(page, { coins: 1, inventory: {} });
  await dispatchAction(page, { type: 'BUY_RESOURCE', payload: { key: 'wood_log', qty: 100 } });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  // Either no purchase or partial — but the only valid no-op is coins still 1.
  expect(s.coins).toBe(1);
  expect(s.inventory?.wood_log ?? 0).toBe(0);
});
